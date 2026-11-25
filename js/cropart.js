// 작물 그림 (오너: "식물도 디테일하게, 예쁘게 — 옥수수·고구마·감자·호박") — 작물마다 자라는 단계별로 그린다
// 단계: 0 씨앗 둔덕 · 1 떡잎 · 2 자라는 중(작게, 열매 없음) · 3 다 자람(열매·꽃). 한 번 그린 그림은 캐시
// 기준점: 그림판 (22, 54) = 밭 칸 바닥 가운데
(function (G) {
  'use strict';
  const A = G.art, F = G.farm, D = G.data, TILE = G.C.TILE;
  if (!A || !F) return;
  const L = { c: '#6cbf4e', d: '#3f8a3a', l: '#9ad66e', o: '#2f5a2a' };
  const INK = '#4a3428';

  // ---------- 그리기 도구 ----------
  // 잎: (x,y)에서 각도 a로 길이 len, 폭 w. 가운데 잎맥 + 한쪽 밝은 면
  function leaf(g, x, y, len, w, a, col = L) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w, -len * 0.45, 0, -len); g.quadraticCurveTo(-w, -len * 0.45, 0, 0);
    g.fillStyle = col.c; g.fill(); g.lineWidth = 1; g.strokeStyle = col.o; g.stroke();
    g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(-w * 0.8, -len * 0.45, 0, -len + 1); g.quadraticCurveTo(-w * 0.2, -len * 0.5, 0, -1); g.fillStyle = col.l; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -len * 0.85); g.strokeStyle = col.d; g.lineWidth = 0.8; g.stroke();
    g.restore();
  }
  // 둥근 잎(하트·넓은 잎)
  function roundLeaf(g, x, y, r, a, col = L, heart) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath();
    if (heart) { g.moveTo(0, 0); g.bezierCurveTo(r * 1.2, -r * 0.4, r * 0.7, -r * 1.6, 0, -r * 1.1); g.bezierCurveTo(-r * 0.7, -r * 1.6, -r * 1.2, -r * 0.4, 0, 0); }
    else g.ellipse(0, -r, r * 0.85, r, 0, 0, Math.PI * 2);
    g.fillStyle = col.c; g.fill(); g.strokeStyle = col.o; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.ellipse(-r * 0.25, -r * 1.15, r * 0.35, r * 0.25, -0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill();
    g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -r * 1.6 + (heart ? 0.5 : 0)); g.strokeStyle = col.d; g.lineWidth = 0.7; g.stroke();
    g.restore();
  }
  const blob = (g, x, y, rx, ry, fill, line = INK, lw = 1.1) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (line) { g.strokeStyle = line; g.lineWidth = lw; g.stroke(); } };
  const shine = (g, x, y, rx, ry) => blob(g, x, y, rx, ry, 'rgba(255,255,255,0.6)', null);
  const stem = (g, pts, w = 1.6, c = L.d) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  const soilPeek = (g, w) => { g.beginPath(); g.ellipse(0, 1, w, 2.2, 0, 0, Math.PI); g.fillStyle = '#8a5f3f'; g.fill(); };
  const flower = (g, x, y, r, petal, mid = '#ffd24d') => { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; blob(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, r * 0.8, petal, 'rgba(120,90,80,0.5)', 0.6); } blob(g, x, y, r * 0.6, r * 0.6, mid, null); };
  const stake = (g, h) => { g.fillStyle = '#c9a66b'; g.strokeStyle = '#7a5a3a'; g.lineWidth = 0.9; g.beginPath(); g.roundRect(6, -h, 2.6, h + 1, 1); g.fill(); g.stroke(); g.strokeStyle = 'rgba(122,90,58,0.6)'; g.beginPath(); g.moveTo(6, -h * 0.55); g.lineTo(8.6, -h * 0.55); g.moveTo(6, -h * 0.25); g.lineTo(8.6, -h * 0.25); g.stroke(); };

  // ---------- 다 자란(ripe) / 자라는 중 그림 ----------
  const ART = {
    // 뿌리채소: 잎 다발 + 다 자라면 흙 위로 어깨가 보인다
    radish: (g, r) => { for (const [a, l] of [[-0.7, 15], [-0.25, 18], [0.25, 18], [0.7, 15]]) leaf(g, 0, -3, l * (r ? 1 : 0.7), 5, a); if (r) { blob(g, 0, -2, 6.5, 6, '#ffffff'); blob(g, 0, -6, 6.5, 2.4, '#bfe39a', null); shine(g, -2.5, -3, 1.6, 2.4); soilPeek(g, 7); } },
    carrot: (g, r) => { for (const a of [-0.6, -0.3, 0, 0.3, 0.6]) { g.save(); g.rotate(a); stem(g, [[0, -2], [0, -(r ? 18 : 12)]], 1.2, L.d); for (let k = 0; k < 4; k++) { blob(g, -2.4, -6 - k * 3.3 * (r ? 1 : 0.7), 2.3, 1.2, L.c, null); blob(g, 2.4, -7 - k * 3.3 * (r ? 1 : 0.7), 2.3, 1.2, L.l, null); } g.restore(); } if (r) { g.beginPath(); g.moveTo(-5, -3); g.quadraticCurveTo(0, 2, 5, -3); g.closePath(); g.fillStyle = '#ff9a3a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); soilPeek(g, 6); } },
    onion: (g, r) => { for (const a of [-0.35, -0.12, 0.12, 0.35]) { g.save(); g.rotate(a); g.fillStyle = '#7cc35a'; g.strokeStyle = L.o; g.lineWidth = 0.9; g.beginPath(); g.roundRect(-1.4, -(r ? 22 : 14), 2.8, r ? 20 : 12, 1.4); g.fill(); g.stroke(); g.restore(); } if (r) { blob(g, 0, -3, 6.5, 5.2, '#e8b86a'); g.strokeStyle = 'rgba(150,100,40,0.45)'; g.lineWidth = 0.8; g.beginPath(); for (const k of [-3, 0, 3]) { g.moveTo(k, -8); g.quadraticCurveTo(k * 1.5, -3, k, 1); } g.stroke(); shine(g, -2.5, -5, 1.5, 1.2); soilPeek(g, 7); } },
    garlic: (g, r) => { for (const a of [-0.5, -0.2, 0.2, 0.5]) leaf(g, 0, -3, r ? 20 : 13, 2.4, a, { c: '#8fcf6a', d: '#4e8a3a', l: '#b8e38f', o: '#2f5a2a' }); if (r) { blob(g, 0, -3, 6, 5, '#f6efe4'); g.strokeStyle = 'rgba(180,150,140,0.6)'; g.lineWidth = 0.8; g.beginPath(); for (const k of [-2.5, 0, 2.5]) { g.moveTo(k, -7.5); g.lineTo(k * 1.2, 1); } g.stroke(); blob(g, 0, -8.5, 1.4, 1.2, '#e9d9c8', null); soilPeek(g, 6.5); } },
    // 잎채소
    spinach: (g, r) => { const n = r ? 7 : 5; for (let k = 0; k < n; k++) { const a = -1 + k * (2 / (n - 1)); roundLeaf(g, 0, -1, r ? 6.5 : 4.5, a, { c: '#4e9e4a', d: '#2f6a2a', l: '#7cc35a', o: '#24481f' }); } },
    lettuce: (g, r) => { const n = r ? 8 : 5; for (let k = 0; k < n; k++) { const a = -1.2 + k * (2.4 / (n - 1)); roundLeaf(g, 0, 0, r ? 7 : 4.5, a, { c: '#9ad66e', d: '#5aa548', l: '#c8ef9a', o: '#3f7a3a' }); } if (r) { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; blob(g, Math.cos(a) * 7, -8 + Math.sin(a) * 4, 2.2, 1.6, '#c8ef9a', null); } blob(g, 0, -8, 5, 4, '#b8e68a', '#5aa548', 0.9); } },
    cabbage: (g, r) => { for (const a of [-1.3, -0.6, 0.6, 1.3]) roundLeaf(g, 0, 0, r ? 8 : 5.5, a, { c: '#7cc35a', d: '#4e8a3a', l: '#a8dc7c', o: '#2f5a2a' }); if (r) { blob(g, 0, -7, 8.5, 7.5, '#dff2b8', '#5aa548', 1.1); g.strokeStyle = 'rgba(120,170,80,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.arc(0, -4, 6, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(-6, -8); g.quadraticCurveTo(0, -15, 6, -8); g.stroke(); shine(g, -3, -10, 2, 1.4); } },
    broccoli: (g, r) => { for (const a of [-1.1, -0.5, 0.5, 1.1]) roundLeaf(g, 0, 0, r ? 7.5 : 5, a, { c: '#5a9e6a', d: '#2f6a3a', l: '#8fc89a', o: '#24482a' }); if (r) { stem(g, [[0, -2], [0, -8]], 3, '#8fc06a'); for (const [x, y, rr] of [[-4, -11, 4], [4, -11, 4], [0, -14, 4.5], [-6, -8, 3], [6, -8, 3]]) blob(g, x, y, rr, rr * 0.9, '#3f8a3a', '#24481f', 0.9); for (const [x, y] of [[-3, -13], [2, -16], [5, -12]]) blob(g, x, y, 1.2, 1, '#6cbf4e', null); } },
    green_onion: (g, r) => { for (const a of [-0.25, -0.08, 0.08, 0.25]) { g.save(); g.rotate(a); g.fillStyle = '#4e9e4a'; g.strokeStyle = L.o; g.lineWidth = 0.9; g.beginPath(); g.roundRect(-1.6, -(r ? 30 : 18), 3.2, r ? 22 : 12, 1.6); g.fill(); g.stroke(); g.fillStyle = '#f4f8ec'; g.beginPath(); g.roundRect(-1.6, -(r ? 9 : 7), 3.2, r ? 9 : 7, 1.2); g.fill(); g.stroke(); g.restore(); } },
    // 덤불: 감자(겹잎 + 흰 꽃 + 흙 위로 감자), 땅콩(작은 잎 + 노란 꽃)
    potato: (g, r) => {
      stem(g, [[0, 0], [-2, -10]], 1.6); stem(g, [[0, 0], [3, -12]], 1.6);
      const s = r ? 1 : 0.7;
      for (const [x, y, a] of [[-7, -6, -1.2], [7, -7, 1.2], [-6, -12, -0.7], [6, -14, 0.7], [-1, -16, -0.1], [2, -9, 0.3], [-3, -9, -0.4]]) roundLeaf(g, x * s, y * s, 4.2 * s, a, { c: '#5aa548', d: '#3f7a3a', l: '#8fcf6a', o: '#2f5a2a' });
      if (r) { flower(g, -3, -19, 1.7, '#ffffff'); flower(g, 4, -17, 1.6, '#f4e6ff'); for (const [x, y] of [[-6, 0], [5, 0.5]]) { blob(g, x, y, 4.2, 3, '#d9b07a'); blob(g, x - 1, y - 0.5, 0.6, 0.5, '#a87a48', null); shine(g, x - 1.5, y - 1, 1.2, 0.8); } }
    },
    peanut: (g, r) => { const s = r ? 1 : 0.7; for (const [x, y, a] of [[-6, -4, -1.3], [6, -4, 1.3], [-4, -9, -0.6], [4, -10, 0.6], [0, -12, 0]]) for (const d of [-0.35, 0.35]) roundLeaf(g, x * s, y * s, 3 * s, a + d, { c: '#6cbf4e', d: '#3f8a3a', l: '#9ad66e', o: '#2f5a2a' }); if (r) { flower(g, -2, -14, 1.4, '#ffd23a', '#ff9a3a'); flower(g, 5, -8, 1.3, '#ffd23a', '#ff9a3a'); for (const x of [-5, 4]) { blob(g, x, 0, 3.6, 2.2, '#d9a868'); g.strokeStyle = 'rgba(150,100,50,0.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, -2); g.lineTo(x, 2); g.stroke(); } } },
    // 덩굴: 고구마(하트 잎이 양옆으로 뻗고 보랏빛 고구마), 호박·수박(큰 잎 + 덩굴손 + 큰 열매)
    sweet_potato: (g, r) => {
      const s = r ? 1 : 0.65;
      g.strokeStyle = '#9a6a8a'; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -1); g.bezierCurveTo(-8 * s, -6, -14 * s, 0, -19 * s, -3); g.moveTo(0, -1); g.bezierCurveTo(8 * s, -7, 14 * s, -1, 19 * s, -4); g.moveTo(0, -1); g.quadraticCurveTo(2, -10 * s, -1, -16 * s); g.stroke();
      for (const [x, y, a] of [[-18, -3, -1.6], [-11, -5, -0.9], [-4, -6, -0.4], [18, -4, 1.6], [11, -6, 0.9], [4, -7, 0.4], [-1, -15, 0], [3, -11, 0.5], [-5, -11, -0.6]]) roundLeaf(g, x * s, y * (r ? 1 : 0.8), 5.6 * s, a, { c: '#6cbf4e', d: '#8a5a7a', l: '#a8dc7c', o: '#2f5a2a' }, true);
      if (r) { g.save(); g.rotate(-0.25); blob(g, -2, 0.5, 8.5, 4.4, '#c0588a'); shine(g, -6, -1.5, 2.4, 1); g.restore(); blob(g, 8, 1.5, 5.5, 3.2, '#a8487a'); soilPeek(g, 11); }
    },
    pumpkin: (g, r) => {
      const s = r ? 1 : 0.7;
      g.strokeStyle = L.d; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-18 * s, -2); g.quadraticCurveTo(-6, -8 * s, 0, -4); g.quadraticCurveTo(8, 0, 18 * s, -5); g.stroke();
      g.lineWidth = 0.9; g.beginPath(); g.arc(14 * s, -9 * s, 2.5, 0.5, 5.2); g.stroke(); // 덩굴손
      for (const [x, y, rr, a] of [[-14, -4, 6, -1], [-6, -10, 7, -0.3], [8, -10, 6.5, 0.4], [16, -6, 5, 1.1]]) { g.save(); g.translate(x * s, y * s); for (const d of [-0.5, 0, 0.5]) roundLeaf(g, 0, 3, rr * s * 0.75, a + d, { c: '#4e9e4a', d: '#2f6a2a', l: '#7cc35a', o: '#24481f' }); g.restore(); }
      if (r) {
        g.save(); g.translate(1, -5);
        for (const [x, w] of [[-6, 5.5], [6, 5.5], [-2.5, 5], [2.5, 5]]) blob(g, x, 0, w, 7, '#ff9a3a', '#8a4a1a', 1);
        blob(g, 0, 0, 4, 7.2, '#ffaa4a', '#8a4a1a', 1); shine(g, -6, -3, 1.6, 2.6);
        g.fillStyle = '#6a8a3a'; g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.roundRect(-1.3, -10.5, 2.6, 4.5, 1); g.fill(); g.stroke();
        g.restore();
      }
    },
    watermelon: (g, r) => {
      const s = r ? 1 : 0.7;
      g.strokeStyle = L.d; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-18 * s, -2); g.quadraticCurveTo(0, -9 * s, 18 * s, -3); g.stroke();
      for (const [x, y, a] of [[-14, -4, -1.1], [-5, -9, -0.3], [7, -9, 0.4], [15, -5, 1.1]]) for (const d of [-0.45, 0, 0.45]) leaf(g, x * s, y * s + 3, 8 * s, 3, a + d, { c: '#5aa548', d: '#2f6a2a', l: '#8fcf6a', o: '#24481f' });
      if (r) { blob(g, 1, -6, 11, 7.5, '#3f9a4a', '#1f5a2a', 1.2); g.strokeStyle = '#1f6a2a'; g.lineWidth = 1.6; g.beginPath(); for (const k of [-6, -1, 4, 9]) { g.moveTo(k - 2, -12.5); g.quadraticCurveTo(k + 1, -6, k - 2, 0.5); } g.stroke(); shine(g, -5, -10, 2.6, 1.4); }
    },
    // 지지대 작물: 토마토·고추·가지·오이·완두콩
    tomato: (g, r) => { stake(g, r ? 26 : 16); stem(g, [[0, 0], [1, -10], [0, -20 * (r ? 1 : 0.65)]], 1.6); for (const [x, y, a] of [[-5, -6, -1.1], [5, -9, 1], [-5, -14, -0.9], [5, -17, 0.9], [-2, -21, -0.3]]) if (r || y > -15) leaf(g, x, y + 2, 8, 3.4, a); if (r) { for (const [x, y] of [[-4, -9], [-1, -13], [3, -5], [-3, -18]]) { blob(g, x, y, 3.3, 3, '#ff5a4a', '#8a2a1a', 0.9); shine(g, x - 1, y - 1, 1, 0.7); blob(g, x, y - 2.8, 1.4, 0.7, '#5aa548', null); } } },
    pepper: (g, r) => { stake(g, r ? 22 : 14); stem(g, [[0, 0], [0, -16 * (r ? 1 : 0.65)]], 1.5); for (const [x, y, a] of [[-5, -5, -1.1], [5, -8, 1.1], [-4, -12, -0.7], [4, -15, 0.6]]) if (r || y > -12) leaf(g, x, y + 2, 7, 2.6, a); if (r) for (const [x, y, a] of [[-4, -8, 0.3], [3, -11, -0.2], [-1, -4, 0.1]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-1.6, 0); g.quadraticCurveTo(-1.2, 8, 0.6, 9); g.quadraticCurveTo(1.8, 6, 1.6, 0); g.closePath(); g.fillStyle = '#e8402c'; g.fill(); g.strokeStyle = '#7a1a1a'; g.lineWidth = 0.8; g.stroke(); blob(g, 0, -0.5, 1.6, 0.9, '#5aa548', null); g.restore(); } },
    eggplant: (g, r) => { stake(g, r ? 24 : 15); stem(g, [[0, 0], [0, -18 * (r ? 1 : 0.65)]], 1.6, '#5a4a6a'); for (const [x, y, a] of [[-6, -5, -1.1], [6, -8, 1.1], [-5, -13, -0.7], [5, -16, 0.7]]) if (r || y > -12) roundLeaf(g, x, y + 3, 4.5, a, { c: '#5aa548', d: '#5a4a6a', l: '#8fcf6a', o: '#2f5a2a' }); if (r) for (const [x, y] of [[-4, -10], [3, -7]]) { g.beginPath(); g.ellipse(x, y + 5, 3, 5.5, 0.15, 0, Math.PI * 2); g.fillStyle = '#6a3a8a'; g.fill(); g.strokeStyle = '#2a1a3a'; g.lineWidth = 0.9; g.stroke(); shine(g, x - 1.2, y + 3, 0.8, 1.8); blob(g, x, y, 2.6, 1.4, '#4e8a3a', null); } },
    cucumber: (g, r) => { g.strokeStyle = '#c9a66b'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-8, -(r ? 26 : 16)); g.moveTo(8, 0); g.lineTo(8, -(r ? 26 : 16)); for (let y = -6; y > -(r ? 26 : 16); y -= 6) { g.moveTo(-8, y); g.lineTo(8, y); } g.stroke(); g.strokeStyle = L.d; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-6, -8, 6, -14, -2, -(r ? 24 : 15)); g.stroke(); for (const [x, y, a] of [[-5, -7, -0.9], [5, -12, 0.9], [-4, -18, -0.6], [3, -23, 0.4]]) if (r || y > -16) roundLeaf(g, x, y + 3, 4, a, L, true); if (r) { flower(g, 5, -20, 1.3, '#ffd23a', '#ffb02a'); for (const [x, y] of [[-3, -12], [3, -6]]) { g.beginPath(); g.roundRect(x - 1.8, y, 3.6, 10, 1.8); g.fillStyle = '#4e9e4a'; g.fill(); g.strokeStyle = '#24481f'; g.lineWidth = 0.9; g.stroke(); for (let k = 2; k < 10; k += 2.5) blob(g, x + (k % 5 ? 1 : -1), y + k, 0.4, 0.4, '#c8ef9a', null); } } },
    pea: (g, r) => { stake(g, r ? 24 : 15); g.strokeStyle = '#7cc35a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-5, -7, 5, -14, 0, -(r ? 22 : 14)); g.stroke(); g.beginPath(); g.arc(6, -18, 2, 0.4, 5); g.stroke(); for (const [x, y, a] of [[-4, -5, -1], [4, -9, 1], [-4, -14, -0.8], [3, -19, 0.6]]) if (r || y > -12) roundLeaf(g, x, y + 2, 3.2, a, L); if (r) { flower(g, -4, -19, 1.3, '#ffffff', '#f4c6dc'); for (const [x, y, a] of [[-5, -10, 0.5], [4, -13, -0.5], [-2, -5, 0.2]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 3.5, 1.8, 4.5, 0, 0, Math.PI * 2); g.fillStyle = '#7cc35a'; g.fill(); g.strokeStyle = '#2f5a2a'; g.lineWidth = 0.8; g.stroke(); for (const k of [0.5, 3.5, 6.5]) blob(g, 0, k, 1, 1, '#a8dc7c', null); g.restore(); } } },
    // 키 큰 작물: 옥수수(줄기 + 휘어진 긴 잎 + 수염 달린 옥수수 + 꼭대기 수꽃)
    corn: (g, r) => {
      const h = r ? 40 : 24;
      g.fillStyle = '#7cb84e'; g.strokeStyle = L.o; g.lineWidth = 0.9; g.beginPath(); g.roundRect(-1.6, -h, 3.2, h, 1.6); g.fill(); g.stroke();
      for (let k = 0; k < (r ? 3 : 2); k++) { g.strokeStyle = 'rgba(47,90,42,0.5)'; g.beginPath(); g.moveTo(-1.6, -8 - k * 11); g.lineTo(1.6, -8 - k * 11); g.stroke(); }
      for (const [y, side, len] of [[-6, -1, 16], [-12, 1, 18], [-19, -1, 17], [-26, 1, 15], [-32, -1, 12]]) {
        if (!r && y < -20) continue;
        g.save(); g.translate(0, y); g.scale(side, 1);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.6, -9, len, 2); g.quadraticCurveTo(len * 0.55, -5, 0, 2.6); g.closePath();
        g.fillStyle = '#6cbf4e'; g.fill(); g.strokeStyle = L.o; g.lineWidth = 0.9; g.stroke();
        g.strokeStyle = 'rgba(200,240,170,0.7)'; g.beginPath(); g.moveTo(1, 0.5); g.quadraticCurveTo(len * 0.55, -6.5, len - 1, 1.5); g.stroke();
        g.restore();
      }
      if (r) {
        for (const [x, y, a] of [[3, -21, 0.35], [-3, -15, -0.35]]) {
          g.save(); g.translate(x, y); g.rotate(a);
          blob(g, 0, 0, 3.2, 7, '#ffd24d', '#8a6a1a', 0.9);
          g.fillStyle = 'rgba(200,150,30,0.55)'; for (let yy = -5; yy <= 5; yy += 2.2) for (const xx of [-1.4, 0.6]) { g.beginPath(); g.arc(xx + (yy % 4 ? 0.5 : 0), yy, 0.55, 0, 6.3); g.fill(); }
          g.beginPath(); g.moveTo(0, 7); g.quadraticCurveTo(-5, 0, -2.5, -6); g.quadraticCurveTo(-1, 2, 0, 7); g.moveTo(0, 7); g.quadraticCurveTo(5, 0, 2.5, -6); g.quadraticCurveTo(1, 2, 0, 7); g.fillStyle = '#8fcf6a'; g.fill(); g.strokeStyle = L.o; g.lineWidth = 0.8; g.stroke();
          g.strokeStyle = '#c98a4a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -7); g.quadraticCurveTo(-2, -10, -1, -12); g.moveTo(0, -7); g.quadraticCurveTo(2, -10, 1.5, -12); g.stroke();
          g.restore();
        }
        g.strokeStyle = '#d9b45a'; g.lineWidth = 1.1; g.beginPath(); for (const a of [-0.6, -0.2, 0.2, 0.6]) { g.moveTo(0, -h); g.lineTo(Math.sin(a) * 6, -h - 6 + Math.abs(a) * 3); } g.stroke();
      }
    },
    wheat: (g, r) => { const n = r ? 7 : 5; for (let k = 0; k < n; k++) { const x = -7 + k * (14 / (n - 1)), h = (r ? 26 : 16) - Math.abs(x) * 0.5, lean = x * 0.04; g.save(); g.rotate(lean); stem(g, [[x, 0], [x, -h]], 1.1, r ? '#c9b45a' : '#7cc35a'); if (r) { for (let j = 0; j < 4; j++) { blob(g, x - 1.2, -h + 1 + j * 2.4, 1.3, 1.9, '#e8c45a', '#a8843a', 0.6); blob(g, x + 1.2, -h + 2 + j * 2.4, 1.3, 1.9, '#f0d070', '#a8843a', 0.6); } g.strokeStyle = '#c9a44a'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, -h); g.lineTo(x - 1, -h - 5); g.moveTo(x, -h); g.lineTo(x + 1.5, -h - 5); g.stroke(); } else leaf(g, x, -h * 0.5, 7, 1.6, x * 0.15); g.restore(); } },
    // 딸기: 세 갈래 잎 + 빨간 딸기(씨앗 점) + 흰 꽃
    strawberry: (g, r) => { for (const [x, y, a] of [[-6, -4, -1], [6, -4, 1], [0, -8, 0], [-3, -10, -0.4], [4, -10, 0.5]]) for (const d of [-0.5, 0, 0.5]) roundLeaf(g, x * (r ? 1 : 0.7), y * (r ? 1 : 0.7), 3.2 * (r ? 1 : 0.7), a + d, { c: '#4e9e4a', d: '#2f6a2a', l: '#7cc35a', o: '#24481f' }); if (r) { flower(g, 5, -14, 1.5, '#ffffff'); for (const [x, y] of [[-6, -1], [3, 0], [-1, -2]]) { g.beginPath(); g.moveTo(x - 3, y - 3); g.quadraticCurveTo(x, y + 6, x + 3, y - 3); g.quadraticCurveTo(x, y - 4.5, x - 3, y - 3); g.fillStyle = '#ff4a5a'; g.fill(); g.strokeStyle = '#8a1a2a'; g.lineWidth = 0.8; g.stroke(); for (const [dx, dy] of [[-1, -1], [1, -1], [0, 1]]) blob(g, x + dx, y + dy, 0.35, 0.45, '#ffe28a', null); blob(g, x, y - 3.6, 2, 0.8, '#5aa548', null); } } },
    // 해바라기: 키 큰 줄기 + 큰 잎 + 노란 꽃잎과 갈색 씨앗판 (자라는 중엔 봉오리)
    sunflower: (g, r) => { const h = r ? 42 : 24; stem(g, [[0, 0], [1, -h * 0.5], [0, -h]], 2.2, '#5aa548'); for (const [y, side] of [[-8, -1], [-15, 1], [-24, -1], [-31, 1]]) if (r || y > -20) { g.save(); g.translate(0, y); g.scale(side, 1); roundLeaf(g, 0, 0, 5, 1.2, { c: '#5aa548', d: '#2f6a2a', l: '#8fcf6a', o: '#24481f' }, true); g.restore(); } if (r) { g.save(); g.translate(1, -h); for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -8, 2.2, 4.5, 0, 0, Math.PI * 2); g.fillStyle = k % 2 ? '#ffd23a' : '#ffc21a'; g.fill(); g.strokeStyle = '#a87a1a'; g.lineWidth = 0.6; g.stroke(); g.restore(); } blob(g, 0, 0, 5.5, 5.5, '#7a4a28', '#3a2418', 1); g.fillStyle = 'rgba(40,24,14,0.6)'; for (let k = 0; k < 12; k++) { const a = k * 2.4, rr = Math.sqrt(k) * 1.4; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, 0.6, 0, 6.3); g.fill(); } g.restore(); } else blob(g, 0, -h - 2, 3, 3.5, '#7cc35a', L.o, 0.9); },
  };
  // 떡잎: 대부분 둥근 떡잎 두 장, 파·밀·옥수수·마늘·양파는 가는 싹
  const THIN = new Set(['wheat', 'corn', 'onion', 'garlic', 'green_onion']);
  function sprout(g, id) {
    if (THIN.has(id)) { for (const a of [-0.25, 0.1, 0.35]) leaf(g, 0, 0, 9, 1.4, a, { c: '#8fcf6a', d: '#4e8a3a', l: '#b8e38f', o: '#2f5a2a' }); return; }
    stem(g, [[0, 0], [0, -5]], 1.2, '#5aa548');
    for (const s of [-1, 1]) { g.save(); g.translate(0, -5); g.rotate(s * 1.1); g.beginPath(); g.ellipse(0, -3.2, 2.4, 3.4, 0, 0, Math.PI * 2); g.fillStyle = '#8fcf6a'; g.fill(); g.strokeStyle = '#3f7a3a'; g.lineWidth = 0.9; g.stroke(); g.restore(); }
  }
  function seedMound(g) { blob(g, 0, -1.5, 5, 2.6, '#9a6a48', '#6a4a30', 0.9); for (const [x, y] of [[-2, -2.4], [1.5, -2], [0, -3.2]]) blob(g, x, y, 0.7, 0.6, '#f3e2b4', null); }

  // 작물 하나의 단계 그림 (캐시). 키 큰 작물을 위해 넉넉한 그림판
  const SW = 48, SH = 66, OX = 24, OY = 60;
  A.cropSprite = (id, stage) => A.sprite('crop4:' + id + ':' + stage, SW, SH, (g) => {
    g.translate(OX, OY);
    if (stage === 0) return seedMound(g);
    if (stage === 1) return sprout(g, id);
    const f = ART[id]; if (f) f(g, stage >= 3);
    else { leaf(g, 0, 0, 12, 4, -0.4); leaf(g, 0, 0, 12, 4, 0.4); }
  });

  // 다 자란 작물 위에 뜨는 수확물 그림 (오너: 누가 봐도 뭔지 알아야) — 작물 키에 맞춰 높이
  const TOP = { corn: 50, sunflower: 54, green_onion: 34, tomato: 32, pepper: 28, eggplant: 30, cucumber: 32, pea: 30, wheat: 32, potato: 26, garlic: 26, onion: 26 };
  const prodIcon = (id) => A.sprite('prodico:' + id, 32, 32, (g) => { if (PRODUCE[id]) PRODUCE[id](g); });
  // 밭 그리기 교체: 칸 가운데 아래에서 살랑. 다 자란 작물은 반짝 고리
  F.collect = (R, rect, t) => {
    for (const p of F.st.plots) {
      if (!p.crop) continue;
      const x = p.tx * TILE + 16, y = p.ty * TILE + 27;
      if (x < rect.x - 50 || x > rect.x + rect.w + 50 || y < rect.y - 30 || y > rect.y + rect.h + 80) continue;
      const s = F.stage(p), sp = A.cropSprite(p.crop, s), sway = Math.sin(t * 1.8 + p.tx * 0.9 + p.ty * 0.4) * (s >= 2 ? 0.05 : 0.02);
      R.push({ sy: y - 4, draw: (ctx) => {
        ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, sway, 1, 0, 0);
        ctx.drawImage(sp, -OX, -OY, SW, SH);
        if (s === 3) { const k = (t * 0.7 + p.tx * 0.3) % 1; ctx.strokeStyle = `rgba(255,240,150,${(1 - k) * 0.8})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -2, 9 + k * 6, 3 + k * 2, 0, 0, 6.3); ctx.stroke(); }
        ctx.restore();
        if (s === 3 && PRODUCE[p.crop]) {
          const by = y - (TOP[p.crop] || 22) - 10 + Math.sin(t * 3 + p.tx) * 1.5;
          ctx.save(); ctx.beginPath(); ctx.moveTo(x - 3, by + 8); ctx.lineTo(x, by + 12); ctx.lineTo(x + 3, by + 8); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
          ctx.beginPath(); ctx.arc(x, by, 9.5, 0, 6.3); ctx.fill(); ctx.strokeStyle = 'rgba(140,110,80,0.5)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.drawImage(prodIcon(p.crop), x - 8, by - 8, 16, 16); ctx.restore();
        }
      } });
    }
  };

  // 아이콘 (가방·상점): 수확물은 그 모양대로, 씨앗은 그림이 그려진 봉투
  const PRODUCE = {
    radish: (g) => { g.beginPath(); g.moveTo(9, 13); g.quadraticCurveTo(16, 33, 23, 13); g.quadraticCurveTo(16, 9, 9, 13); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); blob(g, 16, 13, 7, 3, '#bfe39a', null); for (const a of [-0.5, 0, 0.5]) leaf(g, 16, 12, 10, 3.5, a); },
    carrot: (g) => { g.beginPath(); g.moveTo(10, 11); g.quadraticCurveTo(15, 32, 17, 30); g.quadraticCurveTo(22, 20, 22, 11); g.closePath(); g.fillStyle = '#ff9a3a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); g.strokeStyle = 'rgba(160,70,20,0.5)'; g.beginPath(); for (const y of [16, 21, 25]) { g.moveTo(12, y); g.lineTo(15, y); } g.stroke(); for (const a of [-0.5, 0, 0.5]) leaf(g, 16, 11, 9, 2.5, a); },
    potato: (g) => { blob(g, 16, 18, 11, 8.5, '#d9b07a'); for (const [x, y] of [[11, 16], [19, 14], [21, 21]]) blob(g, x, y, 0.9, 0.7, '#a87a48', null); shine(g, 12, 13, 3, 1.6); },
    sweet_potato: (g) => { g.save(); g.translate(16, 18); g.rotate(-0.4); blob(g, 0, 0, 12, 6.5, '#b0507a'); g.strokeStyle = 'rgba(80,20,50,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-4, 2); g.moveTo(2, -3); g.lineTo(4, 1); g.stroke(); shine(g, -5, -3, 3, 1.4); g.restore(); },
    pumpkin: (g) => { for (const [x, w] of [[10, 6], [22, 6], [13, 5.5], [19, 5.5]]) blob(g, x, 19, w, 8.5, '#ff9a3a', '#8a4a1a', 1.1); blob(g, 16, 19, 4.5, 8.8, '#ffaa4a', '#8a4a1a', 1.1); shine(g, 9, 15, 1.8, 3); g.fillStyle = '#6a8a3a'; g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.roundRect(14.5, 6, 3, 6, 1.2); g.fill(); g.stroke(); },
    corn: (g) => { g.save(); g.translate(16, 17); g.rotate(0.35); blob(g, 0, 0, 5.5, 12, '#ffd24d', '#8a6a1a', 1.1); g.fillStyle = 'rgba(200,150,30,0.55)'; for (let y = -9; y <= 9; y += 3) for (const x of [-2.5, 0.5, 3]) { g.beginPath(); g.arc(x, y, 0.8, 0, 6.3); g.fill(); } g.beginPath(); g.moveTo(0, 12); g.quadraticCurveTo(-9, 2, -4, -8); g.quadraticCurveTo(-2, 4, 0, 12); g.moveTo(0, 12); g.quadraticCurveTo(9, 2, 4, -8); g.quadraticCurveTo(2, 4, 0, 12); g.fillStyle = '#8fcf6a'; g.fill(); g.strokeStyle = L.o; g.lineWidth = 1; g.stroke(); g.restore(); },
    wheat: (g) => { for (const x of [11, 16, 21]) { stem(g, [[x, 29], [x + (x - 16) * 0.3, 10]], 1.2, '#c9a44a'); for (let j = 0; j < 4; j++) { blob(g, x - 1.6 + (x - 16) * 0.25, 7 + j * 3, 1.6, 2.4, '#e8c45a', '#a8843a', 0.6); blob(g, x + 1.6 + (x - 16) * 0.25, 8 + j * 3, 1.6, 2.4, '#f0d070', '#a8843a', 0.6); } } },
    strawberry: (g) => { g.beginPath(); g.moveTo(7, 12); g.quadraticCurveTo(16, 34, 25, 12); g.quadraticCurveTo(16, 8, 7, 12); g.fillStyle = '#ff4a5a'; g.fill(); g.strokeStyle = '#8a1a2a'; g.lineWidth = 1.3; g.stroke(); for (const [x, y] of [[12, 16], [16, 15], [20, 16], [14, 21], [18, 21], [16, 26]]) blob(g, x, y, 0.6, 0.8, '#ffe28a', null); for (const a of [-1, -0.4, 0.4, 1]) leaf(g, 16, 11, 6, 2.4, a); shine(g, 11, 15, 1.5, 2); },
    tomato: (g) => { blob(g, 16, 19, 10.5, 9, '#ff5a4a', '#8a2a1a', 1.3); shine(g, 12, 15, 2.6, 1.8); for (const a of [-1.2, -0.4, 0.4, 1.2]) leaf(g, 16, 11, 5.5, 2, a + Math.PI); blob(g, 16, 10, 1.4, 1.4, '#5aa548', null); },
    watermelon: (g) => { blob(g, 16, 18, 12, 10, '#3f9a4a', '#1f5a2a', 1.4); g.strokeStyle = '#1f6a2a'; g.lineWidth = 2; g.beginPath(); for (const k of [-6, 0, 6]) { g.moveTo(16 + k, 9); g.quadraticCurveTo(16 + k * 1.5, 18, 16 + k, 27); } g.stroke(); shine(g, 10, 13, 3, 1.6); },
    cabbage: (g) => { for (const [x, a] of [[8, -1], [24, 1]]) roundLeaf(g, x, 26, 8, a, { c: '#7cc35a', d: '#4e8a3a', l: '#a8dc7c', o: '#2f5a2a' }); blob(g, 16, 18, 10, 9, '#dff2b8', '#5aa548', 1.3); g.strokeStyle = 'rgba(120,170,80,0.7)'; g.lineWidth = 1; g.beginPath(); g.arc(16, 22, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); shine(g, 12, 13, 2.5, 1.5); },
    spinach: (g) => { for (const a of [-0.8, -0.3, 0.2, 0.7]) roundLeaf(g, 16, 28, 7, a, { c: '#4e9e4a', d: '#2f6a2a', l: '#7cc35a', o: '#24481f' }); },
    lettuce: (g) => { for (const a of [-1, -0.5, 0, 0.5, 1]) roundLeaf(g, 16, 28, 8, a, { c: '#9ad66e', d: '#5aa548', l: '#c8ef9a', o: '#3f7a3a' }); },
    broccoli: (g) => { g.fillStyle = '#8fc06a'; g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.roundRect(13, 18, 6, 11, 2); g.fill(); g.stroke(); for (const [x, y, r] of [[10, 15, 6], [22, 15, 6], [16, 10, 7], [16, 17, 6]]) blob(g, x, y, r, r * 0.9, '#3f8a3a', '#24481f', 1); },
    green_onion: (g) => { for (const a of [-0.2, 0, 0.2]) { g.save(); g.translate(16, 29); g.rotate(a); g.fillStyle = '#4e9e4a'; g.strokeStyle = L.o; g.lineWidth = 1; g.beginPath(); g.roundRect(-2, -26, 4, 16, 2); g.fill(); g.stroke(); g.fillStyle = '#f4f8ec'; g.beginPath(); g.roundRect(-2, -11, 4, 11, 1.5); g.fill(); g.stroke(); g.restore(); } },
    onion: (g) => { g.beginPath(); g.moveTo(16, 5); g.quadraticCurveTo(28, 14, 24, 23); g.quadraticCurveTo(16, 31, 8, 23); g.quadraticCurveTo(4, 14, 16, 5); g.fillStyle = '#e8b86a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); g.strokeStyle = 'rgba(150,100,40,0.5)'; g.lineWidth = 0.9; g.beginPath(); for (const k of [-4, 0, 4]) { g.moveTo(16 + k * 0.3, 7); g.quadraticCurveTo(16 + k * 1.6, 18, 16 + k * 0.6, 29); } g.stroke(); shine(g, 11, 15, 1.8, 2.6); },
    garlic: (g) => { for (const x of [10, 22, 16]) blob(g, x, 21, 6, 7.5, '#f6efe4', '#8a7a6a', 1.1); g.fillStyle = '#e9d9c8'; g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(14, 13); g.lineTo(16, 5); g.lineTo(18, 13); g.closePath(); g.fill(); g.stroke(); },
    pepper: (g) => { g.save(); g.translate(16, 16); g.rotate(-0.5); g.beginPath(); g.moveTo(-3.5, -8); g.quadraticCurveTo(-3, 10, 1, 13); g.quadraticCurveTo(4, 6, 3.5, -8); g.closePath(); g.fillStyle = '#e8402c'; g.fill(); g.strokeStyle = '#7a1a1a'; g.lineWidth = 1.3; g.stroke(); shine(g, -1.5, -3, 1, 3); blob(g, 0, -9, 4, 2, '#5aa548', '#2f5a2a', 0.9); stem(g, [[0, -10], [2, -14]], 1.4, '#3f7a3a'); g.restore(); },
    eggplant: (g) => { g.save(); g.translate(16, 17); g.rotate(-0.5); g.beginPath(); g.ellipse(0, 3, 6.5, 10, 0, 0, Math.PI * 2); g.fillStyle = '#6a3a8a'; g.fill(); g.strokeStyle = '#2a1a3a'; g.lineWidth = 1.3; g.stroke(); shine(g, -2.5, 0, 1.4, 4); blob(g, 0, -7, 5, 2.5, '#4e8a3a', '#2f5a2a', 0.9); stem(g, [[0, -9], [1, -13]], 1.5, '#3f7a3a'); g.restore(); },
    cucumber: (g) => { g.save(); g.translate(16, 16); g.rotate(-0.7); g.beginPath(); g.roundRect(-3.5, -12, 7, 24, 3.5); g.fillStyle = '#4e9e4a'; g.fill(); g.strokeStyle = '#24481f'; g.lineWidth = 1.3; g.stroke(); for (let k = -9; k < 10; k += 3.5) blob(g, (k % 2 ? 1.5 : -1.5), k, 0.6, 0.6, '#c8ef9a', null); shine(g, -1.5, -6, 0.9, 4); g.restore(); },
    pea: (g) => { g.save(); g.translate(16, 16); g.rotate(-0.6); g.beginPath(); g.ellipse(0, 0, 5, 12, 0, 0, Math.PI * 2); g.fillStyle = '#7cc35a'; g.fill(); g.strokeStyle = '#2f5a2a'; g.lineWidth = 1.3; g.stroke(); for (const k of [-6, -1.5, 3, 7.5]) blob(g, 0.5, k, 2.4, 2.2, '#a8dc7c', '#4e8a3a', 0.7); g.restore(); },
    peanut: (g) => { g.save(); g.translate(16, 16); g.rotate(-0.5); for (const y of [-5, 5]) blob(g, 0, y, 6, 6.5, '#d9a868', '#7a5a3a', 1.2); g.fillStyle = '#d9a868'; g.fillRect(-4, -2, 8, 4); g.strokeStyle = 'rgba(120,80,40,0.5)'; g.lineWidth = 0.8; g.beginPath(); for (const y of [-7, -3, 3, 7]) { g.moveTo(-4, y); g.lineTo(4, y); } g.stroke(); g.restore(); },
    sunflower: (g) => { g.save(); g.translate(16, 16); for (let k = 0; k < 14; k++) { g.save(); g.rotate(k / 14 * Math.PI * 2); g.beginPath(); g.ellipse(0, -9.5, 2.6, 5.5, 0, 0, Math.PI * 2); g.fillStyle = k % 2 ? '#ffd23a' : '#ffc21a'; g.fill(); g.strokeStyle = '#a87a1a'; g.lineWidth = 0.8; g.stroke(); g.restore(); } blob(g, 0, 0, 6.5, 6.5, '#7a4a28', '#3a2418', 1.2); g.restore(); },
  };
  A.drawProduce = (g, id) => { const f = PRODUCE[id]; if (f) { f(g); return true; } return false; };
  const base = A.drawIcon;
  A.drawIcon = (g, id, t) => {
    const [cat, rest] = id.split(':'), key = rest && rest.split('#')[0];
    if (cat === 'crop' && PRODUCE[key]) { g.save(); PRODUCE[key](g); g.restore(); return; }
    if (cat === 'seed' && PRODUCE[key]) {
      // 씨앗 봉투: 종이 봉투 + 작은 수확물 그림 + 씨앗 몇 알
      g.save();
      P_rr(g, 5, 4, 22, 25, 3, '#f6ead0', INK, 1.3);
      g.fillStyle = '#e8d6b0'; g.fillRect(6, 5, 20, 5);
      g.save(); g.translate(16, 16.5); g.scale(0.5, 0.5); g.translate(-16, -16); PRODUCE[key](g); g.restore();
      for (const [x, y] of [[9, 25], [13, 26.5], [21, 25.5]]) blob(g, x, y, 1.2, 0.9, '#a87a48', null);
      g.restore(); return;
    }
    return base(g, id, t);
  };
  function P_rr(g, x, y, w, h, r, fill, line, lw) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = lw; g.stroke(); }
  if (A.iconReset) A.iconReset();
  G.modules.add('cropart');
})(globalThis.G);
