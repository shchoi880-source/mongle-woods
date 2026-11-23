// 월드: 결정적 생성(112×96), 타일 질의, 충돌, 오브젝트, 일일 갱신 — r2-기술 T8, 월1b
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  // 지형 코드
  const T = G.TERR = { GRASS: 0, PATH: 1, SAND: 2, WATER: 3, SEA: 4, HIGH: 5, CLIFF: 6, BRIDGE: 7, PLAZA: 8, STONE: 9 };
  const WALK = new Set([T.GRASS, T.PATH, T.SAND, T.BRIDGE, T.PLAZA, T.STONE]);
  const HIGH_ROWS = 26; // 북쪽 고지대(베타 잠금)

  // 값 노이즈
  function noise2(seed, x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = (a, b) => u.hashf(seed, a, b);
    const sx = u.smooth(xf), sy = u.smooth(yf);
    return u.lerp(u.lerp(s(xi, yi), s(xi + 1, yi), sx), u.lerp(s(xi, yi + 1), s(xi + 1, yi + 1), sx), sy);
  }
  function fbm(seed, x, y) { return noise2(seed, x, y) * 0.6 + noise2(seed + 7, x * 2.1, y * 2.1) * 0.3 + noise2(seed + 13, x * 4.3, y * 4.3) * 0.1; }

  // ---------- 생성 ----------
  function generate(seed) {
    const W = G.C.MAP_W, H = G.C.MAP_H;
    const terr = new Uint8Array(W * H);
    const R = G.rng.make(u.hash32(seed, 1));
    const at = (x, y) => terr[y * W + x];
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) terr[y * W + x] = v; };
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // 1) 바다·해변 (남쪽 가장자리, 굽이치는 해안선) + 좌우 끝 바다
    const coast = [];
    for (let x = 0; x < W; x++) coast[x] = Math.round(H - 11 + (fbm(seed + 3, x / 14, 0.5) - 0.5) * 8);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = coast[x];
      const edgeX = Math.min(x, W - 1 - x);
      const sideSea = edgeX < 2 + Math.round(fbm(seed + 5, 0.3, y / 9) * 2) && y > HIGH_ROWS;
      if (y >= c + 4 || sideSea) set(x, y, T.SEA);
      else if (y >= c || (edgeX < 4 + Math.round(fbm(seed + 5, 0.3, y / 9) * 2) && y > HIGH_ROWS + 2)) set(x, y, T.SAND);
      else set(x, y, T.GRASS);
    }
    // 2) 북쪽 고지대 + 절벽
    const cliffY = [];
    for (let x = 0; x < W; x++) cliffY[x] = HIGH_ROWS + Math.round((fbm(seed + 9, x / 10, 3.3) - 0.5) * 4);
    for (let x = 0; x < W; x++) { for (let y = 0; y < cliffY[x]; y++) set(x, y, T.HIGH); set(x, cliffY[x], T.CLIFF); }

    // 3) 강: 절벽(폭포)에서 시작해 바다까지 굽이침
    const rx0 = Math.round(W * (0.3 + R() * 0.4));
    const river = [];
    let rx = rx0;
    const fall = { x: rx0, y: cliffY[rx0] };
    for (let y = cliffY[rx0]; y < H; y++) {
      rx += Math.round((noise2(seed + 21, y / 7, 1) - 0.5) * 2.2);
      rx = u.clamp(rx, 18, W - 19);
      river.push([rx, y]);
      const w = y < cliffY[rx] + 3 ? 2 : 3;
      for (let k = -1; k < w - 1; k++) {
        const x = rx + k;
        if (at(x, y) === T.SEA) continue;
        if (y <= cliffY[x]) continue;
        set(x, y, at(x, y) === T.SAND ? T.WATER : T.WATER);
      }
      if (at(rx, y) === T.SEA) break;
    }
    // 폭포 위 고지대 물길(그림용)
    for (let y = 0; y <= cliffY[rx0]; y++) set(rx0, y, y === cliffY[rx0] ? T.CLIFF : T.WATER);

    // 4) 연못: 강 반대쪽 풀밭에 타원
    const pondSide = rx0 < W / 2 ? 1 : -1;
    const pcx = Math.round(rx0 + pondSide * (18 + R() * 12)), pcy = Math.round(HIGH_ROWS + 14 + R() * 18);
    const prx = 4 + R() * 1.5, pry = 3 + R() * 1.2;
    for (let y = -6; y <= 6; y++) for (let x = -7; x <= 7; x++) {
      const d = (x * x) / (prx * prx) + (y * y) / (pry * pry) + (noise2(seed + 31, x / 2, y / 2) - 0.5) * 0.5;
      if (d < 1 && at(pcx + x, pcy + y) === T.GRASS) set(pcx + x, pcy + y, T.WATER);
    }
    const pond = { x: pcx, y: pcy };

    // 5) 광장: 강 반대편 중앙부 (연못과 같은 쪽은 피함)
    const plSide = -pondSide;
    let plx = u.clamp(Math.round(rx0 + plSide * (16 + R() * 6)), 14, W - 15);
    let ply = Math.round(HIGH_ROWS + 22 + R() * 10);
    // 강과 겹치면 밀어낸다
    for (let tries = 0; tries < 20 && rectHas(plx - 5, ply - 4, 11, 9, T.WATER); tries++) plx += plSide * 2;
    for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) {
      if (Math.abs(x) === 5 && Math.abs(y) === 4) continue;
      if (at(plx + x, ply + y) === T.GRASS) set(plx + x, ply + y, T.PLAZA);
    }
    function rectHas(x0, y0, w, h, v) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y) && at(x, y) === v) return true; return false; }

    // 6) 다리: 강 위 2곳(하나는 징검다리 L8)
    const bridges = [];
    const riverRows = river.filter(([x, y]) => y > cliffY[x] + 4 && y < coast[x] - 2);
    const b1 = riverRows[Math.floor(riverRows.length * 0.3)], b2 = riverRows[Math.floor(riverRows.length * 0.72)];
    for (const [i, b] of [b1, b2].entries()) {
      if (!b) continue;
      const [bx, by] = b; const kind = i === 0 ? T.STONE : T.BRIDGE;
      for (let x = bx - 3; x <= bx + 3; x++) if (at(x, by) === T.WATER) set(x, by, kind);
      if (kind === T.BRIDGE) for (let x = bx - 3; x <= bx + 3; x++) if (at(x, by + 1) === T.WATER) set(x, by + 1, kind);
      bridges.push({ x: bx, y: by, kind: i === 0 ? 'stone' : 'bridge' });
    }

    // 7) 건물 부지 (광장 주변): 상점 가판대, 우체국, 텐트, 딸랑의 집, 박물관 자리(예고)
    const objs = [];
    const occ = new Uint8Array(W * H); // 오브젝트 점유
    const free = (x, y, w, h, pad = 1) => {
      for (let yy = y - pad; yy < y + h + pad; yy++) for (let xx = x - pad; xx < x + w + pad; xx++) {
        if (!inb(xx, yy)) return false;
        const t = at(xx, yy); if (t !== T.GRASS && t !== T.PLAZA && t !== T.PATH) return false;
        if (occ[yy * W + xx]) return false;
      }
      return true;
    };
    const occupy = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) occ[yy * W + xx] = 1; };
    function place(kind, w, h, cx, cy, extra) {
      // 원하는 위치 주변 나선 탐색
      for (let r = 0; r < 18; r++) for (let a = 0; a < Math.max(1, r * 8); a++) {
        const ang = (a / Math.max(1, r * 8)) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(ang) * r - w / 2), y = Math.round(cy + Math.sin(ang) * r - h / 2);
        if (free(x, y, w, h)) {
          occupy(x, y, w, h);
          const o = Object.assign({ kind, tx: x, ty: y, w, h }, extra || {});
          objs.push(o); return o;
        }
      }
      return null;
    }
    const sites = {};
    sites.oak = place('bigoak', 2, 2, plx, ply - 1, { solid: true }); // L1 할아버지 참나무 (광장 중앙)
    sites.shop = place('stall', 4, 3, plx + plSide * -9, ply - 4, { solid: true });
    sites.post = place('post', 4, 3, plx + plSide * 9, ply - 5, { solid: true });
    sites.tent = place('tent', 3, 2, plx + plSide * 2, ply + 9, { solid: true });
    sites.house1 = place('house', 4, 3, plx + plSide * 12, ply + 5, { solid: true, owner: 'ddalang' });
    sites.museum = place('signboard', 1, 1, plx - 1, ply + 6, { solid: true, text: 'museum' });
    // 길: 광장 → 각 건물 문
    const doorOf = (o) => ({ x: o.tx + Math.floor(o.w / 2), y: o.ty + o.h });
    const paths = [];
    for (const key of ['shop', 'post', 'tent', 'house1']) {
      const o = sites[key]; if (!o) continue;
      o.door = doorOf(o);
      paths.push([o.door.x, o.door.y, plx, ply]);
    }
    // 다리로 가는 길
    for (const b of bridges) paths.push([b.x + (plSide > 0 ? 4 : -4), b.y, plx, ply]);
    for (const [x0, y0, x1, y1] of paths) carvePath(x0, y0, x1, y1);
    function carvePath(x0, y0, x1, y1) {
      let x = x0, y = y0; let guard = 0;
      while ((x !== x1 || y !== y1) && guard++ < 400) {
        if (at(x, y) === T.GRASS && !occ[y * W + x]) set(x, y, T.PATH);
        const dx = x1 - x, dy = y1 - y;
        if (Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && guard % 2)) x += Math.sign(dx); else y += Math.sign(dy);
        if (at(x, y) === T.PLAZA) break;
      }
    }

    // 8) 랜드마크·소품
    const lamp = (x, y) => place('lamp', 1, 1, x, y, { solid: true });
    lamp(plx - 6, ply + 4); lamp(plx + 6, ply - 4); lamp(plx + 6, ply + 4);
    if (bridges[1]) lamp(bridges[1].x + 4, bridges[1].y - 1);
    place('bench', 2, 1, plx - 3, ply + 3, { solid: true });
    place('mailbox', 1, 1, (sites.tent ? sites.tent.tx + 4 : plx), sites.tent ? sites.tent.ty + 1 : ply, { solid: true });
    place('board', 2, 1, plx + 3, ply + 3, { solid: true });

    // 9) 나무: 노이즈 숲 + 띄엄띄엄
    const treeKinds = ['tree', 'tree', 'tree', 'pine', 'fruit'];
    for (let y = HIGH_ROWS + 2; y < H - 4; y++) for (let x = 2; x < W - 2; x++) {
      if (at(x, y) !== T.GRASS || occ[y * W + x]) continue;
      const f = fbm(seed + 41, x / 9, y / 9);
      const p = f > 0.62 ? 0.26 : f > 0.5 ? 0.07 : 0.02;
      if (u.hashf(seed, x, y, 77) < p && free(x, y, 1, 1, 1) && dist2(x, y, plx, ply) > 64) {
        const k = treeKinds[Math.floor(u.hashf(seed, x, y, 78) * treeKinds.length)];
        occupy(x, y, 1, 1);
        objs.push({ kind: k, tx: x, ty: y, w: 1, h: 1, solid: true });
      }
    }
    // 고지대 나무 (장식)
    for (let y = 1; y < HIGH_ROWS - 2; y++) for (let x = 1; x < W - 1; x++) {
      if (at(x, y) !== T.HIGH) continue;
      if (u.hashf(seed, x, y, 79) < 0.1 && at(x, y + 1) === T.HIGH && at(x, y + 2) === T.HIGH && x !== rx0) {
        objs.push({ kind: u.hashf(seed, x, y, 80) < 0.5 ? 'pine' : 'tree', tx: x, ty: y, w: 1, h: 1, solid: true, deco: true });
      }
    }
    // 10) 꽃밭·바위
    for (let y = HIGH_ROWS + 2; y < H - 4; y++) for (let x = 2; x < W - 2; x++) {
      if (at(x, y) !== T.GRASS || occ[y * W + x]) continue;
      const f = noise2(seed + 51, x / 5, y / 5);
      if (f > 0.72 && u.hashf(seed, x, y, 81) < 0.55) {
        occupy(x, y, 1, 1);
        objs.push({ kind: 'flower', tx: x, ty: y, w: 1, h: 1, solid: false, var: Math.floor(u.hashf(seed, x, y, 82) * 4) });
      } else if (u.hashf(seed, x, y, 83) < 0.006 && free(x, y, 1, 1, 1)) {
        occupy(x, y, 1, 1);
        objs.push({ kind: 'rock', tx: x, ty: y, w: 1, h: 1, solid: true });
      }
    }
    // 연못가·폭포 장식
    objs.push({ kind: 'falls', tx: fall.x, ty: fall.y, w: 1, h: 1, solid: true, deco: true });

    const plots = Object.fromEntries(Object.entries(sites).filter(([, o]) => o).map(([k, o]) => [k, { x: o.tx, y: o.ty, w: o.w, h: o.h, door: o.door }]));
    return { seed, w: W, h: H, terr, objs, plaza: { x: plx, y: ply }, pond, fall, bridges, plots, cliffY, coast };
  }
  function dist2(ax, ay, bx, by) { return (ax - bx) * (ax - bx) + (ay - by) * (ay - by); }

  // BFS 검증: 광장에서 모든 문·해변·다리 양쪽에 걸어서 갈 수 있는가
  function validate(m) {
    const W = m.w, H = m.h;
    const block = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) block[i] = WALK.has(m.terr[i]) ? 0 : 1;
    for (const o of m.objs) if (o.solid) for (let y = o.ty; y < o.ty + o.h; y++) for (let x = o.tx; x < o.tx + o.w; x++) block[y * W + x] = 1;
    const seen = new Uint8Array(W * H);
    const sx = m.plaza.x, sy = m.plaza.y + 2;
    const q = [sy * W + sx]; seen[q[0]] = 1;
    // 시작점이 막혀 있으면 주변에서 찾는다
    if (block[q[0]]) { for (let d = 1; d < 5 && block[q[0]]; d++) q[0] = (sy + d) * W + sx; seen[q[0]] = 1; }
    while (q.length) {
      const i = q.pop(); const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (seen[j] || block[j]) continue; seen[j] = 1; q.push(j);
      }
    }
    const errs = [];
    for (const [k, p] of Object.entries(m.plots)) if (p.door && !seen[p.door.y * W + p.door.x]) errs.push('door:' + k);
    let sand = 0, sandReach = 0, grass = 0, grassReach = 0;
    for (let i = 0; i < W * H; i++) {
      if (m.terr[i] === T.SAND && !block[i]) { sand++; if (seen[i]) sandReach++; }
      if (m.terr[i] === T.GRASS && !block[i]) { grass++; if (seen[i]) grassReach++; }
    }
    if (sandReach < sand * 0.85) errs.push('beach ' + sandReach + '/' + sand);
    if (grassReach < grass * 0.9) errs.push('grass ' + grassReach + '/' + grass);
    if (m.bridges.length < 2) errs.push('bridges');
    for (const k of ['shop', 'post', 'tent', 'house1', 'oak']) if (!m.plots[k]) errs.push('plot:' + k);
    return { ok: errs.length === 0, errs };
  }

  // 유효한 맵이 나올 때까지 시드를 바꿔 시도
  function generateValid(seed) {
    for (let k = 0; k < 30; k++) {
      const s = (seed + k * 7919) >>> 0;
      const m = generate(s); const v = validate(m);
      if (v.ok) return m;
    }
    return generate(seed);
  }

  // ---------- 런타임 월드 ----------
  const state = { seed: 0, taken: {}, dailyDay: -1, listsDay: -1, digs: [], shells: [], drops: [], shakes: {}, firstBalloon: false };
  const W = {
    map: null, objGrid: null,
    T, generate, generateValid, validate, HIGH_ROWS,
    state,
    build(seed) {
      const m = generateValid(seed);
      W.map = m; state.seed = m.seed;
      W.index();
      return m;
    },
    index() {
      const m = W.map;
      W.objGrid = new Int32Array(m.w * m.h).fill(-1);
      m.objs.forEach((o, i) => { o.i = i; for (let y = o.ty; y < o.ty + o.h; y++) for (let x = o.tx; x < o.tx + o.w; x++) W.objGrid[y * m.w + x] = i; });
    },
    tile(tx, ty) { const m = W.map; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return T.SEA; return m.terr[ty * m.w + tx]; },
    tileAt(x, y) { return W.tile(Math.floor(x / TILE), Math.floor(y / TILE)); },
    objAtTile(tx, ty) { const m = W.map; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return null; const i = W.objGrid[ty * m.w + tx]; return i >= 0 ? m.objs[i] : null; },
    isWater(t) { return t === T.WATER || t === T.SEA; },
    walkableTile(tx, ty) {
      const t = W.tile(tx, ty); if (!WALK.has(t)) return false;
      const o = W.objAtTile(tx, ty); return !(o && o.solid);
    },
    // 원(반경 r)이 (x,y)에 있을 수 있는가 — 4방향 샘플
    canStand(x, y, r) {
      const pts = [[0, 0], [r, 0], [-r, 0], [0, r * 0.6], [0, -r * 0.6]];
      for (const [dx, dy] of pts) if (!W.walkableTile(Math.floor((x + dx) / TILE), Math.floor((y + dy) / TILE))) return false;
      return true;
    },
    // 축 분리 이동 (벽 미끄러짐)
    move(e, dx, dy) {
      if (dx && W.canStand(e.x + dx, e.y, e.r)) e.x += dx;
      else if (dx) { // 모서리 미끄러짐
        for (const s of [4, -4]) if (W.canStand(e.x + dx, e.y + s, e.r)) { e.y += s * 0.5; break; }
      }
      if (dy && W.canStand(e.x, e.y + dy, e.r)) e.y += dy;
      else if (dy) {
        for (const s of [4, -4]) if (W.canStand(e.x + s, e.y + dy, e.r)) { e.x += s * 0.5; break; }
      }
    },
    // 물 종류: river / pond / sea
    waterKind(tx, ty) {
      const t = W.tile(tx, ty); if (t === T.SEA) return 'sea'; if (t !== T.WATER) return null;
      const p = W.map.pond; return (Math.abs(tx - p.x) < 9 && Math.abs(ty - p.y) < 7) ? 'pond' : 'river';
    },
    // ---------- 일일 갱신: 화석 자리 4, 조개 4~7, 나무 흔들기 초기화 ----------
    refresh(day) {
      if (state.dailyDay !== day) { state.dailyDay = day; state.taken = {}; state.shakes = {}; }
      if (state.listsDay === day) return;
      state.listsDay = day;
      const m = W.map; const R = G.rng.stream(G.rng.KEYS.DAY, day, 1);
      const grassFree = (tx, ty) => W.tile(tx, ty) === T.GRASS && !W.objAtTile(tx, ty);
      state.digs = [];
      for (let k = 0, guard = 0; k < 4 && guard < 500; guard++) {
        const tx = 3 + Math.floor(R() * (m.w - 6)), ty = HIGH_ROWS + 3 + Math.floor(R() * (m.h - HIGH_ROWS - 10));
        if (!grassFree(tx, ty) || state.digs.some((d) => d.tx === tx && d.ty === ty)) continue;
        state.digs.push({ tx, ty, id: 'dig' + k }); k++;
      }
      state.shells = [];
      const nShell = 4 + Math.floor(R() * 4);
      const shellRows = G.data.all('shells');
      for (let k = 0, guard = 0; k < nShell && guard < 800; guard++) {
        const tx = 2 + Math.floor(R() * (m.w - 4)), ty = Math.floor(m.h * 0.7 + R() * m.h * 0.3);
        if (W.tile(tx, ty) !== T.SAND || W.objAtTile(tx, ty)) continue;
        const sh = u.pickW(shellRows, R());
        state.shells.push({ tx, ty, id: 'sh' + k, item: 'shell:' + sh.id }); k++;
      }
    },
    isTaken: (id) => !!state.taken[id],
    take(id) { state.taken[id] = 1; G.save.mark('take'); },
  };
  G.world = W;

  G.save.section('world', {
    v: 1,
    def: () => ({ seed: 0, dailyDay: -1, taken: {}, shakes: {}, drops: [], firstBalloon: false }),
    get: () => ({ seed: state.seed, dailyDay: state.dailyDay, taken: state.taken, shakes: state.shakes, drops: state.drops, firstBalloon: state.firstBalloon }),
    set: (d) => {
      state.seed = d.seed; state.taken = d.taken || {}; state.shakes = d.shakes || {}; state.drops = d.drops || []; state.firstBalloon = !!d.firstBalloon;
      // 일일 목록(화석 자리·조개)은 시드·날짜에서 재생성하므로 저장하지 않는다
      state.dailyDay = d.dailyDay; state.listsDay = -1;
    },
  });

  G.modules.add('world');
})(globalThis.G);
