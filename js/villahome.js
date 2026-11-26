// 이웃 집 구경 (11차 회의 결정 2): 이웃 집 문을 두드리면 들어가 볼 수 있다. 이웃마다 성격에 맞게 꾸민 방
// 집에 있으면(집에 있는 시간·잠자는 시간) 안에서 만나 이야기할 수 있고, 자고 있으면 쌔근쌔근
(function (G) {
  'use strict';
  const TILE = G.C.TILE, A = G.art;
  const VH = G.villaHome = { inside: false, id: null };
  const W = 9, H = 7, WALL = 2;
  // [가구, x, y, 색, 회전]
  const ROOMS = {
    ddalang: { wall: '#ffe6ee', wall2: '#ffd1e0', floor: ['#f6dcc0', '#efd0b0'], items: [['bed', 0, 2, 0], ['rug', 3, 4, 0], ['teddy', 2, 2, 0], ['floorlamp', 8, 2, 0], ['radio', 7, 2, 0], ['cake', 5, 2, 0], ['plant', 0, 6, 0], ['cushion', 4, 4, 0]] },
    sogeum: { wall: '#dfeef8', wall2: '#c8e2f2', floor: ['#cfe0e8', '#c2d6e0'], items: [['aquarium', 0, 2, 0], ['desk', 6, 2, 0], ['globe', 8, 4, 0], ['shelf', 3, 2, 0], ['clock', 5, 2, 0], ['crate', 0, 6, 0], ['chair', 6, 3, 2]] },
    lime: { wall: '#eef8e4', wall2: '#dff0d0', floor: ['#e8dcc8', '#e0d2bc'], items: [['sofa', 3, 2, 2], ['plant', 0, 2, 0], ['tree_pot', 8, 2, 0], ['starlamp', 2, 2, 2], ['rug', 3, 4, 2], ['wardrobe', 6, 2, 2], ['plant', 8, 6, 0]] },
    jjongal: { wall: '#fff2d8', wall2: '#ffe6b8', floor: ['#e8c494', '#dfb888'], items: [['desk', 0, 2, 0], ['chair', 1, 3, 0], ['radio', 3, 2, 3], ['tv', 4, 2, 3], ['shelf', 6, 2, 0], ['globe', 8, 2, 0], ['crate', 8, 6, 0]] },
    hotteok: { wall: '#f8e0d0', wall2: '#f0ccb8', floor: ['#d9a877', '#cf9c6a'], items: [['fireplace', 3, 2, 0], ['fridge', 0, 2, 2], ['stove', 1, 2, 0], ['table', 4, 4, 0], ['chair', 3, 4, 0], ['chair', 5, 4, 0], ['bench', 7, 2, 0]] },
    mungchi: { wall: '#fff6dc', wall2: '#ffecc0', floor: ['#f2dcb8', '#ead2aa'], items: [['bed', 0, 2, 3], ['cushion', 3, 3, 3], ['cushion', 5, 4, 1], ['rug', 3, 4, 3], ['teddy', 8, 2, 3], ['lamp', 2, 2, 3], ['plant', 8, 6, 0]] },
    mongsil: { wall: '#e8e0ff', wall2: '#d8ccff', floor: ['#e6def4', '#ddd4ee'], items: [['bed', 8, 2, 4], ['starlamp', 7, 2, 4], ['piano', 0, 2, 0], ['rug', 3, 4, 4], ['cushion', 4, 4, 4], ['floorlamp', 3, 2, 4], ['globe', 0, 6, 0]] },
    danchu: { wall: '#e4ecf4', wall2: '#d2dce8', floor: ['#c8d2dc', '#bec8d4'], items: [['desk', 0, 2, 0], ['chair', 1, 3, 0], ['clock', 3, 2, 0], ['shelf', 4, 2, 0], ['wardrobe', 7, 2, 1], ['bathtub', 7, 5, 1], ['plant', 0, 6, 0]] },
  };
  let RW = W * TILE, RH = H * TILE, ox = 0, oy = 0, PXr = 2, saved = null, guest = null;
  const form = (id) => G.house.FORMS.find((f) => f.id === id);
  const fpOf = (it) => { const f = form(it[0]); return { w: f.w, h: f.h }; };
  function layout() { const cv = G.game.canvas(); PXr = Math.min(G.cam.PX * 1.25, cv.width / (RW + 40), cv.height / (RH + 150)); ox = (cv.width / PXr - RW) / 2; oy = (cv.height / PXr - RH) / 2 - 10; }

  VH.enter = async (id) => {
    const N = G.npc, n = N.get(id), v = N.VILLAGERS[id]; if (!ROOMS[id] || !v) return;
    const act = N.activity(n) || {}, home = act.act === 'home' || act.act === 'sleep';
    if (!N.st[id].met) { await G.ui.say([{ who: 'sys', text: `${v.name}의 집이에요. 아직 인사하지 못한 이웃이라 문을 두드리기 조심스러워요.` }]); return; }
    G.audio.sfx('tap'); await G.ui.say([{ who: 'sys', text: home ? (act.act === 'sleep' ? `똑똑… 안에서 쌔근쌔근 소리가 나요. 살금살금 들어가 볼까요?` : `똑똑! 「들어와~!」 ${v.name}의 목소리예요.`) : `똑똑… ${v.name}은 밖에 나가 있어요. 문이 열려 있네요. 살짝 구경해 볼까요?` }]);
    const pl = G.player; saved = { x: pl.x, y: pl.y }; if (G.ranch) G.ranch.dismount(); G.fishing.cancel(true);
    VH.inside = true; VH.id = id;
    // 집에 있으면 안에서 만난다 (자는 중이면 침대 옆)
    guest = home ? { id, kind: 'npc', species: v.species, look: v.look, x: act.act === 'sleep' ? 4.5 * TILE : 4.5 * TILE, y: 5 * TILE, dir: 0, seed: 1, sleep: act.act === 'sleep', walk: 0, moving: false, villager: true, name: v.name } : null;
    pl.x = (W / 2) * TILE; pl.y = RH - 8; pl.dir = 2;
    G.game.mover = move; G.scene.push('vhome'); G.audio.sfx('open');
    G.emit('npc:visit', { id });
  };
  VH.exit = () => { const pl = G.player; VH.inside = false; G.game.mover = null; if (saved) { pl.x = saved.x; pl.y = saved.y + 8; } pl.dir = 0; if (G.game.unstick) G.game.unstick(); G.scene.pop(); G.audio.sfx('close'); G.ui.refreshHud(); };
  function blocked(x, y) {
    for (const it of ROOMS[VH.id].items) { const f = form(it[0]); if (!f || f.layer === 'rug') continue; const b = fpOf(it); if (x > it[1] * TILE - 4 && x < (it[1] + b.w) * TILE + 4 && y > it[2] * TILE + 2 && y < (it[2] + b.h) * TILE + 6) return true; }
    if (guest && Math.hypot(x - guest.x, y - guest.y) < 14) return true;
    return false;
  }
  function move(e, dx, dy) {
    const free = (x, y) => !(x < e.r || x > RW - e.r || y < WALL * TILE + 6 || y > RH + 14 || (y > RH - 2 && Math.abs(x - (W / 2) * TILE) > 14) || blocked(x, y));
    if (free(e.x + dx, e.y)) e.x += dx;
    if (free(e.x, e.y + dy)) e.y += dy;
  }
  function target() {
    const pl = G.player, D4 = [[0, 1], [-1, 0], [0, -1], [1, 0]], [dx, dy] = D4[pl.dir], fx = pl.x + dx * 24, fy = pl.y + dy * 24 - 4;
    if (guest && Math.hypot(fx - guest.x, fy - guest.y) < 22) return { guest };
    for (const it of ROOMS[VH.id].items) { const f = form(it[0]); if (!f || f.layer === 'rug') continue; const b = fpOf(it); if (fx > it[1] * TILE - 4 && fx < (it[1] + b.w) * TILE + 4 && fy > it[2] * TILE - 6 && fy < (it[2] + b.h) * TILE + 10) return { it, f }; }
    return null;
  }
  const LOOKS = { ddalang: '방울이 잔뜩 달린 분홍 방이에요. 곰돌이 인형 귀에도 방울이 달려 있어요.', sogeum: '어항 옆 책상 위에 「강물 연구 일지 제37권」이 펼쳐져 있어요.', lime: '화분마다 이름표가 붙어 있어요. 「코코」「봄이」「흥칫이」….', jjongal: '책상 위에 쓰다 만 쫑알 일보 원고가 수북해요.', hotteok: '벽난로 옆에 아령 대신 고구마 두 개가 놓여 있어요.', mungchi: '방석이 여기저기… 어디든 누울 수 있는 방이에요.', mongsil: '천장에 구름 모빌이 빙글빙글 돌아요.', danchu: '모든 물건이 자로 잰 듯 반듯하게 놓여 있어요.' };
  async function act() {
    const tg = target(), pl = G.player;
    if (!tg) { if (pl.y > RH - 30) VH.exit(); else { pl.squash = 0.12; G.audio.sfx('bump'); } return; }
    if (tg.guest) {
      if (guest.sleep) { await G.ui.say([{ who: 'sys', text: `${guest.name}이(가) 새근새근 자고 있어요. 깨우지 말고 살짝 나가요.` }]); return; }
      const n = G.npc.get(VH.id); n.talking = true; try { await G.npc.villagerTalk(n); } finally { n.talking = false; } return;
    }
    G.audio.sfx('tap');
    await G.ui.say([{ who: 'sys', text: tg.it === ROOMS[VH.id].items[0] && LOOKS[VH.id] ? LOOKS[VH.id] : `${tg.f.name}이에요. ${G.npc.VILLAGERS[VH.id].name}이(가) 아끼는 것 같아요.` }]);
  }

  G.scene.define('vhome', {
    world: false, opaque: true,
    enter() { layout(); G.ui.refreshHud(); },
    resume() { layout(); },
    update(dt) {
      const t = G.game.t;
      G.game.updatePlayer(dt); G.game.updateKongal(dt, t); G.game.updateFx(dt);
      G.ui.updateDialog(dt); G.ui.drawStick(G.input.stick);
      if (G.audio.music) G.audio.music.update();
      if (G.player.y > RH + 8) { VH.exit(); return; }
      if (guest) guest.dir = G.npc.faceDir(G.player.x - guest.x, G.player.y - guest.y);
      const tg = target();
      if (G.ui.dialogOpen() || G.ui.open) G.ui.setAction('✋', '', '');
      else if (tg && tg.guest) G.ui.setAction(guest.sleep ? '💤' : '💬', guest.sleep ? '쉿' : '말 걸기', guest.name);
      else if (tg) G.ui.setAction('🔍', '보기', tg.f.name);
      else G.ui.setAction('🚪', G.player.y > RH - 30 ? '나가기' : '', '');
    },
    draw(ctx) { draw(ctx, G.game.t); },
    input(ev) {
      if (G.ui.modalInput(ev)) return true;
      if (G.ui.dialogInput(ev)) return true;
      if (ev.type === 'menu') { G.ui.notebook(); return true; }
      if (ev.type === 'act') { act(); return true; }
      if (ev.type === 'back') { VH.exit(); return true; }
      return false;
    },
  });
  function draw(ctx, t) {
    const cv = G.game.canvas(), R0 = ROOMS[VH.id], P = A.paint, L = '#5b4636', wallH = WALL * TILE;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2e2838'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(PXr, 0, 0, PXr, ox * PXr, oy * PXr);
    P.rrect(ctx, -8, -12, RW + 16, wallH + 12, [14, 14, 0, 0], R0.wall, L, 2);
    for (let x = 0; x < RW; x += 24) { ctx.fillStyle = R0.wall2; ctx.fillRect(x + 4, -6, 12, wallH - 4); }
    P.rrect(ctx, RW / 2 - 26, 6, 52, 30, 6, '#bfe6f5', L, 1.6); ctx.fillStyle = L; ctx.fillRect(RW / 2 - 1, 6, 2, 30); ctx.fillRect(RW / 2 - 26, 20, 52, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(-8, wallH, RW + 16, RH - wallH + 8); ctx.clip();
    for (let y = wallH; y < RH + 8; y += 16) { ctx.fillStyle = ((y - wallH) / 16) % 2 ? R0.floor[0] : R0.floor[1]; ctx.fillRect(-8, y, RW + 16, 16); }
    ctx.restore(); ctx.strokeStyle = L; ctx.lineWidth = 2; ctx.strokeRect(-8, wallH, RW + 16, RH - wallH + 8);
    P.rrect(ctx, (W / 2) * TILE - 16, RH - 4, 32, 14, 5, '#9fd0a8', L, 1.3);
    // 가구 (러그 먼저) + 이웃 + 나 y정렬
    const draws = [];
    for (const it of R0.items) { const f = form(it[0]); if (!f) continue; const d = () => { ctx.save(); ctx.translate(it[1] * TILE, it[2] * TILE); G.house.drawFurn(ctx, { f: it[0], c: it[3] || 0, r: 0 }, f.w, f.h); ctx.restore(); }; if (f.layer === 'rug') d(); else draws.push({ sy: (it[2] + f.h) * TILE - 2, d }); }
    if (guest) draws.push({ sy: guest.y, d: () => { A.actor.draw(ctx, guest, t); if (guest.sleep) { ctx.fillStyle = '#8a7aa8'; ctx.font = G.fontPx(11); ctx.fillText('z z Z', guest.x + 10, guest.y - 60 - Math.sin(t * 2) * 3); } } });
    draws.push({ sy: G.player.y, d: () => G.game.drawPlayer(ctx, t) });
    draws.sort((a, b) => a.sy - b.sy); for (const r of draws) r.d();
    // 이름표
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const v = G.npc.VILLAGERS[VH.id], label = `🏠 ${v.name}의 집`, s = Math.min(2, G.cam.PX);
    ctx.font = G.fontPx(14 * s); const tw = ctx.measureText(label).width + 26 * s, by = Math.max(8, (oy - 12) * PXr - 34 * s);
    ctx.fillStyle = 'rgba(255,250,241,0.94)'; ctx.beginPath(); ctx.roundRect(cv.width / 2 - tw / 2, by, tw, 26 * s, 12); ctx.fill();
    ctx.fillStyle = '#5b4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cv.width / 2, by + 13 * s);
  }
  G.modules.add('villahome');
})(globalThis.G);
