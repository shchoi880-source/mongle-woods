// 요리 장면 (오너: "요리도 그냥 짠 하고 만들어지지 말고, 그럴싸하게 만들어지는 과정을 보여 주자" + "스킵 기능")
// 재료가 하나씩 퐁당 → 냄비·프라이팬·오븐·석쇠·그릇에서 익는다 → 톡톡 누르면 저어서 빨리 → 짠! 완성
// 「건너뛰기」 버튼, 「다음부터 바로 완성」(설정에서 다시 켬)
(function (G) {
  'use strict';
  const CK = G.cook = {};
  const DUR = 3.2; // 가만히 두면 3.2초, 누를수록 빨라진다

  CK.skipAlways = () => G.settings && G.settings.get('cookSkip') === true;

  // r: 레시피 {out:'dish:id', need:[[id,n]]}. 끝나면 resolve(완성 여부는 호출한 쪽이 처리)
  CK.play = (r) => new Promise((resolve) => {
    if (CK.skipAlways() || typeof document === 'undefined') { resolve(); return; }
    const dishId = r.out.split(':')[1], d = (G.farm.DISHES.find((x) => x.id === dishId)) || { tool: 'pot', col: '#e8c890' };
    const tool = d.tool || 'pot', name = G.craft.name(r);
    const ov = document.createElement('div'); ov.className = 'cookov';
    ov.innerHTML = `<div class="cookcard"><div class="cooktitle">🍳 ${name} 만드는 중…</div><canvas class="cookcv"></canvas><div class="cookbar"><i></i></div><div class="cookhint">톡톡 누르면 ${tool === 'oven' ? '불을 지펴' : tool === 'grill' || tool === 'pan' ? '뒤적여' : '저어'} 더 빨리 돼요!</div><div class="cookbtns"><label class="cookskip"><input type="checkbox"> 다음부터 바로 완성</label><button class="btn small ghost">건너뛰기 ⏭</button></div></div>`;
    G.ui.root.append(ov);
    const cv = ov.querySelector('canvas'), dpr = Math.min(globalThis.devicePixelRatio || 1, 2), W = 280, H = 210;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const bar = ov.querySelector('.cookbar i'), title = ov.querySelector('.cooktitle'), hint = ov.querySelector('.cookhint');
    // 재료 그림
    const ings = []; for (const [id, n] of r.need) for (let k = 0; k < n; k++) { const im = new Image(); im.src = G.art.iconURL(id, 64); ings.push(im); }
    const dishIm = new Image(); dishIm.src = G.art.iconURL(r.out, 96);
    let t = 0, prog = 0, stir = 0, done = false, doneT = 0, last = performance.now(), raf = 0, finished = false;
    const drops = ings.map((im, i) => ({ im, at: 0.15 + i * 0.35, y: -30, x: 140 + (i - (ings.length - 1) / 2) * 22, landed: false }));
    const bubbles = [], sparks = [];
    const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); ov.remove(); resolve(); };
    ov.querySelector('.cookbtns button').onclick = (e) => { e.stopPropagation(); G.audio.sfx('tap'); finish(); };
    ov.querySelector('.cookskip input').onchange = (e) => { G.settings.set('cookSkip', e.target.checked); };
    ov.querySelector('.cookskip').onclick = (e) => e.stopPropagation();
    ov.onpointerdown = (e) => {
      if (e.target.closest('.cookbtns')) return;
      if (done) { if (doneT > 0.5) finish(); return; }
      prog = Math.min(1, prog + 0.07); stir = 1; G.audio.sfx(tool === 'pan' || tool === 'grill' ? 'shake' : 'plop');
    };
    const ease = (k) => 1 - Math.pow(1 - k, 3);
    function vessel() {
      const P = G.art.paint, mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
      const cook = Math.min(1, prog * 1.1), liquid = mix(tool === 'pan' || tool === 'grill' ? '#f3e6b0' : '#9fd8ef', d.col || '#e8c890', cook);
      // 불
      if (tool !== 'bowl') for (let k = 0; k < 5; k++) { const fx = 100 + k * 20, fh = 10 + Math.sin(t * 12 + k * 1.7) * 4 + prog * 4; g.fillStyle = k % 2 ? '#ffb03a' : '#ff7a2a'; g.beginPath(); g.moveTo(fx - 6, 196); g.quadraticCurveTo(fx, 196 - fh * 2, fx + 6, 196); g.fill(); g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(fx - 3, 196); g.quadraticCurveTo(fx, 196 - fh, fx + 3, 196); g.fill(); }
      if (tool === 'pot') {
        P.rrect(g, 70, 110, 140, 78, [6, 6, 26, 26], '#8fa8c0', '#3a4a5a', 2.5); P.rrect(g, 60, 116, 14, 8, 4, '#6a7a8a', '#3a4a5a', 1.5); P.rrect(g, 206, 116, 14, 8, 4, '#6a7a8a', '#3a4a5a', 1.5);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(80, 120, 8, 52);
        g.fillStyle = liquid; g.beginPath(); g.ellipse(140, 112, 66, 12, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#3a4a5a'; g.lineWidth = 2; g.beginPath(); g.ellipse(140, 110, 70, 13, 0, 0, Math.PI * 2); g.stroke();
      } else if (tool === 'pan') {
        g.fillStyle = '#4a4a52'; g.beginPath(); g.ellipse(140, 150, 80, 22, 0, 0, Math.PI * 2); g.fill(); P.rrect(g, 210, 142, 60, 12, 6, '#7a5a3a', '#3a2a1a', 1.5);
        g.fillStyle = liquid; g.beginPath(); g.ellipse(140, 146, 68, 16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(120, 142, 30, 5, -0.1, 0, Math.PI * 2); g.fill();
      } else if (tool === 'grill') {
        g.fillStyle = '#3a3a42'; g.fillRect(70, 150, 140, 8); g.strokeStyle = '#6a6a72'; g.lineWidth = 3; g.beginPath(); for (let x = 76; x <= 204; x += 16) { g.moveTo(x, 136); g.lineTo(x, 156); } g.stroke();
      } else if (tool === 'oven') {
        P.rrect(g, 60, 70, 160, 126, 14, '#e8b07a', '#7a4a2a', 2.5); P.rrect(g, 78, 92, 124, 80, 10, '#3a2a28', '#7a4a2a', 2);
        g.fillStyle = `rgba(255,170,60,${0.25 + prog * 0.5 + Math.sin(t * 8) * 0.05})`; g.beginPath(); g.roundRect(82, 96, 116, 72, 8); g.fill();
        for (let k = 0; k < 3; k++) P.blob(g, 90 + k * 22, 82, 5, 5, '#c8784a', '#7a4a2a', 1.2);
      } else { // bowl
        g.fillStyle = '#ffffff'; g.strokeStyle = '#5a6a7a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(60, 120); g.quadraticCurveTo(140, 220, 220, 120); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#8fc6e8'; g.fillRect(100, 175, 80, 5);
        g.fillStyle = liquid; g.beginPath(); g.ellipse(140, 122, 74, 12, 0, 0, Math.PI * 2); g.fill();
      }
    }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (!done) { prog = Math.min(1, prog + dt / DUR); if (prog >= 1) { done = true; G.audio.sfx('rare'); title.textContent = `✨ ${name} 완성!`; hint.textContent = '눌러서 받기'; for (let k = 0; k < 24; k++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 90; sparks.push({ x: 140, y: 110, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, l: 0.9, c: ['#ffd24d', '#ff8fb1', '#8fd3ff', '#9ad66e'][k % 4] }); } } }
      else doneT += dt;
      stir = Math.max(0, stir - dt * 3);
      bar.style.width = (prog * 100).toFixed(1) + '%';
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#fff6e8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f0dcc0'; g.fillRect(0, 176, W, 34); // 부뚜막
      vessel();
      // 재료 떨어지기 → 담기면 둥둥 떠서 돌기
      for (const dr of drops) {
        if (t < dr.at) continue;
        const top = tool === 'pan' ? 140 : tool === 'grill' ? 138 : tool === 'oven' ? 132 : 108;
        if (!dr.landed) { dr.y += (120 + (t - dr.at) * 600) * dt; if (dr.y >= top) { dr.y = top; dr.landed = true; G.audio.sfx(tool === 'pan' || tool === 'grill' ? 'shake' : 'plop'); for (let k = 0; k < 6; k++) bubbles.push({ x: dr.x + (Math.random() - 0.5) * 20, y: top, vy: -40 - Math.random() * 40, l: 0.6 }); } }
        const k = Math.max(0, 1 - prog * 1.3), ang = t * (1 + stir * 4) + dr.at * 3;
        const x = dr.landed ? 140 + Math.cos(ang) * (36 + dr.at * 6) * (tool === 'oven' ? 0.6 : 1) : dr.x, y = dr.landed ? dr.y + Math.sin(ang) * 4 - (tool === 'pan' || tool === 'grill' ? Math.abs(Math.sin(t * 9 + dr.at * 5)) * 8 * (1 + stir) : 0) : dr.y;
        if (dr.landed && k <= 0.02) continue;
        g.globalAlpha = dr.landed ? Math.max(0.15, k) : 1; if (dr.im.complete) g.drawImage(dr.im, x - 14, y - 22, 28, 28); g.globalAlpha = 1;
      }
      // 보글보글·지글지글
      if (Math.random() < (tool === 'bowl' ? 0.05 : 0.35 + prog * 0.3) * (1 + stir)) bubbles.push({ x: 90 + Math.random() * 100, y: tool === 'pan' ? 146 : tool === 'grill' ? 140 : tool === 'oven' ? 120 : 112, vy: -30 - Math.random() * 30, l: 0.7 });
      for (const b of bubbles) { b.y += b.vy * dt; b.l -= dt; g.globalAlpha = Math.max(0, b.l); g.strokeStyle = tool === 'pan' || tool === 'grill' ? '#ffe9a0' : '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, tool === 'pan' || tool === 'grill' ? 1.6 : 3, 0, 6.3); g.stroke(); }
      g.globalAlpha = 1; for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].l <= 0) bubbles.splice(i, 1);
      // 김
      g.strokeStyle = 'rgba(200,200,215,0.6)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1, x = 110 + k * 30; g.globalAlpha = (1 - ph) * (0.3 + prog * 0.7); g.beginPath(); g.moveTo(x, 96 - ph * 60); g.quadraticCurveTo(x + 10, 80 - ph * 60, x, 64 - ph * 60); g.stroke(); }
      g.globalAlpha = 1;
      // 국자·뒤집개 (누르면 크게 젓기)
      if (tool === 'pot' || tool === 'bowl') { const a = Math.sin(t * (2 + stir * 8)) * (0.35 + stir * 0.4); g.save(); g.translate(150 + Math.sin(t * 2) * 10, 104); g.rotate(a - 0.5); g.fillStyle = '#c9a66b'; g.strokeStyle = '#7a5a3a'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(-3, -70, 6, 66, 3); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -2, 10, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); }
      if (tool === 'pan' || tool === 'grill') { const a = -0.6 + Math.sin(t * (3 + stir * 10)) * (0.2 + stir * 0.4); g.save(); g.translate(170, 132); g.rotate(a); g.fillStyle = '#c9a66b'; g.strokeStyle = '#7a5a3a'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(-2.5, -70, 5, 56, 2); g.fill(); g.stroke(); g.fillStyle = '#b8c0c8'; g.beginPath(); g.roundRect(-10, -16, 20, 14, 3); g.fill(); g.stroke(); g.restore(); }
      // 완성: 요리가 떠오르며 반짝
      if (done) {
        const k = ease(Math.min(1, doneT / 0.5)), s = 0.4 + k * 0.9 + Math.sin(doneT * 4) * 0.03;
        g.save(); g.translate(140, 100 - k * 20);
        g.globalAlpha = 0.5 * k; for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.fillStyle = i % 2 ? '#fff2b0' : '#ffe08a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-8, -90); g.lineTo(8, -90); g.fill(); }
        g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(0, 0, 44 * s, 0, 6.3); g.fill();
        if (dishIm.complete) g.drawImage(dishIm, -40 * s, -40 * s, 80 * s, 80 * s);
        g.restore();
      }
      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; p.l -= dt; g.globalAlpha = Math.max(0, p.l); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 3, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      if (done && doneT > 2.4) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    G.audio.sfx('open');
    raf = requestAnimationFrame(frame);
  });
  G.modules.add('cook');
})(globalThis.G);
