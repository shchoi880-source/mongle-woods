// 몽글숲 이야기 — 코어: G 루트, 상수, 이벤트 버스, 유틸, 난수, 비트셋, 데이터 레지스트리, 루프, 씬 스택
// 규칙: 로드 시점에 DOM 접근 금지. 초기화는 G.boot()에서.
(function (root) {
  'use strict';
  const G = root.G = root.G || {};
  G.VERSION = '0.11.3';
  G.C = { TILE: 32, HSTEP: 16, CHUNK: 8, CELL: 4, DAY_H: 5, MAP_W: 112, MAP_H: 96 };
  G.modules = new Set();
  G.has = (ns) => G.modules.has(ns);
  G.dev = false;

  // ---------- 이벤트 버스 ----------
  const subs = new Map();
  G.on = (ev, fn) => { if (!subs.has(ev)) subs.set(ev, new Set()); subs.get(ev).add(fn); return () => G.off(ev, fn); };
  G.off = (ev, fn) => { const s = subs.get(ev); if (s) s.delete(fn); };
  G.once = (ev, fn) => { const off = G.on(ev, (p) => { off(); fn(p); }); return off; };
  G.emit = (ev, p) => {
    const s = subs.get(ev); if (!s) return;
    for (const fn of [...s]) { try { fn(p || {}); } catch (e) { G.log.err(ev, e); } }
  };

  // ---------- 로그 ----------
  G.log = {
    errs: [],
    err(where, e) { this.errs.push([where, String(e && e.stack || e)]); if (this.errs.length > 50) this.errs.shift(); if (root.console) console.error('[G]', where, e); },
  };

  // ---------- 유틸 ----------
  const u = G.u = {
    clamp: (v, a, b) => v < a ? a : v > b ? b : v,
    lerp: (a, b, t) => a + (b - a) * t,
    smooth: (t) => t * t * (3 - 2 * t),
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
    // 32비트 정수 해시 (여러 정수 섞기)
    hash32(...ns) {
      let h = 0x811c9dc5 | 0;
      for (let n of ns) {
        n = n | 0;
        h = Math.imul(h ^ n, 0x01000193);
        h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
      }
      h ^= h >>> 16; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
      return h >>> 0;
    },
    hashf(...ns) { return u.hash32(...ns) / 4294967296; },
    strHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; },
    fnv1a(s) { return u.strHash(s).toString(16).padStart(8, '0'); },
    // UTF-8 안전 base64
    b64enc(str) {
      const bytes = new TextEncoder().encode(str); let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return (root.btoa ? root.btoa(bin) : Buffer.from(bin, 'binary').toString('base64'));
    },
    b64dec(b64) {
      const bin = root.atob ? root.atob(b64) : Buffer.from(b64, 'base64').toString('binary');
      const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    },
    bytesToB64(bytes) { let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return root.btoa ? root.btoa(bin) : Buffer.from(bin, 'binary').toString('base64'); },
    b64ToBytes(b64) { const bin = root.atob ? root.atob(b64) : Buffer.from(b64, 'base64').toString('binary'); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; },
    // 0x00/0xFF 연속 구간 RLE: [0xFE, val, len] 마커
    rleEnc(bytes) {
      const out = [];
      for (let i = 0; i < bytes.length;) {
        const b = bytes[i]; let j = i;
        while (j < bytes.length && bytes[j] === b && j - i < 255) j++;
        const len = j - i;
        if ((b === 0 || b === 0xff || b === 0xfe) && (len >= 3 || b === 0xfe)) { out.push(0xfe, b, len); i = j; }
        else { out.push(b); i++; }
      }
      return new Uint8Array(out);
    },
    rleDec(bytes) {
      const out = [];
      for (let i = 0; i < bytes.length;) {
        if (bytes[i] === 0xfe) { const v = bytes[i + 1], n = bytes[i + 2]; for (let k = 0; k < n; k++) out.push(v); i += 3; }
        else out.push(bytes[i++]);
      }
      return new Uint8Array(out);
    },
    pick(arr, r) { return arr[Math.floor(r * arr.length) % arr.length]; },
    // 가중치 선택 [{w,...}]
    pickW(arr, r, key = 'w') {
      let tot = 0; for (const a of arr) tot += a[key];
      let x = r * tot; for (const a of arr) { x -= a[key]; if (x < 0) return a; }
      return arr[arr.length - 1];
    },
  };

  // ---------- 난수 (mulberry32 스트림) ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  G.rng = {
    seed: 1,
    KEYS: { WORLD: 1, DAY: 2, WEATHER: 3, SHOP: 4, ECO: 5, FX: 6, TALK: 7 },
    setSeed(s) { this.seed = s >>> 0; },
    // 결정적 스트림: 같은 (seed, key, a, b) → 같은 수열
    stream(key, a = 0, b = 0) { return mulberry32(u.hash32(this.seed, key, a, b)); },
    make: mulberry32,
    fx: Math.random, // 연출용(비결정)
  };

  // ---------- 비트셋 ----------
  class Bits {
    constructor(n) { this.n = n; this.b = new Uint8Array((n + 7) >> 3); }
    has(i) { return i >= 0 && i < this.n && (this.b[i >> 3] >> (i & 7) & 1) === 1; }
    set(i, v = true) { if (i < 0 || i >= this.n) return; if (v) this.b[i >> 3] |= 1 << (i & 7); else this.b[i >> 3] &= ~(1 << (i & 7)); }
    count() { let c = 0; for (let i = 0; i < this.n; i++) if (this.has(i)) c++; return c; }
    toStr() { return this.n + ':' + u.bytesToB64(u.rleEnc(this.b)); }
    static from(s, n) {
      const bits = new Bits(n);
      if (typeof s !== 'string' || s.indexOf(':') < 0) return bits;
      const raw = u.rleDec(u.b64ToBytes(s.slice(s.indexOf(':') + 1)));
      // 짧으면 0 채움, 길면 무시 (다운그레이드 안전)
      bits.b.set(raw.subarray(0, bits.b.length));
      // 범위 밖 비트 정리
      for (let i = n; i < bits.b.length * 8; i++) bits.set(i, false);
      return bits;
    }
  }
  G.Bits = Bits;

  // ---------- 데이터 레지스트리 ----------
  const tables = {};
  G.data = {
    table(name, spec) { tables[name] = { spec: Object.assign({ key: 'id', required: [] }, spec), rows: [], byKey: new Map(), byIx: new Map() }; },
    add(name, rows) {
      const t = tables[name]; if (!t) throw new Error('unknown table ' + name);
      for (const r of rows) {
        for (const f of t.spec.required) if (r[f] === undefined) throw new Error(`${name}.${r[t.spec.key]} missing ${f}`);
        const k = r[t.spec.key];
        if (t.byKey.has(k)) throw new Error(`${name} duplicate key ${k}`);
        if (t.spec.ix) { if (t.byIx.has(r.ix)) throw new Error(`${name} duplicate ix ${r.ix}`); t.byIx.set(r.ix, r); }
        t.byKey.set(k, r); t.rows.push(r);
      }
    },
    get(name, id) { const t = tables[name]; return t ? t.byKey.get(id) : undefined; },
    byIx(name, ix) { const t = tables[name]; return t ? t.byIx.get(ix) : undefined; },
    all(name) { const t = tables[name]; return t ? t.rows : []; },
    maxIx(name) { let m = -1; for (const r of this.all(name)) if (r.ix > m) m = r.ix; return m; },
  };
  // 글꼴: 둥근 한글 폰트(Jua, OFL)가 준비되면 캔버스 글자도 그것으로
  G.fontReady = false;
  G.fontPx = (n) => (G.fontReady ? `${n}px Jua, sans-serif` : `bold ${n}px sans-serif`);
  G.str = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars && vars[k] !== undefined ? vars[k] : '{' + k + '}');

  // 한국어 조사: josa('딸랑','이/가')
  G.josa = (word, pair) => {
    const [a, b] = pair.split('/');
    const c = word.charCodeAt(word.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return word + b;
    const jong = (c - 0xac00) % 28;
    if (pair === '으로/로') return word + (jong === 0 || jong === 8 ? '로' : '으로');
    return word + (jong ? a : b);
  };

  // ---------- 포맷 ----------
  G.fmt = {
    num: (n) => Math.round(n).toLocaleString('ko-KR'),
    money: (n) => Math.round(n).toLocaleString('ko-KR') + '몽',
    clock(h, m) { const ap = h < 12 ? '오전' : '오후'; const hh = h % 12 === 0 ? 12 : h % 12; return `${ap} ${hh}:${String(m).padStart(2, '0')}`; },
  };

  // ---------- 루프 ----------
  const phases = { time: [], input: [], sim: [], late: [], draw: [], ui: [] };
  const ORDER = ['time', 'input', 'sim', 'late', 'draw', 'ui'];
  G.loop = {
    dt: 0, frame: 0, ms: 0, running: false, fps: 60, _last: 0, _raf: 0,
    add(phase, fn, order = 0) { phases[phase].push({ fn, order }); phases[phase].sort((a, b) => a.order - b.order); },
    start() {
      if (this.running) return; this.running = true; this._last = 0;
      const tick = (now) => {
        if (!this.running) return;
        this._raf = root.requestAnimationFrame(tick);
        const dtms = this._last ? Math.min(now - this._last, 50) : 16.6;
        this._last = now; this.dt = dtms / 1000; this.frame++;
        const t0 = root.performance.now();
        for (const p of ORDER) for (const h of phases[p]) { try { h.fn(this.dt); } catch (e) { G.log.err('loop:' + p, e); } }
        this.ms = root.performance.now() - t0;
        this.fps = this.fps * 0.95 + (1000 / Math.max(dtms, 1)) * 0.05;
      };
      this._raf = root.requestAnimationFrame(tick);
    },
    stop() { this.running = false; if (this._raf) root.cancelAnimationFrame(this._raf); },
  };

  // ---------- 씬 스택 ----------
  const defs = {}; const stack = [];
  G.scene = {
    define(id, spec) { defs[id] = Object.assign({ id, world: false, opaque: true }, spec); },
    push(id, args) { const top = stack[stack.length - 1]; if (top && top.pause) top.pause(); const s = defs[id]; stack.push(s); s.enter && s.enter(args); G.emit('scene:push', { id }); },
    pop(result) { const s = stack.pop(); if (s && s.exit) s.exit(); const top = stack[stack.length - 1]; if (top && top.resume) top.resume(result); G.emit('scene:pop', { id: s && s.id }); },
    replace(id, args) { const s = stack.pop(); if (s && s.exit) s.exit(); stack.push(defs[id]); defs[id].enter && defs[id].enter(args); G.emit('scene:push', { id }); },
    top() { return stack[stack.length - 1]; },
    is(id) { const t = stack[stack.length - 1]; return !!t && t.id === id; },
    stack,
    update(dt) { for (const s of stack) if (s.update && (s === stack[stack.length - 1] || s.world)) s.update(dt); },
    draw(ctx) {
      let start = stack.length - 1; while (start > 0 && !stack[start].opaque) start--;
      for (let i = Math.max(0, start); i < stack.length; i++) if (stack[i].draw) stack[i].draw(ctx);
    },
    input(ev) { for (let i = stack.length - 1; i >= 0; i--) { const s = stack[i]; if (s.input && s.input(ev)) return true; if (s.opaque) break; } return false; },
  };

  // 이징
  G.ease = {
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    outElastic: (t) => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  };
  // 스프링 (s = {x, v})
  G.spring = (s, target, k, c, dt) => { const a = (target - s.x) * k - s.v * c; s.v += a * dt; s.x += s.v * dt; return s.x; };

  G.modules.add('core');
})(globalThis);
