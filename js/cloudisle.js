// 구름섬 나들이 (12차 요청 C: 하루 종일 할 거리) — 지도에서 구름배를 타고 매번 새로 생기는 작은 섬에 간다.
// 섬 종류: 꽃구름섬(곤충↑)·호수구름섬(물고기↑)·열매구름섬(과일·나무)·별가루구름섬(광석·별 조각). 희귀 생물이 마을보다 3배 잘 나온다.
// 섬에서만 나는 「구름 솜」. 첫 나들이는 공짜, 그다음은 구름배 표 1,500몽.
(function (G) {
  'use strict';
  const TILE = G.C.TILE, A = G.art;
  const CI = G.cloudIsle = { inside: false };
  const IW = 28, IH = 22, PRICE = 1500;
  const st = { trips: 0, best: 0 };
  G.data.add('items', [{ id: 'cloud_cotton', name: '구름 솜', cat: 'mat', val: 320, stack: 30 }]);
  const KINDS = {
    flower: { name: '꽃구름섬', icon: '🌸', bugs: 8, fish: 3, trees: 7, rocks: 2, flowers: 34, lake: 0.8, grass: ['#bfe39a', '#b4dc8d'] },
    lake: { name: '호수구름섬', icon: '💧', bugs: 4, fish: 7, trees: 7, rocks: 2, flowers: 12, lake: 1.5, grass: ['#b9e0a0', '#acd693'] },
    fruit: { name: '열매구름섬', icon: '🌰', bugs: 5, fish: 3, trees: 16, rocks: 2, flowers: 14, lake: 0.8, grass: ['#c6e29a', '#bad88c'] },
    star: { name: '별가루구름섬', icon: '✨', bugs: 5, fish: 3, trees: 6, rocks: 7, flowers: 10, lake: 0.8, grass: ['#c9dcb4', '#bdd2a6'] },
  };
  let I = null, saved = null, PXr = 2, camX = 0, camY = 0, F = null, got = 0;

  // ---------- 섬 만들기 ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function make(seed) {
    const R = rng(seed), kind = ['flower', 'lake', 'fruit', 'star'][Math.floor(R() * 4)], K = KINDS[kind];
    const land = [], cx = IW / 2, cy = IH / 2 - 0.5, ph = [R() * 6, R() * 6, R() * 6];
    for (let y = 0; y < IH; y++) { land.push([]); for (let x = 0; x < IW; x++) {
      const a = Math.atan2(y - cy, x - cx), wob = 1 + 0.1 * Math.sin(a * 3 + ph[0]) + 0.07 * Math.sin(a * 5 + ph[1]) + 0.05 * Math.sin(a * 7 + ph[2]);
      land[y].push(((x + 0.5 - cx) / (IW / 2 - 1.6)) ** 2 + ((y + 0.5 - cy) / (IH / 2 - 1.6)) ** 2 < wob * wob ? 1 : 0);
    } }
    // 연못 (가운데에서 조금 비켜)
    const px = cx + (R() - 0.5) * 7, py = cy - 2 + (R() - 0.5) * 4, prx = 2.6 * K.lake, pry = 1.8 * K.lake;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (land[y][x] && ((x + 0.5 - px) / prx) ** 2 + ((y + 0.5 - py) / pry) ** 2 < 1) land[y][x] = 2;
    // 선착장: 아래쪽 가운데 땅
    let dock = null; for (let y = IH - 1; y > 0 && !dock; y--) if (land[y][Math.floor(cx)] === 1) dock = { tx: Math.floor(cx), ty: y };
    const isle = { seed, kind, K, land, dock, objs: [], bugs: [], fish: [], pick: [], pond: { x: px * TILE, y: py * TILE, rx: prx * TILE, ry: pry * TILE } };
    const free = (x, y, pad = 1) => { for (let yy = y - pad; yy <= y + pad; yy++) for (let xx = x - pad; xx <= x + pad; xx++) if (!land[yy] || land[yy][xx] !== 1) return false; if (Math.abs(x - dock.tx) < 3 && y > dock.ty - 4) return false; return !isle.objs.some((o) => Math.abs(o.tx - x) < 2 && Math.abs(o.ty - y) < 2); };
    const spot = (pad) => { for (let k = 0; k < 200; k++) { const x = 1 + Math.floor(R() * (IW - 2)), y = 1 + Math.floor(R() * (IH - 2)); if (free(x, y, pad)) return { x, y }; } return null; };
    for (let i = 0; i < K.trees; i++) { const p = spot(1); if (p) isle.objs.push({ k: kind === 'fruit' || R() < 0.35 ? 'fruit' : R() < 0.3 ? 'pine' : 'tree', tx: p.x, ty: p.y, shook: false, chop: 0, shakeT: 0 }); }
    for (let i = 0; i < K.rocks; i++) { const p = spot(1); if (p) isle.objs.push({ k: 'rock', tx: p.x, ty: p.y, hits: 0, shakeT: 0 }); }
    for (let i = 0; i < K.flowers; i++) { const p = spot(0); if (p) isle.objs.push({ k: 'flower', tx: p.x, ty: p.y, v: Math.floor(R() * 6) }); }
    // 가장자리 줍기: 조개·구름 솜·(별섬) 별 조각
    const shells = G.data.all('shells');
    for (let k = 0, n = 0; k < 400 && n < 6; k++) {
      const x = Math.floor(R() * IW), y = Math.floor(R() * IH); if (land[y][x] !== 1) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !land[y + dy] || !land[y + dy][x + dx]);
      if (!edge || !free(x, y, 0)) continue;
      const r = R(), id = r < 0.38 ? 'cloud_cotton' : kind === 'star' && r < 0.6 ? 'star_fragment' : 'shell:' + u_pickW(shells, R).id;
      isle.pick.push({ id, x: x * TILE + 16, y: y * TILE + 18 }); n++;
    }
    return isle;
  }
  function u_pickW(list, R) { const tot = list.reduce((a, s) => a + (s.w || 1), 0); let r = R() * tot; for (const s of list) { r -= s.w || 1; if (r <= 0) return s; } return list[0]; }
  const tileAt = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return I && I.land[ty] ? I.land[ty][tx] || 0 : 0; };

  // ---------- 생물 ----------
  const TIER_W = [0, 10, 5, 2, 0.7, 0.25];
  function pickSp(list, kind) {
    const w = list.map((s) => TIER_W[s.tier] * (s.rare || 1) * (s.tier >= 3 ? 3 : 1) * (G.skills ? G.skills.rareMul(kind, s.tier) : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[0];
  }
  function spawnBug() {
    const m = G.time.month(), list = G.data.all('bugs').filter((s) => s.months.includes(m) && !s.high && s.loc !== 'water' && s.beh !== 'G');
    if (!list.length) return;
    const fl = I.objs.filter((o) => o.k === 'flower' || o.k === 'tree' || o.k === 'fruit');
    const o = fl[Math.floor(Math.random() * fl.length)] || I.dock;
    const x = o.tx * TILE + 16 + (Math.random() - 0.5) * 30, y = o.ty * TILE + 16 + (Math.random() - 0.5) * 20;
    const sp = pickSp(list, 'bug'), sz = sp.size || [3, 5];
    I.bugs.push({ sp, x, y, hx: x, hy: y, seed: Math.random() * 10, alt: 6, baseAlt: 6, face: 1, t: 0, fade: 0, state: 'idle', v: 0, size: Math.round((sz[0] + Math.random() * (sz[1] - sz[0])) * 10) / 10 });
  }
  function spawnFish() {
    const m = G.time.month(), list = G.data.all('fish').filter((s) => s.months.includes(m) && s.loc !== 'sea');
    if (!list.length) return;
    const sp = pickSp(list, 'fish'), a = Math.random() * 6.28, r = Math.random() * 0.6, sz = sp.size || [10, 20];
    I.fish.push({ sp, shadow: sp.shadow || 2, x: I.pond.x + Math.cos(a) * I.pond.rx * r, y: I.pond.y + Math.sin(a) * I.pond.ry * r, ang: Math.random() * 6.28, seed: Math.random() * 10, fade: 0, size: Math.round(sz[0] + Math.random() * (sz[1] - sz[0])) });
  }

  // ---------- 들어가기·나가기 ----------
  CI.offer = async () => {
    if (CI.inside) return;
    if ((G.house && G.house.inside) || (G.museumHall && G.museumHall.inside) || (G.villaHome && G.villaHome.inside)) { G.ui.toast('구름배는 밖에서 탈 수 있어요.', { icon: '☁️' }); return; }
    if (G.net && G.net.guest) { G.ui.toast('친구 마을에서는 구름배를 탈 수 없어요.', { icon: '☁️' }); return; }
    const free = st.trips === 0;
    const r = await G.ui.choose({ who: 'sys', text: free ? '구름배가 기다리고 있어요! 첫 나들이는 공짜래요. 하늘 위 작은 섬에 가 볼까요? 섬마다 희귀한 곤충·물고기가 마을보다 잘 나온대요.' : `구름배 표는 ${G.fmt.money(PRICE)}이에요. 매번 다른 섬에 내려 줘요. 갈까요?` }, [free ? '☁️ 가자!' : `☁️ 표 사기 (${G.fmt.money(PRICE)})`, '다음에']);
    if (r !== 0) return;
    if (!free && !G.wallet.spend(PRICE, 'cloudisle')) { G.audio.sfx('error'); G.ui.toast(`몽이 ${G.fmt.money(PRICE - G.wallet.get())} 모자라요.`, { icon: '💧' }); return; }
    CI.enter(Date.now() ^ (G.rng.seed || 7));
  };
  CI.enter = (seed) => {
    I = make(seed >>> 0); st.trips++; G.save.mark('cloudisle'); got = 0; F = null;
    const pl = G.player; saved = { x: pl.x, y: pl.y }; if (G.ranch) G.ranch.dismount(); G.fishing.cancel(true);
    CI.inside = true;
    for (let i = 0; i < I.K.bugs; i++) spawnBug();
    for (let i = 0; i < I.K.fish; i++) spawnFish();
    pl.x = I.dock.tx * TILE + 16; pl.y = (I.dock.ty - 1) * TILE + 16; pl.dir = 2;
    G.game.mover = move; G.scene.push('cloudisle'); G.audio.sfx('chime');
    setTimeout(() => G.ui.toast(`${I.K.icon} ${I.K.name}에 도착! 다 놀았으면 아래 구름배로 돌아가요.`, { icon: '☁️', ms: 3200 }), 400);
    G.emit('cloudisle:enter', { kind: I.kind });
  };
  CI.exit = () => {
    const pl = G.player; CI.inside = false; G.game.mover = null; F = null;
    if (saved) { pl.x = saved.x; pl.y = saved.y; } pl.dir = 0;
    G.scene.pop(); if (G.game.unstick) G.game.unstick(); G.audio.sfx('close');
    G.ui.toast(got ? `구름섬에서 ${got}가지를 얻어 왔어요! 또 놀러 가요.` : '구름섬 나들이 끝! 또 놀러 가요.', { icon: '☁️' });
    I = null;
  };
  // 섬에 있는 동안 저장되면 마을 자리로 (섬 좌표가 마을에 남지 않게)
  const psec = G.save.sections && G.save.sections.get && G.save.sections.get('player');
  if (psec) { const og = psec.get; psec.get = () => { const d = og(); if (CI.inside && saved) { d.x = Math.round(saved.x); d.y = Math.round(saved.y); } return d; }; }

  // ---------- 움직임 ----------
  function solidAt(x, y) {
    if (tileAt(x, y) !== 1) return true;
    if (((x - I.pond.x) / (I.pond.rx + 4)) ** 2 + ((y - I.pond.y) / (I.pond.ry + 4)) ** 2 < 1) return true;
    for (const o of I.objs) if (o.k !== 'flower' && Math.abs(x - (o.tx * TILE + 16)) < 13 && y > o.ty * TILE + 14 && y < o.ty * TILE + 34) return true;
    return false;
  }
  function move(e, dx, dy) {
    if (!solidAt(e.x + dx, e.y)) e.x += dx;
    if (!solidAt(e.x, e.y + dy)) e.y += dy;
  }

  // ---------- 행동 ----------
  const D4 = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  function front(d = 26) { const pl = G.player, [dx, dy] = D4[pl.dir]; return { x: pl.x + dx * d, y: pl.y + dy * d - 4 }; }
  function target() {
    const pl = G.player, f = front(), tool = pl.tool;
    if (I.dock && Math.hypot(pl.x - (I.dock.tx * TILE + 16), pl.y - (I.dock.ty * TILE + 20)) < 30) return { kind: 'dock' };
    for (const p of I.pick) if (Math.hypot(f.x - p.x, f.y - p.y) < 24 || Math.hypot(pl.x - p.x, pl.y - p.y) < 20) return { kind: 'pick', p };
    if (tool === 'net') { const b = I.bugs.find((b) => b.state === 'idle' && Math.hypot(f.x - b.x, f.y - b.y) < 40); return { kind: 'net', b }; }
    if (tool === 'rod') { for (const d of [40, 56, 72]) { const q = front(d); if (tileAt(q.x, q.y) === 2) return { kind: 'cast', q }; } }
    const o = I.objs.find((o) => o.k !== 'flower' && Math.hypot(f.x - (o.tx * TILE + 16), f.y - (o.ty * TILE + 22)) < 26);
    if (o && o.k === 'rock') return { kind: 'rock', o };
    if (o) return { kind: tool === 'axe' ? 'chop' : 'shake', o };
    return null;
  }
  const gain = (id, n, x, msg, src) => G.game.gain(id, n, x, { msg, src, keepTool: true }) && (got++, true);
  async function act() {
    const pl = G.player;
    if (F) return fishAct();
    if (pl.busy > 0) return;
    const tg = target();
    if (!tg) { pl.squash = 0.12; G.audio.sfx('bump'); return; }
    switch (tg.kind) {
      case 'dock': { const r = await G.ui.choose({ who: 'sys', text: '구름배를 타고 마을로 돌아갈까요?' }, ['⛵ 돌아가기', '조금 더 놀래']); if (r === 0) CI.exit(); return; }
      case 'pick': {
        const p = tg.p; if (gain(p.id, 1, null, `${G.josa(G.items.name(p.id), '을/를')} 주웠다!`, p.id.startsWith('shell:') ? 'beach' : 'drop')) I.pick.splice(I.pick.indexOf(p), 1);
        return;
      }
      case 'net': {
        pl.swing = 0.001; pl.busy = 0.38; G.audio.sfx('swing');
        setTimeout(() => {
          const b = tg.b && I && I.bugs.includes(tg.b) && tg.b.state === 'idle' ? tg.b : I && I.bugs.find((b) => b.state === 'idle' && Math.hypot(front().x - b.x, front().y - b.y) < 36);
          if (!b) { G.audio.sfx('whiff'); return; }
          I.bugs.splice(I.bugs.indexOf(b), 1); setTimeout(() => I && spawnBug(), 12000);
          const r = G.collect.record('bug', b.sp.ix, 0, b.size); G.emit('eco:caught', { kind: 'bug', ix: b.sp.ix, v: 0, size: b.size });
          gain('bug:' + b.sp.id, 1, { size: b.size, v: 0, newSp: r.newSp }, `${G.josa(G.items.name('bug:' + b.sp.id), '을/를')} 잡았다!${b.sp.tier >= 3 ? ' 구름섬 희귀종!' : ''}`);
          if (G.game.celebrate && (r.newSp || b.sp.tier >= 3)) G.game.celebrate(b.x, b.y - 20, b.sp.tier >= 4);
        }, 160);
        return;
      }
      case 'cast': {
        pl.busy = 0.3; G.audio.sfx('cast'); setTimeout(() => G.audio.sfx('plop'), 250);
        F = { x: tg.q.x, y: tg.q.y, t: 0, bite: 1.6 + Math.random() * 2.6, state: 'wait' };
        return;
      }
      case 'shake': {
        const o = tg.o; o.shakeT = 0.6; pl.busy = 0.4; G.audio.sfx('shake');
        if (o.shook) return; o.shook = true;
        const r = Math.random(), fruit = o.k === 'fruit';
        setTimeout(() => {
          if (fruit && r < 0.75) { G.audio.sfx('drop'); gain('fruit_acorn', 1 + (r < 0.3 ? 1 : 0), null, '도토리가 떨어졌다!', 'drop'); }
          else if (r < 0.45) { G.audio.sfx('drop'); gain('cloud_cotton', 1, null, '나뭇가지에 걸린 구름 솜을 얻었다!', 'drop'); }
          else if (r < 0.75) { G.audio.sfx('drop'); gain('branch', 1, null, '나뭇가지를 주웠다!', 'drop'); }
          else if (r > 0.93) { G.wallet.add(300, 'tree'); G.audio.sfx('coin'); G.ui.toast('구름 몽 주머니가 떨어졌다! +300몽', { icon: '💧' }); }
        }, 300);
        return;
      }
      case 'chop': {
        const o = tg.o; pl.busy = 0.45; pl.swing = 0.001;
        setTimeout(() => { o.shakeT = 0.4; G.audio.sfx('shake'); if (o.chop >= 3) { G.audio.sfx('bump'); G.ui.toast('이 나무는 더 내줄 게 없대요.', { icon: '🌳' }); return; } o.chop++; G.audio.sfx('drop'); gain('wood', 1, null, '목재를 얻었다!', 'drop'); }, 180);
        return;
      }
      case 'rock': {
        const o = tg.o;
        if (pl.tool !== 'shovel' && pl.tool !== 'axe') { G.ui.toast('삽이나 도끼로 두드리면 뭔가 나올 것 같아요.', { icon: '🪨' }); return; }
        pl.busy = 0.45; pl.swing = 0.001;
        setTimeout(() => {
          o.shakeT = 0.4; G.audio.sfx('dig'); if (o.hits >= 4) { G.audio.sfx('bump'); G.ui.toast('이 바위는 다 캤어요.', { icon: '🪨' }); return; }
          o.hits++; const r = Math.random(), star = I.kind === 'star';
          const id = r < (star ? 0.28 : 0.06) ? 'star_fragment' : r < 0.3 ? 'iron' : r < 0.5 ? 'clay' : 'stone';
          G.audio.sfx('drop'); gain(id, 1, null, `${G.josa(G.items.name(id), '을/를')} 캤다!`, 'drop');
        }, 220);
        return;
      }
    }
  }
  function fishAct() {
    const f = F;
    if (f.state === 'wait') { F = null; G.audio.sfx('miss'); G.ui.toast('너무 일찍 당겼어요. 찌가 쏙 들어갈 때 당겨요!', { icon: '🎣' }); return; }
    if (f.state === 'bite') {
      F = null;
      let fi = I.fish.reduce((best, x) => (!best || Math.hypot(x.x - f.x, x.y - f.y) < Math.hypot(best.x - f.x, best.y - f.y) ? x : best), null);
      if (!fi) { spawnFish(); fi = I.fish[I.fish.length - 1]; } if (!fi) return;
      I.fish.splice(I.fish.indexOf(fi), 1); setTimeout(() => I && spawnFish(), 15000);
      const r = G.collect.record('fish', fi.sp.ix, 0, fi.size); G.emit('eco:caught', { kind: 'fish', ix: fi.sp.ix, v: 0, size: fi.size });
      G.audio.sfx('catch');
      gain('fish:' + fi.sp.id, 1, { size: fi.size, v: 0, newSp: r.newSp }, `${G.josa(G.items.name('fish:' + fi.sp.id), '을/를')} 낚았다!${fi.sp.tier >= 3 ? ' 구름섬 희귀종!' : ''}`);
      if (G.game.celebrate && (r.newSp || fi.sp.tier >= 3)) G.game.celebrate(G.player.x, G.player.y - 40, fi.sp.tier >= 4);
    }
  }

  // ---------- 장면 ----------
  function layout() {
    const cv = G.game.canvas(); PXr = G.cam.PX;
    const vw = cv.width / PXr, vh = cv.height / PXr, pl = G.player;
    const clamp = (v, a, b) => (a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)));
    camX = clamp(pl.x - vw / 2, -60, IW * TILE + 60 - vw); camY = clamp(pl.y - vh / 2, -80, IH * TILE + 120 - vh);
  }
  G.scene.define('cloudisle', {
    world: false, opaque: true,
    enter() { layout(); G.ui.refreshHud(); },
    resume() { layout(); },
    update(dt) {
      if (!I) return;
      const t = G.game.t, pl = G.player;
      G.game.updatePlayer(dt); G.game.updateKongal(dt, t); G.game.updateFx(dt);
      G.ui.updateDialog(dt); G.ui.drawStick(G.input.stick);
      if (G.audio.music) G.audio.music.update();
      layout();
      for (const o of I.objs) if (o.shakeT > 0) o.shakeT -= dt;
      // 곤충: 집 주변 8자 배회, 뛰어오면 도망
      for (const b of I.bugs.slice()) {
        b.t += dt; b.fade = Math.min(1, b.fade + dt);
        if (b.state === 'flee') { b.x += b.vx * dt; b.y += b.vy * dt; b.alt += 50 * dt; if (b.t > 2) { I.bugs.splice(I.bugs.indexOf(b), 1); setTimeout(() => I && spawnBug(), 9000); } continue; }
        const k = b.t * (b.sp.spd || 1) * 0.5 + b.seed, nx = b.hx + Math.sin(k) * 26 + Math.sin(k * 0.37) * 14, ny = b.hy + Math.sin(k * 2) * 10;
        b.face = nx < b.x ? -1 : 1; b.x += (nx - b.x) * Math.min(1, dt * 2); b.y += (ny - b.y) * Math.min(1, dt * 2); b.alt = 6 + Math.sin(b.t * 3 + b.seed) * 4;
        const d = Math.hypot(pl.x - b.x, pl.y - b.y);
        if (d < 70 && G.input.mode === 'run' && G.input.move.mag > 0) { b.state = 'flee'; b.t = 0; const a = Math.atan2(b.y - pl.y, b.x - pl.x); b.vx = Math.cos(a) * 120; b.vy = Math.sin(a) * 120 - 40; }
      }
      // 물고기 그림자: 연못 안에서 천천히
      for (const f of I.fish) {
        f.fade = Math.min(1, f.fade + dt); f.ang += Math.sin(t * 0.7 + f.seed) * dt * 0.8;
        const nx = f.x + Math.cos(f.ang) * 10 * dt, ny = f.y + Math.sin(f.ang) * 10 * dt;
        if (((nx - I.pond.x) / (I.pond.rx * 0.8)) ** 2 + ((ny - I.pond.y) / (I.pond.ry * 0.8)) ** 2 < 1) { f.x = nx; f.y = ny; } else f.ang += Math.PI * 0.6;
      }
      // 낚시 찌
      if (F) {
        F.t += dt;
        if (F.state === 'wait' && F.t > F.bite) { F.state = 'bite'; F.t = 0; G.audio.sfx('bite'); }
        else if (F.state === 'bite' && F.t > 0.9) { F = null; G.audio.sfx('miss'); G.ui.toast('앗, 놓쳤다! 찌가 들어가면 바로 당겨요.', { icon: '🎣' }); }
        if (G.input.move.mag > 0 && F && F.state === 'wait') F = null;
      }
      // 섬 아래로 걸어 나가면(선착장) 돌아가기 물어보기는 행동 버튼으로
      const tg = (G.ui.dialogOpen() || G.ui.open) ? null : target();
      if (G.ui.dialogOpen() || G.ui.open) G.ui.setAction('✋', '', '');
      else if (F) G.ui.setAction('🎣', F.state === 'bite' ? '당기기!' : '기다려요', '');
      else if (!tg) G.ui.setAction(pl.tool === 'hand' ? '✋' : 'tool:' + pl.tool, '', '');
      else G.ui.setAction(...({
        dock: ['⛵', '돌아가기', '구름배'], pick: ['🤲', '줍기', tg.p && G.items.name(tg.p.id)], net: ['tool:net', '휘두르기', tg.b ? '곤충' : ''],
        cast: ['tool:rod', '던지기', '구름 연못'], shake: ['🌳', '흔들기', '나무'], chop: ['tool:axe', '찍기', '나무'], rock: ['🪨', '두드리기', '바위'],
      })[tg.kind]);
    },
    draw(ctx) { if (I) draw(ctx, G.game.t); },
    input(ev) {
      if (G.ui.modalInput(ev)) return true;
      if (G.ui.dialogInput(ev)) return true;
      if (ev.type === 'menu') { G.ui.notebook(); return true; }
      if (ev.type === 'tool') { if (!F) G.player.nextTool(); return true; }
      if (ev.type === 'act') { act(); return true; }
      if (ev.type === 'map') { G.ui.toast('구름섬에는 지도가 없어요. 아래 구름배로 돌아가요.', { icon: '☁️' }); return true; }
      if (ev.type === 'back') { act(); return true; }
      return false;
    },
  });

  function paintIsle() {
    const L = I.land, PAD = 64, c = document.createElement('canvas'); c.width = IW * TILE + PAD * 2; c.height = IH * TILE + PAD * 2 + 40;
    const g = c.getContext('2d'); g.translate(PAD, PAD);
    const land = (x, y) => L[y] && L[y][x];
    const hash = (x, y, k) => (((x * 374761393 + y * 668265263 + k * 2246822519) ^ (I.seed >>> 0)) >>> 0) % 1000 / 1000;
    // 구름 받침: 그림자 → 흰 뭉게구름
    g.fillStyle = 'rgba(140,175,210,0.35)';
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (land(x, y) && !land(x, y + 1)) { g.beginPath(); g.arc(x * TILE + 16, y * TILE + 50, 22, 0, 6.3); g.fill(); }
    g.fillStyle = '#ffffff';
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (land(x, y)) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!land(x + dx, y + dy)) { g.beginPath(); g.arc(x * TILE + 16 + dx * 14, y * TILE + 16 + dy * 14 + (dy >= 0 ? 10 : 2), 17 + hash(x, y, dx + 2) * 7, 0, 6.3); g.fill(); }
    }
    // 둥근 땅 (타일마다 원을 겹쳐 모서리가 둥글게)
    g.fillStyle = '#a98a5f';
    g.beginPath(); for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (land(x, y) && !land(x, y + 1)) { g.moveTo(x * TILE + 36, y * TILE + 24); g.arc(x * TILE + 16, y * TILE + 24, 20, 0, 6.3); } g.fill();
    g.fillStyle = I.K.grass[0];
    g.beginPath(); for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (land(x, y)) { g.moveTo(x * TILE + 40, y * TILE + 16); g.arc(x * TILE + 16, y * TILE + 16, 24, 0, 6.3); } g.fill();
    // 풀 질감: 얼룩·풀잎·작은 꽃점
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (land(x, y) === 1) {
      const h = hash(x, y, 1);
      if (h < 0.45) { g.fillStyle = I.K.grass[1]; g.beginPath(); g.ellipse(x * TILE + 8 + h * 30, y * TILE + 10 + hash(x, y, 2) * 14, 9 + h * 8, 5 + h * 4, 0, 0, 6.3); g.fill(); }
      if (h > 0.55) { g.strokeStyle = 'rgba(90,130,70,0.45)'; g.lineWidth = 1.4; const bx = x * TILE + hash(x, y, 3) * 26 + 3, by = y * TILE + hash(x, y, 4) * 24 + 8; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 2, by - 5); g.moveTo(bx + 3, by); g.lineTo(bx + 4, by - 6); g.moveTo(bx + 6, by); g.lineTo(bx + 8, by - 4); g.stroke(); }
      if (h > 0.9) { g.fillStyle = ['#fff7c2', '#ffd6e2', '#ffffff'][Math.floor(hash(x, y, 5) * 3)]; g.beginPath(); g.arc(x * TILE + hash(x, y, 6) * 28 + 2, y * TILE + hash(x, y, 7) * 28 + 2, 1.8, 0, 6.3); g.fill(); }
    }
    // 연못
    const pd = I.pond, grd = g.createRadialGradient(pd.x, pd.y, 4, pd.x, pd.y, Math.max(pd.rx, pd.ry));
    grd.addColorStop(0, '#6fb6dc'); grd.addColorStop(1, '#9ad3ee');
    g.fillStyle = '#d9c9a0'; g.beginPath(); g.ellipse(pd.x, pd.y, pd.rx + 3, pd.ry + 3, 0, 0, 6.3); g.fill();
    g.fillStyle = grd; g.beginPath(); g.ellipse(pd.x, pd.y, pd.rx - 2, pd.ry - 2, 0, 0, 6.3); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(pd.x - pd.rx * 0.2, pd.y - pd.ry * 0.3, pd.rx * 0.35, pd.ry * 0.18, 0, 3.4, 5.6); g.stroke();
    if (G.scenery && G.scenery.material) G.scenery.material(g, 'paper', [-PAD, -PAD, c.width, c.height], 0.22, 'multiply');
    return c;
  }
  // 구름 솜 아이콘
  const baseIcon = A.drawIcon;
  A.drawIcon = (g, id, t) => {
    if (id !== 'cloud_cotton') return baseIcon(g, id, t);
    g.save(); g.fillStyle = '#ffffff'; g.strokeStyle = '#9fb7cc'; g.lineWidth = 1.6;
    g.beginPath(); for (const [x, y, r] of [[10, 19, 6.5], [16, 14, 8], [23, 18, 6.5], [16, 21, 7]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.3); } g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; for (const [x, y, r] of [[10, 19, 5.5], [16, 14, 7], [23, 18, 5.5], [16, 21, 6]]) { g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); }
    g.fillStyle = 'rgba(255,190,210,0.7)'; g.beginPath(); g.arc(12, 20, 1.6, 0, 6.3); g.arc(20, 20, 1.6, 0, 6.3); g.fill();
    g.restore();
  };
  function draw(ctx, t) {
    const cv = G.game.canvas(), P = A.paint, season = A.season;
    // 하늘
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, '#9fd6f5'); sky.addColorStop(1, '#e9f6ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 9; i++) { const x = ((i * 397 + t * (8 + i % 3 * 4)) % (cv.width + 300)) - 150, y = (i * 173) % cv.height; for (const [ox, oy, r] of [[0, 0, 34], [30, 6, 26], [-28, 8, 22], [10, -14, 24]]) { ctx.beginPath(); ctx.arc(x + ox * PXr * 0.6, y + oy * PXr * 0.6, r * PXr * 0.6, 0, 6.3); ctx.fill(); } }
    ctx.setTransform(PXr, 0, 0, PXr, -camX * PXr, -camY * PXr);
    // 섬 바탕(구름 받침·둥근 땅·풀 질감·연못)은 한 번 그려 두고 재사용
    if (!I.bg) I.bg = paintIsle();
    ctx.drawImage(I.bg, -64, -64);
    // 물고기 그림자
    for (const f of I.fish) { ctx.globalAlpha = f.fade; A.fishShadow(ctx, f, t); } ctx.globalAlpha = 1;
    // 선착장 + 구름배
    const dx = I.dock.tx * TILE, dy = I.dock.ty * TILE;
    P.rrect(ctx, dx - 6, dy + 8, 44, 22, 4, '#c79a6a', '#5b4636', 1.5);
    ctx.save(); ctx.translate(dx + 16, dy + 52 + Math.sin(t * 1.2) * 2);
    ctx.fillStyle = '#fff'; for (const [ox, r] of [[-22, 12], [-8, 15], [8, 15], [22, 12]]) { ctx.beginPath(); ctx.arc(ox, 0, r, 0, 6.3); ctx.fill(); }
    P.rrect(ctx, -24, -14, 48, 12, 6, '#f4d7a1', '#5b4636', 1.5); ctx.fillStyle = '#5b4636'; ctx.fillRect(-1, -40, 2, 26);
    ctx.fillStyle = '#ffeef3'; ctx.beginPath(); ctx.moveTo(1, -40); ctx.lineTo(18, -22); ctx.lineTo(1, -18); ctx.fill(); ctx.restore();
    // 꽃 (바닥)
    for (const o of I.objs) if (o.k === 'flower') ctx.drawImage(A.flower(o.v, season), o.tx * TILE, o.ty * TILE, 32, 32);
    // y정렬: 나무·바위·줍기·곤충·나·찌
    const R = [];
    for (const o of I.objs) {
      if (o.k === 'flower') continue;
      const bx = o.tx * TILE, foot = (o.ty + 1) * TILE, sh = o.shakeT > 0 ? Math.sin(o.shakeT * 40) * 2 : 0;
      if (o.k === 'rock') R.push({ sy: foot - 6, d: () => ctx.drawImage(A.rock(), bx + sh, o.ty * TILE, 32, 32) });
      else { const sp = A.tree(o.k, season); R.push({ sy: foot - 6, d: () => { P.shadow(ctx, bx + 16, foot - 6, 26, 0.22); ctx.drawImage(sp, bx + 16 - 32 + sh, foot - 6 - 74, sp.uw || 64, sp.uh || 80); } }); }
    }
    for (const p of I.pick) R.push({ sy: p.y, d: () => { P.shadow(ctx, p.x, p.y + 6, 10, 0.18); ctx.save(); ctx.translate(p.x - 11, p.y - 16 + Math.sin(t * 2 + p.x) * 1.5); ctx.scale(0.7, 0.7); A.drawIcon(ctx, p.id, t); ctx.restore(); } });
    for (const b of I.bugs) R.push({ sy: b.y, d: () => { ctx.globalAlpha = b.fade * (b.state === 'flee' ? Math.max(0, 1 - b.t / 2) : 1); A.bug(ctx, b, t); ctx.globalAlpha = 1; } });
    R.push({ sy: G.player.y, d: () => G.game.drawPlayer(ctx, t) });
    R.sort((a, b) => a.sy - b.sy); for (const r of R) r.d();
    if (F) {
      const bob = F.state === 'bite' ? 4 + Math.sin(t * 30) * 2 : Math.sin(t * 3) * 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(F.x, F.y + 3, 8 + (t * 6 % 6), 3, 0, 0, 6.3); ctx.stroke();
      ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(F.x, F.y + bob, 4, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(F.x, F.y + bob, 4, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,50,0.5)'; ctx.beginPath(); ctx.moveTo(G.player.x, G.player.y - 30); ctx.quadraticCurveTo((G.player.x + F.x) / 2, Math.min(G.player.y, F.y) - 30, F.x, F.y + bob - 3); ctx.stroke();
      if (F.state === 'bite') { ctx.font = G.fontPx(18); ctx.textAlign = 'center'; ctx.fillStyle = '#ff5a5a'; ctx.fillText('!', G.player.x, G.player.y - 58); ctx.textAlign = 'left'; }
    }
    // 이름표
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const label = `${I.K.icon} ${I.K.name}`, s = Math.min(2, G.cam.PX);
    const age = G.game.t - (I.t0 ?? (I.t0 = G.game.t)); if (age > 6) return; ctx.globalAlpha = Math.min(1, 6 - age);
    ctx.font = G.fontPx(14 * s); const tw = ctx.measureText(label).width + 26 * s, by = cv.height * 0.26;
    ctx.fillStyle = 'rgba(255,250,241,0.94)'; ctx.beginPath(); ctx.roundRect(cv.width / 2 - tw / 2, by, tw, 26 * s, 12); ctx.fill();
    ctx.fillStyle = '#5b4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cv.width / 2, by + 13 * s); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  }

  CI._isle = () => I; CI._F = () => F; // 시험용
  G.save.section('cloudisle', { v: 1, def: () => ({ trips: 0 }), get: () => ({ trips: st.trips }), set: (d) => { st.trips = Math.max(0, d.trips | 0); } });
  G.modules.add('cloudisle');
})(globalThis.G);
