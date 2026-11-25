// 계절 축제 (6차 회의 묶음 C): 마을 달력의 축제 기간에 축제 조각이 마을에 떨어진다 → 20개를 보리 할멈에게 가져가면 그 축제에서만 받는 모자
// 축제 4개 모자를 다 모으면 황금 왕관. 벌 없음 — 놓친 축제는 마을 1년 뒤(실제 몇 시간 플레이) 또 온다
(function (G) {
  'use strict';
  const TILE = G.C.TILE;
  const NEED = 20;
  const FESTS = [
    { id: 'blossom', name: '벚꽃 축제', m: 4, d: [1, 10], token: 'fest_petal', tname: '벚꽃잎', hat: 13, hatName: '벚꽃 핀', icon: '🌸', col: ['#ffc2d6', '#ff8fb1'] },
    { id: 'summer', name: '여름 바다 축제', m: 8, d: [1, 10], token: 'fest_shell', tname: '반짝 소라', hat: 14, hatName: '수박 모자', icon: '🍉', col: ['#9fe0ff', '#4d96ff'] },
    { id: 'autumn', name: '단풍 축제', m: 10, d: [1, 10], token: 'fest_leaf', tname: '단풍잎', hat: 15, hatName: '호박 모자', icon: '🍁', col: ['#ff9a3a', '#d0502a'] },
    { id: 'winter', name: '눈꽃 축제', m: 12, d: [10, 20], token: 'fest_snow', tname: '눈결정', hat: 16, hatName: '눈송이 왕관', icon: '❄️', col: ['#e6f3ff', '#8fb4ff'] },
  ];
  G.data.add('items', FESTS.map((f) => ({ id: f.token, name: f.tname, cat: 'fest', val: 30, stack: 30, ref: f })));

  const st = { got: {} }; // 받은 축제 모자 {blossom: 연도}
  const FE = G.fest = { FESTS, NEED, st };
  FE.byId = (id) => FESTS.find((f) => f.id === id) || (id === 'gold' ? { name: '축제 모자 4개 모으기' } : null);
  // 오늘 열린 축제 (마을 달력)
  FE.now = () => {
    if (!G.time) return null;
    const dd = G.time.dayDate(G.time.day());
    return FESTS.find((f) => f.m === dd.m && dd.d >= f.d[0] && dd.d <= f.d[1]) || null;
  };
  const unlocked = (f) => !!(G.player.unlocks && G.player.unlocks['hat' + f.hat]);
  FE.unlock = (hat) => { G.player.unlocks = Object.assign({}, G.player.unlocks, { ['hat' + hat]: 1 }); G.save.mark('unlock'); };

  // 축제 조각 뿌리기: 축제 중이면 내 주변(6~12칸)에 가끔 떨어진다. 근처에 6개까지
  let spawnT = 5;
  FE.update = (dt) => {
    const f = FE.now(); if (!f || !G.game.started || (G.net && G.net.guest) || (G.house && G.house.inside)) return;
    spawnT -= dt; if (spawnT > 0) return; spawnT = 8 + Math.random() * 6;
    const pl = G.player, W = G.world;
    const near = G.game.drops.filter((d) => d.id === f.token && Math.hypot(d.x - pl.x, d.y - pl.y) < TILE * 16).length;
    if (near >= 6) return;
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 6;
      const tx = Math.floor(pl.x / TILE + Math.cos(a) * r), ty = Math.floor(pl.y / TILE + Math.sin(a) * r);
      if (!W.walkableTile(tx, ty) || W.objAtTile(tx, ty)) continue;
      G.game.dropItem(f.token, tx * TILE + 16, ty * TILE + 18, 1);
      return;
    }
  };

  // 보리 할멈: 조각 20개 → 축제 모자. 처리했으면 true
  FE.boriTalk = async () => {
    for (const f of FESTS) {
      if (unlocked(f) || G.inv.count(f.token) < NEED) continue;
      G.inv.removeId(f.token, NEED);
      FE.unlock(f.hat); st.got[f.id] = G.time.dayDate(G.time.day()).y;
      G.audio.sfx('stamp');
      await G.ui.say([
        { who: 'bori', text: `${f.tname}${G.josa(f.tname, '을/를').slice(-1)} ${NEED}개나 모았구나! ${f.name}의 선물이란다. 콕!` },
        { who: 'sys', text: `${f.icon} 「${f.hatName}」을 받았어요! 잎첩 🪞 나 → 🎨 직접 꾸미기 → 머리 장식에서 써 볼 수 있어요.` },
      ]);
      if (FESTS.every(unlocked) && !(G.player.unlocks || {}).hat17) {
        FE.unlock(17); G.audio.sfx('rare');
        await G.ui.say([{ who: 'bori', text: '네 개의 축제 모자를 다 모았구나…! 이건 몽글숲에서 제일 귀한 거란다.' }, { who: 'sys', text: '👑 「황금 왕관」을 받았어요!' }]);
      }
      G.save.now('fest');
      return true;
    }
    const f = FE.now();
    if (f && !unlocked(f) && G.inv.count(f.token) > 0) { await G.ui.say([{ who: 'bori', text: `${f.name}이로구나! ${f.tname} ${NEED}개를 모아 오면 좋은 걸 주마. (지금 ${G.inv.count(f.token)}개) 콕!` }]); return true; }
    return false;
  };

  // 축제 시작 알림
  G.on('time:day', () => {
    if (!G.game || !G.game.started) return;
    const f = FE.now(), dd = G.time.dayDate(G.time.day());
    if (f && dd.d === f.d[0]) setTimeout(() => G.ui.toast(`${f.icon} ${f.name}가 시작됐어요! 마을에 떨어진 ${f.tname}을 모아 보리 할멈에게 가져가요.`, { icon: '🎉', ms: 5500 }), 3500);
  });

  // 아이콘
  if (G.art) {
    const base = G.art.drawIcon;
    G.art.drawIcon = (g, id, t) => {
      const f = FESTS.find((x) => x.token === id.split('#')[0]); if (!f) return base(g, id, t);
      const P = G.art.paint, L = '#5b4636', c = f.col;
      g.save(); g.translate(16, 17);
      if (f.id === 'blossom') { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; P.blob(g, Math.cos(a) * 6, Math.sin(a) * 6, 5, 5, c[0], L, 1.1); } P.blob(g, 0, 0, 3, 3, '#ffe28a'); }
      else if (f.id === 'summer') { P.blob(g, 0, 2, 10, 8, c[0], L, 1.4); g.strokeStyle = c[1]; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 1, 4, 0, Math.PI * 1.6); g.stroke(); P.blob(g, -4, -3, 2.4, 1.4, 'rgba(255,255,255,0.8)'); }
      else if (f.id === 'autumn') { g.fillStyle = c[0]; g.strokeStyle = L; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 5 : 12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9); } g.closePath(); g.fill(); g.stroke(); g.strokeStyle = c[1]; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, 12); g.stroke(); }
      else { g.strokeStyle = c[1]; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); g.lineTo(Math.cos(a + 0.5) * 9, Math.sin(a + 0.5) * 9); } g.stroke(); P.blob(g, 0, 0, 3, 3, c[0], L, 1); }
      g.restore();
    };
  }

  G.save.section('fest', { v: 1, def: () => ({ got: {} }), get: () => JSON.parse(JSON.stringify(st)), set: (d) => { st.got = d.got || {}; } });
  G.modules.add('festival');
})(globalThis.G);
