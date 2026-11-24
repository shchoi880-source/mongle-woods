// 둥지 약정(집 단계·대출) + 재료 채집(도끼·바위) + 제작(작업대 레시피) — r2-제작범위 §5-2
(function (G) {
  'use strict';
  const u = G.u;

  // ---------- 재료·도구 ----------
  G.data.add('items', [
    { id: 'wood', name: '목재', cat: 'mat', val: 60, stack: 30 },
    { id: 'stone', name: '돌', cat: 'mat', val: 40, stack: 30 },
    { id: 'clay', name: '점토', cat: 'mat', val: 100, stack: 30 },
    { id: 'iron', name: '철광석', cat: 'mat', val: 300, stack: 30 },
  ]);
  G.TOOLS.axe = { name: '도끼', icon: '🪓', price: 500 };

  // ---------- 둥지 단계 ----------
  // 베타 조정(오너 확인 대기): 오두막 '주민 4명' → '이웃 3명과 인사', 작은 집 '기증 30' → '기증 15' (현재 콘텐츠 수량 기준)
  const STAGES = [
    { id: 'tent', name: '텐트', cost: 5000, room: { w: 7, h: 6 } },
    { id: 'cabin', name: '오두막', cost: 28000, room: { w: 9, h: 7 }, days: 5, active: 3, cond: () => ['ddalang', 'sogeum', 'lime'].every((id) => G.npc.st[id] && G.npc.st[id].met), condText: '이웃 셋과 인사하기' },
    { id: 'house', name: '작은 집', cost: 98000, room: { w: 11, h: 8 }, days: 14, active: 9, cond: () => G.museum.total() >= 15, condText: '박물관 기증 15점' },
  ];
  const st = { stage: 0, debt: 5000, paidTotal: 0, building: -1, badges: 0 };

  const NS = G.nest = {
    STAGES, st,
    cur: () => STAGES[st.stage],
    next: () => STAGES[st.stage + 1] || null,
    room: () => STAGES[st.stage].room,
    // 다음 단계 조건 확인
    check() {
      const nx = NS.next(); if (!nx) return { ok: false, why: '지금은 여기가 가장 큰 집이에요.' };
      if (st.debt > 0) return { ok: false, why: `먼저 ${NS.cur().name} 약정 ${G.fmt.money(st.debt)}을 다 갚아야 한단다.` };
      if (st.building >= 0) return { ok: false, why: '공사가 이미 시작됐단다. 내일 아침을 기다리렴.' };
      const created = (G.save.sections.get('meta').get() || {}).created || 0;
      const days = G.time.day() - created, active = G.time.st.playDays;
      const miss = [];
      if (days < nx.days) miss.push(`이사 후 ${nx.days}일(지금 ${days}일)`);
      if (active < nx.active) miss.push(`마을에 온 날 ${nx.active}일(지금 ${active}일)`);
      if (nx.cond && !nx.cond()) miss.push(nx.condText);
      return miss.length ? { ok: false, why: '아직 조금 이르구나. ' + miss.join(', ') + '이 필요하단다.' } : { ok: true };
    },
    pay(n) {
      n = Math.min(n, st.debt, G.wallet.get()); if (n <= 0) return 0;
      G.wallet.spend(n, 'loan'); st.debt -= n; st.paidTotal += n;
      G.save.mark('loan');
      if (st.debt === 0) { st.badges++; G.emit('nest:paid', { stage: st.stage }); }
      return n;
    },
    startBuild() { const nx = NS.next(); st.debt = nx.cost; st.building = G.time.day(); G.save.mark('build'); },
    // 05시가 지나면 완공
    tick(day) {
      if (st.building >= 0 && day > st.building) {
        st.stage++; st.building = -1; G.save.mark('built');
        G.emit('house:stage', { stage: st.stage });
        return true;
      }
      return false;
    },
    // 보리 할멈 상담
    async talk() {
      const say = (text) => ({ who: 'bori', text });
      const c = NS.cur(), nx = NS.next();
      const lines = [];
      if (st.building >= 0) { await G.ui.say([say(`${nx.name} 공사는 오늘 밤에 끝난단다. 내일 아침에 보러 가렴. 콕!`)]); return; }
      if (st.debt > 0) {
        const opts = [`전부 갚기 (${G.fmt.money(Math.min(st.debt, G.wallet.get()))})`, '1,000몽 갚기', '다음에요'];
        const i = await G.ui.choose(say(`${c.name} 약정이 ${G.fmt.money(st.debt)} 남았구나. 이자도 기한도 없단다. 갚고 싶은 만큼만 갚으렴.`), opts);
        if (i === 2) return;
        const paid = NS.pay(i === 0 ? st.debt : 1000);
        if (!paid) { await G.ui.say([say('몽이 없구나. 괜찮다, 천천히 하렴.')]); return; }
        G.audio.sfx('coin');
        if (st.debt === 0) {
          G.audio.sfx('stamp');
          lines.push(say(`다 갚았구나! 둥지 배지를 주마. 콕콕!`));
          if (nx) lines.push(say(`다음엔 ${nx.name}${G.josa(nx.name, '이/가').slice(-1)} 어떠냐? 준비가 되면 다시 말하렴.`));
          await G.ui.say(lines); return;
        }
        await G.ui.say([say(`${G.fmt.money(paid)} 잘 받았다. 남은 건 ${G.fmt.money(st.debt)}이란다.`)]); return;
      }
      if (!nx) { await G.ui.say([say('이제 마을에서 제일 아늑한 집이구나. 더 큰 집은… 나중에 이야기하자꾸나.')]); return; }
      const ck = NS.check();
      if (!ck.ok) { await G.ui.say([say(ck.why)]); return; }
      const i = await G.ui.choose(say(`${nx.name}으로 넓혀 볼까? 약정은 ${G.fmt.money(nx.cost)}, 이자도 기한도 없단다. 공사는 하룻밤이면 끝나지.`), ['좋아요!', '조금 더 생각할게요']);
      if (i !== 0) return;
      NS.startBuild(); G.audio.sfx('stamp');
      await G.ui.say([say('약속했다! 오늘 밤에 비버 일꾼들이 뚝딱뚝딱 지어 줄 게다. 가구는 그대로 옮겨 주마. 콕!')]);
    },
  };
  G.on('time:day', (p) => { if (NS.tick(p.day) && G.game && G.game.started) setTimeout(() => { G.ui.toast(`${NS.cur().name} 공사가 끝났어요! 집이 넓어졌어요.`, { icon: '🏡', ms: 4000 }); G.audio.sfx('stamp'); }, 2500); });

  G.save.section('nest', {
    v: 1, def: () => ({ stage: 0, debt: 5000, paidTotal: 0, building: -1, badges: 0 }),
    get: () => Object.assign({}, st), set: (d) => Object.assign(st, d),
  });

  // ---------- 채집: 도끼로 나무, 삽으로 바위 (하루 3번씩) ----------
  NS.gather = (o, tool) => {
    const W = G.world, key = (tool === 'axe' ? 'c' : 'r') + o.i, s = W.state.shakes;
    const n = s[key] || 0;
    if (n >= 3) return { none: true };
    s[key] = n + 1; G.save.mark('gather');
    if (tool === 'axe') return { id: 'wood' };
    const r = u.hashf(W.map.seed, G.time.day(), o.i, n);
    return { id: r < 0.12 ? 'iron' : r < 0.3 ? 'clay' : 'stone' };
  };

  // ---------- 제작 ----------
  // need: [[아이템, 수]], out: 가구면 'furn:<id>' / 도구면 'tool:<id>'
  const RECIPES = [
    { id: 'axe', out: 'tool:axe', need: [['branch', 5], ['stone', 1]], name: '도끼' },
    { id: 'chair', out: 'furn:chair', need: [['wood', 4]] },
    { id: 'table', out: 'furn:table', need: [['wood', 5]] },
    { id: 'crate', out: 'furn:crate', need: [['wood', 6]] },
    { id: 'shelf', out: 'furn:shelf', need: [['wood', 8], ['branch', 4]] },
    { id: 'plant', out: 'furn:plant', need: [['stone', 2], ['clay', 2]] },
    { id: 'lamp', out: 'furn:lamp', need: [['wood', 2], ['iron', 1]] },
    { id: 'clock', out: 'furn:clock', need: [['wood', 3], ['iron', 2]] },
    { id: 'radio', out: 'furn:radio', need: [['wood', 2], ['iron', 3]] },
    { id: 'bed', out: 'furn:bed', need: [['wood', 10], ['branch', 6]] },
  ];
  G.craft = {
    RECIPES,
    can: (r) => r.need.every(([id, n]) => G.inv.count(id) >= n) && !(r.out.startsWith('tool:') && G.player.hasTool(r.out.slice(5))),
    make(r, c = 0) {
      if (!G.craft.can(r)) return { ok: false, why: '재료가 모자라요.' };
      const isTool = r.out.startsWith('tool:');
      if (!isTool && !G.inv.canFit(r.out, { c })) return { ok: false, why: '가방이 꽉 찼어요.' };
      for (const [id, n] of r.need) G.inv.removeId(id, n);
      if (isTool) G.player.giveTool(r.out.slice(5)); else G.inv.add(r.out, 1, { c });
      G.emit('craft:make', { rid: r.id });
      return { ok: true };
    },
    name: (r) => r.name || (G.items.get(r.out) || {}).name,
    open() {
      return G.ui.modal('작업대', (body) => {
        const colPick = {};
        const render = () => {
          body.innerHTML = '';
          const head = document.createElement('div'); head.className = 'pane-head';
          head.innerHTML = '<span>재료: 나뭇가지(나무 흔들기) · 목재(도끼로 나무) · 돌·점토·철광석(삽으로 바위)</span>';
          body.append(head);
          const list = document.createElement('div'); list.className = 'recipes';
          for (const r of RECIPES) {
            const f = r.out.startsWith('furn:') ? G.data.get('furn', r.out.slice(5)) : null;
            const c = colPick[r.id] || 0;
            const can = G.craft.can(r);
            const owned = r.out.startsWith('tool:') && G.player.hasTool(r.out.slice(5));
            const row = document.createElement('div'); row.className = 'recipe' + (can ? ' can' : '');
            const ico = r.out.startsWith('tool:') ? `<span class="bi">${G.TOOLS[r.out.slice(5)].icon}</span>` : `<img src="${G.art.iconURL(r.out + '#' + c, 64)}" alt="">`;
            const need = r.need.map(([id, n]) => { const have = G.inv.count(id); return `<span class="${have >= n ? 'ok' : 'no'}">${G.items.get(id).name} ${have}/${n}</span>`; }).join(' ');
            row.innerHTML = `${ico}<div class="rinfo"><b>${G.craft.name(r)}</b><div class="small">${need}</div></div>`;
            if (f && f.col) {
              const sw = document.createElement('button'); sw.className = 'swatch'; sw.style.background = G.house.COLS[c]; sw.title = '색 바꾸기';
              sw.onclick = () => { colPick[r.id] = (c + 1) % G.house.COLS.length; G.audio.sfx('tap'); render(); };
              row.append(sw);
            }
            const b = document.createElement('button'); b.className = 'btn small' + (can ? '' : ' off'); b.textContent = owned ? '있음' : '만들기';
            b.onclick = () => {
              const res = G.craft.make(r, c);
              if (!res.ok) { G.audio.sfx('error'); G.ui.toast(owned ? '이미 가지고 있어요.' : res.why, { icon: '🔨' }); return; }
              G.audio.sfx('dug'); G.ui.itemPop(r.out.startsWith('tool:') ? r.out : r.out + '', r.out.startsWith('furn:') ? { c } : null, `${G.craft.name(r)}${G.josa(G.craft.name(r), '을/를').slice(-1)} 만들었다!`);
              render();
            };
            row.append(b); list.append(row);
          }
          body.append(list);
        };
        render();
      }, { wide: true });
    },
  };

  G.modules.add('nest');
})(globalThis.G);
