// 주민·NPC: 상주 주민(딸랑·소금·라임) 일과·대화·친밀도, 보리 할멈(우체국), 토닥·토실(가판대)
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const list = [];

  // ---------- 상주 주민 정의 (r2-재미 1-4) ----------
  // sched: [시작, 끝, 장소] — 장소: home·plaza·oak·pond·river·beach·garden·stroll(마을 산책). 목록 밖 시간은 잠
  // 오너: "애들이 계속 가운데 뭉쳐 있다" → 광장 일정을 줄이고 산책을 넣음, 강·연못·바닷가 자리는 이웃마다 다르게
  const VILLAGERS = {
    ddalang: { name: '딸랑', species: 'rabbit', pers: '햇살', catch: '랄랄', bday: '03-21', plot: 'house1', look: { body: '#fff6f2' }, heart: '#ff8fb1',
      sched: [[6, 9, 'home'], [9, 13, 'plaza'], [13, 17, 'oak'], [17, 22, 'stroll']], tool: null },
    sogeum: { name: '소금', species: 'otter', pers: '엉뚱', catch: '퐁당', bday: '07-14', plot: 'house2', look: { scarf: '#7fc6e8' }, heart: '#6fa8c9',
      sched: [[7, 11, 'river'], [11, 15, 'pond'], [15, 20, 'beach'], [20, 23, 'home']], tool: 'rod' },
    lime: { name: '라임', species: 'cat', pers: '새침', catch: '흥칫', bday: '08-30', plot: 'house3', look: { scarf: '#b8e68f' }, heart: '#9bc94a',
      sched: [[8, 12, 'garden'], [12, 16, 'stroll'], [16, 20, 'oak'], [20, 24, 'garden']], tool: 'net' },
    // moveIn: 이사 후 며칠째에 입주하는가 (r2-재미 §3-2: 쫑알 D2, 단추 D3)
    jjongal: { name: '쫑알', species: 'squirrel', pers: '수다', catch: '도토독', bday: '10-05', plot: 'house4', look: { scarf: '#ffd24d' }, heart: '#e09a56', moveIn: 1,
      sched: [[7, 11, 'plaza'], [11, 15, 'stroll'], [15, 19, 'river'], [19, 22, 'oak']], tool: null },
    hotteok: { name: '호떡', species: 'bear', pers: '씩씩', catch: '후끈', bday: '01-09', plot: 'house6', look: { scarf: '#ff8a7a' }, heart: '#c08a5e', moveIn: 3,
      sched: [[5, 9, 'beach'], [9, 13, 'stroll'], [13, 17, 'river'], [17, 21, 'plaza']], tool: null },
    mungchi: { name: '뭉치', species: 'hamster', pers: '뒹굴', catch: '말랑', bday: '11-11', plot: 'house7', look: { scarf: '#b8e68f' }, heart: '#ffd7a0', moveIn: 5,
      sched: [[10, 13, 'home'], [13, 16, 'oak'], [16, 19, 'plaza'], [19, 21, 'home']], tool: null },
    mongsil: { name: '몽실', species: 'sheep', pers: '꿈꾸미', catch: '포슬', bday: '04-17', plot: 'house8', look: { scarf: '#c9b3ff' }, heart: '#c9b3ff', moveIn: 7,
      sched: [[7, 10, 'oak'], [10, 14, 'pond'], [14, 18, 'stroll'], [18, 23, 'garden']], tool: null },
    danchu: { name: '단추', species: 'penguin', pers: '꼼꼼', catch: '단정', bday: '06-02', plot: 'house5', look: { bow: '#ff6b6b' }, heart: '#46546a', moveIn: 2,
      sched: [[6, 9, 'home'], [9, 13, 'plaza'], [13, 17, 'beach'], [17, 21, 'home']], tool: null },
  };
  const LV = [0, 5, 15, 35, 70]; // 하트 1~4 문턱
  // 좋아하는 선물: 아이템 id 또는 'cat:<분류>'
  const FAV = {
    ddalang: ['crop:carrot', 'crop:strawberry', 'dish:jam'], sogeum: ['cat:fish', 'dish:radish_soup', 'dish:hwachae'],
    lime: ['crop:strawberry', 'dish:pumpkin_pie', 'cat:shell'], jjongal: ['fruit_acorn', 'crop:corn', 'dish:grilled_corn', 'egg'],
    danchu: ['crop:radish', 'crop:spinach', 'cat:fossil'], hotteok: ['crop:sweet_potato', 'dish:matang', 'milk', 'dish:pancake'],
    mungchi: ['crop:wheat', 'crop:pumpkin', 'dish:carrot_soup'], mongsil: ['crop:cabbage', 'dish:cabbage_stew', 'star_fragment'],
  };
  const GIFT_SAY = {
    ddalang: ['우와아, 이거 내가 제일 좋아하는 거야! 어떻게 알았어?! 랄랄!', '고마워! 방울이 기뻐서 저절로 울려!'],
    sogeum: ['…가설 적중. 너는 내 취향을 연구했다. 감동했다. 퐁당.', '고맙다. 연구실에 잘 보관하겠다.'],
    lime: ['…이거. 좋아하는 거야. 왜 아는 거야. 흥칫. …고마워.', '…받아 둘게. 버리진 않을 거야.'],
    jjongal: ['특종이다! 우편지기가 내 최애를 선물했다! 1면이야!', '고마워! 내일 신문 감사 코너에 실을게!'],
    danchu: ['이건… 제가 정말 좋아하는 것이에요. 기록부에 별 세 개를 칩니다. 단정.', '감사합니다. 「오늘의 고마운 일」에 적어 두겠습니다.'],
    hotteok: ['최고의 운동 간식이다! 힘이 솟아! 후끈!!', '고마워! 이걸로 열 바퀴 더 뛸 수 있어!'],
    mungchi: ['이거… 제일 좋아하는 거야…. 눈물 날 것 같아… 말랑….', '고마워…. 볼 주머니에 소중히 넣어 둘게….'],
    mongsil: ['예보에 없던 선물이야! 그것도 내가 제일 좋아하는 거! 포슬!', '고마워! 구름 병 옆에 둘게!'],
  };
  const isFav = (id, itemId) => (FAV[id] || []).some((f) => f === itemId || (f.startsWith('cat:') && (G.items.get(itemId) || {}).cat === f.slice(4)));
  const defSt = () => {
    const o = { bori: { seen: 0 }, fox: { seen: 0, goneDay: -1, letter: false, talks: 0 } };
    for (const id of Object.keys(VILLAGERS)) o[id] = { fs: 0, met: false, toolDay: -1, seen: 0, greetDay: -1, lvl: 0 };
    return o;
  };
  const st = defSt();

  function mk(id, name, species, look, x, y, extra) {
    return Object.assign({ id, name, kind: 'npc', species, look, x, y, dir: 0, r: 9, walk: 0, moving: false, seed: Math.random() * 10, tx: x, ty: y, wait: 0, emote: null, emoteT: 0, near: 0, hop: 0, vis: true, static: false }, extra || {});
  }

  const N = G.npc = {
    list, st, VILLAGERS, FAV, isFav,
    get: (id) => list.find((n) => n.id === id),
    isResident(id) { const v = VILLAGERS[id]; if (!v) return false; if (!v.moveIn) return true; const created = (G.save.sections.get('meta').get() || {}).created || 0; return G.time.day() >= created + v.moveIn; },
    level(id) { const fs = (st[id] || {}).fs || 0; let l = 0; for (let i = 1; i < LV.length; i++) if (fs >= LV[i]) l = i; return l; },
    init() {
      list.length = 0;
      const m = G.world.map, pl = m.plots;
      const door = (k, dx = 0, dy = 1) => ({ x: (pl[k].door.x + dx) * TILE + 16, y: (pl[k].door.y + dy) * TILE + 8 });
      const sd = pl.shop;
      list.push(mk('todak', '토닥', 'mole', { band: '#ff7a7a', apron: '#fff2c9' }, (sd.x + 1.2) * TILE, (sd.y + 2.25) * TILE, { static: true, behind: true }));
      list.push(mk('tosil', '토실', 'mole', { ribbon: '#ffb3cf', apron: '#e8f6ff' }, (sd.x + 2.8) * TILE, (sd.y + 2.25) * TILE, { static: true, behind: true }));
      const bp = door('post', 1.4, 0.4);
      list.push(mk('bori', '보리 할멈', 'hedgehog', {}, bp.x, bp.y, { static: true }));
      // 밤 손님 단풍(여우): 22시~4시, 나무 다리 위. 등불 1 전에는 다가가면 사라진다
      const br = m.bridges.find((b) => b.kind === 'bridge') || m.bridges[0];
      if (br) list.push(mk('danpung', '단풍', 'fox', {}, br.x * TILE + 16, br.y * TILE + 20, { static: true, visFn: () => { const h = G.time.hour(); return (h >= 22 || h < 4) && st.fox.goneDay !== G.time.day(); } }));
      if (pl.museum2) { const mp = door('museum2', 1.4, 0.4); list.push(mk('slowpoke', '느림보 박사', 'tortoise', {}, mp.x, mp.y, { static: true, visFn: () => G.museum.isOpen() })); }
      const spots = findSpots(m);
      for (const [id, v] of Object.entries(VILLAGERS)) {
        if (!pl[v.plot]) continue;
        const home = door(v.plot, 0, 1);
        const n = mk(id, v.name, v.species, v.look, home.x, home.y, { home, villager: true });
        // 이웃마다 다른 강가·연못가·바닷가 (예전엔 모두 광장에서 가장 가까운 한 곳이라 뭉쳤다)
        const pickOf = (list, k) => (list && list.length ? list[u.hash32(m.seed || 1, k, id.length * 31 + id.charCodeAt(0) * 7 + id.charCodeAt(1)) % list.length] : null);
        n.spots = Object.assign({ home }, spots, { river: pickOf(spots.rivers, 1) || spots.river, pond: pickOf(spots.ponds, 2) || spots.pond, beach: pickOf(spots.beaches, 3) || spots.beach, walk: spots.walk });
        // 라임의 정원 = 집 근처 꽃밭
        n.spots.garden = nearestObj(m, 'flower', Math.floor(home.x / TILE), Math.floor(home.y / TILE)) || home;
        // 처음 놓일 때 지금 활동 장소 근처로
        const a = N.activity(n); if (a && a.ax) { const p = standNear(a.ax, a.ay, n.r); if (p) { n.x = p.x; n.y = p.y; n.tx = n.x; n.ty = n.y; } }
        list.push(n);
      }
    },
    activity(n) {
      const v = VILLAGERS[n.id]; if (!v) return null;
      const h = G.time.hour();
      const first = G.time.st.playDays <= 1; // 이사 첫날: 다들 설레서 안 잔다
      let slot = v.sched.find(([a, b]) => h >= a && h < b);
      if (!slot && first) slot = v.sched[1];
      if (!slot) return { act: 'sleep' };
      const where = slot[2];
      // 산책: 마을 곳곳의 걸을 수 있는 자리를 하나씩 들렀다 간다 (닿거나 1분 지나면 다음 자리)
      if (where === 'stroll' && n.spots.walk && n.spots.walk.length) {
        const now = G.game ? G.game.t : 0;
        if (!n.stroll || u.dist(n.x, n.y, n.stroll.x, n.stroll.y) < TILE * 1.5 || now - (n.strollAt || 0) > 60) { n.stroll = n.spots.walk[Math.floor(Math.random() * n.spots.walk.length)]; n.strollAt = now; }
        return { act: where, ax: n.stroll.x, ay: n.stroll.y, r: 1.2 };
      }
      const p = n.spots[where] || n.spots.home;
      return { act: where, ax: p.x, ay: p.y, r: where === 'home' || where === 'garden' ? 2.4 : where === 'plaza' ? 5.5 : 3 };
    },
    update(dt, p, t) {
      for (const n of list) {
        if (n.hopT > 0) { n.hopT -= dt; n.hop = Math.sin((1 - n.hopT / 0.35) * Math.PI) * 6; } else n.hop = 0;
        if (n.emote) { n.emoteT += dt; if (n.emoteT > 1.6) n.emote = null; }
        const d = u.dist(n.x, n.y, p.x, p.y);
        const act = N.activity(n);
        n.vis = n.visFn ? n.visFn() : !(act && act.act === 'sleep') && (!n.villager || N.isResident(n.id));
        if (!n.vis) continue;
        if (n.id === 'danpung') { N.foxUpdate(n, p, dt); continue; }
        // 플레이어가 1.5타일 안: 바라보기, 3초 머물면 감정 팝 + 깡충
        if (d < TILE * 1.6) {
          if (n.near === 0) G.art.actor.forceBlink(n, t);
          n.near += dt;
          if (!n.talking) n.dir = faceDir(p.x - n.x, p.y - n.y, n.behind);
          if (n.near > 3 && !n.greeted) {
            n.greeted = true;
            const tool = G.player.tool;
            N.pop(n, n.villager && !st[n.id].met ? 'q' : tool === 'net' && n.id === 'ddalang' ? 'q' : 'heart');
          }
          n.moving = false;
          continue;
        } else { n.near = 0; if (d > TILE * 4) n.greeted = false; }
        if (n.static || n.talking || !act) { n.moving = false; continue; }
        // 배회
        if (n.wait > 0) { n.wait -= dt; n.moving = false; continue; }
        const dx = n.tx - n.x, dy = n.ty - n.y, len = Math.hypot(dx, dy);
        // 길 찾기 (오너 친구 제보: 이웃이 걷다가 길에 막혀 그대로 서 있다 — 직선으로만 걷던 탓)
        const pick = (x, y) => { const path = G.world.findPath(n.x, n.y, x, y); if (path) { n.tx = x; n.ty = y; n.path = path; n.wait = 0; return true; } return false; };
        if (len < 4 || n.stuck > 1.2 || !n.path) {
          const wasStuck = n.stuck > 1.2; n.stuck = 0; n.path = null; n.wait = wasStuck ? 0.3 : 1 + Math.random() * 3;
          const far = u.dist(n.x, n.y, act.ax, act.ay);
          // 활동 장소가 멀면 그쪽으로 (길이 있으면 걸어서). 화면 밖이고 멀면 순간이동으로 따라잡는다
          if (far > act.r * TILE * 1.6) {
            if (d > TILE * 14 && far > TILE * 6) { const q = standNear(act.ax, act.ay, n.r); if (q) { n.x = q.x; n.y = q.y; } }
            else if (pick(act.ax, act.ay)) n.wait = 0;
          }
          // 활동 장소 안에서 걸어갈 수 있는 곳 고르기 (안 되면 지금 자리 근처라도)
          for (let k = 0; k < 10 && !n.path; k++) {
            const near = k >= 6, a = Math.random() * 6.28, r = Math.random() * (near ? 3 : act.r) * TILE;
            const x = (near ? n.x : act.ax) + Math.cos(a) * r, y = (near ? n.y : act.ay) + Math.sin(a) * r;
            if (G.world.canStand(x, y, n.r)) pick(x, y);
          }
          if (!n.path) { n.path = []; n.tx = n.x; n.ty = n.y; }
          n.moving = false;
        } else {
          // 다음 길목(타일 가운데)으로. 지나치지 않게 남은 거리만큼만
          let wp = n.path[0] || { x: n.tx, y: n.ty };
          if (Math.hypot(wp.x - n.x, wp.y - n.y) < 3 && n.path.length) { n.path.shift(); wp = n.path[0] || { x: n.tx, y: n.ty }; }
          const wx = wp.x - n.x, wy = wp.y - n.y, wl = Math.hypot(wx, wy) || 1;
          const sp = Math.min(2.6 * TILE * dt, wl);
          const ox = n.x, oy = n.y;
          G.world.move(n, wx / wl * sp, wy / wl * sp);
          const moved = Math.hypot(n.x - ox, n.y - oy);
          if (moved < sp * 0.3) n.stuck = (n.stuck || 0) + dt; else n.stuck = 0;
          // 막히면 0.5초 뒤 길을 다시 찾고, 그래도 막히면 다른 곳으로 (화면 밖이면 조용히 옮기기)
          if (n.stuck > 0.5 && !n.repath) { n.repath = true; n.stuck = 0; if (!pick(n.tx, n.ty)) n.stuck = 9; }
          if (n.stuck > 1.1 && d > TILE * 10) { const q = standNear(act.ax, act.ay, n.r); if (q) { n.x = q.x; n.y = q.y; n.stuck = 9; } }
          if (moved > 1) n.repath = false;
          n.moving = moved > 0.01; n.dir = faceDir(wx, wy);
          n.walk = (n.walk + dt / 0.5) % 1;
        }
      }
    },
    // 단풍: 1단계(등불 0) — 3타일 안에 들어오면 스르르 사라진다 / 2단계(등불 1+) — 말을 건다
    foxUpdate(n, p, dt) {
      const d = u.dist(n.x, n.y, p.x, p.y);
      if (!st.fox.seen) { if (d < TILE * 8) { st.fox.seen = G.time.day(); G.emit('fox:seen', {}); G.save.mark('fox'); } }
      if (G.lantern.count() < 1 && d < TILE * 3 && !n.fading) { n.fading = 1; G.audio.sfx('chime'); }
      if (n.fading) { n.alpha = Math.max(0, (n.alpha === undefined ? 1 : n.alpha) - dt * 1.2); if (n.alpha <= 0) { st.fox.goneDay = G.time.day(); n.fading = 0; n.alpha = 1; G.ui.toast('…여우는 바람처럼 사라졌어요.', { icon: '🍂', ms: 2600 }); G.save.mark('fox'); } }
      n.dir = d < TILE * 6 ? faceDir(p.x - n.x, p.y - n.y) : 0;
    },
    async foxTalk(n) {
      if (G.lantern.count() < 1) return;
      const say = (t) => ({ who: 'danpung', text: t });
      if (!st.fox.letter) {
        await G.ui.say([say('…불이 켜졌구나. 그래서 네가 보이는 거야.'), say('나는 단풍. 길 잃은 편지를 들고 다니는 여우야.'), say('이 편지… 주소가 없어. 받는 이도, 보내는 이도. 그래도 누군가에게 꼭 닿아야 해.'), say('우편지기, 네가 들고 있어 줄래? 등불이 하나씩 켜질 때마다… 주소가 조금씩 보일 거야.')]);
        if (G.inv.add('letter_noaddr', 1) === 0) { st.fox.letter = true; G.ui.itemPop('letter_noaddr', null, '주소 없는 편지를 받았다…'); G.audio.sfx('rare'); }
        else G.ui.toast('가방이 꽉 차 있어요. 칸을 비우고 다시 와요.', { icon: '🎒' });
        G.save.mark('fox'); return;
      }
      const L = ['봉투 끝에 아주 희미하게… 「큰」이라는 글자가 보여. 다음 등불이 켜지면 더 보일 거야.', '밤바람이 차지? 큰솜이도 이 바람을 느끼고 있을 거야.', '너는 매일 편지를 나르지. 그 소리를… 누군가 듣고 있어.'];
      await G.ui.say([say(L[(st.fox.talks++ || 0) % L.length])]);
      G.save.mark('fox');
    },
    giftUI(n) {
      const id = n.id, s = st[id];
      return G.ui.modal(`${VILLAGERS[id].name}에게 선물하기`, (body, close) => {
        const info = document.createElement('div'); info.className = 'pane-head'; info.innerHTML = '<span>하루에 한 번. 좋아하는 걸 주면 훨씬 기뻐해요 (힌트: 이웃 탭)</span>';
        const grid = document.createElement('div'); grid.className = 'grid';
        G.inv.slots.forEach((x, i) => {
          const it = G.items.get(x.id); if (!it || it.nosell || !['crop', 'dish', 'bug', 'fish', 'sea', 'shell', 'fossil', 'furn', 'mat', 'ranch'].includes(it.cat)) return;
          const b = document.createElement('button'); b.className = 'slot'; b.title = G.items.name(x.id, x.x);
          b.innerHTML = `<img src="${G.art.iconURL(G.items.icon(x.id, x.x), 64)}" alt="">${x.n > 1 ? `<b>${x.n}</b>` : ''}`;
          b.onclick = async () => {
            const fav = isFav(id, x.id), name = G.items.name(x.id, x.x);
            G.inv.removeAt(i, 1); s.giftDay = G.time.day(); close();
            N.pop(n, 'heart'); G.audio.sfx(fav ? 'rare' : 'catch');
            await G.ui.say([{ who: id, text: (fav ? GIFT_SAY[id][0] : GIFT_SAY[id][1]) }]);
            N.addFs(id, fav ? 6 : 2, 'gift');
            G.emit('npc:gift', { id, item: x.id, fav });
            if (fav) { s.favKnown = s.favKnown || []; if (!s.favKnown.includes(x.id)) s.favKnown.push(x.id); G.ui.toast(`${VILLAGERS[id].name}${G.josa(VILLAGERS[id].name, '은/는').slice(-1)} ${name}${G.josa(name, '을/를').slice(-1)} 정말 좋아해요! 💗`, { icon: '🎁' }); }
            G.save.mark('gift');
          };
          grid.append(b);
        });
        body.append(info, grid);
      });
    },
    pop(n, kind) { n.emote = kind; n.emoteT = 0; n.hopT = 0.35; G.audio.sfx('pop'); },
    near(x, y, r) {
      let best = null, bd = r;
      for (const n of list) { if (!n.vis) continue; const d = u.dist(n.x, n.y + (n.behind ? 40 : 0), x, y); if (d < bd) { bd = d; best = n; } }
      return best;
    },
    addFs(id, delta, why) {
      const s = st[id]; if (!s) return;
      const before = N.level(id); s.fs += delta; const after = N.level(id);
      G.emit('npc:fs', { id, delta, why });
      if (after > before) { s.lvl = after; G.emit('npc:levelup', { id, lvl: after }); G.ui.toast(`${VILLAGERS[id].name}${G.josa(VILLAGERS[id].name, '와/과').slice(-1)} 더 친해졌어요! ${'💗'.repeat(after)}`, { icon: '💌' }); }
    },
    // ---------- 대화 ----------
    async talk(n) {
      const p = G.player;
      n.talking = true; n.dir = faceDir(p.x - n.x, p.y - n.y, n.behind);
      G.art.actor.forceBlink(n, G.game.t);
      G.emit('npc:talk', { id: n.id });
      try {
        if (n.id === 'todak' || n.id === 'tosil') { await G.game.openShop(); return; }
        if (n.id === 'bori') { await N.boriTalk(); return; }
        if (n.id === 'slowpoke') { await G.museum.talk(); return; }
        if (n.id === 'danpung') { await N.foxTalk(n); return; }
        if (VILLAGERS[n.id]) { await N.villagerTalk(n); return; }
      } finally { n.talking = false; }
    },
    async boriTalk() {
      const q = G.quest.st;
      if (!q.letterGiven) { await G.game.introScript(); return; }
      if (!q.letterDone && !G.inv.has('letter_ddalang')) {
        if (G.inv.add('letter_ddalang', 1) === 0) { await G.ui.say([{ who: 'bori', text: '자, 편지 여기 있다. 이번엔 잃어버리지 말거라. 콕!' }]); return; }
      }
      // 아직 도구를 못 받았으면 힌트
      const need = Object.entries(VILLAGERS).filter(([id, v]) => v.tool && !G.player.hasTool(v.tool));
      if (need.length) {
        const [id, v] = need[0];
        await G.ui.say([{ who: 'bori', text: `${v.name}${G.josa(v.name, '을/를').slice(-1)} 아직 못 만났니? ${v.tool === 'rod' ? '물가를 좋아하는 수달이란다. 강이나 연못, 바닷가를 찾아보렴.' : '꽃을 좋아하는 고양이란다. 집 앞 꽃밭이나 광장에 있을 게다.'} 콕!` }]);
        return;
      }
      if (G.fest && await G.fest.boriTalk()) return; // 축제 조각 교환
      const i = await G.ui.choose({ who: 'bori', text: '무슨 일이냐, 우편지기?' }, ['둥지 약정 (집)', '이야기하기', '그만두기']);
      if (i === 0) { await G.nest.talk(); return; }
      if (i === 2) return;
      const lines = G.lines('bori', 'chat');
      const l = lines[st.bori.seen++ % lines.length];
      await G.ui.say([{ who: 'bori', text: l.text }]);
      G.save.mark('talk');
    },
    async villagerTalk(n) {
      const id = n.id, v = VILLAGERS[id], s = st[id], day = G.time.day(), name = G.player.name;
      const say = (text) => ({ who: id, text: G.str(text, { name }) });
      const L = (sit) => G.lines(id, sit);
      // 첫 만남 (+ 도구 건네기)
      if (!s.met) {
        s.met = true; s.greetDay = day;
        await G.ui.say(L('first').map((l) => say(l.text)));
        if (v.tool && !G.player.hasTool(v.tool)) {
          G.player.giveTool(v.tool);
          G.ui.itemPop('tool:' + v.tool, null, `${G.TOOLS[v.tool].name}${G.josa(G.TOOLS[v.tool].name, '을/를').slice(-1)} 받았다!`);
          G.audio.sfx('catch');
          await G.ui.say(L('give').map((l) => say(l.text)));
          G.player.setTool(v.tool);
          G.ui.toast(G.input.isTouch() ? '오른쪽 아래 도구 버튼으로 도구를 바꿔요.' : 'Q 키나 도구 버튼으로 도구를 바꿔요.', { icon: G.ui.toolIcon(v.tool), ms: 3000 });
        }
        N.addFs(id, 2, 'meet'); N.pop(n, 'heart'); G.emit('npc:met', { id });
        G.save.mark('talk');
        if (!(id === 'ddalang' && G.inv.has('letter_ddalang'))) return; // 편지가 있으면 이어서 전한다
      }
      // 편지 배달 (딸랑)
      if (id === 'ddalang' && G.inv.has('letter_ddalang')) {
        G.inv.removeId('letter_ddalang', 1);
        G.quest.st.letterDone = true;
        N.pop(n, 'heart');
        await G.ui.say([say(L('letter')[0].text)]);
        N.addFs(id, 5, 'letter');
        G.emit('quest:letter', {});
        G.save.mark('talk'); return;
      }
      if (id === 'hotteok' && G.events.raceDay() && await G.events.raceTalk()) return;
      if (G.story && await G.story.onTalk(n)) { G.save.mark('talk'); return; } // 생일·하트 이야기
      if (await G.requests.onTalk(n)) { G.save.mark('talk'); return; }
      // 선물 (하루 한 번): 오늘 인사를 이미 했고 가방에 줄 만한 게 있으면 고르게 한다
      const giftable = G.inv.slots.filter((x) => { const it = G.items.get(x.id); return it && !it.nosell && ['crop', 'dish', 'bug', 'fish', 'sea', 'shell', 'fossil', 'furn', 'mat', 'ranch'].includes(it.cat); });
      if (s.greetDay === day && s.giftDay !== day && giftable.length) {
        const c = await G.ui.choose(say('응? 무슨 일이야?'), ['이야기하기', '선물하기 🎁']);
        if (c === 1) { await N.giftUI(n); return; }
      }
      const seq = [];
      if (s.greetDay !== day) {
        s.greetDay = day;
        const h = G.time.hour();
        const sit = h >= 22 || h < 5 ? 'greet_night' : h < 11 ? 'greet_morning' : h < 17 ? 'greet_day' : 'greet_evening';
        const ls = L(sit); if (ls.length) seq.push(say(u.pick(ls, Math.random()).text));
        N.addFs(id, 1, 'talk');
      } else if (s.toolDay !== day && (G.player.tool === 'net' || G.player.tool === 'rod') && L(G.player.tool).length) {
        s.toolDay = day;
        seq.push(say(L(G.player.tool)[0].text));
      } else {
        const chat = L('chat');
        if (N.level(id) >= 2 && s.seen % 7 === 6 && L('hearts').length) seq.push(say(L('hearts')[0].text));
        else seq.push(say(chat[s.seen % chat.length].text));
        s.seen++;
      }
      N.pop(n, 'note');
      await G.ui.say(seq);
      G.save.mark('talk');
    },
  };
  function faceDir(dx, dy, behind) {
    if (behind) return 0;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 3;
    return dy < 0 ? 2 : 0;
  }
  N.faceDir = faceDir;
  function standNear(x, y, r) {
    for (let k = 0; k < 40; k++) {
      const a = k * 2.4, d = (k / 40) * TILE * 4;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (G.world.canStand(px, py, r)) return { x: px, y: py };
    }
    return null;
  }
  function nearestObj(m, kind, tx, ty) {
    let best = null, bd = 12 * 12;
    for (const o of m.objs) { if (o.kind !== kind) continue; const d = (o.tx - tx) ** 2 + (o.ty - ty) ** 2; if (d < bd) { bd = d; best = o; } }
    return best ? { x: best.tx * TILE + 16, y: (best.ty + 1) * TILE + 10 } : null;
  }
  // 물가·해변 등 공용 장소 (광장에서 가까운 곳)
  function findSpots(m) {
    const W = G.world, px = m.plaza.x, py = m.plaza.y;
    const best = { river: null, pond: null, beach: null };
    const bd = { river: 1e9, pond: 1e9, beach: 1e9 };
    for (let y = W.HIGH_ROWS + 2; y < m.h - 1; y++) for (let x = 2; x < m.w - 2; x++) {
      if (!W.walkableTile(x, y)) continue;
      const d = (x - px) ** 2 + (y - py) ** 2;
      const t = W.tile(x, y);
      if (t === G.TERR.SAND && W.tile(x, y + 1) === G.TERR.SEA && d < bd.beach) { bd.beach = d; best.beach = [x, y]; }
      if (t === G.TERR.GRASS) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
        const k = W.waterKind(x + dx, y + dy);
        if (k === 'river' && d < bd.river) { bd.river = d; best.river = [x, y]; }
        if (k === 'pond' && d < bd.pond) { bd.pond = d; best.pond = [x, y]; }
      }
    }
    const out = { plaza: { x: px * TILE + 16, y: (py + 2) * TILE + 16 }, oak: { x: (m.plots.oak.x + 1) * TILE, y: (m.plots.oak.y + 3) * TILE } };
    for (const k of Object.keys(best)) out[k] = best[k] ? { x: best[k][0] * TILE + 16, y: best[k][1] * TILE + 16 } : out.plaza;
    // 후보 목록: 강가·연못가·바닷가 (서로 3칸 이상 떨어지게 추려서), 산책 자리(풀밭·길, 6칸 간격)
    const rivers = [], ponds = [], beaches = [], walk = [], far = (list, x, y, g) => list.every((q) => Math.abs(q.tx - x) + Math.abs(q.ty - y) >= g);
    for (let y = W.HIGH_ROWS + 2; y < m.h - 1; y++) for (let x = 2; x < m.w - 2; x++) {
      if (!W.walkableTile(x, y)) continue;
      const t = W.tile(x, y), at = { x: x * TILE + 16, y: y * TILE + 16, tx: x, ty: y };
      if (t === G.TERR.SAND && W.tile(x, y + 1) === G.TERR.SEA && far(beaches, x, y, 4)) beaches.push(at);
      if (t === G.TERR.GRASS) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
        const k = W.waterKind(x + dx, y + dy);
        if (k === 'river' && far(rivers, x, y, 4)) { rivers.push(at); break; }
        if (k === 'pond' && far(ponds, x, y, 3)) { ponds.push(at); break; }
      }
      if ((t === G.TERR.GRASS || t === G.TERR.PATH) && x % 6 === 0 && y % 6 === 0 && W.walkableTile(x + 1, y) && W.walkableTile(x, y + 1)) walk.push(at);
    }
    Object.assign(out, { rivers, ponds, beaches, walk });
    return out;
  }

  G.save.section('npc', {
    v: 2, def: defSt,
    get: () => JSON.parse(JSON.stringify(st)),
    set: (d) => { const base = defSt(); for (const k of Object.keys(base)) st[k] = Object.assign(base[k], d[k] || {}); },
    // v1 → v2: 소금·라임 추가, 딸랑은 이미 만난 것으로
    migrate: { 1: (d) => Object.assign({}, d, { ddalang: Object.assign({ met: true }, d.ddalang || {}) }) },
  });

  // ---------- 대사 (소금·라임 각 20+줄, 딸랑 첫 만남) ----------
  const T = [];
  const add = (who, sit, arr) => arr.forEach((text, i) => T.push({ id: `${who}.${sit}.${i}`, who, sit, text }));
  add('ddalang', 'first', ['안녕! 너구나, 새 우편지기! 나는 딸랑이야, 랄랄! 귀에 방울 달린 거 봤지? 숨바꼭질할 때 이게 문제야….', '콩알도 안녕! …앗, 콩알이 먼저 인사했어! 이건 우리가 친구라는 뜻이야!']);
  // 소금 (수달, 엉뚱, 입버릇 "퐁당")
  add('sogeum', 'first', ['가설: 너는 새 우편지기다.', '근거: 모자 위에 솜뭉치. 그리고 우편 가방. …가설 적중. 퐁당.', '나는 소금. 물고기 말을 번역하는 연구를 하고 있다. 진척도는 3%다.']);
  add('sogeum', 'give', ['이건 원래 물고기 번역기 녹음 장비다. 낚싯대로도 쓸 수 있다. 빌려주는 거다. 아마 영원히.', '물에 던지고 기다려. 찌가 「톡」 하면 아직이고, 「풍덩!」 하고 잠기면 그때 당겨. 퐁당.']);
  add('sogeum', 'greet_morning', ['아침 물 온도 측정 완료. 결론: 차갑다. 퐁당.', '좋은 아침이다, {name}. 물고기들도 방금 일어났다. 아마.']);
  add('sogeum', 'greet_day', ['{name}. 오늘의 연구 주제: 붕어는 왜 입을 뻐끔거리는가. 의견 있나?', '오, {name}. 마침 네 의견이 필요했다. 아니, 방금 잊어버렸다. 퐁당.']);
  add('sogeum', 'greet_evening', ['노을이 물에 비치면 물고기들이 수다스러워진다. 데이터가 그렇게 말한다.', '저녁이다. 하루 연구 성과: 물에 두 번 빠졌다. 의도한 거다.']);
  add('sogeum', 'greet_night', ['밤의 물소리는 녹음하기 좋다. 쉿. …지금 그 숨소리도 녹음됐다.', '이 시간엔 메기가 말을 많이 한다. 아직 무슨 말인지는 모른다.']);
  add('sogeum', 'chat', [
    '어제 피라미가 「뽀글」이라고 했다. 「환영한다」는 뜻이다. 15% 확신.',
    '수달은 잘 때 손을 잡고 잔다. 떠내려가지 않으려고. 나는 베개를 잡는다.',
    '번역기 부품이 필요하다. 조개 「였던 것」이 좋다. 「인 것」은 안 된다.',
    '바다 물고기는 강 물고기보다 말이 빠르다. 사투리일지도 모른다.',
    '딸랑이 숨바꼭질을 하자고 했다. 방울 소리 때문에 3초 만에 찾았다. 미안했다.',
    '라임은 밤에 뭔가를 한다. 아직 가설 단계다. 퐁당.',
    '물수제비를 일곱 번 떴다. 돌이 아니라 내가.',
  ]);
  add('sogeum', 'rod', ['그 낚싯대, 잘 쓰고 있군. 녹음 기능은… 없다. 내가 떼어 냈다.']);
  add('sogeum', 'net', ['잠자리채로 물고기를 잡으려는 건가? 대담한 가설이다.']);
  add('sogeum', 'hearts', ['{name}이 잡은 물고기 이야기를 들으면 번역 진척도가 오른다. 지금 4%다. …고맙다. 퐁당.']);
  // 라임 (고양이, 새침, 입버릇 "흥칫")
  add('lime', 'first', ['…뭘 봐. 처음 보는 얼굴이네.', '라임이야. 딱히 알려 주고 싶어서 말하는 거 아니야. 흥칫.']);
  add('lime', 'give', ['…이거 가져가. 잠자리채야. 집에 자리가 없어서 그래. 정말이야.', '벌레한테는 살금살금 다가가. 뛰어가면 다 도망가. …솜씨 보여주면 칭찬해 줄 수도 있고.']);
  add('lime', 'greet_morning', ['아침부터 무슨 일이야. …아니, 반갑다는 뜻은 아니고. 흥칫.', '좋은 아침. 꽃들이 이슬을 잔뜩 먹었어. 내가 준 건 아니야.']);
  add('lime', 'greet_day', ['또 왔어? …뭐, 심심하진 않네.', '{name}. 꽃밭 밟지 마. 밟을 거면 사뿐히.']);
  add('lime', 'greet_evening', ['저녁 햇빛이 털에 좋대. 그래서 나온 거야. 너 보러 온 거 아니야.', '하루가 금방 갔네. 흥칫.']);
  add('lime', 'greet_night', ['…이 시간에 뭐 해? 나? 나는… 산책. 그냥 산책이야.', '쉿. 밤에는 꽃도 자. 조용히 해.']);
  add('lime', 'chat', [
    '꽃은 말을 못 하니까 색으로 말하는 거래. 분홍은… 몰라, 알아서 생각해.',
    '딸랑은 너무 시끄러워. …그래도 없으면 조금 조용하긴 해.',
    '화단에 누가 밤마다 물을 준대. 나 아니야. 진짜 아니야. 흥칫.',
    '고양이는 높은 데를 좋아해. 근데 나무는 무서워. 이건 비밀이야.',
    '소금이 물고기 말을 번역한대. …번역되면 나한테 제일 먼저 알려 달라고 해.',
    '네 모자 위 솜뭉치, 만져 봐도 돼? …아니, 됐어. 안 궁금해.',
    '보리 할멈은 60년 동안 지각을 안 했대. 나는 60분도 자신 없어.',
  ]);
  add('lime', 'net', ['그 잠자리채, 잘 쓰고 있구나. …손잡이 닦아 둔 거 나야. 됐어, 잊어.']);
  add('lime', 'rod', ['낚시하러 가? …물고기 잡으면 한 마리 보여 줘. 먹으려는 거 아니야.']);
  add('lime', 'hearts', ['{name}, 너랑 있으면 꼬리가 마음대로 움직여. …못 봤지? 못 본 거다. 흥칫.']);
  // 쫑알 (다람쥐, 수다, 입버릇 "도토독")
  add('jjongal', 'first', ['앗! 너구나, 새 우편지기! 나는 쫑알이야! 기자야! 정확히는 기자 지망생이야! 도토독!', '광장 게시판에 「쫑알 일보」를 붙일 거야. 독자는 지금 0명이야. 네가 1호 독자야! 축하해!']);
  add('jjongal', 'greet_morning', ['조간 뉴스! 오늘 아침 해가 떴습니다! …당연하다고? 그래도 뉴스야!', '좋은 아침! 특종 냄새가 나. 아니 도토리 냄새인가? 도토독!']);
  add('jjongal', 'greet_day', ['{name}! 마침 잘 왔어. 인터뷰 좀 하자. 첫 질문: 오늘 기분은 몇 점?', '속보! 우편지기가 나한테 말을 걸었다! …이건 1면감이야.']);
  add('jjongal', 'greet_evening', ['석간 마감 중이야! 오늘의 헤드라인을 고르는 중인데, 너무 많아서 고를 수가 없어!', '노을 사진을 1면에 실을까, 딸랑 사진을 실을까. 고민이야, 도토독.']);
  add('jjongal', 'greet_night', ['쉿… 밤에는 취재원들이 자거든. 나도 자야 하는데 기사가 안 끝났어….', '다리 위에 여우가 있다는 제보가 들어왔어. 아직 확인 중이야. 무섭지 않아. 진짜야.']);
  add('jjongal', 'chat', [
    '어제 신문에 네 키를 3미터라고 썼어. 정정 보도 나갈 거야. 2미터 90센티로.',
    '구독료는 소문 하나야. 너 혹시 소문 없어? 아무거나! 사소해도 돼!',
    '딸랑이 숨바꼭질 0승이라는 건 이미 기사로 썼어. 시리즈물이야.',
    '소금이 물고기 말을 번역한다는 거, 사실이면 노벨 물고기상감이야.',
    '라임은 인터뷰를 안 해 줘. 「노코멘트」만 세 번 들었어. 그것도 기사로 썼지.',
    '도토리 지도를 잃어버렸어. 어디 묻었는지 몰라. 봄에 나무가 나면 알겠지?',
    '단추는 기사의 띄어쓰기를 다 고쳐 줘. 고마운데 무서워.',
  ]);
  add('jjongal', 'net', ['그 잠자리채로 특종을 잡는 거야? 나도 하나 갖고 싶다!']);
  add('jjongal', 'rod', ['낚시 취재 따라가도 돼? 큰 거 잡으면 1면에 실어 줄게!']);
  add('jjongal', 'hearts', ['{name}은 내 첫 독자야. 내 신문이 창간 100호가 돼도 그건 안 바뀌어. 도토독.']);
  // 단추 (펭귄, 꼼꼼, 존댓말, 입버릇 "단정")
  add('danchu', 'first', ['안녕하세요. 펭귄 단추입니다. 첫 인사 시각은… 기록해 두겠습니다.', '아주 좋은 숫자군요. 앞으로 잘 부탁드립니다. 단정.']);
  add('danchu', 'greet_morning', ['좋은 아침입니다. 오늘 아침 기온과 하늘 색을 기록해 두었습니다.', '일찍 오셨군요. 기록상 오늘 첫 손님이십니다.']);
  add('danchu', 'greet_day', ['안녕하세요, {name} 님. 오늘 광장 벤치는… 열두 개입니다. 다행이네요.', '마침 기록부를 펼쳐 두었습니다. 오늘 일어난 좋은 일, 하나 말씀해 주세요.']);
  add('danchu', 'greet_evening', ['저녁입니다. 오늘 기록이 꽤 길어졌어요. 좋은 날이었다는 뜻이지요.', '노을은 매일 조금씩 다른 색입니다. 그것도 기록하고 있어요.']);
  add('danchu', 'greet_night', ['밤에는 별 개수를 셉니다. 매번 다르게 나와서… 조금 곤란합니다.', '늦은 시간이네요. 기록에 「밤의 우편지기」라고 적어 두겠습니다.']);
  add('danchu', 'chat', [
    '광장 벤치는 열두 개예요. …지난주엔 열세 개였지만요. 이건 미해결 사건입니다.',
    '저는 빙판 마을에서 왔어요. 여기는 따뜻해서 가끔 녹는 기분이 듭니다.',
    '쫑알 님 신문의 오타를 고쳐 드렸더니 신문보다 정오표가 길어졌어요.',
    '호떡이라는 곰이 곧 온다던데요. 겨울에 반팔을 입는다니… 기록할 게 많겠군요.',
    '보리 할멈은 60년 무지각이시죠. 저는 아직 2년입니다. 존경합니다.',
    '기록부 맨 뒤에 「예상 밖의 일」 칸을 만들까 고민 중이에요. 아직은 비어 있어요.',
    '콩알 님이 오늘 저를 보고 꼬물, 하셨어요. 기록했습니다. 꼬물 1회.',
  ]);
  add('danchu', 'net', ['잠자리채군요. 잡으신 곤충은 이름과 크기를 꼭 기록해 두세요. …도감이 해 준다고요? 편리하네요.']);
  add('danchu', 'rod', ['낚싯대를 드셨군요. 오늘 첫 캐스팅 시각을 여쭤봐도 될까요?']);
  add('danchu', 'hearts', ['{name} 님이 오신 날은 기록부에 별표를 칩니다. …요즘은 별표가 많아졌어요. 단정.']);
  // 호떡 (곰, 씩씩, 입버릇 "후끈")
  add('hotteok', 'first', ['오! 새 얼굴! 나는 호떡! 운동이 취미고 특기는 운동이야! 후끈!', '겨울인데 반팔이냐고? 근육이 목도리야! …그래도 목도리는 세 개 했어.']);
  add('hotteok', 'greet_morning', ['좋은 아침! 해변 열 바퀴 돌고 왔어! 너도 같이 뛸래? 후끈!', '아침 공기 최고! 폐가 웃고 있어!']);
  add('hotteok', 'greet_day', ['{name}! 팔씨름 한 판? …농담이야. 반은 진심이야!', '오늘 목표: 광장 나무까지 왕복 백 번! 지금 마흔 번째!']);
  add('hotteok', 'greet_evening', ['저녁 스트레칭 시간! 하나, 둘! …어, 등에서 소리 났다.', '노을이 꼭 호떡 색이야. 배고파졌어. 후끈.']);
  add('hotteok', 'greet_night', ['밤엔 근육도 쉬어야 해. 근데 나는 잠이 안 와…. 팔굽혀펴기 하면 잠이 와!', '쉿, 다들 자. 나는 조용히 플랭크 중이야.']);
  add('hotteok', 'chat', [
    '뭉치한테 가만히 있기 대결에서 졌어. 그건 운동이 아니라 재능이야.',
    '플랭크 하다가 잠들었는데 일어나 보니 아침이었어. 기록 경신이야!',
    '단추가 내 운동 기록을 적어 줘. 근데 맨날 「예상 밖의 일」 칸에 적어.',
    '토요일마다 운동회를 열고 싶어. 종목은 달리기, 줄다리기, 그리고 낮잠(뭉치 전용).',
    '딸랑이랑 달리기 하면 방울 소리 때문에 박자가 맞아. 신기해!',
    '근육은 배신하지 않아. 근데 계단은 가끔 배신해.',
    '라임이 「덥다」고 나한테서 멀리 앉았어. 내가 따뜻한 건 장점이야!',
  ]);
  add('hotteok', 'net', ['잠자리채 휘두르기! 그것도 운동이야! 팔 근육에 좋아!']);
  add('hotteok', 'rod', ['낚시는 기다림의 운동이야. 나한테 제일 어려운 종목이지!']);
  add('hotteok', 'hearts', ['{name}은 내 운동 친구 1호야! 같이 뛰어 주는 거 아니어도, 응원만 해 줘도 1호야! 후끈!']);
  // 뭉치 (햄스터, 뒹굴, 입버릇 "말랑")
  add('mungchi', 'first', ['으음… 안녕… 나는 뭉치야…. 이사는 힘들었어… 그래서 눕는 중이야… 말랑.', '볼에 해바라기씨 있는데… 하나 줄까…? 따뜻해….']);
  add('mungchi', 'greet_morning', ['아침이야…? 벌써…? 조금만 더…. 말랑….', '일어났어. 장하지? 다시 누워도 돼?']);
  add('mungchi', 'greet_day', ['{name}… 오늘 날씨 누워 있기 딱 좋아….', '안녕… 나 지금 아주 바빠…. 쉬느라고….']);
  add('mungchi', 'greet_evening', ['저녁이네… 하루 종일 누워 있었더니 하루가 빨리 갔어…. 이득이야.', '노을 보면서 누워 있으면… 노을이 나를 덮어 주는 기분이야….']);
  add('mungchi', 'greet_night', ['쿨… 아, 깼어…. 왜…? 아, 너구나… 말랑….', '밤이 제일 좋아…. 누워 있어도 아무도 뭐라 안 해….']);
  add('mungchi', 'chat', [
    '호떡이랑 가만히 있기 대결했어…. 내가 이겼어…. 사실 자고 있었어….',
    '볼 주머니 청소해야 하는데… 볼에서 편지가 세 통 나왔어…. 다 내 거 아니야….',
    '세상에서 제일 푹신한 곳을 찾고 있어…. 지금 후보는 콩알이야…. 미안 콩알….',
    '운동회에서 「누워 있기」 종목 만들면 금메달은 내 거야….',
    '해바라기씨 하나 줄까…? 따뜻해…. 볼에서 나와서….',
    '느림보 박사님이랑 있으면 마음이 편해…. 둘 다 천천히 말하니까….',
    '오늘 목표는… 목표 정하기야…. 내일 할게….',
  ]);
  add('mungchi', 'net', ['잠자리채… 그거 해먹으로 써도 돼…? 안 돼…? 말랑….']);
  add('mungchi', 'rod', ['낚시는 좋아… 앉아서 기다리는 거잖아…. 나 그거 잘해….']);
  add('mungchi', 'hearts', ['{name} 옆에 있으면… 바닥이 더 푹신한 것 같아…. 고마워… 말랑.']);
  // 몽실 (양, 꿈꾸미, 입버릇 "포슬")
  add('mongsil', 'first', ['안녕! 구름을 보고 이 마을로 정했어. 저 구름이 「여기야」 하는 모양이었거든! 포슬.', '나는 몽실! 구름 예보를 해. 아직 한 번도 안 맞았지만, 그래서 더 설레!']);
  add('mongsil', 'greet_morning', ['오늘의 구름 예보! 오후에 토끼 모양 구름이 올 거야! …아마 강아지 모양일 거야.', '좋은 아침! 하늘이 오늘 무슨 꿈을 꿨는지 알 것 같아. 솜사탕 꿈이야!']);
  add('mongsil', 'greet_day', ['{name}! 저 구름 봐, 너 닮았어! …지금 사라졌어.', '오늘은 구름이 느긋해. 큰솜이가 깊이 자는 날인가 봐. 포슬.']);
  add('mongsil', 'greet_evening', ['노을 구름은 분홍 털실 같아. 떠서 목도리 만들고 싶어.', '저녁 구름이 집으로 돌아가는 중이야. 구름도 집이 있을까?']);
  add('mongsil', 'greet_night', ['밤에는 구름 대신 별을 봐. 별은 예보가 잘 맞아. 늘 거기 있으니까.', '쉿… 큰솜이 숨소리 들려? 땅이 아주 천천히 올라갔다 내려가.']);
  add('mongsil', 'chat', [
    '구름 예보 연속 오답 기록 갱신 중이야. 쫑알이 신문에 매일 실어 줘. 고마워…?',
    '구름을 병에 담아 보고 싶어. 담으면 램프가 될 것 같아.',
    '큰솜이 등 위에 살면 꿈이 잘 꿔진대. 나는 매일 구름 꿈만 꿔. 당연한가?',
    '라임네 꽃밭 위 구름은 늘 하트 모양이야. 아무도 안 믿어 줘.',
    '등불이 켜질 때마다 큰솜이가 꿈을 하나씩 꾼대. 보리 할멈이 그랬어.',
    '내 털이 비 오기 전에 더 포슬포슬해져. 그건 잘 맞아!',
    '콩알도 구름이지? …아니라고? 나는 구름이라고 믿을래. 포슬.',
  ]);
  add('mongsil', 'net', ['잠자리채로 구름을 잡을 수 있을까? 해 보면 알려 줘!']);
  add('mongsil', 'rod', ['낚싯대를 하늘로 던지면 구름이 잡힐까? …물에다 던지는 거구나.']);
  add('mongsil', 'hearts', ['{name}이 오는 날은 예보가 필요 없어. 무조건 맑음이니까. 포슬.']);
  G.data.add('lines', T);

  G.modules.add('npc');
})(globalThis.G);
