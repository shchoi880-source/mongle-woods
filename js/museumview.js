// 박물관 큰 관람창 (오너: "잡은 거 한 공간에서 막 보여주는 거, 수족관에서 물고기 헤엄치고")
// 수족관: 기증한 물고기가 헤엄치고, 바다 생물은 바닥을 기거나 둥실둥실. 곤충 온실: 나비는 날고, 딱정벌레는 가지·풀 위를 걷는다.
// 생물을 누르면 이름표. 화면 가득, 닫기 버튼.
(function (G) {
  'use strict';
  const A = G.art;
  const MV = G.museumView = { open: null };
  const FLY = new Set(['butterfly', 'moth', 'dragonfly', 'bee', 'firefly', 'cloudfly']);
  const WATERBUG = new Set(['whirligig', 'strider', 'diving']);
  const FLOAT = new Set(['jelly', 'cloudjelly', 'starfry']);
  const CRAWL = new Set(['crab', 'starfish', 'urchin', 'hermit', 'lobster', 'seacuc', 'nudi', 'scallop', 'turtle', 'crayfish', 'octo']);
  // GPT 배경 그림 (오너가 준 수족관·온실 수채화)
  const BG = { fish: new Image(), bug: new Image() };
  BG.fish.src = 'assets/scenery/museum-aquarium.webp'; BG.bug.src = 'assets/scenery/museum-garden.webp';
  // 그림 속 바닥·연못 자리 (그림 비율 0~1)
  const BGK = { fish: { floor: 0.84 }, bug: { floor: 0.71, pond: [0.03, 0.3, 0.74] } };
  const imgs = new Map();
  const img = (id) => { let im = imgs.get(id); if (!im) { im = new Image(); im.src = A.iconURL(id, 128); imgs.set(id, im); } return im; };

  function entities(kind, W, H, floorY, pond) {
    const out = [], R = Math.random;
    if (kind === 'fish') {
      for (const r of G.data.all('fish')) if (G.museum.donated('fish', r.ix)) {
        const sh = r.shape || '', sz = 34 + (r.shadow || 2) * 13;
        if (CRAWL.has(sh)) out.push({ id: 'fish:' + r.id, r, mode: 'crawl', x: R() * W, y: floorY - sz * 0.35, vx: (R() < 0.5 ? -1 : 1) * (8 + R() * 10), sz: sz * 0.8 });
        else if (FLOAT.has(sh)) out.push({ id: 'fish:' + r.id, r, mode: 'float', x: R() * W, y: H * (0.2 + R() * 0.5), vx: (R() - 0.5) * 12, sz, ph: R() * 6 });
        else out.push({ id: 'fish:' + r.id, r, mode: 'swim', x: R() * W, y: H * (0.15 + R() * 0.6), vx: (R() < 0.5 ? -1 : 1) * (26 + R() * 30) * (sh === 'eel' || sh === 'long' ? 0.7 : 1), sz, ph: R() * 6, eel: sh === 'eel' || sh === 'long' || sh === 'moray' });
      }
      for (const r of G.data.all('sea')) if (G.museum.donated('sea', r.ix)) {
        const fl = r.art === 'jelly' || r.art === 'cloudjelly', sz = 40 + (r.tier || 1) * 6;
        out.push(fl ? { id: 'sea:' + r.id, r, mode: 'float', x: R() * W, y: H * (0.2 + R() * 0.5), vx: (R() - 0.5) * 10, sz, ph: R() * 6 }
          : { id: 'sea:' + r.id, r, mode: r.art === 'seahorse' ? 'float' : 'crawl', x: R() * W, y: floorY - sz * 0.3 - R() * 12, vx: (R() < 0.5 ? -1 : 1) * (4 + R() * 8), sz, ph: R() * 6 });
      }
    } else {
      for (const r of G.data.all('bugs')) if (G.museum.donated('bug', r.ix)) {
        const t = r.art || r.tpl, sz = 40 + (r.tier || 1) * 5;
        if (FLY.has(t)) out.push({ id: 'bug:' + r.id, r, mode: 'fly', hx: W * (0.1 + R() * 0.8), hy: H * (0.12 + R() * 0.45), x: 0, y: 0, sz, ph: R() * 6, sp: 0.4 + R() * 0.5 });
        else if (WATERBUG.has(t)) out.push({ id: 'bug:' + r.id, r, mode: 'pond', x: pond.x0 + R() * (pond.x1 - pond.x0), y: pond.y + (R() - 0.5) * 16, vx: (R() - 0.5) * 30, sz: sz * 0.8, ph: R() * 6 });
        else out.push({ id: 'bug:' + r.id, r, mode: 'walk', x: W * (0.38 + R() * 0.58), y: floorY + 14 + R() * (H - floorY - 40), vx: (R() < 0.5 ? -1 : 1) * (6 + R() * 10), sz: sz * 0.85, ph: R() * 6, rest: R() * 3 });
      }
    }
    return out;
  }

  MV.open = (kind) => {
    if (MV.el) return;
    G.input.lock('mview'); G.audio.sfx('open');
    const el = document.createElement('div'); el.className = 'mview';
    const cv = document.createElement('canvas'); const close = document.createElement('button'); close.className = 'btn-x mview-x'; close.textContent = '✕';
    const title = document.createElement('div'); title.className = 'mview-title';
    el.append(cv, title, close); document.body.append(el); MV.el = el;
    const g = cv.getContext('2d'); const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    let W = 0, H = 0, floorY = 0, list = [], tag = null, raf = 0, last = performance.now();
    // 그림은 세로 높이에 맞추고(폰에선 양옆이 넘침) 옆으로 끌어서 둘러본다 (오너: 폰 화면이 작아 다 못 본다)
    let pond = { x0: 0, x1: 0, y: 0 }, bgr = null, SW = 0, SH = 0, camX = 0, camY = 0, hintT = 4;
    const clampCam = () => { camX = Math.max(0, Math.min(W - SW, camX)); camY = Math.max(0, Math.min(H - SH, camY)); };
    const resize = () => {
      SW = innerWidth; SH = H = innerHeight; cv.width = SW * dpr; cv.height = SH * dpr; cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
      W = SW; floorY = H * (kind === 'fish' ? 0.86 : 0.72); pond = { x0: W * 0.05, x1: W * 0.33, y: floorY + 46 }; bgr = null;
      const im = BG[kind];
      if (im.complete && im.naturalWidth) {
        const sc = Math.max(SW / im.naturalWidth, SH / im.naturalHeight), bw = im.naturalWidth * sc, bh = im.naturalHeight * sc;
        bgr = { im, bx: 0, by: 0, bw, bh }; W = Math.max(SW, bw); H = Math.max(SH, bh);
        floorY = bgr.by + bh * BGK[kind].floor;
        if (BGK[kind].pond) { const [a, b, y] = BGK[kind].pond; pond = { x0: bw * a + 8, x1: bw * b, y: bgr.by + bh * y }; }
      }
      clampCam();
    };
    resize(); camX = kind === 'fish' ? (W - SW) / 2 : 0; camY = H - SH; clampCam(); list = entities(kind, W, H, floorY, pond);
    const total = kind === 'fish' ? G.data.all('fish').length + G.data.all('sea').length : G.data.all('bugs').length;
    title.textContent = `${kind === 'fish' ? '🐟 큰 수족관' : '🦋 곤충 정원'} · ${list.length}/${total}`;
    const done = () => { MV.close = null; cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('keydown', onKey); el.remove(); MV.el = null; G.input.unlock('mview'); G.audio.sfx('close'); };
    close.onclick = done; MV.close = done;
    // 끌기 = 옆으로 둘러보기, 톡 = 이름표
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cam: camX, camy: camY, moved: 0, id: e.pointerId }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); camX = drag.cam - dx; camY = drag.camy - dy; clampCam(); if (drag.moved > 8) hintT = 0; });
    const up = (e) => {
      if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null;
      if (d.moved > 8) return;
      const wx = e.clientX + camX, wy = e.clientY + camY, hit = list.slice().reverse().find((o) => Math.hypot(wx - o.x, wy - o.y) < o.sz * 0.55);
      if (hit) { tag = { o: hit, t: 2.6 }; G.audio.sfx('pop'); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { drag = null; });
    // PC: 방향키·휠로도 둘러보기
    const onKey = (e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') { camX -= 60; clampCam(); } else if (e.code === 'ArrowRight' || e.code === 'KeyD') { camX += 60; clampCam(); } else if (e.code === 'ArrowUp' || e.code === 'KeyW') { camY -= 50; clampCam(); } else if (e.code === 'ArrowDown' || e.code === 'KeyS') { camY += 50; clampCam(); } else if (e.code === 'Escape') done(); };
    addEventListener('keydown', onKey);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); if (H > SH + 4 && !e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) camY += e.deltaY; else camX += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); clampCam(); hintT = 0; }, { passive: false });
    addEventListener('resize', resize);
    // 배경 장식 (한 번 정해 두기)
    const R = Math.random, weeds = Array.from({ length: 9 }, (_, i) => ({ x: (i + 0.5) / 9 * 1 + (R() - 0.5) * 0.06, h: 0.12 + R() * 0.16, c: ['#5a9a6a', '#6ab07a', '#4a8a6a'][i % 3] }));
    const rocks = Array.from({ length: 5 }, () => ({ x: R(), w: 40 + R() * 60, h: 20 + R() * 26 }));
    const flowers = Array.from({ length: 16 }, () => ({ x: R(), y: R(), c: ['#ffb0c8', '#ffe08a', '#c8b0ff', '#ffffff', '#ff9a7a'][Math.floor(R() * 5)] }));
    const bubbles = Array.from({ length: 22 }, () => ({ x: R(), y: R(), r: 2 + R() * 4, s: 18 + R() * 30 }));

    const drawBg = (t) => {
      if (bgr) {
        g.drawImage(bgr.im, bgr.bx, bgr.by, bgr.bw, bgr.bh);
        if (kind === 'fish') { // 거품만 움직이게
          g.fillStyle = 'rgba(255,255,255,0.5)';
          for (const b of bubbles) { const y = ((b.y * H - t * b.s) % H + H) % H; g.beginPath(); g.arc(b.x * W + Math.sin(t * 2 + b.y * 9) * 4, y, b.r, 0, 6.3); g.fill(); }
        } else { // 햇살 반짝
          g.save(); g.globalAlpha = 0.08 + Math.sin(t * 0.6) * 0.04; g.fillStyle = '#fff6c8'; g.fillRect(0, 0, W, floorY); g.restore();
        }
        return;
      }
      if (kind === 'fish') {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7cc8ec'); gr.addColorStop(0.6, '#3d8fbf'); gr.addColorStop(1, '#2a6a92');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.save(); g.globalAlpha = 0.12; g.fillStyle = '#ffffff';
        for (let k = 0; k < 6; k++) { const x = ((k * 0.19 + t * 0.01) % 1.2 - 0.1) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x - 40 + 80, H * 0.8); g.lineTo(x - 90, H * 0.8); g.fill(); }
        g.restore();
        g.fillStyle = '#e8d6a8'; g.beginPath(); g.moveTo(0, floorY); for (let x = 0; x <= W; x += 40) g.lineTo(x, floorY + Math.sin(x / 90) * 6); g.lineTo(W, H); g.lineTo(0, H); g.fill();
        for (const r of rocks) { g.fillStyle = '#8a9aa8'; g.beginPath(); g.ellipse(r.x * W, floorY + 4, r.w, r.h, 0, Math.PI, 0); g.fill(); }
        for (const w of weeds) { g.strokeStyle = w.c; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); const bx = w.x * W; g.moveTo(bx, floorY + 6); for (let k = 1; k <= 6; k++) g.lineTo(bx + Math.sin(t * 1.4 + k * 0.7 + bx) * 7 * k / 6, floorY + 6 - k * w.h * H / 6); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.55)';
        for (const b of bubbles) { const y = ((b.y * H - t * b.s) % H + H) % H; g.beginPath(); g.arc(b.x * W + Math.sin(t * 2 + b.y * 9) * 4, y, b.r, 0, 6.3); g.fill(); }
      } else {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#dff3ff'); gr.addColorStop(0.7, '#f4fbef'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(160,190,200,0.5)'; g.lineWidth = 2; for (let x = 0; x < W; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, floorY); g.stroke(); }
        g.fillStyle = '#a8d88a'; g.fillRect(0, floorY, W, H - floorY);
        g.fillStyle = '#93c878'; for (let k = 0; k < 40; k++) { const x = (k * 97) % W, y = floorY + 8 + (k * 53) % (H - floorY - 10); g.beginPath(); g.ellipse(x, y, 14, 5, 0, 0, 6.3); g.fill(); }
        // 연못
        g.fillStyle = '#8fcbe8'; g.beginPath(); g.ellipse(W * 0.19, floorY + 46, W * 0.16, 30, 0, 0, 6.3); g.fill(); g.strokeStyle = '#d9c9a0'; g.lineWidth = 4; g.stroke();
        // 꽃
        for (const f of flowers) { const x = f.x * W, y = floorY - 6 - f.y * 40; g.strokeStyle = '#6aa860'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, floorY + 6); g.lineTo(x, y); g.stroke(); g.fillStyle = f.c; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 5, y + Math.sin(k * 1.26) * 5, 4, 0, 6.3); g.fill(); } g.fillStyle = '#ffd24d'; g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); }
      }
    };
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
      g.setTransform(dpr, 0, 0, dpr, -camX * dpr, -camY * dpr);
      drawBg(t);
      for (const o of list) {
        if (o.mode === 'swim') { o.x += o.vx * dt; o.y += Math.sin(t * 1.3 + o.ph) * 8 * dt; if (o.x < -o.sz) { o.x = -o.sz; o.vx = Math.abs(o.vx); } if (o.x > W + o.sz) { o.x = W + o.sz; o.vx = -Math.abs(o.vx); } if (Math.random() < 0.002) o.vx = -o.vx; }
        else if (o.mode === 'float') { o.x += o.vx * dt; o.y += Math.sin(t * 0.8 + o.ph) * 10 * dt; if (o.x < 20 || o.x > W - 20) o.vx = -o.vx; }
        else if (o.mode === 'crawl' || o.mode === 'walk' || o.mode === 'pond') {
          if (o.rest > 0) o.rest -= dt; else { o.x += o.vx * dt; if (Math.random() < 0.004) o.rest = 1 + Math.random() * 3; }
          const lo = o.mode === 'pond' ? pond.x0 + 10 : o.mode === 'walk' ? Math.max(pond.x1 + 10, W * 0.3) : 10, hi = o.mode === 'pond' ? pond.x1 - 10 : W - 10;
          if (o.x < lo || o.x > hi) o.vx = -o.vx;
        } else if (o.mode === 'fly') { const k = t * o.sp + o.ph; o.x = o.hx + Math.sin(k) * W * 0.12 + Math.sin(k * 0.37) * 40; o.y = o.hy + Math.sin(k * 2) * 26; o.vx = Math.cos(k); }
        if (kind === 'bug') { // 곤충은 게임 속 그림 그대로(날갯짓 포함) 크게
          if (o.mode !== 'pond') { g.fillStyle = 'rgba(60,90,40,0.15)'; g.beginPath(); g.ellipse(o.x, o.mode === 'fly' ? floorY + 6 : o.y + o.sz * 0.25, o.sz * 0.22, 4, 0, 0, 6.3); g.fill(); }
          g.save(); g.translate(o.x, o.y); const k = o.sz / 24; g.scale(k, k);
          A.bug(g, { sp: o.r, x: 0, y: 0, seed: o.ph, alt: 0, face: o.vx < 0 ? -1 : 1, v: 0, state: 'idle', noRing: true }, o.mode === 'fly' ? t : (o.rest > 0 ? 0.07 : t));
          g.restore(); continue;
        }
        const im = img(o.id); if (!im.complete || !im.naturalWidth) continue;
        const s = o.sz, flip = o.vx < 0 ? -1 : 1, wob = o.mode === 'swim' ? Math.sin(t * 6 + o.ph) * (o.eel ? 0.08 : 0.04) : o.mode === 'fly' ? 0 : Math.sin(t * 3 + o.ph) * 0.02;
        g.save(); g.translate(o.x, o.y);
        if (o.mode !== 'swim' && o.mode !== 'float' && kind === 'fish') { g.fillStyle = 'rgba(30,50,70,0.18)'; g.beginPath(); g.ellipse(0, s * 0.3, s * 0.35, 5, 0, 0, 6.3); g.fill(); }
        g.rotate(wob); g.scale(flip * (o.mode === 'fly' ? 0.8 + Math.abs(Math.sin(t * 14 + o.ph)) * 0.2 : 1), 1);
        g.drawImage(im, -s / 2, -s / 2, s, s); g.restore();
      }
      if (tag) {
        tag.t -= dt; const o = tag.o, label = `${o.r.name} ${'★'.repeat(o.r.tier || 1)}`;
        g.font = 'bold 15px "Jua", sans-serif'; const tw = g.measureText(label).width + 22, x = Math.max(camX + 8, Math.min(camX + SW - tw - 8, o.x - tw / 2)), y = Math.max(camY + 50, o.y - o.sz * 0.6 - 34);
        g.globalAlpha = Math.min(1, tag.t * 2); g.fillStyle = 'rgba(255,250,241,0.95)'; g.beginPath(); g.roundRect(x, y, tw, 28, 14); g.fill(); g.fillStyle = '#5b4636'; g.textBaseline = 'middle'; g.fillText(label, x + 11, y + 14); g.globalAlpha = 1;
        if (tag.t <= 0) tag = null;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 둘러보기 안내 + 양옆 화살표
      if (W > SW + 20 || H > SH + 20) {
        if (hintT > 0) { hintT -= dt; g.globalAlpha = Math.min(1, hintT); g.font = 'bold 15px "Jua", sans-serif'; const tx = W > SW + 20 && H > SH + 20 ? '👆 끌어서 이리저리 둘러봐요' : W > SW + 20 ? '👈 옆으로 끌어서 둘러봐요 👉' : '👆 위아래로 끌어서 둘러봐요', tw = g.measureText(tx).width + 26; g.fillStyle = 'rgba(255,250,241,0.92)'; g.beginPath(); g.roundRect(SW / 2 - tw / 2, SH - 70, tw, 32, 16); g.fill(); g.fillStyle = '#5b4636'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, SW / 2, SH - 54); g.textAlign = 'left'; g.globalAlpha = 1; }
        const arrow = (x, dir) => { g.globalAlpha = 0.55 + Math.sin(t * 3) * 0.2; g.fillStyle = '#fffaf1'; g.beginPath(); g.moveTo(x, SH / 2 - 16); g.lineTo(x + dir * 14, SH / 2); g.lineTo(x, SH / 2 + 16); g.fill(); g.globalAlpha = 1; };
        const varrow = (y, dir) => { g.globalAlpha = 0.55 + Math.sin(t * 3) * 0.2; g.fillStyle = '#fffaf1'; g.beginPath(); g.moveTo(SW / 2 - 16, y); g.lineTo(SW / 2, y + dir * 14); g.lineTo(SW / 2 + 16, y); g.fill(); g.globalAlpha = 1; };
        if (camX > 4) arrow(18, -1); if (camX < W - SW - 4) arrow(SW - 18, 1);
        if (camY > 4) varrow(64, -1); if (camY < H - SH - 4) varrow(SH - 18, 1);
      }
      if (!list.length) { g.font = 'bold 18px "Jua", sans-serif'; g.fillStyle = kind === 'fish' ? '#ffffff' : '#5b4636'; g.textAlign = 'center'; g.fillText('아직 기증한 친구가 없어요. 잡아서 느림보 박사에게 기증해 봐요!', SW / 2, SH * 0.45); g.textAlign = 'left'; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  };
  G.modules.add('museumview');
})(globalThis.G);
