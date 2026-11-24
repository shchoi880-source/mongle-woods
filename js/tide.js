// 조수 웅덩이 + 바다생물 4종 (오너 결정 D7의 「조수 웅덩이 4」). 썰물(조수 < 0.42)일 때 해변에 웅덩이가 드러난다
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE, D = G.data;
  D.table('sea', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'months', 'tier', 'val', 'size'] });
  const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  D.add('sea', [
    { id: 'hermit_crab', ix: 0, name: '소라게', months: ALL, tier: 1, val: 200, size: [3, 6], w: 10, col: ['#ff8a6a', '#f6d4b0'] },
    { id: 'starfish', ix: 1, name: '불가사리', months: ALL, tier: 1, val: 260, size: [8, 15], w: 8, col: ['#ffa94d', '#ffd8a8'] },
    { id: 'anemone', ix: 2, name: '말미잘', months: [4, 5, 6, 7, 8, 9, 10, 11], tier: 2, val: 500, size: [4, 9], w: 5, col: ['#ff8fb1', '#ffd1e0'] },
    { id: 'baby_octopus', ix: 3, name: '꼬마 문어', months: ALL, tier: 3, val: 1500, size: [10, 18], w: 2, col: ['#c97aa8', '#f3c6de'] },
  ]);
  D.add('items', D.all('sea').map((s) => ({ id: 'sea:' + s.id, name: s.name, cat: 'sea', val: s.val, stack: 1, ref: s })));
  G.TRENDS.push({ id: 'sea', name: '바다생물', test: (it) => it.cat === 'sea' });

  const LOW = 0.42;
  const T = G.tide = {
    pools: [], poolsDay: -1,
    low: () => G.time.tide() < LOW,
    // 다음 썰물까지 남은 시간(분) — 신문·안내용
    nextLowMin() { const now = G.time.now() / 60000; for (let m = 0; m < 760; m += 5) { const p = ((now + m) % 745) / 745; if (0.5 + 0.5 * Math.cos(p * Math.PI * 2) < LOW) return m; } return 0; },
    refresh(day) {
      if (T.poolsDay === day || !G.world.map) return;
      T.poolsDay = day; T.pools = [];
      const W = G.world, m = W.map, R = G.rng.stream(G.rng.KEYS.DAY, day, 41);
      const cand = [];
      for (let y = W.HIGH_ROWS; y < m.h - 1; y++) for (let x = 2; x < m.w - 2; x++) if (W.tile(x, y) === G.TERR.SAND && W.tile(x, y + 1) === G.TERR.SEA && !W.objAtTile(x, y)) cand.push([x, y]);
      const n = Math.min(cand.length, 6 + Math.floor(R() * 4));
      for (let k = 0; k < n; k++) {
        const [x, y] = cand.splice(Math.floor(R() * cand.length), 1)[0];
        if (T.pools.some((p) => Math.abs(p.tx - x) < 3 && Math.abs(p.ty - y) < 2)) continue;
        const month = G.time.dayDate(day).m;
        const pool = D.all('sea').filter((s) => s.months.includes(month));
        const sp = R() < 0.75 ? u.pickW(pool, R()) : null; // 25%는 빈 웅덩이
        T.pools.push({ tx: x, ty: y, id: 'tp' + k, sp: sp && sp.id, v: R() < 0.06 ? 1 : 0, size: sp ? Math.round(u.lerp(sp.size[0], sp.size[1], R()) * 10) / 10 : 0 });
      }
    },
    near(x, y, r) {
      if (!T.low()) return null;
      for (const p of T.pools) { const px = p.tx * TILE + 16, py = p.ty * TILE + 22; if (u.dist(px, py, x, y) < r && p.sp && !G.world.isTaken(p.id)) return p; }
      return null;
    },
    catch(p) {
      const sp = D.get('sea', p.sp), giant = p.v === 1;
      const r = G.collect.record('sea', sp.ix, p.v, p.size);
      const x = { size: giant ? Math.round(p.size * 1.5 * 10) / 10 : p.size, v: p.v, newSp: r.newSp };
      if (G.game.gain('sea:' + sp.id, 1, x, { msg: `${G.josa(G.items.name('sea:' + sp.id, x), '을/를')} 잡았다!` })) {
        G.world.take(p.id); G.emit('eco:caught', { kind: 'sea', ix: sp.ix, v: p.v, size: x.size });
        return true;
      }
      return false;
    },
    // 웅덩이 그리기 (데칼 층)
    draw(ctx, rect, t) {
      const low = T.low(), P = G.art.paint;
      for (const p of T.pools) {
        const x = p.tx * TILE + 16, y = p.ty * TILE + 22;
        if (x < rect.x - 40 || x > rect.x + rect.w + 40 || y < rect.y - 40 || y > rect.y + rect.h + 40) continue;
        if (!low) continue; // 밀물엔 물에 잠겨 안 보인다
        P.blob(ctx, x, y + 2, 15, 7, '#c9a777');
        P.blob(ctx, x, y, 14, 6, '#7fd0e6');
        P.blob(ctx, x - 4, y - 2, 5, 1.6, 'rgba(255,255,255,0.7)');
        if (!p.sp || G.world.isTaken(p.id)) continue;
        const sp = D.get('sea', p.sp), c = sp.col, k = Math.sin(t * 3 + p.tx) * 1.2;
        ctx.save(); ctx.translate(x + k, y - 1);
        if (p.sp === 'hermit_crab') { P.blob(ctx, 1, -2, 4, 3.5, c[1], A_LINE, 1); P.blob(ctx, -3, 0, 2.5, 2, c[0], A_LINE, 1); }
        else if (p.sp === 'starfish') { ctx.fillStyle = c[0]; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.8 : 4.6, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); }
        else if (p.sp === 'anemone') { for (let i = 0; i < 6; i++) P.blob(ctx, Math.cos(i) * 2.5, Math.sin(i) * 1.5 - 1 + Math.sin(t * 4 + i) * 0.5, 1.2, 2, c[0]); P.blob(ctx, 0, -1, 1.5, 1.2, c[1]); }
        else { P.blob(ctx, 0, -2, 3.5, 3, c[0], A_LINE, 1); for (let i = -2; i <= 2; i++) P.blob(ctx, i * 1.6, 1 + Math.abs(Math.sin(t * 5 + i)), 0.8, 1.6, c[0]); P.blob(ctx, -1.2, -2.5, 0.6, 0.8, '#2d2430'); P.blob(ctx, 1.2, -2.5, 0.6, 0.8, '#2d2430'); }
        ctx.restore();
      }
    },
  };
  const A_LINE = '#5b4636';
  G.on('time:day', (p) => T.refresh(p.day));

  // 아이콘
  const drawIconBase = G.art && G.art.drawIcon;
  if (G.art) G.art.drawIcon = (g, id, t) => {
    if (!id.startsWith('sea:')) return drawIconBase(g, id, t);
    const key = id.slice(4).split('#')[0], sp = D.get('sea', key); if (!sp) return;
    const c = sp.col, P = G.art.paint;
    g.save(); g.translate(16, 17);
    if (key === 'hermit_crab') { P.blob(g, 3, -3, 9, 8, c[1], A_LINE, 1.4); g.strokeStyle = '#d9a87a'; g.lineWidth = 1.4; g.beginPath(); g.arc(3, -3, 4, 0, Math.PI * 1.5); g.stroke(); P.blob(g, -6, 3, 5, 4, c[0], A_LINE, 1.3); P.blob(g, -8, 0, 1, 1.4, '#2d2430'); P.blob(g, -5, 0, 1, 1.4, '#2d2430'); }
    else if (key === 'starfish') { g.fillStyle = c[0]; g.strokeStyle = A_LINE; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1); } g.closePath(); g.fill(); g.stroke(); P.blob(g, 0, 1, 2, 2, c[1]); }
    else if (key === 'anemone') { P.rrect(g, -6, 2, 12, 8, 3, c[1], A_LINE, 1.3); for (let i = 0; i < 7; i++) { g.strokeStyle = c[0]; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6 + i * 2, 2); g.quadraticCurveTo(-8 + i * 2.6, -6, -9 + i * 3, -9); g.stroke(); } }
    else { P.blob(g, 0, -4, 9, 8, c[0], A_LINE, 1.4); for (let i = -3; i <= 3; i++) { g.strokeStyle = c[0]; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(i * 2, 3); g.quadraticCurveTo(i * 3, 8, i * 3.4 + 1, 11); g.stroke(); } P.blob(g, -3, -4, 1.6, 2, '#2d2430'); P.blob(g, 3, -4, 1.6, 2, '#2d2430'); P.blob(g, 0, -9, 3, 1.4, c[1]); }
    g.restore();
  };

  G.modules.add('tide');
})(globalThis.G);
