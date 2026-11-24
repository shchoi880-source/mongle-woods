// 시스템: 가방(30칸)·지갑(몽)·판매/구매·유행 바람·도감·첫날 할 일
(function (G) {
  'use strict';
  const u = G.u;

  // ---------- 아이템 ----------
  G.items = {
    get: (id) => G.data.get('items', id),
    name(id, x) {
      const it = G.items.get(id); if (!it) return '잃어버린 물건';
      if (it.cat === 'furn' && it.ref.col && G.house) return G.house.COLN[(x && x.c) || 0] + ' ' + it.name;
      const vn = x && x.v ? G.VARIANTS[x.v].name : '';
      if (vn === '계절빛') return ({ spring: '봄빛', summer: '여름빛', autumn: '가을빛', winter: '겨울빛' })[x.s || 'autumn'] + ' ' + it.name;
      return (vn ? vn + ' ' : '') + it.name;
    },
    // 아이콘 id (가구는 색을 붙인다)
    icon(id, x) { if (id.startsWith('furn:')) return id + '#' + ((x && x.c) || 0); if (x && x.v > 1 && (id.startsWith('bug:') || id.startsWith('fish:'))) return id + '#' + x.v + (x.s ? '.' + x.s : ''); return id; },
    // 판매가: val × 변이 배율 × 유행 바람
    sellPrice(id, x) {
      const it = G.items.get(id); if (!it || it.nosell) return 0;
      let p = it.val;
      if (x && x.v) p *= G.VARIANTS[x.v].mul;
      const tr = G.market.trend();
      if (tr && tr.test(it)) p *= 1.2;
      return Math.round(p);
    },
  };

  // ---------- 가방 ----------
  const inv = { size: 30, slots: [] };
  G.inv = {
    get size() { return inv.size; },
    get slots() { return inv.slots; },
    free() { return inv.size - inv.slots.length; },
    // 같은 종류(부가 정보 없는 것)는 쌓는다. 남은 수량 반환
    add(id, n = 1, x = null) {
      const it = G.items.get(id); if (!it) return n;
      const max = it.stack || 1;
      if (!x && max > 1) for (const s of inv.slots) { if (s.id === id && !s.x && s.n < max) { const k = Math.min(n, max - s.n); s.n += k; n -= k; if (!n) break; } }
      while (n > 0 && inv.slots.length < inv.size) { const k = Math.min(n, max); inv.slots.push({ id, n: k, x: x ? Object.assign({}, x) : null }); n -= k; }
      G.emit('inv:change', {}); G.save.mark('inv');
      return n;
    },
    removeAt(i, n = 1) {
      const s = inv.slots[i]; if (!s) return 0;
      const k = Math.min(n, s.n); s.n -= k; if (s.n <= 0) inv.slots.splice(i, 1);
      G.emit('inv:change', {}); G.save.mark('inv'); return k;
    },
    has(id) { return inv.slots.some((s) => s.id === id); },
    count(id) { return inv.slots.reduce((a, s) => a + (s.id === id ? s.n : 0), 0); },
    removeId(id, n = 1) { for (let i = inv.slots.length - 1; i >= 0 && n > 0; i--) if (inv.slots[i].id === id) n -= G.inv.removeAt(i, n); },
    canFit(id, x) {
      if (inv.slots.length < inv.size) return true;
      const it = G.items.get(id); if (!it || x || (it.stack || 1) <= 1) return false;
      return inv.slots.some((s) => s.id === id && !s.x && s.n < it.stack);
    },
    sort() {
      const ord = { tool: 0, letter: 1, bug: 2, fish: 3, fossil: 4, shell: 5, mat: 6 };
      inv.slots.sort((a, b) => (ord[G.items.get(a.id).cat] - ord[G.items.get(b.id).cat]) || a.id.localeCompare(b.id) || ((b.x && b.x.size || 0) - (a.x && a.x.size || 0)));
      G.emit('inv:change', {});
    },
  };
  G.save.section('inv', {
    v: 1, def: () => ({ size: 30, slots: [] }),
    get: () => ({ size: inv.size, slots: inv.slots.map((s) => [s.id, s.n, s.x]) }),
    set: (d) => { inv.size = Math.max(d.size || 20, 30); // 6차 회의: 20→30칸
      inv.slots = (d.slots || []).filter((s) => G.items.get(s[0])).map((s) => ({ id: s[0], n: s[1], x: s[2] || null })); },
  });
  // ---------- 📦 집 보관함 100칸 (6차 회의) ----------
  const box = { size: 100, slots: [] };
  G.storage = {
    get slots() { return box.slots; }, get size() { return box.size; },
    // 가방 i번 칸 → 보관함 (같은 물건은 쌓는다)
    put(i) {
      const s = G.inv.slots[i]; if (!s) return false;
      const it = G.items.get(s.id), max = (it && it.stack) || 1;
      if (it && it.cat === 'letter') return false; // 배달할 편지는 가방에
      let n = s.n;
      if (max > 1 && !s.x) for (const b of box.slots) { if (b.id === s.id && !b.x && b.n < max) { const k = Math.min(max - b.n, n); b.n += k; n -= k; if (!n) break; } }
      if (n > 0) { if (box.slots.length >= box.size) { if (n === s.n) return false; } else { box.slots.push({ id: s.id, n, x: s.x ? Object.assign({}, s.x) : null }); n = 0; } }
      G.inv.removeAt(i, s.n - n); G.save.mark('storage'); return true;
    },
    take(i) {
      const b = box.slots[i]; if (!b) return false;
      if (!G.inv.canFit(b.id, b.x)) return false;
      const left = G.inv.add(b.id, b.n, b.x);
      if (left) b.n = left; else box.slots.splice(i, 1);
      G.save.mark('storage'); return true;
    },
  };
  G.save.section('storage', { v: 1, def: () => ({ slots: [] }), get: () => ({ slots: box.slots.map((s) => [s.id, s.n, s.x]) }), set: (d) => { box.slots = (d.slots || []).filter((s) => G.items.get(s[0])).map((s) => ({ id: s[0], n: s[1], x: s[2] || null })); } });


  // ---------- 지갑·상점·유행 바람 ----------
  const econ = { money: 1000, salesTotal: 0, soldDays: 0, firstSale: false, bought: {} };
  G.wallet = {
    get: () => econ.money,
    add(n, why) { econ.money += n; G.emit('wallet:change', { delta: n, why }); G.save.mark('wallet'); },
    spend(n, why) { if (econ.money < n) return false; econ.money -= n; G.emit('wallet:change', { delta: -n, why }); G.save.mark('wallet'); return true; },
  };
  G.market = {
    trend(day) {
      const d = day === undefined ? G.time.day() : day;
      const r = G.rng.stream(G.rng.KEYS.SHOP, d, 1)();
      return G.TRENDS[Math.floor(r * G.TRENDS.length)];
    },
    sell(indices) {
      // indices: 가방 칸 번호 배열 (내림차순으로 제거)
      let total = 0; const sold = [];
      for (const i of [...indices].sort((a, b) => b - a)) {
        const s = inv.slots[i]; if (!s) continue;
        const p = G.items.sellPrice(s.id, s.x); if (!p) continue;
        total += p * s.n; sold.push(s.id);
        G.inv.removeAt(i, s.n);
      }
      if (total > 0) {
        econ.salesTotal += total; econ.firstSale = true;
        G.wallet.add(total, 'sell');
        G.emit('market:sell', { items: sold, total });
      }
      return total;
    },
    stats: econ,
  };
  G.shop = {
    // 오늘의 진열 (가판대 단계: 도구만)
    // 오늘의 진열: 도구 + 가구 6점(날마다 결정적으로 바뀜, 하루 한 번씩만 판매)
    stock(day) {
      const d = day === undefined ? G.time.day() : day;
      const list = [{ kind: 'tool', id: 'shovel', name: G.TOOLS.shovel.name, price: G.TOOLS.shovel.price, key: 'shovel' }];
      if (G.TOOLS.axe) list.push({ kind: 'tool', id: 'axe', name: G.TOOLS.axe.name, price: G.TOOLS.axe.price, key: 'axe' });
      // 계절 씨앗 (3개 묶음) + 물뿌리개
      if (G.farm) {
        const season = G.farm.SEASON_OF(G.time.dayDate(d).m);
        for (const c of G.data.all('crops').filter((x) => x.season === season)) list.push({ kind: 'seed', id: c.id, name: c.name + ' 씨앗 3개', price: c.seed * 3, key: 'seed_' + c.id });
        if (G.TOOLS.can && !G.player.hasTool('can')) list.push({ kind: 'tool', id: 'can', name: G.TOOLS.can.name, price: G.TOOLS.can.price, key: 'can' });
      }
      // 도구 업그레이드 (한 번 사면 영구)
      for (const [t, nm, pr] of [['net', '튼튼 잠자리채', 3000], ['rod', '튼튼 낚싯대', 3000], ['can', '큰 물뿌리개', 2500]]) {
        if (G.player.hasTool(t) && !(G.player.up && G.player.up[t])) list.push({ kind: 'up', id: t, name: nm, price: pr, key: 'up_' + t });
      }
      if (G.ranch) {
        for (const [k, v] of Object.entries(G.ranch.KINDS)) list.push({ kind: 'animal', id: k, name: v.baby, price: v.price, key: 'an_' + k });
      }
      if (!G.house) return list;
      const R = G.rng.stream(G.rng.KEYS.SHOP, d, 2);
      const forms = G.house.SHOP_FORMS.slice();
      for (let k = 0; k < 6 && forms.length; k++) {
        const f = forms.splice(Math.floor(R() * forms.length), 1)[0];
        const c = f.col ? Math.floor(R() * G.house.COLS.length) : 0;
        list.push({ kind: 'furn', id: f.id, c, name: G.items.name('furn:' + f.id, { c }), price: f.val, key: 'f' + k });
      }
      return list;
    },
    soldOut(e) { return econ.boughtDay === G.time.day() && !!(econ.bought || {})[e.key]; },
    buy(entry) {
      if (entry.kind === 'tool') {
        if (G.player.hasTool(entry.id)) return { ok: false, why: '이미 가지고 있어요.' };
        if (!G.wallet.spend(entry.price, 'buy')) return { ok: false, why: '몽이 조금 모자라요.' };
        G.player.giveTool(entry.id);
        G.emit('shop:buy', { id: entry.id, price: entry.price });
        return { ok: true };
      }
      if (entry.kind === 'up') {
        if (G.player.up && G.player.up[entry.id]) return { ok: false, why: '이미 좋은 걸 가지고 있어요.' };
        if (!G.wallet.spend(entry.price, 'buy')) return { ok: false, why: '몽이 조금 모자라요.' };
        G.player.up = Object.assign({}, G.player.up, { [entry.id]: 1 }); G.save.mark('up');
        G.emit('shop:buy', { id: 'up_' + entry.id, price: entry.price }); return { ok: true };
      }
      if (entry.kind === 'animal') { const r = G.ranch.buy(entry.id); if (r.ok) G.emit('shop:buy', { id: entry.id, price: entry.price }); return r; }
      if (entry.kind === 'seed') {
        if (!G.inv.canFit('seed:' + entry.id)) return { ok: false, why: '가방이 꽉 찼어요.' };
        if (!G.wallet.spend(entry.price, 'buy')) return { ok: false, why: '몽이 조금 모자라요.' };
        G.inv.add('seed:' + entry.id, 3);
        G.emit('shop:buy', { id: entry.id, price: entry.price });
        // 첫 씨앗 손님에게 토실이 물뿌리개를 덤으로
        if (G.farm && !G.farm.st.seedGift && !G.player.hasTool('can')) { G.farm.st.seedGift = true; G.player.giveTool('can'); return { ok: true, gift: true }; }
        return { ok: true };
      }
      if (entry.kind === 'furn') {
        if (G.shop.soldOut(entry)) return { ok: false, why: '오늘은 다 팔렸어요.' };
        if (!G.inv.canFit('furn:' + entry.id, { c: entry.c })) return { ok: false, why: '가방이 꽉 찼어요.' };
        if (!G.wallet.spend(entry.price, 'buy')) return { ok: false, why: '몽이 조금 모자라요.' };
        G.inv.add('furn:' + entry.id, 1, { c: entry.c });
        if (econ.boughtDay !== G.time.day()) { econ.boughtDay = G.time.day(); econ.bought = {}; }
        econ.bought[entry.key] = 1;
        G.emit('shop:buy', { id: entry.id, price: entry.price });
        return { ok: true };
      }
      return { ok: false };
    },
  };
  // ---------- 관리자 선물 (오너 계정) ----------
  G.admin = {
    money(n = 10000000) { G.wallet.add(n, 'admin'); },
    tools() {
      for (const t of ['net', 'rod', 'shovel', 'axe', 'can']) if (G.TOOLS[t]) G.player.giveTool(t);
      G.player.up = Object.assign({}, G.player.up, { net: 1, rod: 1, can: 1 });
    },
    // 보관함(100칸)에 가구 전부 1개씩 + 재료·씨앗
    items() {
      const put = (id, n, x) => { const s = G.storage.slots; const it = G.items.get(id); if (!it) return; const ex = !x && s.find((b) => b.id === id && !b.x); if (ex) { ex.n = Math.min((it.stack || 1) * 1, ex.n + n); return; } if (s.length < G.storage.size) s.push({ id, n, x: x || null }); };
      if (G.house) for (const f of G.house.SHOP_FORMS) put('furn:' + f.id, 1, { c: 0 });
      for (const m of ['wood', 'stone', 'clay', 'iron']) put(m, 30);
      if (G.farm) for (const c of G.data.all('crops')) put('seed:' + c.id, 30);
      G.save.mark('admin');
    },
    all() { G.admin.money(); G.admin.tools(); G.admin.items(); econ.adminGift = true; G.save.now('admin'); },
  };
  G.save.section('econ', {
    v: 1, def: () => ({ money: 1000, salesTotal: 0, firstSale: false }),
    get: () => Object.assign({}, econ), set: (d) => Object.assign(econ, d),
  });

  // ---------- 도감 ----------
  // 종 × 변이 6 비트셋 (0 일반, 1 거대, 2 알비노, 3 희귀무늬, 4 황금, 5 계절색). M-a는 0·1만 사용
  const NV = 6;
  const col = { bug: new G.Bits(64 * NV), fish: new G.Bits(64 * NV), sea: new G.Bits(64 * NV), fossil: new G.Bits(64), best: {}, count: 0 };
  G.collect = {
    NV,
    record(kind, ix, v, size) {
      const bits = col[kind]; const k = kind === 'fossil' ? ix : ix * NV + (v || 0);
      const newSp = kind === 'fossil' ? !bits.has(ix) : ![0, 1, 2, 3, 4, 5].some((vv) => bits.has(ix * NV + vv));
      const newV = !bits.has(k);
      bits.set(k);
      let best = false;
      if (size) { const key = kind + ix; if (!col.best[key] || size > col.best[key]) { best = !!col.best[key]; col.best[key] = size; } }
      col.count = G.collect.total();
      if (newV) G.emit('dex:new', { kind, ix, v, newSp });
      G.save.mark('dex');
      return { newSp, newV, best };
    },
    has(kind, ix, v) { return kind === 'fossil' ? col.fossil.has(ix) : v === undefined ? [0, 1, 2, 3, 4, 5].some((vv) => col[kind].has(ix * NV + vv)) : col[kind].has(ix * NV + v); },
    best: (kind, ix) => col.best[kind + ix] || 0,
    total() { let n = 0; for (const b of G.data.all('bugs')) if (G.collect.has('bug', b.ix)) n++; for (const f of G.data.all('fish')) if (G.collect.has('fish', f.ix)) n++; for (const f of G.data.all('fossils')) if (G.collect.has('fossil', f.ix)) n++; for (const f of G.data.all('sea')) if (G.collect.has('sea', f.ix)) n++; return n; },
  };
  G.save.section('collect', {
    v: 1, def: () => ({ bug: '', fish: '', fossil: '', best: {}, count: 0 }),
    get: () => ({ bug: col.bug.toStr(), fish: col.fish.toStr(), sea: col.sea.toStr(), fossil: col.fossil.toStr(), best: col.best, count: col.count }),
    set: (d) => { col.bug = G.Bits.from(d.bug, 64 * NV); col.fish = G.Bits.from(d.fish, 64 * NV); col.fossil = G.Bits.from(d.fossil, 64); col.sea = G.Bits.from(d.sea, 64 * NV); col.best = d.best || {}; col.count = d.count || 0; },
  });

  // ---------- 첫날 할 일 카드 (순서 자유) ----------
  const CARDS = [
    { id: 'sell', text: '땅굴상점에서 처음으로 팔아 보기', ev: 'market:sell' },
    { id: 'bug', text: '곤충 한 마리 잡기', ev: 'eco:caught', test: (p) => p.kind === 'bug' },
    { id: 'fish', text: '물고기 한 마리 낚기', ev: 'eco:caught', test: (p) => p.kind === 'fish' },
    { id: 'shake', text: '나무 흔들어 보기', ev: 'world:shake' },
    { id: 'meet', text: '이웃 셋(딸랑·소금·라임)과 인사하기', ev: 'npc:met', test: () => ['ddalang', 'sogeum', 'lime'].every((id) => G.npc.st[id] && G.npc.st[id].met) },
    { id: 'letter', text: '딸랑에게 편지 전해 주기', ev: 'quest:letter' },
    { id: 'shells', text: '해변에서 조개 3개 줍기', ev: 'item:gain', test: (p) => p.id.startsWith('shell:'), count: 3 },
    { id: 'dig', text: '삽을 사서 화석 파내기', ev: 'dig:found' },
    { id: 'furn', text: '텐트에 가구 3개 놓기', ev: 'house:change', test: (p) => p.count >= 3 },
  ];
  const q = { done: {}, prog: {}, stamped: false, intro: false, letterGiven: false, letterDone: false };
  G.quest = {
    CARDS, st: q,
    isDone: (id) => !!q.done[id],
    doneCount: () => CARDS.filter((c) => q.done[c.id]).length,
    complete(id) {
      if (q.done[id]) return; q.done[id] = 1;
      const c = CARDS.find((x) => x.id === id);
      G.emit('quest:done', { id, text: c ? c.text : id });
      G.save.mark('quest');
      if (!q.stamped && G.quest.doneCount() >= 4) { q.stamped = true; G.emit('stamp:earn', { id: 'day1' }); }
    },
  };
  for (const c of CARDS) {
    G.on(c.ev, (p) => {
      if (q.done[c.id] || (c.test && !c.test(p))) return;
      if (c.count) { q.prog[c.id] = (q.prog[c.id] || 0) + (p.n || 1); if (q.prog[c.id] < c.count) { G.save.mark('quest'); return; } }
      G.quest.complete(c.id);
    });
  }
  G.save.section('quest', {
    v: 1, def: () => ({ done: {}, prog: {}, stamped: false, intro: false, letterGiven: false, letterDone: false }),
    get: () => JSON.parse(JSON.stringify(q)), set: (d) => { for (const k of Object.keys(q)) delete q[k]; Object.assign(q, d); },
  });

  G.modules.add('sys');
})(globalThis.G);
