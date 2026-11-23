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
  ];
  G.data.table('furn', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'w', 'h', 'val'] });
  G.data.add('furn', FORMS);
  // 가방 아이템: 판매가 = 값의 1/4
  G.data.add('items', FORMS.map((f) => ({ id: 'furn:' + f.id, name: f.name, cat: 'furn', val: Math.round(f.val / 4), stack: 1, ref: f, buy: f.val })));

  // ---------- 상태 ----------
  // 방: 7×6 타일, 위 2줄은 벽, 바닥 7×4, 문은 아래 가운데
  const ROOM = { w: 7, h: 6, wall: 2, door: 3 };
  const st = { items: [], starter: false, rated: 0 }; // items: {f, x, y, r, c}
  const H = G.house = { inside: false, st, ROOM, FORMS, COLS, COLN, editing: false };

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
    v: 1, def: () => ({ items: [], starter: false, rated: 0 }),
    get: () => ({ items: st.items.map((o) => [o.f, o.x, o.y, o.r, o.c]), starter: st.starter, rated: st.rated }),
    set: (d) => { st.items = (d.items || []).filter((a) => form(a[0])).map((a) => ({ f: a[0], x: a[1], y: a[2], r: a[3] || 0, c: a[4] || 0 })); st.starter = !!d.starter; st.rated = d.rated || 0; },
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
      case 'clock': { P.rrect(g, 8, 4, 16, 22, 6, '#fff3e2', L, 1.4); P.blob(g, 16, 12, 6, 6, '#ffffff', L, 1.1); const t = Date.now() / 1000; g.strokeStyle = L; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16, 12); g.lineTo(16 + Math.sin(t / 60) * 4, 12 - Math.cos(t / 60) * 4); g.moveTo(16, 12); g.lineTo(16 + Math.sin(t / 720) * 3, 12 - Math.cos(t / 720) * 3); g.stroke(); P.blob(g, 11, 27, 2.5, 1.5, woodD); P.blob(g, 21, 27, 2.5, 1.5, woodD); break; }
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
  const RW = ROOM.w * TILE, RH = ROOM.h * TILE;
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
    savedPos = { x: pl.x, y: pl.y };
    H.inside = true;
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
        else if (o) G.ui.setAction(o.f === 'bed' ? '😴' : o.f === 'radio' ? '🎵' : '✋', o.f === 'bed' ? '쉬기' : o.f === 'radio' ? '켜기' : '만지기', form(o.f).name);
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
    ctx.beginPath(); ctx.moveTo(-8, wallH); ctx.lineTo(-8, 10); ctx.quadraticCurveTo(RW / 2, -40, RW + 8, 10); ctx.lineTo(RW + 8, wallH); ctx.closePath();
    ctx.fillStyle = '#ffd08a'; ctx.fill(); ctx.clip();
    for (let k = 0; k < 12; k++) { ctx.fillStyle = '#ffb05a'; ctx.fillRect(k * 22 - 4, -50, 10, wallH + 60); }
    ctx.fillStyle = 'rgba(91,70,54,0.12)'; ctx.fillRect(-8, wallH - 10, RW + 16, 10);
    ctx.restore();
    // 바닥 판자
    P.rrect(ctx, -8, wallH, RW + 16, RH - wallH + 8, [0, 0, 14, 14], '#e8c494', L, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(-6, wallH, RW + 12, RH - wallH + 6); ctx.clip();
    for (let y = wallH; y < RH + 8; y += 16) { ctx.fillStyle = (y / 16) % 2 ? '#e2bb88' : '#ecca9c'; ctx.fillRect(-8, y, RW + 16, 15); ctx.fillStyle = 'rgba(156,106,64,0.35)'; for (let x = ((y / 16) % 2) * 40; x < RW + 16; x += 80) ctx.fillRect(x - 8, y, 2, 15); }
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
  function buildToolbar() {
    const $ = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
    toolbar = $('div', 'edit-bar');
    const tip = $('div', 'edit-tip', G.input.isTouch() ? '가구를 눌러 고르고, 끌거나 빈 칸을 눌러 옮겨요' : '가구를 클릭해 고르고 끌어서 옮겨요 · 방향키 이동 · R 회전 · Del 넣기 · Z 되돌리기');
    const row = $('div', 'edit-row');
    const b = (ico, label, fn, cls) => { const x = $('button', 'edit-btn' + (cls ? ' ' + cls : ''), `<span>${ico}</span><small>${label}</small>`); x.onclick = (e) => { e.stopPropagation(); G.audio.sfx('tap'); fn(); }; row.append(x); return x; };
    b('📦', '꺼내기', openPicker);
    b('↻', '돌리기', rotateSel);
    b('🎒', '넣기', storeSel);
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
    const cand = st.items.filter((o) => { const b = fp(o); const f = form(o.f); const top = f.layer === 'rug' ? 0 : 14; return x >= o.x * TILE && x < (o.x + b.w) * TILE && y >= o.y * TILE - top && y < (o.y + b.h) * TILE; });
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

  G.modules.add('house');
})(globalThis.G);
