// 하우징: 가구 데이터, 텐트 실내, 꾸미기(배치·이동·회전·넣기·되돌리기 30), 아늑지수
// PC(마우스·키보드)와 폰(터치) 모두: 눌러서 고르기 → 끌거나 빈 칸을 눌러 옮기기 / 방향키로 한 칸씩
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const COLS = ['#ff9fbf', '#8fd3ff', '#b8e68f', '#ffd98a', '#c9b3ff', '#ffffff'];
  const COLN = ['분홍', '하늘', '연두', '노랑', '보라', '하양'];
  // 가구 형태 (ix 추가만). layer: floor = 밟을 수 없음 / rug = 밟을 수 있고 다른 가구를 올릴 수 있음
  const FORMS = [
    { id: 'bed', ix: 0, name: '포근 침대', w: 1, h: 2, rot: true, val: 800, col: true },
    { id: 'lamp', ix: 1, name: '작은 등', w: 1, h: 1, val: 300, col: true, light: true },
    { id: 'rug', ix: 2, name: '동그란 깔개', w: 2, h: 2, val: 400, col: true, layer: 'rug' },
    { id: 'chair', ix: 3, name: '나무 의자', w: 1, h: 1, val: 250, rot4: true },
    { id: 'table', ix: 4, name: '동글 탁자', w: 1, h: 1, val: 350 },
    { id: 'shelf', ix: 5, name: '작은 책장', w: 2, h: 1, val: 600 },
    { id: 'plant', ix: 6, name: '몽글 화분', w: 1, h: 1, val: 200 },
    { id: 'crate', ix: 7, name: '나무 상자', w: 1, h: 1, val: 150 },
    { id: 'radio', ix: 8, name: '동그리 라디오', w: 1, h: 1, val: 500, col: true },
    { id: 'sofa', ix: 9, name: '솜사탕 소파', w: 2, h: 1, val: 900, col: true },
    { id: 'cushion', ix: 10, name: '방석', w: 1, h: 1, val: 120, col: true, layer: 'rug' },
    { id: 'clock', ix: 11, name: '탁상시계', w: 1, h: 1, val: 450 },
    { id: 'workbench', ix: 12, name: '작업대', w: 2, h: 1, val: 0, fixed: true, hidden: true },
    // 2차 확장 (2026-11) — ix는 이어서만
    { id: 'tv', ix: 13, name: '동글 텔레비전', w: 1, h: 1, val: 1400, col: true },
    { id: 'piano', ix: 14, name: '꼬마 피아노', w: 2, h: 1, val: 3800 },
    { id: 'fridge', ix: 15, name: '말랑 냉장고', w: 1, h: 1, val: 1600, col: true },
    { id: 'stove', ix: 16, name: '보글 화덕', w: 1, h: 1, val: 1800 },
    { id: 'aquarium', ix: 17, name: '물방울 어항', w: 2, h: 1, val: 2600 },
    { id: 'wardrobe', ix: 18, name: '구름 옷장', w: 2, h: 1, val: 2200, col: true },
    { id: 'bench', ix: 19, name: '정원 벤치', w: 2, h: 1, val: 900 },
    { id: 'floorlamp', ix: 20, name: '꽃 스탠드', w: 1, h: 1, val: 950, col: true, light: true },
    { id: 'teddy', ix: 21, name: '곰돌이 인형', w: 1, h: 1, val: 700, col: true },
    { id: 'tree_pot', ix: 22, name: '큰 화분 나무', w: 1, h: 1, val: 1100 },
    { id: 'desk', ix: 23, name: '공부 책상', w: 2, h: 1, val: 1300 },
    { id: 'fireplace', ix: 24, name: '벽난로', w: 2, h: 1, val: 6000, light: true },
    { id: 'starlamp', ix: 25, name: '별빛 조명', w: 1, h: 1, val: 2400, col: true, light: true },
    { id: 'bathtub', ix: 26, name: '거품 욕조', w: 2, h: 1, val: 4200, col: true },
    { id: 'cake', ix: 27, name: '케이크 장식', w: 1, h: 1, val: 800 },
    { id: 'globe', ix: 28, name: '지구본', w: 1, h: 1, val: 1500 },
  ];
  G.data.table('furn', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'w', 'h', 'val'] });
  G.data.add('furn', FORMS);
  // 가방 아이템: 판매가 = 값의 1/4
  G.data.add('items', FORMS.filter((f) => !f.hidden).map((f) => ({ id: 'furn:' + f.id, name: f.name, cat: 'furn', val: Math.round(f.val / 4), stack: 1, ref: f, buy: f.val })));

  // ---------- 상태 ----------
  // 방: 7×6 타일, 위 2줄은 벽, 바닥 7×4, 문은 아래 가운데
  const ROOM = { w: 7, h: 6, wall: 2, door: 3 };
  const st = { items: [], starter: false, rated: 0, wall: 0, floor: 0 }; // items: {f, x, y, r, c} · wall/floor: 0 = 집 기본, 1~ = 고른 무늬
  // 벽지·바닥 (8차 회의: 꾸미기 강화). 번호는 끝에만 추가
  const WALLS = [null,
    { name: '크림 줄무늬', c1: '#fff3e0', c2: '#ffe0c2', pat: 'stripe' }, { name: '분홍 물방울', c1: '#ffe6ee', c2: '#ffc2d6', pat: 'dots' },
    { name: '하늘 체크', c1: '#e6f4ff', c2: '#c8e4fb', pat: 'check' }, { name: '민트 꽃무늬', c1: '#e3f7ee', c2: '#9fe0c0', pat: 'flower' },
    { name: '보라 별밤', c1: '#3f3a6b', c2: '#ffe28a', pat: 'stars' }, { name: '나무 판벽', c1: '#d9a877', c2: '#c4915f', pat: 'plank' },
    { name: '레몬 물결', c1: '#fff8c8', c2: '#ffe27a', pat: 'wave' }, { name: '구름 하늘', c1: '#bfe6ff', c2: '#ffffff', pat: 'cloud' }];
  const FLOORS = [null,
    { name: '진한 원목', c1: '#b9875a', c2: '#a8764a', pat: 'plank' }, { name: '하얀 타일', c1: '#f4f4f0', c2: '#dcdcd4', pat: 'tile' },
    { name: '분홍 카펫', c1: '#ffcfdc', c2: '#ffb8cb', pat: 'carpet' }, { name: '풀밭 매트', c1: '#a8d878', c2: '#94c864', pat: 'grass' },
    { name: '체스 바닥', c1: '#f3e2c4', c2: '#8a6a55', pat: 'check' }, { name: '하늘 카펫', c1: '#cfe8ff', c2: '#b8dcff', pat: 'carpet' }];
  function paintPattern(ctx, P, d, x0, y0, w, h, t) {
    ctx.fillStyle = d.c1; ctx.fillRect(x0, y0, w, h); ctx.fillStyle = d.c2;
    if (d.pat === 'stripe') for (let x = x0; x < x0 + w; x += 18) ctx.fillRect(x, y0, 8, h);
    else if (d.pat === 'dots') for (let y = y0 + 6; y < y0 + h; y += 14) for (let x = x0 + ((y / 14) % 2) * 9; x < x0 + w; x += 18) P.blob(ctx, x, y, 2.6, 2.6, d.c2);
    else if (d.pat === 'check' || d.pat === 'tile') { const g = d.pat === 'tile' ? 32 : 16; for (let y = y0; y < y0 + h; y += g) for (let x = x0; x < x0 + w; x += g) if (d.pat === 'tile' ? true : ((x - x0) / g + (y - y0) / g) % 2 === 0) { if (d.pat === 'tile') { ctx.strokeStyle = d.c2; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, g - 1, g - 1); } else ctx.fillRect(x, y, g, g); } }
    else if (d.pat === 'flower') for (let y = y0 + 10; y < y0 + h; y += 22) for (let x = x0 + ((y / 22) % 2) * 11; x < x0 + w; x += 22) { for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; P.blob(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2, 2, d.c2); } P.blob(ctx, x, y, 1.4, 1.4, '#fff6c8'); }
    else if (d.pat === 'stars') for (let i = 0; i < w * h / 300; i++) { const x = x0 + (i * 53.7 % w), y = y0 + (i * 31.3 % h), tw = 0.5 + 0.5 * Math.sin((t || 0) * 2 + i); ctx.globalAlpha = 0.4 + tw * 0.6; P.blob(ctx, x, y, 1.3, 1.3, d.c2); ctx.globalAlpha = 1; }
    else if (d.pat === 'plank') for (let y = y0; y < y0 + h; y += 12) { ctx.fillStyle = ((y - y0) / 12) % 2 ? d.c2 : d.c1; ctx.fillRect(x0, y, w, 11); }
    else if (d.pat === 'wave') { ctx.strokeStyle = d.c2; ctx.lineWidth = 3; for (let y = y0 + 8; y < y0 + h; y += 14) { ctx.beginPath(); for (let x = x0; x <= x0 + w; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.15) * 3); ctx.stroke(); } }
    else if (d.pat === 'cloud') for (let i = 0; i < w / 50; i++) { const x = x0 + 20 + i * 50, y = y0 + 12 + (i % 2) * 18; P.blob(ctx, x, y, 12, 6, d.c2); P.blob(ctx, x + 8, y - 4, 8, 6, d.c2); }
    else if (d.pat === 'carpet') { ctx.strokeStyle = d.c2; ctx.lineWidth = 1; for (let y = y0; y < y0 + h; y += 4) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); } }
    else if (d.pat === 'grass') for (let i = 0; i < w * h / 120; i++) { const x = x0 + (i * 37.3 % w), y = y0 + (i * 23.7 % h); ctx.fillRect(x, y, 1.5, 4); }
  }
  const H = G.house = { inside: false, st, ROOM, FORMS, SHOP_FORMS: FORMS.filter((f) => !f.hidden), COLS, COLN, editing: false };
  H.WALLS = WALLS; H.FLOORS = FLOORS;
  // 방 크기는 둥지 단계에 따라 (텐트 7×6 → 오두막 9×7 → 작은 집 11×8). 오른쪽·아래로만 넓어져서 가구 위치는 그대로다
  function syncRoom() { const r = G.nest ? G.nest.room() : { w: 7, h: 6 }; ROOM.w = r.w; ROOM.h = r.h; ROOM.door = Math.floor(r.w / 2); RW = ROOM.w * TILE; RH = ROOM.h * TILE; }
  H.syncRoom = syncRoom;

  const form = (id) => G.data.get('furn', id);
  function fp(it) { const f = form(it.f); const sw = it.r % 2 && f.rot ? 1 : 0; return { w: sw ? f.h : f.w, h: sw ? f.w : f.h }; }
  H.fp = fp;
  // 놓을 수 있나 (ignore = 옮기는 중인 자기 자신)
  H.canPlace = (it, x, y, ignore) => {
    const { w, h } = fp(it), f = form(it.f);
    if (x < 0 || y < ROOM.wall || x + w > ROOM.w || y + h > ROOM.h) return false;
    // 문 앞 칸은 비워 둔다(러그는 허용)
    if (f.layer !== 'rug' && x <= ROOM.door && ROOM.door < x + w && y + h === ROOM.h) return false;
    for (const o of st.items) {
      if (o === ignore || o === it) continue;
      if ((form(o.f).layer === 'rug') !== (f.layer === 'rug')) continue; // 러그 층과 가구 층은 겹쳐도 된다
      const b = fp(o);
      if (x < o.x + b.w && o.x < x + w && y < o.y + b.h && o.y < y + h) return false;
    }
    return true;
  };
  H.findSpot = (it) => {
    const order = [];
    for (let y = ROOM.wall; y < ROOM.h; y++) for (let x = 0; x < ROOM.w; x++) order.push([x, y]);
    order.sort((a, b) => Math.hypot(a[0] - 3, a[1] - 3.5) - Math.hypot(b[0] - 3, b[1] - 3.5));
    for (const [x, y] of order) if (H.canPlace(it, x, y)) return [x, y];
    return null;
  };
  // 아늑지수: 꽃잎 1~7장 (숫자는 숨김)
  H.rate = () => {
    const forms = new Set(st.items.map((o) => o.f));
    let s = forms.size * 9 + Math.min(st.items.length, 12) * 3;
    if (forms.has('bed')) s += 12; if (forms.has('rug')) s += 10; if (forms.has('lamp')) s += 8; if (forms.has('plant')) s += 6;
    const cols = new Set(st.items.filter((o) => form(o.f).col).map((o) => o.c));
    if (cols.size === 1 && st.items.filter((o) => form(o.f).col).length >= 3) s += 12; // 색 맞춤 보너스
    const petals = u.clamp(1 + Math.floor(s / 18), 1, 7);
    const hints = [];
    if (!forms.has('rug')) hints.push('바닥이 조금 차가워 보여요. 깔개는 어때요?');
    if (!forms.has('lamp')) hints.push('밤에 켤 등이 있으면 포근할 거예요.');
    if (!forms.has('plant')) hints.push('초록 화분 하나면 숨 쉬는 방이 돼요.');
    if (cols.size > 2) hints.push('색을 두세 가지로 맞추면 더 아늑해져요.');
    return { petals, hints };
  };

  G.save.section('house', {
    v: 1, def: () => ({ items: [], starter: false, rated: 0, wall: 0, floor: 0 }),
    get: () => ({ items: st.items.map((o) => [o.f, o.x, o.y, o.r, o.c]), starter: st.starter, rated: st.rated, wall: st.wall || 0, floor: st.floor || 0 }),
    set: (d) => { st.items = (d.items || []).filter((a) => form(a[0])).map((a) => ({ f: a[0], x: a[1], y: a[2], r: a[3] || 0, c: a[4] || 0 })); st.starter = !!d.starter; st.rated = d.rated || 0; st.wall = d.wall || 0; st.floor = d.floor || 0; },
  });

  // ---------- 가구 그림 (발자국 좌상단 기준, 위로 솟음) ----------
  const L = '#5b4636';
  function drawFurn(g, it, w, h) {
    const P = G.art.paint, f = form(it.f), c = COLS[it.c || 0], W = w * TILE, Hh = h * TILE, rot = it.r || 0;
    const wood = '#c98e5a', woodD = '#9c6a40', woodL = '#e0ae7c';
    if (f.layer !== 'rug') P.shadow(g, W / 2, Hh - 3, W * 0.8, 0.2);
    switch (it.f) {
      case 'bed': {
        const vert = h > w;
        P.rrect(g, 2, 4 - 10, W - 4, Hh - 4, 6, woodD, L);
        P.rrect(g, 4, 2 - 10, W - 8, Hh - 10, 6, '#fffaf0', L);
        if (vert) { P.rrect(g, 6, 4 - 10, W - 12, 12, 5, '#ffffff', L, 1.2); P.rrect(g, 4, 20 - 10, W - 8, Hh - 26, 6, c, L, 1.4); }
        else { P.rrect(g, 4, 4 - 10, 14, Hh - 14, 5, '#ffffff', L, 1.2); P.rrect(g, 20, 2 - 10, W - 24, Hh - 10, 6, c, L, 1.4); }
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(vert ? 8 : 24, vert ? 16 : -4, vert ? W - 16 : W - 32, 3);
        break;
      }
      case 'lamp': P.rrect(g, 13, 2, 6, 24, 2, woodD, L, 1.2); P.blob(g, 16, 27, 8, 3, woodD, L, 1.2); g.fillStyle = c; g.strokeStyle = L; g.lineWidth = 1.5; g.beginPath(); g.moveTo(8, 4); g.lineTo(24, 4); g.lineTo(20, -12); g.lineTo(12, -12); g.closePath(); g.fill(); g.stroke(); break;
      case 'rug': { P.blob(g, W / 2, Hh / 2, W / 2 - 3, Hh / 2 - 5, c, L, 1.4); P.blob(g, W / 2, Hh / 2, W / 2 - 12, Hh / 2 - 13, 'rgba(255,255,255,0.45)'); P.blob(g, W / 2, Hh / 2, W / 2 - 20, Hh / 2 - 21, c); break; }
      case 'cushion': P.rrect(g, 4, 8, W - 8, Hh - 12, 9, c, L, 1.4); P.blob(g, W / 2, Hh / 2 + 2, 2, 2, 'rgba(91,70,54,0.4)'); break;
      case 'chair': {
        const back = rot === 0 ? 'top' : rot === 2 ? 'bottom' : rot === 1 ? 'right' : 'left';
        g.fillStyle = woodD; for (const [x, y] of [[7, 20], [23, 20], [7, 28], [23, 28]]) g.fillRect(x - 1.5, y - 4, 3, 6);
        P.rrect(g, 5, 12, 22, 12, 3, wood, L, 1.3);
        if (back === 'top') P.rrect(g, 5, -6, 22, 18, 4, woodL, L, 1.3);
        else if (back === 'bottom') P.rrect(g, 5, 18, 22, 8, 3, woodL, L, 1.3);
        else P.rrect(g, back === 'left' ? 3 : 23, -2, 6, 26, 3, woodL, L, 1.3);
        break;
      }
      case 'table': g.fillStyle = woodD; g.fillRect(14, 10, 4, 18); P.blob(g, 16, 28, 8, 3, woodD); P.blob(g, 16, 8, 14, 8, wood, L, 1.4); P.blob(g, 13, 6, 6, 2.5, woodL); break;
      case 'shelf': {
        P.rrect(g, 3, -22, W - 6, Hh + 18, 4, wood, L, 1.4);
        g.fillStyle = woodD; g.fillRect(6, -2, W - 12, 3); g.fillRect(6, 12, W - 12, 3);
        const bc = ['#ff8a7a', '#8fd3ff', '#ffd24d', '#b8e68f', '#c9b3ff'];
        for (let k = 0; k < 7; k++) { g.fillStyle = bc[k % 5]; g.fillRect(8 + k * 7, -16 + (k % 2) * 2, 5, 14 - (k % 2) * 2); }
        for (let k = 0; k < 4; k++) { g.fillStyle = bc[(k + 2) % 5]; g.fillRect(10 + k * 12, 3, 8, 9); }
        break;
      }
      case 'plant': P.rrect(g, 8, 14, 16, 14, [2, 2, 6, 6], '#e8946a', L, 1.3); for (const [x, y, rx] of [[16, 2, 9], [9, 8, 6], [23, 8, 6], [16, -6, 6]]) P.blob(g, x, y, rx, rx * 0.8, '#7cc35a', L, 1.2); P.blob(g, 13, 0, 3, 2, '#a2db7c'); break;
      case 'crate': P.rrect(g, 3, 2, 26, 26, 3, wood, L, 1.4); g.strokeStyle = woodD; g.lineWidth = 2; g.beginPath(); g.moveTo(5, 4); g.lineTo(27, 26); g.moveTo(27, 4); g.lineTo(5, 26); g.stroke(); g.fillStyle = woodL; g.fillRect(4, 3, 24, 3); break;
      case 'radio': P.rrect(g, 4, 6, 24, 20, 8, c, L, 1.4); P.blob(g, 12, 16, 5, 5, '#fffaf0', L, 1.1); P.blob(g, 12, 16, 2, 2, L); P.rrect(g, 19, 11, 6, 3, 1, L); P.rrect(g, 19, 17, 6, 3, 1, L); g.strokeStyle = L; g.lineWidth = 1.4; g.beginPath(); g.moveTo(22, 6); g.lineTo(27, -4); g.stroke(); break;
      case 'sofa': P.rrect(g, 2, -6, W - 4, 22, 9, c, L, 1.4); P.rrect(g, 2, 8, W - 4, 20, 8, c, L, 1.4); P.rrect(g, 0, 2, 9, 24, 5, c, L, 1.3); P.rrect(g, W - 9, 2, 9, 24, 5, c, L, 1.3); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(12, 10, W - 24, 3); g.strokeStyle = 'rgba(91,70,54,0.3)'; g.beginPath(); g.moveTo(W / 2, 10); g.lineTo(W / 2, 24); g.stroke(); break;
      case 'clock': { P.rrect(g, 8, 4, 16, 22, 6, '#fff3e2', L, 1.4); P.blob(g, 16, 12, 6, 6, '#ffffff', L, 1.1); const t = G.time.now() / 1000 / G.time.SPEED; g.strokeStyle = L; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16, 12); g.lineTo(16 + Math.sin(t / 60) * 4, 12 - Math.cos(t / 60) * 4); g.moveTo(16, 12); g.lineTo(16 + Math.sin(t / 720) * 3, 12 - Math.cos(t / 720) * 3); g.stroke(); P.blob(g, 11, 27, 2.5, 1.5, woodD); P.blob(g, 21, 27, 2.5, 1.5, woodD); break; }
      case 'workbench': {
        P.rrect(g, 2, -8, W - 4, 22, 4, wood, L, 1.5); g.fillStyle = woodL; g.fillRect(4, -6, W - 8, 4);
        g.fillStyle = woodD; g.fillRect(6, 14, 4, 14); g.fillRect(W - 10, 14, 4, 14); g.fillRect(6, 22, W - 12, 3);
        // 망치와 톱
        g.save(); g.translate(18, -10); g.rotate(-0.5); P.rrect(g, -1.5, 0, 3, 14, 1, '#a7724a'); P.rrect(g, -5, -2, 10, 5, 1.5, '#9aa5b0', L, 1); g.restore();
        P.rrect(g, 34, -14, 20, 7, 2, '#c9d3da', L, 1); g.fillStyle = '#a7724a'; g.fillRect(50, -15, 8, 9);
        break;
      }
      case 'tv': P.rrect(g, 9, 22, 14, 6, 2, woodD, L, 1.2); P.rrect(g, 3, -2, 26, 24, 8, c, L, 1.4); P.rrect(g, 7, 2, 18, 15, 5, '#3f4a5a', L, 1.1); P.blob(g, 12, 6, 4, 1.6, 'rgba(255,255,255,0.4)'); g.strokeStyle = L; g.lineWidth = 1.2; g.beginPath(); g.moveTo(12, -2); g.lineTo(8, -9); g.moveTo(20, -2); g.lineTo(24, -9); g.stroke(); break;
      case 'piano': P.rrect(g, 2, -20, W - 4, 40, 5, '#3a2f3f', L, 1.5); P.rrect(g, 4, 6, W - 8, 9, 2, '#ffffff', L, 1.1); g.fillStyle = '#2d2430'; for (let k = 0; k < 9; k++) if (k % 7 !== 2 && k % 7 !== 6) g.fillRect(9 + k * 6, 6, 3, 5); g.fillStyle = woodD; g.fillRect(6, 20, 4, 8); g.fillRect(W - 10, 20, 4, 8); P.rrect(g, 20, -14, 24, 12, 2, '#fff8e6', L, 1); break;
      case 'fridge': P.rrect(g, 5, -22, 22, 50, 6, c, L, 1.4); g.strokeStyle = L; g.lineWidth = 1.2; g.beginPath(); g.moveTo(5, -2); g.lineTo(27, -2); g.stroke(); P.rrect(g, 21, -16, 3, 9, 1.5, '#ffffff', L, 0.8); P.rrect(g, 21, 3, 3, 11, 1.5, '#ffffff', L, 0.8); P.blob(g, 12, -14, 3, 3, '#ff8a7a'); break;
      case 'stove': P.rrect(g, 3, -4, 26, 32, 6, '#c9a888', L, 1.4); P.rrect(g, 8, 10, 16, 12, [8, 8, 2, 2], '#3a2f3f', L, 1.1); P.blob(g, 16, 18, 4, 3, '#ff9a3a'); P.blob(g, 16, 18, 2, 1.6, '#ffe28a'); P.blob(g, 16, -6, 9, 4, '#9aa5b0', L, 1.2); P.rrect(g, 14, -12, 4, 6, 2, '#9aa5b0', L, 1); break;
      case 'aquarium': { P.rrect(g, 4, 14, W - 8, 14, 3, woodD, L, 1.3); P.rrect(g, 4, -12, W - 8, 27, 5, 'rgba(143,211,255,0.75)', L, 1.4); P.rrect(g, 6, 6, W - 12, 8, 3, '#e8d2a0'); const tt = G.time.now() / 60000 / G.time.SPEED * 6; for (const [k, col] of [[0, '#ff9a3a'], [1, '#ffd24d']]) { const fx = 14 + ((tt * 8 + k * 20) % (W - 28)); P.blob(g, fx, -2 + k * 6, 3.4, 2.2, col, L, 0.8); } for (let k = 0; k < 3; k++) P.blob(g, 10 + k * 3, -6 - ((tt * 10 + k * 4) % 8), 1, 1, 'rgba(255,255,255,0.8)'); P.blob(g, W - 14, 4, 2, 6, '#7cc35a'); break; }
      case 'wardrobe': P.rrect(g, 3, -22, W - 6, 50, 6, c, L, 1.5); g.strokeStyle = L; g.lineWidth = 1.2; g.beginPath(); g.moveTo(W / 2, -18); g.lineTo(W / 2, 24); g.stroke(); P.blob(g, W / 2 - 4, 2, 1.6, 1.6, '#ffd24d', L, 0.8); P.blob(g, W / 2 + 4, 2, 1.6, 1.6, '#ffd24d', L, 0.8); for (const x of [12, W - 12]) P.blob(g, x, -14, 5, 3, 'rgba(255,255,255,0.6)'); break;
      case 'bench': g.fillStyle = woodD; for (const x of [8, W - 8]) g.fillRect(x - 2, 14, 4, 14); P.rrect(g, 3, 10, W - 6, 8, 3, wood, L, 1.3); P.rrect(g, 3, -6, W - 6, 7, 3, woodL, L, 1.2); P.rrect(g, 3, 3, W - 6, 6, 3, woodL, L, 1.2); break;
      case 'floorlamp': P.blob(g, 16, 27, 7, 2.6, woodD, L, 1.1); g.strokeStyle = woodD; g.lineWidth = 2.4; g.beginPath(); g.moveTo(16, 26); g.lineTo(16, -6); g.stroke(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; P.blob(g, 16 + Math.cos(a) * 6, -12 + Math.sin(a) * 6, 4.5, 4.5, c, L, 1.1); } P.blob(g, 16, -12, 4, 4, '#ffe28a', L, 1); break;
      case 'teddy': P.blob(g, 16, 20, 9, 8, c, L, 1.4); for (const x of [9, 23]) P.blob(g, x, 25, 3.4, 3, c, L, 1.1); P.blob(g, 16, 6, 8, 7.5, c, L, 1.4); for (const x of [9, 23]) P.blob(g, x, 0, 3, 3, c, L, 1.1); P.blob(g, 16, 9, 3, 2.2, '#fff3e0'); P.blob(g, 16, 8, 1.2, 0.9, L); P.blob(g, 13, 5, 0.9, 1.1, L); P.blob(g, 19, 5, 0.9, 1.1, L); P.blob(g, 16, 15, 3, 1.6, '#ff8fb1', L, 0.8); break;
      case 'tree_pot': P.rrect(g, 8, 16, 16, 12, [2, 2, 6, 6], '#c9d3da', L, 1.3); g.strokeStyle = woodD; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 17); g.lineTo(16, 0); g.stroke(); for (const [x, y, r] of [[16, -12, 11], [7, -4, 7], [25, -4, 7], [16, -22, 7]]) P.blob(g, x, y, r, r * 0.85, '#5aa548', L, 1.2); P.blob(g, 12, -16, 3, 2, '#8fd36a'); break;
      case 'desk': P.rrect(g, 2, -2, W - 4, 10, 3, wood, L, 1.4); g.fillStyle = woodD; g.fillRect(6, 8, 4, 20); P.rrect(g, W - 24, 8, 20, 20, 2, woodD, L, 1.2); P.blob(g, W - 14, 18, 1.6, 1.6, '#ffd24d'); P.rrect(g, 10, -10, 12, 8, 1, '#ffffff', L, 1); P.rrect(g, 30, -12, 4, 10, 1, '#ff8a7a'); P.rrect(g, 35, -10, 4, 8, 1, '#8fd3ff'); break;
      case 'fireplace': { P.rrect(g, 2, -20, W - 4, 48, 5, '#d0b8a8', L, 1.5); P.rrect(g, 0, -24, W, 7, 3, woodD, L, 1.3); P.rrect(g, 14, -4, W - 28, 28, [12, 12, 1, 1], '#3a2f3f', L, 1.3); const fl = Math.sin(G.time.now() / 400 / G.time.SPEED * 60) * 1.5; P.blob(g, W / 2, 16, 8, 6 + fl, '#ff9a3a'); P.blob(g, W / 2, 17, 4, 3.6 + fl * 0.5, '#ffe28a'); g.fillStyle = woodD; g.fillRect(W / 2 - 10, 21, 20, 3); break; }
      case 'starlamp': { P.blob(g, 16, 26, 6, 2.4, woodD, L, 1); g.strokeStyle = L; g.lineWidth = 1.4; g.beginPath(); g.moveTo(16, 25); g.lineTo(16, 10); g.stroke(); g.fillStyle = c; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 11, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(16 + Math.cos(a) * r, 2 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); P.blob(g, 14, 0, 2.2, 1.4, 'rgba(255,255,255,0.7)'); break; }
      case 'bathtub': P.rrect(g, 2, 0, W - 4, 26, 12, '#ffffff', L, 1.5); P.rrect(g, 6, 2, W - 12, 8, 4, c); for (let k = 0; k < 6; k++) P.blob(g, 10 + k * 9, 1 - (k % 2) * 3, 5, 4.5, '#ffffff', L, 0.9); g.fillStyle = '#c9d3da'; g.fillRect(8, 24, 4, 4); g.fillRect(W - 12, 24, 4, 4); P.rrect(g, W - 12, -12, 3, 14, 1.5, '#c9d3da', L, 1); break;
      case 'cake': P.rrect(g, 5, 16, 22, 10, 3, '#ffffff', L, 1.2); P.rrect(g, 8, 4, 16, 14, 4, '#ffd1dc', L, 1.3); P.rrect(g, 8, 4, 16, 4, 2, '#ffffff'); for (const x of [11, 16, 21]) { P.rrect(g, x - 1, -3, 2, 7, 1, '#8fd3ff'); P.blob(g, x, -5, 1.4, 2, '#ffd24d'); } P.blob(g, 16, 11, 2, 2, '#ff5a6a'); break;
      case 'globe': P.blob(g, 16, 27, 7, 2.4, woodD, L, 1.1); g.strokeStyle = woodD; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 26); g.lineTo(16, 18); g.arc(16, 4, 13, Math.PI * 0.6, Math.PI * 1.4, false); g.stroke(); P.blob(g, 16, 4, 11, 11, '#8fd3ff', L, 1.3); P.blob(g, 12, 0, 5, 4, '#7cc35a'); P.blob(g, 20, 8, 4, 3, '#7cc35a'); P.blob(g, 18, -4, 2.5, 2, '#7cc35a'); break;
      default: P.rrect(g, 4, 4, W - 8, Hh - 8, 4, '#ddd', L);
    }
  }
  H.drawFurn = drawFurn;
  // 아이콘(32×32)
  H.drawIcon = (g, id, x) => {
    const f = form(id); if (!f) return;
    const it = { f: id, r: 0, c: (x && x.c) || 0 };
    const w = f.w, h = f.h, s = Math.min(26 / (w * TILE), 26 / (h * TILE + 18));
    g.save(); g.translate(16 - w * TILE * s / 2, 30 - h * TILE * s); g.scale(s, s); drawFurn(g, it, w, h); g.restore();
  };

  // ---------- 실내 씬 ----------
  let RW = ROOM.w * TILE, RH = ROOM.h * TILE;
  let ox = 0, oy = 0, PXr = 2, savedPos = null, toolbar = null;
  const ed = { sel: null, drag: null, undo: [], moved: false };

  function layout() {
    const cv = G.game.canvas();
    // 방이 화면에 들어오도록 배율을 정한다(PC·폰 공통)
    PXr = Math.min(G.cam.PX * 1.25, cv.width / (RW + 40), cv.height / (RH + 150));
    ox = (cv.width / PXr - RW) / 2; oy = (cv.height / PXr - RH) / 2 - 10;
  }
  H.move = (e, dx, dy) => {
    const free = (x, y) => {
      if (x < e.r || x > RW - e.r) return false;
      if (y < ROOM.wall * TILE + 6 || y > RH + 14) return false;
      if (y > RH - 2 && Math.abs(x - (ROOM.door + 0.5) * TILE) > 14) return false;
      for (const o of st.items) {
        if (form(o.f).layer === 'rug') continue;
        const b = fp(o);
        if (x > o.x * TILE - 6 && x < (o.x + b.w) * TILE + 6 && y > o.y * TILE + 2 && y < (o.y + b.h) * TILE + 6) return false;
      }
      return true;
    };
    if (free(e.x + dx, e.y)) e.x += dx;
    if (free(e.x, e.y + dy)) e.y += dy;
  };

  H.enter = async () => {
    const pl = G.player;
    if (G.ranch) G.ranch.dismount();
    savedPos = { x: pl.x, y: pl.y };
    H.inside = true;
    syncRoom();
    // 붙박이 작업대
    if (!st.items.some((o) => o.f === 'workbench')) { const wb = { f: 'workbench', x: 0, y: ROOM.wall, r: 0, c: 0 }; const sp = H.canPlace(wb, 0, ROOM.wall) ? [0, ROOM.wall] : H.findSpot(wb); if (sp) { wb.x = sp[0]; wb.y = sp[1]; st.items.push(wb); } }
    G.fishing.cancel(true);
    pl.x = (ROOM.door + 0.5) * TILE; pl.y = RH - 6; pl.dir = 2;
    G.game.mover = H.move;
    G.audio.sfx('open');
    G.scene.push('interior');
    if (!st.starter) {
      st.starter = true;
      const box = ['bed', 'lamp', 'rug'];
      const lines = [{ who: 'sys', text: '텐트 안에 보리 할멈이 놓고 간 이삿짐 상자가 있어요.' }, { who: 'sys', text: '「포근 침대, 작은 등, 동그란 깔개를 넣어 두었단다. 마음대로 놓아 보렴. 콕!」' }];
      for (const id of box) { if (G.inv.add('furn:' + id, 1, { c: 0 }) !== 0) { const it = { f: id, x: 0, y: 0, r: 0, c: 0 }; const sp = H.findSpot(it); if (sp) { it.x = sp[0]; it.y = sp[1]; st.items.push(it); } } }
      G.save.mark('starter');
      await G.ui.say(lines);
      G.ui.toast((G.input.isTouch() ? '오른쪽 아래 「꾸미기」 버튼' : 'Q 키나 「꾸미기」 버튼') + '으로 가구를 놓아요!', { icon: '🛋️', ms: 4000 });
    }
  };
  H.exit = () => {
    if (ed.sel !== null || H.editing) endEdit();
    const pl = G.player; H.inside = false; G.game.mover = null;
    if (savedPos) { pl.x = savedPos.x; pl.y = savedPos.y + 6; } pl.dir = 0;
    if (G.game.unstick) G.game.unstick(); // 문 앞이 다른 건물과 겹치는 지도에서 갇히지 않게
    G.scene.pop(); G.audio.sfx('close'); G.ui.refreshHud(); G.save.mark('area');
  };

  function targetIn() {
    const pl = G.player; const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]]; const [dx, dy] = DIRS[pl.dir];
    const fx = pl.x + dx * 22, fy = pl.y + dy * 22 - 4;
    for (const o of st.items) {
      const b = fp(o); const f = form(o.f);
      if (f.layer === 'rug') continue;
      if (fx > o.x * TILE - 4 && fx < (o.x + b.w) * TILE + 4 && fy > o.y * TILE - 6 && fy < (o.y + b.h) * TILE + 10) return o;
    }
    return null;
  }

  G.scene.define('interior', {
    world: false, opaque: true,
    enter() { layout(); G.ui.refreshHud(); },
    resume() { layout(); },
    update(dt) {
      const t = G.game.t;
      if (!H.editing) G.game.updatePlayer(dt);
      G.game.updateKongal(dt, t); G.game.updateFx(dt);
      G.ui.updateDialog(dt);
      G.ui.drawStick(H.editing ? null : G.input.stick);
      if (G.audio.music) G.audio.music.update();
      if (!H.editing && G.player.y > RH + 8) { H.exit(); return; }
      if (!H.editing) {
        const o = targetIn();
        H.target = o;
        if (G.ui.dialogOpen() || G.ui.open) G.ui.setAction('✋', '', '');
        else if (o) G.ui.setAction(o.f === 'bed' ? '😴' : o.f === 'radio' ? '🎵' : o.f === 'workbench' ? '🔨' : '✋', o.f === 'bed' ? '쉬기' : o.f === 'radio' ? '켜기' : o.f === 'workbench' ? '만들기' : '만지기', form(o.f).name);
        else G.ui.setAction('🚪', G.player.y > RH - 30 ? '나가기' : '', '');
      }
    },
    draw(ctx) { drawRoom(ctx, G.game.t); },
    input(ev) {
      if (G.ui.modalInput(ev)) return true;
      if (G.ui.dialogInput(ev)) return true;
      if (H.editing) return editInput(ev);
      if (ev.type === 'tool') { startEdit(); return true; }
      if (ev.type === 'menu') { G.ui.notebook(); return true; }
      if (ev.type === 'map') { G.map.open(); return true; }
      if (ev.type === 'act') { act(); return true; }
      if (ev.type === 'back') { H.exit(); return true; }
      if (ev.type === 'tapWorld' && ev.mouse) { const p = toRoom(ev.cx, ev.cy); const pl = G.player; pl.dir = G.npc.faceDir(p.x - pl.x, p.y - pl.y); act(); return true; }
      return false;
    },
    pointer(kind, e) { if (!H.editing) return false; editPointer(kind, e); return true; },
  });

  async function act() {
    const o = H.target, pl = G.player;
    if (!o) { if (pl.y > RH - 30) H.exit(); else { pl.squash = 0.12; G.audio.sfx('bump'); } return; }
    o.wob = 0.35;
    if (o.f === 'bed') await G.game.restMenu();
    else if (o.f === 'workbench') await G.craft.open();
    else if (o.f === 'radio') { G.audio.sfx('chime'); G.game.kongalSay('♪'); }
    else if (o.f === 'clock') { const l = G.time.label(); await G.ui.say([{ who: 'sys', text: `똑딱똑딱. 지금은 ${l.clock}이에요.` }]); }
    else { G.audio.sfx('tap'); }
  }

  function toRoom(cx, cy) { const dpr = Math.min(globalThis.devicePixelRatio || 1, 2); return { x: cx * dpr / PXr - ox, y: cy * dpr / PXr - oy }; }

  // ---------- 그리기 ----------
  function drawRoom(ctx, t) {
    const cv = G.game.canvas();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#3f3346'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(PXr, 0, 0, PXr, ox * PXr, oy * PXr);
    const P = G.art.paint;
    const wallH = ROOM.wall * TILE;
    // 텐트 천장 곡선 + 벽 줄무늬
    ctx.save();
    const stage = G.nest ? G.nest.st.stage : 0;
    ctx.beginPath();
    if (stage === 0) { ctx.moveTo(-8, wallH); ctx.lineTo(-8, 10); ctx.quadraticCurveTo(RW / 2, -40, RW + 8, 10); ctx.lineTo(RW + 8, wallH); }
    else { ctx.moveTo(-8, wallH); ctx.lineTo(-8, -6); ctx.lineTo(RW + 8, -6); ctx.lineTo(RW + 8, wallH); }
    ctx.closePath();
    ctx.fillStyle = stage === 0 ? '#ffd08a' : stage === 1 ? '#d9a877' : stage === 3 ? '#fff0d8' : stage === 4 ? '#f3ecff' : '#ffe6ee'; ctx.fill(); ctx.clip();
    if (stage === 0) for (let k = 0; k < 20; k++) { ctx.fillStyle = '#ffb05a'; ctx.fillRect(k * 22 - 4, -50, 10, wallH + 60); }
    else if (stage === 1) for (let y = -6; y < wallH; y += 12) { ctx.fillStyle = (y / 12) % 2 ? '#c99868' : '#e2b88a'; ctx.fillRect(-8, y, RW + 16, 11); P.blob(ctx, -2, y + 5, 4, 5, '#b8875a'); P.blob(ctx, RW + 2, y + 5, 4, 5, '#b8875a'); }
    else if (stage >= 3) { const c = stage === 3 ? '#f0c8a8' : '#d8c8ff'; for (let x = -8; x < RW + 16; x += 20) { ctx.fillStyle = c; ctx.fillRect(x, -6, 8, wallH); } ctx.fillStyle = stage === 3 ? '#c98e5a' : '#a88ad8'; ctx.fillRect(-8, wallH - 14, RW + 16, 14); }
    else { for (let y = 0; y < wallH; y += 16) for (let x = (y / 16) % 2 * 16; x < RW + 16; x += 32) P.blob(ctx, x, y + 6, 3, 3, '#ffc2d6'); ctx.fillStyle = '#e8c494'; ctx.fillRect(-8, wallH - 14, RW + 16, 14); }
    if (st.wall && WALLS[st.wall]) paintPattern(ctx, P, WALLS[st.wall], -8, -50, RW + 16, wallH + 50, t); // 고른 벽지
    if (stage > 0) { P.rrect(ctx, RW / 2 - 26, 4, 52, 30, 6, '#bfe6f5', L, 1.6); ctx.fillStyle = L; ctx.fillRect(RW / 2 - 1, 4, 2, 30); ctx.fillRect(RW / 2 - 26, 18, 52, 2); }
    ctx.fillStyle = 'rgba(91,70,54,0.12)'; ctx.fillRect(-8, wallH - 10, RW + 16, 10);
    ctx.restore();
    // 바닥 판자
    P.rrect(ctx, -8, wallH, RW + 16, RH - wallH + 8, [0, 0, 14, 14], '#e8c494', L, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(-6, wallH, RW + 12, RH - wallH + 6); ctx.clip();
    for (let y = wallH; y < RH + 8; y += 16) { ctx.fillStyle = (y / 16) % 2 ? '#e2bb88' : '#ecca9c'; ctx.fillRect(-8, y, RW + 16, 15); ctx.fillStyle = 'rgba(156,106,64,0.35)'; for (let x = ((y / 16) % 2) * 40; x < RW + 16; x += 80) ctx.fillRect(x - 8, y, 2, 15); }
    if (st.floor && FLOORS[st.floor]) paintPattern(ctx, P, FLOORS[st.floor], -8, wallH, RW + 16, RH - wallH + 8, t); // 고른 바닥
    ctx.restore();
    // 문 깔판
    P.rrect(ctx, ROOM.door * TILE + 2, RH - 4, TILE - 4, 14, 5, '#9fd0a8', L, 1.3);
    // 편집 격자
    if (H.editing) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      for (let x = 0; x <= ROOM.w; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, wallH); ctx.lineTo(x * TILE, RH); ctx.stroke(); }
      for (let y = ROOM.wall; y <= ROOM.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(RW, y * TILE); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    // 러그 층
    for (const o of st.items) if (form(o.f).layer === 'rug') drawItem(ctx, o, t);
    // 가구 + 플레이어 y-정렬
    const R = [];
    for (const o of st.items) if (form(o.f).layer !== 'rug') { const b = fp(o); R.push({ sy: (o.y + b.h) * TILE - 2, draw: () => drawItem(ctx, o, t) }); }
    if (!H.editing) R.push({ sy: G.player.y, draw: () => G.game.drawPlayer(ctx, t) });
    R.sort((a, b) => a.sy - b.sy); for (const r of R) r.draw();
    // 이펙트
    for (const f of G.game.fx) { const a = 1 - f.t / f.life; ctx.globalAlpha = a; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, 6.28); ctx.fill(); }
    ctx.globalAlpha = 1;
    // 밤: 살짝 어둡게 + 등 빛
    const d = G.time.date(); const g = G.art.gradeAt(d.getHours() + d.getMinutes() / 60);
    if (g.a > 0.2) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(40,30,70,${(g.a - 0.2) * 0.5})`; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'lighter';
      for (const o of st.items) if (form(o.f).light) { const sp = G.art.light(60, 'rgba(255,210,140,0.5)'); const b = fp(o); ctx.drawImage(sp, ((o.x + b.w / 2) * TILE + ox - 60) * PXr, (o.y * TILE + oy - 60) * PXr); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(PXr, 0, 0, PXr, ox * PXr, oy * PXr);
    }
    if (!H.editing && G.game.kg.sayT > 0) G.game.bubble(G.player.x, G.player.y - 74, G.game.kg.say, Math.min(1, G.game.kg.sayT * 3));
    if (G.player.hold) G.game.drawHeld(t);
  }
  function drawItem(ctx, o, t) {
    const b = fp(o);
    ctx.save();
    ctx.translate(o.x * TILE, o.y * TILE);
    const sel = H.editing && ed.sel === o;
    if (o.wob > 0) { o.wob -= G.loop.dt; ctx.translate(b.w * 16, b.h * TILE); ctx.scale(1 + Math.sin(o.wob * 30) * 0.04 * o.wob * 3, 1 - Math.sin(o.wob * 30) * 0.04 * o.wob * 3); ctx.translate(-b.w * 16, -b.h * TILE); }
    if (sel) {
      const ok = H.canPlace(o, o.x, o.y, o);
      ctx.fillStyle = ok ? 'rgba(127,211,184,0.35)' : 'rgba(255,107,107,0.35)'; ctx.fillRect(0, 0, b.w * TILE, b.h * TILE);
      ctx.translate(0, -4 - Math.abs(Math.sin(t * 5)) * 2);
    }
    drawFurn(ctx, o, b.w, b.h);
    if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -t * 12; ctx.strokeRect(1, 1, b.w * TILE - 2, b.h * TILE - 2); ctx.setLineDash([]); }
    ctx.restore();
  }

  // ---------- 꾸미기 ----------
  function snap() { return st.items.map((o) => Object.assign({}, o)); }
  function pushUndo() { ed.undo.push({ items: snap(), sel: ed.sel ? st.items.indexOf(ed.sel) : -1 }); if (ed.undo.length > 30) ed.undo.shift(); }
  function changed() { G.save.mark('house'); G.emit('house:change', { room: 'tent', count: st.items.length }); }

  function startEdit() {
    if (H.editing) return;
    H.editing = true; ed.sel = null; ed.undo = []; ed.drag = null;
    G.input.lock('edit'); G.ui.hud(false);
    G.audio.sfx('open');
    buildToolbar();
    addEventListener('keydown', onKey);
  }
  function endEdit() {
    H.editing = false; ed.sel = null; ed.drag = null;
    G.input.unlock('edit'); G.ui.hud(true);
    if (toolbar) { toolbar.remove(); toolbar = null; }
    removeEventListener('keydown', onKey);
    G.audio.sfx('close'); G.save.now('house');
    const r = H.rate();
    if (r.petals !== st.rated) { st.rated = r.petals; G.emit('house:rated', { grade: r.petals }); }
    G.ui.toast(`아늑지수 ${'🌸'.repeat(r.petals)}${r.hints[0] ? ' — ' + r.hints[0] : ''}`, { icon: '🏡', ms: 3600 });
    if (st.items.some((o) => o.f === 'rug')) { G.game.kongalSay('새근~'); }
  }
  // 벽지·바닥 고르기 (무료, 언제든)
  function openWallpaper() {
    G.ui.modal('벽지·바닥 꾸미기', (body) => {
      const render = () => {
        body.innerHTML = '';
        for (const [key, list, title] of [['wall', WALLS, '🧱 벽지'], ['floor', FLOORS, '🪵 바닥']]) {
          const h = document.createElement('div'); h.className = 'pane-head'; h.innerHTML = `<span>${title}</span>`; body.append(h);
          const row = document.createElement('div'); row.className = 'chips';
          list.forEach((d, i) => {
            const c = document.createElement('button'); c.className = 'chip' + ((st[key] || 0) === i ? ' on' : '');
            c.innerHTML = d ? `<i class="swatch" style="background:linear-gradient(135deg, ${d.c1} 50%, ${d.c2} 50%)"></i>${d.name}` : '집 기본';
            c.onclick = () => { st[key] = i; G.audio.sfx('pop'); changed(); render(); };
            row.append(c);
          });
          body.append(row);
        }
        const n = document.createElement('div'); n.className = 'muted small'; n.textContent = '언제든 무료로 바꿀 수 있어요. 창을 닫으면 방에서 바로 보여요.'; body.append(n);
      };
      render();
    });
  }
  function buildToolbar() {
    const $ = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
    toolbar = $('div', 'edit-bar');
    const tip = $('div', 'edit-tip', G.input.isTouch() ? '가구를 눌러 고르고, 끌거나 빈 칸을 눌러 옮겨요' : '가구를 클릭해 고르고 끌어서 옮겨요 · 방향키 이동 · R 회전 · Del 넣기 · Z 되돌리기');
    const row = $('div', 'edit-row');
    const b = (ico, label, fn, cls) => { const x = $('button', 'edit-btn' + (cls ? ' ' + cls : ''), `<span>${ico}</span><small>${label}</small>`); x.onclick = (e) => { e.stopPropagation(); G.audio.sfx('tap'); fn(); }; row.append(x); return x; };
    b('📦', '꺼내기', openPicker);
    b('↻', '돌리기', rotateSel);
    b('🎒', '넣기', storeSel);
    b('🎨', '벽지·바닥', openWallpaper);
    b('↶', '되돌리기', undo);
    b('✔', '다 했어요', endEdit, 'done');
    toolbar.append(tip, row);
    G.ui.root.append(toolbar);
  }
  function onKey(e) {
    if (!H.editing || G.ui.open) return;
    const k = e.code;
    const mv = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }[k];
    if (mv && ed.sel) { e.preventDefault(); nudge(mv[0], mv[1]); }
    else if (k === 'Delete' || k === 'KeyX') storeSel();
    else if (k === 'KeyZ' && !e.repeat) undo();
    else if (k === 'KeyF') openPicker();
  }
  function editInput(ev) {
    if (ev.type === 'tool') { rotateSel(); return true; }          // Q·R
    if (ev.type === 'back') { if (ed.sel) { ed.sel = null; } else endEdit(); return true; }
    if (ev.type === 'menu') { openPicker(); return true; }
    if (ev.type === 'act') { if (!ed.sel) endEdit(); else ed.sel = null; return true; }
    return true;
  }
  function itemAt(x, y) {
    // 위에 그려진 것부터: 가구 층 → 러그 층
    const cand = st.items.filter((o) => { if (form(o.f).fixed) return false; const b = fp(o); const f = form(o.f); const top = f.layer === 'rug' ? 0 : 14; return x >= o.x * TILE && x < (o.x + b.w) * TILE && y >= o.y * TILE - top && y < (o.y + b.h) * TILE; });
    cand.sort((a, b) => (form(a.f).layer === 'rug') - (form(b.f).layer === 'rug') || (b.y - a.y));
    return cand[0] || null;
  }
  function editPointer(kind, e) {
    const p = toRoom(e.clientX, e.clientY);
    if (kind === 'down') {
      const o = itemAt(p.x, p.y);
      if (o) {
        if (ed.sel !== o) G.audio.sfx('pop');
        ed.sel = o; o.wob = 0.25;
        ed.drag = { dx: p.x - o.x * TILE, dy: p.y - o.y * TILE, start: [o.x, o.y], pushed: false };
      } else if (ed.sel) {
        // 빈 칸을 누르면 그쪽으로 옮긴다(폰에서 끌기 어려울 때)
        const b = fp(ed.sel);
        const tx = Math.floor(p.x / TILE - b.w / 2 + 0.5), ty = Math.floor(p.y / TILE - b.h / 2 + 0.5);
        tryMove(ed.sel, tx, ty, true);
      }
    } else if (kind === 'move' && ed.drag && ed.sel) {
      const tx = Math.round((p.x - ed.drag.dx) / TILE), ty = Math.round((p.y - ed.drag.dy) / TILE);
      if (tx !== ed.sel.x || ty !== ed.sel.y) {
        if (H.canPlace(ed.sel, tx, ty, ed.sel)) {
          if (!ed.drag.pushed) { pushUndo(); ed.drag.pushed = true; }
          ed.sel.x = tx; ed.sel.y = ty; G.audio.sfx('step', { surf: 'wood', vol: 1.5 });
        }
      }
    } else if (kind === 'up') {
      if (ed.drag && ed.drag.pushed) { ed.sel.wob = 0.3; G.audio.sfx('drop'); changed(); }
      ed.drag = null;
    }
  }
  function tryMove(o, tx, ty, snd) {
    if (!H.canPlace(o, tx, ty, o)) { if (snd) G.audio.sfx('error'); return false; }
    pushUndo(); o.x = tx; o.y = ty; o.wob = 0.3; if (snd) G.audio.sfx('drop'); changed(); return true;
  }
  function nudge(dx, dy) { tryMove(ed.sel, ed.sel.x + dx, ed.sel.y + dy, true); }
  function rotateSel() {
    const o = ed.sel; if (!o) { G.ui.toast('먼저 가구를 골라요.', { icon: '👆', ms: 1400 }); return; }
    const f = form(o.f);
    if (!f.rot && !f.rot4) { o.wob = 0.3; G.audio.sfx('bump'); return; }
    pushUndo();
    const old = o.r; o.r = (o.r + (f.rot && !f.rot4 ? 1 : 1)) % 4;
    if (!H.canPlace(o, o.x, o.y, o)) {
      const sp = H.findSpot(o); if (sp) { o.x = sp[0]; o.y = sp[1]; } else { o.r = old; ed.undo.pop(); G.audio.sfx('error'); return; }
    }
    o.wob = 0.35; G.audio.sfx('pop'); changed();
  }
  function storeSel() {
    const o = ed.sel; if (!o) { G.ui.toast('먼저 가구를 골라요.', { icon: '👆', ms: 1400 }); return; }
    if (!G.inv.canFit('furn:' + o.f, { c: o.c })) { G.ui.toast('가방이 꽉 찼어요.', { icon: '🎒' }); G.audio.sfx('error'); return; }
    pushUndo();
    st.items.splice(st.items.indexOf(o), 1); ed.sel = null;
    G.inv.add('furn:' + o.f, 1, { c: o.c });
    G.audio.sfx('pickup'); changed();
  }
  function undo() {
    const u0 = ed.undo.pop(); if (!u0) { G.audio.sfx('bump'); return; }
    // 가방과 방 사이 이동도 되돌린다: 차이를 가방에 반영
    const before = count(st.items), after = count(u0.items);
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const d = (after[k] || 0) - (before[k] || 0); const [f, c] = k.split('|');
      if (d > 0) for (let i = 0; i < d; i++) removeFurnFromBag(f, +c);
      if (d < 0) for (let i = 0; i < -d; i++) G.inv.add('furn:' + f, 1, { c: +c });
    }
    st.items = u0.items; ed.sel = u0.sel >= 0 ? st.items[u0.sel] : null;
    G.audio.sfx('close'); changed();
  }
  function count(items) { const m = {}; for (const o of items) { const k = o.f + '|' + (o.c || 0); m[k] = (m[k] || 0) + 1; } return m; }
  function removeFurnFromBag(f, c) { const i = G.inv.slots.findIndex((s) => s.id === 'furn:' + f && ((s.x && s.x.c) || 0) === c); if (i >= 0) G.inv.removeAt(i, 1); }
  function openPicker() {
    const list = G.inv.slots.map((s, i) => ({ s, i })).filter((e) => e.s.id.startsWith('furn:'));
    G.ui.modal('가방 속 가구', (body, close) => {
      if (!list.length) { body.innerHTML = '<div class="slot-info">가방에 가구가 없어요. 땅굴상점 가판대에서 매일 다른 가구를 팔아요!</div>'; return; }
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const { s, i } of list) {
        const c = document.createElement('button'); c.className = 'slot';
        c.innerHTML = `<img src="${G.art.iconURL(s.id + '#' + ((s.x && s.x.c) || 0), 64)}" alt="">`;
        c.title = G.items.name(s.id);
        c.onclick = () => {
          const f = s.id.slice(5), col = (s.x && s.x.c) || 0;
          const it = { f, x: 0, y: 0, r: 0, c: col };
          const sp = H.findSpot(it);
          if (!sp) { G.ui.toast('놓을 자리가 없어요. 다른 가구를 넣어 볼까요?', { icon: '📦' }); G.audio.sfx('error'); return; }
          pushUndo();
          it.x = sp[0]; it.y = sp[1]; it.wob = 0.4;
          G.inv.removeAt(i, 1); st.items.push(it); ed.sel = it;
          G.audio.sfx('pop'); changed(); close();
        };
        grid.append(c);
      }
      body.append(grid);
    });
  }

  G.on('house:stage', () => { syncRoom(); if (H.inside) layout(); });
  G.modules.add('house');
})(globalThis.G);
