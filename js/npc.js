// 주민·NPC: 상주 주민(딸랑·소금·라임) 일과·대화·친밀도, 보리 할멈(우체국), 토닥·토실(가판대)
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const list = [];

  // ---------- 상주 주민 정의 (r2-재미 1-4) ----------
  // sched: [시작, 끝, 장소] — 장소: home·plaza·oak·pond·river·beach·garden. 목록 밖 시간은 잠
  const VILLAGERS = {
    ddalang: { name: '딸랑', species: 'rabbit', pers: '햇살', catch: '랄랄', bday: '03-21', plot: 'house1', look: { body: '#fff6f2' }, heart: '#ff8fb1',
      sched: [[6, 9, 'home'], [9, 13, 'plaza'], [13, 17, 'oak'], [17, 22, 'plaza']], tool: null },
    sogeum: { name: '소금', species: 'otter', pers: '엉뚱', catch: '퐁당', bday: '07-14', plot: 'house2', look: { scarf: '#7fc6e8' }, heart: '#6fa8c9',
      sched: [[7, 11, 'river'], [11, 15, 'pond'], [15, 20, 'beach'], [20, 23, 'home']], tool: 'rod' },
    lime: { name: '라임', species: 'cat', pers: '새침', catch: '흥칫', bday: '08-30', plot: 'house3', look: { scarf: '#b8e68f' }, heart: '#9bc94a',
      sched: [[8, 12, 'garden'], [12, 16, 'plaza'], [16, 20, 'oak'], [20, 24, 'garden']], tool: 'net' },
  };
  const LV = [0, 5, 15, 35, 70]; // 하트 1~4 문턱
  const defSt = () => {
    const o = { bori: { seen: 0 } };
    for (const id of Object.keys(VILLAGERS)) o[id] = { fs: 0, met: false, toolDay: -1, seen: 0, greetDay: -1, lvl: 0 };
    return o;
  };
  const st = defSt();

  function mk(id, name, species, look, x, y, extra) {
    return Object.assign({ id, name, kind: 'npc', species, look, x, y, dir: 0, r: 9, walk: 0, moving: false, seed: Math.random() * 10, tx: x, ty: y, wait: 0, emote: null, emoteT: 0, near: 0, hop: 0, vis: true, static: false }, extra || {});
  }

  const N = G.npc = {
    list, st, VILLAGERS,
    get: (id) => list.find((n) => n.id === id),
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
      if (pl.museum2) { const mp = door('museum2', 1.4, 0.4); list.push(mk('slowpoke', '느림보 박사', 'tortoise', {}, mp.x, mp.y, { static: true, visFn: () => G.museum.isOpen() })); }
      const spots = findSpots(m);
      for (const [id, v] of Object.entries(VILLAGERS)) {
        if (!pl[v.plot]) continue;
        const home = door(v.plot, 0, 1);
        const n = mk(id, v.name, v.species, v.look, home.x, home.y, { home, villager: true });
        n.spots = Object.assign({ home }, spots);
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
      const where = slot[2], p = n.spots[where] || n.spots.home;
      return { act: where, ax: p.x, ay: p.y, r: where === 'home' || where === 'garden' ? 2.2 : where === 'plaza' ? 4 : 2.6 };
    },
    update(dt, p, t) {
      for (const n of list) {
        if (n.hopT > 0) { n.hopT -= dt; n.hop = Math.sin((1 - n.hopT / 0.35) * Math.PI) * 6; } else n.hop = 0;
        if (n.emote) { n.emoteT += dt; if (n.emoteT > 1.6) n.emote = null; }
        const d = u.dist(n.x, n.y, p.x, p.y);
        const act = N.activity(n);
        n.vis = n.visFn ? n.visFn() : !(act && act.act === 'sleep');
        if (!n.vis) continue;
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
        if (len < 4 || n.stuck > 1.2) {
          n.stuck = 0; n.wait = 1 + Math.random() * 3;
          for (let k = 0; k < 8; k++) {
            const a = Math.random() * 6.28, r = Math.random() * act.r * TILE;
            const x = act.ax + Math.cos(a) * r, y = act.ay + Math.sin(a) * r;
            if (G.world.canStand(x, y, n.r)) { n.tx = x; n.ty = y; break; }
          }
          // 활동 장소가 바뀌어 멀어졌으면 곧장 출발. 너무 멀면(화면 밖) 순간이동으로 따라잡는다
          const far = u.dist(n.x, n.y, act.ax, act.ay);
          if (far > act.r * TILE * 1.6) {
            n.wait = 0; n.tx = act.ax; n.ty = act.ay;
            if (d > TILE * 14 && far > TILE * 6) { const q = standNear(act.ax, act.ay, n.r); if (q) { n.x = q.x; n.y = q.y; } }
          }
        } else {
          const sp = 2.6 * TILE * dt;
          const ox = n.x, oy = n.y;
          G.world.move(n, dx / len * sp, dy / len * sp);
          const moved = Math.hypot(n.x - ox, n.y - oy);
          if (moved < sp * 0.3) n.stuck = (n.stuck || 0) + dt; else n.stuck = 0;
          // 오래 막히면(강 건너편 등) 조용히 장소로 옮긴다
          if (n.stuck > 1.1 && d > TILE * 10) { const q = standNear(act.ax, act.ay, n.r); if (q) { n.x = q.x; n.y = q.y; n.stuck = 0; } }
          n.moving = moved > 0.01; n.dir = faceDir(dx, dy);
          n.walk = (n.walk + dt / 0.5) % 1;
        }
      }
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
          G.ui.toast(G.input.isTouch() ? '오른쪽 아래 도구 버튼으로 도구를 바꿔요.' : 'Q 키나 도구 버튼으로 도구를 바꿔요.', { icon: G.TOOLS[v.tool].icon, ms: 3000 });
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
  G.data.add('lines', T);

  G.modules.add('npc');
})(globalThis.G);
