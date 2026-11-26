// 아트: 팔레트, 스프라이트 캐시, 지형 청크 굽기, 자연물·건물, 물 애니, 시간대 그레이딩, 빛, 날씨
// 단위 u = 타일 1/32. 지면은 청크에 굽고, 외부 오브젝트는 스프라이트를 캐시한다.
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE, CH = G.C.CHUNK;
  const TT = G.TERR;

  // ---------- 팔레트 ----------
  const PAL = {
    spring: { grass: '#a6b989', grassD: '#839569', grassL: '#d1d8aa', high: '#96a678', tuft: '#7c9063', leaf: ['#8fd16a', '#6db552', '#b9e58c'], blossom: '#ffc2d6' },
    summer: { grass: '#99ae76', grassD: '#788d5b', grassL: '#c0ce93', high: '#899f69', tuft: '#708959', leaf: ['#6cc456', '#4ea445', '#93db6e'], blossom: null },
    autumn: { grass: '#baae76', grassD: '#99895b', grassL: '#d8cd9b', high: '#a79d6b', tuft: '#9c8a63', leaf: ['#f3a54a', '#de7a3a', '#ffd06a'], blossom: null },
    winter: { grass: '#dce7e6', grassD: '#b6ccd0', grassL: '#f6f5ed', high: '#c7d9dc', tuft: '#a6bec3', leaf: ['#7fae7a', '#5e9264', '#a4cc9c'], blossom: null, snow: true },
  };
  const C = {
    sea: '#85aeb0', seaD: '#6e979e', water: '#9cbfc1', waterD: '#729e9e', foam: '#f6f2df',
    sand: '#e2cca7', sandD: '#c1a981', wet: '#c0ad90',
    path: '#d2b792', pathD: '#b89d77', plaza: '#d7c9b0', plazaD: '#b9a78b',
    cliff: '#c29a74', cliffD: '#a17b5a', cliffL: '#d8b38c',
    wood: '#c98e5a', woodD: '#9c6a40', woodL: '#e0ae7c',
    line: '#5b4636', shadow: 'rgba(60,50,80,0.22)',
  };
  const A = G.art = { PAL, C, PX: 2, season: 'autumn' };
  A.pal = () => PAL[A.season];
  A.mapColors = (season) => {
    const pal = PAL[season];
    return [pal.grass, C.path, C.sand, C.water, C.sea, pal.high, C.cliff, C.wood, C.plaza, '#a0a8a4'];
  };

  // ---------- 스프라이트 캐시 ----------
  const cache = new Map();
  let cachePx = 0;
  A.sprite = (key, w, h, draw) => {
    if (cachePx !== A.PX) { cache.clear(); chunkCache.clear(); cachePx = A.PX; }
    let c = cache.get(key);
    if (!c) {
      c = mkCanvas(Math.ceil(w * A.PX), Math.ceil(h * A.PX));
      const g = c.getContext('2d'); g.scale(A.PX, A.PX); draw(g);
      c.uw = w; c.uh = h; cache.set(key, c);
      if (cache.size > 400) cache.delete(cache.keys().next().value);
    }
    return c;
  };
  A.clearCache = () => { cache.clear(); chunkCache.clear(); };
  function mkCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c;
  }
  A.mkCanvas = mkCanvas;

  // 색 선 (그래픽 개선: 모든 물체에 같은 진갈색 선 → 채운 색을 어둡게 한 '색 외곽선'. 요즘 귀여운 그림체)
  const lineCache = new Map();
  A.inkOf = (fill) => {
    if (typeof fill !== 'string' || fill[0] !== '#' || (fill.length !== 7 && fill.length !== 4)) return C.line;
    let v = lineCache.get(fill); if (v) return v;
    const h = fill.length === 4 ? fill.slice(1).split('').map((c) => c + c).join('') : fill.slice(1), n = parseInt(h, 16);
    const r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    // 어둡게 + 살짝 보랏빛 갈색 쪽으로
    const mix = (c, t) => Math.round(c * 0.5 + t * 0.18);
    v = `rgb(${mix(r, 90)},${mix(gg, 60)},${mix(b, 80)})`; lineCache.set(fill, v); return v;
  };
  const ink = (line, fill) => (line === C.line ? A.inkOf(fill) : line);
  // 공통 도형
  const P = A.paint = {
    blob(g, x, y, rx, ry, fill, line, lw = 1.5) {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (line) { g.lineWidth = lw; g.strokeStyle = ink(line, fill); g.stroke(); }
    },
    rrect(g, x, y, w, h, r, fill, line, lw = 1.5) {
      g.beginPath(); g.roundRect(x, y, w, h, r);
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (line) { g.lineWidth = lw; g.strokeStyle = ink(line, fill); g.stroke(); }
    },
    // 둥근 볼륨: 타원 안쪽에 왼쪽 위 햇빛·오른쪽 아래 그늘 (캐릭터 머리·몸)
    vol(g, x, y, rx, ry, k = 1) {
      g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.clip();
      const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, 0, x - rx * 0.1, y - ry * 0.1, Math.max(rx, ry) * 1.35);
      gr.addColorStop(0, `rgba(255,255,245,${0.32 * k})`); gr.addColorStop(0.35, 'rgba(255,255,245,0)'); gr.addColorStop(0.75, 'rgba(90,60,120,0)'); gr.addColorStop(1, `rgba(90,60,120,${0.28 * k})`);
      g.fillStyle = gr; g.fillRect(x - rx, y - ry, rx * 2, ry * 2); g.restore();
    },
    // 부드러운 그림자 (그래픽 개선: 납작한 타원 → 가장자리가 번지는 그림자)
    shadow(g, x, y, w, a = 0.22) {
      g.save(); g.translate(x, y); g.scale(1, 0.4);
      const r = w / 2 * 1.15, gr = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      gr.addColorStop(0, `rgba(50,40,80,${a * 1.35})`); gr.addColorStop(0.6, `rgba(50,40,80,${a * 0.9})`); gr.addColorStop(1, 'rgba(50,40,80,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.restore();
    },
    // 입체 명암: 이미 그린 그림 위에만(source-atop) 위쪽 햇빛·아래쪽 그늘을 얹는다
    shade(g, x, y, w, h, o = {}) {
      g.save(); g.globalCompositeOperation = 'source-atop';
      const lin = g.createLinearGradient(x, y, x + w * 0.35, y + h);
      lin.addColorStop(0, `rgba(255,250,225,${o.hi ?? 0.22})`); lin.addColorStop(0.45, 'rgba(255,250,225,0)');
      lin.addColorStop(0.7, 'rgba(70,50,110,0)'); lin.addColorStop(1, `rgba(70,50,110,${o.lo ?? 0.22})`);
      g.fillStyle = lin; g.fillRect(x, y, w, h);
      g.restore();
    },
  };

  // ---------- 지형 청크 굽기 ----------
  const chunkCache = new Map();
  A.chunk = (cx, cy) => {
    const key = cx + ',' + cy;
    if (cachePx !== A.PX) { cache.clear(); chunkCache.clear(); cachePx = A.PX; }
    let c = chunkCache.get(key);
    if (c) { chunkCache.delete(key); chunkCache.set(key, c); return c; }
    c = bakeChunk(cx, cy);
    chunkCache.set(key, c);
    while (chunkCache.size > 28) chunkCache.delete(chunkCache.keys().next().value);
    return c;
  };
  A.dropChunks = () => chunkCache.clear();

  function bakeChunk(cx, cy) {
    const S = CH * TILE;
    const c = mkCanvas(Math.ceil(S * A.PX), Math.ceil(S * A.PX));
    const g = c.getContext('2d');
    g.scale(A.PX, A.PX); g.translate(-cx * S, -cy * S);
    const W = G.world, pal = A.pal(), seed = W.map.seed;
    const tx0 = cx * CH - 1, ty0 = cy * CH - 1, tx1 = cx * CH + CH, ty1 = cy * CH + CH + 1;
    const t = (x, y) => W.tile(x, y);
    const isSea = (v) => v === TT.SEA;
    const isWater = (v) => v === TT.WATER || v === TT.BRIDGE || v === TT.STONE;
    const isLand = (v) => !isSea(v) && !isWater(v);
    const isGrassy = (v) => v === TT.GRASS || v === TT.PATH || v === TT.PLAZA || v === TT.HIGH || v === TT.CLIFF;
    const isPath = (v) => v === TT.PATH;
    const isPlaza = (v) => v === TT.PLAZA;
    const bounds = [tx0 * TILE, ty0 * TILE, (tx1 - tx0 + 1) * TILE, (ty1 - ty0 + 1) * TILE];
    const scenery = G.scenery;
    const corners = [[0, 0], [TILE, 0], [TILE, TILE], [0, TILE]];
    const normals = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    function union(test, color, dy = 0, r = 11) {
      region(test, dy, r); g.fillStyle = color; g.fill();
    }
    function material(name, alpha, mode) {
      return scenery?.material(g, name, bounds, alpha, mode);
    }
    function paintRegion(test, name, alpha, mode, dy = 0, r = 11) {
      g.save(); region(test, dy, r); g.clip();
      material(name, alpha, mode);
      g.restore();
    }
    function region(test, dy = 0, r = 11) {
      g.beginPath();
      for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
        if (!test(t(x, y))) continue;
        const px = x * TILE, py = y * TILE + dy;
        const joined = normals.map(([nx, ny]) => test(t(x + nx, y + ny)));
        if (joined.every(Boolean)) { g.rect(px, py, TILE, TILE); continue; }
        const radii = joined.map((j, i) => j || joined[(i + 3) % 4] ? 0 :
          r * (0.72 + (u.hash32(seed, x, y, i + 57) & 15) / 44));
        g.moveTo(px + radii[0], py);
        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4;
          const [ax, ay] = corners[i], [bx, by] = corners[next];
          const [nx, ny] = normals[i];
          const ex = -ny, ey = nx;
          const end = radii[next];
          const right = px + bx - ex * end, bottom = py + by - ey * end;
          if (joined[i]) g.lineTo(right, bottom);
          else {
            const w = ((u.hash32(seed, x, y, i + 66) & 15) - 6) * 0.57;
            g.bezierCurveTo(px + ax + ex * 13 + nx * w, py + ay + ey * 13 + ny * w,
              px + bx - ex * 13 + nx * w * 0.7, py + by - ey * 13 + ny * w * 0.7, right, bottom);
          }
          if (end) g.quadraticCurveTo(px + bx, py + by, px + bx - nx * end, py + by - ny * end);
        }
        g.closePath();
        // Round inward bends where two neighbors meet an empty diagonal.
        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4;
          const [nx, ny] = normals[i], [mx, my] = normals[next];
          if (!joined[i] || !joined[next] || test(t(x + nx + mx, y + ny + my))) continue;
          const hx = px + corners[next][0], hy = py + corners[next][1], bend = r * 0.57;
          g.moveTo(hx, hy); g.lineTo(hx + nx * bend, hy + ny * bend);
          g.quadraticCurveTo(hx, hy, hx + mx * bend, hy + my * bend); g.closePath();
        }
      }
    }
    // 부드러운 값 노이즈 (4칸 격자, 결정적) — 풀밭 얼룩용
    const nz = (x, y, k, s = 4) => {
      const gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy;
      const v = (a, b) => (u.hash32(seed, a, b, k) & 1023) / 1023, sm = (q) => q * q * (3 - 2 * q);
      const a = v(gx, gy), b = v(gx + 1, gy), c = v(gx, gy + 1), d = v(gx + 1, gy + 1), ux = sm(fx), uy = sm(fy);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
    const soft = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    const rgbA = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`; };
    // 1) 바다
    g.fillStyle = C.sea; g.fillRect(...bounds);
    // 깊은 바다 줄무늬
    g.fillStyle = C.seaD;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (!isSea(t(x, y))) continue;
      let near = false; for (let k = 1; k <= 3 && !near; k++) if (!isSea(t(x, y - k)) || !isSea(t(x - k, y)) || !isSea(t(x + k, y))) near = true;
      if (!near) g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
    material('water', 0.64, 'soft-light');
    // 2) 민물
    union(isWater, C.waterD, 0, 12);
    union(isWater, C.water, 3, 12);
    paintRegion(isWater, 'water', 0.55, 'soft-light', 3, 12);
    // 3) 땅: 아래로 둑(3/4 뷰 입술)
    union(isLand, C.wet, 6);
    union(isLand, C.sand, 0);
    paintRegion((v) => v === TT.SAND, 'dirt', 0.57, 'soft-light');
    // 4) 풀
    union(isGrassy, pal.grassD, 4);
    union(isGrassy, pal.grass, 0);
    // 고지대(살짝 다른 톤)
    union((v) => v === TT.HIGH, pal.high, 0, 8);
    // 계절색 위에 워시와 마른 붓결을 얹는다. 패턴 기준점은 월드 원점이다.
    g.save(); region(isGrassy, 0, 11); g.clip();
    const paintedGrass = material('grass', pal.snow ? 0.27 : 0.75, 'soft-light');
    const cL = rgbA(pal.grassL), cD = rgbA(pal.grassD);
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (!isGrassy(t(x, y))) continue;
      const px = x * TILE + 16, py = y * TILE + 16, n = nz(x, y, 31);
      if (n > 0.54) soft(px, py, 36, cL, (n - 0.54) * 0.72);
      if (n < 0.44) soft(px, py, 36, cD, (0.44 - n) * 0.54);
      if (paintedGrass) continue;
      const h = u.hash32(seed, x, y, 41);
      g.lineCap = 'round'; g.lineWidth = 1.2;
      for (let k = 0; k < 6; k++) {
        const hh = u.hash32(h, k), bx = x * TILE + (hh & 31), by = y * TILE + ((hh >> 5) & 31), ln = 2.5 + ((hh >> 10) & 3);
        g.strokeStyle = (k & 1 ? cD : cL).replace('A', 0.55); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + ((hh >> 12) & 3) - 1.5, by - ln); g.stroke();
      }
    }
    g.restore();
    // 5) 길·광장
    union(isPath, C.path, 0, 13);
    g.save(); region(isPath, 0, 13); g.clip();
    material('dirt', 0.69, 'soft-light');
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (!isPath(t(x, y))) continue;
      const n = nz(x, y, 43, 3); if (n > 0.5) soft(x * TILE + 16, y * TILE + 16, 26, 'rgba(255,240,210,A)', (n - 0.5) * 0.8); else soft(x * TILE + 16, y * TILE + 16, 26, 'rgba(170,135,95,A)', (0.5 - n) * 0.5);
      // 풀 가장자리 그늘 (위쪽이 풀이면 길에 살짝 그늘)
      if (isGrassy(t(x, y - 1)) && !isPath(t(x, y - 1)) && !isPlaza(t(x, y - 1))) {
        soft(x * TILE + 16, y * TILE - 7, 19, 'rgba(105,88,55,A)', 0.26);
      }
    }
    g.restore();
    union(isPlaza, C.plaza, 0, 14);
    paintRegion(isPlaza, 'stone', 0.68, 'source-over', 0, 14);
    // 6) 절벽 면
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (t(x, y) !== TT.CLIFF) continue;
      const px = x * TILE, py = y * TILE;
      const isFall = W.map.fall && W.map.fall.x === x && W.map.fall.y === y;
      if (W.isStair && W.isStair(x, y)) {
        // 고지대 계단: 열리면 나무 계단, 닫혀 있으면 계단 앞에 밧줄
        g.fillStyle = C.cliffD; g.fillRect(px, py, TILE, TILE + 4);
        for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? C.woodL : C.wood; g.fillRect(px + 3, py + k * 8 - 2, TILE - 6, 7); g.fillStyle = 'rgba(90,60,40,0.4)'; g.fillRect(px + 3, py + k * 8 + 4, TILE - 6, 1.5); }
        g.fillStyle = C.woodD; g.fillRect(px + 1, py - 4, 3, TILE + 6); g.fillRect(px + TILE - 4, py - 4, 3, TILE + 6);
        if (!W.highOpen()) { g.strokeStyle = '#c84a3a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px, py + TILE + 2); g.quadraticCurveTo(px + 16, py + TILE + 8, px + TILE, py + TILE + 2); g.stroke(); P.rrect(g, px + 7, py + TILE - 2, 18, 9, 2, '#fff4dc', C.line, 1); }
        continue;
      }
      g.fillStyle = C.cliff; g.fillRect(px, py + 6, TILE, TILE - 2);
      if (!scenery?.material(g, 'cliff', [px, py + 6, TILE, TILE - 2], 0.94)) {
        g.fillStyle = C.cliffD; g.fillRect(px, py + 18, TILE, 3); g.fillRect(px, py + 26, TILE, 4);
        g.fillStyle = C.cliffL; g.fillRect(px, py + 10, TILE, 2);
      }
      // 윗 입술(고지대 풀)
      g.fillStyle = pal.high; g.beginPath(); g.roundRect(px - 1, py - 4, TILE + 2, 11, 5); g.fill();
      // 아래 그림자
      g.fillStyle = 'rgba(70,50,40,0.18)'; g.fillRect(px, py + TILE, TILE, 6);
      if (isFall) { g.fillStyle = '#dff6ff'; g.fillRect(px + 4, py + 2, TILE - 8, TILE); }
    }
    // 7) 다리·징검다리
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const v = t(x, y), px = x * TILE, py = y * TILE;
      if (v === TT.BRIDGE) {
        g.fillStyle = 'rgba(40,80,110,0.25)'; g.fillRect(px, py + 6, TILE, TILE);
        g.fillStyle = C.woodD; g.fillRect(px, py + 2, TILE, TILE);
        if (!scenery?.material(g, 'wood', [px, py, TILE, TILE], 0.96)) {
          for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? C.wood : C.woodL; g.fillRect(px + k * 8 + 0.5, py, 7, TILE); }
        }
        if (t(x, y - 1) !== TT.BRIDGE) { g.fillStyle = 'rgba(95,61,42,0.45)'; g.fillRect(px, py, TILE, 2); }
        if (t(x, y + 1) !== TT.BRIDGE) { g.fillStyle = 'rgba(66,48,34,0.44)'; g.fillRect(px, py + TILE - 3, TILE, 4); }
      } else if (v === TT.STONE) {
        const h = u.hash32(seed, x, y, 9);
        P.blob(g, px + 16 + (h & 3) - 1.5, py + 19, 12, 8, '#8c9aa6');
        P.blob(g, px + 16 + (h & 3) - 1.5, py + 16, 12, 8, '#c9d3da');
        P.blob(g, px + 12 + (h & 3), py + 13, 4, 2, '#e8eef2');
      }
    }
    // 8) 디테일: 풀포기·모래 자갈·물 반짝 (결정적)
    for (let y = ty0 + 1; y < ty1; y++) for (let x = tx0 + 1; x < tx1; x++) {
      const v = t(x, y), h = u.hash32(seed, x, y, 11), px = x * TILE, py = y * TILE;
      if ((v === TT.GRASS || v === TT.HIGH) && (h & 15) < 2) {
        const ox = 6 + (h >> 3 & 15), oy = 8 + (h >> 7 & 15);
        g.strokeStyle = rgbA(pal.tuft).replace('A', '0.54'); g.lineWidth = 1.35; g.lineCap = 'round'; g.beginPath();
        g.moveTo(px + ox - 2, py + oy); g.quadraticCurveTo(px + ox - 3, py + oy - 3, px + ox - 5, py + oy - 4);
        g.moveTo(px + ox, py + oy); g.quadraticCurveTo(px + ox + 1, py + oy - 6, px + ox + 2, py + oy - 8);
        g.moveTo(px + ox + 2, py + oy); g.quadraticCurveTo(px + ox + 4, py + oy - 4, px + ox + 6, py + oy - 5);
        g.stroke();
        if (pal.snow && (h & 1)) P.blob(g, px + ox, py + oy - 6, 3, 1.6, '#fff');
      }
      if (v === TT.GRASS && ((h >> 11) & 31) === 3) {
        const col = ['#fff7a8', '#ffd1e3', '#ffffff', '#d7e3ff'][(h >> 16) & 3];
        const ox = 8 + (h >> 18 & 15), oy = 8 + (h >> 22 & 15);
        for (let k = 0; k < 5; k++) P.blob(g, px + ox + Math.cos(k * 1.256) * 2.2, py + oy + Math.sin(k * 1.256) * 2.2, 1.8, 1.8, col);
        P.blob(g, px + ox, py + oy, 1.4, 1.4, '#ffcf4a');
      }
      if (v === TT.SAND && (h & 15) < 3) P.blob(g, px + 6 + (h >> 4 & 15), py + 8 + (h >> 8 & 15), 2, 1.4, '#d9c39a');
      if (v === TT.PATH && (h & 15) < 4) P.blob(g, px + 6 + (h >> 4 & 15), py + 8 + (h >> 8 & 15), 1.8, 1.2, '#c9ad83');
    }
    return c;
  }

  // ---------- 물 애니 (매 프레임, 보이는 타일만) ----------
  A.drawWater = (ctx, rect, t) => {
    const W = G.world;
    const tx0 = Math.floor(rect.x / TILE) - 1, ty0 = Math.floor(rect.y / TILE) - 1;
    const tx1 = Math.ceil((rect.x + rect.w) / TILE) + 1, ty1 = Math.ceil((rect.y + rect.h) / TILE) + 1;
    const seed = W.map.seed;
    ctx.lineCap = 'round';
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const v = W.tile(x, y);
      if (v !== TT.SEA && v !== TT.WATER) continue;
      const h = u.hash32(seed, x, y, 21);
      const px = x * TILE, py = y * TILE;
      // 반짝이
      const ph = (t * 0.6 + (h & 255) / 255) % 1;
      if ((h & 3) === 0) {
        const a = Math.sin(ph * Math.PI);
        ctx.globalAlpha = a * 0.8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
        const ox = 6 + (h >> 8 & 15), oy = 8 + (h >> 12 & 15);
        ctx.beginPath(); ctx.moveTo(px + ox - 3, py + oy); ctx.lineTo(px + ox + 3, py + oy); ctx.stroke();
      }
      // 물가 거품: 위쪽 이웃이 땅이면 거품 띠
      const up = W.tile(x, y - 1);
      if (up !== TT.SEA && up !== TT.WATER && up !== TT.BRIDGE && up !== TT.STONE && up !== TT.CLIFF) {
        const k = Math.sin(t * 1.6 + x * 0.9) * 2.2;
        ctx.globalAlpha = 0.75; ctx.strokeStyle = C.foam; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(px + 2, py + 6 + k); ctx.quadraticCurveTo(px + 16, py + 9 + k, px + 30, py + 6 + k); ctx.stroke();
        if (v === TT.SEA) {
          const k2 = Math.sin(t * 1.6 + x * 0.9 + 1.4) * 3;
          ctx.globalAlpha = 0.4; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(px + 4, py + 15 + k2); ctx.quadraticCurveTo(px + 16, py + 18 + k2, px + 28, py + 15 + k2); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    // 폭포 물보라
    const f = W.map.fall;
    if (f && f.x >= tx0 && f.x <= tx1 && f.y >= ty0 && f.y <= ty1) {
      const px = f.x * TILE, py = f.y * TILE;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 0; k < 6; k++) {
        const ph = (t * 1.5 + k / 6) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.ellipse(px + 6 + k * 4, py + TILE + 4 + ph * 6, 3 + ph * 3, 2 + ph * 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6;
      for (let k = 0; k < 3; k++) { const yy = ((t * 60 + k * 11) % 30); ctx.fillRect(px + 8 + k * 6, py + yy, 2, 6); }
      ctx.globalAlpha = 1;
    }
  };

  // ---------- 자연물 ----------
  function drawTree(g, kind, season, var_) {
    if (G.scenery?.tree(g, kind, season)) return;
    // 기준점: 스프라이트 (0,0) 좌상단, 발밑 = (32, 74)
    const pal = PAL[season];
    P.shadow(g, 32, 74, 40, 0.25);
    // 줄기
    P.rrect(g, 27, 46, 10, 28, 4, '#a7724a', C.line, 1.5);
    g.fillStyle = '#8b5c3a'; g.fillRect(31, 52, 2, 18); g.fillStyle = 'rgba(255,230,200,0.35)'; g.fillRect(28.5, 50, 2, 20);
    if (kind === 'pine') {
      const cols = season === 'winter' ? ['#5f9a78', '#4b7f62', '#77b48e'] : ['#5aa86a', '#43875a', '#79c486'];
      for (let k = 0; k < 3; k++) {
        const y = 14 + k * 13, w = 18 + k * 7;
        g.beginPath(); g.moveTo(32, y - 12); g.quadraticCurveTo(32 + w * 0.4, y, 32 + w, y + 12); g.quadraticCurveTo(32, y + 17, 32 - w, y + 12); g.quadraticCurveTo(32 - w * 0.4, y, 32, y - 12);
        g.fillStyle = cols[k === 2 ? 1 : 0]; g.fill(); g.lineWidth = 1.5; g.strokeStyle = C.line; g.stroke();
        g.fillStyle = cols[2]; g.beginPath(); g.ellipse(32 - w * 0.3, y + 4, w * 0.25, 3, -0.3, 0, Math.PI * 2); g.fill();
        if (season === 'winter') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(32, y - 4, w * 0.45, 4, 0, 0, Math.PI * 2); g.fill(); }
      }
      return;
    }
    if (season === 'winter' && kind !== 'fruit') {
      // 앙상한 가지 + 눈
      g.strokeStyle = '#8b5c3a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
      g.moveTo(32, 48); g.lineTo(20, 28); g.moveTo(32, 46); g.lineTo(44, 24); g.moveTo(32, 48); g.lineTo(32, 18); g.moveTo(24, 34); g.lineTo(14, 30); g.moveTo(40, 32); g.lineTo(50, 30); g.stroke();
      P.blob(g, 32, 22, 16, 12, 'rgba(255,255,255,0.0)');
      for (const [x, y] of [[20, 26], [44, 22], [32, 16], [14, 29], [50, 29]]) P.blob(g, x, y, 5, 2.6, '#ffffff', '#c9d6e6', 1);
      return;
    }
    const leaf = kind === 'fruit' ? ['#7cc35a', '#5aa548', '#a2db7c'] : pal.leaf;
    // 그래픽 개선: 몽글몽글한 잎 덩어리 여러 개 + 안쪽 그늘·햇빛 + 잎 결
    const cl = [[32, 22, 17, 14], [19, 30, 13, 11], [45, 30, 13, 11], [24, 40, 13, 9], [40, 40, 13, 9], [32, 32, 18, 12], [22, 18, 9, 8], [42, 17, 10, 8]];
    g.lineWidth = 1.4; g.strokeStyle = C.line;
    g.beginPath(); for (const [x, y, rx, ry] of cl) { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
    g.stroke(); g.fillStyle = leaf[1]; g.fill();
    g.save(); g.clip();
    g.fillStyle = leaf[0];
    g.beginPath(); for (const [x, y, rx, ry] of cl) { g.moveTo(x + rx * 0.82, y - ry * 0.18); g.ellipse(x - rx * 0.06, y - ry * 0.18, rx * 0.82, ry * 0.74, 0, 0, Math.PI * 2); } g.fill();
    g.fillStyle = leaf[2];
    g.beginPath(); for (const [x, y, rx, ry] of cl.slice(0, 3).concat(cl.slice(6))) { g.moveTo(x - rx * 0.1 + rx * 0.42, y - ry * 0.45); g.ellipse(x - rx * 0.1, y - ry * 0.45, rx * 0.42, ry * 0.3, -0.3, 0, Math.PI * 2); } g.fill();
    // 잎 결: 작은 반달 무늬
    g.strokeStyle = 'rgba(40,70,30,0.22)'; g.lineWidth = 1;
    for (let k = 0; k < 14; k++) { const x = 14 + (k * 29) % 38, y = 14 + (k * 17) % 30; g.beginPath(); g.arc(x, y, 2.4, 0.2, Math.PI - 0.2); g.stroke(); }
    g.restore();
    P.shade(g, 0, 4, 64, 50, { hi: 0.16, lo: 0.2 });
    if (kind === 'fruit') for (const [x, y] of [[22, 30], [38, 22], [44, 36], [30, 38]]) { P.blob(g, x, y, 3.6, 3.6, '#c97b3a', C.line, 1.2); P.blob(g, x, y - 3, 3.6, 1.6, '#7a5230'); }
    if (pal.blossom) for (let k = 0; k < 9; k++) P.blob(g, 14 + (k * 37) % 36, 14 + (k * 23) % 28, 2.4, 2.4, pal.blossom);
    if (season === 'winter') for (const [x, y] of [[26, 12], [40, 14], [18, 24]]) P.blob(g, x, y, 7, 3, '#ffffff');
  }
  A.tree = (kind, season) => A.sprite('tree2:' + kind + ':' + season, 64, 80, (g) => drawTree(g, kind, season));

  A.bigOak = (season) => A.sprite('oak:' + season, 112, 128, (g) => {
    if (G.scenery?.tree(g, 'oak', season)) return;
    const pal = PAL[season];
    P.shadow(g, 56, 118, 92, 0.28);
    // 굵은 줄기와 뿌리
    g.fillStyle = '#9b6a44'; g.strokeStyle = C.line; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(40, 118); g.quadraticCurveTo(46, 96, 44, 70); g.lineTo(68, 70); g.quadraticCurveTo(66, 96, 74, 118); g.quadraticCurveTo(56, 112, 40, 118); g.fill(); g.stroke();
    g.fillStyle = '#7e5434'; g.fillRect(52, 80, 3, 30); g.fillRect(60, 86, 2, 20);
    // 옹이 구멍 (비밀 장소 힌트)
    P.blob(g, 57, 92, 5, 6, '#4a2f1f');
    const leaf = season === 'winter' ? ['#8bb79a', '#6e9e80', '#a9d0b6'] : pal.leaf;
    g.lineWidth = 1.8; g.strokeStyle = C.line;
    const cl = [[56, 40, 46, 32], [24, 58, 22, 16], [88, 58, 22, 16], [56, 66, 30, 14]];
    g.beginPath(); for (const [x, y, rx, ry] of cl) { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); } g.stroke();
    g.fillStyle = leaf[1]; g.fill();
    g.fillStyle = leaf[0]; g.beginPath(); g.ellipse(56, 37, 42, 27, 0, 0, Math.PI * 2); g.ellipse(26, 53, 18, 12, 0, 0, Math.PI * 2); g.ellipse(86, 53, 18, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = leaf[2]; g.beginPath(); g.ellipse(42, 22, 16, 8, -0.3, 0, Math.PI * 2); g.ellipse(80, 34, 8, 5, 0.3, 0, Math.PI * 2); g.fill();
    if (season === 'winter') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(56, 16, 30, 8, 0, 0, Math.PI * 2); g.ellipse(22, 44, 12, 4, 0, 0, Math.PI * 2); g.ellipse(90, 44, 12, 4, 0, 0, Math.PI * 2); g.fill(); }
    if (pal.blossom) for (let k = 0; k < 18; k++) P.blob(g, 18 + (k * 41) % 78, 16 + (k * 29) % 50, 3, 3, pal.blossom);
    P.shade(g, 0, 4, 112, 80, { hi: 0.16, lo: 0.2 });
  });

  const FLOWER_COL = [['#ff8fb1', '#ffd1e0'], ['#ffd24d', '#fff1a8'], ['#ffffff', '#e7ecff'], ['#9db7ff', '#d6e2ff']];
  A.flower = (v, season) => A.sprite('flower:' + v + ':' + season, 32, 32, (g) => {
    if (G.scenery?.flower(g, v, season)) return;
    const [c1, c2] = FLOWER_COL[v % 4];
    const pos = [[10, 20], [21, 16], [17, 26], [26, 25]];
    for (const [x, y] of pos) {
      g.strokeStyle = '#5f9e3f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x, y + 6); g.stroke();
      if (season === 'winter') { P.blob(g, x, y + 1, 3, 2, '#ffffff', '#cbd8ea', 1); continue; }
      for (let k = 0; k < 5; k++) P.blob(g, x + Math.cos(k * 1.256) * 2.6, y + Math.sin(k * 1.256) * 2.6, 2.4, 2.4, c1);
      P.blob(g, x, y, 1.8, 1.8, '#ffcf4a');
      P.blob(g, x - 1, y - 2, 1, 1, c2);
    }
  });
  A.rock = () => A.sprite('rock', 32, 32, (g) => {
    if (G.scenery?.rock(g)) return;
    P.shadow(g, 16, 27, 28);
    P.blob(g, 16, 20, 13, 9, '#a7b0ba', C.line);
    P.blob(g, 14, 17, 9, 5, '#c5cdd6');
    P.blob(g, 11, 15, 3, 1.6, '#e3e8ee');
    P.shade(g, 0, 8, 32, 22, { hi: 0.2, lo: 0.25 });
  });
  A.soil = (wet) => A.sprite('soil:' + wet, 32, 32, (g) => {
    P.rrect(g, 2, 3, 28, 27, [7, 5, 6, 7], wet ? '#846047' : '#ae825d');
    g.save(); g.clip();
    G.scenery?.material(g, 'soil', [2, 3, 28, 27], wet ? 0.59 : 0.86, wet ? 'soft-light' : 'source-over');
    g.restore();
    g.strokeStyle = wet ? 'rgba(59,35,23,0.48)' : 'rgba(87,52,34,0.38)';
    g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
    for (const y of [10, 17, 24]) { g.moveTo(6, y); g.quadraticCurveTo(14, y - 1.9, 26, y + 0.7); }
    g.stroke();
  });

  // ---------- 건물 ----------
  A.building = (kind, season, night) => A.sprite('b2:' + kind + ':' + season + ':' + (night ? 1 : 0), 160, 140, (g) => { drawBuilding(g, kind, season, night); P.shade(g, 0, 0, 160, 132, { hi: 0.2, lo: 0.16 }); });
  // 밤에 불 켜지는 창 (그림판 좌표 x, y, w, h, r) — 그레이딩 뒤에 다시 밝게 그린다
  A.WINDOWS = {
    post: [[34, 94, 24, 20, 6], [102, 94, 24, 20, 6]], house: [[40, 98, 22, 20, 10], [100, 98, 22, 20, 10]],
    cabin: [[26, 72, 18, 16, 4], [84, 72, 18, 16, 4]], smallhouse: [[24, 68, 22, 18, 9], [82, 68, 22, 18, 9]],
    bighouse: [[38, 26, 18, 16, 8], [72, 26, 18, 16, 8], [22, 68, 24, 20, 6], [82, 68, 24, 20, 6]],
    dreamhouse: [[90, 40, 14, 16, 7], [90, 64, 14, 16, 7], [16, 66, 20, 20, 10], [68, 70, 12, 14, 6]],
    tent: [[52, 82, 24, 22, 8]], museum: [[66, 100, 28, 36, 14]],
  };
  function roofSnow(g, x, y, w) { if (A.season !== 'winter') return; P.rrect(g, x, y, w, 7, 4, '#ffffff', '#cbd8ea', 1); }
  function drawBuilding(g, kind, season, night) {
    if (G.scenery?.building(g, kind, season, night)) return;
    // 기준: 스프라이트 좌상단 = 부지 좌상단에서 (-16, -44)u. 즉 부지 (0,0) → (16,44)
    const ox = 16, oy = 44;
    const win = night ? '#ffe28a' : '#bfe6f5';
    if (kind === 'stall_back') { // 땅굴상점 뒤: 흙둔덕 + 굴 입구
      P.shadow(g, ox + 64, oy + 94, 120, 0.25);
      P.blob(g, ox + 64, oy + 30, 62, 36, '#b98d62', C.line);
      P.blob(g, ox + 60, oy + 22, 44, 20, '#cfa57a');
      if (season === 'winter') P.blob(g, ox + 64, oy + 4, 46, 10, '#ffffff');
      P.blob(g, ox + 100, oy + 50, 14, 16, '#4e3424', C.line);
      return;
    }
    if (kind === 'stall') { // 땅굴상점 앞: 카운터·차양·간판 (4×3)
      P.rrect(g, ox + 8, oy + 52, 112, 38, 6, C.wood, C.line);
      g.fillStyle = C.woodL; g.fillRect(ox + 12, oy + 56, 104, 5);
      g.fillStyle = C.woodD; for (let k = 0; k < 6; k++) g.fillRect(ox + 18 + k * 18, oy + 64, 2, 22);
      g.fillStyle = C.woodD; g.fillRect(ox + 8, oy + 30, 4, 24); g.fillRect(ox + 116, oy + 30, 4, 24);
      for (let k = 0; k < 8; k++) {
        g.fillStyle = k % 2 ? '#ffffff' : '#7fd3b8';
        g.beginPath(); g.moveTo(ox + 4 + k * 15, oy + 12); g.lineTo(ox + 19 + k * 15, oy + 12); g.lineTo(ox + 19 + k * 15, oy + 24); g.quadraticCurveTo(ox + 11.5 + k * 15, oy + 30, ox + 4 + k * 15, oy + 24); g.fill();
      }
      g.lineWidth = 1.5; g.strokeStyle = C.line; g.strokeRect(ox + 4, oy + 12, 120, 12);
      if (season === 'winter') P.rrect(g, ox + 6, oy + 8, 116, 6, 3, '#ffffff');
      P.rrect(g, ox + 34, oy - 8, 60, 18, 6, '#fff4dc', C.line);
      g.fillStyle = '#7a4f2e'; g.font = G.fontPx(11); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('땅굴상점', ox + 64, oy + 1.5);
      P.blob(g, ox + 28, oy + 50, 6, 5, '#ff9a8a', C.line, 1); P.blob(g, ox + 44, oy + 50, 5, 5, '#ffd66b', C.line, 1); P.rrect(g, ox + 80, oy + 44, 14, 10, 3, '#a7d8ff', C.line, 1);
      return;
    }
    if (kind === 'post') { // 우체국 (4×3)
      P.shadow(g, ox + 64, oy + 94, 124, 0.25);
      P.rrect(g, ox + 8, oy + 30, 112, 62, 8, '#fff3e2', C.line);
      g.fillStyle = '#f0dcc0'; g.fillRect(ox + 10, oy + 80, 108, 10);
      // 지붕
      g.fillStyle = '#ff8a7a'; g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ox - 2, oy + 36); g.quadraticCurveTo(ox + 64, oy - 30, ox + 130, oy + 36); g.quadraticCurveTo(ox + 64, oy + 24, ox - 2, oy + 36); g.fill(); g.stroke();
      g.fillStyle = '#ffb0a3'; g.beginPath(); g.ellipse(ox + 46, oy + 10, 24, 6, -0.25, 0, Math.PI * 2); g.fill();
      roofSnow(g, ox + 30, oy - 4, 68);
      // 문·창
      P.rrect(g, ox + 52, oy + 54, 24, 38, 10, '#c98e5a', C.line);
      P.blob(g, ox + 70, oy + 74, 2, 2, '#ffe28a');
      P.rrect(g, ox + 18, oy + 50, 24, 20, 6, win, C.line); P.rrect(g, ox + 86, oy + 50, 24, 20, 6, win, C.line);
      // 편지 간판
      P.rrect(g, ox + 50, oy + 26, 28, 18, 3, '#ffffff', C.line);
      g.strokeStyle = '#ff8a7a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox + 50, oy + 26); g.lineTo(ox + 64, oy + 37); g.lineTo(ox + 78, oy + 26); g.stroke();
      P.blob(g, ox + 64, oy + 38, 3, 3, '#ff6b6b');
      return;
    }
    if (kind === 'cabin') { // 오두막 (부지 3×2, 위로 솟음)
      P.shadow(g, ox + 48, oy + 62, 108, 0.25);
      for (let k = 0; k < 5; k++) { P.rrect(g, ox + 2, oy + 12 + k * 10, 92, 10, 5, k % 2 ? '#c98e5a' : '#b67a48', C.line, 1.2); }
      g.fillStyle = '#7a5a4a'; g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ox - 6, oy + 16); g.lineTo(ox + 48, oy - 26); g.lineTo(ox + 102, oy + 16); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#9a7a62'; g.beginPath(); g.moveTo(ox + 8, oy + 10); g.lineTo(ox + 48, oy - 18); g.lineTo(ox + 60, oy - 10); g.lineTo(ox + 22, oy + 14); g.fill();
      roofSnow(g, ox + 20, oy - 14, 56);
      P.rrect(g, ox + 38, oy + 30, 20, 32, [9, 9, 1, 1], '#8a5a3a', C.line); P.blob(g, ox + 54, oy + 47, 1.6, 1.6, '#ffe28a');
      P.rrect(g, ox + 10, oy + 28, 18, 16, 4, win, C.line); P.rrect(g, ox + 68, oy + 28, 18, 16, 4, win, C.line);
      P.rrect(g, ox + 70, oy - 18, 9, 18, 2, '#9aa5b0', C.line, 1.2);
      return;
    }
    if (kind === 'smallhouse') { // 작은 집
      P.shadow(g, ox + 48, oy + 62, 116, 0.25);
      P.rrect(g, ox, oy + 6, 96, 56, 8, '#fff6e6', C.line);
      g.fillStyle = '#f0dcc0'; g.fillRect(ox + 2, oy + 52, 92, 8);
      g.fillStyle = '#8fc6e8'; g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(ox - 8, oy - 24, 112, 36, [26, 26, 6, 6]); g.fill(); g.stroke();
      g.fillStyle = '#b8dcf2'; g.beginPath(); g.ellipse(ox + 30, oy - 12, 24, 6, -0.1, 0, Math.PI * 2); g.fill();
      roofSnow(g, ox + 8, oy - 28, 80);
      P.rrect(g, ox + 38, oy + 26, 20, 36, [10, 10, 1, 1], '#7fbfa8', C.line); P.blob(g, ox + 54, oy + 45, 1.6, 1.6, '#fff');
      P.rrect(g, ox + 8, oy + 24, 22, 18, 9, win, C.line); P.rrect(g, ox + 66, oy + 24, 22, 18, 9, win, C.line);
      for (const [x, c] of [[6, '#ff9fbf'], [84, '#ffd24d']]) { P.blob(g, ox + x, oy + 60, 6, 4, '#7cc35a'); P.blob(g, ox + x, oy + 57, 2.5, 2.5, c); }
      return;
    }
    if (kind === 'bighouse') { // 큰 집: 2층 + 굴뚝 + 발코니
      P.shadow(g, ox + 48, oy + 62, 124, 0.25);
      P.rrect(g, ox - 4, oy + 4, 104, 58, 8, '#fff0d8', C.line);
      P.rrect(g, ox + 10, oy - 26, 76, 34, 6, '#fff6e6', C.line);
      g.fillStyle = '#e8907a'; g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ox + 2, oy - 22); g.lineTo(ox + 48, oy - 42); g.lineTo(ox + 94, oy - 22); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(ox - 12, oy + 8); g.lineTo(ox + 10, oy - 4); g.lineTo(ox + 86, oy - 4); g.lineTo(ox + 108, oy + 8); g.closePath(); g.fill(); g.stroke();
      P.rrect(g, ox + 72, oy - 44, 10, 18, 2, '#b8a090', C.line, 1.2);
      roofSnow(g, ox + 26, oy - 38, 44);
      P.rrect(g, ox + 22, oy - 18, 18, 16, 8, win, C.line); P.rrect(g, ox + 56, oy - 18, 18, 16, 8, win, C.line);
      g.strokeStyle = C.line; g.lineWidth = 1.2; g.beginPath(); for (let x = ox + 18; x <= ox + 78; x += 6) { g.moveTo(x, oy + 2); g.lineTo(x, oy - 4); } g.stroke();
      P.rrect(g, ox + 38, oy + 26, 20, 36, [10, 10, 1, 1], '#c97a5a', C.line); P.blob(g, ox + 54, oy + 45, 1.6, 1.6, '#ffe28a');
      P.rrect(g, ox + 6, oy + 24, 24, 20, 6, win, C.line); P.rrect(g, ox + 66, oy + 24, 24, 20, 6, win, C.line);
      for (const [x, c] of [[0, '#ff9fbf'], [96, '#c9b3ff'], [30, '#ffd24d']]) { P.blob(g, ox + x, oy + 60, 6, 4, '#7cc35a'); P.blob(g, ox + x, oy + 57, 2.5, 2.5, c); }
      return;
    }
    if (kind === 'dreamhouse') { // 꿈의 집: 둥근 탑 + 깃발
      P.shadow(g, ox + 48, oy + 62, 132, 0.25);
      P.rrect(g, ox - 6, oy + 2, 108, 60, 10, '#f3ecff', C.line);
      P.rrect(g, ox + 66, oy - 14, 30, 76, 12, '#fff6fb', C.line);
      g.fillStyle = '#b8a0f0'; g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ox + 60, oy - 10); g.lineTo(ox + 81, oy - 34); g.lineTo(ox + 102, oy - 10); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.roundRect(ox - 14, oy - 18, 86, 26, [22, 22, 6, 6]); g.fill(); g.stroke();
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(ox + 81, oy - 34); g.lineTo(ox + 81, oy - 43); g.stroke();
      g.fillStyle = '#ff8fb1'; g.beginPath(); g.moveTo(ox + 81, oy - 43); g.lineTo(ox + 95, oy - 39); g.lineTo(ox + 81, oy - 35); g.closePath(); g.fill(); g.stroke();
      roofSnow(g, ox - 4, oy - 22, 64);
      P.rrect(g, ox + 74, oy - 4, 14, 16, 7, win, C.line); P.rrect(g, ox + 74, oy + 20, 14, 16, 7, win, C.line);
      P.rrect(g, ox + 26, oy + 24, 22, 38, [11, 11, 1, 1], '#a88ad8', C.line); P.blob(g, ox + 44, oy + 44, 1.6, 1.6, '#ffe28a');
      P.rrect(g, ox + 0, oy + 22, 20, 20, 10, win, C.line); P.rrect(g, ox + 52, oy + 26, 12, 14, 6, win, C.line);
      for (let k = 0; k < 6; k++) P.blob(g, ox - 6 + k * 20, oy + 60, 5, 3.5, '#7cc35a');
      for (const [x, c] of [[4, '#ff9fbf'], [44, '#ffd24d'], [84, '#8fd3ff']]) P.blob(g, ox + x, oy + 57, 2.5, 2.5, c);
      return;
    }
    if (kind === 'tent') { // 텐트 (3×2)
      P.shadow(g, ox + 48, oy + 62, 100, 0.25);
      g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(ox + 48, oy - 6); g.quadraticCurveTo(ox + 70, oy + 30, ox + 94, oy + 60); g.lineTo(ox + 2, oy + 60); g.quadraticCurveTo(ox + 26, oy + 30, ox + 48, oy - 6);
      g.fillStyle = '#ffd08a'; g.fill(); g.stroke();
      g.save(); g.clip();
      for (let k = 0; k < 6; k++) { g.fillStyle = '#ffb05a'; g.fillRect(ox + k * 18, oy - 10, 8, 80); }
      g.restore();
      g.beginPath(); g.moveTo(ox + 48, oy - 6); g.quadraticCurveTo(ox + 70, oy + 30, ox + 94, oy + 60); g.lineTo(ox + 2, oy + 60); g.quadraticCurveTo(ox + 26, oy + 30, ox + 48, oy - 6); g.stroke();
      // 입구
      g.fillStyle = night ? '#ffe7a0' : '#6b4a3a';
      g.beginPath(); g.moveTo(ox + 48, oy + 20); g.quadraticCurveTo(ox + 58, oy + 42, ox + 62, oy + 60); g.lineTo(ox + 34, oy + 60); g.quadraticCurveTo(ox + 38, oy + 42, ox + 48, oy + 20); g.fill(); g.stroke();
      P.blob(g, ox + 48, oy - 8, 4, 4, '#ff7a7a', C.line, 1.2);
      if (A.season === 'winter') P.blob(g, ox + 48, oy + 2, 8, 4, '#ffffff');
      return;
    }
    if (kind === 'museum' || kind === 'museum_closed') { // 조약돌 박물관 (4×3): 둥근 천막 + 조약돌 간판
      P.shadow(g, ox + 64, oy + 94, 124, 0.25);
      P.rrect(g, ox + 10, oy + 36, 108, 56, 8, '#f4f1ea', C.line);
      for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#e3efe9' : '#f4f1ea'; g.fillRect(ox + 12 + k * 17.5, oy + 38, 17.5, 52); }
      g.lineWidth = 1.5; g.strokeStyle = C.line; g.strokeRect(ox + 10, oy + 36, 108, 56);
      g.fillStyle = '#7fbfa8'; g.beginPath(); g.moveTo(ox - 2, oy + 40); g.quadraticCurveTo(ox + 64, oy - 34, ox + 130, oy + 40); g.closePath(); g.fill(); g.stroke();
      for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#a8dcc8' : '#7fbfa8'; g.beginPath(); g.moveTo(ox + 64, oy - 14); g.lineTo(ox + 2 + k * 18, oy + 40); g.lineTo(ox + 20 + k * 18, oy + 40); g.closePath(); g.fill(); }
      g.beginPath(); g.moveTo(ox - 2, oy + 40); g.quadraticCurveTo(ox + 64, oy - 34, ox + 130, oy + 40); g.closePath(); g.stroke();
      roofSnow(g, ox + 34, oy - 4, 60);
      P.blob(g, ox + 64, oy - 16, 4, 4, '#ffd24d', C.line, 1.2);
      // 입구 + 조약돌 간판
      P.rrect(g, ox + 50, oy + 56, 28, 36, [14, 14, 2, 2], night ? '#ffe7a0' : '#5d6f68', C.line);
      for (const [x, y, r, c] of [[34, 48, 9, '#c9d3da'], [48, 44, 7, '#e8d2b8'], [80, 44, 7, '#d6c6e8'], [94, 48, 9, '#cfe3d3']]) P.blob(g, ox + x, oy + y, r, r * 0.75, c, C.line, 1.2);
      P.rrect(g, ox + 30, oy + 26, 68, 16, 7, '#fff8ea', C.line);
      g.fillStyle = '#5d6f68'; g.font = G.fontPx(10); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('조약돌 박물관', ox + 64, oy + 34.5);
      if (kind === 'museum_closed') {
        g.strokeStyle = '#ff8a7a'; g.lineWidth = 4; g.beginPath(); g.moveTo(ox + 44, oy + 60); g.lineTo(ox + 84, oy + 86); g.moveTo(ox + 84, oy + 60); g.lineTo(ox + 44, oy + 86); g.stroke();
        P.rrect(g, ox + 34, oy + 70, 60, 14, 6, '#ffffff', C.line, 1.2);
        g.fillStyle = '#ff6b6b'; g.font = G.fontPx(9); g.fillText('내일 개관!', ox + 64, oy + 77.5);
      }
      return;
    }
    if (kind === 'house') { // 주민 집 (4×3)
      P.shadow(g, ox + 64, oy + 94, 120, 0.25);
      P.rrect(g, ox + 14, oy + 34, 100, 58, 10, '#fff8ef', C.line);
      g.fillStyle = '#f2e3d0'; g.fillRect(ox + 16, oy + 82, 96, 9);
      g.fillStyle = '#ffb3cf'; g.strokeStyle = C.line; g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(ox + 2, oy + 6, 124, 38, [30, 30, 8, 8]); g.fill(); g.stroke();
      g.fillStyle = '#ffd1e2'; g.beginPath(); g.ellipse(ox + 40, oy + 18, 26, 6, -0.1, 0, Math.PI * 2); g.fill();
      roofSnow(g, ox + 20, oy + 2, 88);
      // 굴뚝
      P.rrect(g, ox + 96, oy - 8, 12, 18, 3, '#d98aa8', C.line);
      P.rrect(g, ox + 54, oy + 56, 22, 36, 10, '#ff9fbf', C.line);
      P.blob(g, ox + 71, oy + 75, 2, 2, '#fff');
      P.rrect(g, ox + 24, oy + 54, 22, 20, 10, win, C.line); P.rrect(g, ox + 84, oy + 54, 22, 20, 10, win, C.line);
      // 문패 방울
      P.blob(g, ox + 65, oy + 50, 4, 4, '#ffd24d', C.line, 1);
      return;
    }
  }
  // 소품
  A.prop = (kind, season, night) => A.sprite('p3:' + kind + ':' + season + ':' + (night ? 1 : 0), 96, 80, (g) => {
    if (G.scenery?.prop(g, kind, season)) return;
    const ox = 16, oy = 48; // 부지 (0,0) → (16,48)
    if (kind === 'lamp') {
      P.shadow(g, ox + 16, oy + 28, 18);
      P.rrect(g, ox + 13, oy - 20, 6, 48, 3, '#6b5a6e', C.line, 1.2);
      P.rrect(g, ox + 7, oy - 36, 18, 18, 6, night ? '#ffe9a6' : '#fff6dc', C.line, 1.5);
      P.rrect(g, ox + 5, oy - 40, 22, 6, 3, '#6b5a6e', C.line, 1.2);
      if (season === 'winter') P.blob(g, ox + 16, oy - 41, 9, 3, '#ffffff');
    } else if (kind === 'bench') {
      P.shadow(g, ox + 32, oy + 28, 56);
      P.rrect(g, ox + 4, oy + 4, 56, 8, 3, C.woodL, C.line, 1.2);
      P.rrect(g, ox + 2, oy + 12, 60, 8, 3, C.wood, C.line, 1.2);
      g.fillStyle = C.woodD; g.fillRect(ox + 8, oy + 20, 4, 8); g.fillRect(ox + 52, oy + 20, 4, 8);
      if (season === 'winter') P.blob(g, ox + 32, oy + 12, 24, 3, '#ffffff');
    } else if (kind === 'mailbox' || kind === 'mailbox_full') {
      P.shadow(g, ox + 16, oy + 28, 20);
      g.fillStyle = C.woodD; g.fillRect(ox + 14, oy + 6, 4, 22);
      P.rrect(g, ox + 4, oy - 12, 24, 18, [10, 10, 3, 3], '#ff8a7a', C.line, 1.5);
      if (kind === 'mailbox_full') { g.fillStyle = '#ff6b6b'; g.fillRect(ox + 26, oy - 24, 2, 14); g.fillRect(ox + 26, oy - 24, 8, 5); P.rrect(g, ox + 8, oy - 15, 14, 8, 1, '#ffffff', C.line, 1); }
      else { g.fillStyle = '#ffe28a'; g.fillRect(ox + 26, oy - 14, 2, 10); g.fillRect(ox + 26, oy - 14, 6, 4); }
    } else if (kind === 'board') {
      P.shadow(g, ox + 32, oy + 28, 52);
      g.fillStyle = C.woodD; g.fillRect(ox + 8, oy, 4, 28); g.fillRect(ox + 52, oy, 4, 28);
      P.rrect(g, ox + 2, oy - 22, 60, 30, 4, C.wood, C.line, 1.5);
      P.rrect(g, ox + 8, oy - 17, 16, 14, 2, '#fffaf0'); P.rrect(g, ox + 28, oy - 18, 14, 18, 2, '#ffe9f1'); P.rrect(g, ox + 46, oy - 16, 12, 12, 2, '#eaf6ff');
      if (season === 'winter') P.blob(g, ox + 32, oy - 22, 26, 3, '#ffffff');
    } else if (kind === 'lantern' || kind === 'lantern_lit') {
      // 등불 기둥: 돌 받침 + 둥근 갓. 켜지면 노란 불
      P.shadow(g, ox + 16, oy + 28, 22);
      P.rrect(g, ox + 8, oy + 18, 16, 10, 4, '#c9d3da', C.line, 1.3);
      P.rrect(g, ox + 12, oy - 18, 8, 38, 3, '#8a7a9a', C.line, 1.3);
      P.blob(g, ox + 16, oy - 26, 11, 10, kind === 'lantern_lit' ? '#ffe28a' : '#e9e2f0', C.line, 1.5);
      if (kind === 'lantern_lit') { P.blob(g, ox + 13, oy - 29, 4, 3, '#fff7cf'); }
      else { g.strokeStyle = 'rgba(91,70,54,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ox + 10, oy - 26); g.lineTo(ox + 22, oy - 26); g.stroke(); }
      P.rrect(g, ox + 8, oy - 38, 16, 6, 3, '#8a7a9a', C.line, 1.3);
      if (season === 'winter') P.blob(g, ox + 16, oy - 39, 9, 3, '#ffffff');
    } else if (kind === 'signboard') {
      P.shadow(g, ox + 16, oy + 28, 22);
      g.fillStyle = C.woodD; g.fillRect(ox + 14, oy + 2, 4, 26);
      P.rrect(g, ox, oy - 14, 32, 18, 4, C.woodL, C.line, 1.5);
      g.fillStyle = C.line; g.fillRect(ox + 6, oy - 8, 20, 2); g.fillRect(ox + 6, oy - 3, 14, 2);
    }
    P.shade(g, 0, 0, 96, 78, { hi: 0.18, lo: 0.16 });
  });

  // ---------- 시간대 그레이딩 (곱하기 1패스) ----------
  // 키프레임: [시, 색, 강도]
  const GRADE = [
    [0, [70, 82, 150], 0.62], [4, [70, 82, 150], 0.6], [5, [130, 120, 190], 0.42], [6, [255, 180, 150], 0.22],
    [7, [255, 230, 210], 0.06], [9, [255, 255, 255], 0], [15, [255, 255, 255], 0], [16.5, [255, 225, 180], 0.1],
    [17.5, [255, 170, 130], 0.24], [18.5, [190, 130, 170], 0.36], [19.5, [110, 100, 170], 0.5], [21, [75, 85, 155], 0.58], [24, [70, 82, 150], 0.62],
  ];
  A.gradeAt = (hour) => {
    for (let i = 0; i < GRADE.length - 1; i++) {
      const [h0, c0, a0] = GRADE[i], [h1, c1, a1] = GRADE[i + 1];
      if (hour >= h0 && hour <= h1) {
        const k = (hour - h0) / (h1 - h0 || 1);
        return { c: c0.map((v, j) => Math.round(u.lerp(v, c1[j], k))), a: u.lerp(a0, a1, k) };
      }
    }
    return { c: [255, 255, 255], a: 0 };
  };
  A.grade = (ctx, w, h, hour, cloudy) => {
    const g = A.gradeAt(hour);
    let a = g.a; let c = g.c;
    if (cloudy) { a = Math.min(0.75, a + cloudy * 0.18); c = c.map((v) => Math.round(v * (1 - cloudy * 0.12))); }
    if (a <= 0.01) return 0;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // 곱하기 색 = 흰색과 목표색 사이를 a로 보간
    const m = c.map((v) => Math.round(255 - (255 - v) * a * 1.4));
    ctx.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return a;
  };
  // 화면 가장자리 음영 (그래픽 개선) — 크기별로 한 장 구워 둔다
  let vig = null;
  A.vignette = (ctx, w, h, a) => {
    if (!vig || vig.width !== w || vig.height !== h) {
      vig = mkCanvas(w, h); const g = vig.getContext('2d');
      const r = Math.hypot(w, h) / 2, gr = g.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
      gr.addColorStop(0, 'rgba(40,30,70,0)'); gr.addColorStop(1, 'rgba(40,30,70,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    ctx.save(); ctx.globalAlpha = a; ctx.drawImage(vig, 0, 0); ctx.restore();
  };
  // 빛 스프라이트 (lighter)
  A.light = (r, color) => A.sprite('light:' + r + ':' + color, r * 2, r * 2, (g) => {
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  });

  // ---------- 날씨 파티클 ----------
  const parts = [];
  // 날씨 그리기: 비·눈 + 꾸밈(fx: 무지개·안개·잎·꽃잎·천둥·함박눈) — 8차 회의
  const fxParts = []; let flash = 0, nextFlash = 4;
  A.weather = {
    update(dt, type, rect, wind, fx, int) {
      const heavy = fx === 'storm' || fx === 'blizzard';
      const want = type === 'rain' ? (heavy ? 230 : 140) : type === 'snow' ? (heavy ? 200 : 90) : 0;
      while (parts.length < want) parts.push({ x: rect.x + Math.random() * rect.w, y: rect.y + Math.random() * rect.h, s: Math.random() });
      if (parts.length > want) parts.length = want;
      for (const p of parts) {
        if (type === 'rain') { p.y += (520 + p.s * 120) * (heavy ? 1.25 : 1) * dt; p.x += (-40 - wind * 120) * dt; }
        else { p.y += (40 + p.s * 30) * (heavy ? 1.8 : 1) * dt; p.x += (Math.sin(p.y * 0.03 + p.s * 6) * 20 - wind * (heavy ? 90 : 20)) * dt; }
        if (p.y > rect.y + rect.h + 20) { p.y = rect.y - 20; p.x = rect.x + Math.random() * rect.w; }
        if (p.x < rect.x - 30) p.x += rect.w + 60; if (p.x > rect.x + rect.w + 30) p.x -= rect.w + 60;
      }
      // 잎·꽃잎: 바람에 비스듬히 날린다
      const fwant = fx === 'leaves' || fx === 'petals' ? 26 : 0;
      while (fxParts.length < fwant) fxParts.push({ x: rect.x + Math.random() * rect.w, y: rect.y + Math.random() * rect.h, s: Math.random(), a: Math.random() * 6 });
      if (fxParts.length > fwant) fxParts.length = fwant;
      for (const p of fxParts) {
        p.x += (60 + p.s * 50) * dt; p.y += (25 + Math.sin(p.a) * 25) * dt; p.a += dt * (2 + p.s * 2);
        if (p.x > rect.x + rect.w + 20) { p.x = rect.x - 20; p.y = rect.y + Math.random() * rect.h; }
        if (p.y > rect.y + rect.h + 20) p.y = rect.y - 10;
      }
      // 번개: 6~12초마다 번쩍
      if (fx === 'storm') { nextFlash -= dt; if (nextFlash <= 0) { flash = 0.35; nextFlash = 6 + Math.random() * 6; if (G.audio && G.audio.sfx) G.audio.sfx('bump'); } }
      flash = Math.max(0, flash - dt);
    },
    draw(ctx, type, fx, rect, t) {
      if (fx === 'rainbow' && rect) {
        const cx = rect.x + rect.w * 0.72, cy = rect.y + rect.h * 1.05, R = Math.max(rect.w, rect.h) * 0.75;
        ctx.save(); ctx.globalAlpha = 0.22; ctx.lineWidth = R * 0.035;
        ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#9775fa'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, R - i * R * 0.035, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); });
        ctx.restore();
      }
      if (type === 'rain') {
        ctx.strokeStyle = 'rgba(220,235,255,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
        for (const p of parts) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + 12); }
        ctx.stroke();
      } else if (type === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath();
        for (const p of parts) { ctx.moveTo(p.x + 2.2, p.y); ctx.arc(p.x, p.y, 1.4 + p.s * 1.6, 0, Math.PI * 2); }
        ctx.fill();
      }
      if (fx === 'leaves' || fx === 'petals') {
        for (const p of fxParts) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
          ctx.fillStyle = fx === 'leaves' ? ['#f08a3c', '#e8b44a', '#d0502a'][Math.floor(p.s * 3)] : ['#ffc2d6', '#ffd8e4', '#ffb3c8'][Math.floor(p.s * 3)];
          ctx.beginPath(); ctx.ellipse(0, 0, fx === 'leaves' ? 4 : 3, fx === 'leaves' ? 2.2 : 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      }
      if (fx === 'fog' && rect) {
        ctx.save();
        const rx = rect.w * 0.52, ry = rect.h * 0.15;
        for (let i = 0; i < 5; i++) {
          const x = rect.x + ((i * 0.28 + (t || 0) * 0.007) % 1.4 - 0.2) * rect.w;
          const y = rect.y + rect.h * (0.13 + i * 0.19);
          ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
          const mist = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
          mist.addColorStop(0, 'rgba(255,251,236,0.25)');
          mist.addColorStop(1, 'rgba(255,251,236,0)');
          ctx.fillStyle = mist; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
        }
        ctx.fillStyle = 'rgba(243,246,245,0.11)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); ctx.restore();
      }
      if (fx === 'storm' && rect) { ctx.fillStyle = 'rgba(40,45,70,0.22)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
      if (fx === 'blizzard' && rect) { ctx.fillStyle = 'rgba(235,242,250,0.22)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
      if (flash > 0 && rect) { ctx.fillStyle = `rgba(255,255,240,${flash * 1.6})`; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
    },
  };

  G.modules.add('art');
})(globalThis.G);
