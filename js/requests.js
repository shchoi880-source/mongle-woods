// 오늘의 부탁 (r3 회의 판정 B): 하루 최대 3건, 만난 주민에게서만. 종류 4: 아무 생물·특정 종·재료·배달
(function (G) {
  'use strict';
  const u = G.u;
  const st = { day: -1, list: [], stamps: 0, doneDays: 0 };
  G.data.add('items', [{ id: 'parcel', name: '소포', cat: 'letter', val: 0, stack: 1, nosell: true }]);

  // 재료 부탁 후보 (가진 도구로 구할 수 있는 것만)
  const MATS = [
    { id: 'branch', n: 5, need: null }, { id: 'shell:clam_shell', n: 2, need: null, any: 'shell' },
    { id: 'wood', n: 3, need: 'axe' }, { id: 'stone', n: 3, need: 'shovel' }, { id: 'fruit_acorn', n: 2, need: null },
  ];
  const SAY = {
    ddalang: { ask: '있잖아, 부탁이 있어! {what} 구해 줄 수 있어? 랄랄!', thanks: '우와아, 고마워! 방울이 기뻐서 딸랑딸랑 해!', wait: '{what}, 아직이야? 괜찮아! 나는 기다리는 거 잘해. 숨바꼭질 덕분에!' },
    sogeum: { ask: '연구에 {what} 필요하다. 협조 바란다. 퐁당.', thanks: '협조 감사. 연구 진척도 1% 상승. 퐁당.', wait: '{what}. 급하지 않다. 물고기들도 기다려 준다.' },
    lime: { ask: '…혹시 {what} 있으면 줘. 꼭 필요한 건 아니야. 흥칫.', thanks: '…고마워. 진짜로. 다시 말 안 해.', wait: '{what}? 아직이면 됐어. …기다리는 거 아니야.' },
    jjongal: { ask: '특종이야, 특종! 취재에 {what} 필요해! 도토독!', thanks: '고마워! 내일 신문 3면에 실어 줄게! 이름은 크게!', wait: '{what} 구하는 중이지? 그것도 기사감이야!' },
    hotteok: { ask: '{what}! 운동하다 생각났어! 구해 줄 수 있어? 후끈!', thanks: '최고야! 하이파이브! …살살 칠게!', wait: '{what} 찾는 중이지? 걸으면서 찾으면 운동도 돼!' },
    mungchi: { ask: '저기… {what}… 있으면… 줄래…? 말랑….', thanks: '고마워…. 오늘 할 일 다 했다…. 누워야지….', wait: '{what}…? 천천히 해…. 나도 천천히 기다릴게….' },
    mongsil: { ask: '구름 예보에 {what}가 나왔어! 구해 줄 수 있어? 포슬.', thanks: '예보 적중! …처음이야! 고마워!', wait: '{what}… 구름이 아직 모른대. 괜찮아!' },
    danchu: { ask: '실례지만 {what} 부탁드려도 될까요? 기록에 필요해서요. 단정.', thanks: '감사합니다. 「오늘의 고마운 일」 칸에 적어 두겠습니다.', wait: '{what}는 아직이시군요. 기록은 기다릴 수 있답니다.' },
  };

  function whatText(r) {
    if (r.type === 'any') return r.cat === 'bug' ? '곤충 아무거나 한 마리' : '물고기 아무거나 한 마리';
    if (r.type === 'species') return G.items.get(r.item).name + ' 한 마리';
    if (r.type === 'mat') return r.any === 'shell' ? `조개 ${r.n}개` : `${G.items.get(r.item).name} ${r.n}개`;
    if (r.type === 'deliver') return `${G.npc.VILLAGERS[r.to].name}에게 소포 배달`;
    return '';
  }
  const RQ = G.requests = {
    st, whatText,
    // 오늘 부탁 만들기 (결정적)
    daily(day) {
      if (st.day !== day) { st.day = day; st.list = []; }
      if (!G.quest.st.intro || st.list.length >= 3) return;
      const met = Object.keys(G.npc.VILLAGERS).filter((id) => G.npc.st[id] && G.npc.st[id].met && G.npc.isResident(id));
      // 날마다 주민 순서를 섞고, 앞에서부터 3명까지 (첫날처럼 이웃을 나중에 만나도 그때 채워진다)
      const order = met.slice().sort((a, b) => u.hash32(G.rng.seed, day, u.strHash(a)) - u.hash32(G.rng.seed, day, u.strHash(b)));
      const month = G.time.dayDate(day).m;
      for (const id of order) {
        if (st.list.length >= 3) break;
        if (st.list.some((r) => r.who === id)) continue;
        const R = G.rng.stream(G.rng.KEYS.TALK, day, u.strHash(id));
        const roll = R(); let r;
        const others = met.filter((x) => x !== id);
        if (roll < 0.25 && others.length) r = { type: 'deliver', to: others[Math.floor(R() * others.length)] };
        else if (roll < 0.5) r = { type: 'any', cat: R() < 0.5 && G.player.hasTool('net') ? 'bug' : 'fish' };
        else if (roll < 0.75) {
          const pool = [...G.data.all('bugs').map((x) => ['bug', x]), ...G.data.all('fish').map((x) => ['fish', x])].filter(([, sp]) => sp.months.includes(month) && sp.tier <= 2);
          const [k, sp] = pool[Math.floor(R() * pool.length)] || ['fish', G.data.all('fish')[0]];
          r = { type: 'species', item: k + ':' + sp.id };
        } else {
          const ok = MATS.filter((m) => !m.need || G.player.hasTool(m.need));
          const m = ok[Math.floor(R() * ok.length)];
          r = { type: 'mat', item: m.id, n: m.n, any: m.any };
        }
        r.who = id; r.reward = 300 + Math.floor(R() * 7) * 100; r.state = 'new'; // new → asked → done
        st.list.push(r);
      }
      G.save.mark('req');
    },
    pending(id) { return st.day === G.time.day() && st.list.some((r) => r.who === id && r.state !== 'done'); },
    fresh(id) { return st.day === G.time.day() && st.list.some((r) => r.who === id && r.state === 'new'); },
    // 가방에서 충족 가능한가 → 충족에 쓸 칸 목록
    match(r) {
      const sl = G.inv.slots;
      if (r.type === 'any') { const i = sl.findIndex((s) => s.id.startsWith(r.cat + ':')); return i >= 0 ? [[i, 1]] : null; }
      if (r.type === 'species') { const i = sl.findIndex((s) => s.id === r.item); return i >= 0 ? [[i, 1]] : null; }
      if (r.type === 'mat') {
        const test = r.any === 'shell' ? (s) => s.id.startsWith('shell:') : (s) => s.id === r.item;
        let need = r.n; const use = [];
        sl.forEach((s, i) => { if (need > 0 && test(s)) { const k = Math.min(need, s.n); use.push([i, k]); need -= k; } });
        return need === 0 ? use : null;
      }
      return null;
    },
    // 주민과 대화할 때 먼저 호출. 처리했으면 true
    async onTalk(n) {
      if (st.day !== G.time.day()) return false;
      const id = n.id, say = (t) => ({ who: id, text: t });
      // 1) 이 주민에게 가는 소포
      const pi = G.inv.slots.findIndex((s) => s.id === 'parcel' && s.x && s.x.to === id);
      if (pi >= 0) {
        const r = st.list.find((x) => x.type === 'deliver' && x.to === id && x.state === 'asked');
        G.inv.removeAt(pi, 1);
        const from = r ? G.npc.VILLAGERS[r.who].name : '이웃';
        await G.ui.say([say(`소포? ${from}${G.josa(from, '이/가').slice(-1)} 보냈다고? …고마워, 우편지기!`)]);
        G.npc.addFs(id, 2, 'parcel');
        if (r) await RQ.complete(r, true);
        return true;
      }
      const r = st.list.find((x) => x.who === id && x.state !== 'done');
      if (!r) return false;
      const S = SAY[id] || SAY.ddalang, what = whatText(r);
      if (r.state === 'new') {
        r.state = 'asked'; G.save.mark('req');
        await G.ui.say([say(G.str(S.ask, { what }))]);
        if (r.type === 'deliver') {
          if (G.inv.add('parcel', 1, { to: r.to }) === 0) { G.ui.itemPop('parcel', null, `${G.npc.VILLAGERS[r.to].name}에게 갈 소포를 받았다!`); G.audio.sfx('pickup'); }
          else { G.ui.toast('가방이 꽉 차서 소포를 못 받았어요. 칸을 비우고 다시 말을 걸어요.', { icon: '🎒' }); r.state = 'new'; }
        } else G.ui.toast(`오늘의 부탁: ${what}`, { icon: '📝', ms: 2600 });
        return true;
      }
      if (r.type === 'deliver') {
        if (!G.inv.slots.some((s) => s.id === 'parcel' && s.x && s.x.to === r.to)) {
          if (G.inv.add('parcel', 1, { to: r.to }) === 0) { await G.ui.say([say('소포 잃어버렸어? 여기, 하나 더 싸 뒀어.')]); return true; }
        }
        return false; // 배달 중엔 평소 대화
      }
      const use = RQ.match(r);
      if (!use) { await G.ui.say([say(G.str(S.wait, { what }))]); return true; }
      const c = await G.ui.choose(say(G.str(S.ask, { what })), ['건네주기', '아직이요']);
      if (c !== 0) return true;
      for (const [i, k] of use.sort((a, b) => b[0] - a[0])) G.inv.removeAt(i, k);
      await G.ui.say([say(S.thanks)]);
      await RQ.complete(r);
      return true;
    },
    async complete(r, quiet) {
      r.state = 'done'; st.doneCount = (st.doneCount || 0) + 1;
      G.wallet.add(r.reward, 'request'); G.audio.sfx('coin');
      G.npc.addFs(r.who, 3, 'request');
      G.ui.toast(`부탁 완료! +${G.fmt.money(r.reward)}`, { icon: '📝' });
      G.emit('request:done', { who: r.who });
      if (st.list.length && st.list.every((x) => x.state === 'done')) {
        st.stamps++; st.doneDays++;
        G.emit('stamp:earn', { id: 'daily' });
      }
      G.save.mark('req');
    },
  };
  G.on('time:day', (p) => { if (G.game && G.game.started) RQ.daily(p.day); });
  G.on('npc:met', () => RQ.daily(G.time.day()));

  G.save.section('requests', {
    v: 1, def: () => ({ day: -1, list: [], stamps: 0, doneDays: 0 }),
    get: () => JSON.parse(JSON.stringify(st)), set: (d) => Object.assign(st, d),
  });
  G.modules.add('requests');
})(globalThis.G);
