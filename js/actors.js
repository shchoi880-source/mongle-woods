// 캐릭터·생물·아이콘 그림 (실시간 벡터). 눈은 한순간도 멈춰 있지 않다(느낌 #1).
(function (G) {
  'use strict';
  const A = G.art, P = A.paint, C = A.C;
  const LINE = C.line;

  const SKIN = ['#ffe3cf', '#f9d2b4', '#eebd96', '#d79f76', '#b7805a', '#8d5f40', '#fff0e6', '#f5c6b0'];
  const HAIRC = ['#5b3b2a', '#2f2a2a', '#c98a4a', '#f2cf73', '#ff9ab8', '#8fb4ff', '#9bdc9a', '#c9a0ff', '#e86e5a', '#ffffff', '#7a5a9a', '#3d6b8f'];
  const SHIRT = ['#8fd3ff', '#ffb3c7', '#b8e68f', '#ffd98a', '#c9b3ff', '#ffffff', '#ff9f80', '#7fdcc4'];
  A.LOOK = { SKIN, HAIRC, SHIRT, HAIRS: 4 };

  // 종별 프리셋
  const SPECIES = {
    human: {},
    rabbit: { fur: '#fff6f2', furD: '#f1dcd6', inner: '#ffc2d1' },
    hedgehog: { fur: '#f3dcc0', furD: '#e2c4a0', spine: '#9a6b4b', spineD: '#7a5034' },
    mole: { fur: '#8a7366', furD: '#6f5a4e', nose: '#ff9fb4' },
  };

  // a: {x,y,dir,species,look,walk,moving,run,t0,blinkT,emote,emoteT,hop,sleep,tool,swing}
  A.actor = {
    draw(ctx, a, t) {
      const sp = SPECIES[a.species] || {};
      const L = a.look || {};
      const dir = a.dir | 0;
      const flip = dir === 3 ? -1 : 1; // 오른쪽 = 왼쪽 반전
      const side = dir === 1 || dir === 3, back = dir === 2;
      // 애니 값
      const breath = Math.sin(t * 2.6 + (a.seed || 0)) * 0.025;
      const ph = a.walk || 0;
      const step = a.moving ? Math.sin(ph * Math.PI * 2) : 0;
      const bob = a.moving ? Math.abs(Math.sin(ph * Math.PI * 2)) * -2.2 : 0;
      const hop = a.hop || 0;
      const sq = a.squash || 0; // 착지 스쿼시
      ctx.save();
      ctx.translate(a.x, a.y);
      // 그림자
      P.shadow(ctx, 0, 0, 20 - Math.min(hop, 10) * 0.6, 0.24);
      ctx.translate(0, bob - hop);
      ctx.scale(flip * (1 + sq * 0.5), 1 + breath - sq);
      // 발
      const fc = a.species === 'human' ? '#7a5a4a' : sp.furD;
      if (!a.sit) {
        P.blob(ctx, -4.5, -2 + (step > 0 ? -1.8 * step : 0), 3.6, 2.6, fc, LINE, 1.2);
        P.blob(ctx, 4.5, -2 + (step < 0 ? 1.8 * step : 0), 3.6, 2.6, fc, LINE, 1.2);
      }
      // 몸통
      const bodyC = a.species === 'human' ? SHIRT[L.shirt | 0] : (L.body || sp.fur);
      P.blob(ctx, 0, -11, 9, 9.5, bodyC, LINE, 1.5);
      if (a.species === 'hedgehog') P.rrect(ctx, -6, -14, 12, 11, 3, '#fff7e8', LINE, 1); // 앞치마
      if (a.species === 'mole' && L.apron) P.rrect(ctx, -6, -15, 12, 11, 3, L.apron, LINE, 1);
      // 팔
      const armSw = a.moving ? step * 2.5 : 0;
      const armC = a.species === 'human' ? SKIN[L.skin | 0] : sp.fur;
      if (!side) {
        P.blob(ctx, -9, -11 + armSw, 2.8, 4, armC, LINE, 1.2);
        P.blob(ctx, 9, -11 - armSw, 2.8, 4, armC, LINE, 1.2);
      } else {
        P.blob(ctx, 1 + armSw, -10, 2.8, 4, armC, LINE, 1.2);
      }
      // 도구 (오른손)
      if (a.tool && a.tool !== 'hand') this.tool(ctx, a, t, side, back);
      // 머리
      ctx.save();
      ctx.translate(0, -29);
      const tilt = a.tilt || 0; ctx.rotate(tilt);
      this.head(ctx, a, sp, L, side, back, t);
      ctx.restore();
      ctx.restore();
    },
    head(ctx, a, sp, L, side, back, t) {
      const sk = a.species === 'human' ? SKIN[L.skin | 0] : sp.fur;
      // 귀 (토끼)
      if (a.species === 'rabbit') {
        const w = Math.sin(t * 1.7) * 0.06;
        for (const s of side ? [1] : [-1, 1]) {
          ctx.save(); ctx.translate(s * 5 + (side ? 2 : 0), -11); ctx.rotate(s * 0.18 + w + (side ? 0.25 : 0));
          P.blob(ctx, 0, -9, 4.5, 11, sp.fur, LINE, 1.5);
          if (!back) P.blob(ctx, 0, -9, 2.2, 8, sp.inner);
          if (s === 1) P.blob(ctx, 1, -1, 2.6, 2.6, '#ffd24d', LINE, 1); // 방울
          ctx.restore();
        }
      }
      if (a.species === 'hedgehog') {
        ctx.fillStyle = sp.spine; ctx.strokeStyle = LINE; ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let k = 0; k < 9; k++) {
          const an = Math.PI * (0.95 + k * 0.14) + (side ? 0.6 : 0);
          const x0 = Math.cos(an) * 12, y0 = Math.sin(an) * 12;
          ctx.moveTo(x0 * 0.7, y0 * 0.7); ctx.lineTo(Math.cos(an + 0.08) * 19, Math.sin(an + 0.08) * 19); ctx.lineTo(Math.cos(an + 0.3) * 12, Math.sin(an + 0.3) * 12);
        }
        ctx.fill(); ctx.stroke();
        // 가시에 꽂힌 편지
        P.rrect(ctx, 6, -18, 9, 6, 1, '#ffffff', LINE, 1);
      }
      if (a.species === 'mole') {
        for (const s of side ? [1] : [-1, 1]) P.blob(ctx, s * 10, -8, 3.2, 3.2, sp.furD, LINE, 1.2);
      }
      // 머리통
      P.blob(ctx, 0, 0, 13, 12, sk, LINE, 1.6);
      if (a.species === 'hedgehog') P.blob(ctx, side ? -3 : 0, 3, 9, 8, '#fff3e0');
      if (a.species === 'rabbit') P.blob(ctx, side ? -3 : 0, 4, 8, 6, '#ffffff');
      // 사람 머리카락
      if (a.species === 'human') this.hair(ctx, L, side, back);
      if (back) { if (a.species === 'mole' && L.band) P.rrect(ctx, -12, -8, 24, 4, 2, L.band); return; }
      // 얼굴
      const ex = side ? [-6] : [-5, 5];
      const blink = this.blink(a, t);
      for (const x of ex) {
        const eh = a.species === 'mole' ? 1.4 : 3.1;
        if (a.sleep || blink < 0.2) { ctx.strokeStyle = LINE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 2, 1); ctx.quadraticCurveTo(x, 2.4, x + 2, 1); ctx.stroke(); }
        else {
          P.blob(ctx, x, 0.5, 2.3, eh * blink, '#2d2430');
          if (a.species !== 'mole') { P.blob(ctx, x - 0.7, -0.8, 0.9, 0.9, '#ffffff'); P.blob(ctx, x + 0.8, 1.6, 0.45, 0.45, '#ffffff'); }
        }
      }
      // 볼
      ctx.globalAlpha = 0.55;
      for (const x of side ? [-8] : [-8, 8]) P.blob(ctx, x, 5, 2.8, 1.8, '#ff9fb4');
      ctx.globalAlpha = 1;
      // 코·입
      if (a.species === 'mole') P.blob(ctx, side ? -10 : 0, 4, 3.6, 2.8, SPECIES.mole.nose, LINE, 1.1);
      else if (a.species === 'hedgehog') P.blob(ctx, side ? -12 : 0, 4, 1.8, 1.4, '#3a2a2a');
      else if (a.species === 'rabbit') P.blob(ctx, side ? -10 : 0, 3.6, 1.4, 1, '#ff8fa8');
      ctx.strokeStyle = LINE; ctx.lineWidth = 1.2; ctx.beginPath();
      const mx = side ? -8 : 0;
      if (a.mouth === 'o') { ctx.ellipse(mx, 7, 1.4, 1.6, 0, 0, Math.PI * 2); }
      else { ctx.moveTo(mx - 1.8, 6.4); ctx.quadraticCurveTo(mx - 0.9, 7.6, mx, 6.6); ctx.quadraticCurveTo(mx + 0.9, 7.6, mx + 1.8, 6.4); }
      ctx.stroke();
      if (a.species === 'mole' && L.band) P.rrect(ctx, -12, -8, 24, 4, 2, L.band, LINE, 1);
      if (a.species === 'mole' && L.ribbon) { P.blob(ctx, 8, -10, 3.5, 2.5, L.ribbon, LINE, 1); P.blob(ctx, 13, -10, 3.5, 2.5, L.ribbon, LINE, 1); }
      if (a.species === 'hedgehog') { ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-5, 0.5, 3.4, 0, Math.PI * 2); if (!side) ctx.arc(5, 0.5, 3.4, 0, Math.PI * 2); ctx.stroke(); }
    },
    hair(ctx, L, side, back) {
      const c = HAIRC[L.hairC | 0], style = L.hair | 0;
      ctx.fillStyle = c; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (back) { ctx.ellipse(0, -1, 13.5, 12.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else {
        ctx.ellipse(0, -4, 13.6, 9.5, 0, Math.PI, Math.PI * 2);
        if (side) ctx.quadraticCurveTo(-4, -6, -14, 0); else { ctx.quadraticCurveTo(7, -1, 3, -4); ctx.quadraticCurveTo(-2, 0, -6, -4); ctx.quadraticCurveTo(-10, -1, -13.6, -4); }
        ctx.fill(); ctx.stroke();
      }
      if (style === 1) { P.blob(ctx, side ? 8 : 12, 4, 4, 7, c, LINE, 1.3); if (!side) P.blob(ctx, -12, 4, 4, 7, c, LINE, 1.3); }      // 단발
      if (style === 2) { P.blob(ctx, side ? 10 : 0, -12, 5, 5, c, LINE, 1.3); }                                                         // 똥머리
      if (style === 3) { for (const s of side ? [1] : [-1, 1]) { P.blob(ctx, s * 14, 2, 3.5, 5, c, LINE, 1.3); } }                       // 양갈래
      if (style === 0 && !back) { ctx.beginPath(); ctx.moveTo(-2, -12); ctx.quadraticCurveTo(2, -17, 5, -13); ctx.stroke(); }           // 삐침 머리
    },
    blink(a, t) {
      // 2.2~5.8초 간격, 18% 더블 깜빡임. 닫힘 50ms → 유지 40 → 뜨기 80
      if (!a.blinkAt || t > a.blinkAt + 0.6) {
        a.blinkAt = t + 2.2 + Math.random() * 3.6; a.dbl = Math.random() < 0.18;
      }
      const k = t - a.blinkAt;
      const one = (d) => d < 0 ? 1 : d < 0.05 ? 1 - d / 0.05 : d < 0.09 ? 0 : d < 0.17 ? (d - 0.09) / 0.08 : 1;
      let v = one(k); if (a.dbl) v = Math.min(v, one(k - 0.22));
      return Math.max(0.08, v);
    },
    forceBlink(a, t) { a.blinkAt = t; a.dbl = false; },
    tool(ctx, a, t, side, back) {
      const sw = a.swing || 0; // 0~1
      ctx.save();
      const hx = side ? 2 : 9, hy = -10;
      ctx.translate(hx, hy);
      ctx.rotate(-0.6 + sw * 2.2 * (side ? -1 : 1) + (back ? 0.3 : 0));
      if (a.tool === 'net') {
        ctx.strokeStyle = '#a7724a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
        P.blob(ctx, 0, -28, 6, 7, 'rgba(255,255,255,0.55)', LINE, 1.3);
      } else if (a.tool === 'rod') {
        ctx.strokeStyle = '#a7724a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
        P.blob(ctx, 0, -6, 2.5, 2.5, '#ff7a7a', LINE, 1);
      } else if (a.tool === 'shovel') {
        ctx.strokeStyle = '#a7724a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -18); ctx.stroke();
        P.rrect(ctx, -4, -26, 8, 9, [1, 1, 4, 4], '#c9d3da', LINE, 1.2);
      }
      ctx.restore();
    },
  };

  // ---------- 콩알 (모자 위 솜뭉치) ----------
  A.kongal = (ctx, x, y, k, t) => {
    // k: {sx,sy (스프링 오프셋), mood, jump}
    const breath = Math.sin(t * 3.1) * 0.05;
    ctx.save(); ctx.translate(x + (k.ox || 0), y + (k.oy || 0) - (k.jump || 0));
    ctx.scale(1 + breath * 0.5, 1 - breath);
    P.blob(ctx, 0, 0, 7, 6, '#ffffff', LINE, 1.3);
    P.blob(ctx, -4, -3, 3, 3, '#ffffff'); P.blob(ctx, 3, -4, 3.4, 3, '#ffffff');
    if (k.sleep) {
      ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3.5, 0.5); ctx.lineTo(-1.5, 0.5); ctx.moveTo(1.5, 0.5); ctx.lineTo(3.5, 0.5); ctx.stroke();
    } else {
      const bl = k.blink || 1;
      P.blob(ctx, -2.5, 0.5, 1.1, 1.5 * bl, '#2d2430'); P.blob(ctx, 2.5, 0.5, 1.1, 1.5 * bl, '#2d2430');
    }
    ctx.globalAlpha = 0.5; P.blob(ctx, -4.6, 2.5, 1.4, 0.9, '#ff9fb4'); P.blob(ctx, 4.6, 2.5, 1.4, 0.9, '#ff9fb4'); ctx.globalAlpha = 1;
    if (k.ear) { P.blob(ctx, -4, -6.5, 1.4, 2.6, '#ffffff', LINE, 1); P.blob(ctx, 4, -6.5, 1.4, 2.6, '#ffffff', LINE, 1); }
    ctx.restore();
  };

  // ---------- 감정 팝 ----------
  A.emote = (ctx, x, y, kind, k) => {
    // k: 0~1 진행 → 0→1.25(120ms) → 0.92(80) → 1.0(100)
    const s = k < 0.3 ? (k / 0.3) * 1.25 : k < 0.5 ? 1.25 - (k - 0.3) / 0.2 * 0.33 : k < 0.75 ? 0.92 + (k - 0.5) / 0.25 * 0.08 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    P.rrect(ctx, -9, -9, 18, 16, 7, '#ffffff', LINE, 1.3);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(0, 11); ctx.lineTo(3, 6); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(0, 11); ctx.lineTo(3, 7); ctx.stroke();
    if (kind === 'heart') { ctx.fillStyle = '#ff6b8b'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-7, -1, -4, -7, 0, -3); ctx.bezierCurveTo(4, -7, 7, -1, 0, 4); ctx.fill(); }
    else if (kind === 'note') { ctx.fillStyle = '#6b8bff'; ctx.fillRect(0, -6, 1.6, 8); P.blob(ctx, -1.5, 2, 2.6, 2, '#6b8bff'); ctx.fillRect(0, -6, 4, 1.6); }
    else { ctx.fillStyle = kind === 'q' ? '#4a90e2' : '#ff8a3a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(kind === 'q' ? '?' : kind === 'zz' ? 'z' : '!', 0, -1); }
    ctx.restore();
  };

  // ---------- 곤충 ----------
  A.bug = (ctx, b, t) => {
    const sp = b.sp, col = sp.col, s = 0.9 + (b.sizeK || 0) * 0.35;
    ctx.save(); ctx.translate(b.x, b.y - (b.alt || 0));
    if (b.alt) { ctx.save(); ctx.translate(0, b.alt); P.shadow(ctx, 0, 0, 8, 0.18); ctx.restore(); } else P.shadow(ctx, 0, 1, 7, 0.18);
    ctx.scale(s * (b.face < 0 ? -1 : 1), s);
    const flap = Math.sin(t * 22 + b.seed) ;
    switch (sp.tpl) {
      case 'butterfly': case 'moth': {
        const w = 0.35 + Math.abs(flap) * 0.65;
        ctx.save(); ctx.scale(w, 1);
        P.blob(ctx, -5, -3, 5.5, 4.5, col[0], LINE, 1.1); P.blob(ctx, 5, -3, 5.5, 4.5, col[0], LINE, 1.1);
        P.blob(ctx, -4, 3, 3.6, 3.2, col[1], LINE, 1.1); P.blob(ctx, 4, 3, 3.6, 3.2, col[1], LINE, 1.1);
        if (sp.tpl === 'moth') { P.blob(ctx, -5, -3, 1.6, 1.6, '#ffffff'); P.blob(ctx, 5, -3, 1.6, 1.6, '#ffffff'); }
        ctx.restore();
        P.rrect(ctx, -1.2, -5, 2.4, 10, 1.2, '#4a3a3a');
        break;
      }
      case 'dragonfly': {
        const w = 0.6 + Math.abs(flap) * 0.4;
        ctx.fillStyle = 'rgba(230,245,255,0.8)'; ctx.strokeStyle = 'rgba(91,70,54,0.5)'; ctx.lineWidth = 0.8;
        for (const [x, y] of [[-6, -2], [6, -2], [-5, 2], [5, 2]]) { ctx.beginPath(); ctx.ellipse(x * w, y, 6 * w, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        P.rrect(ctx, -1.4, -6, 2.8, 14, 1.4, col[0], LINE, 1); P.blob(ctx, 0, -6, 2.4, 2.2, col[1]);
        break;
      }
      case 'ladybug': P.blob(ctx, 0, 0, 4.5, 4, col[0], LINE, 1.1); P.blob(ctx, 0, -4, 2.4, 1.8, col[1]); ctx.fillStyle = col[1]; ctx.fillRect(-0.4, -3, 0.8, 7); P.blob(ctx, -2, 0, 1, 1, col[1]); P.blob(ctx, 2, 1.5, 1, 1, col[1]); break;
      case 'pillbug': for (let k = 0; k < 4; k++) P.blob(ctx, -3 + k * 2, 0, 2.6, 3.4, k % 2 ? col[0] : col[1], k === 0 ? LINE : null, 1); P.blob(ctx, -5, 0, 1.6, 2.4, col[1], LINE, 1); break;
      case 'ant': P.blob(ctx, -3.5, 0, 2.4, 2, col[0]); P.blob(ctx, 0, 0, 1.6, 1.4, col[0]); P.blob(ctx, 3.2, 0, 2.8, 2.2, col[0]); ctx.strokeStyle = col[1]; ctx.lineWidth = 0.7; ctx.beginPath(); for (const x of [-1, 0.5, 2]) { ctx.moveTo(x, 0); ctx.lineTo(x - 1 + flap * 0.6, 3); ctx.moveTo(x, 0); ctx.lineTo(x - 1 - flap * 0.6, -3); } ctx.stroke(); break;
      case 'cricket': P.blob(ctx, 0, 0, 5.5, 2.8, col[0], LINE, 1); P.blob(ctx, -5, -0.5, 2.2, 2.2, col[1]); ctx.strokeStyle = col[1]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(5, -4); ctx.lineTo(7, 1); ctx.moveTo(-6, -1); ctx.lineTo(-10, -5); ctx.stroke(); break;
      case 'beetle': P.blob(ctx, 0, 1, 5, 6, col[0], LINE, 1.2); P.blob(ctx, 0, -5, 3, 2.4, col[1], LINE, 1); ctx.strokeStyle = col[1]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(0, -11, 3, -12); ctx.stroke(); P.blob(ctx, -1.5, -1, 1.4, 2.4, 'rgba(255,255,255,0.35)'); break;
      case 'firefly': {
        const glow = 0.5 + 0.5 * Math.sin(t * 3 + b.seed);
        ctx.globalAlpha = glow * 0.6; P.blob(ctx, 0, 2, 7, 7, '#efff9a'); ctx.globalAlpha = 1;
        P.blob(ctx, 0, 0, 2.2, 3.4, col[1]); P.blob(ctx, 0, 2.5, 1.8, 1.8, col[0]);
        break;
      }
      default: P.blob(ctx, 0, 0, 4, 3, col[0], LINE, 1);
    }
    ctx.restore();
    // ★4+ 반짝 링
    if (sp.tier >= 3) { const k = (t * 0.8 + b.seed) % 1; ctx.strokeStyle = `rgba(255,240,150,${0.6 * (1 - k)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y - (b.alt || 0), 6 + k * 8, 0, Math.PI * 2); ctx.stroke(); }
  };

  // ---------- 물고기 그림자 ----------
  A.fishShadow = (ctx, f, t) => {
    const s = [0, 5, 7, 9, 12, 15][f.shadow] || 6;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang || 0);
    const wig = Math.sin(t * 8 + f.seed) * 0.25;
    ctx.fillStyle = 'rgba(30,60,90,0.38)';
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(-s * 1.5, -s * 0.35 + wig * s * 0.3); ctx.lineTo(-s * 1.5, s * 0.35 + wig * s * 0.3); ctx.fill();
    ctx.restore();
  };

  // ---------- 아이콘 (32×32 좌표계) ----------
  const FISHCOL = { pale_chub: ['#cfe0f0', '#ff9a8a'], minnow: ['#c8c39a', '#8b8a64'], catfish: ['#6b6258', '#4a433c'], medaka: ['#f3e2b0', '#c9b27a'], crucian: ['#c9b37a', '#9c8550'], carp: ['#f39a5a', '#fff2e0'], smelt: ['#e8f0ff', '#a8b8d8'], horse_mackerel: ['#a9c3d6', '#e9eef2'], mackerel: ['#6a9fc0', '#2f5a7a'], red_seabream: ['#ff8c8c', '#ffd1c4'] };
  A.drawIcon = (g, id, t = 0) => {
    if (id.startsWith('furn:')) { const [k, c] = id.slice(5).split('#'); G.house.drawIcon(g, k, { c: +c || 0 }); return; }
    const [cat, key] = id.indexOf(':') > 0 ? id.split(':') : [id, id];
    g.save();
    if (cat === 'bug') {
      const sp = G.data.get('bugs', key);
      g.translate(16, 17); g.scale(2.1, 2.1);
      A.bug(g, { sp, x: 0, y: 0, seed: 0.3, alt: 0, face: 1 }, 0.07);
    } else if (cat === 'fish') {
      const [c1, c2] = FISHCOL[key] || ['#9fc5e0', '#ffffff'];
      g.translate(16, 17);
      g.fillStyle = c1; g.strokeStyle = LINE; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(1, 0, 11, 6.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-9, 0); g.lineTo(-15, -6); g.lineTo(-15, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c2; g.beginPath(); g.ellipse(2, 2.5, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
      P.blob(g, 7, -1.5, 1.6, 1.6, '#2d2430'); P.blob(g, 6.5, -2.1, 0.6, 0.6, '#fff');
      if (key === 'catfish') { g.strokeStyle = LINE; g.beginPath(); g.moveTo(11, 1); g.quadraticCurveTo(15, 3, 14, 7); g.stroke(); }
    } else if (cat === 'fossil') {
      P.blob(g, 16, 18, 12, 10, '#d8c7a8', LINE, 1.4);
      g.strokeStyle = '#9a8566'; g.lineWidth = 1.5; g.beginPath();
      if (key === 'ammonite') { for (let a = 0, r = 1; a < 12; a += 0.3, r += 0.2) g.lineTo(16 + Math.cos(a) * r * 0.9, 18 + Math.sin(a) * r * 0.75); }
      else if (key === 'trilobite') { g.ellipse(16, 18, 5, 7, 0, 0, Math.PI * 2); for (let k = -1; k <= 1; k++) { g.moveTo(11, 18 + k * 3); g.lineTo(21, 18 + k * 3); } }
      else if (key === 'fern_fossil') { g.moveTo(16, 10); g.lineTo(16, 26); for (let k = 0; k < 5; k++) { g.moveTo(16, 12 + k * 3); g.lineTo(11, 10 + k * 3); g.moveTo(16, 12 + k * 3); g.lineTo(21, 10 + k * 3); } }
      else { g.moveTo(12, 24); g.quadraticCurveTo(16, 8, 20, 24); g.closePath(); }
      g.stroke();
    } else if (cat === 'shell') {
      const sh = G.data.get('shells', key);
      if (key === 'conch') { P.blob(g, 16, 18, 8, 10, sh.col, LINE, 1.4); g.strokeStyle = '#d9a87a'; g.beginPath(); g.arc(16, 15, 4, 0, Math.PI * 1.5); g.stroke(); }
      else if (key === 'coral') { g.strokeStyle = sh.col; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, 27); g.lineTo(16, 12); g.moveTo(16, 19); g.lineTo(10, 12); g.moveTo(16, 17); g.lineTo(22, 10); g.stroke(); }
      else if (key === 'urchin_shell') { P.blob(g, 16, 18, 10, 8, sh.col, LINE, 1.4); for (let k = 0; k < 8; k++) P.blob(g, 16 + Math.cos(k) * 6, 18 + Math.sin(k) * 4.5, 1, 1, '#fff'); }
      else if (key === 'pearl_oyster') { P.blob(g, 16, 19, 11, 7, '#bfb6d6', LINE, 1.4); P.blob(g, 16, 16, 4.5, 4.5, sh.col, LINE, 1); P.blob(g, 14.6, 14.6, 1.4, 1.4, '#fff'); }
      else { g.fillStyle = sh.col; g.strokeStyle = LINE; g.lineWidth = 1.4; g.beginPath(); g.moveTo(16, 27); g.lineTo(5, 15); g.quadraticCurveTo(16, 2, 27, 15); g.closePath(); g.fill(); g.stroke(); g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(16, 26); g.lineTo(16 + k * 4.5, 9 + Math.abs(k) * 2); } g.strokeStyle = 'rgba(150,100,70,0.5)'; g.stroke(); }
    } else if (id === 'branch') {
      g.strokeStyle = '#a7724a'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 26); g.lineTo(26, 8); g.moveTo(16, 17); g.lineTo(20, 24); g.stroke();
      P.blob(g, 21, 25, 3, 2, '#8fd16a');
    } else if (id === 'fruit_acorn') {
      P.blob(g, 16, 19, 7, 8, '#c98e5a', LINE, 1.4); P.rrect(g, 8, 9, 16, 7, 4, '#8b6a46', LINE, 1.4); g.fillStyle = '#7a5230'; g.fillRect(15, 5, 2, 5);
    } else if (cat === 'letter' || id.startsWith('letter')) {
      P.rrect(g, 4, 9, 24, 16, 2, '#ffffff', LINE, 1.4); g.strokeStyle = '#ff8a7a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, 9); g.lineTo(16, 19); g.lineTo(28, 9); g.stroke(); P.blob(g, 16, 20, 2.4, 2.4, '#ff6b8b');
    } else if (cat === 'tool') {
      g.translate(16, 28);
      A.actor.tool(g, { tool: key, swing: 0.27 }, 0, false, false);
    } else if (id === 'money') {
      P.blob(g, 16, 18, 10, 10, '#a7e3ff', LINE, 1.4); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(13, 14, 3, 2, -0.5, 0, Math.PI * 2); g.fill();
    } else {
      P.blob(g, 16, 16, 9, 9, '#ddd', LINE, 1.4);
    }
    g.restore();
  };
  // DOM용 아이콘 캔버스 (캐시)
  const iconCache = new Map();
  A.iconURL = (id, px = 64) => {
    const k = id + '@' + px; if (iconCache.has(k)) return iconCache.get(k);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d'); g.scale(px / 32, px / 32); A.drawIcon(g, id);
    const url = c.toDataURL(); iconCache.set(k, url); return url;
  };

  G.modules.add('actors');
})(globalThis.G);
