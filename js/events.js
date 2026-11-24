// 묶음 2: 첫 조작 안내(한 번씩) + 계절 이벤트(첫눈 아침·별똥별 밤·토요 운동회) + 목적지 방향 화살표
(function (G) {
  'use strict';
  const u = G.u, TILE = G.C.TILE;
  const st = { tips: {}, snowYear: 0, snowman: 0, wishes: 0, wishNight: -1, raceWeek: -1, raceBest: 0, races: 0 };
  G.data.add('items', [{ id: 'star_fragment', name: '별 조각', cat: 'mat', val: 400, stack: 30 }]);

  const EV = G.events = { st };
  // 특별한 날씨 알림 (무지개·천둥·함박눈) — 마을 하루에 한 번씩
  let fxSeen = '';
  G.on('time:hour', () => {
    if (!G.game || !G.game.started || (G.house && G.house.inside)) return;
    const w = G.weather.now(), key = G.time.day() + ':' + w.fx;
    if (!w.fx || fxSeen === key || !['rainbow', 'storm', 'blizzard'].includes(w.fx)) return;
    fxSeen = key;
    G.ui.toast({ rainbow: '🌈 무지개가 떴어요! 하늘을 봐요.', storm: '⛈️ 천둥 번개! 우르릉 쾅쾅.', blizzard: '🌨️ 함박눈이 펑펑 내려요!' }[w.fx], { icon: '✨', ms: 3500 });
  });

  // ---------- 처음 쓰는 조작 안내 (한 번씩) ----------
  EV.tip = (id, touch, pc) => {
    if (st.tips[id] || !G.game || !G.game.started) return;
    st.tips[id] = 1; G.save.mark('tip');
    G.ui.hint(G.input.isTouch() ? touch : (pc || touch));
    clearTimeout(EV._tipT); EV._tipT = setTimeout(() => G.ui.hint(''), 5000);
  };
  G.on('eco:flee', (p) => { if (p.e && p.e.sp && p.e.sp.beh !== 'E') EV.tip('flee', '뛰어가면 곤충이 도망가요. 잠자리채를 들고 천천히 걸어 보세요!', '뛰면 곤충이 도망가요. 잠자리채를 들고 걸으면 가까이 갈 수 있어요!'); });
  G.on('eco:miss', (p) => { if (p.kind === 'fish') EV.tip('miss', '「톡」은 아직이에요! 찌가 크게 「풍덩!」 잠길 때 눌러요.'); });
  G.on('fishing:bite', () => EV.tip('bite', '지금이에요! 노란 버튼!', '지금이에요! Space!'));

  // ---------- 첫눈 아침 ----------
  // 12월 1~4일 중 하루(시드로 고정)는 아침부터 낮까지 눈. 그날 처음 마을에 나오면 이웃들이 광장에 모인다
  EV.firstSnowDay = (year) => {
    const off = (G.rng.seed % 4);
    const d = new Date(year, 11, 1 + off, 12);
    return G.time.dayOf(d.getTime());
  };
  EV.isFirstSnow = (day) => { const dd = G.time.dayDate(day); return dd.m === 12 && day === EV.firstSnowDay(dd.y); };
  EV.snowNow = () => { const y = G.time.dayDate(G.time.day()).y; return st.snowYear === y; };
  EV.checkFirstSnow = async () => {
    const day = G.time.day(), dd = G.time.dayDate(day);
    if (!EV.isFirstSnow(day) || st.snowYear === dd.y || !G.quest.st.intro) return;
    if (G.ui.dialogOpen() || G.ui.open || G.house.inside) { setTimeout(EV.checkFirstSnow, 3000); return; }
    st.snowYear = dd.y; st.snowman = 0; G.save.mark('snow');
    await G.ui.say([
      { who: 'sys', text: '첫눈이에요! 몽글숲에 하얀 솜이 내려앉았어요.' },
      { who: 'ddalang', text: '눈이다아! 방울이 차가워서 소리가 맑아졌어! 랄랄!' },
      { who: 'hotteok', text: '광장에 눈사람 만들자! 다들 모여! 후끈!' },
      { who: 'sys', text: '광장 참나무 옆에 이웃들이 눈사람을 만들고 있어요. 마지막 눈덩이를 올려 줄까요?' },
    ].filter((l) => l.who === 'sys' || G.npc.isResident(l.who)));
  };
  // 광장 눈사람 (첫눈 이후 그해 겨울 동안)
  EV.snowmanPos = () => { const m = G.world.map; if (!m || !EV.snowNow()) return null; const month = G.time.month(); if (month > 2 && month < 12) return null; return { x: (m.plaza.x + 3) * TILE + 16, y: (m.plaza.y - 1) * TILE + 20 }; };
  EV.snowmanTalk = async () => {
    if (st.snowman) { await G.ui.say([{ who: 'sys', text: '눈사람이 윙크하는 것 같아요. 당근 코가 조금 삐뚤어졌어요.' }]); return; }
    st.snowman = 1; G.save.mark('snow');
    G.audio.sfx('stamp'); G.game.sparkle(G.player.x, G.player.y - 50, 12, '#ffffff');
    G.wallet.add(500, 'snowman');
    await G.ui.say([{ who: 'sys', text: '마지막 눈덩이를 올렸어요! 눈사람이 찡긋 윙크했어요.' }, { who: 'kongal', text: '꼬물! (콩알이 눈사람 머리 위로 폴짝)' }, { who: 'sys', text: '이웃들이 박수를 쳐 줬어요. 보리 할멈이 수고비 500몽을 줬어요.' }]);
  };

  // ---------- 별똥별 밤 ----------
  // 맑은 밤(20~24시), 5일에 한 번꼴 + 이사 6일째 밤은 반드시. 별똥별이 지나가는 1.5초 안에 행동 버튼 = 소원
  EV.meteorNight = (day) => {
    const h = G.time.hour(); if (h < 20) return false;
    const created = (G.save.sections.get('meta').get() || {}).created || 0;
    const w = G.weather.at(day, h); if (w.type !== 'clear' && w.type !== 'cloudy') return false;
    return day - created === 5 || u.hashf(G.rng.seed, day, 55) < 0.2;
  };
  const meteors = []; let nextMeteor = 3;
  EV.updateMeteors = (dt, rect) => {
    for (let i = meteors.length - 1; i >= 0; i--) { meteors[i].t += dt; if (meteors[i].t > 1.4) meteors.splice(i, 1); }
    if (!EV.meteorNight(G.time.day()) || G.house.inside) return;
    nextMeteor -= dt;
    if (nextMeteor <= 0) {
      nextMeteor = 5 + Math.random() * 9;
      meteors.push({ x: rect.x + rect.w * (0.3 + Math.random() * 0.7), y: rect.y + rect.h * Math.random() * 0.3, t: 0 });
      EV.tip('meteor', '별똥별이다! 지나가는 동안 노란 버튼을 누르면 소원을 빌어요.', '별똥별이다! 지나가는 동안 Space를 누르면 소원을 빌어요.');
    }
  };
  EV.drawMeteors = (ctx) => {
    for (const m of meteors) {
      const k = m.t / 1.4, x = m.x - k * 260, y = m.y + k * 150;
      const g = ctx.createLinearGradient(x, y, x + 70, y - 40); g.addColorStop(0, `rgba(255,255,240,${1 - k})`); g.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y - 40); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${1 - k})`; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.3); ctx.fill();
    }
  };
  // 행동 버튼을 대상 없이 눌렀을 때: 별똥별이 보이면 소원
  EV.tryWish = async () => {
    if (!meteors.some((m) => m.t < 1.2)) return false;
    meteors.length = 0;
    const day = G.time.day(); st.wishes++;
    G.audio.sfx('rare'); G.game.sparkle(G.player.x, G.player.y - 60, 14, '#fff6a8');
    if (st.wishNight !== day) {
      st.wishNight = day; G.save.mark('wish');
      if (G.inv.add('star_fragment', 1) === 0) G.ui.itemPop('star_fragment', null, '소원을 빌었더니 별 조각이 떨어졌다!');
      if (st.wishes === 1) await G.ui.say([{ who: 'kongal', text: '꼬물… (콩알도 눈을 꼭 감고 소원을 빌었어요)' }, { who: 'sys', text: '보리 할멈이 그랬어요. 「나는 60년째 같은 소원이란다. 지각 안 하기.」' }]);
    } else G.ui.toast('소원을 하나 더 빌었어요. ✨', { icon: '🌠', ms: 1800 });
    return true;
  };

  // ---------- 토요 운동회 (호떡) ----------
  // 토요일 10~16시, 호떡에게 말 걸면 '참나무 돌아오기 달리기'. 주 1회 상금, 기록은 쫑알 일보에
  EV.raceDay = () => { const d = G.time.date(); return d.getDay() === 6 && d.getHours() >= 10 && d.getHours() < 16 && G.npc.isResident('hotteok'); };
  const race = { on: false, t: 0, touched: false, cp: null };
  EV.race = race;
  EV.raceTalk = async () => {
    const week = Math.floor((G.time.day() + 4) / 7);
    if (race.on) { await G.ui.say([{ who: 'hotteok', text: '달리는 중이잖아! 참나무까지 갔다가 나한테 돌아와! 후끈!' }]); return true; }
    const done = st.raceWeek === week;
    // 반환점: 호떡에게서 가장 먼 건물 문 (최소 8타일)
    const m = G.world.map, h = G.npc.get('hotteok');
    const cands = [['shop', '땅굴상점'], ['post', '우체국'], ['museum2', '박물관'], ['tent', '네 집']].filter(([k]) => m.plots[k]).map(([k, nm]) => ({ nm, x: (m.plots[k].door.x + 0.5) * TILE, y: (m.plots[k].door.y + 1) * TILE }));
    cands.sort((a, b) => u.dist(b.x, b.y, h.x, h.y) - u.dist(a.x, a.y, h.x, h.y));
    const cp = cands[0];
    const i = await G.ui.choose({ who: 'hotteok', text: done ? `오늘 기록 ${st.raceBest ? st.raceBest.toFixed(1) + '초' : ''}! 또 뛰어 볼래? (상금은 주 1회야)` : `토요 운동회다! ${cp.nm} 앞을 찍고 나한테 돌아오기! 빠를수록 상금이 커! 후끈!` }, ['뛸래요!', '다음에']);
    if (i !== 0) return true;
    race.on = true; race.t = 0; race.touched = false; race.cp = cp;
    G.audio.sfx('chime');
    G.ui.toast(`출발! ${cp.nm} 앞을 찍고 호떡에게 돌아와요! (달리면 빨라요 · 📌 줄을 누르면 지도)`, { icon: '🏃', ms: 3500 });
    return true;
  };
  EV.updateRace = async (dt) => {
    if (!race.on) return;
    race.t += dt;
    const pl = G.player, cp = race.cp;
    if (!race.touched && u.dist(pl.x, pl.y, cp.x, cp.y) < TILE * 1.6) { race.touched = true; G.audio.sfx('pop'); G.ui.toast(`${cp.nm} 찍었다! 이제 호떡에게!`, { icon: '🚩', ms: 1500 }); }
    G.ui.hint(`🏃 ${race.t.toFixed(1)}초 ${race.touched ? '· 호떡에게 돌아가요!' : `· ${cp.nm} 앞까지!`}`);
    const h = G.npc.get('hotteok');
    if (race.touched && h && u.dist(pl.x, pl.y, h.x, h.y) < TILE * 1.6) {
      race.on = false; G.ui.hint('');
      const t = race.t, week = Math.floor((G.time.day() + 4) / 7), first = st.raceWeek !== week;
      const medal = t < 20 ? ['금메달', 1000] : t < 32 ? ['은메달', 600] : ['동메달', 300];
      st.raceBest = st.raceWeek === week ? Math.min(st.raceBest || 99, t) : t; st.raceWeek = week; st.races++;
      G.save.mark('race');
      G.audio.sfx('stamp');
      if (first) G.wallet.add(medal[1], 'race');
      G.emit('race:done', { t });
      await G.ui.say([{ who: 'hotteok', text: `${t.toFixed(1)}초! ${medal[0]}이야! ${t < 20 ? '나보다 빠를지도?! 후끈!!' : '멋진 달리기였어!'}` }, { who: 'sys', text: first ? `상금 ${G.fmt.money(medal[1])}을 받았어요. (다음 주 토요일에 또 열려요)` : '오늘 상금은 이미 받았어요. 기록만 남겨요!' }]);
    }
    if (race.t > 120) { race.on = false; G.ui.hint(''); }
  };

  // ---------- 목적지 방향 화살표 (화면 밖일 때, 화면 좌표로 그림) ----------
  EV.drawArrow = (ctx, cam, cv, t) => {
    const o = G.map && G.map.objective(); if (!o || !o.pos || G.ui.dialogOpen() || G.ui.open) return;
    const PX = cam.PX, sx = (o.pos.x - cam.x) * PX, sy = (o.pos.y - cam.y) * PX, m = 46 * Math.min(2, globalThis.devicePixelRatio || 1);
    if (sx > m && sx < cv.width - m && sy > m * 2 && sy < cv.height - m * 2) return; // 화면 안이면 생략
    const cx = cv.width / 2, cy = cv.height / 2, a = Math.atan2(sy - cy, sx - cx);
    const r = Math.min(Math.abs((cv.width / 2 - m) / Math.cos(a)), Math.abs((cv.height / 2 - m * 2) / Math.sin(a)));
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, s = (globalThis.devicePixelRatio > 1 ? 2 : 1) * (1 + Math.sin(t * 4) * 0.06);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,250,241,0.95)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 6.3); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#5b4636'; ctx.stroke();
    ctx.rotate(a); ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -7); ctx.lineTo(-1, 0); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  G.save.section('events', {
    v: 1, def: () => ({ tips: {}, snowYear: 0, snowman: 0, wishes: 0, wishNight: -1, raceWeek: -1, raceBest: 0, races: 0 }),
    get: () => JSON.parse(JSON.stringify(st)), set: (d) => Object.assign(st, d),
  });
  G.modules.add('events');
})(globalThis.G);
