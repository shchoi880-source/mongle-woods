// 지도 + "지금 할 일" 안내 (오너 친구 피드백: "맵이 없어서 불편", "뭘 해야 할지 모르겠다")
// 지도: 지형·건물·이웃 위치·등불·내 위치·목적지(★). 표시를 누르면 이름. PC는 M 키, 폰은 🗺️ 버튼
(function (G) {
  'use strict';
  const TILE = G.C.TILE;
  const COL = ['#a5d873', '#e2c99d', '#f5e2b4', '#86d7ea', '#5cbde2', '#94c968', '#c29a74', '#c98e5a', '#ecdcbc', '#c9d3da'];
  let terrCache = null, terrSeed = -1;

  const MP = G.map = {};

  // ---------- 지금 할 일: 가장 먼저 할 만한 것 하나 ----------
  MP.objective = () => {
    if (!G.game || !G.game.started || !G.quest.st.intro) return null;
    const pl = G.player, m = G.world.map, q = G.quest;
    const at = (x, y) => ({ x, y });
    const npcAt = (id) => { const n = G.npc.get(id); return n && n.vis ? at(n.x, n.y) : null; };
    const plotAt = (k) => { const p = m.plots[k]; return p ? at((p.door.x + 0.5) * TILE, (p.door.y + 0.5) * TILE) : null; };
    // 1) 이웃과 첫 만남 (도구가 걸려 있음)
    if (G.inv.has('letter_ddalang')) return { text: '딸랑(토끼)에게 편지 전해 주기', pos: npcAt('ddalang') || plotAt('house1') };
    for (const id of ['sogeum', 'lime']) if (!G.npc.st[id].met && G.npc.isResident(id)) { const v = G.npc.VILLAGERS[id]; return { text: `${v.name}(${id === 'sogeum' ? '수달' : '고양이'})에게 인사하고 ${id === 'sogeum' ? '낚싯대' : '잠자리채'} 받기`, pos: npcAt(id) || plotAt(v.plot) }; }
    // 2) 소포 배달 중
    const parcel = G.inv.slots.find((s) => s.id === 'parcel' && s.x);
    if (parcel) { const v = G.npc.VILLAGERS[parcel.x.to]; return { text: `${v.name}에게 소포 배달하기`, pos: npcAt(parcel.x.to) || plotAt(v.plot) }; }
    // 3) 첫날 할 일 카드
    const card = q.CARDS.find((c) => !q.isDone(c.id));
    if (card && G.time.st.playDays <= 3) {
      const map = {
        sell: ['잡은 걸 땅굴상점에서 팔아 보기', plotAt('shop')],
        bug: ['꽃 근처의 곤충 잡기 (살금살금!)', null],
        fish: ['강이나 연못에서 물고기 낚기', null],
        shake: ['나무 앞에서 행동 버튼으로 흔들어 보기', null],
        letter: ['딸랑에게 편지 전해 주기', npcAt('ddalang')],
        meet: ['이웃 셋(딸랑·소금·라임)과 인사하기', null],
        shells: ['남쪽 해변에서 조개 3개 줍기', null],
        dig: [pl.hasTool('shovel') ? '땅의 금 간 자국을 삽으로 파기' : '땅굴상점에서 삽 사기 (500몽)', pl.hasTool('shovel') ? null : plotAt('shop')],
        furn: ['내 텐트에 들어가 「꾸미기」로 가구 3개 놓기', plotAt('tent')],
      };
      const [text, pos] = map[card.id] || [card.text, null];
      return { text, pos };
    }
    // 4) 오늘의 부탁
    const rq = G.requests.st;
    if (rq.day === G.time.day()) {
      const r = rq.list.find((x) => x.state === 'new') || rq.list.find((x) => x.state === 'asked' && x.type !== 'deliver');
      if (r) { const v = G.npc.VILLAGERS[r.who]; return { text: r.state === 'new' ? `${v.name}에게 오늘의 부탁 듣기` : `${v.name}의 부탁: ${G.requests.whatText(r)}`, pos: npcAt(r.who) || plotAt(v.plot) }; }
    }
    // 5) 등불
    const n = G.lantern.count() + 1;
    if (n <= 2) { const c = G.lantern.conds(n).find((x) => !x.ok); const o = m.objs.find((x) => x.kind === 'lantern' && x.n === n); if (c) return { text: `${n}번 등불까지: ${c.text} (${Math.min(c.cur, c.need)}/${c.need})`, pos: o ? at(o.tx * TILE + 16, o.ty * TILE + 16) : null }; if (o) return { text: `${n}번 등불 기둥에 불 켜기!`, pos: at(o.tx * TILE + 16, o.ty * TILE + 16) }; }
    return { text: '자유롭게 마을 산책하기 🌿', pos: null };
  };

  // ---------- 지도 그리기 ----------
  function terrain() {
    const m = G.world.map;
    if (terrCache && terrSeed === m.seed + ':' + G.art.season) return terrCache;
    const c = document.createElement('canvas'); c.width = m.w * 4; c.height = m.h * 4;
    const g = c.getContext('2d');
    const col = COL.slice(); if (G.art.season === 'winter') { col[0] = '#e6eef8'; col[5] = '#dde7f3'; } else if (G.art.season === 'autumn') { col[0] = '#cfcb7d'; col[5] = '#bdbb6e'; }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { g.fillStyle = col[m.terr[y * m.w + x]]; g.fillRect(x * 4, y * 4, 4, 4); }
    for (const o of m.objs) if (o.kind === 'tree' || o.kind === 'pine' || o.kind === 'fruit') { g.fillStyle = o.kind === 'pine' ? '#4f8f5a' : '#6aa84f'; g.beginPath(); g.arc(o.tx * 4 + 2, o.ty * 4 + 2, 2.2, 0, 6.3); g.fill(); }
    terrCache = c; terrSeed = m.seed + ':' + G.art.season;
    return c;
  }
  function markers() {
    const m = G.world.map, out = [];
    const P = (k) => m.plots[k];
    const add = (tx, ty, icon, name, kind) => out.push({ tx, ty, icon, name, kind });
    const b = (k, icon, name) => { const p = P(k); if (p) add(p.x + p.w / 2, p.y + p.h / 2, icon, name, 'bld'); };
    b('shop', '🏪', '땅굴상점'); b('post', '📮', '우체국 (보리 할멈)'); b('tent', '🏠', '내 ' + G.nest.cur().name);
    if (P('museum2')) b('museum2', '🦴', G.museum.isOpen() ? '조약돌 박물관' : '박물관 (내일 개관)');
    if (P('oak')) add(P('oak').x + 1, P('oak').y + 1, '🌳', '할아버지 참나무 (광장)', 'bld');
    for (const [id, v] of Object.entries(G.npc.VILLAGERS)) { const p = P(v.plot); if (p && G.npc.isResident(id)) add(p.x + p.w / 2, p.y + p.h / 2, '🏡', `${G.npc.st[id].met ? v.name : '???'}의 집`, 'home'); }
    for (const o of m.objs) if (o.kind === 'lantern') add(o.tx + 0.5, o.ty + 0.5, o.n <= G.lantern.count() ? '🏮' : '•', `${o.n}번 등불 기둥${o.n <= G.lantern.count() ? ' (켜짐)' : ''}`, 'lantern');
    if (G.tide && G.tide.low()) for (const p of G.tide.pools) if (p.sp && !G.world.isTaken(p.id)) add(p.tx + 0.5, p.ty + 0.5, '💧', '조수 웅덩이 (썰물)', 'pool');
    for (const n of G.npc.list) { if (!n.vis || n.id === 'todak' || n.id === 'tosil') continue; const v = G.npc.VILLAGERS[n.id]; const met = !v || G.npc.st[n.id].met; add(n.x / TILE, n.y / TILE, 'npc', met ? n.name : '??? (새 이웃)', 'npc'); out[out.length - 1].col = v ? v.heart : '#c98e5a'; out[out.length - 1].label = met ? n.name.slice(0, 2) : '?'; }
    return out;
  }

  MP.open = () => {
    const m = G.world.map; if (!m) return;
    const obj = MP.objective();
    return G.ui.modal('몽글숲 지도', (body) => {
      const wrap = document.createElement('div'); wrap.className = 'mapwrap';
      const cv = document.createElement('canvas'); cv.className = 'mapcv';
      const y0 = G.world.HIGH_ROWS - 4; // 북쪽 고지대(잠김)는 조금만
      const W = m.w, H = m.h - y0, S = 8;   // 타일당 8px로 그리고 CSS로 줄인다
      cv.width = W * S; cv.height = H * S;
      const g = cv.getContext('2d');
      const info = document.createElement('div'); info.className = 'slot-info mapinfo';
      info.innerHTML = obj ? `<b>지금 할 일</b> ${obj.text}${obj.pos ? ' <span class="muted">(★ 표시)</span>' : ''}` : '<span class="muted">표시를 누르면 이름이 보여요.</span>';
      const mk = markers();
      let t0 = performance.now(), raf = 0;
      const draw = () => {
        if (!cv.isConnected && raf) return; // 창이 닫히면 멈춘다
        const t = (performance.now() - t0) / 1000;
        g.imageSmoothingEnabled = false;
        g.drawImage(terrain(), 0, y0 * 4, W * 4, H * 4, 0, 0, W * S, H * S);
        g.imageSmoothingEnabled = true;
        g.font = '22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const k of mk) {
          const x = k.tx * S, y = (k.ty - y0) * S;
          if (k.kind === 'npc') { g.fillStyle = k.col; g.beginPath(); g.arc(x, y, 9, 0, 6.3); g.fill(); g.lineWidth = 2; g.strokeStyle = '#5b4636'; g.stroke(); g.fillStyle = '#fff'; g.font = G.fontPx(9); g.fillText(k.label, x, y + 0.5); g.font = '22px sans-serif'; continue; }
          if (k.icon === '•') { g.fillStyle = '#8a7a9a'; g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); continue; }
          g.fillStyle = 'rgba(255,250,241,0.85)'; g.beginPath(); g.arc(x, y, 14, 0, 6.3); g.fill();
          g.fillText(k.icon, x, y + 1);
        }
        // 목적지 ★
        if (obj && obj.pos) { const x = obj.pos.x / TILE * S, y = (obj.pos.y / TILE - y0) * S, s = 1 + Math.sin(t * 4) * 0.12; g.save(); g.translate(x, y - 22); g.scale(s, s); g.font = '26px sans-serif'; g.fillText('⭐', 0, 0); g.restore(); }
        // 나
        const px = G.player.x / TILE * S, py = (G.player.y / TILE - y0) * S;
        if (!G.house.inside) {
          g.fillStyle = 'rgba(255,107,139,0.25)'; g.beginPath(); g.arc(px, py, 14 + Math.sin(t * 3) * 3, 0, 6.3); g.fill();
          g.fillStyle = '#ff6b8b'; g.beginPath(); g.arc(px, py, 8, 0, 6.3); g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
      // 표시 누르기
      cv.addEventListener('pointerdown', (e) => {
        const r = cv.getBoundingClientRect(), sx = (e.clientX - r.left) * cv.width / r.width, sy = (e.clientY - r.top) * cv.height / r.height;
        let best = null, bd = 26;
        const all = mk.concat([{ tx: G.player.x / TILE, ty: G.player.y / TILE, name: `나 (${G.player.name})` }]).concat(obj && obj.pos ? [{ tx: obj.pos.x / TILE, ty: obj.pos.y / TILE - 2.75, name: '목적지: ' + obj.text }] : []);
        for (const k of all) { const d = Math.hypot(k.tx * S - sx, (k.ty - y0) * S - sy); if (d < bd) { bd = d; best = k; } }
        if (best) { info.innerHTML = `<b>${best.name}</b>`; G.audio.sfx('tap'); }
      });
      const legend = document.createElement('div'); legend.className = 'muted small maplegend';
      legend.textContent = '🏪 상점 · 📮 우체국 · 🏠 내 집 · 🦴 박물관 · 🏡 이웃 집 · 🌳 광장 · 🏮/• 등불 기둥 · 💧 조수 웅덩이 · 동그라미 = 이웃 · 분홍 = 나';
      wrap.append(cv); body.append(wrap, info, legend);
    }, { wide: true });
  };

  G.modules.add('map');
})(globalThis.G);
