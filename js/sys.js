// 시스템: 가방(20칸)·지갑(몽)·판매/구매·유행 바람·도감·첫날 할 일
(function (G) {
  'use strict';
  const u = G.u;

  // ---------- 아이템 ----------
  G.items = {
    get: (id) => G.data.get('items', id),
    name(id, x) {
      const it = G.items.get(id); if (!it) return '잃어버린 물건';
      if (it.cat === 'furn' && it.ref.col && G.house) return G.house.COLN[(x && x.c) || 0] + ' ' + it.name;
      return (x && x.v === 1 ? '거대 ' : '') + it.name;
    },
    // 아이콘 id (가구는 색을 붙인다)
    icon(id, x) { return id.startsWith('furn:') ? id + '#' + ((x && x.c) || 0) : id; },
    // 판매가: val × 변이 배율 × 유행 바람
    sellPrice(id, x) {
      const it = G.items.get(id); if (!it || it.nosell) return 0;
      let p = it.val;
      if (x && x.v === 1) p *= 1.5;
      const tr = G.market.trend();
      if (tr && tr.test(it)) p *= 1.2;
      return Math.round(p);
    },
  };

  // ---------- 가방 ----------
  const inv = { size: 20, slots: [] };
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
    v: 1, def: () => ({ size: 20, slots: [] }),
    get: () => ({ size: inv.size, slots: inv.slots.map((s) => [s.id, s.n, s.x]) }),
    set: (d) => { inv.size = d.size || 20; inv.slots = (d.slots || []).filter((s) => G.items.get(s[0])).map((s) => ({ id: s[0], n: s[1], x: s[2] || null })); },
  });

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
    // 오늘의 진열: 도구 + 가구 4점(날마다 결정적으로 바뀜, 하루 한 번씩만 판매)
    stock(day) {
      const d = day === undefined ? G.time.day() : day;
      const list = [{ kind: 'tool', id: 'shovel', name: G.TOOLS.shovel.name, price: G.TOOLS.shovel.price, key: 'shovel' }];
      if (G.TOOLS.axe) list.push({ kind: 'tool', id: 'axe', name: G.TOOLS.axe.name, price: G.TOOLS.axe.price, key: 'axe' });
      if (!G.house) return list;
      const R = G.rng.stream(G.rng.KEYS.SHOP, d, 2);
      const forms = G.house.SHOP_FORMS.slice();
      for (let k = 0; k < 4 && forms.length; k++) {
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
  G.save.section('econ', {
    v: 1, def: () => ({ money: 1000, salesTotal: 0, firstSale: false }),
    get: () => Object.assign({}, econ), set: (d) => Object.assign(econ, d),
  });

  // ---------- 도감 ----------
  // 종 × 변이 6 비트셋 (0 일반, 1 거대, 2 알비노, 3 희귀무늬, 4 황금, 5 계절색). M-a는 0·1만 사용
  const NV = 6;
  const col = { bug: new G.Bits(64 * NV), fish: new G.Bits(64 * NV), fossil: new G.Bits(64), best: {}, count: 0 };
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
    total() { let n = 0; for (const b of G.data.all('bugs')) if (G.collect.has('bug', b.ix)) n++; for (const f of G.data.all('fish')) if (G.collect.has('fish', f.ix)) n++; for (const f of G.data.all('fossils')) if (G.collect.has('fossil', f.ix)) n++; return n; },
  };
  G.save.section('collect', {
    v: 1, def: () => ({ bug: '', fish: '', fossil: '', best: {}, count: 0 }),
    get: () => ({ bug: col.bug.toStr(), fish: col.fish.toStr(), fossil: col.fossil.toStr(), best: col.best, count: col.count }),
    set: (d) => { col.bug = G.Bits.from(d.bug, 64 * NV); col.fish = G.Bits.from(d.fish, 64 * NV); col.fossil = G.Bits.from(d.fossil, 64); col.best = d.best || {}; col.count = d.count || 0; },
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
