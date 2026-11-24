// UI (DOM): HUD, 버튼, 대화창(타자기 32자/초 + 옹알이), 토스트, 획득 팝업, 잎첩(가방·도감·할 일·설정), 상점
(function (G) {
  'use strict';
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAMES = { ddalang: '딸랑', bori: '보리 할멈', todak: '토닥', tosil: '토실', kongal: '콩알', sogeum: '소금', lime: '라임', slowpoke: '느림보 박사', jjongal: '쫑알', danchu: '단추', hotteok: '호떡', mungchi: '뭉치', mongsil: '몽실', danpung: '단풍', sys: '' };
  const NAMECOL = { ddalang: '#ff8fb1', bori: '#c98e5a', todak: '#8a7366', tosil: '#b48aa6', kongal: '#8fb4ff', sogeum: '#6fa8c9', lime: '#9bc94a', slowpoke: '#7fae7a', jjongal: '#e09a56', danchu: '#46546a', hotteok: '#b07a4e', mungchi: '#e8a868', mongsil: '#a68ee0', danpung: '#d0702c' };

  const UI = G.ui = { root: null, open: null };
  let hud = {}, toastBox, dialogEl, popEl, modalEl;

  UI.init = () => {
    const root = UI.root = document.getElementById('ui');
    // HUD
    const top = $('div', 'hud-top');
    hud.time = $('div', 'hud-time'); hud.money = $('div', 'hud-money');
    top.append(hud.time, hud.money);
    hud.menu = $('button', 'btn-round btn-menu', '🍃'); hud.menu.title = '잎첩 (Tab)';
    hud.menu.onclick = () => { press(hud.menu); G.input.emit('menu'); };
    hud.map = $('button', 'btn-round btn-map', '🗺️'); hud.map.title = '지도 (M)';
    hud.map.onclick = () => { press(hud.map); G.input.emit('map'); };
    hud.chat = $('button', 'btn-round btn-chat hidden', '💬'); hud.chat.title = '채팅 (T)';
    hud.chat.onclick = () => { press(hud.chat); UI.chat(); };
    top.append(hud.map, hud.menu);
    hud.log = $('div', 'chatlog'); root.append(hud.log);
    G.on('net:change', () => UI.refreshNet());
    G.on('net:chat', () => showLog());
    // 지금 할 일 (누르면 지도)
    hud.goal = $('button', 'hud-goal'); hud.goal.onclick = () => { press(hud.goal); G.input.emit('map'); };
    root.append(hud.goal);
    setInterval(() => UI.refreshGoal(), 1000);
    root.append(top);
    // 오른쪽 아래: 액션·도구
    const br = $('div', 'hud-br');
    hud.tool = $('button', 'btn-round btn-tool'); hud.tool.title = '도구 바꾸기 (Q)';
    hud.tool.onclick = () => { press(hud.tool); G.input.emit('tool'); };
    hud.act = $('button', 'btn-act', '<span class="act-ico">✋</span><span class="act-lbl"></span>'); hud.act.title = '행동 (Space)';
    hud.act.addEventListener('pointerdown', (e) => { e.preventDefault(); press(hud.act); G.input.emit('act'); });
    br.append(hud.chat, hud.tool, hud.act);
    root.append(br);
    hud.target = $('div', 'hud-target'); root.append(hud.target);
    hud.stick = $('div', 'stick', '<div class="nub"></div>'); root.append(hud.stick);
    hud.hint = $('div', 'hud-hint'); root.append(hud.hint);
    toastBox = $('div', 'toasts'); root.append(toastBox);
    popEl = $('div', 'itempop hidden'); root.append(popEl);
    dialogEl = $('div', 'dialog hidden', '<div class="dlg-name"></div><div class="dlg-text"></div><div class="dlg-next">▼</div><div class="dlg-choices"></div>');
    root.append(dialogEl); bindDialogTap();
    modalEl = $('div', 'modal hidden'); root.append(modalEl);
    UI.hud(false);
    G.on('wallet:change', (p) => { UI.refreshHud(); if (p.delta) bump(hud.money); });
    G.on('time:minute', () => UI.refreshHud());
    G.on('save:fail', () => UI.toast('저장 공간이 부족해요. 설정에서 내보내기를 해 주세요.', { icon: '⚠️' }));
    G.on('save:future', () => UI.toast('더 새로운 버전의 세이브예요. 새로고침해 주세요. (읽기 전용)', { icon: '⚠️' }));
    G.on('cloud:state', () => {
      const pane = UI.open && UI.open.body.querySelector('.pane[data-settings="1"]');
      if (pane) setPane(pane);
    });
    G.on('cloud:error', (p) => UI.toast(p.message || '계정 연결을 확인해 주세요.', { icon: '☁️', ms: 4500 }));
    // 다른 기기에서 로그인 → 이 기기는 로그아웃 (닫을 수 없는 안내)
    G.on('cloud:kicked', () => {
      if (UI.open) UI.open.close();
      G.input.lock('kicked');
      const box = $('div', 'kicked', '<div class="kbox"><div class="kico">📱💻</div><b>다른 기기에서 접속했어요</b><p>이 기기는 마지막 진행을 서버에 저장하고 로그아웃했어요.<br>여기서 계속하려면 다시 로그인해 주세요. 다른 기기가 로그아웃돼요.</p></div>');
      const again = $('button', 'btn big', '이 기기에서 다시 로그인');
      again.onclick = () => { UI.account('login', () => { box.remove(); G.input.unlock('kicked'); }); };
      box.firstChild.append(again);
      UI.root.append(box);
    });
  };
  function press(el) { el.classList.remove('pressed'); void el.offsetWidth; el.classList.add('pressed'); G.audio.sfx('tap'); }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  // 도구 아이콘 HTML (맨손만 이모지)
  UI.toolIcon = (t, cls = 'ti-img') => t === 'hand' ? '✋' : `<img class="${cls}" src="${G.art.iconURL('tool:' + t, 64)}" alt="">`;
  UI.hud = (on) => { UI.root.classList.toggle('hud-on', !!on); };
  let lastGoal = '';
  UI.refreshGoal = () => {
    if (!hud.goal) return;
    const o = G.map && G.map.objective && G.map.objective();
    const txt = o ? o.text : '';
    if (txt === lastGoal) return; lastGoal = txt;
    hud.goal.innerHTML = txt ? `<span>📌</span>${esc(txt)}` : '';
    hud.goal.classList.toggle('on', !!txt);
  };
  UI.refreshHud = () => {
    if (!G.time || !hud.time) return;
    const l = G.time.label(), w = G.weather.now();
    const ico = w.type === 'clear' && G.time.isNight() ? '🌙' : G.weather.ICON[w.type];
    hud.time.innerHTML = `<b>${l.date}</b><span>${ico} ${l.clock}</span>`;
    hud.time.title = `마을 하루 = 실제 24분 · 다음 아침까지 약 ${G.time.minsToMorning()}분`;
    hud.money.innerHTML = `<i class="coin"></i>${G.fmt.num(G.wallet.get())}`;
    const tool = G.player ? G.player.tool : 'hand';
    if (G.house && G.house.inside) hud.tool.innerHTML = '<span>🛋️</span><small>꾸미기</small>';
    else hud.tool.innerHTML = `<span>${UI.toolIcon(tool, 'tool-img')}</span><small>${G.TOOLS[tool].name}</small>`;
  };
  // 액션 버튼 라벨 (대상 미리보기)
  let lastAct = '';
  UI.setAction = (icon, label, target) => {
    const k = icon + label + (target || '');
    if (k === lastAct) return; lastAct = k;
    const ai = hud.act.querySelector('.act-ico');
    if (icon.startsWith('tool:')) ai.innerHTML = UI.toolIcon(icon.slice(5), 'act-img'); else ai.textContent = icon;
    hud.act.querySelector('.act-lbl').textContent = label;
    hud.target.textContent = target || ''; hud.target.classList.toggle('on', !!target);
  };
  UI.drawStick = (s) => {
    if (!s) { hud.stick.style.display = 'none'; return; }
    hud.stick.style.display = 'block';
    hud.stick.style.left = s.ox + 'px'; hud.stick.style.top = s.oy + 'px';
    hud.stick.firstChild.style.transform = `translate(${s.x - s.ox}px, ${s.y - s.oy}px)`;
  };
  UI.hint = (text) => { hud.hint.textContent = text || ''; hud.hint.classList.toggle('on', !!text); };

  // ---------- 토스트 ----------
  UI.toast = (text, o = {}) => {
    const t = $('div', 'toast', (o.icon ? `<span class="ti">${o.icon}</span>` : '') + esc(text));
    toastBox.append(t);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => t.classList.add('out'), o.ms || 2200);
    setTimeout(() => t.remove(), (o.ms || 2200) + 400);
  };

  // ---------- 획득 팝업 ----------
  let popTimer = 0;
  UI.itemPop = (id, x, msg, short) => {
    clearTimeout(popTimer);
    const it = G.items.get(id) || { name: id };
    const nm = G.items.name(id, x);
    popEl.innerHTML = `<div class="pop-ico"><img src="${G.art.iconURL(G.items.icon(id, x), 96)}" alt=""></div><div class="pop-txt"><b>${esc(msg || G.josa(nm, '을/를') + ' 얻었다!')}</b>${x && x.size ? `<span>${x.size}cm${x.v ? ' · ' + (x.v === 5 ? '계절빛' : G.VARIANTS[x.v].name) + '!' : ''}</span>` : ''}${x && x.newSp ? '<em>도감에 새로 등록!</em>' : ''}</div>`;
    popEl.className = 'itempop' + (x && x.v ? ' is-giant' : '') + (it.ref && it.ref.tier >= 3 ? ' rare' : '');
    popTimer = setTimeout(() => popEl.classList.add('hidden'), short ? 900 : 2000);
  };

  // ---------- 대화창 ----------
  let dlg = null;
  UI.say = (lines) => new Promise((resolve) => {
    G.input.lock('dialog');
    dlg = { lines, i: 0, resolve, shown: 0, full: false, t: 0 };
    dialogEl.classList.remove('hidden');
    G.audio.sfx('open');
    showLine();
  });
  UI.choose = (line, options) => new Promise((resolve) => {
    G.input.lock('dialog');
    dlg = { lines: [line], i: 0, resolve: () => {}, shown: 0, full: false, t: 0, choices: options, pick: resolve };
    dialogEl.classList.remove('hidden');
    showLine();
  });
  UI.dialogOpen = () => !!dlg;
  function showLine() {
    const l = dlg.lines[dlg.i];
    const who = l.who || 'sys';
    const nm = l.name !== undefined ? l.name : NAMES[who] || '';
    const ne = dialogEl.querySelector('.dlg-name');
    ne.textContent = nm; ne.style.background = NAMECOL[who] || '#9aa'; ne.style.display = nm ? '' : 'none';
    dlg.text = l.text; dlg.shown = 0; dlg.full = false; dlg.who = who;
    dialogEl.querySelector('.dlg-text').textContent = '';
    dialogEl.querySelector('.dlg-choices').innerHTML = '';
    dialogEl.querySelector('.dlg-next').style.visibility = 'hidden';
  }
  UI.updateDialog = (dt) => {
    if (!dlg || dlg.full) return;
    const speed = (G.settings.get('textSpeed') || 32) * (dlg.who === 'slowpoke' ? 0.6 : 1); // 박사는 느리게
    const before = Math.floor(dlg.shown);
    dlg.shown = speed >= 999 ? dlg.text.length : dlg.shown + speed * dt;
    const n = Math.min(dlg.text.length, Math.floor(dlg.shown));
    for (let i = before; i < n; i++) G.audio.voice(dlg.who, dlg.text[i], i);
    dialogEl.querySelector('.dlg-text').textContent = dlg.text.slice(0, n);
    if (n >= dlg.text.length) finishLine();
  };
  function finishLine() {
    dlg.full = true;
    dialogEl.querySelector('.dlg-text').textContent = dlg.text;
    if (dlg.choices) {
      const box = dialogEl.querySelector('.dlg-choices');
      dlg.choices.forEach((c, i) => { const b = $('button', 'choice', esc(c)); b.onclick = (e) => { e.stopPropagation(); const d = dlg; closeDialog(); G.audio.sfx('tap'); d.pick(i); }; box.append(b); });
    } else dialogEl.querySelector('.dlg-next').style.visibility = 'visible';
  }
  function advance() {
    if (!dlg) return;
    if (!dlg.full) { finishLine(); return; }
    if (dlg.choices) return;
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { const d = dlg; closeDialog(); d.resolve(); return; }
    G.audio.sfx('tap'); showLine();
  }
  function closeDialog() { dlg = null; dialogEl.classList.add('hidden'); G.input.unlock('dialog'); G.audio.sfx('close'); }
  UI.dialogInput = (ev) => {
    if (!dlg) return false;
    if (ev.type === 'act' || ev.type === 'tapWorld' || ev.type === 'back') advance();
    return true;
  };
  function bindDialogTap() { dialogEl.addEventListener('pointerdown', (e) => { e.preventDefault(); advance(); }); }

  // ---------- 모달 (잎첩·상점·설정) ----------
  UI.modal = (title, build, o = {}) => new Promise((resolve) => {
    G.input.lock('modal');
    modalEl.innerHTML = '';
    const card = $('div', 'sheet' + (o.wide ? ' wide' : ''));
    const head = $('div', 'sheet-head', `<h2>${esc(title)}</h2>`);
    const x = $('button', 'btn-x', '✕'); x.onclick = () => close();
    head.append(x); card.append(head);
    const body = $('div', 'sheet-body'); card.append(body);
    modalEl.append(card); modalEl.classList.remove('hidden');
    G.audio.sfx('open');
    const close = (r) => { if (UI._previewStop) { UI._previewStop(); UI._previewStop = null; } modalEl.classList.add('hidden'); modalEl.innerHTML = ''; G.input.unlock('modal'); UI.open = null; G.audio.sfx('close'); resolve(r); };
    UI.open = { close, body, card, head };
    // 배경을 '직접 눌렀다 뗄 때'만 닫는다 (창을 연 탭의 뒤따르는 클릭이 배경에 떨어져 바로 닫히던 문제)
    const openedAt = performance.now(); let downOnBg = false;
    modalEl.onpointerdown = (e) => { downOnBg = e.target === modalEl && performance.now() - openedAt > 250; };
    modalEl.onclick = (e) => { if (e.target === modalEl && downOnBg) close(); downOnBg = false; };
    build(body, close, card);
  });
  UI.modalInput = (ev) => {
    if (!UI.open) return false;
    if (ev.type === 'back' || ev.type === 'menu' || ev.type === 'map') UI.open.close();
    return true;
  };
  UI.confirm = (msg, yes = '네', no = '아니요') => new Promise((resolve) => {
    const box = $('div', 'confirm', `<p>${esc(msg)}</p>`);
    const row = $('div', 'row');
    const by = $('button', 'btn', esc(yes)), bn = $('button', 'btn ghost', esc(no));
    by.onclick = () => { box.remove(); resolve(true); }; bn.onclick = () => { box.remove(); resolve(false); };
    row.append(bn, by); box.append(row);
    (UI.open ? UI.open.card : UI.root).append(box);
  });

  function accountForm(initialMode, close, onSuccess) {
    const wrap = $('div', 'accountbox'); let mode = initialMode === 'signup' ? 'signup' : 'login';
    const input = (placeholder, type, max) => {
      const el = $('input'); el.placeholder = placeholder; el.type = type || 'text'; if (max) el.maxLength = max;
      el.autocomplete = type === 'password' ? (mode === 'signup' ? 'new-password' : 'current-password') : 'username';
      el.autocapitalize = 'none'; el.spellcheck = false; return el;
    };
    const render = () => {
      wrap.innerHTML = '';
      const tabs = $('div', 'accounttabs');
      const loginTab = $('button', 'btn small' + (mode === 'login' ? '' : ' ghost'), '로그인');
      const signupTab = $('button', 'btn small' + (mode === 'signup' ? '' : ' ghost'), '회원가입');
      loginTab.onclick = () => { mode = 'login'; render(); }; signupTab.onclick = () => { mode = 'signup'; render(); };
      tabs.append(loginTab, signupTab); wrap.append(tabs);
      const note = $('div', 'muted small', mode === 'signup'
        ? '실제 이메일은 받지 않아요. 아이디와 비밀번호를 잊으면 자동 복구할 수 없으니 꼭 따로 적어 두세요.'
        : '가입할 때 만든 아이디와 비밀번호를 입력해 주세요.');
      const form = $('form', 'accountform');
      const id = input('아이디 (영문·숫자·밑줄 4~20자)', 'text', 20);
      const pw = input('비밀번호 (8자 이상)', 'password', 72);
      form.append(id, pw);
      let pw2 = null, character = null;
      if (mode === 'signup') {
        pw2 = input('비밀번호 확인', 'password', 72);
        character = input('캐릭터 이름 (최대 8자)', 'text', 8); character.value = G.player.name || '';
        if (G.player.name && G.player.town) {
          character.readOnly = true; character.title = '기존 마을의 캐릭터 이름을 그대로 연결해요.';
        }
        character.autocapitalize = 'sentences'; form.append(pw2, character);
        if (character.readOnly) form.append($('div', 'muted small', `현재 마을의 「${esc(G.player.name)}」 이름을 그대로 연결해요.`));
      }
      const error = $('div', 'cloud-error small');
      const submit = $('button', 'btn big', mode === 'signup' ? '계정 만들기' : '로그인'); submit.type = 'submit';
      form.append(error, submit); wrap.append(note, form);
      form.onsubmit = async (e) => {
        e.preventDefault(); error.textContent = '';
        if (mode === 'signup' && pw.value !== pw2.value) { error.textContent = '비밀번호 확인이 맞지 않아요.'; pw2.focus(); return; }
        submit.disabled = true; submit.textContent = mode === 'signup' ? '계정 만드는 중…' : '로그인 중…';
        const result = mode === 'signup'
          ? await G.cloud.register(id.value, pw.value, character.value)
          : await G.cloud.login(id.value, pw.value);
        if (result) { close(result); if (onSuccess) onSuccess(mode, result); return; }
        error.textContent = G.cloud.view().error || '계정 연결을 확인해 주세요.';
        submit.disabled = false; submit.textContent = mode === 'signup' ? '계정 만들기' : '로그인';
      };
      if (mode === 'login') {
        const google = $('button', 'btn ghost', 'Google로 로그인 (연결한 계정)');
        google.onclick = async () => {
          error.textContent = ''; google.disabled = true;
          const result = await G.cloud.signInGoogle();
          if (result) { close(result); if (onSuccess) onSuccess('google', result); return; }
          error.textContent = G.cloud.view().error || 'Google 로그인을 확인해 주세요.'; google.disabled = false;
        };
        wrap.append(google);
      }
      setTimeout(() => id.focus(), 0);
    };
    render(); return wrap;
  }
  UI.account = (mode = 'login', onSuccess) => UI.modal('계정 연결', (body, close) => {
    body.append(accountForm(mode, close, onSuccess));
  });

  // 가방 칸 그리드
  function slotGrid(onTap, sel) {
    const grid = $('div', 'grid');
    const slots = G.inv.slots;
    for (let i = 0; i < G.inv.size; i++) {
      const s = slots[i];
      const c = $('button', 'slot' + (s ? '' : ' empty') + (sel && sel.has(i) ? ' sel' : ''));
      if (s) {
        c.innerHTML = `<img src="${G.art.iconURL(G.items.icon(s.id, s.x), 64)}" alt="">${s.n > 1 ? `<b>${s.n}</b>` : ''}${s.x && s.x.v ? `<i class="giant v${s.x.v}">${G.VARIANTS[s.x.v].name}</i>` : ''}`;
        c.onclick = () => onTap(i, s, c);
      }
      grid.append(c);
    }
    return grid;
  }

  // 잎첩: 탭 4개
  UI.notebook = (tab = 'bag') => UI.modal('잎첩', (body, close, card) => {
    const tabs = $('div', 'tabs');
    const TABS = [['bag', '🎒 가방'], ['me', '🪞 나'], ['friends', '👫 친구'], ['dex', '📖 도감'], ['folk', '🐾 이웃'], ['todo', '✅ 할 일'], ['set', '⚙️ 설정']];
    const pane = $('div', 'pane');
    const show = (id) => {
      tab = id; tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === id));
      pane.innerHTML = '';
      if (UI._previewStop) { UI._previewStop(); UI._previewStop = null; }
      ({ bag: bagPane, me: mePane, friends: friendsPane, dex: dexPane, folk: folkPane, todo: todoPane, set: setPane })[id](pane, close);
    };
    for (const [id, nm] of TABS) { const b = $('button', 'tab', nm); b.dataset.t = id; b.onclick = () => { G.audio.sfx('tap'); show(id); }; tabs.append(b); }
    body.append(tabs, pane); show(tab);
    if (Date.now() - (G.settings.get('lastExport') || 0) > 7 * 864e5 && G.time.st.playDays > 1) tabs.querySelector('[data-t=set]').classList.add('badge');
  }, { wide: true });

  // ---------- 꾸미기 (오너 요청: 이름·모습 언제든, 스타일 다양하게) ----------
  // 움직이는 미리보기 캔버스. stop()으로 멈춘다
  UI.lookPreview = (look, size = 180) => {
    const cv = $('canvas', 'cpreview'); cv.width = size * 1.1; cv.height = size * 1.1; cv.style.width = size + 'px'; cv.style.height = size + 'px';
    const g = cv.getContext('2d'), W = cv.width, actor = { species: 'human', look, x: 0, y: 0, dir: 0, tool: 'hand', seed: 0 };
    let raf = 0, pose = 0, turn = 0; const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
      g.fillStyle = '#fff6e6'; g.beginPath(); g.arc(W / 2, W * 0.55, W * 0.44, 0, 6.3); g.fill();
      pose = Math.max(0, pose - 1 / 60); actor.hop = pose > 0 ? Math.sin((1 - pose / 0.35) * Math.PI) * 6 : 0;
      actor.dir = turn > 0 ? [0, 3, 2, 1][Math.floor(t * 1.6) % 4] : 0; turn = Math.max(0, turn - 1 / 60);
      const k = W / 76; g.setTransform(k, 0, 0, k, W / 2, W * 0.91);
      G.art.actor.draw(g, actor, t);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return { el: cv, poke() { pose = 0.35; }, spin() { turn = 2.6; }, stop() { cancelAnimationFrame(raf); } };
  };
  // 항목 고르기 편집기: 분류 탭(얼굴·머리·옷·소품) + 항목마다 칩(색은 동그라미, 모양은 이름)
  UI.lookEditor = (look, onChange) => {
    const L = G.art.LOOK, wrap = $('div', 'looked'), cats = $('div', 'subtabs'), box = $('div', 'lookparts');
    let cat = 'hair';
    const render = () => {
      cats.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === cat));
      box.innerHTML = '';
      for (const pt of L.PARTS.filter((x) => x.cat === cat)) {
        const row = $('div', 'lookpart'); row.append($('b', null, pt.name));
        const chips = $('div', 'chips');
        const n = L.count(pt);
        for (let i = 0; i < n; i++) {
          const cur = (look[pt.k] === undefined ? (L.def()[pt.k] || 0) : look[pt.k]) === i;
          const c = $('button', 'chip' + (pt.colors ? ' sw' : '') + (cur ? ' on' : ''), pt.colors ? '' : esc(pt.names[i]));
          if (pt.colors) { c.style.background = pt.colors[i]; c.setAttribute('aria-label', pt.name + ' ' + (i + 1)); }
          c.onclick = () => { look[pt.k] = i; G.audio.sfx('pop'); onChange && onChange(pt.k); render(); };
          chips.append(c);
        }
        row.append(chips); box.append(row);
      }
    };
    for (const [id, nm] of L.CATS) { const b = $('button', 'tab', nm); b.dataset.c = id; b.onclick = () => { G.audio.sfx('tap'); cat = id; render(); }; cats.append(b); }
    const rnd = $('button', 'tab', '🎲 랜덤'); rnd.onclick = () => { Object.assign(look, L.random()); G.audio.sfx('pop'); onChange && onChange('*'); render(); }; cats.append(rnd);
    wrap.append(cats, box); render();
    return wrap;
  };
  // 잎첩 '나' 탭: 이름·마을 이름·모습을 언제든 무료로 바꾼다
  function mePane(pane) {
    const pl = G.player, look = Object.assign(G.art.LOOK.def(), pl.look || {});
    const pv = UI.lookPreview(look, 150); UI._previewStop = pv.stop;
    const top = $('div', 'mebox'), info = $('div', 'meinfo');
    const nameIn = $('input'); nameIn.maxLength = 8; nameIn.value = pl.name || ''; nameIn.placeholder = '이름 (최대 8자)';
    const townIn = $('input'); townIn.maxLength = 8; townIn.value = pl.town || ''; townIn.placeholder = '마을 이름 (최대 8자)';
    const spin = $('button', 'btn ghost', '🔄'); spin.onclick = () => pv.spin(); spin.title = '돌려 보기';
    info.append($('label', 'muted small', '내 이름'), nameIn, $('label', 'muted small', '마을 이름'), townIn);
    top.append(pv.el, info);
    const ed = UI.lookEditor(look, () => pv.poke());
    const save = $('button', 'btn', '저장 ✨');
    save.onclick = () => {
      const name = nameIn.value.trim(), town = townIn.value.trim();
      if (!name) { nameIn.focus(); nameIn.classList.add('shake'); setTimeout(() => nameIn.classList.remove('shake'), 400); G.audio.sfx('error'); return; }
      const renamed = name !== pl.name;
      pl.look = Object.assign({}, look); pl.name = name; pl.town = town || pl.town || '몽글숲';
      G.save.mark('look'); G.save.now('look'); G.emit('player:look', {});
      G.audio.sfx('chime'); UI.toast(renamed ? `이제 「${name}」(이)라고 불러 줄게요!` : '새 모습 멋져요!', { icon: '🪞' });
      if (G.game && G.game.pl) G.game.pl.squash = 0.12;
    };
    const row2 = $('div', 'row'); row2.append(spin, save); info.append(row2);
    // 미리보기 + 분류 탭은 스크롤해도 위에 붙어 있게
    const stick = $('div', 'mestick'); stick.append(top, ed.firstChild);
    pane.append(stick, ed, $('div', 'muted small', '언제든 다시 바꿀 수 있어요. 돈은 들지 않아요.'));
  }

  // ---------- 멀티플레이 UI (친구 탭 · 채팅 · 선물) ----------
  UI.refreshNet = () => {
    if (!hud.chat) return;
    const on = G.net && G.net.active;
    hud.chat.classList.toggle('hidden', !on);
    if (!on) { closeChat(); hud.log.innerHTML = ''; }
    const pane = UI.open && UI.open.body.querySelector('.pane[data-friends="1"]');
    if (pane) friendsPane(pane);
  };
  let logSeen = new Set();
  function showLog() {
    const N = G.net; if (!N) return;
    for (const m of N.chat.slice(-4)) {
      if (logSeen.has(m.id)) continue; logSeen.add(m.id);
      const row = $('div', 'chatline', `<b>${esc(m.name)}</b> ${esc(m.text)}`);
      hud.log.append(row); while (hud.log.children.length > 4) hud.log.firstChild.remove();
      setTimeout(() => row.classList.add('fade'), 7000); setTimeout(() => row.remove(), 8000);
    }
    if (chatEl) renderChatLog();
  }
  let chatEl = null;
  function renderChatLog() {
    const box = chatEl && chatEl.querySelector('.chatfull'); if (!box) return;
    box.innerHTML = G.net.chat.slice(-30).map((m) => `<div class="chatline${G.cloud._fb() && m.uid === G.cloud._fb().uid ? ' me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('') || '<div class="muted small">아직 대화가 없어요. 인사해 볼까요? 👋</div>';
    box.scrollTop = box.scrollHeight;
  }
  function closeChat() { if (chatEl) { chatEl.remove(); chatEl = null; G.input.unlock('chat'); } }
  UI.chat = () => {
    if (!G.net || !G.net.active) return;
    if (chatEl) { closeChat(); return; }
    chatEl = $('div', 'chatbar');
    const full = $('div', 'chatfull'); chatEl.append(full);
    const row = $('div', 'chatrow');
    const inp = $('input'); inp.maxLength = 60; inp.placeholder = '말하기 (60자)'; inp.enterKeyHint = 'send';
    const send = $('button', 'btn small', '보내기');
    const x = $('button', 'btn small ghost', '✕');
    const go = async () => { const v = inp.value; if (!v.trim()) return; if (await G.net.say(v)) { inp.value = ''; } };
    send.onclick = go; x.onclick = closeChat;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') { e.preventDefault(); closeChat(); } e.stopPropagation(); });
    row.append(inp, send, x); chatEl.append(row);
    const em = $('div', 'emotes');
    for (const [ico, text] of G.net.EMOTES) { const b = $('button', 'emote', ico); b.title = text; b.onclick = () => G.net.say(ico + ' ' + text); em.append(b); }
    chatEl.append(em);
    inp.onfocus = () => G.input.lock('chat'); inp.onblur = () => G.input.unlock('chat');
    UI.root.append(chatEl);
    renderChatLog();
    if (!G.input.isTouch()) setTimeout(() => inp.focus(), 50);
  };
  // 친구에게 선물: 가방에서 하나 골라 보낸다
  UI.giftTo = (o) => UI.modal(`${o.name}에게 선물하기`, (body, close) => {
    body.append($('div', 'pane-head', '<span>줄 물건을 눌러요 (한 개씩 보내요)</span>'));
    body.append(slotGrid(async (i) => { const ok = await G.net.gift(o.uid, i, 1); if (ok) close(); }));
  });
  async function friendsPane(pane) {
    pane.dataset.friends = '1'; pane.innerHTML = '';
    const N = G.net;
    if (!N || !N.ready()) {
      pane.append($('div', 'slot-info', '친구와 함께 놀려면 먼저 <b>계정 연결(로그인)</b>이 필요해요.<br>로그인하면 가입한 친구들 목록이 보이고, 서로 마을에 놀러 갈 수 있어요.'));
      const b = $('button', 'btn', '로그인 / 회원가입'); b.onclick = () => UI.account('login', () => setTimeout(() => UI.notebook('friends'), 1200)); pane.append(b);
      return;
    }
    const top = $('div', 'netbox');
    let code = '…'; try { code = await N.myCode(); } catch (e) { code = '?'; if (/PERMISSION/i.test(String(e && (e.code || e.message)))) { pane.append($('div', 'slot-info', '친구 기능을 쓰려면 서버 설정(규칙) 업데이트가 필요해요. 관리자에게 알려 주세요!')); return; } }
    top.innerHTML = `<div><small class="muted">내 친구 코드</small><div class="mycode">${esc(code)}</div></div>`;
    // 상태: 내 마을 열기 / 친구 마을에 있음
    if (N.mode === 'guest') {
      top.append($('div', 'netstate', `🧳 지금 <b>${esc(N.hostName)}</b>의 마을에 놀러 와 있어요 · 함께 ${N.count() + 1}명`));
      const home = $('button', 'btn', '🏡 집으로 돌아가기'); home.onclick = async () => { await N.home(); UI.open && UI.open.close(); }; top.append(home);
    } else if (N.mode === 'host') {
      top.append($('div', 'netstate', `🟢 내 마을 문이 열려 있어요 · 손님 ${N.count()}명`));
      const cl = $('button', 'btn ghost', '🚪 마을 문 닫기'); cl.onclick = async () => { await N.close(); friendsPane(pane); }; top.append(cl);
      for (const o of Object.values(N.others)) { const r = $('div', 'personrow', `<span>🧑 <b>${esc(o.name)}</b></span>`); const k = $('button', 'btn small ghost', '내보내기'); k.onclick = async () => { if (await UI.confirm(`${o.name}를 집으로 돌려보낼까요?`, '돌려보내기', '아니요')) { await N.kick(o.uid); friendsPane(pane); } }; r.append(k); top.append(r); }
    } else {
      const op = $('button', 'btn', '🚪 내 마을 열기 (친구가 놀러 올 수 있게)');
      op.onclick = async () => { try { await N.open(); friendsPane(pane); } catch (e) { UI.toast(e.message, { icon: '⚠️' }); } };
      top.append(op);
    }
    pane.append(top);
    // 친구 목록
    const list = $('div', 'netlist');
    const head = $('div', 'pane-head', '<span>👫 가입한 사람들 — 골라서 친구 추가하거나 놀러 가요</span>');
    const rf = $('button', 'btn small ghost', '새로고침'); rf.onclick = () => friendsPane(pane); head.append(rf);
    pane.append(head, list);
    list.innerHTML = '<div class="muted small">불러오는 중…</div>';
    let people = [];
    try { people = await N.people(); } catch (e) { list.innerHTML = '<div class="muted small">목록을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.</div>'; }
    if (people.length || !list.querySelector('.muted')) list.innerHTML = '';
    for (const p of people) {
      const r = $('div', 'personrow' + (p.friend ? ' friend' : ''), `<span>${p.open ? '🟢' : '⚪'} <b>${esc(p.name)}</b> <small class="muted">${esc(p.town)}${p.friend ? ' · 친구' : ''}</small></span>`);
      const btns = $('div', 'row');
      if (!p.friend) { const a = $('button', 'btn small', '＋ 친구'); a.onclick = () => { N.addFriend(p); friendsPane(pane); }; btns.append(a); }
      if (p.open && N.mode !== 'host') { const v = $('button', 'btn small', '놀러 가기'); v.onclick = async () => { try { await N.visit(p.code); UI.open && UI.open.close(); } catch (e) { UI.toast(e.message, { icon: '⚠️', ms: 3500 }); } }; btns.append(v); }
      r.append(btns); list.append(r);
    }
    if (!people.length && !list.innerHTML) list.append($('div', 'muted small', '아직 다른 가입자가 없어요. 친구에게 몽글숲을 알려 주세요!'));
    // 코드로 찾기
    const cf = $('div', 'row wrap');
    const ci = $('input', 'codein'); ci.placeholder = '친구 코드 6자리'; ci.maxLength = 8;
    const cb = $('button', 'btn small', '코드로 놀러 가기');
    cb.onclick = async () => { try { await N.visit(ci.value); UI.open && UI.open.close(); } catch (e) { UI.toast(e.message, { icon: '⚠️', ms: 3500 }); } };
    cf.append(ci, cb);
    pane.append($('div', 'pane-head', '<span>🔑 친구 코드로 찾기</span>'), cf);
    pane.append($('div', 'muted small', '🟢 = 지금 마을 문을 열어 둔 사람 · 다른 사람에게는 캐릭터 이름과 마을 이름만 보여요.'));
  }

  function bagPane(pane) {
    const info = $('div', 'slot-info', '<span class="muted">칸을 누르면 자세히 볼 수 있어요.</span>');
    const render = () => {
      pane.innerHTML = '';
      const head = $('div', 'pane-head', `<span>${G.inv.slots.length} / ${G.inv.size}칸</span>`);
      const sortB = $('button', 'btn small ghost', '정리'); sortB.onclick = () => { G.inv.sort(); G.audio.sfx('tap'); render(); };
      head.append(sortB);
      const tools = $('div', 'toolrow');
      for (const t of G.player.tools) { const b = $('button', 'chip' + (G.player.tool === t ? ' on' : ''), `${UI.toolIcon(t)} ${G.TOOLS[t].name}`); b.onclick = () => { G.player.setTool(t); render(); }; tools.append(b); }
      pane.append(head, tools, slotGrid((i, s) => {
        const it = G.items.get(s.id);
        const p = G.items.sellPrice(s.id, s.x);
        info.innerHTML = `<b>${esc(G.items.name(s.id, s.x))}</b>${s.x && s.x.size ? ` · ${s.x.size}cm` : ''}${s.n > 1 ? ` × ${s.n}` : ''}<br><span class="muted">${it.nosell ? '팔 수 없는 물건' : '가판대 판매가 ' + G.fmt.money(p)}</span>`;
        G.audio.sfx('tap');
      }), info);
    };
    render();
  }

  function dexPane(pane) {
    const kinds = [['bug', '곤충', 'bugs'], ['fish', '물고기', 'fish'], ['sea', '바다', 'sea'], ['fossil', '화석', 'fossils']];
    let k = 'bug';
    const render = () => {
      pane.innerHTML = '';
      const sub = $('div', 'subtabs');
      for (const [id, nm, tb] of kinds) {
        const got = G.data.all(tb).filter((r) => G.collect.has(id, r.ix)).length;
        const b = $('button', 'chip' + (k === id ? ' on' : ''), `${nm} ${got}/${G.data.all(tb).length}`); b.onclick = () => { k = id; G.audio.sfx('tap'); render(); }; sub.append(b);
      }
      pane.append(sub);
      const grid = $('div', 'dex');
      const tb = kinds.find((x) => x[0] === k)[2];
      const info = $('div', 'slot-info', '<span class="muted">이번 달에 만날 수 있는 친구는 테두리가 반짝여요.</span>');
      for (const r of G.data.all(tb)) {
        const has = G.collect.has(k, r.ix);
        const now = r.months && r.months.includes(G.time.month());
        const c = $('button', 'dexcell' + (has ? '' : ' unknown') + (now ? ' now' : ''));
        const id = (k === 'fossil' ? 'fossil:' : k + ':') + r.id;
        const dots = k === 'fossil' || !has ? '' : '<i class="vdots">' + G.VARIANTS.map((vr) => `<b class="${G.collect.has(k, r.ix, vr.v) ? 'on' : ''}" title="${vr.name || '일반'}"></b>`).join('') + '</i>';
        c.innerHTML = `<img src="${G.art.iconURL(id, 64)}" alt=""><span>${has ? esc(r.name) : '???'}</span>${dots}`;
        c.onclick = () => {
          G.audio.sfx('tap');
          if (!has) { info.innerHTML = `<b>???</b><br><span class="muted">${k === 'sea' ? '힌트: 썰물 때 해변의 조수 웅덩이' : r.loc ? '힌트: ' + ({ flower: '꽃 근처', air: '풀밭 하늘', ground: '땅 위', rock: '돌 옆', tree: '나무 줄기', water: '물가', lamp: '밤의 가로등', surface: '연못·강 물 위', river: '강', pond: '연못', sea: '바다' })[r.loc] : '땅속 어딘가'}${r.hours ? ' · ' + hoursText(r.hours) : ''}</span>`; return; }
          const best = G.collect.best(k, r.ix);
          const vlist = k === 'fossil' ? '' : '<br><span class="muted small">변이: ' + G.VARIANTS.map((vr) => (G.collect.has(k, r.ix, vr.v) ? '●' : '○') + (vr.name || '일반')).join(' ') + '</span>';
          info.innerHTML = `<b>${esc(r.name)}</b>${r.tier ? ' ' + '★'.repeat(r.tier) : ''}<br><span class="muted">${k === 'sea' ? monthsText(r.months) + ' · 썰물 때' : r.months ? monthsText(r.months) + ' · ' + hoursText(r.hours) : '화석'}${best ? ' · 최고 기록 ' + best + 'cm' : ''}</span>${vlist}`;
        };
        grid.append(c);
      }
      pane.append(grid, info);
    };
    render();
  }
  function monthsText(ms) { if (ms.length === 12) return '일 년 내내'; return ms.join('·') + '월'; }
  function hoursText(hs) { if (hs.length === 1 && hs[0][0] === 0 && hs[0][1] === 24) return '하루 종일'; return hs.map(([a, b]) => `${a}~${b}시`).join(', ').replace('24~', '').replace(/, 0~/, '~'); }

  function folkPane(pane) {
    pane.append($('div', 'pane-head', '<span>몽글숲 이웃들 — 매일 말을 걸면 조금씩 친해져요</span>'));
    const list = $('div', 'folk');
    for (const [id, v] of Object.entries(G.npc.VILLAGERS)) {
      const s = G.npc.st[id] || {}, met = !!s.met, lv = G.npc.level(id);
      const card = $('div', 'folkcard' + (met ? '' : ' unknown'));
      const pic = document.createElement('canvas'); pic.width = pic.height = 120; pic.className = 'folkpic';
      const g = pic.getContext('2d'); g.setTransform(2.2, 0, 0, 2.2, 60, 112);
      G.art.actor.draw(g, { species: v.species, look: v.look, x: 0, y: 0, dir: 0, seed: 1, blinkAt: 1e9 }, 1);
      const hearts = met ? '<span class="hearts">' + '♥'.repeat(lv) + '<i>' + '♥'.repeat(4 - lv) + '</i></span>' : '';
      const info = $('div', 'folkinfo', met
        ? `<b>${esc(v.name)}</b> ${hearts}<br><span class="muted small">${v.pers} · 입버릇 「${v.catch}」 · 생일 ${+v.bday.slice(0, 2)}월 ${+v.bday.slice(3)}일</span><br><span class="muted small">좋아하는 것: ${(s.favKnown || []).length ? s.favKnown.map((f) => esc(G.items.name(f))).join(', ') : (lv >= 2 ? esc(G.npc.FAV[id].filter((f) => !f.startsWith('cat:')).map((f) => G.items.name(f))[0] || '?') + '…?' : '선물해 보면 알 수 있어요')}</span><br><span class="muted small">지금: ${({ home: '집 근처', plaza: '광장', oak: '할아버지 참나무', pond: '연못가', river: '강가', beach: '바닷가', garden: '꽃밭', sleep: '쿨쿨 자는 중' })[(G.npc.get(id) && G.npc.activity(G.npc.get(id)) || {}).act] || '?'}</span>`
        : `<b>???</b><br><span class="muted small">아직 인사하지 못한 이웃이에요.</span>`);
      card.append(pic, info); list.append(card);
    }
    pane.append(list);
  }

  function todoPane(pane) {
    // 등불 (메타 목표)
    const lit = G.lantern.count(), next = lit + 1;
    pane.append($('div', 'pane-head', `<span>🏮 등불 ${lit}/10 — 다음: ${next}번 기둥</span>`));
    const lb = $('div', 'todo');
    for (const c of G.lantern.conds(next)) lb.append($('div', 'card' + (c.ok ? ' done' : ''), `<span class="chk">${c.ok ? '✔' : ''}</span>${esc(c.text)} <small class="muted">(${Math.min(c.cur, c.need)}/${c.need})</small>`));
    pane.append(lb);
    if (G.lantern.st.pages) { const bb = $('button', 'btn small ghost', '📖 큰솜이 그림책 보기'); bb.onclick = () => { G.ui.open.close(); setTimeout(() => G.lantern.book(), 50); }; pane.append(bb); }
    const rq = G.requests.st;
    if (rq.day === G.time.day() && rq.list.length) {
      pane.append($('div', 'pane-head', `<span>오늘의 부탁 (${rq.list.filter((r) => r.state === 'done').length}/${rq.list.length}) — 머리 위 「!」인 이웃에게 말을 걸어요</span>`));
      const box = $('div', 'todo');
      for (const r of rq.list) {
        const nm = G.npc.VILLAGERS[r.who].name, done = r.state === 'done';
        const txt = r.state === 'new' ? `${nm}에게 무슨 부탁이 있대요` : `${nm}: ${G.requests.whatText(r)}`;
        box.append($('div', 'card' + (done ? ' done' : ''), `<span class="chk">${done ? '✔' : ''}</span>${esc(txt)} <small class="muted">· ${G.fmt.money(r.reward)}</small>`));
      }
      pane.append(box);
    }
    pane.append($('div', 'pane-head', `<span>첫날 할 일 — 순서는 자유! (${G.quest.doneCount()}/${G.quest.CARDS.length})</span>`));
    const list = $('div', 'todo');
    for (const c of G.quest.CARDS) {
      const done = G.quest.isDone(c.id);
      const pr = c.count && !done ? ` (${G.quest.st.prog[c.id] || 0}/${c.count})` : '';
      list.append($('div', 'card' + (done ? ' done' : ''), `<span class="chk">${done ? '✔' : ''}</span>${esc(c.text)}${pr}`));
    }
    pane.append(list);
    if (G.quest.st.stamped) pane.append($('div', 'stamp', '🌟 반짝 도장 — 콩알: "오늘 멋졌어!"'));
    const tr = G.market.trend();
    pane.append($('div', 'muted small', `오늘의 유행 바람: 「${tr.name}」 (가판대에서 조금 더 쳐 줘요)`));
  }

  function setPane(pane) {
    pane.dataset.settings = '1'; pane.innerHTML = '';
    const row = (label, el) => { const r = $('label', 'setrow', `<span>${label}</span>`); r.append(el); return r; };
    const slider = (key) => { const s = $('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = G.settings.get(key); s.oninput = () => G.settings.set(key, +s.value); return s; };
    const me = $('button', 'btn', '🪞 내 이름·모습 바꾸기'); me.onclick = () => { G.audio.sfx('tap'); UI.open.body.querySelector('[data-t=me]').click(); };
    pane.append(me);
    pane.append(row('배경 음악', slider('bgm')), row('효과음', slider('sfx')), row('목소리', slider('voice')));
    const sp = $('select'); [['느리게', 22], ['보통', 32], ['빠르게', 50], ['즉시', 999]].forEach(([n, v]) => { const o = $('option', null, n); o.value = v; if (G.settings.get('textSpeed') === v) o.selected = true; sp.append(o); });
    sp.onchange = () => G.settings.set('textSpeed', +sp.value);
    pane.append(row('글자 속도', sp));
    const vw = $('select'); [['가까이', 0.87], ['보통', 1], ['멀리', 1.15]].forEach(([n, v]) => { const o = $('option', null, n); o.value = v; if (G.settings.get('view') === v) o.selected = true; vw.append(o); });
    vw.onchange = () => { G.settings.set('view', +vw.value); G.game.resize(); };
    pane.append(row('시야', vw));
    const vb = $('input'); vb.type = 'checkbox'; vb.checked = !!G.settings.get('vibrate'); vb.onchange = () => G.settings.set('vibrate', vb.checked);
    pane.append(row('진동', vb));

    const box = $('div', 'savebox');
    const kb = (G.save.size() / 1024).toFixed(1);
    const where = G.cloud.view().configured ? '이 기기에 항상 보관되고, 계정 연결 후 서버에도 동기화돼요.' : '이 기기에만 저장돼요. 가끔 내보내기로 백업해 주세요.';
    box.append($('div', 'muted small', `세이브 크기 ${kb}KB · ${where}`));
    const b1 = $('button', 'btn', '💾 지금 저장'); b1.onclick = () => { const r = G.save.now('manual'); UI.toast(r.ok ? '저장했어요!' : '저장하지 못했어요.', { icon: r.ok ? '💾' : '⚠️' }); };
    const b2 = $('button', 'btn', '📤 내보내기'); b2.onclick = () => exportSave();
    const b3 = $('button', 'btn', '📥 가져오기'); b3.onclick = () => importSave();
    const b4 = $('button', 'btn ghost danger', '처음부터 하기'); b4.onclick = async () => {
      if (!(await UI.confirm('지금 마을을 지우고 처음부터 시작할까요?', '지울래요', '아니요'))) return;
      if (!(await UI.confirm('정말요? 되돌릴 수 없어요. (내보내기를 먼저 하면 안전해요)', '정말 지울래요', '그만둘래요'))) return;
      G.save.wipe(); location.reload();
    };
    const r1 = $('div', 'row wrap'); r1.append(b1, b2, b3, b4);
    box.append(r1);
    pane.append(box);
    pane.append(cloudBox());
    pane.append($('div', 'muted small', `몽글숲 이야기 ${G.VERSION} · 키보드: 방향키/WASD 이동, Shift 달리기, C 살금, Space 행동, Q 도구, Tab 잎첩, M 지도`));
  }

  function cloudSummary(s, title) {
    const d = $('div', 'cloudsave');
    const when = s.savedAt ? new Date(s.savedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '시간 정보 없음';
    d.innerHTML = `<b>${esc(title)}</b><span>「${esc(s.town || '?')}」 ${esc(s.name || '?')}</span><small>${G.fmt.money(s.money || 0)} · 도감 ${s.dex || 0}종 · ${s.playDays || 0}일 플레이</small><small>${esc(when)}</small>`;
    return d;
  }
  function cloudBox() {
    const s = G.cloud.view(), box = $('div', 'savebox cloudbox');
    box.append($('div', 'cloudhead', '<b>☁️ 계정 연결</b><span class="freebadge">무료</span>'));
    if (!s.configured) {
      box.append($('div', 'muted small', 'Firebase 무료 설정을 마치면 PC와 폰에서 같은 마을을 이어 할 수 있어요. 지금 세이브는 기존처럼 이 기기에 안전하게 저장돼요.'));
      return box;
    }
    if (s.phase === 'offline') {
      box.append($('div', 'muted small', '지금은 인터넷에 연결되지 않아 계정 기능을 쉬고 있어요. 게임과 저장은 이 기기에서 그대로 돼요.'));
      const b = $('button', 'btn small ghost', '다시 연결해 보기'); b.onclick = () => G.cloud.retry(); box.append(b); return box;
    }
    if (s.phase === 'signed-out' || s.phase === 'kicked') {
      if (s.phase === 'kicked') box.append($('div', 'cloudwarn', '<b>다른 기기에서 접속해서 로그아웃됐어요</b><span>여기서 이어 하려면 다시 로그인해 주세요.</span>'));
      box.append($('div', 'muted small', '아이디 계정을 만들거나 로그인하면 현재 마을을 서버에 보관하고 PC와 폰에서 이어 할 수 있어요. 실제 이메일은 받지 않아요.'));
      if (s.error) box.append($('div', 'cloud-error small', esc(s.error)));
      const login = $('button', 'btn', '로그인'); login.onclick = () => UI.account('login');
      const signup = $('button', 'btn ghost', '회원가입'); signup.onclick = () => UI.account('signup');
      const r = $('div', 'row wrap'); r.append(login, signup); box.append(r); return box;
    }
    if (s.phase === 'error') {
      box.append($('div', 'cloud-error small', esc(s.error || '계정 연결을 확인해 주세요.')));
      if (!s.user) {
        const login = $('button', 'btn', '로그인 다시 하기'); login.onclick = () => UI.account('login'); box.append(login); return box;
      }
      const b = $('button', 'btn ghost', '다시 확인'); b.onclick = () => G.cloud.retry(); box.append(b);
    }
    const busy = { loading: '클라우드 기능을 준비하는 중…', checking: '서버 마을을 확인하는 중…', registering: '계정을 만드는 중…', 'signing-in': '로그인 중…', 'linking-google': 'Google 계정을 연결하는 중…', redirecting: '로그인 화면으로 이동하는 중…', syncing: '마을을 안전하게 동기화하는 중…', reloading: '서버 마을을 적용하는 중…', ready: '동기화를 준비하는 중…' };
    if (busy[s.phase]) box.append($('div', 'cloudstatus', `<span class="cloudspin">☁️</span>${busy[s.phase]}`));
    if (s.user) box.append($('div', 'clouduser', `<b>${esc(G.player.name || '우편지기')}</b><small>계정 연결됨 · 다른 사람에게는 캐릭터 이름만 보여요</small>`));
    if (s.phase === 'waiting-local') box.append($('div', 'muted small', '계정이 연결됐어요. 마을 만들기를 마치면 첫 세이브를 자동으로 서버에 올려요.'));
    if (s.phase === 'synced') {
      const when = s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '방금';
      box.append($('div', 'cloud-ok small', `✓ 동기화됨 · ${esc(when)}`));
    }
    if (s.user && !s.user.hasGoogle && !['linking-google', 'redirecting'].includes(s.phase)) {
      const google = $('button', 'btn small ghost', 'Google 계정 연결 (선택)'); google.onclick = () => G.cloud.linkGoogle(); box.append(google);
      box.append($('div', 'muted small', '연결하면 다음부터 Google로도 로그인할 수 있어요. Google 정보는 다른 이용자에게 보이지 않아요.'));
    } else if (s.user && s.user.hasGoogle) box.append($('div', 'cloud-ok small', '✓ Google 계정도 연결됨'));
    if (s.phase === 'conflict' && s.conflict) {
      box.append($('div', 'cloudwarn', '<b>두 기기에서 마을이 달라졌어요</b><span>자동으로 덮어쓰지 않았어요. 계속 사용할 저장을 골라 주세요.</span>'));
      const choices = $('div', 'cloudchoices'); choices.append(cloudSummary(s.conflict.local, '이 기기'), cloudSummary(s.conflict.remote, '서버'));
      const local = $('button', 'btn', '이 기기 마을 유지'); local.onclick = async () => {
        if (await UI.confirm('서버 저장을 이 기기의 마을로 바꿀까요? 기존 서버 저장은 이 기기에 복구용으로 남겨 둘게요.', '이 기기로 바꿀래요', '취소')) G.cloud.resolve('local');
      };
      const remote = $('button', 'btn ghost', '서버 마을 불러오기'); remote.onclick = async () => {
        if (await UI.confirm('서버 마을을 이 기기에 불러올까요? 현재 마을은 이 기기에 복구용으로 남겨 둘게요.', '서버 마을 불러오기', '취소')) G.cloud.resolve('remote');
      };
      const actions = $('div', 'row wrap'); actions.append(local, remote); box.append(choices, actions);
    }
    if (s.backup) {
      const restore = $('button', 'btn small ghost', '이전 저장 복구'); restore.onclick = async () => {
        const x = s.backup.summary;
        if (await UI.confirm(`복구용으로 남겨 둔 「${x.town || '?'}」 ${x.name || '?'} 저장을 불러올까요?`, '복구할래요', '취소')) G.cloud.restoreBackup();
      }; box.append(restore);
    }
    if (s.user && !['signing-in', 'redirecting'].includes(s.phase)) {
      const out = $('button', 'btn small ghost', '이 기기에서 계정 연결 해제'); out.onclick = async () => {
        if (await UI.confirm('이 기기의 계정 연결만 해제할까요? 로컬과 서버의 마을은 지워지지 않아요.', '연결 해제', '취소')) G.cloud.signOut();
      }; box.append(out);
    }
    return box;
  }

  function exportSave() {
    const str = G.save.exportString();
    G.settings.set('lastExport', Date.now());
    const m = G.player.name || '우편지기', town = G.player.town || '몽글숲';
    const d = new Date(); const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fname = `몽글숲_${town}_${ds}.mgsave`;
    const pane = UI.open.body.querySelector('.pane');
    const box = $('div', 'exportbox');
    const ta = $('textarea'); ta.value = str; ta.readOnly = true; ta.rows = 4;
    const row = $('div', 'row wrap');
    const cp = $('button', 'btn', '복사'); cp.onclick = async () => { try { await navigator.clipboard.writeText(str); UI.toast('복사했어요!', { icon: '📋' }); } catch (e) { ta.select(); document.execCommand && document.execCommand('copy'); UI.toast('복사했어요!', { icon: '📋' }); } };
    const dl = $('button', 'btn', '파일로 저장'); dl.onclick = async () => {
      const blob = new Blob([str], { type: 'text/plain' });
      try { if (navigator.canShare && navigator.canShare({ files: [new File([blob], fname)] }) && /iPhone|iPad/.test(navigator.userAgent)) { await navigator.share({ files: [new File([blob], fname)] }); return; } } catch (e) { /* 공유 취소 */ }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    row.append(cp, dl); box.append($('div', 'muted small', `${m} · ${town} 세이브 문자열`), ta, row);
    pane.append(box); ta.scrollIntoView({ block: 'nearest' });
  }
  function importSave() {
    const pane = UI.open.body.querySelector('.pane');
    const box = $('div', 'exportbox');
    const ta = $('textarea'); ta.placeholder = 'MG1:로 시작하는 문자열을 붙여 넣거나 파일을 고르세요'; ta.rows = 4;
    const file = $('input'); file.type = 'file'; file.accept = '.mgsave,.txt';
    file.onchange = async () => { if (file.files[0]) ta.value = (await file.files[0].text()).trim(); };
    const go = $('button', 'btn', '불러오기');
    go.onclick = async () => {
      const r = G.save.parseImport(ta.value);
      if (!r.ok) { UI.toast(r.err, { icon: '⚠️' }); G.audio.sfx('error'); return; }
      const s = r.summary;
      if (!(await UI.confirm(`「${s.town || '?'}」 마을의 ${s.name || '?'} · ${G.fmt.money(s.money)} · 도감 ${s.dex}종. 지금 마을 대신 불러올까요?`, '불러올래요', '아니요'))) return;
      if (!(await UI.confirm('지금 마을은 덮어써져요. 먼저 내보내기를 해 둘까요?', '그냥 불러오기', '취소'))) return;
      const res = G.save.importEnv(r.env);
      if (res.ok) location.reload();
    };
    const row = $('div', 'row wrap'); row.append(file, go);
    box.append(ta, row); pane.append(box);
  }

  // ---------- 상점 (가판대) ----------
  UI.shop = () => UI.modal('땅굴상점 가판대', (body, close) => {
    const sel = new Set();
    const tr = G.market.trend();
    const render = () => {
      body.innerHTML = '';
      const tabs = $('div', 'subtabs');
      body.append(tabs);
      const head = $('div', 'pane-head', `<span>팔 물건을 골라 주세요 · 유행 바람: 「${tr.name}」 +20%</span>`);
      const all = $('button', 'btn small ghost', '모두 고르기');
      all.onclick = () => { G.inv.slots.forEach((s, i) => { if (G.items.sellPrice(s.id, s.x)) sel.add(i); }); render(); };
      head.append(all);
      body.append(head);
      body.append(slotGrid((i, s) => {
        if (!G.items.sellPrice(s.id, s.x)) { UI.toast('그건 팔 수 없어요.', { icon: '✉️' }); return; }
        if (sel.has(i)) sel.delete(i); else sel.add(i); G.audio.sfx('tap'); render();
      }, sel));
      let total = 0; for (const i of sel) { const s = G.inv.slots[i]; if (s) total += G.items.sellPrice(s.id, s.x) * s.n; }
      const foot = $('div', 'shopfoot');
      const sb = $('button', 'btn big' + (total ? '' : ' off'), total ? `${G.fmt.money(total)}에 팔기` : '팔 물건을 골라요');
      sb.onclick = async () => {
        if (!total) return;
        const got = G.market.sell([...sel]); sel.clear();
        G.audio.sfx('coin');
        // 사고팔 때 창을 닫지 않는다(오너 요청: 매번 닫혀서 불편) — 말은 알림으로
        const t2 = G.lines('tosil', 'sold');
        UI.toast('토실: ' + G.str(G.u.pick(t2, Math.random()).text, { total: G.fmt.money(got) }), { icon: '🪙', ms: 3200 });
        render();
      };
      foot.append(sb);
      // 구매
      const buy = $('div', 'buyrow');
      for (const e of G.shop.stock()) {
        const own = e.kind === 'tool' ? G.player.hasTool(e.id) : G.shop.soldOut(e);
        const ico = e.kind === 'tool' ? `<img src="${G.art.iconURL('tool:' + e.id, 64)}" alt="">` : e.kind === 'seed' ? `<img src="${G.art.iconURL('seed:' + e.id, 64)}" alt="">` : e.kind === 'animal' ? `<img src="${G.art.iconURL('animal:' + e.id, 64)}" alt="">` : `<img src="${G.art.iconURL('furn:' + e.id + '#' + e.c, 64)}" alt="">`;
        const b = $('button', 'buycard' + (own ? ' off' : ''), `${ico}<b>${esc(e.name)}</b><small>${own ? (e.kind === 'tool' ? '가지고 있음' : '다 팔림') : G.fmt.money(e.price)}</small>`);
        b.onclick = async () => {
          if (own) return;
          const r = G.shop.buy(e);
          if (!r.ok) { G.audio.sfx('error'); UI.toast(r.why, { icon: '🪙' }); return; }
          G.audio.sfx('coin');
          // 사고 나서도 창은 그대로 (계속 살 수 있게). 설명은 알림으로
          const tip = (t, ic, ms) => UI.toast(t, { icon: ic, ms: ms || 3200 });
          if (e.kind === 'animal') { tip(r.first ? `${e.name}가 집 옆 목장에 왔어요! 쓰다듬으면 몇 분 뒤 선물을 줘요.` : `${e.name}가 목장에 도착했어요!`, '🐣', 4000); }
          else if (r.gift) { tip('씨앗 첫 손님 덤으로 물뿌리개를 받았어요! 텃밭은 집 옆에 있어요.', '🚿', 4000); }
          else if (e.kind === 'tool') { G.player.setTool(e.id); tip(e.id === 'axe' ? '도끼를 샀어요! 나무를 찍으면 목재가 나와요.' : e.id === 'can' ? '물뿌리개를 샀어요! 텃밭에 물을 줘요.' : '삽을 샀어요! 땅의 금(✕)을 파 보세요.', '🧰'); }
          else if (e.kind === 'seed') tip(`${e.name}를 샀어요! 집 옆 텃밭에 심어요.`, '🌱');
          else tip(`${e.name}을(를) 샀어요! 집에서 꾸미기로 놓아 보세요.`, '🛋️');
          render();
        };
        buy.append(b);
      }
      body.append(foot, $('div', 'pane-head', '<span>오늘의 물건 (매일 아침 바뀌어요)</span>'), buy);
    };
    render();
  }, { wide: true });

  G.modules.add('ui');
})(globalThis.G);
