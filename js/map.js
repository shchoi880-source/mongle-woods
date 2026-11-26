// 지도 + "지금 할 일" 안내 (오너 친구 피드백: "맵이 없어서 불편", "뭘 해야 할지 모르겠다")
// 지도: 지형·건물·이웃 위치·등불·내 위치·목적지(★). 표시를 누르면 이름. PC는 M 키, 폰은 🗺️ 버튼
(function (G) {
  'use strict';
  const TILE = G.C.TILE;
  const MAP_TILE = 8;
  const EDGES = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]];
  const CONTOURS = [[], [0, 1, 7], [1, 2, 3], [0, 2, 3, 7],
    [3, 4, 5], [0, 1, 3, 4, 5, 7], [1, 2, 4, 5], [0, 2, 4, 5, 7],
    [5, 6, 7], [0, 1, 5, 6], [1, 2, 3, 5, 6, 7], [0, 2, 3, 5, 6],
    [3, 4, 6, 7], [0, 1, 3, 4, 6], [1, 2, 4, 6, 7]];
  let paperMap;

  const MP = G.map = {};

  // ---------- 지금 할 일: 가장 먼저 할 만한 것 하나 ----------
  MP.objective = () => {
    if (!G.game || !G.game.started || !G.quest.st.intro) return null;
    const pl = G.player, m = G.world.map, q = G.quest;
    const at = (x, y) => ({ x, y });
    const npcAt = (id) => { const n = G.npc.get(id); return n && n.vis ? at(n.x, n.y) : null; };
    const plotAt = (k) => { const p = m.plots[k]; return p ? at((p.door.x + 0.5) * TILE, (p.door.y + 0.5) * TILE) : null; };
    // 가장 가까운 것 찾기 (위치가 정해지지 않은 미션도 ⭐로 안내)
    const near = (list, fx, fy) => { let best = null, bd = 1e18; for (const o of list) { const d = (fx(o) - pl.x) ** 2 + (fy(o) - pl.y) ** 2; if (d < bd) { bd = d; best = o; } } return best; };
    const nearObj = (pred) => { const o = near(m.objs.filter((x) => !x.gone && pred(x)), (o) => o.tx * TILE + 16, (o) => o.ty * TILE + 16); return o ? at(o.tx * TILE + 16, o.ty * TILE + 16) : null; };
    const nearWater = () => {
      let best = null, bd = 1e18; const W = G.world;
      for (let ty = 0; ty < m.h; ty += 1) for (let tx = 0; tx < m.w; tx += 1) {
        if (!W.waterKind(tx, ty) || W.waterKind(tx, ty) === 'sea') continue;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (W.walkableTile(tx + dx, ty + dy)) { const x = (tx + dx) * TILE + 16, y = (ty + dy) * TILE + 16, d = (x - pl.x) ** 2 + (y - pl.y) ** 2; if (d < bd) { bd = d; best = at(x, y); } }
      }
      return best;
    };
    // 0) 달리기 중
    const rc = G.events && G.events.race;
    if (rc && rc.on) { if (!rc.touched) return { text: `🏃 ${rc.cp.nm} 앞을 찍고 오기!`, pos: at(rc.cp.x, rc.cp.y) }; return { text: '🏃 호떡에게 돌아가기!', pos: npcAt('hotteok') }; }
    // 1) 이웃과 첫 만남 (도구가 걸려 있음)
    if (G.inv.has('letter_ddalang')) return { text: '딸랑(토끼)에게 편지 전해 주기', pos: npcAt('ddalang') || plotAt('house1') };
    for (const id of ['sogeum', 'lime']) if (!G.npc.st[id].met && G.npc.isResident(id)) { const v = G.npc.VILLAGERS[id]; return { text: `${v.name}(${id === 'sogeum' ? '수달' : '고양이'})에게 인사하기`, pos: npcAt(id) || plotAt(v.plot) }; }
    // 2) 소포 배달 중
    const parcel = G.inv.slots.find((s) => s.id === 'parcel' && s.x);
    if (parcel) { const v = G.npc.VILLAGERS[parcel.x.to]; return { text: `${v.name}에게 소포 배달하기`, pos: npcAt(parcel.x.to) || plotAt(v.plot) }; }
    // 3) 첫날 할 일 카드
    const card = q.CARDS.find((c) => !q.isDone(c.id));
    if (card && G.time.st.playDays <= 3) {
      const map = {
        sell: ['잡은 걸 땅굴상점에서 팔아 보기', plotAt('shop')],
        bug: ['꽃 근처의 곤충 잡기 (살금살금!)', card.id === 'bug' ? nearObj((o) => o.kind === 'flower') : null],
        fish: ['강이나 연못에서 물고기 낚기', card.id === 'fish' ? nearWater() : null],
        shake: ['나무 앞에서 행동 버튼으로 흔들어 보기', card.id === 'shake' ? nearObj((o) => (o.kind === 'tree' || o.kind === 'fruit') && !o.deco) : null],
        letter: ['딸랑에게 편지 전해 주기', npcAt('ddalang')],
        meet: ['이웃 셋(딸랑·소금·라임)과 인사하기', (() => { const id = ['ddalang', 'sogeum', 'lime'].find((x) => !G.npc.st[x].met); return id ? npcAt(id) || plotAt(G.npc.VILLAGERS[id].plot) : null; })()],
        shells: ['남쪽 해변에서 조개 3개 줍기', card.id === 'shells' ? (() => { const sh = near(G.world.state.shells.filter((x) => !G.world.isTaken(x.id)), (x) => x.tx * TILE + 16, (x) => x.ty * TILE + 16); return sh ? at(sh.tx * TILE + 16, sh.ty * TILE + 16) : null; })() : null],
        dig: [pl.hasTool('shovel') ? '땅의 금 간 자국을 삽으로 파기' : '땅굴상점에서 삽 사기 (500몽)', pl.hasTool('shovel') ? (card.id === 'dig' ? (() => { const dg = near(G.world.state.digs.filter((x) => !G.world.isTaken(x.id)), (x) => x.tx * TILE + 16, (x) => x.ty * TILE + 16); return dg ? at(dg.tx * TILE + 16, dg.ty * TILE + 16) : null; })() : null) : plotAt('shop')],
        furn: ['내 텐트에 들어가 「꾸미기」로 가구 3개 놓기', plotAt('tent')],
      };
      const [text, pos] = map[card.id] || [card.text, null];
      return { text: `${text} · 첫날 ${q.doneCount()}/${q.CARDS.length} 🎁`, pos };
    }
    // 3.2) 계절 축제 (6차 회의 C)
    if (G.fest) {
      const f = G.fest.FESTS.find((x) => G.inv.count(x.token) >= G.fest.NEED && !(G.player.unlocks || {})['hat' + x.hat]);
      if (f) return { text: `${f.icon} ${f.tname} ${G.fest.NEED}개 모았어요! 보리 할멈에게 가져가기`, pos: npcAt('bori') || plotAt('post') };
      const nf = G.fest.now();
      if (nf && !(G.player.unlocks || {})['hat' + nf.hat]) { const d = near(G.game.drops.filter((x) => x.id === nf.token), (x) => x.x, (x) => x.y); return { text: `${nf.icon} ${nf.name}! 마을에 떨어진 ${nf.tname} 모으기 (${G.inv.count(nf.token)}/${G.fest.NEED})`, pos: d ? at(d.x, d.y) : null }; }
    }
    // 3.3) 이웃 생일·새 이야기 (6차 회의 B)
    if (G.story) {
      const yr = G.time.dayDate(G.time.day()).y;
      const bd = G.story.birthdayToday().find((id) => G.story.st.bday[id] !== yr);
      if (bd) { const v = G.npc.VILLAGERS[bd]; return { text: `🎂 오늘은 ${v.name}의 생일! 말 걸어 축하하기`, pos: npcAt(bd) || plotAt(v.plot) }; }
      const sid = Object.keys(G.npc.VILLAGERS).find((id) => G.npc.isResident(id) && G.npc.level(id) > G.story.progress(id) && G.story.progress(id) < 4);
      if (sid) { const v = G.npc.VILLAGERS[sid]; return { text: `💗 ${v.name}에게 할 이야기가 있대요 — 말 걸기`, pos: npcAt(sid) || plotAt(v.plot) }; }
    }
    // 3.4) 목장
    const ra = G.ranch.st.animals;
    const rr = ra.find((x) => x.ready);
    if (rr) return { text: `목장에서 ${rr.name}의 선물 거두기 🧺`, pos: at(rr.x, rr.y) };
    const rp = ra.find((x) => G.ranch.canPet(x) && !G.ranch.st.riding);
    if (rp) return { text: `목장의 ${rp.name} 쓰다듬기 🤲`, pos: at(rp.x, rp.y) };
    // 3.5) 텃밭
    const fp = G.farm.st.plots;
    const ripe = fp.find((x) => G.farm.stage(x) === 3);
    if (ripe) return { text: '텃밭 작물이 다 자랐어요! 수확하기 🧺', pos: at(ripe.tx * TILE + 16, ripe.ty * TILE + 16) };
    const dry = G.player.hasTool('can') && fp.find((x) => x.crop && !G.farm.watered(x));
    if (dry) return { text: '텃밭에 물 주기 🚿', pos: at(dry.tx * TILE + 16, dry.ty * TILE + 16) };
    // 4) 오늘의 부탁
    const rq = G.requests.st;
    if (rq.day === G.time.day()) {
      const r = rq.list.find((x) => x.state === 'new') || rq.list.find((x) => x.state === 'asked' && x.type !== 'deliver');
      if (r) { const v = G.npc.VILLAGERS[r.who]; return { text: r.state === 'new' ? `${v.name}에게 오늘의 부탁 듣기` : `${v.name}의 부탁: ${G.requests.whatText(r)}`, pos: npcAt(r.who) || plotAt(v.plot) }; }
    }
    // 5) 등불
    const n = G.lantern.count() + 1;
    if (n <= 10) { const c = G.lantern.conds(n).find((x) => !x.ok); const o = m.objs.find((x) => x.kind === 'lantern' && x.n === n); if (c) return { text: `${n}번 등불까지: ${c.text} (${Math.min(c.cur, c.need)}/${c.need})`, pos: o ? at(o.tx * TILE + 16, o.ty * TILE + 16) : null }; if (o) return { text: `${n}번 등불 기둥에 불 켜기!`, pos: at(o.tx * TILE + 16, o.ty * TILE + 16) }; }
    return { text: '자유롭게 마을 산책하기 🌿', pos: null };
  };

  // ---------- 지도 그리기 ----------
  MP.clearArtwork = () => { paperMap = null; };
  MP.paintMap = (m, y0, season, showPlaces = false) => {
    const S = MAP_TILE, T = G.TERR, A = G.art, scenery = G.scenery;
    const c = document.createElement('canvas');
    c.width = m.w * S; c.height = (m.h - y0) * S;
    const g = c.getContext('2d');
    const pal = A.mapColors(season), rect = [0, 0, c.width, c.height];
    const tile = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h ? T.SEA : m.terr[y * m.w + x];
    const isLand = (v) => v !== T.SEA && v !== T.WATER && v !== T.BRIDGE && v !== T.STONE;
    const region = (test) => {
      const path = new Path2D();
      // Trace between tile centers so a diagonal river is continuous at every zoom.
      for (let y = y0 - 1; y < m.h; y++) for (let x = -1; x < m.w; x++) {
        const flags = +test(tile(x, y)) | (test(tile(x + 1, y)) << 1) |
          (test(tile(x + 1, y + 1)) << 2) | (test(tile(x, y + 1)) << 3);
        const px = (x + 0.5) * S, py = (y - y0 + 0.5) * S;
        if (flags === 15) { path.rect(px, py, S, S); continue; }
        if (!flags) continue;
        for (const [i, point] of CONTOURS[flags].entries()) {
          const [dx, dy] = EDGES[point];
          if (i === 0) path.moveTo(px + dx * S, py + dy * S);
          else path.lineTo(px + dx * S, py + dy * S);
        }
        path.closePath();
      }
      return path;
    };
    const paint = (path, color, material, a) => {
      g.fillStyle = color; g.fill(path);
      if (!material) return;
      g.save(); g.clip(path);
      scenery?.material(g, material, rect, a, 'soft-light');
      g.restore();
    };
    const wash = g.createLinearGradient(0, 0, c.width, c.height);
    wash.addColorStop(0, '#aec9c7'); wash.addColorStop(1, '#7ba5aa');
    g.fillStyle = wash; g.fillRect(...rect);
    paint(region((v) => v === T.WATER || v === T.BRIDGE || v === T.STONE), '#a9ccca');
    scenery?.material(g, 'water', rect, 0.55, 'soft-light');
    // 바닷가에는 파도 자국, 육지는 얇게 겹친 물가 띠를 그린다.
    g.strokeStyle = 'rgba(250,244,219,0.32)'; g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath();
    for (let y = y0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const v = tile(x, y), hash = G.u.hash32(m.seed, x, y, 71);
      if ((v !== T.SEA && v !== T.WATER) || (hash & 15) !== 5) continue;
      const px = x * S + 2, py = (y - y0) * S + (hash >> 5 & 7);
      g.moveTo(px - 3, py); g.quadraticCurveTo(px, py - 1.7, px + 3, py);
    }
    g.stroke();
    const coast = region(isLand);
    g.save(); g.translate(0, 1.7); paint(coast, '#d2c19d'); g.restore();
    paint(coast, pal[T.GRASS], 'grass', season === 'winter' ? 0.16 : 0.6);
    g.save(); g.clip(coast);
    for (let y = y0; y < m.h; y += 13) for (let x = 0; x < m.w; x += 13) {
      if (!isLand(tile(x, y))) continue;
      const hash = G.u.hash32(m.seed, x, y, 73), radius = 51 + (hash & 31);
      const px = x * S + (hash >> 8 & 31), py = (y - y0) * S + (hash >> 14 & 31);
      const pigment = g.createRadialGradient(px, py, 3, px, py, radius);
      pigment.addColorStop(0, hash & 1 ? 'rgba(108,131,79,0.31)' : 'rgba(242,225,171,0.32)');
      pigment.addColorStop(1, 'rgba(195,191,133,0)');
      g.fillStyle = pigment; g.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    }
    g.restore();
    paint(region((v) => v === T.SAND), '#e7d5b0', 'dirt', 0.52);
    paint(region((v) => v === T.HIGH), pal[T.HIGH], 'grass', 0.31);
    paint(region((v) => v === T.CLIFF), '#b18e72', 'cliff', 0.4);
    paint(region((v) => v === T.PATH), '#dec099', 'dirt', 0.29);
    paint(region((v) => v === T.PLAZA), '#e6d7bd', 'stone', 0.45);
    paint(region((v) => v === T.BRIDGE), '#ac8056', 'wood', 0.43);
    paint(region((v) => v === T.STONE), '#d5d7be');
    scenery?.material(g, 'paper', rect, 0.16, 'multiply');
    const markerArt = { post: 'post', tent: 'tent', house: 'house', museum: 'museum', stall: 'stall' };
    for (const o of m.objs) {
      if (o.gone || o.ty < y0) continue;
      const x = (o.tx + o.w / 2) * S, y = (o.ty + o.h / 2 - y0) * S;
      if (o.kind === 'tree' || o.kind === 'pine' || o.kind === 'fruit' || (o.kind === 'bigoak' && showPlaces)) {
        const size = o.kind === 'bigoak' ? 7.5 : 3.4 + (G.u.hash32(m.seed, o.tx, o.ty, 82) & 3) * 0.42;
        g.strokeStyle = '#897352'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x, y + size * 0.6); g.lineTo(x, y + size * 1.25); g.stroke();
        g.fillStyle = o.kind === 'pine' ? '#667f5f' : season === 'autumn' ? '#aa8657' : season === 'winter' ? '#a9b4a2' : '#748c62';
        g.beginPath();
        if (o.kind === 'pine') {
          g.moveTo(x, y - size); g.lineTo(x + size * 0.86, y + size * 0.62);
          g.lineTo(x - size * 0.86, y + size * 0.62); g.closePath();
        } else g.ellipse(x, y - size * 0.13, size, size * 0.77, -0.22, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(244,238,190,0.36)';
        g.beginPath(); g.ellipse(x - size * 0.22, y - size * 0.43, size * 0.46, size * 0.22, -0.22, 0, Math.PI * 2); g.fill();
      } else if (showPlaces && markerArt[o.kind]) {
        const wide = o.kind === 'house' ? 20 : 27;
        g.drawImage(A.building(markerArt[o.kind], season, false), x - wide / 2, y - wide * 0.66, wide, wide * 0.88);
      }
    }
    return c;
  };
  function terrain(m, y0) {
    const season = G.art.season;
    if (!paperMap || paperMap.map !== m || paperMap.season !== season || paperMap.y0 !== y0) {
      paperMap = { map: m, season, y0, canvas: MP.paintMap(m, y0, season) };
    }
    return paperMap.canvas;
  }
  function markers() {
    const m = G.world.map, out = [];
    const P = (k) => m.plots[k];
    const add = (tx, ty, icon, name, kind) => out.push({ tx, ty, icon, name, kind });
    const b = (k, icon, name, art) => {
      const p = P(k);
      if (p) out.push({ tx: p.x + p.w / 2, ty: p.y + p.h / 2, icon, name, kind: 'bld', art });
    };
    b('shop', '🏪', '땅굴상점', 'stall');
    if (G.ranch.st.pen) add(G.ranch.st.pen.x + G.ranch.st.pen.w / 2, G.ranch.st.pen.y + G.ranch.st.pen.h / 2, '🐮', '내 목장', 'bld');
    if (G.farm.st.plots[0]) {
      const p = G.farm.st.plots[0];
      out.push({ tx: p.tx + 1.5, ty: p.ty + 0.5, name: '내 텃밭', kind: 'bld', item: 'crop:carrot' });
    }
    b('post', '📮', '우체국 (보리 할멈)', 'post');
    b('tent', '🏠', '내 ' + G.nest.cur().name, ['tent', 'cabin', 'smallhouse', 'bighouse', 'dreamhouse'][G.nest.st.stage]);
    if (P('museum2')) b('museum2', '🦴', G.museum.isOpen() ? '조약돌 박물관' : '박물관 (내일 개관)', 'museum');
    if (P('oak')) b('oak', '🌳', '할아버지 참나무 (광장)', 'bigoak');
    for (const [id, v] of Object.entries(G.npc.VILLAGERS)) {
      const p = P(v.plot);
      if (p && G.npc.isResident(id)) out.push({ tx: p.x + p.w / 2, ty: p.y + p.h / 2, icon: '🏡', name: `${G.npc.st[id].met ? v.name : '???'}의 집`, kind: 'home', art: 'house' });
    }
    // 고지대 계단·고지대 (2026-11)
    if (m.stairs) for (const s of m.stairs) add(s.x + 0.5, s.y + 0.5, G.world.highOpen() ? '🪜' : '⛔', G.world.highOpen() ? '고지대 계단' : '고지대 계단 (아직 닫힘)', 'stairs');
    if (G.world.highOpen() && m.stairs && m.stairs[1]) add(m.stairs[1].x + 0.5, Math.max(4, m.stairs[1].y - 8), '⛰️', '북쪽 고지대', 'bld');
    // 바닷가: 광장에서 가장 가까운 모래사장
    if (!MP._beach || MP._beach.seed !== m.seed) { let best = null, bd = 1e9; for (let y = G.world.HIGH_ROWS; y < m.h - 1; y++) for (let x = 2; x < m.w - 2; x++) if (G.world.tile(x, y) === G.TERR.SAND && G.world.tile(x, y + 1) === G.TERR.SEA) { const d = (x - m.plaza.x) ** 2 + (y - m.plaza.y) ** 2; if (d < bd) { bd = d; best = { x, y }; } } MP._beach = { seed: m.seed, p: best }; }
    if (MP._beach.p) add(MP._beach.p.x + 0.5, MP._beach.p.y + 0.5, '🏖️', '바닷가', 'bld');
    for (const o of m.objs) if (o.kind === 'lantern') add(o.tx + 0.5, o.ty + 0.5, o.n <= G.lantern.count() ? '🏮' : '•', `${o.n}번 등불 기둥${o.n <= G.lantern.count() ? ' (켜짐)' : ''}`, 'lantern');
    if (G.tide && G.tide.low()) for (const p of G.tide.pools) if (p.sp && !G.world.isTaken(p.id)) add(p.tx + 0.5, p.ty + 0.5, '💧', '조수 웅덩이 (썰물)', 'pool');
    for (const n of G.npc.list) { if (!n.vis || n.id === 'todak' || n.id === 'tosil') continue; const v = G.npc.VILLAGERS[n.id]; const met = !v || G.npc.st[n.id].met; add(n.x / TILE, n.y / TILE, 'npc', met ? n.name : '??? (새 이웃)', 'npc'); out[out.length - 1].col = v ? v.heart : '#c98e5a'; out[out.length - 1].label = met ? n.name.slice(0, 2) : '?'; }
    return out;
  }

  MP.teleport = (tx, ty) => {
    const W = G.world, pl = G.player, GM = G.game;
    if ((G.house && G.house.inside) || (G.museumHall && G.museumHall.inside) || (G.villaHome && G.villaHome.inside)) { G.ui.toast('순간이동은 밖에서 할 수 있어요.', { icon: '✨' }); return false; }
    if (G.net && G.net.guest) { G.ui.toast('친구 마을에서는 순간이동을 할 수 없어요.', { icon: '✨' }); return false; }
    // 장소 바로 앞(아래쪽)에서 설 수 있는 가장 가까운 칸
    let best = null, bd = 1e9;
    for (let y = Math.floor(ty) - 4; y <= Math.floor(ty) + 6; y++) for (let x = Math.floor(tx) - 5; x <= Math.floor(tx) + 5; x++) {
      const px = x * TILE + 16, py = y * TILE + 18; if (!W.canStand(px, py, pl.r)) continue;
      const d = (x + 0.5 - tx) ** 2 + (y + 0.5 - ty - 2) ** 2; if (d < bd) { bd = d; best = [px, py]; }
    }
    if (!best) { G.ui.toast('거기엔 내릴 자리가 없어요.', { icon: '✨' }); return false; }
    if (GM.autoStop) GM.autoStop('tp'); if (G.fishing.state !== 'idle') G.fishing.cancel(true); if (G.ranch) G.ranch.dismount();
    if (GM.sparkle) GM.sparkle(pl.x, pl.y - 20, 12, '#cfe8ff');
    pl.x = best[0]; pl.y = best[1]; pl.dir = 0; if (G.cam.follow) G.cam.follow(pl.x, pl.y, 0, true);
    if (GM.sparkle) setTimeout(() => GM.sparkle(pl.x, pl.y - 20, 14, '#fff6a8'), 60);
    G.audio.sfx('chime'); G.emit('player:teleport', {});
    return true;
  };
  MP.open = () => {
    const m = G.world.map; if (!m) return;
    const obj = MP.objective();
    return G.ui.modal('몽글숲 지도', (body, close) => {
      // 확대·축소·이동(오너 요청): 손가락 두 개로 벌리기/오므리기, 끌어서 이동, PC는 휠·＋－ 버튼. 장소를 누르면 「여기로 가기」
      const wrap = document.createElement('div'); wrap.className = 'mapwrap';
      const cv = document.createElement('canvas'); cv.className = 'mapcv';
      const y0 = G.world.highOpen() ? 0 : G.world.HIGH_ROWS - 4;
      const W = m.w, H = m.h - y0, S = 12;
      cv.width = W * S; cv.height = H * S;
      const g = cv.getContext('2d');
      const info = document.createElement('div'); info.className = 'slot-info mapinfo';
      const mk = markers();
      let sel = null;
      const goBtn = (k) => {
        const b = document.createElement('button'); b.className = 'btn small'; b.textContent = '🚶 여기로 가기';
        b.onclick = () => { if (G.game.autoGo(k.tx, k.ty, k.short || '')) { G.audio.sfx('tap'); close(); } else G.ui.toast('거기로 가는 길을 찾지 못했어요.', { icon: '🚧' }); };
        return b;
      };
      // 순간이동 (오너: 지역마다 텔레포트) — 건물·장소 표시만. 밖에서, 내 마을에서
      const tpBtn = (k) => {
        const b = document.createElement('button'); b.className = 'btn small'; b.textContent = '✨ 순간이동';
        b.onclick = () => { if (MP.teleport(k.tx, k.ty)) close(); };
        return b;
      };
      const showInfo = () => {
        info.innerHTML = '';
        if (sel) { const t = document.createElement('b'); t.textContent = sel.name; info.append(t); if (!sel.me) { info.append(' ', goBtn(sel)); if (sel.kind === 'bld' || sel.kind === 'home' || (sel.kind === 'stairs' && G.world.highOpen())) info.append(' ', tpBtn(sel)); } return; }
        if (obj) {
          const t = document.createElement('span'); t.innerHTML = `<b>📌 지금 할 일</b> ${obj.text}${obj.pos ? ' <span class="muted">(⭐ 위치)</span>' : ' <span class="muted">(어디서든 할 수 있어요)</span>'}`; info.append(t);
          if (obj.pos) info.append(' ', goBtn({ tx: obj.pos.x / TILE, ty: obj.pos.y / TILE, short: '목적지' }));
        } else info.innerHTML = '<span class="muted">표시를 누르면 이름이 보이고 걸어갈 수 있어요.</span>';
      };
      showInfo();
      // 보기 상태: z = 화면 px / 캔버스 px, (ox, oy) = 캔버스 좌상단의 화면 위치
      const view = { z: 1, ox: 0, oy: 0 };
      const clamp = () => {
        const ww = wrap.clientWidth, wh = wrap.clientHeight, cw = cv.width * view.z, ch = cv.height * view.z;
        view.ox = cw <= ww ? (ww - cw) / 2 : Math.min(0, Math.max(ww - cw, view.ox));
        view.oy = ch <= wh ? (wh - ch) / 2 : Math.min(0, Math.max(wh - ch, view.oy));
        cv.style.transform = `translate(${view.ox}px, ${view.oy}px) scale(${view.z})`;
      };
      const fitZ = () => Math.min(wrap.clientWidth / cv.width, wrap.clientHeight / cv.height);
      const zoomAt = (nz, sx, sy) => {
        const z0 = fitZ(); nz = Math.max(z0, Math.min(z0 * 6, nz));
        const cx = (sx - view.ox) / view.z, cy = (sy - view.oy) / view.z;
        view.z = nz; view.ox = sx - cx * nz; view.oy = sy - cy * nz; clamp();
      };
      const centerOn = (px, py, z) => { view.z = z; view.ox = wrap.clientWidth / 2 - px * z; view.oy = wrap.clientHeight / 2 - py * z; clamp(); };
      const meXY = () => ({ x: G.player.x / TILE * S, y: (G.player.y / TILE - y0) * S });
      // 처음엔 내 위치를 2.5배로
      // 처음 보기: 미션 위치(⭐)가 있으면 나와 ⭐가 함께 보이게, 없으면 내 위치를 크게
      requestAnimationFrame(() => {
        const p = meXY();
        if (obj && obj.pos) {
          const q = { x: obj.pos.x / TILE * S, y: (obj.pos.y / TILE - y0) * S - 30 };
          const pad = 90, z = Math.max(fitZ(), Math.min(fitZ() * 3, (wrap.clientWidth - pad) / (Math.abs(p.x - q.x) + 1), (wrap.clientHeight - pad) / (Math.abs(p.y - q.y) + 1)));
          centerOn((p.x + q.x) / 2, (p.y + q.y) / 2, z);
        } else centerOn(p.x, p.y, fitZ() * 2.5);
      });
      let t0 = performance.now(), raf = 0;
      const draw = () => {
        if (!cv.isConnected && raf) return;
        const t = (performance.now() - t0) / 1000;
        g.drawImage(terrain(m, y0), 0, 0, W * S, H * S);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const k of mk) {
          const x = k.tx * S, y = (k.ty - y0) * S;
          if (k.kind === 'npc') { g.fillStyle = k.col; g.beginPath(); g.arc(x, y, 12, 0, 6.3); g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#5b4636'; g.stroke(); g.fillStyle = '#fff'; g.font = G.fontPx(12); g.fillText(k.label, x, y + 0.5); continue; }
          if (k.icon === '•') { g.fillStyle = '#8a7a9a'; g.beginPath(); g.arc(x, y, 5, 0, 6.3); g.fill(); continue; }
          const on = sel && sel.tx === k.tx && sel.ty === k.ty;
          g.fillStyle = on ? '#fae2a9' : '#faf1da'; g.strokeStyle = on ? '#9a6d37' : '#927a58';
          g.lineWidth = on ? 2.25 : 1.2;
          g.beginPath(); g.arc(x, y, on ? 22 : 19, 0, 6.3); g.fill(); g.stroke();
          if (k.art === 'bigoak') g.drawImage(G.art.bigOak(G.art.season), x - 15, y - 17, 30, 32);
          else if (k.art) g.drawImage(G.art.building(k.art, G.art.season, false), x - 17, y - 17, 34, 30);
          else if (k.item) { g.save(); g.translate(x - 12, y - 12); g.scale(0.75, 0.75); G.art.drawIcon(g, k.item); g.restore(); }
          else { g.font = '24px sans-serif'; g.fillText(k.icon, x, y + 1); }
        }
        if (obj && obj.pos) { const x = obj.pos.x / TILE * S, y = (obj.pos.y / TILE - y0) * S, s2 = 1 + Math.sin(t * 4) * 0.12; g.save(); g.translate(x, y - 30); g.scale(s2, s2); g.font = '34px sans-serif'; g.fillText('⭐', 0, 0); g.restore(); }
        if (G.game.auto) { const a = G.game.auto; g.strokeStyle = 'rgba(255,107,139,0.7)'; g.lineWidth = 4; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(G.player.x / TILE * S, (G.player.y / TILE - y0) * S); for (let i = a.i; i < a.path.length; i++) g.lineTo(a.path[i].x / TILE * S, (a.path[i].y / TILE - y0) * S); g.stroke(); g.setLineDash([]); }
        const p = meXY();
        if (!G.house.inside) {
          g.fillStyle = 'rgba(255,107,139,0.25)'; g.beginPath(); g.arc(p.x, p.y, 20 + Math.sin(t * 3) * 4, 0, 6.3); g.fill();
          g.fillStyle = '#ff6b8b'; g.beginPath(); g.arc(p.x, p.y, 11, 0, 6.3); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
      // 손가락·마우스: 1개 = 끌기, 2개 = 확대/축소, 움직임 없이 떼면 = 누르기
      const pts = new Map(); let moved = 0, pinch = null;
      const local = (e) => { const r = wrap.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.mapctr')) return; wrap.setPointerCapture(e.pointerId); pts.set(e.pointerId, local(e)); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z }; } });
      wrap.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId), cur = local(e); pts.set(e.pointerId, cur);
        if (pts.size === 1) { view.ox += cur.x - prev.x; view.oy += cur.y - prev.y; moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y); clamp(); }
        else if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(pinch.z * d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); moved += 99; }
      });
      const up = (e) => {
        if (!pts.has(e.pointerId)) return;
        const p0 = pts.get(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
        if (pts.size === 0 && moved < 8) {
          // 누르기: 가장 가까운 표시 고르기
          const sx = (p0.x - view.ox) / view.z, sy = (p0.y - view.oy) / view.z;
          let best = null, bd = 30 / view.z + 10;
          const all = mk.concat([{ tx: G.player.x / TILE, ty: G.player.y / TILE, name: `나 (${G.player.name})`, me: true }]);
          for (const k of all) { const d = Math.hypot(k.tx * S - sx, (k.ty - y0) * S - sy); if (d < bd) { bd = d; best = k; } }
          // 빈 땅을 누르면 그 자리로
          if (!best) best = { tx: sx / S, ty: sy / S + y0, name: '여기', short: '' };
          else best.short = best.short || String(best.name).replace(/\s*\(.*\)$/, '');
          sel = best; showInfo(); G.audio.sfx('tap');
        }
      };
      wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
      wrap.addEventListener('wheel', (e) => { e.preventDefault(); const p = local(e); zoomAt(view.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2), p.x, p.y); }, { passive: false });
      // 버튼: ＋ － 나
      const ctr = document.createElement('div'); ctr.className = 'mapctr';
      const mkb = (t, fn, title) => { const b = document.createElement('button'); b.className = 'btn-round small'; b.textContent = t; b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
      ctr.append(mkb('＋', () => zoomAt(view.z * 1.4, wrap.clientWidth / 2, wrap.clientHeight / 2), '확대'), mkb('－', () => zoomAt(view.z / 1.4, wrap.clientWidth / 2, wrap.clientHeight / 2), '축소'), mkb('📍', () => { const p = meXY(); centerOn(p.x, p.y, Math.max(view.z, fitZ() * 2.5)); }, '내 위치'), mkb('🗺️', () => { view.z = fitZ(); clamp(); }, '전체 보기'));
      wrap.append(cv, ctr);
      const legend = document.createElement('div'); legend.className = 'muted small maplegend';
      legend.textContent = (G.input.isTouch() || (globalThis.matchMedia && matchMedia('(pointer: coarse)').matches) ? '두 손가락으로 확대·축소, 끌어서 이동' : '휠·＋－로 확대·축소, 끌어서 이동') + ' · 표시를 누르면 이름과 길 안내 · 장소는 순간이동 가능 · 분홍 점은 내 위치';
      body.append(wrap, info, legend);
    }, { wide: true });
  };

  G.modules.add('map');
})(globalThis.G);
