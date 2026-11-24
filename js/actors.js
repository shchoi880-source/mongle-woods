// 캐릭터·생물·아이콘 그림 (실시간 벡터). 눈은 한순간도 멈춰 있지 않다(느낌 #1).
(function (G) {
  'use strict';
  const A = G.art, P = A.paint, C = A.C;
  const LINE = C.line;

  const SKIN = ['#ffe3cf', '#f9d2b4', '#eebd96', '#d79f76', '#b7805a', '#8d5f40', '#fff0e6', '#f5c6b0', '#ffd6c0', '#e0a982', '#6f4630', '#c58c6a'];
  const HAIRC = ['#5b3b2a', '#2f2a2a', '#c98a4a', '#f2cf73', '#ff9ab8', '#8fb4ff', '#9bdc9a', '#c9a0ff', '#e86e5a', '#ffffff', '#7a5a9a', '#3d6b8f', '#a0522d', '#ffd1dc', '#ffa94d', '#5fd3c4', '#b0b8c8', '#ffe14d'];
  const SHIRT = ['#8fd3ff', '#ffb3c7', '#b8e68f', '#ffd98a', '#c9b3ff', '#ffffff', '#ff9f80', '#7fdcc4', '#ff6b6b', '#4d96ff', '#ffd24d', '#6bcb77', '#9d7bd8', '#ff8fd0', '#8a6a55', '#46546a', '#ff9a3a', '#a0e7e5'];
  const SHOES = ['#7a5a4a', '#ff6b6b', '#4d96ff', '#ffffff', '#2f2a2a', '#ffd24d', '#ff8fd0', '#6bcb77'];
  // 꾸미기 항목 (오너 요청 2026-11: 언제든 바꾸고, 스타일 다양하게). 새 항목은 끝에만 추가(세이브 호환)
  const PARTS = [
    { k: 'skin', cat: 'face', name: '피부', colors: SKIN },
    { k: 'eyes', cat: 'face', name: '눈', names: ['동글', '방긋', '반짝', '졸린', '콩알', '속눈썹', '초롱'] },
    { k: 'mouth', cat: 'face', name: '입', names: ['기본', '미소', '고양이', '활짝', '오'] },
    { k: 'cheek', cat: 'face', name: '볼', names: ['분홍', '없음', '주근깨', '발그레', '반창고'] },
    { k: 'hair', cat: 'hair', name: '머리 모양', names: ['삐침', '단발', '똥머리', '양갈래', '긴 생머리', '포니테일', '짧은 머리', '뽀글', '옆 가르마', '땋은 머리', '양 똥머리', '공주 머리', '뾰족', '웨이브', '바가지'] },
    { k: 'hairC', cat: 'hair', name: '머리 색', colors: HAIRC },
    { k: 'outfit', cat: 'wear', name: '옷 모양', names: ['티셔츠', '멜빵', '원피스', '후드', '줄무늬', '앞치마', '조끼', '하트 니트', '세일러', '한복 저고리', '잠옷', '노란 우비', '턱시도', '공주 드레스', '운동복'],
      locks: { 9: 'shop', 10: 'shop', 11: 'shop', 12: 'shop', 13: 'shop', 14: 'shop' } }, // 9~14: 옷 가게
    { k: 'shirt', cat: 'wear', name: '옷 색', colors: SHIRT },
    { k: 'shirt2', cat: 'wear', name: '포인트 색', colors: SHIRT },
    { k: 'shoes', cat: 'wear', name: '신발', colors: SHOES },
    { k: 'hat', cat: 'acc', name: '모자·장식', names: ['없음', '비니', '야구모자', '밀짚모자', '리본', '화관', '고양이 귀', '토끼 귀', '새싹', '왕관', '베레모', '별 핀', '헤드폰', '벚꽃 핀', '수박 모자', '호박 모자', '눈송이 왕관', '황금 왕관', '마녀 모자', '해적 모자', '공룡 모자', '개구리 모자', '요리사 모자', '곰돌이 귀'],
      locks: { 13: 'blossom', 14: 'summer', 15: 'autumn', 16: 'winter', 17: 'gold', 18: 'shop', 19: 'shop', 20: 'shop', 21: 'shop', 22: 'shop', 23: 'shop' } }, // 축제 보상·옷 가게(잠금)
    { k: 'hatC', cat: 'acc', name: '장식 색', colors: SHIRT },
    { k: 'glasses', cat: 'acc', name: '안경', names: ['없음', '동그란', '네모', '선글라스', '하트'] },
  ];
  const CATS = [['face', '얼굴'], ['hair', '머리'], ['wear', '옷'], ['acc', '소품']];
  A.LOOK = { SKIN, HAIRC, SHIRT, SHOES, HAIRS: 15, PARTS, CATS,
    count: (pt) => (pt.colors || pt.names).length,
    isLocked: (pt, i) => !!(pt.locks && pt.locks[i] && !(G.player && G.player.unlocks && G.player.unlocks[pt.k + i])),
    random(R = Math.random) { const l = {}; for (const pt of PARTS) { const i = Math.floor(R() * A.LOOK.count(pt)); l[pt.k] = A.LOOK.isLocked(pt, i) ? 0 : i; } if (R() < 0.5) l.hat = 0; if (R() < 0.7) l.glasses = 0; return l; },
    def: () => ({ skin: 0, hair: 0, hairC: 0, shirt: 0, eyes: 0, mouth: 0, cheek: 0, outfit: 0, shirt2: 5, shoes: 0, hat: 0, hatC: 8, glasses: 0 }),
  };

  // 종별 프리셋
  const SPECIES = {
    human: {},
    rabbit: { fur: '#fff6f2', furD: '#f1dcd6', inner: '#ffc2d1' },
    hedgehog: { fur: '#f3dcc0', furD: '#e2c4a0', spine: '#9a6b4b', spineD: '#7a5034' },
    mole: { fur: '#8a7366', furD: '#6f5a4e', nose: '#ff9fb4' },
    otter: { fur: '#b08462', furD: '#8a6448', belly: '#f3dcc0' },
    cat: { fur: '#ffd9a8', furD: '#e9b47a', inner: '#ffb3c2' },
    squirrel: { fur: '#e09a56', furD: '#b8743a', belly: '#ffe9cf', tail: '#cf8442' },
    fox: { fur: '#f08a3c', furD: '#c8662a', belly: '#fff4e6', tail: '#f08a3c' },
    bear: { fur: '#c08a5e', furD: '#9a6a44', belly: '#f0d4b4' },
    hamster: { fur: '#ffd7a0', furD: '#e8b478', belly: '#ffffff' },
    sheep: { fur: '#ffffff', furD: '#d8d2e6', face: '#f6e7d8' },
    penguin: { fur: '#46546a', furD: '#2f3a4a', belly: '#ffffff', feet: '#ffb04a' },
    tortoise: { fur: '#b6d99a', furD: '#8fbf72', shell: '#b08a5a', shellD: '#8a6a40' },
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
      const fc = a.species === 'human' ? SHOES[L.shoes | 0] || SHOES[0] : (sp.feet || sp.furD);
      if (!a.sit) {
        P.blob(ctx, -4.5, -2 + (step > 0 ? -1.8 * step : 0), 3.6, 2.6, fc, LINE, 1.2);
        P.blob(ctx, 4.5, -2 + (step < 0 ? 1.8 * step : 0), 3.6, 2.6, fc, LINE, 1.2);
      }
      // 여우 꼬리
      if (a.species === 'fox') { ctx.save(); ctx.translate(side ? 8 : 8, -6); ctx.rotate(0.9 + Math.sin(t * 1.5) * 0.1); P.blob(ctx, 0, -10, 5, 11, sp.tail, LINE, 1.4); P.blob(ctx, 0, -19, 3, 3.5, '#ffffff'); ctx.restore(); }
      // 다람쥐 꼬리 (몸통 뒤, 크게 말림)
      if (a.species === 'squirrel') {
        const sw = Math.sin(t * 2 + (a.seed || 0)) * 0.08;
        ctx.save(); ctx.translate(side ? 8 : 9, -10); ctx.rotate(sw + (back ? 0.3 : 0));
        P.blob(ctx, 5, -12, 8, 13, sp.tail, LINE, 1.5); P.blob(ctx, 2, -20, 6, 6, sp.tail, LINE, 1.3); P.blob(ctx, 4, -12, 4, 8, sp.belly);
        ctx.restore();
      }
      // 거북 등껍질 (몸통 뒤)
      if (a.species === 'tortoise') {
        P.blob(ctx, 0, -12, 13, 11.5, sp.shell, LINE, 1.6);
        ctx.strokeStyle = sp.shellD; ctx.lineWidth = 1.3; ctx.beginPath();
        for (const [x, y] of [[0, -16], [-7, -10], [7, -10], [0, -6]]) { ctx.moveTo(x + 4, y); for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.cos(k * 1.047) * 4, y + Math.sin(k * 1.047) * 3.4); }
        ctx.stroke();
      }
      // 몸통
      const bodyC = a.species === 'human' ? SHIRT[L.shirt | 0] : (L.body || sp.fur);
      if (a.species === 'human' && (L.outfit | 0) === 13) { ctx.fillStyle = bodyC; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -13); ctx.quadraticCurveTo(-15, -4, -15, 0); ctx.quadraticCurveTo(0, 3, 15, 0); ctx.quadraticCurveTo(15, -4, 6, -13); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = SHIRT[L.shirt2 === undefined ? 5 : L.shirt2 | 0]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -1); ctx.quadraticCurveTo(0, 2, 14, -1); ctx.stroke(); } // 공주 드레스
      if (a.species === 'human' && (L.outfit | 0) === 2) { ctx.fillStyle = bodyC; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7, -12); ctx.lineTo(-12, -2); ctx.quadraticCurveTo(0, 1.5, 12, -2); ctx.lineTo(7, -12); ctx.closePath(); ctx.fill(); ctx.stroke(); } // 원피스 치마
      P.blob(ctx, 0, -11, 9, 9.5, bodyC, LINE, 1.5);
      if (a.species === 'human') this.outfit(ctx, L, side, back, bodyC);
      if (a.species === 'hedgehog') P.rrect(ctx, -6, -14, 12, 11, 3, '#fff7e8', LINE, 1); // 앞치마
      if ((a.species === 'otter' || a.species === 'squirrel' || a.species === 'penguin' || a.species === 'bear' || a.species === 'hamster') && !back) P.blob(ctx, side ? -2 : 0, -10, a.species === 'penguin' ? 7 : 5.5, a.species === 'penguin' ? 8 : 6.5, sp.belly);
      if (L.scarf) P.rrect(ctx, -8, -19.5, 16, 4.5, 2, L.scarf, LINE, 1);
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
      if (a.species === 'fox') for (const s of side ? [1] : [-1, 1]) { ctx.save(); ctx.translate(s * 7 + (side ? 2 : 0), -9); ctx.rotate(s * 0.3); ctx.fillStyle = sp.fur; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(0, -11); ctx.lineTo(5, 2); ctx.closePath(); ctx.fill(); ctx.stroke(); if (!back) { ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(0, -10); ctx.lineTo(2, -5); ctx.fill(); } ctx.restore(); }
      if (a.species === 'cat') {
        for (const s of side ? [1] : [-1, 1]) {
          ctx.save(); ctx.translate(s * 7 + (side ? 2 : 0), -9); ctx.rotate(s * 0.25 + Math.sin(t * 2.3 + (a.seed || 0)) * 0.04);
          ctx.fillStyle = sp.fur; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(0, -8); ctx.lineTo(5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
          if (!back) { ctx.fillStyle = sp.inner; ctx.beginPath(); ctx.moveTo(-2.5, 1); ctx.lineTo(0, -4.5); ctx.lineTo(2.5, 1); ctx.fill(); }
          ctx.restore();
        }
      }
      if (a.species === 'otter') for (const s of side ? [1] : [-1, 1]) P.blob(ctx, s * 10, -8, 3, 3, sp.furD, LINE, 1.2);
      if (a.species === 'bear') for (const s of side ? [1] : [-1, 1]) { P.blob(ctx, s * 9, -9, 4.5, 4.5, sp.fur, LINE, 1.3); if (!back) P.blob(ctx, s * 9, -9, 2.2, 2.2, sp.belly); }
      if (a.species === 'hamster') for (const s of side ? [1] : [-1, 1]) { P.blob(ctx, s * 9, -10, 3.4, 3.4, sp.fur, LINE, 1.2); if (!back) P.blob(ctx, s * 9, -10, 1.8, 1.8, '#ffb3c2'); }
      if (a.species === 'sheep') { for (const s of side ? [1] : [-1, 1]) P.blob(ctx, s * 12, -1, 2.8, 4.5, sp.face, LINE, 1.2); }
      if (a.species === 'squirrel') for (const s of side ? [1] : [-1, 1]) {
        ctx.save(); ctx.translate(s * 8 + (side ? 2 : 0), -9); ctx.rotate(s * 0.2);
        ctx.fillStyle = sp.fur; ctx.strokeStyle = LINE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(0, -7); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        P.blob(ctx, 0, -8, 1.6, 2.4, sp.furD); ctx.restore();
      }
      if (a.species === 'mole') {
        for (const s of side ? [1] : [-1, 1]) P.blob(ctx, s * 10, -8, 3.2, 3.2, sp.furD, LINE, 1.2);
      }
      if (a.species === 'human' && !back) this.hairBack(ctx, L, side);
      if (a.species === 'human' && (L.hat | 0) === 12 && back) this.hat(ctx, L, side, back);
      // 머리통
      P.blob(ctx, 0, 0, 13, 12, sk, LINE, 1.6);
      if (a.species === 'hedgehog') P.blob(ctx, side ? -3 : 0, 3, 9, 8, '#fff3e0');
      if (a.species === 'rabbit') P.blob(ctx, side ? -3 : 0, 4, 8, 6, '#ffffff');
      if (a.species === 'otter' || a.species === 'squirrel' || a.species === 'fox') P.blob(ctx, side ? -4 : 0, 5, 8, 5.5, sp.belly);
      if (a.species === 'penguin') P.blob(ctx, side ? -3 : 0, 2, 10, 8.5, sp.belly);
      if (a.species === 'bear') P.blob(ctx, side ? -6 : 0, 5, 6, 4.5, sp.belly);
      if (a.species === 'hamster') P.blob(ctx, side ? -4 : 0, 5, 8.5, 5.5, sp.belly);
      if (a.species === 'sheep') { P.blob(ctx, side ? -3 : 0, 3, 9, 8, sp.face); for (let k = 0; k < 7; k++) P.blob(ctx, -10 + k * 3.3, -9 - Math.sin(k * 0.9) * 2, 4, 4, sp.fur, LINE, 1); }
      if (a.species === 'tortoise' && !back) { ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-5, 0.5, 3.6, 0, Math.PI * 2); if (!side) ctx.arc(5, 0.5, 3.6, 0, Math.PI * 2); ctx.stroke(); P.rrect(ctx, -9, 9, 18, 3, 1.5, '#ffffff'); }
      if (a.species === 'cat' && !back) { ctx.fillStyle = sp.furD; ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(0, -6); ctx.lineTo(3, -11); ctx.fill(); }
      // 사람 머리카락
      if (a.species === 'human') { this.hair(ctx, L, side, back); this.hat(ctx, L, side, back); }
      if (back) { if (a.species === 'mole' && L.band) P.rrect(ctx, -12, -8, 24, 4, 2, L.band); return; }
      // 얼굴
      const ex = side ? [-6] : [-5, 5];
      const blink = this.blink(a, t);
      const es = a.species === 'human' ? L.eyes | 0 : 0;
      for (const x of ex) {
        const eh = a.species === 'mole' ? 1.4 : 3.1;
        if (es && !a.sleep && this.eye(ctx, es, x, blink)) continue;
        if (a.sleep || blink < 0.2) { ctx.strokeStyle = LINE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 2, 1); ctx.quadraticCurveTo(x, 2.4, x + 2, 1); ctx.stroke(); }
        else {
          P.blob(ctx, x, 0.5, 2.3, eh * blink, '#2d2430');
          if (a.species !== 'mole') { P.blob(ctx, x - 0.7, -0.8, 0.9, 0.9, '#ffffff'); P.blob(ctx, x + 0.8, 1.6, 0.45, 0.45, '#ffffff'); }
        }
      }
      // 볼
      const ck = a.species === 'human' ? L.cheek | 0 : 0;
      if (ck === 0 || ck === 3 || ck === 4) { ctx.globalAlpha = ck === 3 ? 0.75 : 0.55; for (const x of side ? [-8] : [-8, 8]) P.blob(ctx, x, 5, ck === 3 ? 3.8 : 2.8, ck === 3 ? 2.4 : 1.8, '#ff9fb4'); ctx.globalAlpha = 1; }
      if (ck === 2) for (const x of side ? [-8] : [-8, 8]) for (const [dx, dy] of [[-1.5, 4], [1, 3.6], [0, 5.6]]) P.blob(ctx, x + dx, dy, 0.55, 0.55, '#b9785a');
      if (ck === 4 && !side) { ctx.save(); ctx.translate(8, 4.5); ctx.rotate(-0.4); P.rrect(ctx, -3.5, -1.3, 7, 2.6, 1, '#ffe9c4', LINE, 0.7); ctx.restore(); }
      // 코·입
      if (a.species === 'mole') P.blob(ctx, side ? -10 : 0, 4, 3.6, 2.8, SPECIES.mole.nose, LINE, 1.1);
      else if (a.species === 'hedgehog') P.blob(ctx, side ? -12 : 0, 4, 1.8, 1.4, '#3a2a2a');
      else if (a.species === 'rabbit') P.blob(ctx, side ? -10 : 0, 3.6, 1.4, 1, '#ff8fa8');
      else if (a.species === 'penguin') { ctx.fillStyle = '#ffb04a'; ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); const bx = side ? -10 : 0; ctx.moveTo(bx - 3, 4); ctx.lineTo(bx + 3, 4); ctx.lineTo(bx, 7.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (a.species === 'squirrel' || a.species === 'bear' || a.species === 'fox') P.blob(ctx, side ? -10 : 0, 3.6, a.species === 'bear' ? 2.2 : 1.6, a.species === 'bear' ? 1.6 : 1.2, '#5a3a2a');
      else if (a.species === 'hamster' || a.species === 'sheep') P.blob(ctx, side ? -10 : 0, 3.6, 1.3, 1, '#ff8fa8');
      else if (a.species === 'otter' || a.species === 'cat') {
        P.blob(ctx, side ? -10 : 0, 3.6, 1.7, 1.2, a.species === 'cat' ? '#ff8fa8' : '#4a3a35');
        ctx.strokeStyle = 'rgba(91,70,54,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath();
        for (const s of side ? [-1] : [-1, 1]) for (const k of [-1, 1]) { ctx.moveTo(s * 6 + (side ? -4 : 0), 5 + k); ctx.lineTo(s * 12 + (side ? -4 : 0), 4 + k * 2); }
        ctx.stroke();
      }
      if (a.species === 'penguin') { if (a.species === 'mole' && L.band) P.rrect(ctx, -12, -8, 24, 4, 2, L.band, LINE, 1); if (L.bow) { P.blob(ctx, -4, 12.5, 3.5, 2.4, L.bow, LINE, 1); P.blob(ctx, 4, 12.5, 3.5, 2.4, L.bow, LINE, 1); P.blob(ctx, 0, 12.5, 1.6, 1.6, L.bow, LINE, 1); } return; }
      ctx.strokeStyle = LINE; ctx.lineWidth = 1.2; ctx.beginPath();
      const mx = side ? -8 : 0;
      const mo = a.species === 'human' ? L.mouth | 0 : 0;
      if (a.mouth === 'o' || mo === 4) { ctx.ellipse(mx, 7, 1.4, 1.6, 0, 0, Math.PI * 2); }
      else if (mo === 1) { ctx.moveTo(mx - 2.4, 6); ctx.quadraticCurveTo(mx, 8.6, mx + 2.4, 6); }
      else if (mo === 2) { ctx.moveTo(mx - 2.6, 6); ctx.quadraticCurveTo(mx - 1.3, 8, mx, 6.4); ctx.quadraticCurveTo(mx + 1.3, 8, mx + 2.6, 6); }
      else if (mo === 3) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx - 2.6, 5.8); ctx.quadraticCurveTo(mx, 10.5, mx + 2.6, 5.8); ctx.closePath(); ctx.fillStyle = '#d9536a'; ctx.fill(); }
      else { ctx.moveTo(mx - 1.8, 6.4); ctx.quadraticCurveTo(mx - 0.9, 7.6, mx, 6.6); ctx.quadraticCurveTo(mx + 0.9, 7.6, mx + 1.8, 6.4); }
      ctx.stroke();
      if (a.species === 'mole' && L.band) P.rrect(ctx, -12, -8, 24, 4, 2, L.band, LINE, 1);
      if (a.species === 'mole' && L.ribbon) { P.blob(ctx, 8, -10, 3.5, 2.5, L.ribbon, LINE, 1); P.blob(ctx, 13, -10, 3.5, 2.5, L.ribbon, LINE, 1); }
      if (a.species === 'hedgehog') { ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-5, 0.5, 3.4, 0, Math.PI * 2); if (!side) ctx.arc(5, 0.5, 3.4, 0, Math.PI * 2); ctx.stroke(); }
      if (a.species === 'human' && L.glasses) this.glasses(ctx, L.glasses | 0, side);
    },
    // 사람 눈 모양 (0 = 기본은 위에서 그림). true를 돌려주면 기본 눈을 그리지 않는다
    eye(ctx, es, x, blink) {
      const D = '#2d2430';
      if (es === 1) { ctx.strokeStyle = D; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 2.2, 1.6); ctx.quadraticCurveTo(x, -1.4, x + 2.2, 1.6); ctx.stroke(); return true; }
      if (blink < 0.2) return false;
      if (es === 2) { P.blob(ctx, x, 0.5, 2.9, 3.6 * blink, D); P.blob(ctx, x - 1, -0.9, 1.2, 1.2, '#fff'); P.blob(ctx, x + 1, 1.8, 0.6, 0.6, '#fff'); P.blob(ctx, x + 1.3, -1.2, 0.4, 0.4, '#fff'); return true; }
      if (es === 3) { P.blob(ctx, x, 1.4, 2.3, 1.7 * blink, D); ctx.strokeStyle = D; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 2.6, 0.2); ctx.lineTo(x + 2.6, 0.2); ctx.stroke(); return true; }
      if (es === 4) { P.blob(ctx, x, 0.8, 1.3, 1.6 * blink, D); return true; }
      if (es === 5) { P.blob(ctx, x, 0.5, 2.3, 3.1 * blink, D); P.blob(ctx, x - 0.7, -0.8, 0.9, 0.9, '#fff'); ctx.strokeStyle = D; ctx.lineWidth = 1; ctx.beginPath(); const o = x < 0 ? -1 : 1; ctx.moveTo(x + o * 1.8, -1.6); ctx.lineTo(x + o * 3.6, -3); ctx.moveTo(x + o * 2.4, -0.6); ctx.lineTo(x + o * 4.2, -1.4); ctx.stroke(); return true; }
      if (es === 6) { P.blob(ctx, x, 0.5, 2.6, 3.3 * blink, '#5a4a8a'); P.blob(ctx, x, 1.3, 1.6, 2 * blink, D); P.blob(ctx, x - 0.8, -0.9, 1, 1, '#fff'); P.blob(ctx, x + 0.9, 1.9, 0.5, 0.5, '#fff'); return true; }
      return false;
    },
    glasses(ctx, g, side) {
      const xs = side ? [-6] : [-5, 5];
      ctx.strokeStyle = LINE; ctx.lineWidth = 1.1;
      for (const x of xs) {
        if (g === 1) { ctx.beginPath(); ctx.arc(x, 0.6, 3.6, 0, 6.3); ctx.stroke(); }
        if (g === 2) { ctx.strokeRect(x - 3.6, -2.4, 7.2, 5.6); }
        if (g === 3) { P.rrect(ctx, x - 4, -2.2, 8, 5.4, 2, 'rgba(40,30,50,0.85)', LINE, 1); P.blob(ctx, x - 1.6, -0.8, 1.2, 0.6, 'rgba(255,255,255,0.6)'); }
        if (g === 4) { ctx.save(); ctx.translate(x, 0.5); ctx.fillStyle = 'rgba(255,110,150,0.55)'; ctx.beginPath(); ctx.moveTo(0, 3.4); ctx.bezierCurveTo(-5.5, -0.5, -2.5, -4.8, 0, -1.8); ctx.bezierCurveTo(2.5, -4.8, 5.5, -0.5, 0, 3.4); ctx.fill(); ctx.strokeStyle = '#e0457a'; ctx.stroke(); ctx.restore(); }
      }
      if (!side) { ctx.beginPath(); ctx.moveTo(-1.4, 0); ctx.lineTo(1.4, 0); ctx.stroke(); }
    },
    // 옷 모양 (몸통 위 덧그림). 몸통 타원 안에 잘라서 그린다
    outfit(ctx, L, side, back, bodyC) {
      const o = L.outfit | 0, c2 = SHIRT[L.shirt2 === undefined ? 5 : L.shirt2 | 0];
      if (!o || o === 2 || o === 13) return;
      if (o >= 9) { // 옷 가게 옷
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, -11, 8.3, 8.8, 0, 0, Math.PI * 2); ctx.clip();
        if (o === 9) { if (!back) { ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(1, -10); ctx.lineTo(-9, -6); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -19); ctx.lineTo(2, -13); ctx.stroke(); ctx.fillStyle = '#ff6b8b'; ctx.fillRect(0, -12, 2, 9); } ctx.fillStyle = c2; ctx.fillRect(-10, -5, 20, 6); }
        if (o === 10) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let y = -18; y < 0; y += 5) for (let x = -8 + ((y / 5) % 2 ? 2.5 : 0); x < 9; x += 5) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 6.3); ctx.fill(); } if (!back) { P.blob(ctx, 0, -16, 3, 1.8, c2); for (const y of [-12, -8, -4]) P.blob(ctx, 0, y, 0.9, 0.9, c2); } }
        if (o === 11) { ctx.fillStyle = '#ffd24d'; ctx.fillRect(-10, -21, 20, 22); ctx.strokeStyle = 'rgba(160,120,20,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 0); ctx.stroke(); if (!back) for (const y of [-14, -9, -4]) P.blob(ctx, 1.8, y, 0.9, 0.9, '#5b4636'); }
        if (o === 12) { ctx.fillStyle = '#2f3a4a'; ctx.fillRect(-10, -21, 20, 22); if (!back) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(0, -6); ctx.lineTo(4, -20); ctx.fill(); P.blob(ctx, -2, -17, 2.2, 1.4, c2, LINE, 0.6); P.blob(ctx, 2, -17, 2.2, 1.4, c2, LINE, 0.6); P.blob(ctx, 0, -10, 0.8, 0.8, '#2f3a4a'); } }
        if (o === 14) { ctx.fillStyle = c2; ctx.fillRect(-10, -21, 3, 22); ctx.fillRect(7, -21, 3, 22); if (!back) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -20, 2, 20); P.rrect(ctx, -5, -15, 3, 4, 1, c2); } }
        ctx.restore(); return;
      }
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -11, 8.3, 8.8, 0, 0, Math.PI * 2); ctx.clip();
      if (o === 1) { ctx.fillStyle = c2; ctx.fillRect(-9, -9, 18, 10); if (!back) { ctx.fillRect(-5.5, -19, 2.4, 10); ctx.fillRect(3.1, -19, 2.4, 10); P.blob(ctx, side ? -3 : 0, -5.5, 2.2, 1.6, 'rgba(255,255,255,0.35)'); } else { ctx.fillRect(-5.5, -19, 2.4, 10); ctx.fillRect(3.1, -19, 2.4, 10); } }
      if (o === 3) { if (!back) { P.rrect(ctx, -5, -8, 10, 5, 2, c2); ctx.strokeStyle = LINE; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-1.5, -19); ctx.lineTo(-1.5, -14); ctx.moveTo(1.5, -19); ctx.lineTo(1.5, -14); ctx.stroke(); } else P.blob(ctx, 0, -17, 7, 4, c2); }
      if (o === 4) { ctx.fillStyle = c2; for (let y = -18; y < 0; y += 4.5) ctx.fillRect(-10, y, 20, 2); }
      if (o === 5 && !back) { P.rrect(ctx, -5.5, -15, 11, 14, 3, c2); ctx.strokeStyle = c2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(-3, -20); ctx.moveTo(5, -15); ctx.lineTo(3, -20); ctx.stroke(); }
      if (o === 6) { ctx.fillStyle = c2; if (back) ctx.fillRect(-10, -20, 20, 20); else if (side) ctx.fillRect(-2, -20, 12, 20); else { ctx.fillRect(-10, -20, 7.5, 20); ctx.fillRect(2.5, -20, 7.5, 20); P.blob(ctx, 0, -14, 0.8, 0.8, LINE); P.blob(ctx, 0, -9, 0.8, 0.8, LINE); } }
      if (o === 7 && !back) { ctx.save(); ctx.translate(side ? -3 : 0, -11); ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, 3.2); ctx.bezierCurveTo(-5, -0.5, -2.4, -4.6, 0, -1.8); ctx.bezierCurveTo(2.4, -4.6, 5, -0.5, 0, 3.2); ctx.fill(); ctx.restore(); ctx.fillStyle = c2; ctx.fillRect(-10, -3, 20, 2); }
      if (o === 8) { ctx.fillStyle = c2; if (!back) { ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(0, -12); ctx.lineTo(9, -20); ctx.closePath(); ctx.fill(); ctx.restore(); P.blob(ctx, -2, -12, 2.2, 1.5, '#ff6b6b', LINE, 0.8); P.blob(ctx, 2, -12, 2.2, 1.5, '#ff6b6b', LINE, 0.8); return; } ctx.fillRect(-9, -20, 18, 6); }
      ctx.restore();
    },
    // 긴 머리: 머리통 뒤(어깨 위)로 내려오는 부분
    hairBack(ctx, L, side) {
      const c = HAIRC[L.hairC | 0], h = L.hair | 0; ctx.strokeStyle = LINE; ctx.lineWidth = 1.4;
      const xs = side ? [7] : [-11, 11];
      if (h === 4 || h === 11) for (const x of xs) P.blob(ctx, x, 9, 5, 13, c, LINE, 1.4);
      if (h === 13) for (const x of xs) { P.blob(ctx, x, 6, 5.5, 8, c, LINE, 1.3); P.blob(ctx, x + (x < 0 ? -1 : 1), 15, 5, 6, c, LINE, 1.3); }
      if (h === 5 && side) { P.blob(ctx, 13, 2, 4, 10, c, LINE, 1.4); }
      if (h === 9) for (const x of xs) for (let k = 0; k < 4; k++) P.blob(ctx, x + (x < 0 ? 1 : -1), 6 + k * 4.2, 3, 2.6, c, LINE, 1.1);
    },
    // 모자·머리 장식
    hat(ctx, L, side, back) {
      const h = L.hat | 0; if (!h) return;
      const c = SHIRT[L.hatC === undefined ? 8 : L.hatC | 0], f = side ? -1 : 0;
      ctx.strokeStyle = LINE; ctx.lineWidth = 1.4;
      if (h === 1) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -6, 14, 11, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); P.rrect(ctx, -14, -8, 28, 4, 2, c, LINE, 1.2); P.blob(ctx, 0, -17.5, 3.4, 3.4, '#ffffff', LINE, 1.1); }
      if (h === 2) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -6, 13.5, 9.5, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); if (!back) { ctx.beginPath(); if (side) ctx.ellipse(-12, -6.5, 7, 2.4, 0, 0, Math.PI * 2); else ctx.ellipse(0, -5.5, 12, 3, 0, 0, Math.PI); ctx.fill(); ctx.stroke(); } P.blob(ctx, 0, -15.5, 1.4, 1.4, '#ffffff'); }
      if (h === 3) { P.blob(ctx, 0, -7, 20, 4.5, '#f0d28a', LINE, 1.3); ctx.fillStyle = '#f0d28a'; ctx.beginPath(); ctx.ellipse(0, -8, 10.5, 8, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = c; ctx.fillRect(-10.4, -11, 20.8, 3); }
      if (h === 4) { const x = side ? 2 : 8; P.blob(ctx, x - 4, -11, 4.5, 3, c, LINE, 1.2); P.blob(ctx, x + 4, -11, 4.5, 3, c, LINE, 1.2); P.blob(ctx, x, -11, 2, 2, c, LINE, 1.1); }
      if (h === 5) for (let k = 0; k < 7; k++) { const an = Math.PI * (1.08 + k * 0.14), x = Math.cos(an) * 12.5, y = Math.sin(an) * 10 - 3; P.blob(ctx, x, y, 2.6, 2.6, k % 2 ? c : '#ffffff', LINE, 0.9); P.blob(ctx, x, y, 0.9, 0.9, '#ffd24d'); }
      if (h === 6 || h === 7) {
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -4, 13, 10, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.strokeStyle = LINE; ctx.lineWidth = 1.3;
        for (const s of side ? [1] : [-1, 1]) {
          ctx.save(); ctx.translate(s * 7 + (side ? 1 : 0), -11); ctx.rotate(s * (h === 6 ? 0.3 : 0.15));
          if (h === 6) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-4.5, 2); ctx.lineTo(0, -8); ctx.lineTo(4.5, 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffc2d1'; ctx.beginPath(); ctx.moveTo(-2, 1); ctx.lineTo(0, -4); ctx.lineTo(2, 1); ctx.fill(); }
          else { P.blob(ctx, 0, -9, 3.6, 10, '#ffffff', LINE, 1.3); P.blob(ctx, 0, -9, 1.7, 7, c); }
          ctx.restore();
        }
      }
      if (h === 8) { ctx.strokeStyle = '#4e8a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(f * 2, -12); ctx.lineTo(f * 2, -18); ctx.stroke(); ctx.save(); ctx.translate(f * 2, -18); for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * 0.9); P.blob(ctx, 0, -4, 2.6, 4.5, '#7cc35a', LINE, 1); ctx.restore(); } ctx.restore(); }
      if (h === 9) { ctx.fillStyle = '#ffd24d'; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-7, -17); ctx.lineTo(-3.5, -13); ctx.lineTo(0, -19); ctx.lineTo(3.5, -13); ctx.lineTo(7, -17); ctx.lineTo(7, -9); ctx.closePath(); ctx.fill(); ctx.stroke(); P.blob(ctx, 0, -12, 1.5, 1.5, c); }
      if (h === 10) { ctx.save(); ctx.rotate(-0.18); P.blob(ctx, 1, -10, 14, 5.5, c, LINE, 1.3); P.blob(ctx, 1, -15.5, 1.5, 1.8, c, LINE, 1); ctx.restore(); }
      if (h === 11 && !back) { ctx.save(); ctx.translate(side ? -4 : -8, -7); ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 1.6 : 3.8, an = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore(); }
      if (h === 13 && !back) { const x0 = side ? -6 : -9; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; P.blob(ctx, x0 + Math.cos(a) * 2.6, -8 + Math.sin(a) * 2.6, 2.2, 2.2, '#ffc2d6', LINE, 0.8); } P.blob(ctx, x0, -8, 1.2, 1.2, '#ffe28a'); }
      if (h === 14) { ctx.fillStyle = '#5aa548'; ctx.beginPath(); ctx.ellipse(0, -6, 14, 11, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#2f6a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); for (const x of [-8, 0, 8]) { ctx.moveTo(x, -16 + Math.abs(x) * 0.4); ctx.quadraticCurveTo(x + 2, -11, x, -6); } ctx.stroke(); ctx.strokeStyle = LINE; P.rrect(ctx, -14, -8, 28, 4, 2, '#ff6b6b', LINE, 1.2); }
      if (h === 15) { P.blob(ctx, 0, -10, 13, 8, '#ff9a3a', LINE, 1.4); ctx.strokeStyle = '#d0702a'; ctx.lineWidth = 1.2; ctx.beginPath(); for (const x of [-6, 0, 6]) { ctx.moveTo(x, -17); ctx.quadraticCurveTo(x * 1.3, -10, x, -3); } ctx.stroke(); P.rrect(ctx, -1.5, -21, 3, 5, 1.5, '#5aa548', LINE, 1); P.blob(ctx, 3, -20, 3, 1.6, '#7cc35a'); }
      if (h === 16 || h === 17) { const gold = h === 17; ctx.fillStyle = gold ? '#ffd24d' : '#e6f3ff'; ctx.beginPath(); ctx.moveTo(-9, -9); for (let k = 0; k <= 4; k++) { const x = -9 + k * 4.5; ctx.lineTo(x, k % 2 ? -14 : -20); } ctx.lineTo(9, -9); ctx.closePath(); ctx.fill(); ctx.stroke(); P.blob(ctx, 0, -12, 2, 2, gold ? '#ff6b8b' : '#8fd3ff', LINE, 0.8); if (gold) { P.blob(ctx, -4.5, -11, 1.2, 1.2, '#8fd3ff'); P.blob(ctx, 4.5, -11, 1.2, 1.2, '#7cc35a'); } else for (const x of [-9, 0, 9]) P.blob(ctx, x, x ? -14 : -20, 1.3, 1.3, '#ffffff'); }
      if (h === 18) { ctx.fillStyle = '#5a4a8a'; ctx.beginPath(); ctx.moveTo(-17, -6); ctx.quadraticCurveTo(0, -10, 17, -6); ctx.lineTo(13, -3); ctx.lineTo(-13, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(3, -30); ctx.quadraticCurveTo(6, -27, 9, -7); ctx.closePath(); ctx.fill(); ctx.stroke(); P.rrect(ctx, -9, -10, 18, 3.5, 1.5, c, LINE, 1); P.blob(ctx, 4, -24, 1.6, 1.6, '#ffe28a'); }
      if (h === 19) { ctx.fillStyle = '#2f2a2a'; ctx.beginPath(); ctx.moveTo(-18, -7); ctx.quadraticCurveTo(-10, -22, 0, -16); ctx.quadraticCurveTo(10, -22, 18, -7); ctx.quadraticCurveTo(0, -3, -18, -7); ctx.fill(); ctx.stroke(); if (!back) { P.blob(ctx, 0, -12, 3.2, 2.8, '#ffffff', LINE, 0.8); P.blob(ctx, -1, -12.5, 0.7, 0.7, LINE); P.blob(ctx, 1, -12.5, 0.7, 0.7, LINE); } ctx.strokeStyle = c; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-15, -7.5); ctx.quadraticCurveTo(0, -4, 15, -7.5); ctx.stroke(); }
      if (h === 20 || h === 21) {
        const frog = h === 21, col = frog ? '#7cc35a' : c;
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -4, 15, 13, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (!frog) { ctx.fillStyle = '#ffffff'; for (let k = -2; k <= 2; k++) { const x = k * 5; ctx.beginPath(); ctx.moveTo(x - 2.5, -16 + Math.abs(k) * 1.5); ctx.lineTo(x, -21 + Math.abs(k) * 1.5); ctx.lineTo(x + 2.5, -16 + Math.abs(k) * 1.5); ctx.fill(); ctx.stroke(); } }
        else if (!back) for (const x of side ? [-4] : [-6, 6]) { P.blob(ctx, x, -15, 4.5, 4.5, col, LINE, 1.2); P.blob(ctx, x, -15, 2.6, 2.6, '#ffffff'); P.blob(ctx, x + 0.5, -14.6, 1.3, 1.5, '#2d2430'); }
      }
      if (h === 22) { P.rrect(ctx, -10, -9, 20, 5, 2, '#ffffff', LINE, 1.2); for (const [x, y, r] of [[-6, -15, 6], [6, -15, 6], [0, -19, 7]]) P.blob(ctx, x, y, r, r * 0.9, '#ffffff', LINE, 1.2); P.blob(ctx, 0, -13, 9, 4, '#ffffff'); }
      if (h === 23) for (const s2 of side ? [1] : [-1, 1]) { P.blob(ctx, s2 * 9 + (side ? 1 : 0), -11, 5, 5, c, LINE, 1.3); if (!back) P.blob(ctx, s2 * 9 + (side ? 1 : 0), -11, 2.6, 2.6, '#ffd7c2'); }
      if (h === 12) { ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, -2, 14, 12, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); for (const s of side ? [0] : [-1, 1]) P.rrect(ctx, (side ? -3 : s * 14) - 3, -4, 6, 9, 3, c, LINE, 1.2); }
    },
    hair(ctx, L, side, back) {
      const c = HAIRC[L.hairC | 0], style = L.hair | 0;
      ctx.fillStyle = c; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
      // 뽀글: 동글동글 덩어리로 머리 전체
      if (style === 7) { const n = back ? 11 : 8; for (let k = 0; k < n; k++) { const an = Math.PI * (back ? 0.85 + k * 0.13 : 0.95 + k * 0.155), x = Math.cos(an) * 12, y = Math.sin(an) * 10 - 2; P.blob(ctx, x, y, 5, 5, c, LINE, 1.2); } if (back) P.blob(ctx, 0, 0, 12, 10, c); else P.blob(ctx, 0, -6, 10, 5.5, c); return; }
      ctx.beginPath();
      if (back) { ctx.ellipse(0, -1, 13.5, 12.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else if (style === 6 || style === 12) { ctx.ellipse(0, -4, 13.4, 9, 0, Math.PI, Math.PI * 2); ctx.quadraticCurveTo(0, -8, -13.4, -4); ctx.fill(); ctx.stroke(); }
      else if (style === 14 || style === 11) { ctx.ellipse(0, -3, 13.8, 10, 0, Math.PI, Math.PI * 2); ctx.lineTo(13.8, -1); ctx.lineTo(-13.8, -1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (style === 8) { ctx.ellipse(0, -4, 13.6, 9.5, 0, Math.PI, Math.PI * 2); ctx.quadraticCurveTo(side ? -2 : 4, -2, side ? -14 : -6, -3); ctx.quadraticCurveTo(-11, -2, -13.6, -4); ctx.fill(); ctx.stroke(); }
      else {
        ctx.ellipse(0, -4, 13.6, 9.5, 0, Math.PI, Math.PI * 2);
        if (side) ctx.quadraticCurveTo(-4, -6, -14, 0); else { ctx.quadraticCurveTo(7, -1, 3, -4); ctx.quadraticCurveTo(-2, 0, -6, -4); ctx.quadraticCurveTo(-10, -1, -13.6, -4); }
        ctx.fill(); ctx.stroke();
      }
      const xs = side ? [1] : [-1, 1];
      if (style === 1) { P.blob(ctx, side ? 8 : 12, 4, 4, 7, c, LINE, 1.3); if (!side) P.blob(ctx, -12, 4, 4, 7, c, LINE, 1.3); }      // 단발
      if (style === 2) { P.blob(ctx, side ? 10 : 0, -12, 5, 5, c, LINE, 1.3); }                                                         // 똥머리
      if (style === 3) { for (const s of xs) { P.blob(ctx, s * 14, 2, 3.5, 5, c, LINE, 1.3); } }                                         // 양갈래
      if (style === 0 && !back) { ctx.beginPath(); ctx.moveTo(-2, -12); ctx.quadraticCurveTo(2, -17, 5, -13); ctx.stroke(); }           // 삐침 머리
      if ((style === 4 || style === 11 || style === 13 || style === 9) && back) { for (const s of [-1, 1]) P.blob(ctx, s * 6, 10, 7, 9, c, LINE, 1.3); P.blob(ctx, 0, 6, 12, 8, c); }
      if ((style === 4 || style === 11) && !back) for (const s of xs) P.blob(ctx, s * 12, 2, 3.4, 7.5, c, LINE, 1.2);           // 옆머리
      if (style === 5) { if (back) { P.blob(ctx, 0, -6, 3.5, 2.6, '#ff6b6b', LINE, 1); P.blob(ctx, 0, 6, 4.5, 9, c, LINE, 1.3); } else if (!side) P.blob(ctx, 0, -12.5, 3, 2.4, '#ff6b6b', LINE, 1); }
      if (style === 10) for (const s of xs) P.blob(ctx, s * 9 + (side ? 1 : 0), -12, 4.5, 4.5, c, LINE, 1.3);                     // 양 똥머리
      if (style === 12 && !back) { ctx.fillStyle = c; ctx.beginPath(); for (const x of [-7, -1, 5]) { ctx.moveTo(x - 3.5, -10); ctx.lineTo(x + 1, -19); ctx.lineTo(x + 3.5, -10); } ctx.fill(); ctx.stroke(); }
      if (style === 13 && !back) for (const s of xs) P.blob(ctx, s * 12.5, 1, 3.4, 6, c, LINE, 1.2);
      if (style === 9 && !back) for (const s of xs) P.blob(ctx, s * 12.5, 1, 3, 5, c, LINE, 1.2);
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
      } else if (a.tool === 'axe') {
        ctx.strokeStyle = '#a7724a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
        ctx.fillStyle = '#c9d3da'; ctx.strokeStyle = LINE; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(8, -24); ctx.quadraticCurveTo(10, -19, 8, -14); ctx.lineTo(0, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
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
    else { ctx.fillStyle = kind === 'q' ? '#4a90e2' : '#ff8a3a'; ctx.font = G.fontPx(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(kind === 'q' ? '?' : kind === 'zz' ? 'z' : '!', 0, -1); }
    ctx.restore();
  };

  // ---------- 곤충 ----------
  A.bug = (ctx, b, t) => {
    const sp = b.sp, col = A.vcol(sp.col, b.v, b.s), s = 0.9 + (b.sizeK || 0) * 0.35;
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
      case 'ladybug': P.blob(ctx, 0, 0, 4.5, 4, col[0], LINE, 1.1); if (b.v === 3) { ctx.fillStyle = col[1]; ctx.fillRect(-4, -0.5, 8, 1); } P.blob(ctx, 0, -4, 2.4, 1.8, col[1]); ctx.fillStyle = col[1]; ctx.fillRect(-0.4, -3, 0.8, 7); P.blob(ctx, -2, 0, 1, 1, col[1]); P.blob(ctx, 2, 1.5, 1, 1, col[1]); break;
      case 'pillbug': if (b.state === 'curl') { P.blob(ctx, 0, -1, 4, 4, col[0], LINE, 1.1); ctx.strokeStyle = col[1]; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, -1, 2.4, -2.4, 0.8); ctx.stroke(); break; } for (let k = 0; k < 4; k++) P.blob(ctx, -3 + k * 2, 0, 2.6, 3.4, k % 2 ? col[0] : col[1], k === 0 ? LINE : null, 1); P.blob(ctx, -5, 0, 1.6, 2.4, col[1], LINE, 1); break;
      case 'ant': P.blob(ctx, -3.5, 0, 2.4, 2, col[0]); P.blob(ctx, 0, 0, 1.6, 1.4, col[0]); P.blob(ctx, 3.2, 0, 2.8, 2.2, col[0]); ctx.strokeStyle = col[1]; ctx.lineWidth = 0.7; ctx.beginPath(); for (const x of [-1, 0.5, 2]) { ctx.moveTo(x, 0); ctx.lineTo(x - 1 + flap * 0.6, 3); ctx.moveTo(x, 0); ctx.lineTo(x - 1 - flap * 0.6, -3); } ctx.stroke(); break;
      case 'cricket': P.blob(ctx, 0, 0, 5.5, 2.8, col[0], LINE, 1); P.blob(ctx, -5, -0.5, 2.2, 2.2, col[1]); ctx.strokeStyle = col[1]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(5, -4); ctx.lineTo(7, 1); ctx.moveTo(-6, -1); ctx.lineTo(-10, -5); ctx.stroke(); break;
      case 'beetle': P.blob(ctx, 0, 1, 5, 6, col[0], LINE, 1.2); P.blob(ctx, 0, -5, 3, 2.4, col[1], LINE, 1); ctx.strokeStyle = col[1]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(0, -11, 3, -12); ctx.stroke(); P.blob(ctx, -1.5, -1, 1.4, 2.4, 'rgba(255,255,255,0.35)'); break;
      case 'whirligig': {
        const k = (t * 1.3 + b.seed) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 1, 5 + k * 6, 2 + k * 3, 0, 0, Math.PI * 2); ctx.stroke();
        P.blob(ctx, 0, 0, 3.6, 2.6, col[0], LINE, 1); P.blob(ctx, -1, -0.8, 1.6, 0.8, col[1]);
        break;
      }
      case 'firefly': {
        const glow = 0.5 + 0.5 * Math.sin(t * 3 + b.seed);
        ctx.globalAlpha = glow * 0.6; P.blob(ctx, 0, 2, 7, 7, '#efff9a'); ctx.globalAlpha = 1;
        P.blob(ctx, 0, 0, 2.2, 3.4, col[1]); P.blob(ctx, 0, 2.5, 1.8, 1.8, col[0]);
        break;
      }
      case 'bee': {
        const w = 0.4 + Math.abs(flap) * 0.6;
        ctx.fillStyle = 'rgba(235,248,255,0.85)'; ctx.strokeStyle = 'rgba(91,70,54,0.5)'; ctx.lineWidth = 0.8;
        for (const x of [-3, 3]) { ctx.beginPath(); ctx.ellipse(x * w, -4, 3.4 * w, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        P.blob(ctx, 0, 0.5, 4.2, 3.4, col[0], LINE, 1.1); ctx.fillStyle = col[1]; ctx.fillRect(-1.6, -2.6, 1.4, 6.2); ctx.fillRect(1.2, -2.6, 1.4, 6.2);
        P.blob(ctx, 4.6, -0.2, 2, 2, col[1]); break;
      }
      case 'cicada': {
        const buzz = Math.sin(t * 40 + b.seed) * 0.4;
        ctx.fillStyle = 'rgba(225,245,235,0.75)'; ctx.strokeStyle = 'rgba(91,70,54,0.55)'; ctx.lineWidth = 0.8;
        for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s2 * 2.6, 2, 2.6, 6.5, s2 * (0.25 + buzz * 0.1), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        P.blob(ctx, 0, -1, 3.2, 4.6, col[0], LINE, 1.1); P.blob(ctx, 0, -5, 3.4, 2, col[1], LINE, 1); P.blob(ctx, -2.2, -5.4, 0.9, 0.9, '#ff5a4a'); P.blob(ctx, 2.2, -5.4, 0.9, 0.9, '#ff5a4a'); break;
      }
      case 'mantis': {
        ctx.strokeStyle = col[1]; ctx.lineWidth = 1.1; ctx.beginPath(); for (const x of [-2, 1]) { ctx.moveTo(x, 1); ctx.lineTo(x - 1.5, 4); ctx.moveTo(x, -1); ctx.lineTo(x - 1.5, -4); } ctx.stroke();
        P.rrect(ctx, -7, -1.6, 10, 3.2, 1.6, col[0], LINE, 1); P.blob(ctx, 4.5, -2.5, 2.2, 2, col[0], LINE, 1);
        ctx.strokeStyle = col[0]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(6, -5 + flap * 0.4); ctx.lineTo(8, -3); ctx.stroke();
        P.blob(ctx, 5.4, -3.2, 0.7, 0.7, '#2d2430'); break;
      }
      case 'stag': {
        P.blob(ctx, 0, 2, 4.8, 5.4, col[0], LINE, 1.2); P.blob(ctx, 0, -4, 3, 2.2, col[1], LINE, 1);
        ctx.strokeStyle = col[0]; ctx.lineWidth = 1.5; ctx.beginPath(); for (const s2 of [-1, 1]) { ctx.moveTo(s2 * 1.6, -5.4); ctx.quadraticCurveTo(s2 * 4.5, -9, s2 * 1.2, -11); } ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 7); ctx.stroke(); break;
      }
      case 'snail': {
        if (b.state === 'curl') { P.blob(ctx, 0, -1, 4, 4, col[0], LINE, 1.1); ctx.strokeStyle = '#a07850'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, -1, 2, 0, 5); ctx.stroke(); break; }
        P.rrect(ctx, -6, 0.5, 11, 3, 1.5, col[1], LINE, 1); P.blob(ctx, -1, -2, 4, 3.8, col[0], LINE, 1.1);
        ctx.strokeStyle = '#a07850'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(-1, -2, 2, 0, 5); ctx.stroke();
        ctx.strokeStyle = col[1]; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4, 1); ctx.lineTo(5.5, -2.5); ctx.moveTo(4.6, 1); ctx.lineTo(6.6, -1.5); ctx.stroke(); break;
      }
      case 'caterpillar': {
        for (let k = 0; k < 5; k++) P.blob(ctx, -5 + k * 2.4, Math.sin(t * 4 + k + b.seed) * 0.6, 1.9, 1.9, col[0], k === 4 ? LINE : null, 0.8);
        for (let k = 0; k < 4; k++) P.blob(ctx, -5 + k * 2.4, -0.3, 0.5, 0.5, col[1]);
        P.blob(ctx, 5.6, -0.6, 0.5, 0.5, '#2d2430'); break;
      }
      default: P.blob(ctx, 0, 0, 4, 3, col[0], LINE, 1);
    }
    // 줄무늬 변이: 날개·몸에 띠
    if (b.v === 3 && (sp.tpl === 'butterfly' || sp.tpl === 'moth' || sp.tpl === 'beetle' || sp.tpl === 'dragonfly')) { ctx.strokeStyle = 'rgba(60,40,60,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); for (const x of [-6, -3, 3, 6]) { ctx.moveTo(x, -6); ctx.lineTo(x, 4); } ctx.stroke(); }
    ctx.restore();
    // 황금·희귀 변이 반짝
    if (b.v === 4 || b.v === 2) { const k = (t * 1.2 + b.seed) % 1; ctx.fillStyle = b.v === 4 ? `rgba(255,220,90,${1 - k})` : `rgba(255,255,255,${1 - k})`; ctx.beginPath(); ctx.arc(b.x + Math.cos(b.seed * 7) * 7, b.y - (b.alt || 0) - 6 - k * 6, 1.5, 0, 6.28); ctx.fill(); }
    // ★4+ 반짝 링
    if (sp.tier >= 3) { const k = (t * 0.8 + b.seed) % 1; ctx.strokeStyle = `rgba(255,240,150,${0.6 * (1 - k)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y - (b.alt || 0), 6 + k * 8, 0, Math.PI * 2); ctx.stroke(); }
  };

  // 변이 색: 2 새하얀 / 4 황금 / 5 계절빛 (나머지는 원래 색)
  const SEASON_TINT = { spring: ['#ffb3cf', '#ff8fb1'], summer: ['#7fdc9a', '#3fa86a'], autumn: ['#ff9a4a', '#c45a2a'], winter: ['#bcd6ff', '#7f9fd6'] };
  A.vcol = (col, v, s) => {
    if (v === 2) return ['#fbfbff', '#e6e2ee'];
    if (v === 4) return ['#ffd24d', '#e0a21c'];
    if (v === 5) return SEASON_TINT[s || A.season] || col;
    return col;
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
  const FISHCOL = { mandarin_fish: ['#d9c07a', '#5a4a2a'], kkeokji: ['#8a7a5a', '#c9b88a'], sweetfish: ['#c8d8a0', '#f0e8c0'], bagrid: ['#c9a04a', '#5a4a3a'], eel: ['#5a6a4a', '#c9c8a0'], cherry_salmon: ['#b8c0d0', '#ff9aa8'], gold_minnow: ['#ffd27a', '#c99a3a'], loach: ['#a89a6a', '#d8ccaa'], snakehead: ['#4a4a3a', '#8a8a6a'], goldfish: ['#ff7a3a', '#fff2e0'], bitterling: ['#b8c8e0', '#ff8fb0'], pond_turtle: ['#7a8a5a', '#c9c8a0'], flounder: ['#a8906a', '#f3e8d0'], rockfish: ['#6a5a4a', '#a89a8a'], hairtail: ['#e8eef8', '#b8c8d8'], puffer: ['#e8d088', '#ffffff'], squid: ['#f3c6b8', '#ff9a8a'], octopus: ['#e0705a', '#ffb8a8'], jellyfish: ['#cfe8ff', '#ffc2e0'], yellowtail: ['#7a9fc0', '#ffe066'], sunfish: ['#a8b8c8', '#e8eef2'], blue_crab: ['#5a8ab8', '#ff8a6a'], filefish: ['#c9b07a', '#8a7a5a'], tuna: ['#3a5a8a', '#c8d8e8'], pale_chub: ['#cfe0f0', '#ff9a8a'], minnow: ['#c8c39a', '#8b8a64'], catfish: ['#6b6258', '#4a433c'], medaka: ['#f3e2b0', '#c9b27a'], crucian: ['#c9b37a', '#9c8550'], carp: ['#f39a5a', '#fff2e0'], smelt: ['#e8f0ff', '#a8b8d8'], horse_mackerel: ['#a9c3d6', '#e9eef2'], mackerel: ['#6a9fc0', '#2f5a7a'], red_seabream: ['#ff8c8c', '#ffd1c4'] };
  // 물고기 모양 변형 (아이콘, 원점 = 가운데). true = 다 그렸음
  A.fishShape = (g, shp, c1, c2, vv) => {
    const eye = (x, y) => { P.blob(g, x, y, 1.5, 1.5, vv === 2 ? '#e0405a' : '#2d2430'); P.blob(g, x - 0.5, y - 0.6, 0.55, 0.55, '#fff'); };
    g.fillStyle = c1; g.strokeStyle = LINE; g.lineWidth = 1.4;
    if (shp === 'eel' || shp === 'long') {
      const th = shp === 'eel' ? 3.6 : 5;
      g.beginPath(); g.moveTo(13, 0); g.bezierCurveTo(8, -th * 1.6, -2, th * 1.4, -14, -th * 0.4); g.lineTo(-14, th * 0.6); g.bezierCurveTo(-2, th * 2.6, 8, th * 0.2, 13, 0); g.closePath(); g.fill(); g.stroke(); eye(9.5, -1.2); return true;
    }
    if (shp === 'flat') { g.beginPath(); g.moveTo(13, 0); g.quadraticCurveTo(2, -12, -9, 0); g.quadraticCurveTo(2, 12, 13, 0); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-8, 0); g.lineTo(-14, -5); g.lineTo(-14, 5); g.closePath(); g.fill(); g.stroke(); P.blob(g, 0, 2, 3, 2, c2); eye(7, -3); eye(9, 0.5); return true; }
    if (shp === 'puffer') { for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); g.stroke(); } P.blob(g, 0, 0, 10, 9.5, c1, LINE, 1.4); P.blob(g, 0, 4, 7, 4, c2); eye(4, -3); P.blob(g, 9, 1, 1.4, 1, '#ff8a8a'); return true; }
    if (shp === 'squid') { P.rrect(g, -3, -13, 10, 17, [5, 5, 2, 2], c1, LINE, 1.3); g.beginPath(); g.moveTo(-3, -10); g.lineTo(-8, -13); g.lineTo(-3, -5); g.moveTo(7, -10); g.lineTo(12, -13); g.lineTo(7, -5); g.fill(); g.stroke(); for (let k = 0; k < 5; k++) { g.strokeStyle = c2; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-2 + k * 2.2, 4); g.quadraticCurveTo(-3 + k * 2.6, 9, -2 + k * 2.4, 13); g.stroke(); } eye(0, 0); eye(4.6, 0); return true; }
    if (shp === 'octo') { P.blob(g, 0, -5, 9, 8, c1, LINE, 1.4); for (let k = -3; k <= 3; k++) { g.strokeStyle = c1; g.lineWidth = 2.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(k * 2.2, 2); g.quadraticCurveTo(k * 3.4, 8, k * 3.6 + 1.5, 12); g.stroke(); } P.blob(g, -3, -4, 1.5, 1.8, '#2d2430'); P.blob(g, 3, -4, 1.5, 1.8, '#2d2430'); P.blob(g, 0, -1, 1.6, 1.2, c2); return true; }
    if (shp === 'jelly') { g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, -3, 10, 8, 0, Math.PI, Math.PI * 2); g.lineTo(10, -2); g.quadraticCurveTo(0, 1, -10, -2); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = c2; g.lineWidth = 1.6; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(k * 3.5, -1); g.quadraticCurveTo(k * 3.5 + 2, 6, k * 3.5, 13); } g.stroke(); g.globalAlpha = 1; P.blob(g, -3, -6, 1, 1.3, '#2d2430'); P.blob(g, 3, -6, 1, 1.3, '#2d2430'); return true; }
    if (shp === 'crab') { g.strokeStyle = c1; g.lineWidth = 2; g.beginPath(); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.moveTo(s * 6, 2 + k * 2); g.lineTo(s * 13, 3 + k * 3.5); } g.stroke(); for (const s of [-1, 1]) P.blob(g, s * 10, -6, 3.5, 3, c2, LINE, 1.2); P.blob(g, 0, 1, 9, 6.5, c1, LINE, 1.4); P.blob(g, -2.5, -5, 1.1, 1.6, '#2d2430'); P.blob(g, 2.5, -5, 1.1, 1.6, '#2d2430'); return true; }
    if (shp === 'turtle') { for (const [x, y] of [[-8, -5], [8, -5], [-8, 6], [8, 6]]) P.blob(g, x, y, 3, 2.4, c2, LINE, 1); P.blob(g, 12, 0, 3.6, 3, c2, LINE, 1.2); P.blob(g, 0, 0, 10, 8, c1, LINE, 1.4); g.strokeStyle = 'rgba(60,70,40,0.5)'; g.beginPath(); g.ellipse(0, 0, 5, 4, 0, 0, 6.3); g.stroke(); P.blob(g, 13.5, -0.8, 0.8, 0.8, '#2d2430'); return true; }
    if (shp === 'sunfish') { P.blob(g, 0, 0, 11, 10, c1, LINE, 1.4); g.beginPath(); g.moveTo(-2, -9); g.lineTo(0, -15); g.lineTo(3, -9); g.moveTo(-2, 9); g.lineTo(0, 15); g.lineTo(3, 9); g.fill(); g.stroke(); P.rrect(g, -13, -6, 4, 12, 2, c1, LINE, 1.2); P.blob(g, 2, 3, 6, 3.5, c2); eye(6, -2.5); return true; }
    return false;
  };
  A.drawIcon = (g, id, t = 0) => {
    if (id.startsWith('furn:')) { const [k, c] = id.slice(5).split('#'); G.house.drawIcon(g, k, { c: +c || 0 }); return; }
    let vv = 0, vs = '';
    if (id.indexOf('#') > 0) { const [base, rest] = id.split('#'); id = base; const [a, b] = rest.split('.'); vv = +a || 0; vs = b || ''; }
    const [cat, key] = id.indexOf(':') > 0 ? id.split(':') : [id, id];
    g.save();
    if (cat === 'bug') {
      const sp = G.data.get('bugs', key);
      g.translate(16, 17); g.scale(2.1, 2.1);
      A.bug(g, { sp, x: 0, y: 0, seed: 0.3, alt: 0, face: 1, v: vv, s: vs }, 0.07);
    } else if (cat === 'fish') {
      const [c1, c2] = A.vcol(FISHCOL[key] || ['#9fc5e0', '#ffffff'], vv, vs);
      g.translate(16, 17);
      g.fillStyle = c1; g.strokeStyle = LINE; g.lineWidth = 1.4;
      const shp = (G.data.get('fish', key) || {}).shape;
      if (shp && A.fishShape(g, shp, c1, c2, vv)) { g.restore(); return; }
      g.beginPath(); g.ellipse(1, 0, 11, 6.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-9, 0); g.lineTo(-15, -6); g.lineTo(-15, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c2; g.beginPath(); g.ellipse(2, 2.5, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
      if (vv === 3) { g.strokeStyle = 'rgba(60,40,60,0.45)'; g.lineWidth = 1.4; g.beginPath(); for (const x of [-4, 0, 4]) { g.moveTo(x, -5); g.lineTo(x, 5); } g.stroke(); }
      P.blob(g, 7, -1.5, 1.6, 1.6, vv === 2 ? '#e0405a' : '#2d2430'); P.blob(g, 6.5, -2.1, 0.6, 0.6, '#fff');
      if (vv === 4) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-2, -3, 4, 1.2, -0.3, 0, 6.28); g.fill(); }
      if (key === 'catfish') { g.strokeStyle = LINE; g.beginPath(); g.moveTo(11, 1); g.quadraticCurveTo(15, 3, 14, 7); g.stroke(); }
    } else if (cat === 'fossil') {
      P.blob(g, 16, 18, 12, 10, '#d8c7a8', LINE, 1.4);
      g.strokeStyle = '#9a8566'; g.lineWidth = 1.5; g.beginPath();
      if (key === 'ammonite') { for (let a = 0, r = 1; a < 12; a += 0.3, r += 0.2) g.lineTo(16 + Math.cos(a) * r * 0.9, 18 + Math.sin(a) * r * 0.75); }
      else if (key === 'trilobite') { g.ellipse(16, 18, 5, 7, 0, 0, Math.PI * 2); for (let k = -1; k <= 1; k++) { g.moveTo(11, 18 + k * 3); g.lineTo(21, 18 + k * 3); } }
      else if (key === 'fern_fossil') { g.moveTo(16, 10); g.lineTo(16, 26); for (let k = 0; k < 5; k++) { g.moveTo(16, 12 + k * 3); g.lineTo(11, 10 + k * 3); g.moveTo(16, 12 + k * 3); g.lineTo(21, 10 + k * 3); } }
      else if (key === 'dino_egg') { g.ellipse(16, 18, 6, 8, 0, 0, Math.PI * 2); g.moveTo(12, 16); g.lineTo(15, 18); g.lineTo(13, 21); }
      else if (key === 'shark_tooth') { g.moveTo(10, 13); g.lineTo(22, 13); g.lineTo(16, 25); g.closePath(); g.moveTo(12, 15); g.lineTo(20, 15); }
      else if (key === 'leaf_fossil') { g.ellipse(16, 18, 4, 8, 0.5, 0, Math.PI * 2); g.moveTo(12, 25); g.lineTo(20, 11); }
      else if (key === 'amber') { g.stroke(); P.blob(g, 16, 18, 8, 7, '#f0a830', LINE, 1.3); P.blob(g, 16, 18, 2, 1.4, '#5a3a22'); P.blob(g, 13, 15, 2.4, 1.4, 'rgba(255,255,255,0.6)'); g.beginPath(); }
      else if (key === 'sea_lily') { g.moveTo(16, 27); g.lineTo(16, 16); for (let k = -2; k <= 2; k++) { g.moveTo(16, 16); g.quadraticCurveTo(16 + k * 3, 12, 16 + k * 4, 9); } }
      else if (key === 'mammoth_tooth') { g.rect(10, 13, 12, 11); for (let k = 0; k < 4; k++) { g.moveTo(11 + k * 3, 13); g.lineTo(11 + k * 3, 24); } }
      else if (key === 'pterosaur_claw') { g.moveTo(11, 24); g.quadraticCurveTo(12, 12, 22, 11); g.quadraticCurveTo(16, 15, 15, 24); }
      else if (key === 'dino_footprint') { g.ellipse(16, 20, 3, 4, 0, 0, Math.PI * 2); for (const a of [-0.6, 0, 0.6]) { g.moveTo(16 + Math.sin(a) * 5, 16 - Math.cos(a) * 5); g.lineTo(16 + Math.sin(a) * 9, 18 - Math.cos(a) * 10); } }
      else { g.moveTo(12, 24); g.quadraticCurveTo(16, 8, 20, 24); g.closePath(); }
      g.stroke();
    } else if (cat === 'shell') {
      const sh = G.data.get('shells', key);
      if (key === 'conch') { P.blob(g, 16, 18, 8, 10, sh.col, LINE, 1.4); g.strokeStyle = '#d9a87a'; g.beginPath(); g.arc(16, 15, 4, 0, Math.PI * 1.5); g.stroke(); }
      else if (key === 'coral') { g.strokeStyle = sh.col; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, 27); g.lineTo(16, 12); g.moveTo(16, 19); g.lineTo(10, 12); g.moveTo(16, 17); g.lineTo(22, 10); g.stroke(); }
      else if (key === 'urchin_shell') { P.blob(g, 16, 18, 10, 8, sh.col, LINE, 1.4); for (let k = 0; k < 8; k++) P.blob(g, 16 + Math.cos(k) * 6, 18 + Math.sin(k) * 4.5, 1, 1, '#fff'); }
      else if (key === 'moon_snail') { P.blob(g, 16, 18, 10, 9, sh.col, LINE, 1.4); g.strokeStyle = '#b89a70'; g.lineWidth = 1.3; g.beginPath(); for (let a = 0, r = 1; a < 9; a += 0.3, r += 0.25) g.lineTo(16 + Math.cos(a) * r, 18 + Math.sin(a) * r * 0.85); g.stroke(); }
      else if (key === 'sea_glass') { g.globalAlpha = 0.85; g.fillStyle = sh.col; g.strokeStyle = LINE; g.lineWidth = 1.2; g.beginPath(); g.moveTo(9, 15); g.lineTo(18, 9); g.lineTo(25, 17); g.lineTo(19, 25); g.lineTo(10, 23); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = 1; P.blob(g, 15, 14, 3, 1.2, 'rgba(255,255,255,0.7)'); }
      else if (key === 'sand_dollar') { P.blob(g, 16, 18, 11, 10, sh.col, LINE, 1.4); g.strokeStyle = '#c9b48a'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.moveTo(16, 18); g.lineTo(16 + Math.cos(a) * 6, 18 + Math.sin(a) * 6); } g.stroke(); }
      else if (key === 'abalone') { P.blob(g, 16, 18, 12, 8.5, '#9a8a7a', LINE, 1.4); P.blob(g, 16, 18, 9, 6, sh.col); P.blob(g, 13, 16, 4, 2, '#e8c8f0'); for (let k = 0; k < 5; k++) P.blob(g, 8 + k * 3.5, 12.5 + Math.abs(k - 2) * 0.6, 0.9, 0.9, '#5b4636'); }
      else if (key === 'pearl_oyster') { P.blob(g, 16, 19, 11, 7, '#bfb6d6', LINE, 1.4); P.blob(g, 16, 16, 4.5, 4.5, sh.col, LINE, 1); P.blob(g, 14.6, 14.6, 1.4, 1.4, '#fff'); }
      else { g.fillStyle = sh.col; g.strokeStyle = LINE; g.lineWidth = 1.4; g.beginPath(); g.moveTo(16, 27); g.lineTo(5, 15); g.quadraticCurveTo(16, 2, 27, 15); g.closePath(); g.fill(); g.stroke(); g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(16, 26); g.lineTo(16 + k * 4.5, 9 + Math.abs(k) * 2); } g.strokeStyle = 'rgba(150,100,70,0.5)'; g.stroke(); }
    } else if (id === 'letter_noaddr') {
      P.rrect(g, 4, 9, 24, 16, 2, '#f3ecdf', LINE, 1.4); g.strokeStyle = '#c9b89a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, 9); g.lineTo(16, 19); g.lineTo(28, 9); g.stroke(); P.blob(g, 16, 20, 2.6, 2.6, '#f08a3c'); P.blob(g, 23, 13, 2, 1.2, 'rgba(240,138,60,0.6)');
    } else if (id === 'parcel') {
      P.rrect(g, 5, 9, 22, 18, 3, '#d9a877', LINE, 1.4); g.fillStyle = '#ff8a7a'; g.fillRect(14, 9, 4, 18); g.fillRect(5, 16, 22, 4); P.blob(g, 16, 8, 4, 2.5, '#ff8a7a', LINE, 1);
    } else if (id === 'wood') {
      P.rrect(g, 5, 10, 22, 9, 4, '#c98e5a', LINE, 1.3); P.rrect(g, 7, 18, 22, 9, 4, '#b67a48', LINE, 1.3); P.blob(g, 27, 22.5, 2.5, 3.5, '#e8c494', LINE, 1); P.blob(g, 25, 14.5, 2.5, 3.5, '#e8c494', LINE, 1);
    } else if (id === 'stone') {
      P.blob(g, 16, 19, 11, 8, '#aab4be', LINE, 1.4); P.blob(g, 13, 16, 5, 2.5, '#d3dae1');
    } else if (id === 'clay') {
      P.blob(g, 16, 19, 11, 8, '#d9946a', LINE, 1.4); P.blob(g, 13, 16, 5, 2.5, '#efb48e'); g.strokeStyle = '#b8714a'; g.beginPath(); g.moveTo(10, 21); g.quadraticCurveTo(16, 18, 22, 22); g.stroke();
    } else if (id === 'iron') {
      P.blob(g, 16, 19, 11, 8, '#7a8290', LINE, 1.4); for (const [x, y] of [[12, 17], [19, 20], [16, 23]]) P.blob(g, x, y, 2.2, 1.6, '#e9a26a');
    } else if (id === 'fossil_raw') {
      P.blob(g, 16, 19, 12, 9, '#cdb894', LINE, 1.4); P.blob(g, 12, 16, 4, 2.4, '#e2d2b0');
      g.strokeStyle = '#9a8566'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(8, 22); g.lineTo(13, 20); g.moveTo(20, 24); g.lineTo(24, 20); g.stroke();
      g.fillStyle = '#8a7466'; g.font = G.fontPx(12); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 17, 19);
    } else if (id === 'branch') {
      g.strokeStyle = '#a7724a'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 26); g.lineTo(26, 8); g.moveTo(16, 17); g.lineTo(20, 24); g.stroke();
      P.blob(g, 21, 25, 3, 2, '#8fd16a');
    } else if (id === 'fruit_acorn') {
      P.blob(g, 16, 19, 7, 8, '#c98e5a', LINE, 1.4); P.rrect(g, 8, 9, 16, 7, 4, '#8b6a46', LINE, 1.4); g.fillStyle = '#7a5230'; g.fillRect(15, 5, 2, 5);
    } else if (cat === 'letter' || id.startsWith('letter')) {
      P.rrect(g, 4, 9, 24, 16, 2, '#ffffff', LINE, 1.4); g.strokeStyle = '#ff8a7a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, 9); g.lineTo(16, 19); g.lineTo(28, 9); g.stroke(); P.blob(g, 16, 20, 2.4, 2.4, '#ff6b8b');
    } else if (cat === 'tool') {
      // 도구 아이콘: 손잡이 (6,28) → (21,11) 대각선 + 머리
      g.strokeStyle = '#a7724a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 28); g.lineTo(key === 'rod' ? 26 : 20, key === 'rod' ? 5 : 12); g.stroke();
      if (key === 'net') { g.save(); g.translate(23, 9); g.rotate(0.7); P.blob(g, 0, 0, 7, 8.5, 'rgba(255,255,255,0.85)', LINE, 1.5); g.strokeStyle = 'rgba(91,70,54,0.35)'; g.lineWidth = 0.8; g.beginPath(); for (const k of [-3, 0, 3]) { g.moveTo(k, -7); g.lineTo(k, 7); g.moveTo(-6, k); g.lineTo(6, k); } g.stroke(); g.restore(); }
      else if (key === 'rod') { P.blob(g, 10, 24, 3, 3, '#ff7a7a', LINE, 1); g.strokeStyle = 'rgba(91,70,54,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(26, 5); g.quadraticCurveTo(29, 16, 26, 24); g.stroke(); P.blob(g, 26, 25, 2.2, 2.6, '#ff6b6b', LINE, 1); }
      else if (key === 'shovel') { g.save(); g.translate(22, 10); g.rotate(0.75); P.rrect(g, -6, -10, 12, 13, [2, 2, 6, 6], '#c9d3da', LINE, 1.4); g.restore(); }
      else if (key === 'axe') { g.fillStyle = '#c9d3da'; g.strokeStyle = LINE; g.lineWidth = 1.4; g.beginPath(); g.moveTo(17, 9); g.lineTo(25, 2); g.quadraticCurveTo(30, 9, 27, 16); g.lineTo(21, 15); g.closePath(); g.fill(); g.stroke(); }
    } else if (id === 'money') {
      P.blob(g, 16, 18, 10, 10, '#a7e3ff', LINE, 1.4); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(13, 14, 3, 2, -0.5, 0, Math.PI * 2); g.fill();
    } else {
      P.blob(g, 16, 16, 9, 9, '#ddd', LINE, 1.4);
    }
    g.restore();
  };
  // DOM용 아이콘 캔버스 (캐시)
  const iconCache = new Map();
  A.iconReset = () => iconCache.clear();
  A.iconURL = (id, px = 64) => {
    const k = id + '@' + px; if (iconCache.has(k)) return iconCache.get(k);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d'); g.scale(px / 32, px / 32); A.drawIcon(g, id);
    const url = c.toDataURL(); iconCache.set(k, url); return url;
  };

  G.modules.add('actors');
})(globalThis.G);
