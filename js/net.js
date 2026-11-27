// 친구 마을 방문, 실시간 이동, 채팅, 선물
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
  const st = { friends: [], visits: true };
  G.save.section('net', {
    v: 1, def: () => ({ friends: [], visits: true }),
    get: () => ({ friends: st.friends.slice(0, 20), visits: st.visits }),
    set: (d) => {
      st.friends = Array.isArray(d.friends) ? d.friends.filter((f) => f && /^[A-Z2-9]{6}$/.test(f.code)).slice(0, 20) : [];
      st.visits = d.visits !== false;
    },
  });

  const N = G.net = {
    st, EMOTES,
    mode: 'off',            // off | host | guest
    room: '', code: '', hostName: '', hostTown: '',
    others: {},             // uid → { name, look, x, y, tx, ty, dir, moving, tool, bubble, bubbleT }
    chat: [],               // [{id, uid, name, text, t}]
    get active() { return N.mode !== 'off'; },
    get guest() { return N.mode === 'guest'; },
  };
  let F = null, offs = [], sendT = 0, lastSent = '', lastChatAt = 0, infoT = 0, backup = null, seenChat = new Set(), joining = false, visiting = false;
  let opening = null, codeJob = null;

  // ---------- Firebase 접근 ----------
  function fb() { return G.cloud && G.cloud._fb ? G.cloud._fb() : null; }
  const R = (p) => F.db.ref(F.ref, p);
  function need() { F = fb(); if (!F) throw new Error('친구와 놀려면 먼저 계정 연결(로그인)을 해 주세요.'); return F; }
  N.ready = () => !!fb();

  // ---------- 친구 코드 ----------
  N.myCode = async () => {
    const auth = need();
    if (N.code) return N.code;
    if (codeJob?.uid === auth.uid) return codeJob.promise;
    const job = { uid: auth.uid };
    const ref = (p) => auth.db.ref(auth.ref, p);
    job.promise = (async () => {
      const mine = ref('users/' + auth.uid + '/code');
      const saved = (await auth.db.get(mine)).val();
      if (saved) return saved;
      for (let k = 0; k < 6; k++) {
        let c = ''; for (let i = 0; i < 6; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)];
        try { await auth.db.set(ref('codes/' + c), auth.uid); } catch (e) { if (k === 5) throw e; continue; }
        await auth.db.set(mine, c);
        return c;
      }
      throw new Error('친구 목록 등록을 마치지 못했어요.');
    })();
    codeJob = job;
    try {
      const code = await job.promise;
      if (fb()?.uid === auth.uid) N.code = code;
      return code;
    } finally {
      if (codeJob === job) codeJob = null;
    }
  };
  async function friendUid(p) {
    if (p.uid) return p.uid;
    if (!/^[A-Z2-9]{6}$/.test(p.code || '')) return null;
    return (await F.db.get(R('codes/' + p.code))).val();
  }

  // ---------- 가입한 사람 목록 (오너 요청: 친구 추가할 때 고르기 쉽게) ----------
  // directory/{uid} = { name, town, code, open, at } — 캐릭터 이름·마을 이름·친구 코드만(아이디·이메일 없음)
  N.publish = async () => {
    const auth = need(), code = await N.myCode();
    if (fb()?.uid !== auth.uid) return;
    const open = N.mode === 'host';
    const v = { name: (G.player.name || '?').slice(0, 8), town: (G.player.town || '').slice(0, 8), code, open: !!open, at: F.db.serverTimestamp() };
    await F.db.set(R('directory/' + F.uid), v);
    if (open) F.db.onDisconnect(R('directory/' + F.uid + '/open')).set(false);
  };
  N.people = async () => {
    need();
    const all = (await F.db.get(F.db.query(R('directory'), F.db.orderByChild('at'), F.db.limitToLast(60)))).val() || {};
    const seen = new Set(Object.values(all).map((v) => v?.code));
    const saved = await Promise.all(st.friends.filter((f) => !seen.has(f.code)).map(async (f) => {
      try {
        const uid = await friendUid(f);
        const profile = uid ? (await F.db.get(R('directory/' + uid))).val() : null;
        return { ...profile, uid, name: profile?.name || f.name, town: profile?.town || f.town, code: f.code };
      } catch (e) {
        return f;
      }
    }));
    const people = Object.entries(all).filter(([uid, v]) => uid !== F.uid && v && /^[A-Z2-9]{6}$/.test(v.code || ''))
      .map(([uid, v]) => ({ ...v, uid }));
    return people.concat(saved)
      .map((v) => ({ uid: v.uid, name: String(v.name || '친구').slice(0, 8), town: String(v.town || '').slice(0, 8), code: v.code, open: !!v.open, at: +v.at || 0, friend: st.friends.some((f) => f.code === v.code) }))
      .sort((a, b) => (b.friend - a.friend) || (b.open - a.open) || (b.at - a.at));
  };
  N.addFriend = (p) => { rememberFriend(p.code, p.name, p.town, p.uid); watchFriends(); G.audio.sfx('chime'); G.ui.toast(`${rl(p.name)} 친구로 추가했어요!`, { icon: '👫' }); };
  // 놀러 가도 돼? (친구 마을이 닫혀 있을 때) → 친구에게 물어보고, 친구가 문을 열면 알림이 온다
  N.knock = async (p) => {
    need();
    const uid = await friendUid(p);
    if (!uid) throw new Error('친구를 찾지 못했어요.');
    try { await F.db.set(R('knock/' + uid + '/' + F.uid), { name: (G.player.name || '?').slice(0, 8), at: F.db.serverTimestamp() }); }
    catch (e) { e.knock = true; throw e; }
    rememberFriend(p.code, p.name, p.town, uid); knocked[uid] = Date.now(); watchFriends();
    G.audio.sfx('chime');
    G.ui.toast(`${p.name}에게 「놀러 가도 돼?」를 보냈어요! 마을 문을 열면 바로 알려 줄게요.`, { icon: '📮', ms: 4200 });
  };
  let knockOff = null; const knockSeen = new Set(), knocked = {};
  function watchKnocks() {
    if (knockOff) { try { knockOff(); } catch (e) { /* 무시 */ } knockOff = null; }
    if (!fb()) return; F = fb();
    knockOff = F.db.onValue(R('knock/' + F.uid), (snap) => {
      const all = snap.val() || {};
      for (const [from, k] of Object.entries(all)) {
        const key = from + ':' + (k && k.at);
        F.db.remove(R('knock/' + F.uid + '/' + from)).catch(() => {});
        if (knockSeen.has(key) || !k || Date.now() - (+k.at || 0) > 10 * 60000) continue; knockSeen.add(key);
        askOpen(String(k.name || '친구').slice(0, 8));
      }
    });
  }
  async function askOpen(name) {
    if (N.mode === 'host') { G.ui.toast(`${ga(name)} 놀러 오고 싶대요! 마을 문이 열려 있으니 곧 올 거예요.`, { icon: '📮', ms: 4000 }); return; }
    if (N.mode === 'guest' || G.ui.dialogOpen() || !G.game.started) { G.ui.toast(`${ga(name)} 놀러 오고 싶대요! 👫 친구 탭에서 「내 마을 열기」를 눌러 주세요.`, { icon: '📮', ms: 5000 }); return; }
    G.audio.sfx('chime');
    if (await G.ui.confirm(`${ga(name)} 놀러 오고 싶대요! 마을 문을 열까요?`, '문 열기', '나중에')) { try { await N.open(); } catch (e) { G.ui.netErr(e); } }
  }
  N.removeFriend = (code) => { st.friends = st.friends.filter((f) => f.code !== code); G.save.mark('friend'); };

  // ---------- 채팅 필터 ----------
  N.filter = (text) => {
    let s = String(text || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
    const plain = s.replace(/[\s.,_\-~!?*^0-9]/g, '').toLowerCase();
    for (const w of BAD) if (plain.includes(w)) { s = s.split('').map((ch) => (/\s/.test(ch) ? ch : '♡')).join('').slice(0, 12); break; }
    return s;
  };

  // ---------- 방 열기(주인) ----------
  async function openRoom(quiet) {
    const auth = need();
    if (N.mode === 'guest') throw new Error('친구 마을에서 먼저 돌아와 주세요.');
    const meta = G.save.sections.get('meta').get() || {};
    if (!meta.seed) return;
    const path = 'rooms/' + auth.uid + '/info';
    await auth.db.onDisconnect(R(path + '/open')).set(false);
    await auth.db.set(R(path), { open: true, name: G.player.name || '?', town: G.player.town || '', seed: meta.seed, vms: Math.round(G.time.now()), at: auth.db.serverTimestamp(), v: G.VERSION });
    if (fb()?.uid !== auth.uid) return;
    N.mode = 'host'; N.room = F.uid; N.hostName = G.player.name; N.hostTown = G.player.town;
    try { await join(); } catch (e) { joining = false; await N.close(); throw e; }
    N.publish().catch((e) => G.log.err('net.publish', e));
    G.emit('net:change', {});
    if (!quiet) sys('마을 문을 열었어요! 친구 목록에서 바로 놀러 올 수 있어요.');
  }
  N.open = async (quiet) => {
    if (opening) return opening;
    if (N.mode === 'host') return;
    opening = openRoom(quiet);
    try { await opening; } finally { opening = null; }
  };
  N.openIfAllowed = () => {
    if (st.visits && !visiting && N.mode === 'off' && fb() && G.game?.started && G.scene.is('town'))
      return N.open(true).catch((e) => G.log.err('net.open', e));
  };
  async function restorePresence(auth) {
    const base = 'rooms/' + auth.uid;
    const me = R(base + '/players/' + auth.uid);
    await auth.db.onDisconnect(R(base + '/info/open')).set(false);
    await auth.db.onDisconnect(me).remove();
    if (!st.visits || visiting || N.mode !== 'host' || N.room !== auth.uid || fb()?.uid !== auth.uid) return;
    await auth.db.set(me, myState());
    if (!st.visits || visiting || N.mode !== 'host' || N.room !== auth.uid || fb()?.uid !== auth.uid) return;
    await auth.db.set(R(base + '/info/open'), true);
    await N.publish();
  }
  let connectedOff = null;
  function watchConnection(auth) {
    if (connectedOff) connectedOff();
    let connected = false;
    connectedOff = auth.db.onValue(R('.info/connected'), (snap) => {
      if (!snap.val()) return;
      if (connected && N.mode === 'host' && st.visits && !visiting)
        restorePresence(auth).catch((e) => G.log.err('net.reconnect', e));
      else N.openIfAllowed();
      connected = true;
    });
  }
  N.setVisits = async (allow) => {
    st.visits = allow;
    G.save.mark('net');
    if (allow) return N.open();
    if (opening) { try { await opening; } catch (e) { /* 열리지 않은 방 */ } }
    await N.close();
  };
  N.close = async (quiet) => {
    if (N.mode !== 'host') return;
    try { await F.db.set(R('rooms/' + F.uid + '/info/open'), false); await F.db.remove(R('rooms/' + F.uid + '/players')); await F.db.remove(R('rooms/' + F.uid + '/chat')); } catch (e) { G.log.err('net.close', e); }
    await leaveRoom(); if (!quiet) sys('마을 문을 닫았어요.');
    N.publish().catch(() => {});
  };
  N.kick = async (uid) => {
    if (N.mode !== 'host' || !uid) return;
    await F.db.set(R('rooms/' + F.uid + '/kick/' + uid), true);
    await F.db.remove(R('rooms/' + F.uid + '/players/' + uid));
  };

  // ---------- 놀러 가기(손님) ----------
  N.visit = async (person, allowRequest = true) => {
    const auth = need();
    if (visiting) throw new Error('마을로 이동하는 중이에요.');
    if (!G.scene.is('town')) throw new Error('실내에서 나와 마을에 서면 놀러 갈 수 있어요.');
    visiting = true;
    try {
      const host = await friendUid(person);
      if (!host || host === F.uid) throw new Error('놀러 갈 친구를 찾지 못했어요.');
      if (N.mode === 'guest' && N.room === host) return { joined: true };
      const [infoSnap, kickSnap] = await Promise.all([
        F.db.get(R('rooms/' + host + '/info')),
        F.db.get(R('rooms/' + host + '/kick/' + F.uid)),
      ]);
      if (fb()?.uid !== auth.uid) throw new Error('다시 로그인한 뒤 놀러 가 주세요.');
      if (kickSnap.val()) throw new Error('지금은 이 마을에 들어갈 수 없어요.');
      const info = infoSnap.val();
      if (!info?.open) {
        if (!allowRequest) throw new Error('친구가 마을 문을 닫았어요.');
        await N.knock({ ...person, uid: host });
        return { joined: false };
      }
      if (opening) await opening;
      if (N.mode === 'host') await N.close(true);
      if (N.mode === 'guest') await N.home(true);
      rememberFriend(person.code, info.name, info.town, host); watchFriends();
      N.mode = 'guest'; N.room = host; N.hostName = info.name || '친구'; N.hostTown = info.town || '';
      try {
        enterGuestWorld(info);
        await join();
      } catch (e) {
        joining = false;
        await leaveRoom();
        throw e;
      }
      G.emit('net:change', {});
      G.ui.toast(`${N.hostName}의 「${N.hostTown || '마을'}」에 놀러 왔어요! 벌레·물고기·조개는 내 가방에 담겨요.`, { icon: '🧳', ms: 4200 });
      return { joined: true };
    } finally {
      visiting = false;
    }
  };
  N.home = async (quiet) => {
    if (N.mode !== 'guest') return;
    await leaveRoom();
    if (!quiet) G.ui.toast('집으로 돌아왔어요.', { icon: '🏡' });
    N.openIfAllowed();
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
    if (G.game.awayGrow) G.game.awayGrow(); // 놀러 간 동안에도 내 작물·동물은 자란다
  }
  function afterSwap() {
    G.game.autoStop('visit'); G.fishing.cancel(true);
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
    const room = N.room, uid = F.uid;
    let gifts = {}, receiving = Promise.resolve();
    const receive = () => {
      if (!Object.keys(gifts).length) return;
      receiving = receiving.then(() => receiveGifts(gifts, room, uid)).catch((e) => G.log.err('net.gift', e));
    };
    offs.push(F.db.onValue(R(base + '/gifts/' + uid), (snap) => { gifts = snap.val() || {}; receive(); }));
    offs.push(G.on('inv:change', receive));
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
    const look = JSON.stringify(p.look || {});
    // 기존 접속 정보에 선물 지원 여부를 함께 전달한다.
    const giftLook = JSON.stringify({ ...p.look, valuableGift: true });
    return { name: (p.name || '?').slice(0, 8), look: (giftLook.length <= 400 ? giftLook : look).slice(0, 400), x: Math.round(p.x), y: Math.round(p.y), dir: p.dir | 0, mv: p.moving ? 1 : 0, tool: p.tool || 'hand', at: F.db.serverTimestamp() };
  }
  function syncPlayers(all) {
    const seen = new Set();
    for (const [uid, v] of Object.entries(all)) {
      if (!F || uid === F.uid || !v) continue;
      seen.add(uid);
      let o = N.others[uid];
      let look = {}; try { look = JSON.parse(v.look || '{}'); } catch (e) { /* 기본 모습 */ }
      if (!o) { o = N.others[uid] = { uid, x: v.x, y: v.y, seed: Math.random() * 10, walk: 0 }; if (G.game.started) sys(`${ga(v.name)} 왔어요!`); }
      Object.assign(o, { name: String(v.name || '?').slice(0, 8), look, valuableGift: look?.valuableGift === true, tx: +v.x || 0, ty: +v.y || 0, dir: v.dir | 0, moving: !!v.mv, tool: v.tool || 'hand' });
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
  async function receiveGifts(all, room, uid) {
    for (const [id, g] of Object.entries(all)) {
      if (N.room !== room || fb()?.uid !== uid) return;
      const it = typeof g?.id === 'string' && G.items.get(g.id);
      const db = F.db, ref = R('rooms/' + room + '/gifts/' + uid + '/' + id);
      if (!it) { db.remove(ref).catch(() => {}); continue; }
      let x = null;
      if (it.cat !== 'valuable') try { x = g.x ? JSON.parse(g.x) : null; } catch (e) { x = null; }
      const n = it.cat === 'valuable' ? 1 : Math.max(1, Math.min(99, g.n | 0));
      if (!G.inv.canFit(g.id, x, n)) { G.ui.toast(`${ga(g.name || '친구')} 선물을 보냈는데 가방이 꽉 찼어요! 자리를 비우면 받아요.`, { icon: '🎒', ms: 3500 }); continue; }
      const claim = await db.runTransaction(ref, (current) => {
        if (current && N.room === room && fb()?.uid === uid && G.inv.canFit(g.id, x, n)) return null;
      }, { applyLocally: false }).catch(() => null);
      if (!claim?.committed || fb()?.uid !== uid) continue;
      G.inv.add(g.id, n, x); G.audio.sfx('catch');
      if (it.cat === 'valuable' && N.guest) N.safeSave();
      G.ui.itemPop(g.id, x, `${g.name || '친구'}에게 ${G.items.name(g.id, x)}${n > 1 ? ' ' + n + '개' : ''}${n > 1 ? '를' : G.josa(G.items.name(g.id, x), '을/를').slice(-1)} 받았다!`);
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
    const s = G.inv.slots[slot], friend = N.others[toUid]; if (!s || !N.active || !friend) return false;
    const it = G.items.get(s.id); if (!it || it.nosell || it.cat === 'letter') { G.ui.toast('그건 선물할 수 없어요.', { icon: '✉️' }); return false; }
    if (it.cat === 'valuable' && !friend.valuableGift) {
      G.ui.toast('친구가 몽글숲을 새로 열고 다시 만나면 귀중품을 보낼 수 있어요.', { icon: '🎁' });
      return false;
    }
    n = it.cat === 'valuable' ? 1 : Math.max(1, Math.min(n || 1, s.n));
    const id = s.id, x = s.x ? JSON.stringify(s.x) : '';
    G.inv.removeAt(slot, n);
    try { await F.db.push(R('rooms/' + N.room + '/gifts/' + toUid), { from: F.uid, name: (G.player.name || '?').slice(0, 8), id, n, x, t: F.db.serverTimestamp() }); }
    catch (e) { G.inv.add(id, n, s.x); G.ui.toast('선물을 보내지 못했어요.', { icon: '⚠️' }); return false; }
    G.audio.sfx('chime'); G.ui.toast(`${friend.name}에게 ${rl(G.items.name(id, s.x))} 선물했어요!`, { icon: '🎁' });
    if (it.cat === 'valuable' && N.guest) N.safeSave();
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
        if (open && !was && N.mode !== 'guest') {
          G.audio.sfx('chime');
          // 내가 「놀러 가도 돼?」를 보낸 친구면 바로 갈지 묻는다
          if (knocked[f.uid] && Date.now() - knocked[f.uid] < 15 * 60000 && !G.ui.dialogOpen()) {
            delete knocked[f.uid];
            G.ui.confirm(`${ga(f.name)} 마을 문을 열었어요! 지금 놀러 갈까요?`, '놀러 가기', '나중에').then((yes) => { if (yes) N.visit(f, false).catch((e) => G.ui.netErr(e)); });
          } else G.ui.toast(`${ga(f.name)} 마을 문을 열었어요! 잎첩 👫 친구 탭에서 놀러 갈 수 있어요.`, { icon: '🟢', ms: 4500 });
        }
      }));
    }
  }
  N.watchFriends = watchFriends;
  // 이름·마을 이름을 바꾸면 목록에도 바로 반영
  G.on('player:look', () => { if (fb()) N.publish().catch(() => {}); });
  // 로그인하면 목록에 내 이름을 올린다(다른 사람이 나를 친구로 고를 수 있게)
  G.on('cloud:state', (s) => {
    if (s.phase === 'synced' && fb()) {
      if (!N._published) {
        N._published = true;
        N.publish().catch((e) => { N._published = false; G.log.err('net.publish', e); });
        watchFriends(); watchKnocks(); watchConnection(need());
      }
      N.openIfAllowed();
    }
    if (s.phase === 'signed-out' || s.phase === 'kicked') {
      N._published = false; N.code = '';
      if (connectedOff) { connectedOff(); connectedOff = null; }
    }
  });

  G.modules.add('net');
})(globalThis.G);
