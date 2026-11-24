// 게임: 카메라, 플레이어, 렌더 파이프라인, 상호작용, 씬(title·create·town), 첫날 흐름, 부팅
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE, A = G.art;
  const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  let cv, ctx, DPR = 1;

  // ---------- 카메라 ----------
  const cam = G.cam = {
    x: 0, y: 0, w: 0, h: 0, PX: 2, T: 11,
    resize() {
      DPR = Math.min(globalThis.devicePixelRatio || 1, 2);
      const cw = innerWidth, ch = innerHeight;
      cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
      const short = Math.min(cw, ch);
      // 짧은 변에 보이는 타일 수 T (세로 폰 11 / 가로 폰 9.5 / PC 12 / 태블릿 13)
      let T = short >= 700 ? (Math.max(cw, ch) > 1100 ? 12 : 13) : (ch > cw ? 11 : 9.5);
      T *= G.settings.get('view') || 1;
      cam.T = T;
      cam.PX = Math.max(0.5, Math.round((short * DPR) / (T * TILE) / 0.25) * 0.25);
      A.PX = cam.PX;
      cam.w = cv.width / cam.PX; cam.h = cv.height / cam.PX;
      G.emit('cam:px', { PX: cam.PX });
    },
    follow(x, y, dt, snap) {
      const m = G.world.map;
      let tx = x - cam.w / 2, ty = y - cam.h / 2 - 16;
      tx = u.clamp(tx, 0, m.w * TILE - cam.w); ty = u.clamp(ty, (G.world.HIGH_ROWS - 8) * TILE, m.h * TILE - cam.h);
      if (snap) { cam.x = tx; cam.y = ty; return; }
      const k = 1 - Math.exp(-dt * 6);
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    },
    rect() { return { x: cam.x, y: cam.y, w: cam.w, h: cam.h }; },
    toWorld(cx, cy) { return { x: cam.x + cx * DPR / cam.PX, y: cam.y + cy * DPR / cam.PX }; },
  };

  // ---------- 플레이어 ----------
  const pl = {
    kind: 'player', species: 'human', x: 0, y: 0, dir: 0, r: 9.6, walk: 0, moving: false, mode: 'walk', seed: 0,
    look: { skin: 0, hair: 0, hairC: 0, shirt: 0 }, name: '', town: '', tools: ['hand'], tool: 'hand',
    swing: 0, busy: 0, hold: null, holdT: 0, squash: 0, stepT: 0, idleT: 0,
    up: {}, // 도구 업그레이드 {net, rod, can} (6차 회의)
    hasTool(t) { return this.tools.includes(t); },
    giveTool(t) { if (!this.tools.includes(t)) this.tools.push(t); G.save.mark('tool'); G.ui.refreshHud(); },
    setTool(t) { if (!this.hasTool(t)) return; this.tool = t;
      if (t === 'net') G.events.tip('net', '잠자리채를 들고 천천히 걸으면 곤충이 덜 놀라요. 가까이서 노란 버튼!', '잠자리채를 들고 걸으면 곤충이 덜 놀라요. 가까이서 Space!');
      if (t === 'rod') G.events.tip('rod', '낚싯대: 물 쪽을 보고 노란 버튼으로 던져요. 찌가 「풍덩!」 잠기면 다시 눌러요.', '낚싯대: 물 쪽을 보고 Space로 던져요. 찌가 「풍덩!」 잠기면 다시 Space!'); G.fishing.cancel(true); G.ui.refreshHud(); G.save.mark('tool'); },
    nextTool() { const i = this.tools.indexOf(this.tool); this.setTool(this.tools[(i + 1) % this.tools.length]); G.audio.sfx('tap'); },
  };
  G.player = pl;
  G.save.section('player', {
    v: 2,
    def: () => ({ x: 0, y: 0, dir: 0, look: { skin: 0, hair: 0, hairC: 0, shirt: 0 }, name: '', town: '', tools: ['hand'], tool: 'hand', ring: [], up: {} }),
    get: () => ({ x: Math.round(pl.x), y: Math.round(pl.y), dir: pl.dir, look: pl.look, name: pl.name, town: pl.town, tools: pl.tools, tool: pl.tool, ring: pl.ring || [], up: pl.up || {} }),
    set: (d) => { Object.assign(pl, { x: d.x, y: d.y, dir: d.dir, look: d.look, name: d.name, town: d.town, tools: d.tools, tool: d.tool, ring: d.ring, up: d.up || {} }); },
    // v1 → v2: 도구 즐겨찾기(ring) 필드 추가 (마이그레이션 시험 1건, r2-제작범위 M-a)
    migrate: { 1: (d) => Object.assign({}, d, { ring: (d.tools || []).slice(0, 8) }) },
  });
  // 메타
  const meta = { seed: 0, created: 0, genVer: 1 };
  G.save.section('meta', { v: 1, def: () => ({ seed: 0, created: 0, genVer: 1, name: '', town: '' }), get: () => Object.assign({}, meta, { name: pl.name, town: pl.town }), set: (d) => Object.assign(meta, d) });

  // ---------- 콩알 (모자 위) ----------
  const kg = { ox: 0, oy: 0, sx: { x: 0, v: 0 }, sy: { x: 0, v: 0 }, jump: 0, jv: 0, ear: false, blink: 1, sleep: false, lastLine: 0, say: null, sayT: 0, sniff: 0 };
  function kongalReact(kind) {
    if (kind === 'jump') { kg.jv = 160; G.audio.sfx('kongal'); }
    G.emit('kongal:react', { kind });
  }
  function kongalSay(text) { kg.say = text; kg.sayT = 2.2; }

  // ---------- 게임 상태 ----------
  const GM = G.game = { t: 0, started: false, target: null, drops: [], fx: [], held: null };

  // 바닥에 떨어진 물건 (나무 흔들기 등)
  function dropItem(id, x, y, n = 1) {
    const d = { id, x, y, n, vy: -90, h: 30, t: 0, key: 'drop' + Math.random().toString(36).slice(2, 8) };
    GM.drops.push(d); G.world.state.drops = GM.drops.map((e) => ({ id: e.id, x: e.x, y: e.y, n: e.n, key: e.key }));
    G.save.mark('drop');
  }

  // 아이템 얻기 공통 흐름: 가방 확인 → 들어 올리기 연출 → 도감 → 토스트
  const gainCount = {};
  GM.gain = (id, n, x, opt = {}) => {
    if (!G.inv.canFit(id, x)) {
      G.audio.sfx('error');
      G.ui.toast('가방이 꽉 찼어요! 가판대에서 팔고 올까요?', { icon: '🎒' });
      return false;
    }
    G.inv.add(id, n, x);
    const it = G.items.get(id);
    gainCount[id] = (gainCount[id] || 0) + 1;
    const short = gainCount[id] >= 10 && !(x && (x.newSp || x.v));
    if (!opt.keepTool) {
      pl.hold = { id, x }; pl.holdT = short ? 0.4 : 1.2; pl.busy = Math.max(pl.busy, short ? 0.35 : 0.9);
    }
    pl.dir = 0;
    G.ui.itemPop(id, x, opt.msg, short);
    if (opt.sfx !== false) G.audio.sfx(it && it.ref && it.ref.tier >= 3 || (x && x.v) ? 'rare' : opt.sfx || 'pickup');
    G.emit('item:gain', { id, n, src: opt.src });
    return true;
  };

  // ---------- 대상 선택 (액션 버튼 우선순위) ----------
  function front(d) { const [dx, dy] = DIRS[pl.dir]; return { x: pl.x + dx * d, y: pl.y + dy * d }; }
  // 친구 마을(손님)에서는 구경·채집만: 나무·땅·건물·텃밭·목장은 주인 것
  const GUEST_BLOCK = new Set(['ranch', 'farm', 'chop', 'rockhit', 'dig', 'lantern', 'museum', 'board', 'tent', 'mailbox', 'house', 'postoffice', 'stall', 'snowman', 'rock']);
  function findTarget() {
    const t0 = findTargetRaw();
    if (G.net && G.net.guest && GUEST_BLOCK.has(t0.kind)) return { kind: 'guestno', icon: '👀', label: '구경', name: t0.name };
    return t0;
  }
  function findTargetRaw() {
    const f = front(20);
    // 0) 함께 노는 친구 → 선물 주기
    const fr = G.net && G.net.active && (G.net.near(f.x, f.y, 26) || G.net.near(pl.x, pl.y, 22));
    if (fr) return { kind: 'friend', ref: fr, icon: '🎁', label: '선물 주기', name: fr.name };
    // 1) 주민·NPC
    const n = G.npc.near(f.x, f.y, 30) || G.npc.near(pl.x, pl.y, 26);
    if (n) return { kind: 'npc', ref: n, icon: '💬', label: '말 걸기', name: n.name };
    // 2) 바닥 물건·조개
    for (const d of GM.drops) if (u.dist(d.x, d.y, f.x, f.y) < 22 || u.dist(d.x, d.y, pl.x, pl.y) < 18) return { kind: 'drop', ref: d, icon: '🤲', label: '줍기', name: G.items.name(d.id) };
    for (const s of G.world.state.shells) {
      if (G.world.isTaken(s.id)) continue;
      const sx = s.tx * TILE + 16, sy = s.ty * TILE + 18;
      if (u.dist(sx, sy, f.x, f.y) < 22 || u.dist(sx, sy, pl.x, pl.y) < 18) return { kind: 'shell', ref: s, icon: '🤲', label: '줍기', name: G.items.name(s.item) };
    }
    // 2.3) 목장
    const rk = G.ranch.target(f.x, f.y, pl.x, pl.y);
    if (rk) return rk;
    // 2.4) 텃밭
    const fm = G.farm.target(f.x, f.y) || G.farm.target(pl.x, pl.y);
    if (fm) return fm;
    // 2.5) 썰물 때 조수 웅덩이 생물 (맨손으로 잡는다 — 어떤 도구를 들고 있어도)
    const tp = G.tide.near(f.x, f.y, 26) || G.tide.near(pl.x, pl.y, 22);
    if (tp) return { kind: 'pool', ref: tp, icon: '🦀', label: '잡기', name: '조수 웅덩이' };
    // 3) 도구별
    if (pl.tool === 'net') { const b = G.eco.nearest('bug', f.x, f.y, 56); return { kind: 'net', ref: b, icon: 'tool:net', label: '휘두르기', name: b && b.fade > 0.5 ? b.sp.name : '' }; }
    if (pl.tool === 'rod') {
      if (G.fishing.state !== 'idle') return { kind: 'rod', icon: 'tool:rod', label: G.fishing.state === 'reel' ? '영차!' : G.fishing.state === 'bite' ? '당기기!' : '거두기' };
      const water = waterAhead();
      return { kind: 'rod', icon: 'tool:rod', label: '던지기', name: water ? ({ river: '강', pond: '연못', sea: '바다' })[water] : '' };
    }
    const ft = { x: Math.floor(f.x / TILE), y: Math.floor(f.y / TILE) };
    if (pl.tool === 'axe') {
      const o = objAhead();
      if (o && (o.kind === 'tree' || o.kind === 'fruit' || o.kind === 'pine')) return { kind: 'chop', ref: o, icon: 'tool:axe', label: '찍기', name: '나무' };
      return { kind: 'swingtool', icon: 'tool:axe', label: '휘두르기', name: '' };
    }
    if (pl.tool === 'shovel') {
      const ro = objAhead();
      if (ro && ro.kind === 'rock') return { kind: 'rockhit', ref: ro, icon: '🪨', label: '두드리기', name: '바위' };
      const dg = G.world.state.digs.find((d) => !G.world.isTaken(d.id) && Math.abs(d.tx * TILE + 16 - f.x) < 26 && Math.abs(d.ty * TILE + 16 - f.y) < 26);
      return { kind: 'dig', ref: dg, icon: 'tool:shovel', label: '파기', name: dg ? '금 간 땅' : '' };
    }
    // 눈사람 (첫눈 이후 겨울)
    const sm = G.events.snowmanPos();
    if (sm && u.dist(sm.x, sm.y, f.x, f.y) < 30) return { kind: 'snowman', icon: '⛄', label: G.events.st.snowman ? '보기' : '눈덩이 올리기', name: '광장 눈사람' };
    // 4) 사물: 나무·표지판·텐트·건물
    const o = objAhead();
    if (o) {
      if (o.kind === 'tree' || o.kind === 'fruit' || o.kind === 'pine' || o.kind === 'bigoak') return { kind: 'shake', ref: o, icon: '🌳', label: '흔들기', name: o.kind === 'bigoak' ? '할아버지 참나무' : '나무' };
      if (o.kind === 'lantern') return { kind: 'lantern', ref: o, icon: '🏮', label: G.lantern.ready(o.n) ? '불 켜기' : '살펴보기', name: `${o.n}번 등불 기둥` };
      if (o.kind === 'museum') return { kind: 'museum', ref: o, icon: '🦴', label: G.museum.isOpen() ? '들어가기' : '살펴보기', name: '조약돌 박물관' };
      if (o.kind === 'signboard') return { kind: 'read', ref: o, icon: '📜', label: '읽기', name: '표지판' };
      if (o.kind === 'board') return { kind: 'board', ref: o, icon: '📌', label: '보기', name: '게시판' };
      if (o.kind === 'tent') return { kind: 'tent', ref: o, icon: '🏠', label: '들어가기', name: '내 ' + G.nest.cur().name };
      if (o.kind === 'mailbox') return { kind: 'mailbox', ref: o, icon: '📮', label: '열기', name: '우체통' };
      if (o.kind === 'house') return { kind: 'house', ref: o, icon: '🚪', label: '두드리기', name: '딸랑의 집' };
      if (o.kind === 'post') return { kind: 'postoffice', ref: o, icon: '🚪', label: '두드리기', name: '우체국' };
      if (o.kind === 'stall') return { kind: 'stall', ref: o, icon: '🏪', label: '가판대', name: '땅굴상점' };
      if (o.kind === 'rock') return { kind: 'rock', ref: o, icon: '🪨', label: '살펴보기', name: '바위' };
      if (o.kind === 'lamp' || o.kind === 'bench') return { kind: 'poke', ref: o, icon: '✋', label: '만지기', name: o.kind === 'lamp' ? '가로등' : '벤치' };
    }
    if (G.ranch.st.riding) return { kind: 'none', icon: '🐴', label: '내리기', name: '' };
    return { kind: 'none', icon: '✋', label: '', name: '' };
  }
  function objAhead() {
    for (const d of [18, 30]) {
      const f = front(d);
      const o = G.world.objAtTile(Math.floor(f.x / TILE), Math.floor(f.y / TILE));
      if (o && !o.deco) return o;
    }
    return null;
  }
  function waterAhead() {
    const [dx, dy] = DIRS[pl.dir];
    for (let dd = 1.1; dd <= 2.6; dd += 0.3) { const x = pl.x + dx * dd * TILE, y = pl.y + dy * dd * TILE; const k = G.world.waterKind(Math.floor(x / TILE), Math.floor(y / TILE)); if (k) return k; }
    return null;
  }

  // ---------- 행동 ----------
  function landFish(f) {
    const res = G.collect.record('fish', f.sp.ix, f.v, f.size);
    G.emit('eco:caught', { kind: 'fish', ix: f.sp.ix, v: f.v, size: f.size });
    const x = { size: f.size, v: f.v, newSp: res.newSp }; if (f.v === 5) x.s = A.season;
    if (GM.gain('fish:' + f.sp.id, 1, x, { msg: `${G.josa(G.items.name('fish:' + f.sp.id, x), '을/를')} 낚았다!` })) { kongalReact('jump'); kongalSay('폴짝!'); }
    fxSplash(f.x, f.y);
  }
  G.on('fishing:auto', () => { const r = G.fishing.press(pl); while (r && r.reel) { const q = G.fishing.press(pl); if (q.caught) { landFish(q.caught); return; } } if (r && r.caught) landFish(r.caught); });
  async function doAction() {
    if (pl.busy > 0) return;
    const tg = findTarget();
    switch (tg.kind) {
      case 'npc': await G.npc.talk(tg.ref); break;
      case 'friend': G.ui.giftTo(tg.ref); break;
      case 'guestno': G.ui.toast('친구 마을에서는 구경만 해요. 벌레·물고기·조개·바다생물은 잡을 수 있어요!', { icon: '👀', ms: 2600 }); break;
      case 'drop': {
        const d = tg.ref;
        if (GM.gain(d.id, d.n, null, { src: 'drop' })) { GM.drops.splice(GM.drops.indexOf(d), 1); G.world.state.drops = GM.drops.map((e) => ({ id: e.id, x: e.x, y: e.y, n: e.n, key: e.key })); }
        break;
      }
      case 'shell': {
        const s = tg.ref;
        if (GM.gain(s.item, 1, null, { src: 'beach' })) G.world.take(s.id);
        break;
      }
      case 'net': {
        pl.swing = 0.001; pl.busy = 0.38; G.audio.sfx('swing');
        setTimeout(() => {
          const b = G.eco.swing(pl);
          if (b) {
            const r = G.collect.record('bug', b.sp.ix, b.v, b.size);
            G.emit('eco:caught', { kind: 'bug', ix: b.sp.ix, v: b.v, size: b.size });
            const x = { size: b.size, v: b.v, newSp: r.newSp }; if (b.v === 5) x.s = A.season;
            GM.gain('bug:' + b.sp.id, 1, x, { msg: `${G.josa(G.items.name('bug:' + b.sp.id, x), '을/를')} 잡았다!`, keepTool: true });
            kongalReact('jump'); kongalSay(u.pick(G.lines('kongal', 'catch'), Math.random()).text);
            if (!G.inv.canFit('bug:' + b.sp.id, x) && !G.inv.has('bug:' + b.sp.id)) { /* gain 실패 시 놓아줌 */ }
          } else { G.audio.sfx('whiff'); }
        }, 140);
        break;
      }
      case 'rod': {
        if (G.fishing.state === 'idle') {
          if (!G.fishing.cast(pl)) { G.audio.sfx('bump'); G.ui.toast('물 쪽을 바라보고 던져요.', { icon: '🎣', ms: 1400 }); }
          else { pl.swing = 0.001; }
        } else {
          const r = G.fishing.press(pl);
          if (r.reel) { pl.squash = 0.1; if (G.fishing.reel === 0) kongalSay('영차!'); }
          else if (r.caught) landFish(r.caught);
          else if (r.early) { kongalSay(u.pick(G.lines('kongal', 'miss'), Math.random()).text); G.emit('eco:miss', { kind: 'fish' }); }
        }
        break;
      }
      case 'dig': {
        pl.busy = 0.55; pl.swing = 0.001; G.audio.sfx('dig');
        const dg = tg.ref;
        setTimeout(() => {
          if (dg && !G.world.isTaken(dg.id)) {
            const rows = G.data.all('fossils');
            const fo = rows[u.hash32(G.world.map.seed, G.time.day(), dg.tx, dg.ty) % rows.length];
            // 정체는 박물관에서 감정받아야 안다
            if (GM.gain('fossil_raw', 1, { f: fo.id }, { msg: '수상한 화석을 파냈다! 박물관에서 감정받아요.', sfx: 'dug' })) {
              G.world.take(dg.id); G.emit('dig:found', { id: fo.id }); kongalReact('jump');
            }
          } else { G.ui.toast('흙이 단단해요. 금 간 땅을 찾아봐요.', { icon: G.ui.toolIcon('shovel'), ms: 1500 }); }
        }, 260);
        break;
      }
      case 'farm': await G.farm.act(tg); break;
      case 'ranch': await G.ranch.act(tg); break;
      case 'pool': { pl.busy = 0.3; pl.squash = 0.12; G.audio.sfx('plop'); if (G.tide.catch(tg.ref)) { kongalReact('jump'); fxSplash(tg.ref.tx * TILE + 16, tg.ref.ty * TILE + 22); } break; }
      case 'chop': case 'rockhit': {
        const o = tg.ref; o.shakeT = 0.4; pl.busy = 0.45; pl.swing = 0.001;
        G.audio.sfx(tg.kind === 'chop' ? 'shake' : 'dig');
        setTimeout(() => {
          const r = G.nest.gather(o, tg.kind === 'chop' ? 'axe' : 'shovel');
          if (r.none) { G.audio.sfx('bump'); G.ui.toast(tg.kind === 'chop' ? `이 나무는 오늘 많이 내줬어요. 다음 아침(약 ${G.time.minsToMorning()}분 뒤)에 또 와요.` : `이 바위는 오늘 다 두드렸어요. 다음 아침(약 ${G.time.minsToMorning()}분 뒤)에 또 와요.`, { icon: tg.kind === 'chop' ? '🌳' : '🪨', ms: 1500 }); return; }
          dropItem(r.id, o.tx * TILE + 16 + (pl.x < o.tx * TILE + 16 ? -18 : 18), o.ty * TILE + 28, 1);
          G.audio.sfx('drop'); if (tg.kind === 'chop') leafFx(o);
        }, 180);
        break;
      }
      case 'swingtool': pl.swing = 0.001; pl.busy = 0.3; G.audio.sfx('whiff'); break;
      case 'shake': {
        const o = tg.ref; o.shakeT = 0.6; pl.busy = 0.4; G.audio.sfx('shake');
        G.emit('world:shake', { obj: o.i });
        const key = 't' + o.i, st = G.world.state.shakes;
        if (!st[key]) {
          st[key] = 1; G.save.mark('shake');
          const r = u.hashf(G.world.map.seed, G.time.day(), o.i, 3);
          const fx = o.tx * TILE + 16 + (pl.x < o.tx * TILE + 16 ? -18 : 18), fy = o.ty * TILE + 30;
          if (o.kind === 'fruit' && r < 0.6) { dropItem('fruit_acorn', fx, fy, 1); setTimeout(() => G.audio.sfx('drop'), 300); }
          else if (r < 0.32) { dropItem('branch', fx, fy, 1 + (r < 0.1 ? 1 : 0)); setTimeout(() => G.audio.sfx('drop'), 300); }
          else if (r > 0.95) { setTimeout(() => { G.wallet.add(100, 'tree'); G.audio.sfx('coin'); G.ui.toast('몽 주머니가 떨어졌다! +100몽', { icon: '💧' }); }, 300); }
        }
        leafFx(o);
        break;
      }
      case 'read': await G.ui.say([{ who: 'sys', text: G.museum.isOpen() ? '「조약돌 박물관」 — 화석 감정은 무료! 기증은 언제나 환영이래요.' : '「조약돌 박물관 — 내일 개관」 느림보 박사가 오는 중이래요. 조금 느려서….' }]); break;
      case 'lantern': await G.lantern.interact(tg.ref); break;
      case 'museum': if (G.museum.isOpen()) await G.museum.talk(); else await G.ui.say([{ who: 'sys', text: '천막 입구에 「내일 아침 개관!」이라고 적혀 있어요. 박사님은 아직 오는 중인가 봐요.' }]); break;
      case 'board': {
        if (G.news.available()) { await G.news.open(); break; }
        const tr = G.market.trend();
        await G.ui.say([{ who: 'sys', text: `[몽글소식] 오늘의 유행 바람은 「${tr.name}」 쪽으로 분대요. 땅굴상점에서 조금 더 쳐 준대요.` }, { who: 'sys', text: '게시판 한쪽에 「신문 창간 예정! — 곧 이사 올 다람쥐 기자」라는 쪽지가 붙어 있어요.' }]);
        break;
      }
      case 'tent': G.house.enter(); break;
      case 'mailbox': await G.mail.open(); break;
      case 'house': await G.ui.say([{ who: 'sys', text: G.npc.get('ddalang').vis ? '똑똑… 대답이 없어요. 딸랑은 밖에서 놀고 있나 봐요.' : '안에서 쌔근쌔근 소리가 나요. 딸랑이 자고 있어요.' }]); break;
      case 'postoffice': await G.ui.say([{ who: 'sys', text: '우체국 문이 잠겨 있어요. 보리 할멈은 문 앞에서 기다리고 있어요.' }]); break;
      case 'stall': await GM.openShop(); break;
      case 'rock': await G.ui.say([{ who: 'sys', text: '동글동글한 바위예요. 밑에서 뭔가 데굴데굴 굴러다니는 소리가 나요.' }]); break;
      case 'poke': o_poke(tg.ref); break;
      case 'snowman': await G.events.snowmanTalk(); break;
      default:
        if (await G.events.tryWish()) break; // 별똥별이 지나가는 중이면 소원
        if (G.ranch.dismount()) break;       // 조랑말에서 내리기
        // 대상이 없어도 반응한다(죽은 입력 0): 작은 깡충 + 소리
        pl.squash = 0.12; G.audio.sfx('bump');
        if (Math.random() < 0.3) kongalSay(u.pick(G.lines('kongal', 'idle'), Math.random()).text);
    }
  }
  function o_poke(o) { o.shakeT = 0.3; G.audio.sfx(o.kind === 'lamp' ? 'chime' : 'tap'); }
  GM.restMenu = async function tentMenu() {
    const i = await G.ui.choose({ who: 'sys', text: '내 텐트예요. 무엇을 할까요?' }, ['저장하기', '콩알이랑 잠깐 쉬기', '그만두기']);
    if (i === 0) { const r = G.save.now('tent'); G.audio.sfx('save'); G.ui.toast(r.ok ? '저장했어요! 언제든 이어서 할 수 있어요.' : '저장하지 못했어요.', { icon: '💾' }); }
    else if (i === 1) {
      kg.sleep = true;
      await G.ui.say([{ who: 'kongal', text: '새근….' }, { who: 'sys', text: '콩알이 모자에서 내려와 베개 옆에 동그랗게 말았어요. "내일 꿈 얘기 해줄게."' }]);
      kg.sleep = false;
    }
  };
  GM.openShop = async () => {
    const h = G.time.hour();
    if (h < 8 || h >= 22) { await G.ui.say([{ who: 'tosil', text: '가판대는 아침 8시부터 밤 10시까지예요. 오빠는 벌써 굴에서 자요.' }]); return; }
    const first = !G.market.stats.firstSale;
    const hello = [{ who: 'todak', text: u.pick(G.lines('todak', 'hello'), Math.random()).text }, { who: 'tosil', text: u.pick(G.lines('tosil', 'hello'), Math.random()).text }];
    if (first) hello.push({ who: 'tosil', text: G.str(G.lines('tosil', 'trend')[0].text, { trend: G.market.trend().name }) });
    await G.ui.say(hello);
    await G.ui.shop();
  };

  // ---------- 첫날 흐름 ----------
  GM.introScript = async () => {
    const q = G.quest.st, name = pl.name;
    await G.ui.say([
      { who: 'bori', text: '어서 오너라, 새 우편지기. 나는 몽글숲 우체국장 보리란다. 콕!' },
      { who: 'bori', text: `이름이… ${name}? 감자?` },
    ]);
    const c = await G.ui.choose({ who: 'bori', text: '감자 맞지?' }, [`아니요, ${name}예요`, '…네, 감자예요']);
    if (c === 1) await G.ui.say([{ who: 'bori', text: '농담이란다. 귀는 아직 멀쩡해. 콕콕!' }]);
    else await G.ui.say([{ who: 'bori', text: `${name}. 좋은 이름이구나. 편지 봉투에 쓰기도 좋고.` }]);
    await G.ui.say([
      { who: 'bori', text: '그 모자 위 솜뭉치는 누구냐? …콩알? 허허, 주민이 1.5명 늘었구나.' },
      { who: 'kongal', text: '꼬물.' },
      { who: 'bori', text: '여기는 큰솜이라는 구름양의 등 위에 생긴 마을이란다. 큰솜이가 숨 쉴 때마다 몽글바람이 불어서 매일 새 물건을 실어 오지.' },
      { who: 'bori', text: '자, 우편지기의 첫 일이다. 이 편지를 딸랑에게 전해 주렴. 귀에 방울 단 토끼란다. 방울 소리가 나는 쪽을 찾아보거라.' },
    ]);
    if (G.inv.add('letter_ddalang', 1) === 0) { q.letterGiven = true; G.ui.itemPop('letter_ddalang', null, '딸랑에게 갈 편지를 받았다!'); G.audio.sfx('pickup'); }
    await G.ui.say([
      { who: 'bori', text: '아, 그리고 이웃들에게 인사하렴. 물가에는 수달 소금이, 꽃밭에는 고양이 라임이 있단다. 우편지기한테 줄 선물이 있다더구나.' },
      { who: 'bori', text: '할 일은 잎첩(🍃)에 적어 두었단다. 순서는 상관없어. 다 못 해도 괜찮다. 편지는 내일도 오니까. 콕!' },
    ]);
    q.intro = true; G.save.now('intro');
  };

  // ---------- 이펙트 ----------
  function leafFx(o) {
    const pal = A.pal();
    for (let k = 0; k < 8; k++) GM.fx.push({ x: o.tx * TILE + 16 + (Math.random() - 0.5) * 40, y: o.ty * TILE - 20 - Math.random() * 30, vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 20, t: 0, life: 1.4, kind: 'leaf', c: A.season === 'winter' ? '#ffffff' : pal.leaf[k % 3] });
  }
  function fxSplash(x, y) { for (let k = 0; k < 10; k++) GM.fx.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, g: 260, t: 0, life: 0.6, kind: 'drop', c: '#ffffff' }); }
  function fxSparkle(x, y, n = 6, c = '#fff6a8') { for (let k = 0; k < n; k++) { const a = k / n * 6.28; GM.fx.push({ x, y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, t: 0, life: 0.5, kind: 'star', c }); } }
  GM.sparkle = fxSparkle;

  // ---------- 업데이트 ----------
  function updatePlayer(dt) {
    const mv = G.input.move;
    pl.busy = Math.max(0, pl.busy - dt);
    if (pl.holdT > 0) { pl.holdT -= dt; if (pl.holdT <= 0) pl.hold = null; }
    if (pl.swing > 0) { pl.swing += dt * 3.2; if (pl.swing >= 1) pl.swing = 0; }
    pl.squash = Math.max(0, pl.squash - dt * 0.8);
    const canMove = pl.busy <= 0 && !pl.hold;
    if (mv.mag > 0 && canMove) {
      const speed = (G.input.mode === 'run' ? 6.5 : G.input.mode === 'sneak' ? 1.6 : 4.0) * TILE * (G.house && G.house.inside ? 1 : G.ranch.speedMul());
      const s = speed * (G.input.stick ? Math.max(0.35, mv.mag) : 1) * dt;
      if (G.fishing.state !== 'idle') G.fishing.cancel(true);
      const ox = pl.x, oy = pl.y;
      (GM.mover || G.world.move)(pl, mv.x * s, mv.y * s);
      pl.dir = Math.abs(mv.x) > Math.abs(mv.y) * 1.1 ? (mv.x < 0 ? 1 : 3) : (mv.y < 0 ? 2 : 0);
      const moved = Math.hypot(pl.x - ox, pl.y - oy);
      pl.moving = moved > 0.05;
      pl.mode = G.input.mode;
      // 걷기 사이클 460ms(4.0타일/s 기준 비례)
      pl.walk = (pl.walk + dt * (speed / (4 * TILE)) / 0.46) % 1;
      pl.stepT -= dt * (speed / (4 * TILE));
      if (pl.stepT <= 0 && pl.moving) {
        pl.stepT = 0.23;
        const t = G.house && G.house.inside ? -1 : G.world.tileAt(pl.x, pl.y), T = G.TERR;
        G.audio.sfx('step', { surf: t === -1 ? 'wood' : t === T.SAND ? 'sand' : t === T.BRIDGE ? 'wood' : A.season === 'winter' && t === T.GRASS ? 'snow' : 'grass', vol: pl.mode === 'sneak' ? 0.4 : pl.mode === 'run' ? 1.4 : 1 });
      }
      pl.idleT = 0;
    } else {
      if (pl.moving) pl.squash = 0.04;
      pl.moving = false; pl.mode = 'walk';
      pl.idleT += dt;
    }
    pl.tilt = 0;
  }
  function updateKongal(dt, t) {
    // 모자 위 스프링: 이동 반대 방향으로 지연
    const mv = G.input.move;
    const tx = pl.moving ? -mv.x * 4 : 0, ty = pl.moving ? -Math.abs(mv.y) * 1.5 : 0;
    G.spring(kg.sx, tx, 90, 9, dt); G.spring(kg.sy, ty, 90, 9, dt);
    kg.ox = kg.sx.x; kg.oy = kg.sy.x;
    kg.jv -= 900 * dt; kg.jump = Math.max(0, kg.jump + kg.jv * dt); if (kg.jump === 0 && kg.jv < 0) kg.jv = 0;
    kg.blink = A.actor.blink(kg, t);
    if (kg.sayT > 0) kg.sayT -= dt;
    // 감지: 미수집 종 근처 → 귀 쫑긋, 희귀 → 꼬물꼬물
    const s = G.eco.sense(pl.x, pl.y);
    kg.ear = !!s;
    if (s && s.rare && t - kg.lastLine > 12) { kg.lastLine = t; kongalSay('꼬물! 꼬물꼬물!'); kongalReact('jump'); }
    // 화석 근처: 킁킁 (가까울수록 빨리)
    if (pl.tool === 'shovel' || !G.quest.isDone('dig')) {
      let best = 99; for (const d of G.world.state.digs) if (!G.world.isTaken(d.id)) best = Math.min(best, u.dist(d.tx * TILE + 16, d.ty * TILE + 16, pl.x, pl.y) / TILE);
      if (best < 3) { kg.sniff -= dt; if (kg.sniff <= 0) { kg.sniff = best < 1.2 ? 0.25 : best < 2 ? 0.4 : 0.7; kg.jv = Math.max(kg.jv, 50); } if (t - kg.lastLine > 8) { kg.lastLine = t; kongalSay('킁킁!'); } }
    }
    // 10초 무입력: 아이들 행동
    if (pl.idleT > 10 && t - kg.lastLine > 10) { kg.lastLine = t; const l = u.pick(G.lines('kongal', 'idle'), Math.random()).text; kongalSay(l); if (l === '폴짝!') kongalReact('jump'); }
  }
  function updateFx(dt) {
    for (let i = GM.fx.length - 1; i >= 0; i--) {
      const f = GM.fx[i]; f.t += dt; if (f.t > f.life) { GM.fx.splice(i, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt;
      if (f.kind === 'leaf') f.vx += Math.sin(f.t * 5) * 30 * dt;
    }
    for (const d of GM.drops) { if (d.h > 0 || d.vy < 0) { d.vy += 400 * dt; d.h = Math.max(0, d.h - d.vy * dt); if (d.h === 0) d.vy = 0; } d.t += dt; }
    for (const o of G.world.map.objs) if (o.shakeT > 0) o.shakeT -= dt;
  }

  // ---------- 렌더 ----------
  const R = [];
  function render(t) {
    const W = G.world;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = A.C.sea; ctx.fillRect(0, 0, cv.width, cv.height);
    const rect = cam.rect();
    // 카메라를 기기 픽셀에 맞춰 정수화 (흔들림 방지)
    const camX = Math.round(cam.x * cam.PX) / cam.PX, camY = Math.round(cam.y * cam.PX) / cam.PX;
    const S = G.C.CHUNK * TILE;
    // 레이어 0: 지면 청크
    const cx0 = Math.floor(rect.x / S), cy0 = Math.floor(rect.y / S), cx1 = Math.floor((rect.x + rect.w) / S), cy1 = Math.floor((rect.y + rect.h) / S);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cy < 0 || cx * G.C.CHUNK >= W.map.w || cy * G.C.CHUNK >= W.map.h) continue;
      const c = A.chunk(cx, cy);
      ctx.drawImage(c, Math.round((cx * S - camX) * cam.PX), Math.round((cy * S - camY) * cam.PX));
    }
    // 월드 좌표계
    ctx.setTransform(cam.PX, 0, 0, cam.PX, -camX * cam.PX, -camY * cam.PX);
    // 레이어 1: 물 애니·물고기 그림자·데칼
    A.drawWater(ctx, rect, t);
    G.eco.drawWater(ctx, rect, t);
    const guest = G.net && G.net.guest; // 손님일 땐 내 텃밭·목장을 친구 마을 위에 그리지 않는다
    if (!guest) { G.farm.drawSoil(ctx, rect); G.ranch.drawPen(ctx, rect, t); }
    drawDecals(t, rect);
    G.tide.draw(ctx, rect, t);
    // 레이어 3: y-정렬
    R.length = 0;
    collectObjects(rect, t);
    G.eco.collect(R, rect, t);
    if (!guest) { G.farm.collect(R, rect, t); G.ranch.collect(R, rect, t); }
    if (G.net && G.net.active) G.net.collect(R, rect, t);
    for (const n of G.npc.list) if (n.vis && n.x > rect.x - 60 && n.x < rect.x + rect.w + 60) R.push({ sy: n.y, draw: (c) => { if (n.alpha !== undefined && n.alpha < 1) { c.globalAlpha = n.alpha; A.actor.draw(c, n, t); c.globalAlpha = 1; } else A.actor.draw(c, n, t); } });
    R.push({ sy: pl.y, draw: (c) => drawPlayer(c, t) });
    const sm = G.events.snowmanPos();
    if (sm) R.push({ sy: sm.y, draw: (c) => drawSnowman(c, sm.x, sm.y, G.events.st.snowman) });
    for (const d of GM.drops) R.push({ sy: d.y, draw: (c) => drawDrop(c, d, t) });
    R.sort((a, b) => a.sy - b.sy);
    for (const it of R) it.draw(ctx);
    // 낚싯줄·찌
    G.fishing.draw(ctx, pl, t);
    if (G.net && G.net.active) { G.net.tag(ctx, pl.x, pl.y - 62, pl.name || '나', '#ffe08a'); if (pl.bubbleT > 0 && pl.bubble) G.net.bubble(ctx, pl.x, pl.y - 76, pl.bubble, Math.min(1, pl.bubbleT)); }
    // 이펙트
    for (const f of GM.fx) {
      const a = 1 - f.t / f.life; ctx.globalAlpha = a;
      if (f.kind === 'star') { ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, 2.2 * a + 0.5, 0, 6.28); ctx.fill(); }
      else if (f.kind === 'leaf') { ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(f.x, f.y, 3, 1.8, f.t * 4, 0, 6.28); ctx.fill(); }
      else { ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, 1.8, 0, 6.28); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // 레이어 5: 날씨
    const wx = G.weather.now();
    A.weather.update(G.loop.dt, wx.type, rect, wx.wind || 0);
    A.weather.draw(ctx, wx.type);
    // 레이어 6·7: 그레이딩 + 빛
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const d = G.time.date(); const hour = d.getHours() + d.getMinutes() / 60;
    const cloudy = wx.type === 'clear' ? 0 : wx.type === 'cloudy' ? 0.5 : 1;
    const dark = A.grade(ctx, cv.width, cv.height, hour, cloudy);
    if (dark > 0.25) drawLights(rect, camX, camY, dark, t);
    // 레이어 8: 감정 팝·말풍선·들어 올린 아이템
    ctx.setTransform(cam.PX, 0, 0, cam.PX, -camX * cam.PX, -camY * cam.PX);
    for (const n of G.npc.list) {
      if (!n.vis) continue;
      const hy = n.y - 62 - (n.species === 'rabbit' ? 10 : 0);
      if (n.emote) A.emote(ctx, n.x, hy, n.emote, Math.min(1, n.emoteT / 0.3));
      else if (G.requests.pending(n.id) || (n.villager && !G.npc.st[n.id].met)) {
        // 부탁이 있는 주민: 머리 위 작은 「!」 (폰에서도 보이게 통통 튐)
        const k = Math.abs(Math.sin(t * 3 + n.seed)) * 3;
        A.paint.blob(ctx, n.x, hy - k, 6.5, 6.5, G.requests.fresh(n.id) || !G.npc.st[n.id].met ? '#ffd24d' : '#ffffff', A.C.line, 1.2);
        ctx.fillStyle = A.C.line; ctx.font = G.fontPx(10); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(G.npc.st[n.id] && !G.npc.st[n.id].met ? '?' : '!', n.x, hy - k + 0.5);
      }
    }
    if (pl.hold) drawHeld(t);
    if (kg.sayT > 0 && !G.ui.dialogOpen()) bubble(pl.x, pl.y - 74 - kg.jump, kg.say, Math.min(1, kg.sayT * 3));
    G.fishing.drawPost(ctx, pl);
    G.events.drawMeteors(ctx);
    drawAim(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    G.events.drawArrow(ctx, cam, cv, t);
  }
  function drawSnowman(c, x, y, done) {
    const P = A.paint;
    P.shadow(c, x, y, 26, 0.22);
    P.blob(c, x, y - 10, 13, 11, '#ffffff', A.C.line, 1.5);
    if (done) { P.blob(c, x, y - 28, 9.5, 8.5, '#ffffff', A.C.line, 1.5); P.blob(c, x - 3, y - 30, 1.3, 1.6, '#2d2430'); c.strokeStyle = '#2d2430'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(1.5 + x, y - 30); c.lineTo(5 + x, y - 30); c.stroke(); c.fillStyle = '#ff8a3a'; c.beginPath(); c.moveTo(x, y - 27); c.lineTo(x + 7, y - 26); c.lineTo(x, y - 25); c.fill(); P.rrect(c, x - 9, y - 22, 18, 4, 2, '#ff6b6b', A.C.line, 1); }
    else { P.blob(c, x + 14, y - 4, 6, 5, '#ffffff', A.C.line, 1.2); }
  }
  function collectObjects(rect, t) {
    const W = G.world, m = W.map;
    const night = A.gradeAt(G.time.date().getHours()).a > 0.35;
    const tx0 = Math.floor(rect.x / TILE) - 3, ty0 = Math.floor(rect.y / TILE) - 2, tx1 = Math.ceil((rect.x + rect.w) / TILE) + 3, ty1 = Math.ceil((rect.y + rect.h) / TILE) + 4;
    const seen = new Set();
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const o = W.objAtTile(x, y); if (!o || seen.has(o)) continue; seen.add(o);
      const bx = o.tx * TILE, by = o.ty * TILE;
      const foot = (o.ty + o.h) * TILE;
      const k = o.kind;
      if (k === 'tree' || k === 'pine' || k === 'fruit') {
        const sp = A.tree(k, A.season);
        R.push({ sy: foot - 6, draw: (c) => drawShaky(c, sp, bx + 16, foot - 6, -32, -74, o) });
      } else if (k === 'bigoak') {
        const sp = A.bigOak(A.season);
        R.push({ sy: foot - 4, draw: (c) => drawShaky(c, sp, bx + 32, foot - 4, -56, -118, o) });
      } else if (k === 'flower') {
        const sp = A.flower(o.var, A.season);
        R.push({ sy: by + 8, draw: (c) => c.drawImage(sp, bx, by, 32, 32) });
      } else if (k === 'rock') {
        const sp = A.rock(); R.push({ sy: foot - 6, draw: (c) => c.drawImage(sp, bx, by, 32, 32) });
      } else if (k === 'stall') {
        // 가판대는 앞뒤 두 장: 뒤(흙둔덕) → 두더지 → 앞(카운터·차양)
        const back = A.building('stall_back', A.season, night), fr = A.building('stall', A.season, night);
        R.push({ sy: by + 10, draw: (c) => c.drawImage(back, bx - 16, by - 44, 160, 140) });
        R.push({ sy: by + 80, draw: (c) => c.drawImage(fr, bx - 16, by - 44, 160, 140) });
      } else if (k === 'museum') {
        const sp = A.building(G.museum.isOpen() ? 'museum' : 'museum_closed', A.season, night);
        R.push({ sy: foot - 2, draw: (c) => c.drawImage(sp, bx - 16, by - 44, 160, 140) });
      } else if (k === 'post' || k === 'tent' || k === 'house') {
        const sp = A.building(k === 'tent' ? ['tent', 'cabin', 'smallhouse', 'bighouse', 'dreamhouse'][G.nest.st.stage] || 'tent' : k, A.season, night);
        R.push({ sy: foot - (k === 'stall' ? 30 : 2), draw: (c) => c.drawImage(sp, bx - 16, by - 44, 160, 140) });
      } else if (k === 'lantern') {
        const sp = A.prop(o.n <= G.lantern.count() ? 'lantern_lit' : 'lantern', A.season, night);
        R.push({ sy: foot - 4, draw: (c) => drawShaky(c, sp, bx + 16, foot - 4, -32, -76, o, 96, 80, 0.04) });
      } else if (k === 'lamp' || k === 'bench' || k === 'mailbox' || k === 'board' || k === 'signboard') {
        const sp = A.prop(k === 'mailbox' && G.mail.unread() ? 'mailbox_full' : k, A.season, night);
        // 그림판 왼쪽 = 부지 왼쪽 - 16u. 두 칸짜리는 흔들림 축만 가운데로
        const pw = k === 'bench' || k === 'board' ? 2 : 1;
        R.push({ sy: foot - 4, draw: (c) => drawShaky(c, sp, bx + pw * 16, foot - 4, -16 - pw * 16, -76, o, 96, 80, 0.04) });
      }
    }
  }
  function drawShaky(c, sp, fx, fy, ox, oy, o, w, h, amp = 0.08) {
    w = w || sp.uw; h = h || sp.uh;
    if (o.shakeT > 0) {
      c.save(); c.translate(fx, fy); c.rotate(Math.sin(o.shakeT * 40) * amp * o.shakeT); c.drawImage(sp, ox, oy, w, h); c.restore();
    } else c.drawImage(sp, fx + ox, fy + oy, w, h);
  }
  function drawDecals(t, rect) {
    const W = G.world, P = A.paint;
    // 금 간 땅 (화석 자리)
    for (const d of W.state.digs) {
      if (W.isTaken(d.id)) continue;
      const x = d.tx * TILE + 16, y = d.ty * TILE + 18;
      if (x < rect.x - 40 || x > rect.x + rect.w + 40 || y < rect.y - 40 || y > rect.y + rect.h + 40) continue;
      c_crack(x, y);
    }
    function c_crack(x, y) {
      ctx.strokeStyle = '#6b4f3a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x - 8, y - 4); ctx.lineTo(x - 2, y); ctx.lineTo(x - 5, y + 5); ctx.moveTo(x - 2, y); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x + 9, y + 4); ctx.moveTo(x + 6, y - 2); ctx.lineTo(x + 4, y - 8);
      ctx.stroke();
    }
    // 조개
    for (const s of W.state.shells) {
      if (W.isTaken(s.id)) continue;
      const x = s.tx * TILE + 16, y = s.ty * TILE + 18;
      if (x < rect.x - 40 || x > rect.x + rect.w + 40 || y < rect.y - 40 || y > rect.y + rect.h + 40) continue;
      const it = G.items.get(s.item);
      P.shadow(ctx, x, y + 4, 12, 0.18);
      ctx.save(); ctx.translate(x - 8, y - 9); ctx.scale(0.5, 0.5); A.drawIcon(ctx, s.item); ctx.restore();
      if (it.ref.ix === 5) { const k = (t * 0.7) % 1; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 4 + k * 8, 0, 6.28); ctx.stroke(); }
    }
  }
  function drawDrop(c, d, t) {
    A.paint.shadow(c, d.x, d.y + 2, 14, 0.2);
    c.save(); c.translate(d.x - 9, d.y - 18 - d.h + Math.sin(d.t * 3) * (d.h ? 0 : 0.8)); c.scale(0.56, 0.56); A.drawIcon(c, d.id); c.restore();
  }
  function drawPlayer(c, t) {
    pl.t = t;
    const a = pl;
    // 조랑말 타기: 말을 먼저 그리고 사람을 조금 올린다
    const pony = !G.house.inside && G.ranch.ridingAnimal();
    if (pony) { pony.face = pl.dir === 1 ? -1 : pl.dir === 3 ? 1 : (pony.face || 1); pony.moving = pl.moving; pony.x = pl.x; pony.y = pl.y + 2; G.ranch.drawAnimal(c, pony, t, true); }
    a.hop = pony ? 13 : 0;
    a.tool = pl.tool; a.swing = pl.swing > 0 ? Math.sin(pl.swing * Math.PI) : 0;
    if (pl.hold) { a.tool = 'hand'; }
    A.actor.draw(c, a, t);
    // 콩알: 머리 위
    const breath = Math.sin(t * 2.6) * 0.6;
    const bob = pl.moving ? Math.abs(Math.sin(pl.walk * Math.PI * 2)) * -2.2 : 0;
    A.kongal(c, pl.x + (pl.dir === 1 ? 2 : pl.dir === 3 ? -2 : 0), pl.y - 53 + bob + breath - (a.hop || 0), kg, t);
  }
  function drawHeld(t) {
    const k = 1 - pl.holdT / 1.2;
    const rise = G.ease.outBack(Math.min(1, k * 4));
    const y = pl.y - 60 - rise * 18;
    // 반짝 링
    const rk = (k * 2) % 1;
    ctx.strokeStyle = `rgba(255,240,160,${1 - rk})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pl.x, y, 10 + rk * 16, 0, 6.28); ctx.stroke();
    ctx.save(); ctx.translate(pl.x - 14, y - 14); ctx.scale(28 / 32, 28 / 32); A.drawIcon(ctx, pl.hold.id); ctx.restore();
  }
  function bubble(x, y, text, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = G.fontPx(11); const w = ctx.measureText(text).width + 14;
    A.paint.rrect(ctx, x - w / 2, y - 18, w, 18, 9, '#ffffff', A.C.line, 1.2);
    ctx.fillStyle = '#5b4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 9);
    ctx.restore();
  }
  function drawAim(t) {
    if (!GM.target || G.ui.dialogOpen() || pl.busy > 0) return;
    const tg = GM.target;
    let x, y;
    if (tg.kind === 'npc') { x = tg.ref.x; y = tg.ref.y + (tg.ref.behind ? 40 : 0); }
    else if (tg.kind === 'drop') { x = tg.ref.x; y = tg.ref.y; }
    else if (tg.kind === 'shell') { x = tg.ref.tx * TILE + 16; y = tg.ref.ty * TILE + 20; }
    else if (tg.kind === 'net' && tg.ref && tg.ref.fade > 0.5) { x = tg.ref.x; y = tg.ref.y; }
    else if (tg.kind === 'dig' && tg.ref) { x = tg.ref.tx * TILE + 16; y = tg.ref.ty * TILE + 20; }
    else if (tg.ref && tg.ref.tx !== undefined && tg.kind !== 'dig') { x = (tg.ref.tx + tg.ref.w / 2) * TILE; y = (tg.ref.ty + tg.ref.h) * TILE; }
    else return;
    const k = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + k * 0.35})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 10;
    ctx.beginPath(); ctx.ellipse(x, y + 2, 14 + k * 2, 6 + k, 0, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawLights(rect, camX, camY, dark, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const m = G.world.map, PX = cam.PX;
    const put = (x, y, r, col, a) => {
      const sx = (x - camX) * PX, sy = (y - camY) * PX;
      if (sx < -r * PX || sy < -r * PX || sx > cv.width + r * PX || sy > cv.height + r * PX) return;
      const sp = A.light(r, col);
      ctx.globalAlpha = a; ctx.drawImage(sp, sx - r * PX, sy - r * PX);
    };
    const a = Math.min(1, (dark - 0.25) * 2.5);
    for (const o of m.objs) {
      if (o.kind === 'lamp') put(o.tx * TILE + 16, o.ty * TILE - 22, 70, 'rgba(255,214,140,0.55)', a * (0.92 + Math.sin(t * 3 + o.i) * 0.04));
      else if (o.kind === 'lantern' && o.n <= G.lantern.count()) put(o.tx * TILE + 16, o.ty * TILE - 26, 90, 'rgba(255,226,140,0.6)', a * (0.9 + Math.sin(t * 2 + o.n) * 0.08));
      else if (o.kind === 'house' || o.kind === 'post') { put(o.tx * TILE + 30, o.ty * TILE + 24, 34, 'rgba(255,220,150,0.5)', a); put(o.tx * TILE + 98, o.ty * TILE + 24, 34, 'rgba(255,220,150,0.5)', a); }
      else if (o.kind === 'tent') put(o.tx * TILE + 48, o.ty * TILE + 40, 40, 'rgba(255,210,140,0.4)', a);
    }
    // 반딧불이·별빛나방
    for (const b of G.eco.bugs) if (b.sp.tpl === 'firefly' || b.sp.tpl === 'moth') put(b.x, b.y - (b.alt || 0), 16, 'rgba(220,255,140,0.6)', a * (0.6 + 0.4 * Math.sin(t * 3 + b.seed)));
    // 플레이어 주변 은은한 빛
    put(pl.x, pl.y - 20, 60, 'rgba(255,240,220,0.18)', a);
    ctx.restore();
  }

  // ---------- 씬: 마을 ----------
  G.scene.define('town', {
    world: true,
    enter() { G.ui.hud(true); G.ui.refreshHud(); },
    update(dt) {
      if (G.scene.top() !== this) return; // 실내에 있을 때 마을 시뮬은 쉰다(시간은 계속 흐름)
      const t = GM.t;
      updatePlayer(dt); updateKongal(dt, t); updateFx(dt);
      G.npc.update(dt, pl, t);
      G.eco.update(dt, pl);
      G.events.updateMeteors(dt, cam.rect());
      G.events.updateRace(dt);
      if (!(G.net && G.net.guest)) G.ranch.update(dt, t);
      if (G.net) G.net.update(dt);
      G.ui.updateDialog(dt);
      cam.follow(pl.x, pl.y, dt);
      GM.target = (G.ui.dialogOpen() || G.ui.open) ? null : findTarget();
      if (GM.target) G.ui.setAction(GM.target.icon, GM.target.label, GM.target.name);
      G.ui.drawStick(G.input.stick);
      if (G.audio.music) G.audio.music.update();
    },
    draw() { render(GM.t); },
    input(ev) {
      if (G.ui.modalInput(ev)) return true;
      if (G.ui.dialogInput(ev)) return true;
      if (ev.type === 'act') { doAction(); return true; }
      if (ev.type === 'tool') { pl.nextTool(); return true; }
      if (ev.type === 'menu') { G.ui.notebook(); return true; }
      if (ev.type === 'map') { G.map.open(); return true; }
      if (ev.type === 'chat') { G.ui.chat(true); return true; }
      if (ev.type === 'tapWorld' && ev.mouse) {
        // 마우스 클릭: 클릭한 쪽을 바라보고 행동
        const w = cam.toWorld(ev.cx, ev.cy);
        const dx = w.x - pl.x, dy = w.y - (pl.y - 10);
        if (Math.hypot(dx, dy) < TILE * 3) { pl.dir = G.npc.faceDir(dx, dy); doAction(); }
        return true;
      }
      return false;
    },
  });

  // ---------- 씬: 타이틀 ----------
  let titleEl = null;
  G.scene.define('title', {
    enter(args) {
      G.ui.hud(false);
      titleEl = document.createElement('div'); titleEl.className = 'title';
      titleEl.innerHTML = `<div class="logo"><span>몽글숲</span><small>이야기</small></div><div class="tap">${args && args.fresh ? '계정 없이 새로 시작' : '화면을 톡 눌러 주세요'}</div><div class="ver">${G.VERSION}</div>`;
      G.ui.root.append(titleEl);
      let leaving = false;
      const go = () => {
        if (!titleEl || leaving) return; leaving = true;
        removeEventListener('keydown', keyGo);
        G.audio.unlock();
        setTimeout(() => G.audio.sfx('chime'), 60);
        titleEl.classList.add('out');
        setTimeout(() => { titleEl.remove(); titleEl = null; args && args.fresh ? G.scene.replace('create') : startTown(); }, 500);
      };
      const keyGo = (e) => { if (!G.ui.open && !['INPUT', 'BUTTON'].includes(document.activeElement && document.activeElement.tagName)) go(e); };
      // 화면 아무 곳이나 톡 하면 시작 (계정 버튼은 자기 클릭을 막아 둔다)
      titleEl.addEventListener('click', (e) => { if (!e.target.closest('.title-account')) go(e); }); addEventListener('keydown', keyGo);
      if (args && args.fresh && G.cloud.view().configured) {
        const actions = document.createElement('div'); actions.className = 'title-account';
        const login = document.createElement('button'); login.className = 'btn ghost'; login.textContent = '기존 계정으로 이어하기';
        const signup = document.createElement('button'); signup.className = 'btn'; signup.textContent = '회원가입하고 시작';
        login.onclick = (e) => { e.stopPropagation(); G.audio.unlock(); G.ui.account('login', () => go()); };
        signup.onclick = (e) => { e.stopPropagation(); G.audio.unlock(); G.ui.account('signup', (mode) => { if (mode === 'signup') go(); }); };
        actions.append(login, signup); titleEl.insertBefore(actions, titleEl.querySelector('.ver'));
      }
    },
    update(dt) { GM.titleT = (GM.titleT || 0) + dt; },
    draw() { drawTitleBg(GM.t); },
  });
  function drawTitleBg(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = cv.width, h = cv.height;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe7ff'); g.addColorStop(1, '#ffe9f2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 큰솜이 언덕 (숨 쉬는 구름양)
    const s = Math.min(w, h) / 360, br = Math.sin(t * 0.8) * 0.02;
    ctx.save(); ctx.translate(w / 2, h * 0.92); ctx.scale(s, s * (1 + br));
    ctx.fillStyle = '#ffffff';
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.arc(k * 48, -60 - Math.cos(k * 0.5) * 50, 70, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = '#a5d873'; ctx.beginPath(); ctx.ellipse(0, -90, 170, 40, 0, Math.PI, 0); ctx.fill();
    for (let k = -3; k <= 3; k++) { ctx.fillStyle = k % 2 ? '#6db552' : '#8fd16a'; ctx.beginPath(); ctx.arc(k * 40, -128 - Math.abs(k) * -4, 18, 0, 6.28); ctx.fill(); ctx.fillStyle = '#a7724a'; ctx.fillRect(k * 40 - 2, -112, 4, 14); }
    ctx.restore();
    // 떠다니는 구름
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let k = 0; k < 5; k++) { const x = ((t * (8 + k * 3) + k * 220) % (w + 300)) - 150, y = h * (0.12 + k * 0.08); ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 18 * s, 0, 0, 6.28); ctx.ellipse(x + 30 * s, y - 10 * s, 30 * s, 16 * s, 0, 0, 6.28); ctx.fill(); }
  }

  // ---------- 씬: 캐릭터 만들기 + 지도 선택 ----------
  let createEl = null;
  G.scene.define('create', {
    enter() {
      const look = A.LOOK.def();
      createEl = document.createElement('div'); createEl.className = 'create';
      createEl.innerHTML = '<h2>어떤 우편지기인가요?</h2>';
      const wrap = document.createElement('div'); wrap.className = 'cwrap';
      const pv = G.ui.lookPreview(look, 190);
      const left = document.createElement('div'); left.className = 'cleft'; left.append(pv.el);
      const nameIn = document.createElement('input'); nameIn.placeholder = '이름 (최대 8자)'; nameIn.maxLength = 8; nameIn.value = pl.name || '';
      const townIn = document.createElement('input'); townIn.placeholder = '마을 이름 (최대 8자)'; townIn.maxLength = 8; townIn.value = '몽글숲';
      const ins = document.createElement('div'); ins.className = 'cparts'; ins.append(nameIn, townIn); left.append(ins);
      const right = document.createElement('div'); right.className = 'cright';
      right.append(G.ui.lookEditor(look, () => pv.poke()));
      const note = document.createElement('div'); note.className = 'muted small'; note.textContent = '이름과 모습은 나중에 잎첩 「🪞 나」에서 언제든 바꿀 수 있어요.';
      right.append(note);
      wrap.append(left, right); createEl.append(wrap);
      const next = document.createElement('button'); next.className = 'btn big'; next.textContent = '다음: 지도 고르기';
      createEl.append(next);
      G.ui.root.append(createEl);
      const raf = { stop: () => pv.stop() };
      next.onclick = () => {
        const name = nameIn.value.trim(), town = townIn.value.trim() || '몽글숲';
        if (!name) { nameIn.focus(); nameIn.classList.add('shake'); setTimeout(() => nameIn.classList.remove('shake'), 400); G.audio.sfx('error'); return; }
        raf.stop();
        pl.look = Object.assign({}, look); pl.name = name; pl.town = town;
        G.audio.sfx('chime');
        chooseMap(createEl);
      };
    },
    exit() { if (createEl) { createEl.remove(); createEl = null; } },
    draw() { drawTitleBg(GM.t); },
  });
  function chooseMap(el) {
    el.innerHTML = '<h2>어느 마을로 이사 갈까요?</h2><div class="muted">지도 세 장 중 하나를 골라 주세요. (강·연못·광장 위치가 달라요)</div>';
    const row = document.createElement('div'); row.className = 'maps';
    const base = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    for (let k = 0; k < 3; k++) {
      const m = G.world.generateValid((base + k * 104729) >>> 0);
      const c = document.createElement('canvas'); c.width = m.w * 2; c.height = (m.h - 20) * 2;
      const g = c.getContext('2d');
      const col = ['#a5d873', '#e2c99d', '#f5e2b4', '#86d7ea', '#5cbde2', '#94c968', '#c29a74', '#c98e5a', '#ecdcbc', '#c9d3da'];
      for (let y = 20; y < m.h; y++) for (let x = 0; x < m.w; x++) { g.fillStyle = col[m.terr[y * m.w + x]]; g.fillRect(x * 2, (y - 20) * 2, 2, 2); }
      for (const o of m.objs) {
        if (o.ty < 20) continue;
        g.fillStyle = o.kind === 'tree' || o.kind === 'pine' || o.kind === 'fruit' ? '#5aa548' : o.kind === 'flower' ? '#ff9fbf' : o.kind === 'rock' ? '#9aa5b0' : o.kind === 'bigoak' ? '#3f8a3a' : ['stall', 'post', 'tent', 'house'].includes(o.kind) ? '#ff7a6a' : null;
        if (g.fillStyle && o.kind !== 'lamp') g.fillRect(o.tx * 2, (o.ty - 20) * 2, o.w * 2, o.h * 2);
      }
      const b = document.createElement('button'); b.className = 'mapcard'; b.append(c);
      const lbl = document.createElement('span'); lbl.textContent = ['첫 번째 지도', '두 번째 지도', '세 번째 지도'][k]; b.append(lbl);
      b.onclick = () => { G.audio.sfx('stamp'); newGame(m.seed); };
      row.append(b);
    }
    el.append(row);
  }
  function newGame(seed) {
    meta.seed = seed; meta.created = G.time.day();
    G.rng.setSeed(seed);
    G.world.build(seed);
    G.world.state.drops = [];
    const tent = G.world.map.plots.tent;
    pl.x = (tent.door.x) * TILE + 16; pl.y = (tent.door.y + 1) * TILE + 10; pl.dir = 0;
    pl.tools = ['hand']; pl.tool = 'hand';
    G.save.now('new');
    G.scene.replace('town');
    afterWorld(true);
  }
  function startTown() {
    G.rng.setSeed(meta.seed);
    G.world.build(meta.seed);
    if (!pl.x || !G.world.canStand(pl.x, pl.y, pl.r)) { const tent = G.world.map.plots.tent; pl.x = tent.door.x * TILE + 16; pl.y = (tent.door.y + 1) * TILE + 10; }
    G.scene.replace('town');
    afterWorld(false);
  }
  async function afterWorld(fresh) {
    A.season = G.time.season();
    A.clearCache();
    G.world.refresh(G.time.day());
    if (G.nest.tick(G.time.day())) setTimeout(() => G.ui.toast(`${G.nest.cur().name} 공사가 끝났어요! 집이 넓어졌어요.`, { icon: '🏡', ms: 4000 }), 1500);
    G.requests.daily(G.time.day());
    G.tide.refresh(G.time.day());
    G.farm.ensurePlots(); G.farm.tick(G.time.day()); G.ranch.tick(G.time.day());
    if (!fresh) awayGrow();
    GM.drops = (G.world.state.drops || []).map((d) => Object.assign({ vy: 0, h: 0, t: 0 }, d));
    G.npc.init();
    G.eco.clear();
    cam.follow(pl.x, pl.y, 0, true);
    G.ui.refreshHud();
    GM.started = true;
    if (!G.quest.st.intro) {
      // 보리 할멈이 텐트 앞으로 마중 나온다
      const b = G.npc.get('bori');
      b.homeX = b.x; b.homeY = b.y;
      b.x = pl.x + 34; b.y = pl.y + 4; b.dir = 1;
      pl.dir = 3;
      await new Promise((r) => setTimeout(r, 700));
      G.npc.pop(b, 'heart');
      await GM.introScript();
      b.x = b.homeX; b.y = b.homeY; b.dir = 0;
      G.ui.hint(G.input.isTouch() ? '왼쪽 화면을 끌어서 걷기 · 노란 버튼으로 행동 · 🗺️ 지도' : '방향키/WASD 걷기 · Space 행동 · M 지도 · Tab 잎첩');
      setTimeout(() => G.ui.hint(''), 6000);
    } else if (!fresh) {
      const k = G.time.st.playDays;
      G.ui.toast(`어서 와요, ${pl.name}! ${G.time.label().date}`, { icon: '🍃' });
      setTimeout(() => G.mail.ritual(), 900);
      setTimeout(() => G.events.checkFirstSnow(), 4000);
      if (G.npc.get('ddalang')) { /* 아침 의식(꿈·우체통)은 M-b */ }
      void k;
    }
  }

  // 자리 비운 동안 자란 것 반영 + 알림
  function awayGrow() {
    if (G.net && G.net.guest) { G.time.st.realAt = Date.now(); return; }
    const mins = G.time.offlineCredit(); if (mins < 2) return;
    const crops = G.farm.away(mins), animals = G.ranch.away(mins);
    if (crops || animals) G.ui.toast(`자리 비운 동안 ${crops ? '텃밭 작물이 자랐어요' : ''}${crops && animals ? ' · ' : ''}${animals ? '동물들이 선물을 준비했어요' : ''}!`, { icon: '🌱', ms: 3500 });
  }
  GM.awayGrow = awayGrow;

  // ---------- 이벤트 연결 ----------
  G.on('time:day', (p) => {
    if (!GM.started) return;
    G.world.refresh(p.day);
    A.season = G.time.season(); A.clearCache();
    G.ui.toast('새 아침! 몽글바람이 새 물건을 실어 왔어요. 나무·바위·상점·부탁이 다시 채워졌어요.', { icon: '🌤️', ms: 3600 });
    G.save.mark('day');
  });
  G.on('quest:done', (p) => { G.ui.toast(`할 일 완료: ${p.text}`, { icon: '✅' }); G.audio.sfx('chime'); fxSparkle(pl.x, pl.y - 50, 8); });
  G.on('stamp:earn', (p) => { setTimeout(async () => { G.audio.sfx('stamp'); kongalReact('jump'); await G.ui.say([{ who: 'kongal', text: '꼬물꼬물! (오늘 멋졌어!)' }, { who: 'sys', text: p.id === 'daily' ? '오늘의 부탁을 모두 들어줬어요! 반짝 도장을 하나 받았어요.' : '반짝 도장을 하나 받았어요! 내일은 박물관이 문을 열고, 새 이웃도 온대요.' }]); }, 1400); });
  G.on('dex:new', (p) => { if (p.newSp) fxSparkle(pl.x, pl.y - 60, 10, '#ffe066'); });
  G.on('eco:miss', () => { kongalSay(u.pick(G.lines('kongal', 'miss'), Math.random()).text); G.audio.sfx('miss'); });
  G.on('weather:change', () => G.audio && G.audio.ambient && G.audio.ambient(G.weather.now().type));
  G.on('time:hour', () => G.audio.ambient && G.audio.ambient(G.weather.now().type));
  G.on('cam:px', () => A.clearCache());

  Object.assign(GM, { updatePlayer: (dt) => updatePlayer(dt), updateKongal: (dt, t) => updateKongal(dt, t), updateFx: (dt) => updateFx(dt), drawPlayer: (c, t) => drawPlayer(c, t), bubble: (x, y, s, a) => bubble(x, y, s, a), drawHeld: (t) => drawHeld(t), kg, pl, kongalSay: (s) => kongalSay(s), kongalReact: (k) => kongalReact(k), canvas: () => cv, ctx2d: () => ctx });
  GM.resize = () => { cam.resize(); if (GM.started) cam.follow(pl.x, pl.y, 0, true); };

  // ---------- 부팅 ----------
  G.boot = () => {
    cv = document.getElementById('cv'); ctx = cv.getContext('2d', { alpha: false });
    G.dev = /[?&]dev=1/.test(location.search);
    const res = G.save.load();
    if (res.corrupt) console.warn('세이브 손상 — 새로 시작');
    G.time.init();
    G.ui.init();
    G.cloud.init();
    G.input.init(cv);
    cam.resize();
    addEventListener('resize', () => GM.resize());
    // 탭 숨김: 동기 저장 + 루프·오디오 정지
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (GM.started) G.save.now('hide'); G.cloud.flush(); G.loop.stop(); G.audio.suspend(); }
      else { if (GM.started) awayGrow(); G.loop.start(); G.audio.resume(); G.time.tick(true); }
    });
    addEventListener('pagehide', () => { if (G.net) G.net.beforeUnload(); if (GM.started) G.save.now('pagehide'); G.cloud.flush(); });
    setInterval(() => { if (GM.started && G.save.isDirty()) G.save.now('interval'); }, 60000);
    G.loop.add('time', (dt) => { GM.t += dt; if (GM.started && !G.save.paused) { G.time.advance(dt); G.time.st.realAt = Date.now(); } G.time.tick(); });
    G.loop.add('input', (dt) => G.input.update(dt));
    G.loop.add('sim', (dt) => G.scene.update(dt));
    G.loop.add('draw', () => G.scene.draw(ctx));
    const fresh = res.fresh || !meta.seed;
    G.scene.push('title', { fresh });
    G.loop.start();
    if (G.dev && G.devpanel) G.devpanel();
    registerSW();
    // 둥근 폰트 로드 후 글자가 들어간 그림 캐시를 다시 굽는다
    if (document.fonts && document.fonts.load) document.fonts.load('16px Jua').then(() => { G.fontReady = true; G.art.clearCache(); G.art.iconReset && G.art.iconReset(); }).catch(() => {});
  };
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:' || G.dev) return;
    // 새 버전이 들어오면: 저장하고 바로 새로고침 (예전엔 앱을 완전히 닫아야 적용돼서 업데이트가 안 보였다)
    const hadCtrl = !!navigator.serviceWorker.controller; let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadCtrl || reloading) return; reloading = true;
      if (GM.started) { G.save.now('update'); G.cloud.flush(); }
      G.ui.toast('새 버전으로 바꾸는 중이에요…', { icon: '✨', ms: 2000 });
      setTimeout(() => location.reload(), GM.started ? 900 : 200);
    });
    // 오래 켜 둔 경우에도 새 버전을 확인
    setInterval(() => navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}), 10 * 60000);
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { /* skipWaiting → controllerchange에서 처리 */ });
      });
    }).catch(() => { /* 오프라인 미지원 환경 */ });
  }

  G.modules.add('game');
})(globalThis.G);
