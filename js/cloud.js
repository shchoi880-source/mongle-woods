// 무료 Firebase Spark 기반 계정 연결·클라우드 세이브.
// 로컬 A/B 세이브를 항상 유지하고, 양쪽이 모두 바뀐 경우에는 자동 덮어쓰지 않는다.
(function (G) {
  'use strict';
  const SDK = '13.4.0';
  const META_KEY = 'mg.cloud.meta';
  const BACKUP_KEY = 'mg.cloud.backup';
  const ADMIN_KEY = 'mg.admin', ADMIN_FP = '4cf30db3';
  const REQUIRED_CONFIG = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  const WAIT = new Set(['loading', 'checking', 'registering', 'signing-in', 'linking-google', 'redirecting', 'syncing', 'reloading']);
  let api = null, auth = null, db = null, userRef = null;
  let initialized = false, applyingRemote = false, uploadTimer = 0, authRun = 0;
  let pendingCharacterName = '';
  let sessionRef = null, sessionOff = null;
  const st = { phase: 'unconfigured', configured: false, user: null, conflict: null, error: '', lastSyncAt: 0 };

  function readJSON(key) { try { return JSON.parse(G.store.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJSON(key, value) { try { G.store.setItem(key, JSON.stringify(value)); } catch (e) { G.log.err('cloud.store', e); } }
  function makeDeviceId() {
    const m = readJSON(META_KEY) || {};
    if (m.deviceId) return m.deviceId;
    return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  const deviceId = makeDeviceId();
  function meta() { return Object.assign({ deviceId }, readJSON(META_KEY) || {}); }
  function remember(uid, record) {
    const m = { deviceId, uid, baseRevision: record.revision || 0, baseFingerprint: record.fingerprint || '', lastSyncAt: Date.now() };
    writeJSON(META_KEY, m); st.lastSyncAt = m.lastSyncAt;
  }
  function configured() {
    const c = G.FIREBASE_CONFIG;
    return !!(c && REQUIRED_CONFIG.every((k) => typeof c[k] === 'string' && c[k].trim()));
  }
  function accountId(value) { return String(value || '').trim().toLowerCase(); }
  function validAccountId(value) { return /^[a-z0-9_]{4,20}$/.test(accountId(value)); }
  function accountEmail(value) { return accountId(value) + '@accounts.mongle.invalid'; }
  function cleanSummary(s) {
    return { name: s.name || '', town: s.town || '', created: +s.created || 0, money: +s.money || 0, dex: +s.dex || 0, playDays: +s.playDays || 0, savedAt: +s.savedAt || 0 };
  }
  function localCopy() {
    const payload = G.save.exportString(), parsed = G.save.parseImport(payload);
    if (!parsed.ok) throw new Error(parsed.err || '로컬 세이브를 읽을 수 없어요.');
    return { payload, fingerprint: G.save.fingerprint(parsed.env), summary: cleanSummary(parsed.summary), established: !!(parsed.summary.name && parsed.summary.town) };
  }
  function recordFrom(local, revision) {
    return {
      payload: local.payload, fingerprint: local.fingerprint, revision,
      appVersion: G.VERSION, clientSavedAt: local.summary.savedAt || Date.now(),
      updatedAt: api.db.serverTimestamp(), deviceId, summary: local.summary,
    };
  }
  function validRemote(remote) {
    if (!remote || typeof remote.payload !== 'string' || typeof remote.fingerprint !== 'string' || !Number.isFinite(remote.revision)) return null;
    const parsed = G.save.parseImport(remote.payload);
    if (!parsed.ok || G.save.fingerprint(parsed.env) !== remote.fingerprint) return null;
    return Object.assign({}, remote, { summary: cleanSummary(parsed.summary) });
  }
  function backupView() {
    const b = readJSON(BACKUP_KEY);
    return b && b.payload && b.summary ? { at: b.at || 0, summary: cleanSummary(b.summary) } : null;
  }
  function publicState() {
    return {
      phase: st.phase, configured: st.configured, user: st.user && Object.assign({}, st.user), error: st.error,
      lastSyncAt: st.lastSyncAt, backup: backupView(),
      conflict: st.conflict && { local: st.conflict.local.summary, remote: st.conflict.remote.summary },
    };
  }
  function emit() { G.emit('cloud:state', publicState()); }
  function state(phase, extra) { Object.assign(st, { phase, error: '' }, extra || {}); emit(); }
  function fail(err) {
    const raw = err && (err.code || err.message) || String(err || '알 수 없는 오류');
    const known = {
      'auth/popup-closed-by-user': '로그인 창이 닫혔어요.', 'auth/cancelled-popup-request': '로그인이 취소됐어요.',
      'auth/popup-blocked': 'Google 로그인 창이 차단됐어요. 브라우저의 팝업을 허용하거나 아이디와 비밀번호로 로그인해 주세요.',
      'auth/operation-not-supported-in-this-environment': '이 브라우저에서는 Google 로그인을 열 수 없어요. Safari나 Chrome에서 다시 열거나 아이디와 비밀번호로 로그인해 주세요.',
      'auth/web-storage-unsupported': '이 브라우저의 개인정보 보호 설정 때문에 Google 로그인을 유지할 수 없어요. 아이디와 비밀번호로 로그인해 주세요.',
      'auth/unauthorized-domain': '이 주소가 Firebase 로그인 허용 주소에 등록되지 않았어요.',
      'auth/email-already-in-use': '이미 사용 중인 아이디예요.',
      'auth/invalid-credential': '아이디 또는 비밀번호가 맞지 않아요.',
      'auth/invalid-email': '아이디 형식이 올바르지 않아요.',
      'auth/weak-password': '비밀번호는 8자 이상으로 정해 주세요.',
      'auth/too-many-requests': '로그인 시도가 너무 많아요. 잠시 뒤 다시 해 주세요.',
      'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
      'auth/operation-not-allowed': '이 로그인 방식이 아직 서버에서 활성화되지 않았어요.',
      'auth/credential-already-in-use': '이 Google 계정은 다른 몽글숲 계정에 이미 연결되어 있어요.',
      'auth/provider-already-linked': '이미 Google 계정이 연결되어 있어요.',
      'PERMISSION_DENIED': '클라우드 저장 권한이 없어요. Database Rules를 확인해 주세요.',
    };
    let msg = known[raw] || known[err && err.code];
    if (!msg && /^[\x00-\x7F]+$/.test(raw)) msg = '계정 연결 중 문제가 생겼어요. 잠시 뒤 다시 해 주세요.'; // 영어 원문 대신 한국어
    st.phase = 'error'; st.error = msg || raw; emit(); G.emit('cloud:error', { message: st.error });
  }

  // 마지막 동기화 지문을 기준으로 한 순수 충돌 판정(자동 검증에서도 사용).
  function decide(localFingerprint, established, remote, m, uid) {
    if (!remote) return established ? 'upload' : 'wait-local';
    if (remote.fingerprint === localFingerprint) return 'same';
    if (!established) return 'remote';
    // 서버가 주인(오너 결정 D17): 이 기기 마을이 이 계정 것이 아니면(또는 기준이 없으면) 서버 마을을 쓴다. 기기 마을은 복구용 백업으로만 남는다
    if (!m || m.uid !== uid || !m.baseFingerprint) return 'remote';
    const localChanged = localFingerprint !== m.baseFingerprint;
    const remoteChanged = remote.fingerprint !== m.baseFingerprint;
    if (!localChanged && remoteChanged) return 'remote';
    if (localChanged && !remoteChanged) return 'upload';
    return 'conflict';
  }

  function storeBackup(local, reason) {
    if (!local.established) return;
    writeJSON(BACKUP_KEY, { at: Date.now(), reason, payload: local.payload, fingerprint: local.fingerprint, summary: local.summary });
  }
  function conflict(local, remote) { state('conflict', { conflict: { local, remote } }); }
  async function applyRemote(remote, reason) {
    remote = validRemote(remote);
    if (!remote) throw new Error('서버 세이브가 손상되어 불러오지 않았어요.');
    const local = localCopy();
    if (local.fingerprint !== remote.fingerprint) storeBackup(local, reason || 'server');
    const parsed = G.save.parseImport(remote.payload);
    applyingRemote = true;
    try {
      const r = G.save.importEnv(parsed.env);
      if (!r.ok) throw new Error(r.err || '서버 세이브를 적용하지 못했어요.');
      remember(st.user.uid, remote); state('reloading', { conflict: null });
    } finally { applyingRemote = false; }
    if (typeof location !== 'undefined' && location.reload) location.reload();
  }
  async function upload(force) {
    clearTimeout(uploadTimer); uploadTimer = 0;
    if (!st.user || !userRef || WAIT.has(st.phase) || st.phase === 'conflict') return false;
    const local = localCopy();
    if (!local.established) { state('waiting-local', { conflict: null }); return false; }
    const m = meta();
    if (!force && m.uid === st.user.uid && m.baseFingerprint === local.fingerprint) { state('synced', { conflict: null }); return true; }
    state('syncing', { conflict: null });
    try {
      const result = await api.db.runTransaction(userRef, (current) => {
        const currentFp = current && current.fingerprint || '';
        if (!force && current && m.uid === st.user.uid && m.baseFingerprint && currentFp !== m.baseFingerprint && currentFp !== local.fingerprint) return;
        return recordFrom(local, ((current && current.revision) || 0) + 1);
      }, { applyLocally: false });
      if (!result.committed) {
        const remote = validRemote(result.snapshot.val());
        if (!remote) throw new Error('서버 저장 상태를 확인하지 못했어요.');
        conflict(local, remote); return false;
      }
      const record = validRemote(result.snapshot.val());
      if (!record) throw new Error('서버가 저장한 내용을 검증하지 못했어요.');
      remember(st.user.uid, record); state('synced', { conflict: null }); return true;
    } catch (e) { fail(e); return false; }
  }
  function scheduleUpload(ms = 5000) {
    if (!st.user || st.phase === 'conflict' || st.phase === 'reloading') return;
    clearTimeout(uploadTimer); uploadTimer = setTimeout(() => upload(false), ms);
  }
  async function waitForUser(uid, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (st.phase === 'error') return false;
      if (st.user && st.user.uid === uid && !WAIT.has(st.phase)) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    fail(new Error('로그인은 되었지만 서버 마을 확인이 늦어지고 있어요. 인터넷 연결을 확인한 뒤 다시 로그인해 주세요.'));
    return false;
  }
  async function handleUser(user) {
    const run = ++authRun;
    if (!user) { userRef = null; state(st.phase === 'kicked' ? 'kicked' : 'signed-out', { user: null, conflict: null }); return; }
    if (pendingCharacterName) {
      G.player.name = pendingCharacterName;
      pendingCharacterName = '';
    }
    // 로그인 아이디·Google 이름·이메일·사진은 게임 상태에 보관하지 않는다.
    st.user = { uid: user.uid, hasGoogle: (user.providerData || []).some((p) => p.providerId === 'google.com') };
    state('checking', { user: st.user, conflict: null });
    await claimSession(user.uid); if (run !== authRun) return;
    try {
      userRef = api.db.ref(db, 'users/' + user.uid + '/save');
      const snap = await api.db.get(userRef); if (run !== authRun) return;
      const remote = snap.exists() ? validRemote(snap.val()) : null;
      if (snap.exists() && !remote) throw new Error('서버 세이브 형식이 올바르지 않아 안전하게 중단했어요.');
      const local = localCopy(), m = meta();
      const action = decide(local.fingerprint, local.established, remote, m, user.uid);
      if (action === 'same') { remember(user.uid, remote); state('synced', { conflict: null }); }
      else if (action === 'remote') await applyRemote(remote, local.established ? 'remote-newer' : 'new-device');
      else if (action === 'upload') {
        if (remote) remember(user.uid, remote);
        else writeJSON(META_KEY, { deviceId, uid: user.uid, baseRevision: 0, baseFingerprint: '', lastSyncAt: 0 });
        state('ready', { conflict: null }); await upload(false);
      } else if (action === 'wait-local') state('waiting-local', { conflict: null });
      else conflict(local, remote);
    } catch (e) { if (run === authRun) fail(e); }
  }

  // ---------- 한 계정 = 한 기기 (오너 요청) ----------
  // 로그인하면 users/{uid}/session 을 이 기기로 바꾸고, 예전 기기가 마지막 진행을 올릴 시간을 잠깐 준 뒤 서버 마을을 읽는다.
  // 다른 기기가 세션을 가져가면: 이 기기는 마지막 진행을 올리고, 저장을 멈추고, 로그아웃한다.
  async function claimSession(uid) {
    if (sessionOff) { sessionOff(); sessionOff = null; }
    sessionRef = api.db.ref(db, 'users/' + uid + '/session');
    try {
      const prev = (await api.db.get(sessionRef)).val();
      await api.db.set(sessionRef, { deviceId, at: api.db.serverTimestamp() });
      if (prev && prev.deviceId && prev.deviceId !== deviceId) await new Promise((r) => setTimeout(r, 2500)); // 예전 기기의 마지막 저장을 기다림
    } catch (e) {
      // 규칙이 아직 갱신 전이면(PERMISSION_DENIED) 한 기기 제한만 건너뛰고 동기화는 계속
      G.log.err('cloud.session', e); sessionRef = null; return;
    }
    let first = true;
    sessionOff = api.db.onValue(sessionRef, (snap) => {
      const v = snap.val();
      if (first) { first = false; return; }
      if (v && v.deviceId && v.deviceId !== deviceId) kicked();
    });
  }
  async function kicked() {
    if (st.phase === 'kicked') return;
    try { await upload(false); } catch (e) { /* 이미 끊겼으면 무시 */ }
    G.save.pause(true); // 이 기기에서 더 진행되어 기록이 엇갈리지 않게 저장 멈춤
    if (sessionOff) { sessionOff(); sessionOff = null; }
    st.user = null; userRef = null;
    try { await api.auth.signOut(auth); } catch (e) { /* 무시 */ }
    state('kicked', { conflict: null });
    G.emit('cloud:kicked', {});
  }

  const cloud = G.cloud = {
    SDK, META_KEY, BACKUP_KEY, _decide: decide, _accountId: accountId, _validAccountId: validAccountId, _accountEmail: accountEmail,
    view: publicState,
    // 관리자: 이 기기에서 관리자 아이디로 로그인했고, 지금 그 계정으로 로그인돼 있을 때만
    isAdmin: () => { const a = readJSON(ADMIN_KEY); return !!(a && st.user && a.uid === st.user.uid); },
    // 멀티플레이(net.js)용: 로그인했을 때만 DB 접근을 빌려준다
    _fb: () => (api && db && st.user && auth && auth.currentUser ? { db: api.db, ref: db, uid: st.user.uid } : null),
    async init() {
      if (initialized) return; initialized = true; st.configured = configured();
      if (!st.configured || typeof document === 'undefined') { state(st.configured ? 'signed-out' : 'unconfigured'); return; }
      state('loading');
      try {
        const base = `https://www.gstatic.com/firebasejs/${SDK}/firebase-`;
        const [appApi, authApi, dbApi] = await Promise.all([import(base + 'app.js'), import(base + 'auth.js'), import(base + 'database.js')]);
        api = { app: appApi, auth: authApi, db: dbApi };
        const app = appApi.initializeApp(G.FIREBASE_CONFIG);
        auth = authApi.getAuth(app); db = dbApi.getDatabase(app);
        try { await authApi.setPersistence(auth, authApi.browserLocalPersistence); } catch (e) { /* 세션 내 로그인은 계속 가능 */ }
        authApi.onAuthStateChanged(auth, (user) => handleUser(user));
        try { await authApi.getRedirectResult(auth); } catch (e) { fail(e); }
      } catch (e) {
        // 인터넷이 없거나 SDK를 받지 못함: 게임은 그대로, 계정 기능만 잠시 쉰다
        initialized = false; api = null;
        state('offline', { error: '' });
        if (typeof addEventListener !== 'undefined') addEventListener('online', () => cloud.init(), { once: true });
      }
    },
    async register(id, password, characterName) {
      id = accountId(id); characterName = String(characterName || '').trim();
      const local = localCopy();
      // 이미 플레이 중인 이용자는 회원가입 입력으로 기존 캐릭터 이름이 바뀌지 않는다.
      if (local.established) characterName = local.summary.name;
      if (!validAccountId(id)) return fail(new Error('아이디는 영문 소문자·숫자·밑줄로 4~20자여야 해요.'));
      if (String(password || '').length < 8) return fail(new Error('비밀번호는 8자 이상으로 정해 주세요.'));
      if (!characterName || characterName.length > 8) return fail(new Error('캐릭터 이름은 1~8자로 정해 주세요.'));
      if (!st.configured) return fail(new Error('Firebase 설정이 아직 끝나지 않았어요.'));
      if (!auth) { await cloud.init(); if (!auth) return; }
      pendingCharacterName = characterName; state('registering');
      try {
        const result = await api.auth.createUserWithEmailAndPassword(auth, accountEmail(id), password);
        if (pendingCharacterName) { G.player.name = pendingCharacterName; pendingCharacterName = ''; }
        return result;
      }
      catch (e) { pendingCharacterName = ''; fail(e); }
    },
    async login(id, password) {
      id = accountId(id);
      if (!validAccountId(id)) return fail(new Error('아이디는 영문 소문자·숫자·밑줄로 4~20자여야 해요.'));
      if (!password) return fail(new Error('비밀번호를 입력해 주세요.'));
      G.save.pause(false); // 다른 기기 때문에 로그아웃됐던 기기도 다시 로그인하면 저장 재개
      if (!st.configured) return fail(new Error('Firebase 설정이 아직 끝나지 않았어요.'));
      if (!auth) { await cloud.init(); if (!auth) return fail(new Error('로그인 서버에 연결하지 못했어요. 인터넷 연결을 확인하고, 카카오톡 같은 앱 안 브라우저라면 크롬·사파리로 열어 주세요.')); }
      state('signing-in');
      try {
        const result = await api.auth.signInWithEmailAndPassword(auth, accountEmail(id), password);
        // 관리자 계정 표시(아이디는 공개 코드에 남기지 않고 지문으로만 비교)
        if (G.u.fnv1a('mongle-admin:' + id) === ADMIN_FP) writeJSON(ADMIN_KEY, { uid: result.user.uid }); 
        return await waitForUser(result.user.uid) ? result : undefined;
      }
      catch (e) { fail(e); }
    },
    async signInGoogle() {
      if (!st.configured) return fail(new Error('Firebase 설정이 아직 끝나지 않았어요.'));
      if (!auth) { await cloud.init(); if (!auth) return; }
      state('signing-in'); G.save.pause(false);
      const provider = new api.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const result = await api.auth.signInWithPopup(auth, provider);
        return await waitForUser(result.user.uid) ? result : undefined;
      } catch (e) { fail(e); }
    },
    async linkGoogle() {
      if (!auth || !auth.currentUser) return fail(new Error('먼저 아이디로 로그인해 주세요.'));
      const provider = new api.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
      state('linking-google');
      try {
        const result = await api.auth.linkWithPopup(auth.currentUser, provider);
        await handleUser(result.user); return result;
      } catch (e) { fail(e); }
    },
    async signOut() { if (sessionOff) { sessionOff(); sessionOff = null; } if (auth) await api.auth.signOut(auth); },
    // 로그아웃 + 이 기기 마을 지우기: 먼저 서버에 저장(실패하면 force일 때만 진행)
    async logoutClear(force) {
      let ok = false;
      try { G.save.now('logout'); ok = await upload(false); } catch (e) { ok = false; }
      if (!ok && st.phase === 'synced') ok = true;
      if (!ok && !force) return { ok: false };
      if (sessionOff) { sessionOff(); sessionOff = null; }
      try { if (auth) await api.auth.signOut(auth); } catch (e) { /* 무시 */ }
      G.save.pause(true); // 지우는 동안 다시 저장되지 않게
      G.save.wipe();
      try { G.store.removeItem(META_KEY); G.store.removeItem(BACKUP_KEY); G.store.removeItem('mg.admin'); } catch (e) { /* 무시 */ }
      if (typeof location !== 'undefined' && location.reload) location.reload();
      return { ok: true };
    },
    async retry() { if (st.user) await handleUser(auth.currentUser); else if (auth) state('signed-out'); else { initialized = false; await cloud.init(); } },
    async resolve(which) {
      if (!st.conflict) return;
      if (which === 'remote') await applyRemote(st.conflict.remote, 'conflict-choice');
      else if (which === 'local') {
        const oldRemote = st.conflict.remote;
        storeBackup({ payload: oldRemote.payload, fingerprint: oldRemote.fingerprint, summary: oldRemote.summary, established: true }, 'remote-before-overwrite');
        state('ready'); await upload(true);
      }
    },
    async restoreBackup() {
      const b = readJSON(BACKUP_KEY); if (!b || !b.payload) return false;
      const parsed = G.save.parseImport(b.payload); if (!parsed.ok) return fail(new Error('백업이 손상되어 복구하지 않았어요.'));
      const current = localCopy(); storeBackup(current, 'before-restore');
      const r = G.save.importEnv(parsed.env); if (!r.ok) return fail(new Error(r.err || '백업을 복구하지 못했어요.'));
      const m = meta(); writeJSON(META_KEY, { deviceId, uid: m.uid || '', baseRevision: 0, baseFingerprint: '', lastSyncAt: 0 });
      if (typeof location !== 'undefined' && location.reload) location.reload(); return true;
    },
    flush() { clearTimeout(uploadTimer); uploadTimer = 0; return upload(false); },
  };

  G.on('save:done', () => { if (!applyingRemote) scheduleUpload(); });
  G.modules.add('cloud');
})(globalThis.G);
