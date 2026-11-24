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
    top.append(hud.map, hud.menu);
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
    br.append(hud.tool, hud.act);
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
    const close = (r) => { modalEl.classList.add('hidden'); modalEl.innerHTML = ''; G.input.unlock('modal'); UI.open = null; G.audio.sfx('close'); resolve(r); };
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
    const TABS = [['bag', '🎒 가방'], ['dex', '📖 도감'], ['folk', '🐾 이웃'], ['todo', '✅ 할 일'], ['set', '⚙️ 설정']];
    const pane = $('div', 'pane');
    const show = (id) => {
      tab = id; tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === id));
      pane.innerHTML = '';
      ({ bag: bagPane, dex: dexPane, folk: folkPane, todo: todoPane, set: setPane })[id](pane, close);
    };
    for (const [id, nm] of TABS) { const b = $('button', 'tab', nm); b.dataset.t = id; b.onclick = () => { G.audio.sfx('tap'); show(id); }; tabs.append(b); }
    body.append(tabs, pane); show(tab);
    if (Date.now() - (G.settings.get('lastExport') || 0) > 7 * 864e5 && G.time.st.playDays > 1) tabs.querySelector('[data-t=set]').classList.add('badge');
  }, { wide: true });

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
    const row = (label, el) => { const r = $('label', 'setrow', `<span>${label}</span>`); r.append(el); return r; };
    const slider = (key) => { const s = $('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = G.settings.get(key); s.oninput = () => G.settings.set(key, +s.value); return s; };
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
    box.append($('div', 'muted small', `세이브 크기 ${kb}KB · 이 기기에만 저장돼요. 가끔 내보내기로 백업해 주세요.`));
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
    pane.append($('div', 'muted small', `몽글숲 이야기 ${G.VERSION} · 키보드: 방향키/WASD 이동, Shift 달리기, C 살금, Space 행동, Q 도구, Tab 잎첩, M 지도`));
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
        const t1 = G.lines('todak', 'sold'), t2 = G.lines('tosil', 'sold');
        close();
        await UI.say([{ who: 'todak', text: G.u.pick(t1, Math.random()).text }, { who: 'tosil', text: G.str(G.u.pick(t2, Math.random()).text, { total: G.fmt.money(got) }) }]);
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
          if (e.kind === 'animal') { close(); await UI.say(r.first ? [{ who: 'tosil', text: '아기 동물은 오빠 친구 목장에서 데려왔어요. 집 옆에 울타리도 세워 뒀어요.' }, { who: 'todak', text: '전설의 목장이에요! …아직 울타리뿐이지만요!' }, { who: 'sys', text: '하루 한 번 쓰다듬어 주면 다음 날 아침 선물을 줘요. 3일이면 다 자라요.' }] : [{ who: 'tosil', text: `${e.name}가 목장에 도착했어요. 이름은 목장에서 확인해 보세요.` }]); return; }
          if (r.gift) { close(); await UI.say([{ who: 'tosil', text: '씨앗 첫 손님이시네요. 물뿌리개는 덤이에요. 오빠한테는 비밀이에요.' }, { who: 'todak', text: '전설의 물뿌리개예요! 물이 알아서… 아, 이건 진짜로 물이 나와요.' }]); G.ui.toast('물뿌리개를 받았어요! 텃밭은 집 옆에 있어요.', { icon: '🚿', ms: 3500 }); return; }
          if (e.kind === 'tool') {
            close();
            await UI.say(e.id === 'axe'
              ? [{ who: 'todak', text: '전설의 도끼예요! 나무가 스스로 목재를 내놓을 거예요!' }, { who: 'tosil', text: '나무를 찍으면 목재가 나와요. 한 나무에 하루 세 번까지만요. 나무도 쉬어야 하니까요.' }]
              : [{ who: 'todak', text: '전설의 삽이에요! 땅이 알아서 파질 거예요!' }, { who: 'tosil', text: '알아서는 안 파져요. 첫 손님이라 손잡이 덮개 넣었어요. 오빠한테 말하지 마세요.' }]);
            G.player.setTool(e.id);
          } else { UI.toast(`${e.name}을(를) 샀어요! 텐트에서 꾸미기로 놓아 보세요.`, { icon: '🛋️' }); render(); }
        };
        buy.append(b);
      }
      body.append(foot, $('div', 'pane-head', '<span>오늘의 물건 (매일 아침 바뀌어요)</span>'), buy);
    };
    render();
  }, { wide: true });

  G.modules.add('ui');
})(globalThis.G);
