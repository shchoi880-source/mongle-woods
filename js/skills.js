// 숙련도 (12차 요청: 하루 종일 하는 사람들을 위한 '끝없이 쌓이는 성장')
// 낚시·곤충·농사·요리·채집 다섯 갈래, 1~50레벨. 하면 할수록 조금씩 좋아진다(희귀 확률·수확·요리 값·덤).
(function (G) {
  'use strict';
  const SK = G.skills = {};
  const MAX = 50;
  const DEF = [
    { id: 'fish', icon: '🎣', name: '낚시', titles: ['낚시 새내기', '강가 친구', '물결 읽는 손', '월척 사냥꾼', '바다의 벗', '전설의 강태공'] },
    { id: 'bug', icon: '🦋', name: '곤충 채집', titles: ['잠자리채 새내기', '풀숲 탐험가', '날개 소리 듣는 귀', '숲의 수집가', '곤충 박사님', '전설의 채집가'] },
    { id: 'farm', icon: '🌱', name: '농사', titles: ['새싹 농부', '흙 만지는 손', '밭의 친구', '풍년 농부', '몽글 대농', '전설의 농부'] },
    { id: 'cook', icon: '🍳', name: '요리', titles: ['주방 새내기', '보글보글 요리사', '맛 내는 손', '마을 셰프', '몽글 미식가', '전설의 요리사'] },
    { id: 'gather', icon: '🪵', name: '채집', titles: ['줍기 새내기', '숲 산책가', '눈 밝은 손', '보물 찾기 선수', '자연의 벗', '전설의 채집꾼'] },
  ];
  const TITLE_AT = [1, 5, 10, 20, 30, 40, 50];
  SK.DEF = DEF; SK.MAX = MAX;
  const st = { xp: {}, lv: {}, total: 0 };
  for (const d of DEF) { st.xp[d.id] = 0; st.lv[d.id] = 1; }

  // 다음 레벨까지 필요한 경험치: 초반은 금방, 뒤로 갈수록 천천히 (50까지 약 20만)
  SK.need = (lv) => Math.round(40 + lv * 25 + lv * lv * 4);
  SK.lv = (id) => st.lv[id] || 1;
  SK.xp = (id) => st.xp[id] || 0;
  SK.title = (id) => { const d = DEF.find((x) => x.id === id), lv = SK.lv(id); let k = 0; for (let i = 1; i < TITLE_AT.length - 1; i++) if (lv >= TITLE_AT[i]) k = i; if (lv >= MAX) k = 5; return d.titles[Math.min(k, 5)]; };
  SK.totalLv = () => DEF.reduce((a, d) => a + SK.lv(d.id), 0);

  // ---------- 좋아지는 점 ----------
  // 희귀(3단계 이상) 생물이 나올 확률 배율: 50레벨에 2배 (+ 별 가게 미끼·꿀 향 2배)
  SK.rareMul = (kind, tier) => {
    if (tier < 3) return 1;
    const id = kind === 'bug' ? 'bug' : 'fish';
    return (1 + (SK.lv(id) - 1) * 0.02) * (G.quests && G.quests.buff(id === 'bug' ? 'honey' : 'bait') ? 2 : 1);
  };
  // 수확 덤(+1개) 확률: 35% → 50레벨 75%
  SK.farmExtra = () => Math.min(0.9, 0.35 + (SK.lv('farm') - 1) * 0.008 + (G.quests && G.quests.buff('clover') ? 0.15 : 0));
  // 요리 판매가 배율: 50레벨 +50%
  SK.cookMul = () => 1 + (SK.lv('cook') - 1) * 0.01;
  // 채집 덤 확률(같은 것 하나 더): 50레벨 30%
  SK.gatherExtra = () => Math.min(0.6, (SK.lv('gather') - 1) * 0.006 + (G.quests && G.quests.buff('clover') ? 0.15 : 0));
  SK.perk = (id) => {
    const p = (v) => Math.round(v * 100);
    switch (id) {
      case 'fish': return `희귀 물고기 확률 ×${(1 + (SK.lv('fish') - 1) * 0.02).toFixed(2)}`;
      case 'bug': return `희귀 곤충 확률 ×${(1 + (SK.lv('bug') - 1) * 0.02).toFixed(2)}`;
      case 'farm': return `수확 덤 확률 ${p(0.35 + (SK.lv('farm') - 1) * 0.008)}%`;
      case 'cook': return `요리 파는 값 +${p(SK.cookMul() - 1)}%`;
      case 'gather': return `주울 때 하나 더 ${p((SK.lv('gather') - 1) * 0.006)}%`;
    }
    return '';
  };

  // ---------- 경험치 ----------
  let pending = null; // 레벨업 알림은 획득 알림과 겹치지 않게 조금 늦게
  SK.add = (id, n) => {
    if (!st.xp.hasOwnProperty(id) || !(n > 0)) return;
    n = Math.round(n * (G.quests && G.quests.buff('clover') ? 1.5 : 1));
    if (st.lv[id] >= MAX) return;
    st.xp[id] += n; st.total += n;
    let up = 0;
    while (st.lv[id] < MAX && st.xp[id] >= SK.need(st.lv[id])) { st.xp[id] -= SK.need(st.lv[id]); st.lv[id]++; up++; }
    if (st.lv[id] >= MAX) st.xp[id] = 0;
    G.save.mark('skills');
    if (up) { pending = pending || {}; pending[id] = st.lv[id]; clearTimeout(SK._t); SK._t = setTimeout(announce, 1400); }
  };
  function announce() {
    const p = pending; pending = null; if (!p) return;
    for (const [id, lv] of Object.entries(p)) {
      const d = DEF.find((x) => x.id === id), newTitle = TITLE_AT.includes(lv);
      G.audio.sfx('stamp');
      G.ui.toast(`${d.name} ${lv}레벨!${newTitle ? ` 「${SK.title(id)}」` : ''} · ${SK.perk(id)}`, { icon: d.icon });
      if (G.game && G.game.celebrate && G.player) G.game.celebrate(G.player.x, G.player.y - 40, lv % 10 === 0);
      // 5레벨마다 작은 선물
      if (lv % 5 === 0) { const gift = lv * 200; G.wallet.add(gift, 'skill'); setTimeout(() => G.ui.toast(`${d.name} ${lv}레벨 축하 선물 ${G.fmt.money(gift)}`, { icon: '🎁' }), 900); }
      G.emit('skill:up', { id, lv });
    }
  }

  const spOf = (kind, ix) => { const t = kind === 'bug' ? 'bugs' : kind === 'fish' ? 'fish' : kind === 'sea' ? 'sea' : null; return t ? G.data.all(t).find((s) => s.ix === ix) : null; };
  G.on('eco:caught', (p) => {
    const sp = spOf(p.kind, p.ix), tier = (sp && sp.tier) || 1, xp = 8 + tier * 8 + (p.v ? 15 : 0);
    if (p.kind === 'bug') SK.add('bug', xp); else if (p.kind === 'fish') SK.add('fish', xp); else if (p.kind === 'sea') SK.add('gather', xp * 0.8);
  });
  G.on('farm:harvest', (p) => { const it = G.items.get('crop:' + p.crop); SK.add('farm', (p.giant ? 40 : 0) + Math.max(4, ((it && it.val) || 60) / 15) * (p.n || 1)); });
  G.on('craft:make', (p) => {
    const r = G.craft && G.craft.RECIPES.find((x) => x.id === p.rid); if (!r) return;
    if (r.cook || r.out.startsWith('dish:')) { const it = G.items.get(r.out); SK.add('cook', 12 + ((it && it.val) || 200) / 25); }
    else SK.add('gather', 6);
  });
  G.on('dig:found', () => SK.add('gather', 18));
  G.on('item:gain', (p) => {
    if (p.src !== 'drop' && p.src !== 'beach') return;
    const it = G.items.get(p.id); if (!it) return;
    SK.add('gather', 3 + Math.min(20, (it.val || 20) / 20) * (p.n || 1));
    // 덤: 같은 것 하나 더 (가방에 자리 있을 때)
    if (Math.random() < SK.gatherExtra() && G.inv.canFit(p.id, null)) {
      G.inv.add(p.id, 1);
      setTimeout(() => G.ui.toast(`눈 밝은 손! ${G.items.name(p.id)} 하나 더`, { icon: '🍀' }), 500);
    }
  });

  G.save.section('skills', {
    v: 1, def: () => ({ xp: {}, lv: {}, total: 0 }),
    get: () => JSON.parse(JSON.stringify(st)),
    set: (d) => {
      for (const x of DEF) { st.lv[x.id] = Math.max(1, Math.min(MAX, (d.lv && d.lv[x.id]) | 0 || 1)); st.xp[x.id] = Math.max(0, (d.xp && d.xp[x.id]) | 0); }
      st.total = d.total | 0;
    },
  });
})(window.G);
