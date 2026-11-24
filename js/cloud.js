// 무료 Firebase Spark 기반 계정 연결·클라우드 세이브.
// 로컬 A/B 세이브를 항상 유지하고, 양쪽이 모두 바뀐 경우에는 자동 덮어쓰지 않는다.
(function (G) {
  'use strict';
  const SDK = '13.4.0';
  const META_KEY = 'mg.cloud.meta';
  const BACKUP_KEY = 'mg.cloud.backup';
  const REQUIRED_CONFIG = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  const WAIT = new Set(['loading', 'checking', 'signing-in', 'redirecting', 'syncing', 'reloading']);
  let api = null, auth = null, db = null, userRef = null;
  let initialized = false, applyingRemote = false, uploadTimer = 0, authRun = 0;
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
      'auth/unauthorized-domain': '이 주소가 Firebase 로그인 허용 주소에 등록되지 않았어요.',
      'PERMISSION_DENIED': '클라우드 저장 권한이 없어요. Database Rules를 확인해 주세요.',
    };
    st.phase = 'error'; st.error = known[raw] || known[err && err.code] || raw; emit(); G.emit('cloud:error', { message: st.error });
  }

  // 마지막 동기화 지문을 기준으로 한 순수 충돌 판정(자동 검증에서도 사용).
  function decide(localFingerprint, established, remote, m, uid) {
    if (!remote) return established ? 'upload' : 'wait-local';
    if (remote.fingerprint === localFingerprint) return 'same';
    if (!established) return 'remote';
    if (!m || m.uid !== uid || !m.baseFingerprint) return 'conflict';
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
  async function handleUser(user) {
    const run = ++authRun;
    if (!user) { userRef = null; state('signed-out', { user: null, conflict: null }); return; }
    // Google 이름·이메일·사진은 게임 상태에 보관하지 않는다. 인증에는 내부 uid만 사용한다.
    st.user = { uid: user.uid };
    state('checking', { user: st.user, conflict: null });
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

  const cloud = G.cloud = {
    SDK, META_KEY, BACKUP_KEY, _decide: decide,
    view: publicState,
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
      } catch (e) { fail(e); }
    },
    async signIn() {
      if (!st.configured) return fail(new Error('Firebase 설정이 아직 끝나지 않았어요.'));
      if (!auth) { await cloud.init(); if (!auth) return; }
      state('signing-in');
      const provider = new api.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
      try { await api.auth.signInWithPopup(auth, provider); }
      catch (e) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
          state('redirecting'); await api.auth.signInWithRedirect(auth, provider);
        } else fail(e);
      }
    },
    async signOut() { if (auth) await api.auth.signOut(auth); },
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
