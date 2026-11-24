// 생태: 곤충 스폰·행동(A 날기 / B 기기 / C 나무)·잠자리채, 물고기 그림자·낚시(툭/덥석), 변이(일반/거대)
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const TIER_W = [0, 10, 5, 2, 0.7, 0.25];
  // 코지 채집 보정: 채를 들고 걷는 접근은 넉넉하게, 달리기는 여전히 곤충을 놀라게 한다.
  const BUG_TUNE = Object.freeze({ walkScare: 0.65, netWalkScare: 0.35, runScare: 1.15, netRunScare: 0.85, fleeSpeed: 105, catchRadius: 34, catchGrace: 0.5, missScare: 1.5 });

  const bugs = [], fish = [];
  let spawnT = 0, fishT = 0;

  function hourIn(ranges, h) { return ranges.some(([a, b]) => h >= a && h < b); }
  function available(sp, month, hour) { return sp.months.includes(month) && hourIn(sp.hours, hour); }
  function scareScale(p) { return p.mode === 'sneak' ? 0 : p.mode === 'run' ? (p.tool === 'net' ? BUG_TUNE.netRunScare : BUG_TUNE.runScare) : p.tool === 'net' ? BUG_TUNE.netWalkScare : BUG_TUNE.walkScare; }
  function rollSize(sp, r, giant) {
    const s = u.lerp(sp.size[0], sp.size[1], Math.pow(r, 1.5));
    return Math.round((giant ? s * 1.55 : s) * 10) / 10;
  }

  // 위치 후보 찾기
  function findSpot(loc, px, py, R) {
    const W = G.world, ptx = Math.floor(px / TILE), pty = Math.floor(py / TILE);
    for (let k = 0; k < 24; k++) {
      const ang = R() * Math.PI * 2, d = 5 + R() * 9;
      const tx = Math.round(ptx + Math.cos(ang) * d), ty = Math.round(pty + Math.sin(ang) * d);
      const t = W.tile(tx, ty), o = W.objAtTile(tx, ty);
      const grassy = t === G.TERR.GRASS || t === G.TERR.PATH;
      if (loc === 'flower' && o && o.kind === 'flower') return [tx, ty, 0];
      if (loc === 'air' && grassy && !o) return [tx, ty, 14];
      if (loc === 'ground' && grassy && !o) return [tx, ty, 0];
      if (loc === 'rock') { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0]]) { const r = W.objAtTile(tx + dx, ty + dy); if (r && r.kind === 'rock' && W.walkableTile(tx, ty)) return [tx, ty, 0]; } }
      if (loc === 'tree' && o && (o.kind === 'tree' || o.kind === 'fruit') && !o.deco) return [tx, ty, 22, o];
      if (loc === 'water' && grassy && !o && [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => W.isWater(W.tile(tx + dx, ty + dy)))) return [tx, ty, 10];
      if (loc === 'lamp' && o && o.kind === 'lamp') return [tx, ty + 1, 26];
      // 물 위(물가에서 한 칸 안쪽): 잠자리채가 닿는 거리
      if (loc === 'surface' && W.tile(tx, ty) === G.TERR.WATER && [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => W.walkableTile(tx + dx, ty + dy))) return [tx, ty, 0];
    }
    return null;
  }

  function spawnBug(p) {
    const month = G.time.month(), hour = G.time.hour();
    const wx = G.weather.now();
    const R = Math.random;
    let cands = G.data.all('bugs').filter((sp) => available(sp, month, hour));
    if (wx.type === 'rain' || wx.type === 'snow') cands = cands.filter((sp) => sp.loc !== 'air' && sp.loc !== 'flower');
    if (!cands.length) return;
    const dream = G.mail ? G.mail.dreamSpecies() : '';
    const sp = u.pickW(cands.map((s) => ({ s, w: TIER_W[s.tier] * (s.rare || 1) * (dream === 'bug:' + s.id ? 6 : 1) })), R()).s;
    const spot = findSpot(sp.loc, p.x, p.y, R); if (!spot) return;
    const [tx, ty, alt, obj] = spot;
    const v = G.rollVariant(R(), { night: G.time.isNight(), wet: wx.type !== 'clear' && wx.type !== 'cloudy', golden: G.lantern && G.lantern.golden() });
    const giant = v === 1;
    const b = {
      kind: 'bug', sp, x: tx * TILE + 16 + (R() - 0.5) * 12, y: ty * TILE + 20, alt, baseAlt: alt,
      hx: tx * TILE + 16, hy: ty * TILE + 20, vx: 0, vy: 0, t: R() * 10, state: 'idle', seed: R() * 10, face: 1,
      v, size: rollSize(sp, R(), giant), sizeK: giant ? 1 : 0, fade: 0, obj,
    };
    if (sp.loc === 'tree' && obj) { b.x = obj.tx * TILE + 16; b.y = obj.ty * TILE + 30; }
    bugs.push(b);
    G.emit('eco:spawn', { e: b });
  }

  function spawnFish(p) {
    const W = G.world, month = G.time.month(), hour = G.time.hour(), R = Math.random;
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
    for (let k = 0; k < 20; k++) {
      const tx = ptx + Math.round((R() - 0.5) * 22), ty = pty + Math.round((R() - 0.5) * 16);
      const wk = W.waterKind(tx, ty); if (!wk) continue;
      // 물 한가운데(사방이 물)만
      if (![[0, 1], [1, 0], [-1, 0], [0, -1]].every(([dx, dy]) => W.isWater(W.tile(tx + dx, ty + dy)))) continue;
      if (Math.abs(tx - ptx) < 2 && Math.abs(ty - pty) < 2) continue;
      const cands = G.data.all('fish').filter((f) => f.loc === wk && available(f, month, hour));
      if (!cands.length) return;
      const dream = G.mail ? G.mail.dreamSpecies() : '';
      const sp = u.pickW(cands.map((s) => ({ s, w: TIER_W[s.tier] * (s.rare || 1) * (dream === 'fish:' + s.id ? 6 : 1) })), R()).s;
      const wx = G.weather.now();
      const v = G.rollVariant(R(), { night: G.time.isNight(), wet: wx.type !== 'clear' && wx.type !== 'cloudy', golden: G.lantern && G.lantern.golden() });
      const giant = v === 1;
      fish.push({ kind: 'fish', sp, shadow: giant ? Math.min(5, sp.shadow + 1) : sp.shadow, x: tx * TILE + 16, y: ty * TILE + 16, ang: R() * 6.28, spd: 0, t: 0, seed: R() * 10, state: 'swim', v, size: rollSize(sp, R(), giant), fade: 0 });
      return;
    }
  }

  function inWater(x, y) { return G.world.isWater(G.world.tileAt(x, y)); }

  const E = G.eco = {
    bugs, fish,
    update(dt, p) {
      // 스폰
      spawnT -= dt; fishT -= dt;
      const night = G.time.isNight();
      const wantBugs = night ? 4 : 7;
      if (spawnT <= 0) { spawnT = 1.2; if (bugs.length < wantBugs) spawnBug(p); }
      if (fishT <= 0) { fishT = 1.5; if (fish.length < 7) spawnFish(p); }
      // 곤충
      for (let i = bugs.length - 1; i >= 0; i--) {
        const b = bugs[i]; b.t += dt; b.fade = Math.min(1, b.fade + dt * 2);
        const d = u.dist(b.x, b.y, p.x, p.y);
        if (d > TILE * 20 || (b.state === 'flee' && b.t > 2.2)) { bugs.splice(i, 1); continue; }
        if (b.state === 'curl' && b.t > 4) { b.state = 'idle'; b.t = 0; } // 4초 뒤 다시 펴짐
        if (b.state === 'held') continue;
        // 도망 판정: 잠자리채를 들고 걷는 동안은 포획 거리까지 여유 있게 접근할 수 있다.
        const scare = scareScale(p);
        if (b.state !== 'flee' && b.state !== 'curl' && p.moving && scare && d < b.sp.flee * TILE * scare) E.scare(b, p);
        behave(b, dt, p);
      }
      // 물고기
      for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i]; f.t += dt; f.fade = Math.min(1, f.fade + dt);
        const d = u.dist(f.x, f.y, p.x, p.y);
        if (d > TILE * 18 || (f.state === 'flee' && f.t > 1.2)) { fish.splice(i, 1); continue; }
        if (f.state === 'flee') { f.fade = Math.max(0, 1 - f.t / 1.2); moveFish(f, dt, 150); continue; }
        if (f.state === 'swim') {
          if (f.t > 1.5 + (f.seed % 2)) { f.t = 0; f.ang += (Math.random() - 0.5) * 2; f.spd = Math.random() < 0.4 ? 0 : 14 + Math.random() * 14; }
          moveFish(f, dt, f.spd);
          // 달려서 물가에 오면 놀란다
          if (p.moving && p.mode === 'run' && d < TILE * 2.5) { f.state = 'flee'; f.t = 0; }
        }
        // 'approach' / 'hooked' 는 낚시가 조종
      }
      F.update(dt, p);
    },
    scare(b, p) {
      if (b.state === 'flee') return;
      if (b.sp.beh === 'E') { if (b.state !== 'curl') { b.state = 'curl'; b.t = 0; G.emit('eco:flee', { e: b }); } return; } // 동글 말림: 도망 대신 그 자리에
      b.state = 'flee'; b.t = 0;
      const a = Math.atan2(b.y - p.y, b.x - p.x);
      b.vx = Math.cos(a) * BUG_TUNE.fleeSpeed; b.vy = Math.sin(a) * BUG_TUNE.fleeSpeed;
      G.emit('eco:flee', { e: b });
    },
    // 잠자리채 휘두르기: 맞으면 그 곤충 반환
    swing(p) {
      const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];
      const [dx, dy] = DIRS[p.dir];
      const tx = p.x + dx * 22, ty = p.y + dy * 22;
      let best = null, bd = 1e9;
      for (const b of bugs) {
        if (b.state === 'held' || b.fade < 0.5) continue;
        const d = u.dist(b.x, b.y - (b.alt || 0) * 0.4, tx, ty);
        if (d < BUG_TUNE.catchRadius * (p.up && p.up.net ? 1.35 : 1) && d < bd) { bd = d; best = b; }
      }
      if (best && best.state !== 'flee') { bugs.splice(bugs.indexOf(best), 1); return best; }
      if (best && best.state === 'flee' && best.t < BUG_TUNE.catchGrace) { bugs.splice(bugs.indexOf(best), 1); return best; } // 막 날아오른 순간은 넉넉히 봐준다
      // 헛손질: 근처 곤충이 놀람
      for (const b of bugs) if (u.dist(b.x, b.y, p.x, p.y) < TILE * BUG_TUNE.missScare) E.scare(b, p);
      return null;
    },
    nearest(kind, x, y, r) {
      const arr = kind === 'bug' ? bugs : fish; let best = null, bd = r;
      for (const e of arr) { const d = u.dist(e.x, e.y, x, y); if (d < bd && e.state !== 'flee') { bd = d; best = e; } }
      return best;
    },
    // 콩알 감지: 미수집 종이 반경 5타일 안에 있나
    sense(x, y) {
      let res = null;
      for (const b of bugs) {
        if (b.state === 'flee') continue;
        const d = u.dist(b.x, b.y, x, y) / TILE;
        if (d < 5 && (!G.collect.has('bug', b.sp.ix) || b.sp.tier >= 3 || b.v)) { if (!res || d < res.d) res = { d, rare: b.sp.tier >= 3 || b.v === 1 }; }
      }
      return res;
    },
    clear() { bugs.length = 0; fish.length = 0; },
    _bugTune: BUG_TUNE, _scareScale: scareScale,
    // 렌더 목록
    collect(out, rect, t) {
      for (const b of bugs) if (inRect(b, rect)) out.push({ sy: b.y + (b.alt ? 2 : 0), draw: (ctx) => { ctx.globalAlpha = b.fade * (b.state === 'flee' ? Math.max(0, 1 - b.t / 2) : 1); G.art.bug(ctx, b, t); ctx.globalAlpha = 1; } });
    },
    drawWater(ctx, rect, t) {
      for (const f of fish) if (inRect(f, rect)) { ctx.globalAlpha = f.fade; G.art.fishShadow(ctx, f, t); }
      ctx.globalAlpha = 1;
    },
  };
  function inRect(e, r) { return e.x > r.x - 40 && e.x < r.x + r.w + 40 && e.y > r.y - 40 && e.y < r.y + r.h + 60; }

  function behave(b, dt, p) {
    const sp = b.sp;
    if (b.state === 'curl') { b.alt = 0; return; }
    if (b.state === 'flee') {
      if (sp.beh === 'G') { b.fade = Math.max(0, 1 - b.t * 2); return; } // 물속으로 쏙
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (sp.beh === 'A' || sp.beh === 'C' || sp.beh === 'F') b.alt = (b.alt || 0) + 60 * dt;
      if (sp.beh === 'D') b.alt = Math.abs(Math.sin(b.t * 7)) * 18;
      b.face = b.vx < 0 ? -1 : 1;
      return;
    }
    if (sp.beh === 'A') {
      // 홈 주변 8자 배회
      const k = b.t * sp.spd * 0.5 + b.seed;
      const tx = b.hx + Math.sin(k) * 28 + Math.sin(k * 0.37) * 18, ty = b.hy + Math.sin(k * 2) * 12;
      const nx = u.lerp(b.x, tx, Math.min(1, dt * 2)), ny = u.lerp(b.y, ty, Math.min(1, dt * 2));
      b.face = nx < b.x ? -1 : 1; b.x = nx; b.y = ny;
      b.alt = b.baseAlt + 6 + Math.sin(b.t * 3 + b.seed) * 5;
      if (sp.loc === 'flower') b.alt = Math.max(2, b.alt - 6);
      if (sp.tpl === 'firefly') b.alt = 12 + Math.sin(b.t * 1.3 + b.seed) * 8;
    } else if (sp.beh === 'B') {
      if (b.t > 1.2 + (b.seed % 1.5)) { b.t = 0; const a = Math.random() * 6.28; const s = Math.random() < 0.35 ? 0 : sp.spd * 24; b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; }
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (G.world.canStand(nx, ny, 2) && u.dist(nx, ny, b.hx, b.hy) < TILE * 2.5) { b.x = nx; b.y = ny; }
      if (b.vx) b.face = b.vx < 0 ? -1 : 1;
    } else if (sp.beh === 'C') {
      b.alt = b.baseAlt + Math.sin(b.t * 0.8) * 1.5;
    } else if (sp.beh === 'D') {
      // 쉬다가 폴짝: 0.45초 포물선
      b.hop = (b.hop || 0) - dt;
      if (b.hop <= -0.45 - (b.seed % 1.2)) { b.hop = 0.45; const a = Math.random() * 6.28; b.vx = Math.cos(a) * 70; b.vy = Math.sin(a) * 50; }
      if (b.hop > 0) {
        const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
        if (G.world.canStand(nx, ny, 2) && u.dist(nx, ny, b.hx, b.hy) < TILE * 3) { b.x = nx; b.y = ny; }
        b.alt = Math.sin((1 - b.hop / 0.45) * Math.PI) * 14; b.face = b.vx < 0 ? -1 : 1;
      } else b.alt = 0;
    } else if (sp.beh === 'E') {
      if (b.t > 1.5 + (b.seed % 1.5)) { b.t = 0; const a = Math.random() * 6.28; const s = Math.random() < 0.4 ? 0 : sp.spd * 24; b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; }
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (G.world.canStand(nx, ny, 2) && u.dist(nx, ny, b.hx, b.hy) < TILE * 1.5) { b.x = nx; b.y = ny; }
      if (b.vx) b.face = b.vx < 0 ? -1 : 1;
    } else if (sp.beh === 'F') {
      // 나무 줄기를 천천히 오르내린다
      b.alt = b.baseAlt - 6 + (Math.sin(b.t * 0.45 + b.seed) * 0.5 + 0.5) * 22;
    } else if (sp.beh === 'G') {
      const k = b.t * sp.spd * 1.6 + b.seed;
      b.x = b.hx + Math.cos(k) * 9; b.y = b.hy + Math.sin(k) * 5; b.face = Math.sin(k) > 0 ? -1 : 1; b.alt = 0;
    }
  }

  function moveFish(f, dt, spd) {
    const nx = f.x + Math.cos(f.ang) * spd * dt, ny = f.y + Math.sin(f.ang) * spd * dt;
    if (inWater(nx, ny) && inWater(nx + Math.cos(f.ang) * 10, ny + Math.sin(f.ang) * 10)) { f.x = nx; f.y = ny; }
    else f.ang += Math.PI * (0.5 + Math.random() * 0.5);
  }

  // ---------- 낚시 ----------
  // 상태: idle → flying → wait → (approach) → nibble(툭 0~3회) → bite(덥석, 판정창) → 결과
  const F = G.fishing = {
    state: 'idle', bob: null, target: null, t: 0, nibbles: 0, nibbleT: 0, window: 0, fake: 0,
    cast(p) {
      const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];
      const [dx, dy] = DIRS[p.dir];
      // 앞으로 1.5~3타일 중 물 찾기
      for (let dd = 2.6; dd >= 1.1; dd -= 0.25) {
        const x = p.x + dx * dd * TILE, y = p.y + dy * dd * TILE - (dy === 0 ? 6 : 0);
        if (inWater(x, y)) {
          F.state = 'flying'; F.t = 0; F.bob = { x0: p.x + dx * 10, y0: p.y - 30, x, y, dip: 0, ring: [] };
          G.audio.sfx('cast');
          return true;
        }
      }
      return false;
    },
    cancel(quiet) {
      if (F.target && F.target.state !== 'flee') { F.target.state = 'flee'; F.target.t = 0; F.target.ang += Math.PI; }
      F.state = 'idle'; F.bob = null; F.target = null;
      if (!quiet) G.audio.sfx('swing');
    },
    // 액션 버튼
    press(p) {
      // 큰 그림자(4+)는 '영차' 세 번으로 끌어올린다 (실패 없음)
      if (F.state === 'bite' && F.target.shadow >= 4) { F.state = 'reel'; F.t = 0; F.reel = 0; F.pop = 1; G.audio.sfx('bite'); return { reel: true }; }
      if (F.state === 'reel') {
        F.reel++; F.pop = 1; G.audio.sfx('nibble');
        if (G.settings.get('vibrate') && navigator.vibrate) navigator.vibrate(25);
        if (F.reel < 3) return { reel: true };
      }
      if (F.state === 'bite' || F.state === 'reel') {
        const f = F.target; F.state = 'idle'; F.bob = null; F.target = null;
        fish.splice(fish.indexOf(f), 1);
        return { caught: f };
      }
      if (F.state === 'nibble' || F.state === 'approach') {
        // 너무 일찍 당김 → 귀엽게 놓침
        G.audio.sfx('swing'); F.cancel(true);
        return { early: true };
      }
      F.cancel(); return { cancel: true };
    },
    update(dt, p) {
      if (F.state === 'idle' || !F.bob) return;
      const b = F.bob; F.t += dt;
      for (const r of b.ring) r.t += dt; b.ring = b.ring.filter((r) => r.t < 0.8);
      b.dip = Math.max(0, b.dip - dt * 12);
      if (F.state === 'flying') {
        if (F.t >= 0.35) { F.state = 'wait'; F.t = 0; b.ring.push({ t: 0, big: false }); G.audio.sfx('plop'); }
        return;
      }
      if (p.moving) { F.cancel(); return; }
      if (F.state === 'wait') {
        // 3타일 안의 물고기가 관심
        if (F.t > 0.6 && !F.target) {
          let best = null, bd = TILE * (G.player.up && G.player.up.rod ? 4.6 : 3.2);
          for (const f of fish) { if (f.state !== 'swim') continue; const d = u.dist(f.x, f.y, b.x, b.y); if (d < bd) { bd = d; best = f; } }
          if (best) { F.target = best; best.state = 'approach'; F.state = 'approach'; F.t = 0; }
        }
        if (F.t > 14) F.cancel(true);
        return;
      }
      const f = F.target;
      if (!f || f.state === 'flee') { F.state = 'wait'; F.t = 0; F.target = null; return; }
      if (F.state === 'approach') {
        // 찌 쪽으로 몸을 돌려 천천히
        const a = Math.atan2(b.y - f.y, b.x - f.x);
        f.ang = a; const d = u.dist(f.x, f.y, b.x, b.y);
        const front = 8 + f.shadow * 2;
        if (d > front) { f.x += Math.cos(a) * 18 * dt; f.y += Math.sin(a) * 18 * dt; }
        else { F.state = 'nibble'; F.t = 0; F.nibbles = Math.floor(Math.random() * (G.player.up && G.player.up.rod ? 2 : 4)); F.nibbleT = 0.6 + Math.random() * 0.8; }
        return;
      }
      if (F.state === 'nibble') {
        F.nibbleT -= dt;
        // 머리를 찌에 콕콕
        const a = Math.atan2(b.y - f.y, b.x - f.x);
        f.x += Math.cos(a) * Math.sin(F.t * 12) * 6 * dt; f.y += Math.sin(a) * Math.sin(F.t * 12) * 6 * dt;
        if (F.nibbleT <= 0) {
          if (F.nibbles > 0) {
            F.nibbles--; F.nibbleT = 0.7 + Math.random() * 0.9;
            b.dip = 2; b.ring.push({ t: 0, big: false }); G.audio.sfx('nibble'); // 툭
          } else {
            // 덥석! 판정창: ★1 800ms ~ ★5 350ms, 터치 +80ms
            F.state = 'bite'; F.t = 0;
            F.window = (800 - (f.sp.tier - 1) * 112 + (G.input.lastTouch ? 80 : 0) + (G.player.up && G.player.up.rod ? 160 : 0)) / 1000;
            b.dip = 7; b.ring.push({ t: 0, big: true }, { t: -0.12, big: true });
            G.audio.sfx('bite'); G.emit('fishing:bite', {});
            if (G.settings.get('vibrate') && navigator.vibrate) navigator.vibrate(40);
          }
        }
        return;
      }
      if (F.state === 'reel') {
        // 물고기가 찌 쪽으로 끌려온다. 3.5초가 지나도 못 당기면 알아서 올라온다(벌 없음)
        F.pop = Math.max(0, (F.pop || 0) - dt * 3);
        f.x += (p.x - f.x) * dt * 0.6 * (1 + F.reel); f.y += (p.y + 20 - f.y) * dt * 0.3;
        b.x = f.x; b.y = f.y; b.dip = 7 + Math.sin(F.t * 20) * 2;
        if (F.t > 3.5) { G.emit('fishing:auto', {}); }
        return;
      }
      if (F.state === 'bite') {
        b.dip = 7;
        if (F.t > F.window) { // 놓침
          f.state = 'flee'; f.t = 0; f.ang += Math.PI;
          F.state = 'idle'; F.bob = null; F.target = null;
          G.emit('eco:miss', { kind: 'fish' });
        }
      }
    },
    // 찌·낚싯줄 그리기 (월드 좌표)
    draw(ctx, p, t) {
      const b = F.bob; if (!b) return;
      let bx = b.x, by = b.y;
      if (F.state === 'flying') { const k = Math.min(1, F.t / 0.35); bx = u.lerp(b.x0, b.x, k); by = u.lerp(b.y0, b.y, k) - Math.sin(k * Math.PI) * 30; }
      // 줄
      const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]]; const [dx] = DIRS[p.dir];
      const hx = p.x + (dx ? dx * 8 : 9), hy = p.y - 38;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + bx) / 2, Math.max(hy, by) + 6, bx, by); ctx.stroke();
      // 물결
      for (const r of b.ring) { if (r.t < 0) continue; const k = r.t / 0.8; ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.9})`; ctx.lineWidth = r.big ? 2 : 1.2; ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, (r.big ? 8 : 5) + k * (r.big ? 16 : 9), (r.big ? 3 : 2) + k * (r.big ? 6 : 3), 0, 0, Math.PI * 2); ctx.stroke(); }
      if (F.state === 'flying') { G.art.paint.blob(ctx, bx, by, 3, 3, '#ff6b6b', '#5b4636', 1); return; }
      // 찌: 위 빨강 아래 흰색, dip만큼 잠김
      const bob = Math.sin(t * 2.5) * 0.8;
      const dip = b.dip;
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 6, by - 12, 12, 13); ctx.clip();
      G.art.paint.blob(ctx, bx, by - 3 + dip + bob, 3.4, 4, '#ffffff', '#5b4636', 1);
      G.art.paint.blob(ctx, bx, by - 5 + dip + bob, 3.4, 2.4, '#ff6b6b');
      ctx.restore();
      if (F.state === 'bite') {
        ctx.fillStyle = '#ff8a3a'; ctx.font = G.fontPx(16); ctx.textAlign = 'center';
        ctx.fillText('!', bx, by - 16 - Math.sin(F.t * 20) * 2);
      }
    },
    // 그레이딩 뒤(밤에도 밝게)에 그리는 '영차' 글자
    drawPost(ctx, p) {
      if (F.state === 'reel') {
        const s = 1 + (F.pop || 0) * 0.35;
        ctx.save(); ctx.translate(p.x, p.y - 100); ctx.scale(s, s);
        ctx.font = G.fontPx(15); ctx.textAlign = 'center'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#5b4636'; ctx.fillStyle = '#fff';
        const txt = '영차!' + ' ●'.repeat(F.reel) + ' ○'.repeat(3 - F.reel);
        ctx.strokeText(txt, 0, 0); ctx.fillText(txt, 0, 0); ctx.restore();
      }
    },
  };

  G.modules.add('eco');
})(globalThis.G);
