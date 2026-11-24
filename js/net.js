// 멀티플레이 1차 (5차 회의): 친구 코드로 친구 마을에 놀러 가기 + 실시간 이동 + 채팅(말풍선·감정) + 선물
// Firebase RTDB: codes/{코드}=uid · rooms/{주인uid}/{info, players/{uid}, chat/{id}, gifts/{받는uid}/{id}, kick/{uid}}
// 원칙: 다른 사람에게는 캐릭터 이름·모습만 보인다(아이디·이메일 없음). 친구 마을에서는 구경·채집만(나무·땅·건물은 주인만)
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const SEND_HZ = 4, CHAT_MAX = 60, CHAT_GAP = 1200;
  const BAD = ['시발', '씨발', '씨바', '시바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '개새', '새끼', '좆', '지랄', '니애미', '느금', '염병', '닥쳐', 'fuck', 'shit', 'bitch'];
  const EMOTES = [['👋', '안녕!'], ['💗', '좋아!'], ['😂', 'ㅋㅋㅋ'], ['🎣', '낚시 가자!'], ['🦋', '벌레 잡자!'], ['🎁', '선물이야!'], ['👍', '최고!'], ['😴', '졸려…']];

  // 저장(내 세이브): 만난 친구 목록(코드·캐릭터 이름)만
  const st = { friends: [] };
  G.save.section('net', { v: 1, def: () => ({ friends: [] }), get: () => ({ friends: st.friends.slice(0, 20) }), set: (d) => { st.friends = Array.isArray(d.friends) ? d.friends.filter((f) => f && /^[A-Z2-9]{6}$/.test(f.code)).slice(0, 20) : []; } });

  const N = G.net = {
    st, EMOTES,
    mode: 'off',            // off | host | guest
    room: '', code: '', hostName: '', hostTown: '',
    others: {},             // uid → { name, look, x, y, tx, ty, dir, moving, tool, bubble, bubbleT }
    chat: [],               // [{id, uid, name, text, t}]
    get active() { return N.mode !== 'off'; },
    get guest() { return N.mode === 'guest'; },
  };
  let F = null, offs = [], sendT = 0, lastSent = '', lastChatAt = 0, infoT = 0, backup = null, seenChat = new Set(), joining = false;

  // ---------- Firebase 접근 ----------
  function fb() { return G.cloud && G.cloud._fb ? G.cloud._fb() : null; }
  const R = (p) => F.db.ref(F.ref, p);
  function need() { F = fb(); if (!F) throw new Error('친구와 놀려면 먼저 계정 연결(로그인)을 해 주세요.'); return F; }
  N.ready = () => !!fb();

  // ---------- 친구 코드 ----------
  N.myCode = async () => {
    need();
    if (N.code) return N.code;
    const mine = (await F.db.get(R('users/' + F.uid + '/code'))).val();
    if (mine) { N.code = mine; return mine; }
    for (let k = 0; k < 6; k++) {
      let c = ''; for (let i = 0; i < 6; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)];
      try { await F.db.set(R('codes/' + c), F.uid); } catch (e) { if (k === 5) throw e; continue; } // 이미 있는 코드면 규칙이 거절 → 다시 (계속 거절되면 규칙 미게시)
      await F.db.set(R('users/' + F.uid + '/code'), c);
      N.code = c; return c;
    }
    throw new Error('친구 코드를 만들지 못했어요. 잠시 뒤 다시 해 주세요.');
  };
  N.cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);

  // ---------- 가입한 사람 목록 (오너 요청: 친구 추가할 때 고르기 쉽게) ----------
  // directory/{uid} = { name, town, code, open, at } — 캐릭터 이름·마을 이름·친구 코드만(아이디·이메일 없음)
  N.publish = async (open) => {
    need(); const code = await N.myCode();
    const v = { name: (G.player.name || '?').slice(0, 8), town: (G.player.town || '').slice(0, 8), code, open: !!open, at: F.db.serverTimestamp() };
    await F.db.set(R('directory/' + F.uid), v);
    if (open) F.db.onDisconnect(R('directory/' + F.uid + '/open')).set(false);
  };
  N.people = async () => {
    need();
    const all = (await F.db.get(F.db.query(R('directory'), F.db.orderByChild('at'), F.db.limitToLast(60)))).val() || {};
    return Object.entries(all).filter(([uid, v]) => uid !== F.uid && v && /^[A-Z2-9]{6}$/.test(v.code || ''))
      .map(([uid, v]) => ({ uid, name: String(v.name || '?').slice(0, 8), town: String(v.town || '').slice(0, 8), code: v.code, open: !!v.open, at: +v.at || 0, friend: st.friends.some((f) => f.code === v.code) }))
      .sort((a, b) => (b.open - a.open) || (b.friend - a.friend) || (b.at - a.at));
  };
  N.addFriend = (p) => { rememberFriend(p.code, p.name, p.town, p.uid); watchFriends(); G.audio.sfx('chime'); G.ui.toast(`${rl(p.name)} 친구로 추가했어요!`, { icon: '👫' }); };
  N.removeFriend = (code) => { st.friends = st.friends.filter((f) => f.code !== code); G.save.mark('friend'); };

  // ---------- 채팅 필터 ----------
  N.filter = (text) => {
    let s = String(text || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
    const plain = s.replace(/[\s.,_\-~!?*^0-9]/g, '').toLowerCase();
    for (const w of BAD) if (plain.includes(w)) { s = s.split('').map((ch) => (/\s/.test(ch) ? ch : '♡')).join('').slice(0, 12); break; }
    return s;
  };

  // ---------- 방 열기(주인) ----------
  N.open = async () => {
    need(); if (N.mode === 'guest') throw new Error('친구 마을에서 먼저 돌아와 주세요.');
    const meta = G.save.sections.get('meta').get() || {};
    await F.db.set(R('rooms/' + F.uid + '/info'), { open: true, name: G.player.name || '?', town: G.player.town || '', seed: meta.seed, vms: Math.round(G.time.now()), at: F.db.serverTimestamp(), v: G.VERSION });
    F.db.onDisconnect(R('rooms/' + F.uid + '/info/open')).set(false);
    N.mode = 'host'; N.room = F.uid; N.hostName = G.player.name; N.hostTown = G.player.town;
    await join();
    N.publish(true).catch((e) => G.log.err('net.publish', e));
    G.emit('net:change', {}); sys('마을 문을 열었어요! 친구에게 내 친구 코드를 알려 주세요.');
  };
  N.close = async () => {
    if (N.mode !== 'host') return;
    try { await F.db.set(R('rooms/' + F.uid + '/info/open'), false); await F.db.remove(R('rooms/' + F.uid + '/players')); await F.db.remove(R('rooms/' + F.uid + '/chat')); } catch (e) { G.log.err('net.close', e); }
    await leaveRoom(); sys('마을 문을 닫았어요.');
    N.publish(false).catch(() => {});
  };
  N.kick = async (uid) => {
    if (N.mode !== 'host' || !uid) return;
    await F.db.set(R('rooms/' + F.uid + '/kick/' + uid), true);
    await F.db.remove(R('rooms/' + F.uid + '/players/' + uid));
  };

  // ---------- 놀러 가기(손님) ----------
  N.visit = async (code) => {
    need(); code = N.cleanCode(code);
    if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error('친구 코드는 6글자예요.');
    if (N.mode === 'host') await N.close();
    if (N.mode === 'guest') await N.home(true);
    const host = (await F.db.get(R('codes/' + code))).val();
    if (!host) throw new Error('그런 친구 코드가 없어요. 다시 확인해 주세요.');
    if (host === F.uid) throw new Error('내 친구 코드예요! 친구의 코드를 넣어 주세요.');
    const info = (await F.db.get(R('rooms/' + host + '/info'))).val();
    if (!info || !info.open) throw new Error('친구가 지금 마을 문을 열어 두지 않았어요. 친구에게 「내 마을 열기」를 부탁해 주세요.');
    if ((await F.db.get(R('rooms/' + host + '/kick/' + F.uid))).val()) throw new Error('지금은 이 마을에 들어갈 수 없어요.');
    rememberFriend(code, info.name, info.town, host); watchFriends();
    N.mode = 'guest'; N.room = host; N.hostName = info.name || '친구'; N.hostTown = info.town || '';
    enterGuestWorld(info);
    await join();
    G.emit('net:change', {});
    G.ui.toast(`${N.hostName}의 「${N.hostTown || '마을'}」에 놀러 왔어요! 벌레·물고기·조개는 내 가방에 담겨요.`, { icon: '🧳', ms: 4200 });
  };
  N.home = async (quiet) => {
    if (N.mode !== 'guest') return;
    await leaveRoom();
    if (!quiet) G.ui.toast('집으로 돌아왔어요.', { icon: '🏡' });
  };
  function rememberFriend(code, name, town, uid) {
    const old = st.friends.find((f) => f.code === code) || {};
    st.friends = [{ code, name: String(name || old.name || '').slice(0, 8), town: String(town || old.town || '').slice(0, 8), uid: uid || old.uid || '' }].concat(st.friends.filter((f) => f.code !== code)).slice(0, 20);
    if (!G.save.paused) G.save.mark('friend');
  }

  // 손님 마을: 친구 시드로 지도를 만들고, 내 마을 상태는 따로 보관 → 돌아오면 복원. 그동안 내 세이브는 멈춘다(내 마을이 친구 마을로 덮이지 않게)
  function enterGuestWorld(info) {
    const pl = G.player, W = G.world, wsec = G.save.sections.get('world');
    G.save.now('visit');
    backup = { world: JSON.parse(JSON.stringify(wsec.get())), x: pl.x, y: pl.y, dir: pl.dir, vms: G.time.st.vms, drops: G.game.drops.slice() };
    G.save.pause(true);
    if (G.ranch.st.riding) G.ranch.dismount();
    W.build(info.seed); wsec.set({ seed: info.seed, taken: {}, shakes: {}, drops: [], firstBalloon: true }); W.build(info.seed);
    if (info.vms) G.time.st.vms = info.vms;
    G.time.resync && G.time.resync();
    W.refresh(G.time.day()); G.tide.refresh(G.time.day());
    G.game.drops.length = 0;
    const door = W.map.plots.tent.door; pl.x = door.x * TILE + 16 + 40; pl.y = (door.y + 2) * TILE + 10; pl.dir = 0;
    afterSwap();
  }
  function restoreHome() {
    if (!backup) return;
    const pl = G.player, W = G.world, wsec = G.save.sections.get('world'), meta = G.save.sections.get('meta').get() || {};
    W.build(meta.seed); wsec.set(backup.world); W.build(meta.seed);
    G.time.st.vms = backup.vms; G.time.resync && G.time.resync();
    G.farm.st.lastMin = -1; // 손님 시간 동안 작물이 갑자기 자라지 않게
    W.refresh(G.time.day()); G.tide.refresh(G.time.day());
    G.game.drops.length = 0; for (const d of backup.drops) G.game.drops.push(d);
    pl.x = backup.x; pl.y = backup.y; pl.dir = backup.dir;
    backup = null;
    G.save.pause(false); G.save.now('home');
    afterSwap();
  }
  function afterSwap() {
    G.art.season = G.time.season(); G.art.clearCache(); G.art.dropChunks && G.art.dropChunks();
    G.npc.init(); G.eco.clear(); G.game.resize(); G.ui.refreshHud();
  }

  // ---------- 방 들어가기·나가기 (공통) ----------
  async function join() {
    joining = true;
    const base = 'rooms/' + N.room;
    N.others = {}; N.chat = []; seenChat = new Set(); lastSent = '';
    const me = R(base + '/players/' + F.uid);
    await F.db.set(me, myState());
    F.db.onDisconnect(me).remove();
    offs.push(F.db.onValue(R(base + '/players'), (snap) => syncPlayers(snap.val() || {})));
    offs.push(F.db.onValue(F.db.query(R(base + '/chat'), F.db.limitToLast(30)), (snap) => syncChat(snap.val() || {})));
    offs.push(F.db.onValue(R(base + '/gifts/' + F.uid), (snap) => receiveGifts(snap.val() || {})));
    if (N.mode === 'guest') {
      offs.push(F.db.onValue(R(base + '/kick/' + F.uid), (snap) => { if (snap.val()) { N.home(true); sys('마을 주인이 집으로 돌려보냈어요.'); } }));
      offs.push(F.db.onValue(R(base + '/info'), (snap) => {
        const v = snap.val();
        if (!v || !v.open) { if (N.mode === 'guest' && !joining) { N.home(true); sys(`${ga(N.hostName)} 마을 문을 닫아서 집으로 돌아왔어요.`); } return; }
        if (v.vms && Math.abs(v.vms - G.time.now()) > 10 * 60000) { G.time.st.vms = v.vms; G.time.resync && G.time.resync(); }
      }));
    }
    joining = false;
    G.ui.refreshNet && G.ui.refreshNet();
  }
  async function leaveRoom() {
    for (const off of offs) { try { off(); } catch (e) { /* 무시 */ } }
    offs = [];
    const room = N.room, wasGuest = N.mode === 'guest';
    if (F && room) { try { await F.db.remove(R('rooms/' + room + '/players/' + F.uid)); } catch (e) { /* 끊김 */ } }
    N.mode = 'off'; N.room = ''; N.others = {}; N.chat = [];
    if (wasGuest) restoreHome();
    G.emit('net:change', {}); G.ui.refreshNet && G.ui.refreshNet();
  }

  // ---------- 동기화 ----------
  function myState() {
    const p = G.player;
    return { name: (p.name || '?').slice(0, 8), look: JSON.stringify(p.look || {}).slice(0, 400), x: Math.round(p.x), y: Math.round(p.y), dir: p.dir | 0, mv: p.moving ? 1 : 0, tool: p.tool || 'hand', at: F.db.serverTimestamp() };
  }
  function syncPlayers(all) {
    const seen = new Set();
    for (const [uid, v] of Object.entries(all)) {
      if (!F || uid === F.uid || !v) continue;
      seen.add(uid);
      let o = N.others[uid];
      let look = {}; try { look = JSON.parse(v.look || '{}'); } catch (e) { /* 기본 모습 */ }
      if (!o) { o = N.others[uid] = { uid, x: v.x, y: v.y, seed: Math.random() * 10, walk: 0 }; if (G.game.started) sys(`${ga(v.name)} 왔어요!`); }
      Object.assign(o, { name: String(v.name || '?').slice(0, 8), look, tx: +v.x || 0, ty: +v.y || 0, dir: v.dir | 0, moving: !!v.mv, tool: v.tool || 'hand' });
    }
    for (const uid of Object.keys(N.others)) if (!seen.has(uid)) { sys(`${ga(N.others[uid].name)} 집으로 돌아갔어요.`); delete N.others[uid]; }
    G.emit('net:players', {});
  }
  function syncChat(all) {
    const list = Object.entries(all).map(([id, m]) => Object.assign({ id }, m)).filter((m) => m && typeof m.text === 'string').sort((a, b) => (a.t || 0) - (b.t || 0));
    N.chat = list;
    for (const m of list) {
      if (seenChat.has(m.id)) continue; seenChat.add(m.id);
      const who = m.uid === (F && F.uid) ? null : N.others[m.uid];
      if (m.uid === (F && F.uid)) { G.player.bubble = m.text; G.player.bubbleT = 5; }
      else if (who) { who.bubble = m.text; who.bubbleT = 5; G.audio.sfx('pop'); }
    }
    G.emit('net:chat', {});
  }
  function receiveGifts(all) {
    for (const [id, g] of Object.entries(all)) {
      if (!g || typeof g.id !== 'string' || !G.items.get(g.id)) { F.db.remove(R('rooms/' + N.room + '/gifts/' + F.uid + '/' + id)); continue; }
      let x = null; try { x = g.x ? JSON.parse(g.x) : null; } catch (e) { x = null; }
      const n = Math.max(1, Math.min(99, g.n | 0));
      if (!G.inv.canFit(g.id, x)) { G.ui.toast(`${ga(g.name || '친구')} 선물을 보냈는데 가방이 꽉 찼어요! 자리를 비우면 받아요.`, { icon: '🎒', ms: 3500 }); continue; }
      F.db.remove(R('rooms/' + N.room + '/gifts/' + F.uid + '/' + id)).then(() => {
        G.inv.add(g.id, n, x); G.audio.sfx('catch');
        G.ui.itemPop(g.id, x, `${g.name || '친구'}에게 ${G.items.name(g.id, x)}${n > 1 ? ' ' + n + '개' : ''}${n > 1 ? '를' : G.josa(G.items.name(g.id, x), '을/를').slice(-1)} 받았다!`);
        if (G.save.paused && N.mode !== 'guest') return; G.save.mark('gift');
      }).catch(() => { /* 이미 받음 */ });
    }
  }

  // ---------- 보내기 ----------
  N.say = async (text) => {
    if (!N.active) return false;
    const now = Date.now(); if (now - lastChatAt < CHAT_GAP) { G.ui.toast('조금 천천히 말해 주세요.', { icon: '💬' }); return false; }
    const s = N.filter(text); if (!s) return false;
    lastChatAt = now;
    await F.db.push(R('rooms/' + N.room + '/chat'), { uid: F.uid, name: (G.player.name || '?').slice(0, 8), text: s, t: F.db.serverTimestamp() });
    return true;
  };
  N.gift = async (toUid, slot, n) => {
    const s = G.inv.slots[slot]; if (!s || !N.active || !N.others[toUid]) return false;
    const it = G.items.get(s.id); if (!it || it.nosell || it.cat === 'letter') { G.ui.toast('그건 선물할 수 없어요.', { icon: '✉️' }); return false; }
    n = Math.max(1, Math.min(n || 1, s.n));
    const id = s.id, x = s.x ? JSON.stringify(s.x) : '';
    G.inv.removeAt(slot, n);
    try { await F.db.push(R('rooms/' + N.room + '/gifts/' + toUid), { from: F.uid, name: (G.player.name || '?').slice(0, 8), id, n, x, t: F.db.serverTimestamp() }); }
    catch (e) { G.inv.add(id, n, s.x); G.ui.toast('선물을 보내지 못했어요.', { icon: '⚠️' }); return false; }
    G.audio.sfx('chime'); G.ui.toast(`${N.others[toUid].name}에게 ${rl(G.items.name(id, s.x))} 선물했어요!`, { icon: '🎁' });
    if (!G.save.paused) G.save.mark('gift');
    return true;
  };

  // ---------- 매 프레임 ----------
  N.update = (dt) => {
    for (const o of Object.values(N.others)) {
      const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy);
      if (d > 300) { o.x = o.tx; o.y = o.ty; } else { const k = Math.min(1, dt * 8); o.x += dx * k; o.y += dy * k; }
      o.walk = (o.walk + dt * (o.moving || d > 2 ? 2.2 : 0)) % 1;
      if (o.bubbleT > 0) o.bubbleT -= dt;
    }
    const pl = G.player; if (pl.bubbleT > 0) pl.bubbleT -= dt;
    if (!N.active || !F) return;
    sendT -= dt;
    if (sendT <= 0) {
      sendT = 1 / SEND_HZ;
      const s = myState(), key = [s.x, s.y, s.dir, s.mv, s.tool, s.name, s.look].join('|');
      if (key !== lastSent) { lastSent = key; F.db.update(R('rooms/' + N.room + '/players/' + F.uid), s).catch(() => {}); }
    }
    if (N.mode === 'host') { infoT -= dt; if (infoT <= 0) { infoT = 30; F.db.update(R('rooms/' + F.uid + '/info'), { vms: Math.round(G.time.now()), name: G.player.name, town: G.player.town }).catch(() => {}); } }
  };
  N.near = (x, y, r) => { let best = null, bd = r; for (const o of Object.values(N.others)) { const d = u.dist(o.x, o.y, x, y); if (d < bd) { bd = d; best = o; } } return best; };
  N.count = () => Object.keys(N.others).length;

  // ---------- 그리기 ----------
  N.collect = (Rq, rect, t) => {
    for (const o of Object.values(N.others)) {
      if (o.x < rect.x - 60 || o.x > rect.x + rect.w + 60 || o.y < rect.y - 60 || o.y > rect.y + rect.h + 80) continue;
      Rq.push({ sy: o.y, draw: (c) => {
        G.art.actor.draw(c, { species: 'human', look: o.look, x: o.x, y: o.y, dir: o.dir, moving: o.moving, walk: o.walk, tool: o.tool, seed: o.seed }, t);
        N.tag(c, o.x, o.y - 62, o.name, '#fff6e6');
        if (o.bubbleT > 0 && o.bubble) N.bubble(c, o.x, o.y - 76, o.bubble, Math.min(1, o.bubbleT));
      } });
    }
  };
  N.tag = (c, x, y, text, bg) => {
    c.save(); c.font = G.fontPx ? G.fontPx(9) : '9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + 10; G.art.paint.rrect(c, x - w / 2, y - 7, w, 14, 7, bg); c.globalAlpha = 0.9; c.fillStyle = '#5b4636'; c.fillText(text, x, y + 0.5); c.restore();
  };
  N.bubble = (c, x, y, text, a) => {
    c.save(); c.globalAlpha = a; c.font = G.fontPx ? G.fontPx(10) : '10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    // 긴 말은 두 줄까지
    const lines = []; let cur = '';
    for (const ch of text) { if (c.measureText(cur + ch).width > 110) { lines.push(cur); cur = ''; if (lines.length === 2) break; } cur += ch; }
    if (lines.length < 2 && cur) lines.push(cur); else if (cur && lines.length === 2) lines[1] = lines[1].slice(0, -1) + '…';
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 14, h = lines.length * 13 + 8, top = y - h;
    G.art.paint.rrect(c, x - w / 2, top, w, h, 8, '#ffffff', '#5b4636', 1.2);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - 4, top + h - 0.5); c.lineTo(x, top + h + 5); c.lineTo(x + 4, top + h - 0.5); c.fill();
    c.strokeStyle = '#5b4636'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 4, top + h); c.lineTo(x, top + h + 5); c.lineTo(x + 4, top + h); c.stroke();
    c.fillStyle = '#5b4636'; lines.forEach((l, i) => c.fillText(l, x, top + 10 + i * 13));
    c.restore();
  };

  const ga = (n) => n + G.josa(n, '이/가').slice(-1), rl = (n) => n + G.josa(n, '을/를').slice(-1);
  function sys(text) { G.ui.toast(text, { icon: '👫', ms: 3000 }); }

  // 손님일 때 앱을 내리면(폰): 내 마을 상태로 잠깐 바꿔서 저장하고 다시 친구 마을로. 잡은 것·받은 선물이 날아가지 않게
  N.safeSave = () => {
    if (N.mode !== 'guest' || !backup) return;
    const wsec = G.save.sections.get('world'), pl = G.player;
    const cur = JSON.parse(JSON.stringify(wsec.get())), pos = [pl.x, pl.y, pl.dir], vms = G.time.st.vms;
    try {
      wsec.set(backup.world); pl.x = backup.x; pl.y = backup.y; pl.dir = backup.dir; G.time.st.vms = backup.vms;
      G.save.pause(false); G.save.now('visit-safe');
    } finally {
      G.save.pause(true); wsec.set(cur); [pl.x, pl.y, pl.dir] = pos; G.time.st.vms = vms;
    }
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) N.safeSave(); });

  // 창을 닫거나 숨길 때: 손님이면 내 마을로 되돌려 저장(친구 마을 상태가 내 세이브에 섞이지 않게)
  N.beforeUnload = () => {
    if (N.mode === 'guest') { for (const off of offs) { try { off(); } catch (e) { /* 무시 */ } } offs = []; N.mode = 'off'; restoreHome(); }
    else if (N.mode === 'host' && F) { try { F.db.set(R('rooms/' + F.uid + '/info/open'), false); F.db.set(R('directory/' + F.uid + '/open'), false); } catch (e) { /* 무시 */ } }
  };
  G.on('cloud:kicked', () => { if (N.active) leaveRoom(); });
  // 친구가 마을 문을 열면 알려 준다 (친구로 추가한 사람만 지켜본다)
  let friendOffs = [], friendOpen = {};
  function watchFriends() {
    for (const off of friendOffs) { try { off(); } catch (e) { /* 무시 */ } }
    friendOffs = []; if (!fb()) return; F = fb();
    for (const f of st.friends.filter((x) => x.uid).slice(0, 20)) {
      let first = true;
      friendOffs.push(F.db.onValue(R('directory/' + f.uid + '/open'), (snap) => {
        const open = !!snap.val(), was = friendOpen[f.uid]; friendOpen[f.uid] = open;
        if (first) { first = false; return; }
        if (open && !was && N.mode !== 'guest') { G.ui.toast(`${ga(f.name)} 마을 문을 열었어요! 잎첩 👫 친구 탭에서 놀러 갈 수 있어요.`, { icon: '🟢', ms: 4500 }); G.audio.sfx('chime'); }
      }));
    }
  }
  N.watchFriends = watchFriends;
  // 이름·마을 이름을 바꾸면 목록에도 바로 반영
  G.on('player:look', () => { if (fb()) N.publish(N.mode === 'host').catch(() => {}); });
  // 로그인하면 목록에 내 이름을 올린다(다른 사람이 나를 친구로 고를 수 있게)
  G.on('cloud:state', (s) => { if (s.phase === 'synced' && !N._published && fb()) { N._published = true; N.publish(N.mode === 'host').catch((e) => { N._published = false; G.log.err('net.publish', e); }); watchFriends(); } if (s.phase === 'signed-out' || s.phase === 'kicked') { N._published = false; N.code = ''; } });

  G.modules.add('net');
})(globalThis.G);
