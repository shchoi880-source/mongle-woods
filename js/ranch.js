// 묶음 4: 목장 — 닭·소·양·돼지·조랑말. 쓰다듬으면 몇 분 뒤 생산물(거두면 또 쓰다듬기). 여물통 먹이 = 두 배. 조랑말은 탈 수 있다
// 시간(2026-11 개편): hrs = 마을 시간(= 실제 분). 아기는 마을 하루(24분)면 어른
// 원칙: 벌 없음 — 돌보지 않아도 아프거나 떠나지 않고, 그날 생산물만 없다
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE, D = G.data;
  const KINDS = {
    chicken: { name: '닭', baby: '병아리', price: 800, prod: 'egg', hrs: 2, col: ['#ffffff', '#ff6b5a'] },
    cow: { name: '소', baby: '송아지', price: 3000, prod: 'milk', hrs: 3, col: ['#ffffff', '#4a3f3a'] },
    sheep: { name: '양', baby: '아기 양', price: 2000, prod: 'wool', hrs: 5, col: ['#fbf8f2', '#5a4a4a'] },
    pig: { name: '돼지', baby: '아기 돼지', price: 2500, prod: 'truffle', hrs: 4, col: ['#ffb8c6', '#e8889c'] },
    pony: { name: '조랑말', baby: '아기 조랑말', price: 5000, prod: null, hrs: 1, col: ['#c98e5a', '#7a4f2e'] },
  };
  const NAMES = { chicken: ['꼬꼬', '삐약', '노른', '깃털'], cow: ['얼룩', '우유', '음매', '구름'], sheep: ['보들', '복슬', '털뭉', '솜솜'], pig: ['꿀꿀', '분홍', '토실토실', '코코'], pony: ['바람', '달리', '갈기', '방울말'] };
  D.add('items', [
    { id: 'egg', name: '달걀', cat: 'ranch', val: 120, stack: 10 },
    { id: 'gold_egg', name: '황금 달걀', cat: 'ranch', val: 1500, stack: 10 },
    { id: 'milk', name: '우유', cat: 'ranch', val: 220, stack: 10 },
    { id: 'wool', name: '양털', cat: 'ranch', val: 480, stack: 10 },
    { id: 'truffle', name: '송로버섯', cat: 'ranch', val: 900, stack: 10 },
    { id: 'dish:pancake', name: '팬케이크', cat: 'dish', val: 1600, stack: 10 },
    { id: 'dish:omelet', name: '시금치 오믈렛', cat: 'dish', val: 1100, stack: 10 },
    { id: 'dish:truffle_soup', name: '송로버섯 수프', cat: 'dish', val: 2400, stack: 10 },
  ]);
  G.TRENDS.push({ id: 'ranch', name: '목장 생산물', test: (it) => it.cat === 'ranch' });
  if (G.craft) G.craft.RECIPES.push(
    { id: 'cook_pancake', out: 'dish:pancake', need: [['egg', 1], ['milk', 1], ['crop:wheat', 1]], name: '팬케이크', cook: true },
    { id: 'cook_omelet', out: 'dish:omelet', need: [['egg', 2], ['crop:spinach', 1]], name: '시금치 오믈렛', cook: true },
    { id: 'cook_truffle_soup', out: 'dish:truffle_soup', need: [['truffle', 1], ['milk', 1]], name: '송로버섯 수프', cook: true },
  );

  // ---------- 상태 ----------
  // pen: {x,y,w,h} 타일 / animals: [{id, kind, name, x, y, born, love, pet, fed, ready, gold}]
  const st = { pen: null, animals: [], trough: -1, seq: 0, lastTick: -1, collected: 0, riding: null };
  const RC = G.ranch = { st, KINDS };
  const PEN_W = 6, PEN_H = 4;
  RC.capacity = () => 4 + (G.nest ? G.nest.st.stage : 0) * 2;
  RC.adult = (a) => G.time.day() - a.born >= 1;
  RC.TROUGH_MIN = 720;
  // 쓰다듬을 수 있나: 생산물을 기다리는 중이 아니고, 거둘 것도 없을 때
  RC.canPet = (a) => !a.ready && !(a.petAt > 0);
  RC.minsLeft = (a) => a.petAt > 0 ? Math.max(1, Math.ceil((a.petAt + KINDS[a.kind].hrs * 60 - G.time.gmin()) / G.time.SPEED)) : 0;
  RC.troughFull = () => (st.troughUntil || 0) > G.time.gmin();

  // 울타리 자리: 집 근처 6×4 풀밭(나무·텃밭·길 피함)
  RC.ensurePen = () => {
    if (st.pen || !G.world.map) return !!st.pen;
    const W = G.world, m = W.map, door = m.plots.tent.door;
    const farm = new Set((G.farm ? G.farm.st.plots : []).map((p) => p.tx + ',' + p.ty));
    // 안쪽 6×4는 풀·길이고 막는 물체(나무·바위·건물)가 없어야 한다. 꽃은 괜찮다. 바깥 1칸은 물·절벽만 아니면 된다
    const inner = (x, y) => { const t = W.tile(x, y), o = W.objAtTile(x, y); return (t === G.TERR.GRASS || t === G.TERR.PATH) && !(o && o.solid) && !farm.has(x + ',' + y); };
    const ok = (x0, y0) => {
      if (Math.abs(x0 + PEN_W / 2 - door.x) < 3 && Math.abs(y0 + PEN_H / 2 - door.y) < 3) return false; // 집 문 바로 앞은 피함
      for (let y = y0; y < y0 + PEN_H; y++) for (let x = x0; x < x0 + PEN_W; x++) if (!inner(x, y)) return false;
      for (let y = y0 - 1; y <= y0 + PEN_H; y++) for (const x of [x0 - 1, x0 + PEN_W]) if (!W.walkableTile(x, y) && W.tile(x, y) !== G.TERR.GRASS) return false;
      return true;
    };
    // 집에서 가까운 순서로 마을 전체를 훑는다
    let best = null, bd = 1e9;
    for (let y0 = W.HIGH_ROWS + 2; y0 < m.h - PEN_H - 2; y0++) for (let x0 = 2; x0 < m.w - PEN_W - 2; x0++) {
      const d = (x0 + PEN_W / 2 - door.x) ** 2 + (y0 + PEN_H / 2 - door.y) ** 2;
      if (d < bd && ok(x0, y0)) { bd = d; best = [x0, y0]; }
    }
    if (best) { st.pen = { x: best[0], y: best[1], w: PEN_W, h: PEN_H }; G.save.mark('pen'); return true; }
    return false;
  };
  RC.buy = (kind) => {
    const k = KINDS[kind];
    if (st.animals.length >= RC.capacity()) return { ok: false, why: `목장이 꽉 찼어요. (${RC.capacity()}마리, 집을 넓히면 늘어나요)` };
    if (!RC.ensurePen()) return { ok: false, why: '집 근처에 울타리를 세울 자리가 없어요.' };
    if (!G.wallet.spend(k.price, 'animal')) return { ok: false, why: '몽이 조금 모자라요.' };
    const first = !st.animals.length;
    const used = st.animals.map((a) => a.name), pool = NAMES[kind].filter((n) => !used.includes(n));
    const p = st.pen;
    st.animals.push({ id: ++st.seq, kind, name: pool[0] || NAMES[kind][0] + st.seq, x: (p.x + 1 + Math.random() * (p.w - 2)) * TILE, y: (p.y + 1 + Math.random() * (p.h - 2)) * TILE, born: G.time.day(), love: 0, pet: -1, petAt: 0, fed: -1, ready: false, gold: false, tx: 0, ty: 0, wait: 0 });
    G.save.mark('animal'); G.emit('ranch:buy', { kind });
    return { ok: true, first };
  };

  // 매 마을 분: 쓰다듬고 시간이 지난 동물은 생산물 준비 (아기·조랑말은 다시 쓰다듬을 수 있게만)
  RC.tick = () => {
    const now = G.time.gmin(); let changed = false;
    for (const a of st.animals) {
      if (!(a.petAt > 0) || a.ready) continue;
      const k = KINDS[a.kind];
      if (now < a.petAt + k.hrs * 60) continue;
      if (k.prod && RC.adult(a)) {
        a.ready = true; a.double = (st.troughUntil || 0) > a.petAt;
        a.gold = a.kind === 'chicken' && a.love >= 5 && u.hashf(G.rng.seed, now, a.id) < 0.06;
      }
      a.petAt = 0; changed = true;
    }
    if (changed) G.save.mark('ranch');
  };

  // ---------- 상호작용 ----------
  RC.near = (x, y, r) => { let best = null, bd = r; for (const a of st.animals) { if (a.id === st.riding) continue; const d = u.dist(a.x, a.y, x, y); if (d < bd) { bd = d; best = a; } } return best; };
  RC.troughPos = () => st.pen ? { x: (st.pen.x + st.pen.w - 0.5) * TILE, y: (st.pen.y + 0.6) * TILE } : null;
  RC.target = (fx, fy, px, py) => {
    if (!st.pen) return null;
    const tp = RC.troughPos();
    if (u.dist(tp.x, tp.y, fx, fy) < 26) return { kind: 'ranch', act: 'trough', icon: '🌾', label: '먹이 주기', name: '여물통' };
    const a = RC.near(fx, fy, 26) || RC.near(px, py, 22);
    if (!a) return null;
    const k = KINDS[a.kind], nm = `${a.name} (${RC.adult(a) ? k.name : k.baby})`;
    if (a.ready) return { kind: 'ranch', act: 'collect', ref: a, icon: '🧺', label: '거두기', name: nm };
    if (RC.canPet(a)) return { kind: 'ranch', act: 'pet', ref: a, icon: '🤲', label: '쓰다듬기', name: nm };
    if (a.kind === 'pony' && RC.adult(a)) return { kind: 'ranch', act: 'ride', ref: a, icon: '🐴', label: '타기', name: nm };
    return { kind: 'ranch', act: 'look', ref: a, icon: '💗', label: '보기', name: nm };
  };
  RC.act = async (tg) => {
    const a = tg.ref, pl = G.player;
    if (tg.act === 'trough') {
      const food = G.inv.slots.findIndex((s) => s.id.startsWith('crop:'));
      if (food < 0) { await G.ui.say([{ who: 'sys', text: '여물통이 비어 있어요. 텃밭 작물을 하나 넣으면 12분 동안 먹이가 돼요. (그동안 쓰다듬은 동물은 생산물이 2개!)' }]); return; }
      if (RC.troughFull()) { await G.ui.say([{ who: 'sys', text: `먹이가 아직 넉넉해요. (약 ${Math.ceil((st.troughUntil - G.time.gmin()) / G.time.SPEED)}분 남음)` }]); return; }
      const nm = G.items.name(G.inv.slots[food].id); G.inv.removeAt(food, 1);
      st.troughUntil = G.time.gmin() + RC.TROUGH_MIN;
      G.audio.sfx('drop'); G.ui.toast(`여물통에 ${nm}${G.josa(nm, '을/를').slice(-1)} 넣었어요. 동물들이 좋아해요!`, { icon: '🌾' });
      G.save.mark('ranch'); return;
    }
    if (tg.act === 'pet') {
      a.petAt = G.time.gmin(); a.love = Math.min(10, a.love + 1); a.hop = 0.35;
      pl.squash = 0.12; G.audio.sfx(a.kind === 'chicken' ? 'kongal' : 'pop');
      G.game.sparkle(a.x, a.y - 20, 6, '#ff9fbf');
      const say = { chicken: '꼬꼬댁!', cow: '음머~', sheep: '메에~', pig: '꿀꿀!', pony: '히힝!' }[a.kind];
      G.ui.toast(`${a.name}: ${say} (애정 ${'♥'.repeat(Math.ceil(a.love / 2))})`, { icon: '💗', ms: 1600 });
      G.emit('ranch:pet', { kind: a.kind });
      G.events.tip('pet', '쓰다듬으면 몇 분 뒤 머리 위에 생산물이 떠요. 거두고 또 쓰다듬어요! 여물통에 작물을 넣으면 2개씩.');
      G.save.mark('ranch'); return;
    }
    if (tg.act === 'collect') {
      const k = KINDS[a.kind], id = a.gold ? 'gold_egg' : k.prod, n = a.double ? 2 : 1;
      if (!G.inv.canFit(id)) { G.audio.sfx('error'); G.ui.toast('가방이 꽉 찼어요!', { icon: '🎒' }); return; }
      if (G.game.gain(id, n, null, { msg: `${a.name}에게서 ${G.items.get(id).name}${n > 1 ? ' 2개' : ''}${a.gold ? '?!' : '를 얻었다!'}`, src: 'ranch' })) {
        a.ready = false; a.gold = false; a.double = false; st.collected += n; G.emit('ranch:collect', { id, n }); G.save.mark('ranch');
      }
      return;
    }
    if (tg.act === 'ride') { RC.mount(a); return; }
    const k = KINDS[a.kind], wait = a.petAt > 0 ? (k.prod && RC.adult(a) ? ` 약 ${RC.minsLeft(a)}분 뒤면 ${G.items.get(k.prod).name}${G.josa(G.items.get(k.prod).name, '이/가').slice(-1)} 나와요.` : ` 약 ${RC.minsLeft(a)}분 뒤에 또 쓰다듬을 수 있어요.`) : '';
    await G.ui.say([{ who: 'sys', text: `${a.name}가 기분 좋아 보여요.${wait} (애정 ${'♥'.repeat(Math.ceil(a.love / 2)) || '–'})` }]);
  };
  // 조랑말 타기: 이동 1.6배. 행동 버튼(대상 없음)이나 집 안에 들어가면 내린다
  RC.mount = (a) => { st.riding = a.id; G.audio.sfx('chime'); G.ui.toast(`${a.name}에 탔어요! 빨라졌어요. 내릴 땐 빈 곳에서 행동 버튼.`, { icon: '🐴', ms: 2600 }); G.save.mark('ride'); };
  RC.dismount = () => { if (!st.riding) return false; const a = st.animals.find((x) => x.id === st.riding); st.riding = null; if (a) { a.x = G.player.x + 20; a.y = G.player.y; a.outside = true; } G.audio.sfx('pop'); G.save.mark('ride'); return true; };
  RC.speedMul = () => (st.riding ? 1.6 : 1);
  RC.ridingAnimal = () => st.riding && st.animals.find((x) => x.id === st.riding);

  // 배회 (울타리 안, 내린 조랑말은 천천히 집으로)
  RC.update = (dt, t) => {
    const p = st.pen; if (!p) return;
    for (const a of st.animals) {
      if (a.id === st.riding) { a.x = G.player.x; a.y = G.player.y; continue; }
      if (a.hop > 0) a.hop -= dt;
      if (a.wait > 0) { a.wait -= dt; a.moving = false; continue; }
      if (a.outside) { a.tx = (p.x + p.w / 2) * TILE; a.ty = (p.y + p.h / 2) * TILE; }
      else if (!a.tx || u.dist(a.x, a.y, a.tx, a.ty) < 4) { a.tx = (p.x + 0.6 + Math.random() * (p.w - 1.2)) * TILE; a.ty = (p.y + 0.8 + Math.random() * (p.h - 1.4)) * TILE; a.wait = 1 + Math.random() * 3; continue; }
      const dx = a.tx - a.x, dy = a.ty - a.y, len = Math.hypot(dx, dy) || 1, sp = (a.outside ? 50 : 22) * dt;
      a.x += dx / len * Math.min(sp, len); a.y += dy / len * Math.min(sp, len); a.face = dx < 0 ? -1 : 1; a.moving = true;
      if (a.outside && len < 20) a.outside = false;
    }
  };

  // ---------- 그리기 ----------
  RC.drawPen = (ctx, rect, t) => {
    const p = st.pen; if (!p) return;
    const x0 = p.x * TILE, y0 = p.y * TILE, w = p.w * TILE, h = p.h * TILE;
    if (x0 > rect.x + rect.w + 40 || x0 + w < rect.x - 40 || y0 > rect.y + rect.h + 40 || y0 + h < rect.y - 40) return;
    ctx.fillStyle = 'rgba(160,190,90,0.25)'; ctx.fillRect(x0 + 4, y0 + 4, w - 8, h - 8);
    // 나무 울타리 (아래쪽 가운데는 문)
    const P = G.art.paint, wood = '#c98e5a', L = '#5b4636';
    ctx.strokeStyle = wood; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const gate = x0 + w / 2;
    ctx.beginPath(); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x0 + w, y0 + 10); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x0, y0 + h); ctx.moveTo(x0 + w, y0 + 10); ctx.lineTo(x0 + w, y0 + h);
    ctx.moveTo(x0, y0 + h); ctx.lineTo(gate - 20, y0 + h); ctx.moveTo(gate + 20, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
    for (let x = x0; x <= x0 + w + 1; x += 32) for (const yy of [y0 + 10, y0 + h]) { if (yy === y0 + h && Math.abs(x - gate) < 20) continue; P.rrect(ctx, x - 3, yy - 12, 6, 14, 2, wood, L, 1); }
    for (let y = y0 + 42; y < y0 + h; y += 32) for (const xx of [x0, x0 + w]) P.rrect(ctx, xx - 3, y - 12, 6, 14, 2, wood, L, 1);
    // 여물통
    const tp = RC.troughPos();
    P.rrect(ctx, tp.x - 14, tp.y - 6, 28, 12, 4, '#a7724a', L, 1.3);
    if (RC.troughFull()) P.rrect(ctx, tp.x - 11, tp.y - 6, 22, 5, 2, '#e8c45a');
  };
  RC.collect = (R, rect, t) => {
    for (const a of st.animals) {
      if (a.id === st.riding) continue;
      if (a.x < rect.x - 40 || a.x > rect.x + rect.w + 40 || a.y < rect.y - 40 || a.y > rect.y + rect.h + 60) continue;
      R.push({ sy: a.y, draw: (ctx) => RC.drawAnimal(ctx, a, t) });
    }
  };
  RC.drawAnimal = (ctx, a, t, riding) => {
    const P = G.art.paint, L = '#5b4636', k = KINDS[a.kind], c = k.col, s = RC.adult(a) ? 1 : 0.65;
    const bob = a.moving ? Math.abs(Math.sin(t * 9 + a.id)) * -1.5 : Math.sin(t * 2 + a.id) * 0.5;
    const hop = a.hop > 0 ? Math.sin((1 - a.hop / 0.35) * Math.PI) * 5 : 0;
    ctx.save(); ctx.translate(a.x, a.y); P.shadow(ctx, 0, 0, 22 * s, 0.2); ctx.translate(0, bob - hop); ctx.scale((a.face || 1) * s, s);
    const blink = Math.sin(t * 0.7 + a.id * 3) > 0.97 ? 0.2 : 1;
    if (a.kind === 'chicken') {
      P.blob(ctx, 0, -9, 8, 7, c[0], L, 1.4); P.blob(ctx, 6, -16, 4.5, 4.5, c[0], L, 1.3); P.blob(ctx, 7, -21, 2.4, 2, c[1]); P.blob(ctx, 10.5, -15.5, 2, 1.2, '#ffb04a');
      P.blob(ctx, -7, -11, 3, 4, c[0], L, 1); P.blob(ctx, 7.5, -16.5, 0.9, 0.9 * blink, '#2d2430');
      ctx.strokeStyle = '#ffb04a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-2, 1); ctx.moveTo(2, -2); ctx.lineTo(2, 1); ctx.stroke();
    } else {
      // 네발 동물 공통: 몸통·다리·머리
      const big = a.kind === 'cow' || a.kind === 'pony';
      const bw = big ? 13 : 11, bh = big ? 8.5 : 8;
      for (const lx of [-bw + 4, -bw + 8, bw - 8, bw - 4]) P.rrect(ctx, lx - 1.6, -6, 3.2, 7, 1.5, a.kind === 'pig' ? c[1] : a.kind === 'pony' ? c[1] : '#5a4a4a');
      P.blob(ctx, 0, -11, bw, bh, a.kind === 'sheep' ? c[0] : c[0], L, 1.5);
      if (a.kind === 'sheep') for (let i = 0; i < 6; i++) P.blob(ctx, -9 + i * 3.6, -17 + Math.sin(i) * 1.5, 3.4, 3.4, c[0], L, 0.9);
      if (a.kind === 'cow') { P.blob(ctx, -4, -13, 4, 3, c[1]); P.blob(ctx, 5, -9, 3, 2.4, c[1]); }
      if (a.kind === 'pony') { ctx.strokeStyle = c[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-bw, -13); ctx.quadraticCurveTo(-bw - 5, -8, -bw - 3, -3); ctx.stroke(); }
      if (a.kind === 'pig') { ctx.strokeStyle = c[1]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-bw - 1, -12, 2, 0, 5); ctx.stroke(); }
      // 머리
      const hx = bw - 1, hy = big ? -19 : -16;
      if (a.kind === 'pony') { ctx.strokeStyle = c[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - 4, hy - 3); ctx.lineTo(hx - 6, hy + 6); ctx.stroke(); }
      P.blob(ctx, hx, hy, 7, 6.5, a.kind === 'sheep' ? '#f3e2d0' : c[0], L, 1.4);
      if (a.kind === 'sheep') P.blob(ctx, hx - 1, hy - 5, 5, 3, c[0], L, 0.9);
      // 귀
      for (const ex of [-4, 3]) P.blob(ctx, hx + ex, hy - 6, 2, 3, a.kind === 'pig' ? c[1] : a.kind === 'cow' ? c[1] : c[0], L, 1);
      if (a.kind === 'cow') { P.blob(ctx, hx - 4.5, hy - 8, 1.4, 2, '#f3e2b4', L, 0.8); P.blob(ctx, hx + 3.5, hy - 8, 1.4, 2, '#f3e2b4', L, 0.8); }
      // 코
      if (a.kind === 'pig' || a.kind === 'cow') { P.blob(ctx, hx + 4, hy + 2, 3.5, 2.6, a.kind === 'pig' ? c[1] : '#ffc2c8', L, 1); P.blob(ctx, hx + 3, hy + 2, 0.6, 0.8, L); P.blob(ctx, hx + 5, hy + 2, 0.6, 0.8, L); }
      P.blob(ctx, hx + 1, hy - 1, 1, 1.3 * blink, '#2d2430');
      ctx.globalAlpha = 0.5; P.blob(ctx, hx - 2, hy + 2, 1.6, 1, '#ff9fb4'); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 생산물 준비 표시
    if (a.ready && !riding) { const k2 = (t * 1.2 + a.id) % 1; ctx.save(); ctx.translate(a.x, a.y - 34 * s - Math.sin(t * 3) * 2); ctx.scale(0.5, 0.5); ctx.translate(-16, -16); G.art.drawIcon(ctx, a.gold ? 'gold_egg' : KINDS[a.kind].prod); ctx.restore(); ctx.strokeStyle = `rgba(255,240,150,${1 - k2})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(a.x, a.y - 34 * s, 8 + k2 * 6, 0, 6.3); ctx.stroke(); }
  };
  // 아이콘
  if (G.art) {
    const base = G.art.drawIcon;
    G.art.drawIcon = (g, id, t) => {
      const P = G.art.paint, L = '#5b4636';
      if (id.startsWith('animal:')) { const kind = id.slice(7); g.save(); g.translate(16, 27); g.scale(1.05, 1.05); RC.drawAnimal(g, { id: 1, kind, x: 0, y: 0, born: -99, face: 1 }, 0, true); g.restore(); return; }
      if (id === 'egg' || id === 'gold_egg') { P.blob(g, 16, 18, 8, 10, id === 'egg' ? '#fff8ec' : '#ffd24d', L, 1.4); P.blob(g, 13, 13, 2.5, 3.5, 'rgba(255,255,255,0.7)'); return; }
      if (id === 'milk') { P.rrect(g, 10, 8, 12, 20, 3, '#ffffff', L, 1.4); P.rrect(g, 10, 14, 12, 8, 1, '#8fd3ff'); P.rrect(g, 12, 4, 8, 5, 2, '#8fd3ff', L, 1); return; }
      if (id === 'wool') { for (const [x, y] of [[11, 18], [21, 18], [16, 12], [16, 22]]) P.blob(g, x, y, 7, 6, '#fbf8f2', L, 1.2); return; }
      if (id === 'truffle') { P.blob(g, 16, 19, 10, 8, '#6b4a3a', L, 1.4); for (const [x, y] of [[12, 17], [19, 20], [16, 15]]) P.blob(g, x, y, 1.4, 1, '#8a6a5a'); return; }
      if (id.startsWith('dish:pancake') || id.startsWith('dish:omelet') || id.startsWith('dish:truffle')) {
        P.blob(g, 16, 22, 13, 5, '#ffffff', L, 1.4);
        if (id.startsWith('dish:pancake')) { for (let k = 0; k < 3; k++) P.blob(g, 16, 19 - k * 3, 9, 3.5, '#e8b46a', L, 1); P.blob(g, 16, 11, 3, 1.6, '#ffe28a'); }
        else if (id.startsWith('dish:omelet')) { P.blob(g, 16, 18, 10, 5, '#ffd24d', L, 1.2); P.blob(g, 14, 17, 3, 1.4, '#5aa548'); }
        else { P.blob(g, 16, 18, 10, 6, '#c9a888', L, 1.2); P.blob(g, 13, 17, 2, 1.4, '#6b4a3a'); }
        return;
      }
      return base(g, id, t);
    };
  }

  G.on('time:minute', () => { if (G.game && G.game.started && !(G.net && G.net.guest)) RC.tick(); });
  // 자리 비운 동안: 쓰다듬어 둔 동물은 그만큼 시간이 지난 것으로
  RC.away = (mins) => {
    let n = 0;
    for (const a of st.animals) if (a.petAt > 0 && !a.ready) { a.petAt -= mins; n++; }
    if (st.troughUntil) st.troughUntil -= mins;
    RC.tick(); return n;
  };
  G.save.section('ranch', {
    v: 1, def: () => ({ pen: null, animals: [], trough: -1, troughUntil: 0, seq: 0, lastTick: -1, collected: 0, riding: null }),
    get: () => ({ pen: st.pen, animals: st.animals.map((a) => ({ id: a.id, kind: a.kind, name: a.name, x: Math.round(a.x), y: Math.round(a.y), born: a.born, love: a.love, pet: a.pet, petAt: a.petAt || 0, fed: a.fed, ready: a.ready, gold: a.gold, double: a.double })), trough: st.trough, troughUntil: st.troughUntil || 0, seq: st.seq, lastTick: st.lastTick, collected: st.collected, riding: st.riding }),
    set: (d) => { Object.assign(st, d); st.animals = (d.animals || []).map((a) => Object.assign({ tx: 0, ty: 0, wait: 0 }, a)); },
  });
  G.modules.add('ranch');
})(globalThis.G);
