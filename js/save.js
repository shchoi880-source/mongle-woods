// 세이브: A/B 교대 슬롯 + 체크섬 + 섹션별 마이그레이션 + 문자열 내보내기/가져오기 (r2-기술 §3)
(function (G) {
  'use strict';
  const u = G.u;
  // localStorage가 없거나 막힌 환경(Node, 사생활 모드)에서는 메모리 저장소로 대체
  function makeStore() {
    try {
      const ls = globalThis.localStorage; const k = 'mg.__t';
      ls.setItem(k, '1'); ls.removeItem(k); return ls;
    } catch (e) {
      const m = new Map();
      return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _mem: true };
    }
  }
  G.store = makeStore();

  const ENV_V = 1;
  const KEY = { A: 'mg.slot.A', B: 'mg.slot.B', META: 'mg.meta', PREMIG: 'mg.premig', SETTINGS: 'mg.settings' };
  const sections = new Map();
  let seq = 0, last = null, dirty = false, timer = 0, lastSaveAt = 0, unknown = {}, readOnly = false;

  const save = G.save = {
    KEY,
    LIMIT: 160 * 1024, WARN: 120 * 1024,
    section(name, spec) { sections.set(name, Object.assign({ v: 1, migrate: {}, budget: 16 * 1024 }, spec)); },
    // 디바운스 저장 요청
    mark(why) {
      dirty = true;
      if (timer) return;
      timer = setTimeout(() => { timer = 0; save.now(why); }, 1500);
    },
    isDirty: () => dirty,
    get readOnly() { return readOnly; },
    snapshot() {
      const s = Object.assign({}, unknown);
      for (const [name, sec] of sections) s[name] = { v: sec.v, d: sec.get() };
      return s;
    },
    envelope() {
      const s = save.snapshot();
      return { fmt: 'MG', v: ENV_V, seq: seq + 1, t: Date.now(), app: G.VERSION, sum: u.fnv1a(JSON.stringify(s)), s };
    },
    now(why) {
      if (readOnly) return { ok: false, err: 'readonly' };
      if (timer) { clearTimeout(timer); timer = 0; }
      try {
        const env = save.envelope();
        const str = JSON.stringify(env);
        const slot = last === 'A' ? 'B' : 'A';
        G.store.setItem(KEY[slot], str);
        // 다시 읽어 검증
        const back = G.store.getItem(KEY[slot]);
        if (back !== str || !verify(JSON.parse(back))) throw new Error('verify failed');
        seq = env.seq; last = slot; dirty = false; lastSaveAt = Date.now();
        G.store.setItem(KEY.META, JSON.stringify({ last, seq }));
        G.store.removeItem(KEY.PREMIG);
        if (str.length > save.WARN) G.emit('save:warn', { size: str.length });
        G.emit('save:done', { why, size: str.length });
        return { ok: true, size: str.length };
      } catch (e) {
        G.log.err('save', e); G.emit('save:fail', { err: String(e) });
        return { ok: false, err: String(e) };
      }
    },
    // 로드: 두 슬롯 검증 → seq 큰 쪽 → 섹션 마이그레이션 → set
    load() {
      const cands = [];
      for (const slot of ['A', 'B']) {
        const raw = G.store.getItem(KEY[slot]); if (!raw) continue;
        try { const env = JSON.parse(raw); if (verify(env)) cands.push({ slot, env }); } catch (e) { /* 손상 슬롯 무시 */ }
      }
      if (!cands.length) {
        const any = G.store.getItem(KEY.A) || G.store.getItem(KEY.B);
        for (const sec of sections.values()) sec.set(sec.def());
        return { ok: true, fresh: true, corrupt: !!any };
      }
      cands.sort((a, b) => b.env.seq - a.env.seq);
      const { slot, env } = cands[0];
      const r = apply(env);
      if (r.ok) { seq = env.seq; last = slot; }
      return r;
    },
    exportString() {
      const body = u.b64enc(JSON.stringify(save.envelope()));
      return 'MG1:' + body + ':' + u.fnv1a(body);
    },
    parseImport(str) {
      str = String(str || '').trim();
      const m = /^MG1:([A-Za-z0-9+/=]+):([0-9a-f]{8})$/.exec(str);
      if (!m) return { ok: false, err: '형식이 맞지 않아요.' };
      if (u.fnv1a(m[1]) !== m[2]) return { ok: false, err: '내용이 손상되었어요.' };
      let env; try { env = JSON.parse(u.b64dec(m[1])); } catch (e) { return { ok: false, err: '읽을 수 없어요.' }; }
      if (!verify(env)) return { ok: false, err: '체크섬이 맞지 않아요.' };
      const meta = env.s.meta && env.s.meta.d || {}, econ = env.s.econ && env.s.econ.d || {}, col = env.s.collect && env.s.collect.d || {};
      return { ok: true, env, summary: { name: meta.name, town: meta.town, created: meta.created, money: econ.money || 0, dex: col.count || 0 } };
    },
    importEnv(env) {
      // 현재 세이브를 미리 백업
      try { G.store.setItem(KEY.PREMIG, JSON.stringify(save.envelope())); } catch (e) { /* 무시 */ }
      const r = apply(env);
      if (r.ok) { readOnly = false; save.now('import'); }
      return r;
    },
    wipe() {
      for (const k of [KEY.A, KEY.B, KEY.META, KEY.PREMIG]) G.store.removeItem(k);
      seq = 0; last = null; unknown = {};
      for (const sec of sections.values()) sec.set(sec.def());
    },
    size() { try { return JSON.stringify(save.envelope()).length; } catch (e) { return 0; } },
    lastSaveAt: () => lastSaveAt,
    sections,
  };

  function verify(env) {
    return env && env.fmt === 'MG' && typeof env.s === 'object' && env.sum === u.fnv1a(JSON.stringify(env.s));
  }

  function apply(env) {
    if (env.v > ENV_V) { readOnly = true; G.emit('save:future', {}); }
    const s = env.s; unknown = {};
    let migrated = false;
    for (const name of Object.keys(s)) if (!sections.has(name)) unknown[name] = s[name]; // 미래 섹션 보존
    for (const [name, sec] of sections) {
      const entry = s[name];
      let d = entry ? entry.d : sec.def();
      let v = entry ? entry.v : sec.v;
      if (v > sec.v) { readOnly = true; G.emit('save:future', { section: name }); }
      while (v < sec.v) {
        const fn = sec.migrate[v];
        if (!fn) { G.log.err('migrate', name + ' v' + v); d = sec.def(); v = sec.v; break; }
        if (!migrated) { try { G.store.setItem(KEY.PREMIG, JSON.stringify(env)); } catch (e) { /* 공간 부족 */ } migrated = true; }
        d = fn(d); v++;
      }
      try { sec.set(Object.assign(sec.def(), d)); } catch (e) { G.log.err('save.set:' + name, e); sec.set(sec.def()); }
    }
    return { ok: true, fresh: false, migrated };
  }

  // ---------- 기기 설정 (세이브와 분리) ----------
  const DEF_SETTINGS = { bgm: 0.6, sfx: 0.8, voice: 0.7, textSpeed: 32, view: 1, vibrate: true, lastExport: 0 };
  let settings = Object.assign({}, DEF_SETTINGS);
  try { const raw = G.store.getItem(KEY.SETTINGS); if (raw) settings = Object.assign(settings, JSON.parse(raw)); } catch (e) { /* 기본값 */ }
  G.settings = {
    get: (k) => settings[k],
    set(k, v) { settings[k] = v; try { G.store.setItem(KEY.SETTINGS, JSON.stringify(settings)); } catch (e) { /* 무시 */ } G.emit('settings:change', { k, v }); },
    all: () => settings,
  };

  G.modules.add('save');
})(globalThis.G);
