// 묶음 3: 텃밭(농사) — 집 옆 6칸(집 단계마다 +3), 계절 작물 12종, 물 주기(비·눈 오는 날은 자동), 수확·거대 작물, 요리 8종
// 원칙: 벌 없음 — 물을 깜빡해도 시들지 않고 그날은 자라지 않을 뿐
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE, D = G.data;
  const SEASON_OF = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
  D.table('crops', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'season', 'grow', 'seed', 'val'] });
  D.add('crops', [
    { id: 'radish', ix: 0, name: '무', season: 'winter', grow: 3, seed: 80, val: 240, col: ['#ffffff', '#7cc35a'] },
    { id: 'spinach', ix: 1, name: '시금치', season: 'winter', grow: 2, seed: 60, val: 160, col: ['#4e9e4a', '#7cc35a'] },
    { id: 'cabbage', ix: 2, name: '배추', season: 'winter', grow: 5, seed: 150, val: 520, col: ['#e8f5c8', '#8fcf6a'] },
    { id: 'strawberry', ix: 3, name: '딸기', season: 'spring', grow: 4, seed: 120, val: 380, col: ['#ff5a6a', '#7cc35a'] },
    { id: 'carrot', ix: 4, name: '당근', season: 'spring', grow: 3, seed: 70, val: 220, col: ['#ff9a3a', '#7cc35a'] },
    { id: 'potato', ix: 5, name: '감자', season: 'spring', grow: 4, seed: 90, val: 280, col: ['#d9b07a', '#7cc35a'] },
    { id: 'tomato', ix: 6, name: '토마토', season: 'summer', grow: 4, seed: 100, val: 320, col: ['#ff5a4a', '#5aa548'] },
    { id: 'watermelon', ix: 7, name: '수박', season: 'summer', grow: 6, seed: 200, val: 760, col: ['#3f9a4a', '#7cc35a'] },
    { id: 'corn', ix: 8, name: '옥수수', season: 'summer', grow: 5, seed: 130, val: 420, col: ['#ffd24d', '#7cc35a'] },
    { id: 'pumpkin', ix: 9, name: '호박', season: 'autumn', grow: 5, seed: 160, val: 560, col: ['#ff9a3a', '#5aa548'] },
    { id: 'sweet_potato', ix: 10, name: '고구마', season: 'autumn', grow: 4, seed: 100, val: 320, col: ['#b0507a', '#7cc35a'] },
    { id: 'wheat', ix: 11, name: '밀', season: 'autumn', grow: 3, seed: 60, val: 180, col: ['#e8c45a', '#c9b45a'] },
  ]);
  const items = [];
  for (const c of D.all('crops')) {
    items.push({ id: 'seed:' + c.id, name: c.name + ' 씨앗', cat: 'seed', val: Math.round(c.seed / 2), stack: 30, ref: c });
    items.push({ id: 'crop:' + c.id, name: c.name, cat: 'crop', val: c.val, stack: 10, ref: c });
  }
  const DISHES = [
    { id: 'radish_soup', name: '무 시금치국', val: 900, need: [['crop:radish', 1], ['crop:spinach', 1]] },
    { id: 'cabbage_stew', name: '배추찜', val: 1300, need: [['crop:cabbage', 1], ['crop:radish', 1]] },
    { id: 'jam', name: '딸기잼', val: 1000, need: [['crop:strawberry', 2]] },
    { id: 'carrot_soup', name: '당근 수프', val: 900, need: [['crop:carrot', 1], ['crop:potato', 1]] },
    { id: 'hwachae', name: '수박화채', val: 1500, need: [['crop:watermelon', 1], ['crop:tomato', 1]] },
    { id: 'grilled_corn', name: '옥수수 구이', val: 1000, need: [['crop:corn', 2]] },
    { id: 'pumpkin_pie', name: '호박 파이', val: 1400, need: [['crop:pumpkin', 1], ['crop:wheat', 2]] },
    { id: 'matang', name: '고구마 맛탕', val: 900, need: [['crop:sweet_potato', 2]] },
  ];
  for (const d of DISHES) items.push({ id: 'dish:' + d.id, name: d.name, cat: 'dish', val: d.val, stack: 10, ref: d });
  D.add('items', items);
  G.TOOLS.can = { name: '물뿌리개', icon: '🚿', price: 300 };
  G.TRENDS.push({ id: 'crop', name: '텃밭 작물', test: (it) => it.cat === 'crop' });
  // 요리는 작업대 레시피에 추가
  if (G.craft) for (const d of DISHES) G.craft.RECIPES.push({ id: 'cook_' + d.id, out: 'dish:' + d.id, need: d.need, name: d.name, cook: true });

  // ---------- 상태 ----------
  // plots: [{tx,ty, crop, prog, water(day), giant}]
  const st = { plots: [], lastTick: -1, harvested: 0, giants: 0, seedGift: false, dry: 0 };
  const F = G.farm = { st, DISHES, SEASON_OF };

  // 텃밭 자리: 집(텐트) 문 근처 풀밭에서 3칸씩 줄 (지도는 바꾸지 않고 '데칼'로만 그린다)
  F.ensurePlots = () => {
    const W = G.world, m = W.map; if (!m) return;
    const want = 6 + (G.nest ? G.nest.st.stage : 0) * 3;
    if (st.plots.length >= want) return;
    const tent = m.plots.tent, door = tent.door;
    const used = new Set(st.plots.map((p) => p.tx + ',' + p.ty));
    const ok = (x, y) => W.tile(x, y) === G.TERR.GRASS && !W.objAtTile(x, y) && !used.has(x + ',' + y) && !(x === door.x && y >= door.y && y <= door.y + 2);
    // 문 옆(왼쪽·오른쪽)부터 나선으로 3칸 가로줄을 찾는다
    for (let r = 1; r < 9 && st.plots.length < want; r++) {
      for (const [dx, dy] of [[r + 1, 0], [-(r + 3), 0], [r + 1, 1], [-(r + 3), 1], [-1, r + 1], [-1, -(r + 1)], [r + 1, -1], [-(r + 3), -1]]) {
        if (st.plots.length >= want) break;
        const x0 = door.x + dx, y0 = door.y + dy;
        if ([0, 1, 2].every((k) => ok(x0 + k, y0))) for (let k = 0; k < 3; k++) { st.plots.push({ tx: x0 + k, ty: y0, crop: null, prog: 0, water: -1, giant: false }); used.add(x0 + k + ',' + y0); }
      }
    }
    G.save.mark('farm');
  };
  const wetDay = (day) => { const p = G.weather.pattern(day); return p === 'shower' || p === 'rainy'; };
  // 하루가 지나면: 어제 물을 줬거나 비·눈이 왔으면 한 단계 자란다 (여러 날 건너뛰면 첫날만)
  F.tick = (day) => {
    if (st.lastTick < 0) { st.lastTick = day; return; }
    if (day <= st.lastTick) return;
    const prev = day - 1;
    for (const p of st.plots) {
      if (!p.crop) continue;
      const c = D.get('crops', p.crop);
      if (p.prog >= c.grow) continue;
      if (p.water === prev || p.water === st.lastTick || wetDay(prev)) p.prog++;
    }
    st.lastTick = day; G.save.mark('farm');
  };
  F.stage = (p) => { if (!p.crop) return -1; const c = D.get('crops', p.crop); return p.prog >= c.grow ? 3 : p.prog === 0 ? 0 : p.prog / c.grow < 0.5 ? 1 : 2; };
  F.watered = (p) => p.water === G.time.day() || wetDay(G.time.day()) && G.weather.now().type !== 'clear';
  F.at = (tx, ty) => st.plots.find((p) => p.tx === tx && p.ty === ty);
  F.seedsInBag = () => G.inv.slots.filter((s) => s.id.startsWith('seed:'));

  F.target = (fx, fy) => {
    const p = F.at(Math.floor(fx / TILE), Math.floor(fy / TILE)); if (!p) return null;
    const s = F.stage(p);
    if (s === 3) return { kind: 'farm', ref: p, act: 'harvest', icon: '🧺', label: '수확', name: D.get('crops', p.crop).name };
    if (s >= 0) return { kind: 'farm', ref: p, act: F.watered(p) ? 'look' : 'water', icon: F.watered(p) ? '🌱' : 'tool:can', label: F.watered(p) ? '보기' : '물 주기', name: D.get('crops', p.crop).name };
    return { kind: 'farm', ref: p, act: 'plant', icon: '🌰', label: '심기', name: '텃밭' };
  };
  F.act = async (tg) => {
    const p = tg.ref, pl = G.player;
    if (tg.act === 'plant') {
      const seeds = F.seedsInBag();
      if (!seeds.length) { await G.ui.say([{ who: 'sys', text: '빈 텃밭이에요. 땅굴상점에서 계절 씨앗을 사 와서 심어요.' }]); return; }
      let seed = seeds[0];
      if (seeds.length > 1) { const names = seeds.slice(0, 3).map((s) => G.items.get(s.id).name); const i = await G.ui.choose({ who: 'sys', text: '어떤 씨앗을 심을까요?' }, names.concat(['그만두기'])); if (i >= names.length) return; seed = seeds[i]; }
      const c = G.items.get(seed.id).ref;
      G.inv.removeAt(G.inv.slots.indexOf(seed), 1);
      Object.assign(p, { crop: c.id, prog: 0, water: -1, giant: false });
      pl.squash = 0.12; G.audio.sfx('dig'); G.emit('farm:plant', { crop: c.id });
      if (c.season !== SEASON_OF(G.time.month())) G.ui.toast(`${c.name}는 ${({ spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' })[c.season]} 작물이라 천천히 자랄지도 몰라요. (그래도 자라요!)`, { icon: '🌱' });
      if (!pl.hasTool('can')) G.ui.toast('물뿌리개는 땅굴상점에서 팔아요.', { icon: '🚿' });
      else G.events.tip('water', '심었으면 물을 줘요! 하루 한 번, 비 오는 날은 쉬어도 돼요.');
      G.save.mark('farm'); return;
    }
    if (tg.act === 'water') {
      if (!pl.hasTool('can')) { await G.ui.say([{ who: 'sys', text: '물뿌리개가 없어요. 땅굴상점에서 팔아요.' }]); return; }
      p.water = G.time.day(); pl.swing = 0.001; pl.busy = 0.35; G.audio.sfx('plop');
      for (let k = 0; k < 8; k++) G.game.fx.push({ x: p.tx * TILE + 16 + (Math.random() - 0.5) * 16, y: p.ty * TILE + 10, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 30, t: 0, life: 0.5, kind: 'drop', c: '#a7e3ff' });
      // 옆 칸도 물이 안 줬으면 같이 (물뿌리개는 넓게 뿌린다)
      for (const q of st.plots) if (q !== p && q.crop && Math.abs(q.tx - p.tx) <= 1 && q.ty === p.ty) q.water = G.time.day();
      G.emit('farm:water', {}); G.save.mark('farm'); return;
    }
    if (tg.act === 'harvest') {
      const c = D.get('crops', p.crop);
      // 거대 작물: 12% ("잘 나오네" 정도, 오너 요청) + 8번 연속 안 나오면 다음은 확정
      const giant = (st.dry || 0) >= 8 || u.hashf(G.rng.seed, G.time.day(), p.tx, p.ty, st.harvested) < 0.12;
      st.dry = giant ? 0 : (st.dry || 0) + 1;
      const n = giant ? 1 : 1 + (u.hashf(G.rng.seed, p.tx, p.ty, G.time.day()) < 0.35 ? 1 : 0);
      const x = giant ? { v: 1, size: Math.round(c.val / 10) } : null;
      if (!G.inv.canFit('crop:' + c.id, x)) { G.audio.sfx('error'); G.ui.toast('가방이 꽉 찼어요!', { icon: '🎒' }); return; }
      if (G.game.gain('crop:' + c.id, n, x, { msg: giant ? `거대 ${c.name}를 수확했다! 쫑알이 보면 1면감이야!` : `${c.name} ${n}개 수확!`, src: 'farm' })) {
        Object.assign(p, { crop: null, prog: 0, water: -1, giant: false });
        st.harvested += n; if (giant) st.giants++;
        G.emit('farm:harvest', { crop: c.id, n, giant });
        G.save.mark('farm');
      }
      return;
    }
    const c = D.get('crops', p.crop);
    await G.ui.say([{ who: 'sys', text: `${c.name}가 자라고 있어요. (${Math.min(p.prog, c.grow)}/${c.grow}일) 오늘 물은 이미 줬어요.` }]);
  };

  // ---------- 그리기 ----------
  F.drawSoil = (ctx, rect) => {
    const P = G.art.paint;
    for (const p of st.plots) {
      const x = p.tx * TILE, y = p.ty * TILE;
      if (x < rect.x - 40 || x > rect.x + rect.w + 40 || y < rect.y - 40 || y > rect.y + rect.h + 40) continue;
      const wet = p.crop && F.watered(p);
      P.rrect(ctx, x + 2, y + 3, 28, 27, 6, wet ? '#8a5f3f' : '#b98a5e');
      ctx.strokeStyle = wet ? 'rgba(60,35,20,0.35)' : 'rgba(120,80,50,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (const k of [10, 17, 24]) { ctx.moveTo(x + 6, y + k); ctx.lineTo(x + 26, y + k); } ctx.stroke();
    }
  };
  F.collect = (R, rect, t) => {
    const P = G.art.paint;
    for (const p of st.plots) {
      if (!p.crop) continue;
      const x = p.tx * TILE + 16, y = p.ty * TILE + 22;
      if (x < rect.x - 40 || x > rect.x + rect.w + 40 || y < rect.y - 40 || y > rect.y + rect.h + 60) continue;
      const s = F.stage(p), c = D.get('crops', p.crop), col = c.col, sway = Math.sin(t * 2 + p.tx) * 0.08;
      R.push({ sy: y, draw: (ctx) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
        if (s === 0) { P.blob(ctx, 0, -2, 2.4, 1.6, '#6a4a30'); }
        else if (s === 1) { for (const k of [-1, 1]) { ctx.save(); ctx.rotate(k * 0.5); P.blob(ctx, k * 2, -6, 2.4, 4.5, col[1], '#3f7a3a', 1); ctx.restore(); } }
        else if (s === 2) { for (const k of [-1, 0, 1]) { ctx.save(); ctx.rotate(k * 0.55); P.blob(ctx, 0, -9, 3.2, 7, col[1], '#3f7a3a', 1.1); ctx.restore(); } }
        else {
          for (const k of [-1, 1]) { ctx.save(); ctx.rotate(k * 0.6); P.blob(ctx, 0, -10, 3, 7, col[1], '#3f7a3a', 1.1); ctx.restore(); }
          P.blob(ctx, 0, -6, 6.5, 5.5, col[0], '#5b4636', 1.3); P.blob(ctx, -2, -8, 2, 1.2, 'rgba(255,255,255,0.6)');
          const k = (t * 0.8 + p.tx * 0.3) % 1; ctx.strokeStyle = `rgba(255,240,150,${1 - k})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -6, 7 + k * 6, 0, 6.3); ctx.stroke();
        }
        ctx.restore();
      } });
    }
  };
  // 아이콘
  if (G.art) {
    const base = G.art.drawIcon;
    G.art.drawIcon = (g, id, t) => {
      const cat = id.split(':')[0];
      if (cat !== 'seed' && cat !== 'crop' && cat !== 'dish' && id !== 'tool:can') return base(g, id, t);
      const P = G.art.paint, L = '#5b4636', key = id.split(':')[1] && id.split(':')[1].split('#')[0];
      g.save();
      if (id === 'tool:can') { P.rrect(g, 6, 12, 16, 14, 4, '#8fd3ff', L, 1.4); g.strokeStyle = L; g.lineWidth = 1.4; g.beginPath(); g.moveTo(22, 16); g.lineTo(29, 9); g.stroke(); P.blob(g, 29, 9, 2.5, 2, '#8fd3ff', L, 1); g.beginPath(); g.arc(14, 12, 6, Math.PI, 0); g.stroke(); }
      else if (cat === 'seed') { const c = D.get('crops', key); P.rrect(g, 7, 6, 18, 22, 3, '#f3e2b4', L, 1.4); P.blob(g, 16, 15, 5, 5, c.col[0], L, 1); P.blob(g, 16, 22, 4, 1.5, '#b98a5e'); }
      else if (cat === 'crop') {
        const c = D.get('crops', key), col = c.col;
        if (key === 'radish' || key === 'carrot') { g.fillStyle = col[0]; g.strokeStyle = L; g.lineWidth = 1.4; g.beginPath(); g.moveTo(10, 12); g.quadraticCurveTo(16, 34, 22, 12); g.closePath(); g.fill(); g.stroke(); for (const k of [-4, 0, 4]) P.blob(g, 16 + k, 7, 2.4, 5, col[1], L, 1); }
        else if (key === 'wheat' || key === 'corn') { P.rrect(g, 12, 6, 8, 22, 4, col[0], L, 1.4); g.strokeStyle = 'rgba(150,110,40,0.5)'; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(12, 9 + k * 5); g.lineTo(20, 9 + k * 5); } g.stroke(); P.blob(g, 9, 22, 3, 7, col[1], L, 1); }
        else if (key === 'spinach' || key === 'cabbage') { for (const [x, y, r] of [[11, 18, 7], [21, 18, 7], [16, 13, 8]]) P.blob(g, x, y, r, r * 0.9, key === 'cabbage' ? col[0] : col[1], L, 1.2); P.blob(g, 16, 22, 6, 4, col[1]); }
        else { P.blob(g, 16, 18, 10, 9, col[0], L, 1.4); P.blob(g, 12, 14, 3, 2, 'rgba(255,255,255,0.5)'); P.blob(g, 16, 8, 4, 2.5, col[1], L, 1); if (key === 'watermelon') { g.strokeStyle = '#2a6a3a'; g.lineWidth = 1.4; g.beginPath(); for (const k of [-5, 0, 5]) { g.moveTo(16 + k, 10); g.quadraticCurveTo(16 + k * 1.4, 18, 16 + k, 26); } g.stroke(); } if (key === 'strawberry') for (const [x, y] of [[12, 17], [19, 15], [16, 22]]) P.blob(g, x, y, 0.8, 1, '#ffe28a'); }
      } else if (cat === 'dish') { P.blob(g, 16, 22, 13, 5, '#ffffff', L, 1.4); P.blob(g, 16, 18, 10, 6, ({ radish_soup: '#e8d8a8', cabbage_stew: '#c9e08a', jam: '#ff5a6a', carrot_soup: '#ff9a3a', hwachae: '#ff8fa8', grilled_corn: '#ffd24d', pumpkin_pie: '#e88a3a', matang: '#c97a3a' })[key] || '#ddd', L, 1.2); P.blob(g, 12, 16, 3, 1.4, 'rgba(255,255,255,0.6)'); for (const k of [-4, 0, 4]) { g.strokeStyle = 'rgba(200,200,220,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16 + k, 10); g.quadraticCurveTo(18 + k, 6, 16 + k, 3); g.stroke(); } }
      g.restore();
    };
  }

  G.on('time:day', (p) => { if (G.world.map) { F.tick(p.day); F.ensurePlots(); } });
  G.on('house:stage', () => F.ensurePlots());
  G.save.section('farm', {
    v: 1, def: () => ({ plots: [], lastTick: -1, harvested: 0, giants: 0, seedGift: false }),
    get: () => JSON.parse(JSON.stringify(st)), set: (d) => Object.assign(st, d),
  });
  G.modules.add('farm');
})(globalThis.G);
