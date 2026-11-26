// 걸어 다니는 박물관 (11차 회의 결정 1): 박물관 천막에 들어가면 로비(화석관) · 왼쪽 문 곤충 온실 · 오른쪽 문 수족관
// 기증한 생물이 유리 상자·어항 속에서 움직이고, 아직 없는 자리는 검은 실루엣과 「?」. 앞에 서서 행동 = 이름·사는 곳·때
(function (G) {
  'use strict';
  const TILE = G.C.TILE, A = G.art;
  const MH = G.museumHall = { inside: false, hall: 'lobby' };
  const HALLS = {
    lobby: { w: 16, h: 11, name: '🦴 화석관', wall: '#e9dfcf', wall2: '#d9ccb6', floor: ['#cfc6b8', '#c2b8a8'] },
    bug: { w: 16, h: 12, name: '🦋 곤충 온실', wall: '#d6efd0', wall2: '#bfe3b6', floor: ['#bcd9a0', '#aecd92'] },
    fish: { w: 16, h: 12, name: '🐟 수족관', wall: '#2f5f86', wall2: '#27507a', floor: ['#8fb4cc', '#82a8c2'] },
  };
  const LOC = { flower: '꽃 근처', air: '하늘', tree: '나무', ground: '땅 위', lamp: '밤 가로등 근처', rock: '바위', river: '강', pond: '연못', sea: '바다', surface: '물 위', water: '물가' };
  const KIND = { bug: ['bug', 'bugs'], fish: ['fish', 'fish'], sea: ['sea', 'sea'], fossil: ['fossil', 'fossils'] };
  let RW = 0, RH = 0, ox = 0, oy = 0, PXr = 2, saved = null, slots = [];

  // ---------- 전시 칸 만들기 ----------
  function buildSlots(hall) {
    const out = [];
    const grid = (list, kind, rows, xs) => { let i = 0; for (const y of rows) for (const x of xs) { if (i >= list.length) return; out.push({ x, y, kind, r: list[i++] }); } };
    const xs14 = []; for (let x = 1; x <= 14; x++) xs14.push(x);
    if (hall === 'bug') grid(G.data.all('bugs'), 'bug', [3, 5, 7, 9], xs14);
    else if (hall === 'fish') grid(G.data.all('fish').map((r) => ({ r, k: 'fish' })).concat(G.data.all('sea').map((r) => ({ r, k: 'sea' }))), 'mix', [3, 5, 7, 9], xs14);
    else grid(G.data.all('fossils'), 'fossil', [4, 7], [2, 4, 6, 9, 11, 13]);
    for (const s of out) if (s.kind === 'mix') { s.kind = s.r.k; s.r = s.r.r; }
    return out;
  }
  const donated = (s) => G.museum.donated(s.kind, s.r.ix);
  const iconId = (s) => `${KIND[s.kind][0]}:${s.r.id}`;
  const icon = (s) => A.sprite('mhi:' + iconId(s), 32, 32, (g) => A.drawIcon(g, iconId(s), 0));
  const shadow = (s) => A.sprite('mhs:' + iconId(s), 32, 32, (g) => { A.drawIcon(g, iconId(s), 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#3a3048'; g.fillRect(0, 0, 32, 32); });

  // ---------- 들어가기·나가기·문 ----------
  MH.enter = (hall = 'lobby', from) => {
    const pl = G.player;
    if (!MH.inside) { saved = { x: pl.x, y: pl.y }; if (G.ranch) G.ranch.dismount(); G.fishing.cancel(true); }
    MH.inside = true; MH.hall = hall; slots = buildSlots(hall); if (A.charImg) A.charImg('slowpoke');
    const H = HALLS[hall]; RW = H.w * TILE; RH = H.h * TILE;
    if (hall === 'lobby') { if (from === 'bug') { pl.x = TILE * 1.2; pl.y = TILE * 5.6; pl.dir = 3; } else if (from === 'fish') { pl.x = RW - TILE * 1.2; pl.y = TILE * 5.6; pl.dir = 1; } else { pl.x = RW / 2; pl.y = RH - 10; pl.dir = 2; } }
    else { pl.x = RW / 2; pl.y = RH - 10; pl.dir = 2; }
    G.game.mover = move;
    if (!G.scene.is('museum_in')) G.scene.push('museum_in'); else layout();
    G.audio.sfx('open');
    if (!G.museum.st.greetedHall && !(G.settings && G.settings.get('museumHallSeen'))) { G.museum.st.greetedHall = true; G.settings.set('museumHallSeen', true); setTimeout(() => G.ui.say([{ who: 'slowpoke', text: '어서… 오게나…. 여기는… 화석관이고…. 왼쪽 문은… 곤충 온실…, 오른쪽 문은… 수족관이라네….' }, { who: 'slowpoke', text: '기증해 준… 친구들이… 저마다… 자리를… 잡았다네…. 빈 자리는… 자네가… 채워 주게나….' }]), 300); }
  };
  MH.exit = () => {
    const pl = G.player; MH.inside = false; G.game.mover = null;
    if (saved) { pl.x = saved.x; pl.y = saved.y + 8; } pl.dir = 0;
    if (G.game.unstick) G.game.unstick();
    G.scene.pop(); G.audio.sfx('close'); G.ui.refreshHud();
  };
  function layout() {
    const cv = G.game.canvas();
    PXr = Math.min(G.cam.PX * 1.15, cv.width / (RW + 30), cv.height / (RH + 140));
    ox = (cv.width / PXr - RW) / 2; oy = (cv.height / PXr - RH) / 2 - 4;
  }
  // 문: 로비 아래(밖) · 로비 왼쪽(온실) · 로비 오른쪽(수족관) · 각 관 아래(로비)
  const DOOR_Y = 5.6;
  function move(e, dx, dy) {
    const H = HALLS[MH.hall];
    const free = (x, y) => {
      const sideDoor = MH.hall === 'lobby' && Math.abs(y - DOOR_Y * TILE) < 18;
      if ((x < e.r && !sideDoor) || (x > RW - e.r && !sideDoor)) return false;
      if (y < 2 * TILE + 8) return false;
      if (y > RH - 4 && Math.abs(x - RW / 2) > 22) return false;
      for (const s of slots) if (x > s.x * TILE - 4 && x < (s.x + 1) * TILE + 4 && y > s.y * TILE + 4 && y < (s.y + 1) * TILE + 8) return false;
      if (MH.hall === 'lobby' && x > (H.w / 2 - 1.5) * TILE && x < (H.w / 2 + 1.5) * TILE && y < 3 * TILE + 10) return false; // 박사님 책상
      return true;
    };
    if (free(e.x + dx, e.y)) e.x += dx;
    if (free(e.x, e.y + dy)) e.y += dy;
  }
  function checkDoors() {
    const pl = G.player;
    if (pl.y > RH + 12) { if (MH.hall === 'lobby') MH.exit(); else MH.enter('lobby', MH.hall); return true; }
    if (MH.hall === 'lobby' && pl.x < -6) { MH.enter('bug'); return true; }
    if (MH.hall === 'lobby' && pl.x > RW + 6) { MH.enter('fish'); return true; }
    return false;
  }
  // 앞에 있는 전시 칸 / 박사님
  function target() {
    const pl = G.player, D4 = [[0, 1], [-1, 0], [0, -1], [1, 0]], [dx, dy] = D4[pl.dir];
    const fx = pl.x + dx * 24, fy = pl.y + dy * 24 - 6;
    for (const s of slots) if (fx > s.x * TILE - 4 && fx < (s.x + 1) * TILE + 4 && fy > s.y * TILE - 6 && fy < (s.y + 1) * TILE + 10) return { s };
    if (MH.hall === 'lobby' && Math.abs(pl.x - RW / 2) < TILE * 1.6 && pl.y < 4.2 * TILE) return { doc: true };
    return null;
  }
  async function act() {
    const tg = target(), pl = G.player;
    if (!tg) { if (pl.y > RH - 30) { if (MH.hall === 'lobby') MH.exit(); else MH.enter('lobby', MH.hall); } else { pl.squash = 0.12; G.audio.sfx('bump'); } return; }
    if (tg.doc) { await G.museum.talk(); slots = buildSlots(MH.hall); return; }
    const s = tg.s, r = s.r, say = (text) => ({ who: 'slowpoke', text });
    const months = (m) => !m || m.length >= 12 ? '1년 내내' : m.length ? `${m[0]}~${m[m.length - 1]}월` : '';
    const where = LOC[r.loc] || (s.kind === 'sea' ? '썰물 때 바닷가 웅덩이' : s.kind === 'fossil' ? '땅의 금 간 자국' : '');
    if (donated(s)) { G.audio.sfx('chime'); await G.ui.say([say(`${r.name}…. ${s.kind === 'fossil' ? '아주… 오래전… 몽글숲에… 살던… 친구라네….' : `${months(r.months)}에… ${where}에서… 만날 수… 있지….`} 자네가… 기증해… 주었지….`)]); }
    else { G.audio.sfx('tap'); await G.ui.say([say(`아직… 비어 있는… 자리라네…. ${s.kind === 'fossil' ? '삽으로… 땅의 금 간 자국을… 파 보게나….' : `${months(r.months)}…, ${where}…를… 살펴보게나….`}`)]); }
  }

  // ---------- 장면 ----------
  G.scene.define('museum_in', {
    world: false, opaque: true,
    enter() { layout(); G.ui.refreshHud(); },
    resume() { layout(); },
    update(dt) {
      const t = G.game.t;
      G.game.updatePlayer(dt); G.game.updateKongal(dt, t); G.game.updateFx(dt);
      G.ui.updateDialog(dt); G.ui.drawStick(G.input.stick);
      if (G.audio.music) G.audio.music.update();
      if (checkDoors()) return;
      const tg = target();
      if (G.ui.dialogOpen() || G.ui.open) G.ui.setAction('✋', '', '');
      else if (tg && tg.doc) G.ui.setAction('🐢', '말 걸기', '느림보 박사');
      else if (tg) G.ui.setAction('🔍', '보기', donated(tg.s) ? tg.s.r.name : '빈 자리');
      else G.ui.setAction('🚪', G.player.y > RH - 30 ? '나가기' : '', '');
    },
    draw(ctx) { draw(ctx, G.game.t); },
    input(ev) {
      if (G.ui.modalInput(ev)) return true;
      if (G.ui.dialogInput(ev)) return true;
      if (ev.type === 'menu') { G.ui.notebook(); return true; }
      if (ev.type === 'map') { G.map.open(); return true; }
      if (ev.type === 'act') { act(); return true; }
      if (ev.type === 'back') { MH.exit(); return true; }
      return false;
    },
  });

  // ---------- 그리기 ----------
  function draw(ctx, t) {
    const cv = G.game.canvas(), H = HALLS[MH.hall], P = A.paint, L = '#5b4636';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2e2838'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(PXr, 0, 0, PXr, ox * PXr, oy * PXr);
    const wallH = 2 * TILE;
    // 벽
    P.rrect(ctx, -10, -14, RW + 20, wallH + 14, [14, 14, 0, 0], H.wall, L, 2);
    for (let x = 0; x < RW; x += 32) { ctx.fillStyle = H.wall2; ctx.fillRect(x + 4, -8, 24, wallH - 4); }
    G.scenery?.material(ctx, 'paper', [0, -8, RW, wallH + 8], 0.44, 'multiply');
    if (MH.hall === 'fish') { // 큰 벽 수조
      const gr = ctx.createLinearGradient(0, -8, 0, wallH); gr.addColorStop(0, '#5ab4e0'); gr.addColorStop(1, '#2a6f9a'); P.rrect(ctx, 20, -6, RW - 40, wallH - 6, 10, gr, '#1f4a6a', 2);
      for (let k = 0; k < 7; k++) { const x = 30 + ((t * 18 + k * 73) % (RW - 60)), y = 10 + (k * 13) % 34; ctx.globalAlpha = 0.5; P.blob(ctx, x, y, 7, 3, '#cfe8ff'); ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 12, y - 3); ctx.lineTo(x - 12, y + 3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
      for (let k = 0; k < 10; k++) { const ph = (t * 0.4 + k / 10) % 1; ctx.strokeStyle = `rgba(255,255,255,${1 - ph})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(40 + k * 45, wallH - 10 - ph * 50, 2 + k % 2, 0, 6.3); ctx.stroke(); }
    }
    if (MH.hall === 'bug') for (let k = 0; k < 6; k++) { const x = 30 + k * 85; P.rrect(ctx, x, 6, 60, 46, 8, 'rgba(255,255,255,0.45)', '#7aa86a', 1.5); ctx.fillStyle = 'rgba(120,170,100,0.5)'; ctx.fillRect(x + 29, 6, 2, 46); ctx.fillRect(x, 28, 60, 2); }
    if (MH.hall === 'lobby') { P.rrect(ctx, RW / 2 - 70, 4, 140, 26, 10, '#fff8ea', L, 1.6); ctx.fillStyle = '#5d6f68'; ctx.font = G.fontPx(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`조약돌 박물관 · ${G.museum.total()}점`, RW / 2, 17.5); }
    // 바닥
    ctx.save(); ctx.beginPath(); ctx.rect(-10, wallH, RW + 20, RH - wallH + 10); ctx.clip();
    for (let y = wallH; y < RH + 10; y += 32) for (let x = -32; x < RW + 32; x += 32) { ctx.fillStyle = ((x + y) / 32) % 2 ? H.floor[0] : H.floor[1]; ctx.fillRect(x, y, 32, 32); }
    G.scenery?.material(ctx, 'stone', [-10, wallH, RW + 20, RH - wallH + 10], 0.43, 'soft-light');
    ctx.restore();
    ctx.fillStyle = 'rgba(40,30,50,0.15)'; ctx.fillRect(-10, wallH, RW + 20, 8);
    // 문
    const door = (x, y, w, h) => P.rrect(ctx, x, y, w, h, 6, '#9fd0a8', L, 1.3);
    door(RW / 2 - 20, RH - 4, 40, 12);
    if (MH.hall === 'lobby') {
      P.rrect(ctx, -10, DOOR_Y * TILE - 22, 12, 40, 4, '#3a3048', null); P.rrect(ctx, RW - 2, DOOR_Y * TILE - 22, 12, 40, 4, '#3a3048', null);
      P.rrect(ctx, 6, DOOR_Y * TILE - 46, 66, 18, 8, '#e3f3d8', L, 1); P.rrect(ctx, RW - 72, DOOR_Y * TILE - 46, 66, 18, 8, '#d8ecf8', L, 1);
      ctx.font = G.fontPx(11); ctx.fillStyle = '#5b4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('← 곤충 온실', 39, DOOR_Y * TILE - 36.5); ctx.fillText('수족관 →', RW - 39, DOOR_Y * TILE - 36.5);
      // 박사님 책상 + 박사님
      P.rrect(ctx, RW / 2 - 44, 2 * TILE + 4, 88, 26, 6, '#c98e5a', L, 1.5);
      const doc = A.charImg && A.charImg('slowpoke');
      if (doc) ctx.drawImage(doc, RW / 2 - 18, 2 * TILE - 34, 36 * doc.naturalWidth / doc.naturalHeight, 40);
    } else {
      P.rrect(ctx, RW / 2 - 34, RH - 30, 68, 16, 8, '#fff8ea', L, 1); ctx.font = G.fontPx(11); ctx.fillStyle = '#5b4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↓ 로비', RW / 2, RH - 21.5);
    }
    // 전시물 + 플레이어 y정렬
    const R = [];
    for (const s of slots) R.push({ sy: (s.y + 1) * TILE, draw: () => drawSlot(ctx, s, t) });
    R.push({ sy: G.player.y, draw: () => G.game.drawPlayer(ctx, t) });
    R.sort((a, b) => a.sy - b.sy); for (const r of R) r.draw();
    // 관 이름 + 채운 수
    const n = slots.filter(donated).length;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255,250,241,0.92)'; const label = `${H.name}  ${n}/${slots.length}`;
    ctx.font = G.fontPx(15 * Math.min(2, G.cam.PX)); const tw = ctx.measureText(label).width + 28 * Math.min(2, G.cam.PX);
    const bx = cv.width / 2 - tw / 2, by = (oy - 6) * PXr - 40 * Math.min(2, G.cam.PX) * 0.5;
    ctx.beginPath(); ctx.roundRect(bx, Math.max(8, by), tw, 30 * Math.min(2, G.cam.PX) * 0.8, 14); ctx.fill();
    ctx.fillStyle = '#5b4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cv.width / 2, Math.max(8, by) + 12 * Math.min(2, G.cam.PX));
  }
  function drawSlot(ctx, s, t) {
    const P = A.paint, x = s.x * TILE, y = s.y * TILE, has = donated(s), seed = s.r.ix * 1.7;
    if (s.kind === 'bug') {
      P.rrect(ctx, x + 2, y + 22, 28, 10, 3, '#a8784a', '#5b4636', 1.2);
      P.rrect(ctx, x + 3, y - 4, 26, 27, 5, 'rgba(220,245,255,0.35)', '#7a9aa8', 1.2);
      P.blob(ctx, x + 16, y + 20, 11, 3, '#7cb84e', null);
      if (has) { const bob = Math.sin(t * 2.4 + seed) * 2.2, sx = Math.sin(t * 1.1 + seed) * 3; ctx.drawImage(icon(s), x + 5 + sx, y + 1 + bob, 22, 22); }
      else { ctx.globalAlpha = 0.35; ctx.drawImage(shadow(s), x + 6, y + 2, 20, 20); ctx.globalAlpha = 1; qmark(ctx, x + 16, y + 10); }
      P.blob(ctx, x + 8, y + 2, 2, 5, 'rgba(255,255,255,0.5)', null);
    } else if (s.kind === 'fish' || s.kind === 'sea') {
      P.rrect(ctx, x + 2, y + 24, 28, 8, 3, '#6a7a8a', '#3a4a5a', 1.2);
      const gr = ctx.createLinearGradient(0, y - 4, 0, y + 24); gr.addColorStop(0, '#9fdcf5'); gr.addColorStop(1, '#4e9ec8');
      P.rrect(ctx, x + 2, y - 4, 28, 28, 6, gr, '#2f6a8a', 1.3);
      P.blob(ctx, x + 16, y + 21, 12, 2.6, '#e8d8a8', null);
      ctx.strokeStyle = '#5aa548'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 7, y + 21); ctx.quadraticCurveTo(x + 4 + Math.sin(t * 2 + seed) * 2, y + 12, x + 7, y + 6); ctx.stroke();
      if (has) {
        const sw = Math.sin(t * 0.9 + seed), dir = Math.cos(t * 0.9 + seed) > 0 ? 1 : -1;
        ctx.save(); ctx.translate(x + 16 + sw * 5, y + 9 + Math.sin(t * 1.7 + seed) * 2); ctx.scale(s.kind === 'fish' ? dir : 1, 1); ctx.drawImage(icon(s), -10, -10, 20, 20); ctx.restore();
        const ph = (t * 0.6 + seed) % 1; ctx.strokeStyle = `rgba(255,255,255,${1 - ph})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 24, y + 18 - ph * 18, 1.5, 0, 6.3); ctx.stroke();
      } else { ctx.globalAlpha = 0.35; ctx.drawImage(shadow(s), x + 7, y, 18, 18); ctx.globalAlpha = 1; qmark(ctx, x + 16, y + 9); }
      P.blob(ctx, x + 7, y + 2, 1.6, 5, 'rgba(255,255,255,0.45)', null);
    } else {
      P.rrect(ctx, x + 4, y + 8, 24, 24, 3, '#d8d0c4', '#7a6a5a', 1.3); P.rrect(ctx, x + 1, y + 4, 30, 7, 3, '#e8e0d4', '#7a6a5a', 1.3);
      if (has) { ctx.drawImage(icon(s), x + 3, y - 22, 26, 26); }
      else { ctx.globalAlpha = 0.3; ctx.drawImage(shadow(s), x + 4, y - 20, 24, 24); ctx.globalAlpha = 1; qmark(ctx, x + 16, y - 8); }
    }
  }
  function qmark(ctx, x, y) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = G.fontPx(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y); }

  G.modules.add('museumhall');
})(globalThis.G);
