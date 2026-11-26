// 의뢰판 (12차 요청: 하루 종일 할 거리) — 광장 게시판에 이웃 부탁 3장, 갖다 주면 몽글 별 ⭐·몽·숙련도.
// 끝낸 자리는 3분 뒤 새 의뢰가 붙는다. 별은 별 가게에서 미끼·꿀 향·행운·비료·옷으로 바꾼다.
(function (G) {
  'use strict';
  const Q = G.quests = {};
  const REFILL = 3 * 60e3, SWAP = 60e3, BUFF = 10 * 60e3;
  const st = { stars: 0, slots: [null, null, null], next: [0, 0, 0], done: 0, buffs: {}, seq: 0 };

  // ---------- 별 가게 ----------
  const SHOP = [
    { id: 'bait', icon: '🪱', name: '반짝 미끼', price: 3, desc: '10분 동안 희귀 물고기 2배' },
    { id: 'honey', icon: '🍯', name: '꿀 향수', price: 3, desc: '10분 동안 희귀 곤충 2배' },
    { id: 'clover', icon: '🍀', name: '네잎 행운', price: 4, desc: '10분 동안 숙련도 경험치 1.5배, 덤 확률 +15%' },
    { id: 'grow', icon: '🌿', name: '몽글 비료', price: 4, desc: '심어 둔 작물이 반쯤 쑥 자라요' },
  ];
  const WEAR_PRICE = 12;
  Q.buff = (id) => (st.buffs[id] || 0) > Date.now();
  Q.buffLeft = (id) => Math.max(0, Math.ceil(((st.buffs[id] || 0) - Date.now()) / 60e3));
  Q.stars = () => st.stars;
  Q.addStars = (n) => { st.stars += n; G.save.mark('quests'); };

  // ---------- 의뢰 만들기 ----------
  const R = () => Math.random();
  const pick = (a) => a[Math.floor(R() * a.length)];
  const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
  const CAT = { bug: '곤충', fish: '물고기', shell: '조개', crop: '작물', dish: '요리', sea: '바다 생물' };
  function who() {
    const N = G.npc, ids = Object.keys(N.VILLAGERS).filter((id) => N.st[id] && N.st[id].met);
    const id = pick(ids.length ? ids : Object.keys(N.VILLAGERS)); return { who: id, wname: N.VILLAGERS[id].name };
  }
  function make() {
    const m = G.time.month(), season = G.farm.SEASON_OF(m), kinds = [];
    kinds.push(() => { const n = rint(2, 4); return { cat: 'bug', n, sk: 'bug', stars: 1, coin: n * 250, why: '곤충 표본 상자를 채우고 싶어서' }; });
    kinds.push(() => { const n = rint(2, 3); return { cat: 'fish', n, sk: 'fish', stars: 1, coin: n * 280, why: '저녁 반찬 고민이라' }; });
    kinds.push(() => { const sp = pick(G.data.all('bugs').filter((s) => s.tier <= 2 && s.months.includes(m) && !s.high)); return sp && { id: 'bug:' + sp.id, n: 1, sk: 'bug', stars: 2, coin: Math.round(sp.val * 2), why: `${G.josa(sp.name, '을/를')} 꼭 한번 보고 싶어서` }; });
    kinds.push(() => { const sp = pick(G.data.all('fish').filter((s) => s.tier <= 2 && s.months.includes(m))); return sp && { id: 'fish:' + sp.id, n: 1, sk: 'fish', stars: 2, coin: Math.round(sp.val * 2), why: `${sp.name} 그림을 그리려고` }; });
    kinds.push(() => { const c = pick(G.data.all('crops').filter((c) => c.season === season)) || pick(G.data.all('crops')); const n = rint(3, 6); return c && { id: 'crop:' + c.id, n, sk: 'farm', stars: n >= 5 ? 2 : 1, coin: Math.round(c.val * n * 1.5), why: '잔치 음식 재료가 모자라서' }; });
    kinds.push(() => { const d = pick(G.farm.DISHES.filter((d) => d.val <= 1600)); return d && { id: 'dish:' + d.id, n: 1, sk: 'cook', stars: 2, coin: Math.round(d.val * 1.6), why: '오늘따라 그 맛이 생각나서' }; });
    kinds.push(() => { const [id, a, b] = pick([['wood', 5, 10], ['stone', 4, 8], ['branch', 6, 12], ['fruit_acorn', 4, 8], ['clay', 2, 4]]); const n = rint(a, b), it = G.items.get(id); return { id, n, sk: 'gather', stars: 1, coin: Math.round(it.val * n * 1.5), why: '집 고칠 데가 있어서' }; });
    kinds.push(() => { const n = rint(2, 3); return { cat: 'shell', n, sk: 'gather', stars: 1, coin: n * 200, why: '창가에 장식하려고' }; });
    // 다른 칸과 같은 부탁·같은 이웃은 피한다
    const taken = st.slots.filter(Boolean), dup = (q) => taken.some((o) => (o.id || o.cat) === (q.id || q.cat));
    for (let k = 0; k < 12; k++) {
      const q = pick(kinds)(); if (!q || (k < 10 && dup(q))) continue;
      const w = who(); if (k < 6 && taken.some((o) => o.who === w.who)) { const w2 = who(); if (!taken.some((o) => o.who === w2.who)) Object.assign(w, w2); }
      return Object.assign(q, w, { key: ++st.seq });
    }
    return null;
  }
  const label = (q) => q.cat ? `${CAT[q.cat]} 아무거나 ${q.n}${q.cat === 'bug' || q.cat === 'fish' ? '마리' : '개'}` : `${G.items.name(q.id)} ${q.n}${/^(bug|fish):/.test(q.id) ? '마리' : '개'}`;
  // 가방에서 낼 수 있는 칸: 변이·희귀는 아껴 두고 값싼 것부터
  const matches = (q, s) => q.cat ? (G.items.get(s.id) || {}).cat === q.cat : s.id === q.id;
  const have = (q) => G.inv.slots.reduce((a, s) => a + (matches(q, s) ? s.n : 0), 0);
  function take(q) {
    const idx = G.inv.slots.map((s, i) => [s, i]).filter(([s]) => matches(q, s))
      .sort(([a], [b]) => ((a.x && a.x.v ? 1 : 0) - (b.x && b.x.v ? 1 : 0)) || (G.items.sellPrice(a.id, a.x) - G.items.sellPrice(b.id, b.x)));
    let n = q.n; const del = [];
    for (const [s, i] of idx) { if (n <= 0) break; const k = Math.min(n, s.n); del.push([i, k]); n -= k; }
    del.sort((a, b) => b[0] - a[0]).forEach(([i, k]) => G.inv.removeAt(i, k));
  }
  function refill() {
    const now = Date.now(); let ch = false;
    for (let i = 0; i < 3; i++) if (!st.slots[i] && now >= (st.next[i] || 0)) { st.slots[i] = make(); ch = true; }
    if (ch) G.save.mark('quests');
  }
  Q.ready = () => { refill(); return st.slots.filter((q) => q && have(q) >= q.n).length; };
  // 그리기용(1초에 한 번만 셈)
  let rT = 0, rV = 0; Q.readySoon = () => { const n = performance.now(); if (n - rT > 1000) { rT = n; rV = Q.ready(); } return rV; };

  function finish(i) {
    const q = st.slots[i]; if (!q || have(q) < q.n) return false;
    take(q);
    st.stars += q.stars; st.done++; st.slots[i] = null; st.next[i] = Date.now() + REFILL;
    G.wallet.add(q.coin, 'quest'); if (G.skills) G.skills.add(q.sk, 40 * q.stars + 20);
    let bonus = 0; if (st.done % 10 === 0) { bonus = 5; st.stars += bonus; }
    if (G.npc.st[q.who]) G.npc.st[q.who].fs = (G.npc.st[q.who].fs || 0) + 2;
    G.save.mark('quests'); G.audio.sfx('stamp');
    G.ui.toast(`${q.wname}: 고마워! ⭐${q.stars} · ${G.fmt.money(q.coin)}${bonus ? ` · 의뢰 ${st.done}개 달성 보너스 ⭐${bonus}` : ''}`, { icon: '📋' });
    if (G.game.celebrate) G.game.celebrate(G.player.x, G.player.y - 40, !!bonus);
    G.emit('board:done', { q });
    return true;
  }

  // ---------- 창 ----------
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  Q.open = () => G.ui.modal('의뢰판', (body, close) => {
    let tab = 'q';
    const tabs = el('div', 'tabs'), pane = el('div', 'pane');
    const head = el('div', 'qhead');
    const draw = () => {
      refill();
      head.innerHTML = `<b>⭐ ${st.stars}</b><span class="muted small">끝낸 의뢰 ${st.done}개 · 10개마다 보너스 ⭐5</span>`;
      const on = SHOP.filter((s) => s.id !== 'grow' && Q.buff(s.id)).map((s) => `${s.icon} ${Q.buffLeft(s.id)}분`).join(' ');
      if (on) head.append(el('span', 'qbuff', on));
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
      pane.innerHTML = '';
      (tab === 'q' ? drawQuests : drawShop)(pane);
    };
    const drawQuests = (pane) => {
      for (let i = 0; i < 3; i++) {
        const q = st.slots[i], row = el('div', 'goalrow qrow');
        if (!q) { row.append(el('div', 'muted', `🕐 새 의뢰가 곧 붙어요 (약 ${Math.max(1, Math.ceil(((st.next[i] || 0) - Date.now()) / 60e3))}분)`)); pane.append(row); continue; }
        const h = have(q), ok = h >= q.n, sk = G.skills && G.skills.DEF.find((d) => d.id === q.sk);
        const top = el('div', 'gr-top'); const b = el('b'); b.textContent = `${q.wname}의 부탁`; top.append(b, el('span', '', '⭐'.repeat(q.stars)));
        const txt = el('div'); txt.textContent = `「${q.why} ${label(q)} 갖다 줄래?」`;
        const sub = el('div', 'muted small'); sub.textContent = `가진 것 ${Math.min(h, q.n)}/${q.n} · 보상 ${G.fmt.money(q.coin)}${sk ? ` · ${sk.icon} ${sk.name} 경험치` : ''}`;
        const bar = el('div', 'gbar', `<i style="width:${Math.min(100, h / q.n * 100).toFixed(0)}%"></i>`);
        const btns = el('div', 'qbtns');
        const give = el('button', 'btn small' + (ok ? '' : ' ghost'), ok ? '건네주기' : '모으는 중'); give.disabled = !ok;
        give.onclick = () => { if (finish(i)) draw(); };
        const swap = el('button', 'btn small ghost', '다른 의뢰'); swap.onclick = () => { G.audio.sfx('tap'); st.slots[i] = null; st.next[i] = Date.now() + SWAP; G.save.mark('quests'); draw(); };
        btns.append(swap, give);
        row.append(top, txt, bar, sub, btns); pane.append(row);
      }
      const tip = el('div', 'muted small'); tip.style.marginTop = '6px'; tip.textContent = '의뢰를 끝내면 3분 뒤 새 의뢰가 붙어요. 이웃과도 조금 더 친해져요.';
      const news = el('button', 'btn small ghost', '📰 오늘의 몽글소식'); news.style.marginTop = '8px';
      news.onclick = async () => { close(); await G.game.boardNews(); };
      pane.append(tip, news);
    };
    const drawShop = (pane) => {
      const buy = (price, fn) => { if (st.stars < price) { G.audio.sfx('error'); G.ui.toast(`별이 ${price - st.stars}개 모자라요.`, { icon: '⭐' }); return; } if (fn() === false) return; st.stars -= price; G.save.mark('quests'); G.audio.sfx('coin'); draw(); };
      for (const s of SHOP) {
        const row = el('div', 'goalrow qrow'), top = el('div', 'gr-top'), b = el('b'); b.textContent = `${s.icon} ${s.name}`;
        top.append(b, el('span', '', `⭐${s.price}`));
        const d = el('div', 'muted small'); d.textContent = s.desc + (s.id !== 'grow' && Q.buff(s.id) ? ` · 지금 ${Q.buffLeft(s.id)}분 남음 (사면 10분 연장)` : '');
        const btn = el('button', 'btn small', '바꾸기');
        btn.onclick = () => buy(s.price, () => {
          if (s.id === 'grow') { const k = G.farm.boost(); if (!k) { G.ui.toast('자라는 중인 작물이 없어요. 씨앗을 심고 물을 준 뒤에 써요.', { icon: '🌱' }); return false; } G.ui.toast(`작물 ${k}칸이 쑥 자랐어요!`, { icon: '🌿' }); return; }
          st.buffs[s.id] = Math.max(Date.now(), st.buffs[s.id] || 0) + BUFF; G.ui.toast(`${s.name} 효과 ${Q.buffLeft(s.id)}분!`, { icon: s.icon });
        });
        const btns = el('div', 'qbtns'); btns.append(btn);
        row.append(top, d, btns); pane.append(row);
      }
      // 옷 코너에서만 팔던 옷·모자·머리를 별로도 연다 (날마다 3개)
      const A = G.art; if (!A || !A.PK) return;
      const pool = [];
      for (const it of A.PK.bodies.concat(A.PK.heads)) if (it[2] && it[2].lock === 'shop') pool.push(it);
      for (const sl of A.PK.slots) for (const it of sl.items) if (it[2] && it[2].lock === 'shop') pool.push(it);
      const own = G.player.unlocks || {}, left = pool.filter((it) => !own['pk_' + it[0]]);
      if (!left.length) return;
      pane.append(el('div', 'qsec', '👕 별로 여는 옷 (날마다 바뀌어요)'));
      const R3 = G.rng.stream(G.rng.KEYS.SHOP, G.time.day(), 23), list = [];
      for (let k = 0; k < 3 && left.length; k++) list.push(left.splice(Math.floor(R3() * left.length), 1)[0]);
      for (const it of list) {
        const row = el('div', 'goalrow qrow'), top = el('div', 'gr-top'), b = el('b'); b.textContent = it[1];
        top.append(b, el('span', '', `⭐${WEAR_PRICE}`));
        const btn = el('button', 'btn small', '열기');
        btn.onclick = () => buy(WEAR_PRICE, () => { G.player.unlocks = Object.assign({}, G.player.unlocks, { ['pk_' + it[0]]: 1 }); G.save.mark('player'); G.ui.toast(`${it[1]}을(를) 열었어요! 잎첩 🪞 나에서 입어 봐요.`, { icon: '👕' }); });
        const btns = el('div', 'qbtns'); btns.append(btn); row.append(top, btns); pane.append(row);
      }
    };
    for (const [id, nm] of [['q', '📋 의뢰'], ['shop', '⭐ 별 가게']]) { const b = el('button', 'tab', nm); b.dataset.t = id; b.onclick = () => { G.audio.sfx('tap'); tab = id; draw(); }; tabs.append(b); }
    body.append(head, tabs, pane); draw();
  });

  G.save.section('quests', {
    v: 1, def: () => ({ stars: 0, slots: [null, null, null], next: [0, 0, 0], done: 0, buffs: {}, seq: 0 }),
    get: () => JSON.parse(JSON.stringify(st)),
    set: (d) => {
      st.stars = Math.max(0, d.stars | 0); st.done = d.done | 0; st.seq = d.seq | 0;
      st.slots = [0, 1, 2].map((i) => { const q = d.slots && d.slots[i]; return q && (q.cat || G.items.get(q.id)) && q.n > 0 ? q : null; });
      st.next = [0, 1, 2].map((i) => +(d.next && d.next[i]) || 0);
      st.buffs = {}; for (const k of ['bait', 'honey', 'clover']) if (d.buffs && +d.buffs[k] > 0) st.buffs[k] = +d.buffs[k];
    },
  });
})(window.G);
