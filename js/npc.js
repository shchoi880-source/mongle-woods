// 주민·NPC: 딸랑(일과 3활동·대사·감정 팝), 보리 할멈(우체국), 토닥·토실(가판대)
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const list = [];
  const st = { ddalang: { fs: 0, lastTalk: -1, toolDay: -1, seen: 0, greetDay: -1 }, bori: { seen: 0 } };

  function mk(id, name, species, look, x, y, extra) {
    return Object.assign({ id, name, kind: 'npc', species, look, x, y, dir: 0, r: 9, walk: 0, moving: false, seed: Math.random() * 10, tx: x, ty: y, wait: 0, emote: null, emoteT: 0, near: 0, hop: 0, vis: true, static: false }, extra || {});
  }

  const N = G.npc = {
    list, st,
    get: (id) => list.find((n) => n.id === id),
    init() {
      list.length = 0;
      const m = G.world.map, pl = m.plots;
      const door = (k, dx = 0, dy = 1) => ({ x: (pl[k].door.x + dx) * TILE + 16, y: (pl[k].door.y + dy) * TILE + 8 });
      const sd = pl.shop, pd = pl.post;
      // 토닥·토실: 가판대 카운터 뒤 (부지 안쪽 위)
      list.push(mk('todak', '토닥', 'mole', { band: '#ff7a7a', apron: '#fff2c9' }, (sd.x + 1.2) * TILE, (sd.y + 2.25) * TILE, { static: true, behind: true }));
      list.push(mk('tosil', '토실', 'mole', { ribbon: '#ffb3cf', apron: '#e8f6ff' }, (sd.x + 2.8) * TILE, (sd.y + 2.25) * TILE, { static: true, behind: true }));
      // 보리 할멈: 우체국 문 옆
      const bp = door('post', 1.4, 0.4);
      list.push(mk('bori', '보리 할멈', 'hedgehog', {}, bp.x, bp.y, { static: true }));
      // 딸랑
      const dp = door('house1', 0, 1);
      list.push(mk('ddalang', '딸랑', 'rabbit', { body: '#fff6f2' }, dp.x, dp.y, { home: dp }));
    },
    // 일과: 시간대별 장소
    activity(n) {
      if (n.id !== 'ddalang') return null;
      const h = G.time.hour(), m = G.world.map;
      const first = G.time.st.playDays <= 1;
      if ((h >= 22 || h < 6) && !first) return { act: 'sleep' };
      if (h < 9) return { act: 'home', ax: n.home.x, ay: n.home.y, r: 2.2 };
      if (h < 13 || (h >= 17 && h < 22)) return { act: 'plaza', ax: m.plaza.x * TILE + 16, ay: (m.plaza.y + 2) * TILE + 16, r: 4 };
      return { act: 'oak', ax: (m.plots.oak.x + 1) * TILE, ay: (m.plots.oak.y + 3) * TILE, r: 3 };
    },
    update(dt, p, t) {
      for (const n of list) {
        n.hop = Math.max(0, n.hop - dt * 40) * (n.hopV ? 1 : 1);
        if (n.hopT > 0) { n.hopT -= dt; n.hop = Math.sin((1 - n.hopT / 0.35) * Math.PI) * 6; } else n.hop = 0;
        if (n.emote) { n.emoteT += dt; if (n.emoteT > 1.6) n.emote = null; }
        const d = u.dist(n.x, n.y, p.x, p.y);
        const act = N.activity(n);
        n.vis = !(act && act.act === 'sleep');
        if (!n.vis) continue;
        // 플레이어가 1.5타일 안: 바라보기, 3초 머물면 감정 팝 + 깡충
        if (d < TILE * 1.6) {
          if (n.near === 0) G.art.actor.forceBlink(n, t);
          n.near += dt;
          if (!n.talking) n.dir = faceDir(p.x - n.x, p.y - n.y, n.behind);
          if (n.near > 3 && !n.greeted) {
            n.greeted = true;
            const tool = G.player.tool;
            N.pop(n, tool === 'net' && n.id === 'ddalang' ? 'q' : n.id === 'kongal' ? 'note' : 'heart');
          }
          n.moving = false;
          continue;
        } else { n.near = 0; if (d > TILE * 4) n.greeted = false; }
        if (n.static || n.talking) { n.moving = false; continue; }
        // 배회
        if (act) {
          if (n.wait > 0) { n.wait -= dt; n.moving = false; }
          else {
            const dx = n.tx - n.x, dy = n.ty - n.y, len = Math.hypot(dx, dy);
            if (len < 4 || n.stuck > 1.2) {
              n.stuck = 0; n.wait = 1 + Math.random() * 3;
              // 새 목표: 활동 지점 주변
              for (let k = 0; k < 8; k++) {
                const a = Math.random() * 6.28, r = Math.random() * act.r * TILE;
                const x = act.ax + Math.cos(a) * r, y = act.ay + Math.sin(a) * r;
                if (G.world.canStand(x, y, n.r)) { n.tx = x; n.ty = y; break; }
              }
              // 너무 멀면(활동 장소 이동) 곧장 출발
              if (u.dist(n.x, n.y, act.ax, act.ay) > act.r * TILE * 1.6) { n.wait = 0; n.tx = act.ax; n.ty = act.ay; }
            } else {
              const sp = 2.6 * TILE * dt;
              const ox = n.x, oy = n.y;
              G.world.move(n, dx / len * sp, dy / len * sp);
              const moved = Math.hypot(n.x - ox, n.y - oy);
              if (moved < sp * 0.3) n.stuck = (n.stuck || 0) + dt; else n.stuck = 0;
              n.moving = moved > 0.01; n.dir = faceDir(dx, dy);
              n.walk = (n.walk + dt / 0.5) % 1;
            }
          }
        }
      }
    },
    pop(n, kind) { n.emote = kind; n.emoteT = 0; n.hopT = 0.35; G.audio.sfx('pop'); },
    near(x, y, r) {
      let best = null, bd = r;
      for (const n of list) { if (!n.vis) continue; const d = u.dist(n.x, n.y + (n.behind ? 40 : 0), x, y); if (d < bd) { bd = d; best = n; } }
      return best;
    },
    // ---------- 대화 ----------
    async talk(n) {
      const p = G.player, ui = G.ui;
      n.talking = true; n.dir = faceDir(p.x - n.x, p.y - n.y, n.behind);
      G.art.actor.forceBlink(n, G.game.t);
      G.emit('npc:talk', { id: n.id });
      try {
        if (n.id === 'todak' || n.id === 'tosil') { await G.game.openShop(); return; }
        if (n.id === 'bori') { await N.boriTalk(); return; }
        if (n.id === 'ddalang') { await N.ddalangTalk(n); return; }
      } finally { n.talking = false; }
    },
    async boriTalk() {
      const q = G.quest.st;
      if (!q.letterGiven) { await G.game.introScript(); return; }
      if (q.letterGiven && !q.letterDone && !G.inv.has('letter_ddalang')) {
        // 가방이 꽉 차서 편지를 못 받았던 경우 다시 준다
        if (G.inv.add('letter_ddalang', 1) === 0) { await G.ui.say([{ who: 'bori', text: '자, 편지 여기 있다. 이번엔 잃어버리지 말거라. 콕!' }]); return; }
      }
      const lines = G.lines('bori', 'chat');
      const l = lines[st.bori.seen++ % lines.length];
      await G.ui.say([{ who: 'bori', text: l.text }]);
      G.save.mark('talk');
    },
    async ddalangTalk(n) {
      const s = st.ddalang, day = G.time.day(), name = G.player.name;
      const say = (text, mood) => ({ who: 'ddalang', text: G.str(text, { name }), mood });
      const seq = [];
      // 편지 배달
      if (G.inv.has('letter_ddalang')) {
        G.inv.removeId('letter_ddalang', 1);
        seq.push(say(G.lines('ddalang', 'letter')[0].text));
        s.fs += 5; G.quest.st.letterDone = true;
        N.pop(n, 'heart');
        await G.ui.say(seq);
        G.emit('quest:letter', {});
        G.emit('npc:fs', { id: 'ddalang', delta: 5 });
        G.save.mark('talk');
        return;
      }
      // 첫 대화: 시간대 인사
      if (s.greetDay !== day) {
        s.greetDay = day;
        const h = G.time.hour();
        const sit = h >= 22 || h < 5 ? 'greet_night' : h < 11 ? 'greet_morning' : h < 17 ? 'greet_day' : 'greet_evening';
        seq.push(say(u.pick(G.lines('ddalang', sit), Math.random()).text));
        s.fs += 1;
      } else if (s.toolDay !== day && (G.player.tool === 'net' || G.player.tool === 'rod')) {
        s.toolDay = day;
        seq.push(say(G.lines('ddalang', G.player.tool)[0].text));
      } else {
        // 잡담: 순서대로 돌며 같은 말 반복을 늦춘다
        const chat = G.lines('ddalang', 'chat');
        if (s.fs >= 8 && s.seen % 7 === 6) seq.push(say(G.lines('ddalang', 'hearts')[0].text));
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

  G.save.section('npc', {
    v: 1, def: () => ({ ddalang: { fs: 0, lastTalk: -1, toolDay: -1, seen: 0, greetDay: -1 }, bori: { seen: 0 } }),
    get: () => JSON.parse(JSON.stringify(st)),
    set: (d) => { Object.assign(st.ddalang, d.ddalang || {}); Object.assign(st.bori, d.bori || {}); },
  });

  G.modules.add('npc');
})(globalThis.G);
