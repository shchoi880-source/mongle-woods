// 아침 의식(콩알의 꿈 → 우체통 편지) + 편지함 — r2-재미 §3-2 / 느낌 #14 "아침 의식과 하루 마무리"
(function (G) {
  'use strict';
  const u = G.u;
  const st = { box: [], lastGen: -1, lastRitual: -1, dreamDay: -1, dream: '', dreamSp: '', seq: 0 };

  // 꿈 힌트: 장소별 문장 (생물 이름은 말하지 않는다)
  const DREAM_HINT = {
    flower: '꽃 위에서 작은 날개가 팔랑팔랑 춤추는 꿈', air: '하늘에서 빨간 실이 휙휙 날아다니는 꿈',
    ground: '풀 사이로 작은 발들이 줄지어 걷는 꿈', rock: '돌멩이 밑에서 동글동글 굴러 나오는 꿈',
    tree: '나무 줄기에 뿔 달린 친구가 매달려 있는 꿈', water: '물가에 작은 별들이 깜빡깜빡하는 꿈',
    lamp: '가로등 불빛에 은빛 날개가 모여드는 꿈',
    river: '강물 속에서 은빛 꼬리가 반짝이는 꿈', pond: '연못 바닥에서 동그란 입이 뻐끔거리는 꿈', sea: '파도 사이로 커다란 지느러미가 보이는 꿈',
  };
  const DREAM_FREE = [
    '큰 구름 위에서 미끄럼틀을 타는 꿈', '모자가 하늘을 나는 배가 되는 꿈', '딸랑이 숨바꼭질에서 처음으로 이기는 꿈',
    '도토리가 비처럼 내리는 꿈', '큰솜이가 하품하자 무지개가 나오는 꿈', '편지 봉투 속에서 작은 집이 자라는 꿈',
  ];
  // 편지: 주민별 본문 + 추신
  const LETTERS = {
    ddalang: [['오늘 아침 깡충 백 번 성공했어! …아흔아홉 번일 수도 있어. 그래도 거의 백 번이야!', '추신. 이 편지 쓰다가 방울이 세 번 울렸어. 행운의 숫자야!'],
      ['우편지기한테 편지를 쓰는 건 이상한 기분이야. 네가 너한테 배달하는 거잖아? 랄랄!', '추신. 답장은 말로 해 줘. 편지는 손이 아파.'],
      ['어제 꿈에 네가 나왔어. 같이 숨바꼭질했는데 내가 이겼어!', '추신. 꿈은 꿈일 뿐이래. 흥, 상관없어!']],
    sogeum: [['관찰 일지 발췌: 우편지기는 하루에 평균 11번 뛴다. 왜 뛰는지는 아직 모른다.', '추신. 비난이 아니다. 데이터다. 퐁당.'],
      ['물고기 번역 진척 보고. 「뽀글뽀글」은 「배고파」일 확률 40%, 「안녕」일 확률 40%, 나머지는 모른다.', '추신. 이 편지는 물에 젖지 않게 썼다. 노력했다.'],
      ['어제 네가 낚은 물고기가 고맙다고 했다. 아마. 놓아주진 않았지만.', '추신. 퐁당.']],
    lime: [['딱히 할 말이 있어서 쓰는 건 아니야. 종이가 남아서.', '추신. 화단에 물 준 거 나 아니야.'],
      ['어제 네 모자 위 솜뭉치가 나한테 손을 흔들었어. …흔든 것 같았어.', '추신. 이 편지 버려도 돼. 버리지 말고.'],
      ['꽃이 하나 더 피었어. 그냥 알려 주는 거야. 흥칫.', '추신. 보러 와도 되고. 안 와도 되고.']],
    jjongal: [['독점 인터뷰 요청서! 질문 1. 우편지기의 하루는 몇 걸음인가요? 질문 2. 그 걸음은 즐거운가요?', '추신. 답장 오면 1면에 싣는다. 도토독!'],
      ['어제 신문 오타 7개. 단추가 빨간 펜으로 다 고쳐 줬어. 신문이 빨개졌어.', '추신. 이 편지에도 오타가 있으면 그건 일부러야.'],
      ['제보 감사! …아직 제보 안 했다고? 그럼 미리 감사!', '추신. 소문 하나 = 구독 1일. 알지?']],
    hotteok: [['오늘 아침 해변 스무 바퀴! 편지 쓰는 지금도 다리가 후끈해!', '추신. 편지 쓰기도 손가락 운동이야.'],
      ['토요 운동회 참가 신청서를 넣었어. 종목은 아무거나! 응원만 해도 참가야!', '추신. 뭉치는 「누워 있기」로 신청했대.'],
      ['어제 플랭크하다 잠들었어. 일어나 보니 콩알 같은 구름이 떠 있더라.', '추신. 몽실이 그건 예보에 없던 구름이래.']],
    mungchi: [['편지 쓰다가… 잠들었어…. 그래서 짧아….', '추신. 해바라기씨 하나 넣었어…. 볼에서 나온 거 아니야…. 아마….'],
      ['세상에서 제일 푹신한 곳 후보 2번: 네 텐트 깔개. 언제 한번 누워 봐도 돼…?', '추신. 대답은 천천히 해 줘…. 나도 천천히 읽을게….'],
      ['오늘은 일찍 일어났어. 오후 세 시에.', '추신. 칭찬해 줘….']],
    mongsil: [['오늘 구름 예보: {name}네 집 위에 하트 구름. 이번엔 진짜야!', '추신. 안 맞으면 내일 또 예보할게. 포슬.'],
      ['어젯밤 큰솜이 꿈을 엿들었어. 커다란 편지 봉투 꿈이었어. 무슨 뜻일까?', '추신. 콩알한테도 물어봐 줘. 콩알은 알 것 같아.'],
      ['구름 병을 만들었어. 아직 빈 병이야. 구름이 수줍은가 봐.', '추신. 병 뚜껑 열어 두면 들어올까?']],
    danchu: [['{name} 님께. 오늘 광장 벤치는 열두 개였습니다. 평화로운 하루였다는 뜻이지요.', '추신. 이 편지는 정확히 세 번 고쳐 썼습니다.'],
      ['기록부 「오늘의 고마운 일」 칸에 {name} 님 이름이 세 번 적혔습니다.', '추신. 네 번째 칸도 비워 두었습니다. 단정.'],
      ['빙판 마을의 친척에게 몽글숲 이야기를 썼어요. {name} 님 이야기가 제일 길었습니다.', '추신. 칭찬입니다.']],
  };

  const ML = G.mail = {
    st,
    unread: () => st.box.filter((l) => !l.read).length,
    // 오늘의 꿈 종 (스폰 가중치 ×6)
    dreamSpecies: () => st.dreamDay === G.time.day() ? st.dreamSp : '',
    // 하루치 꿈·편지 만들기 (05시 기준 하루 한 번)
    daily(day) {
      if (st.lastGen === day) return;
      st.lastGen = day;
      const R = G.rng.stream(G.rng.KEYS.TALK, day, 3);
      // 꿈: 70%는 오늘 실제로 나오는 생물 힌트
      const month = G.time.dayDate(day).m;
      const cands = [...G.data.all('bugs').map((b) => ['bug', b]), ...G.data.all('fish').map((f) => ['fish', f])]
        .filter(([, r]) => r.months.includes(month) && r.tier >= 2 && !r.cloud && !r.high);
      if (cands.length && R() < 0.7) {
        const [kind, r] = cands[Math.floor(R() * cands.length)];
        st.dream = DREAM_HINT[r.loc] || DREAM_FREE[0]; st.dreamSp = kind + ':' + r.id;
      } else { st.dream = DREAM_FREE[Math.floor(R() * DREAM_FREE.length)]; st.dreamSp = ''; }
      st.dreamDay = day;
      // 편지: 만난 주민마다 확률(친할수록 높게), 선물 30%
      for (const [id, v] of Object.entries(G.npc.VILLAGERS)) {
        const s = G.npc.st[id]; if (!s || !s.met) continue;
        if (R() > 0.3 + G.npc.level(id) * 0.12) continue;
        const pool = LETTERS[id]; if (!pool) continue;
        const [body, ps] = pool[Math.floor(R() * pool.length)];
        let gift = null;
        if (R() < 0.3 && G.house) {
          const f = G.house.SHOP_FORMS[Math.floor(R() * G.house.SHOP_FORMS.length)];
          gift = { id: 'furn:' + f.id, x: { c: f.col ? Math.floor(R() * G.house.COLS.length) : 0 } };
        } else if (R() < 0.25) gift = { money: 200 + Math.floor(R() * 4) * 100 };
        st.box.unshift({ n: ++st.seq, from: id, day, body, ps, gift, read: false });
      }
      // 일주일 소포 (이사 7일째)
      if (G.time.st.playDays === 7 && !st.box.some((l) => l.week)) {
        st.box.unshift({ n: ++st.seq, from: 'bori', day, week: true, body: '이사 온 지 일주일이구나. 마을 모두가 서명한 카드를 보낸다. 딸랑은 이름을 세 번 썼고, 소금은 물고기 그림을 그렸고, 라임은… 아주 작게 썼더구나.', ps: '추신. 선물은 모두가 돈을 모아 산 것이란다. 콕!', gift: { id: 'furn:sofa', x: { c: 0 } }, read: false });
      }
      if (st.box.length > 60) st.box.length = 60;
      G.save.mark('mail');
    },
    // 아침 의식: 꿈 → 우체통 알림 (그날 첫 접속 1회, 스킵 가능)
    async ritual() {
      const day = G.time.day();
      if (st.lastRitual === day || !G.quest.st.intro) return;
      // 다른 대화·창·꾸미기 중이면 끝날 때까지 기다린다
      if (G.ui.dialogOpen() || G.ui.open || (G.house && G.house.editing) || G.player.hold) { setTimeout(() => ML.ritual(), 2000); return; }
      ML.daily(day);
      st.lastRitual = day; G.save.mark('ritual');
      // 마을 하루가 24분이라 아침마다 대화창으로 멈추면 방해된다 → 그날 첫 아침(접속)만 대화, 나머지는 알림
      if (!st.talkedReal || st.talkedReal !== new Date().toDateString()) {
        st.talkedReal = new Date().toDateString();
        await G.ui.say([{ who: 'kongal', text: '꼬물… 꼬물. (콩알이 어젯밤 꿈 얘기를 해요)' }, { who: 'sys', text: `「${st.dream}」` + (st.dreamSp ? '\n…오늘 어딘가에서 이루어질지도 몰라요.' : '') }]);
      } else G.ui.toast(`콩알의 꿈: 「${st.dream}」`, { icon: '💤', ms: 3500 });
      const n = ML.unread();
      if (n) G.ui.toast(`우체통에 편지 ${n}통이 와 있어요!`, { icon: '📮', ms: 3500 });
      if (G.news) G.news.moveInNote();
      G.audio.sfx('chime');
    },
    // 우체통 열기
    open() {
      if (!st.box.length) return G.ui.say([{ who: 'sys', text: '우체통이 비어 있어요. 이웃과 친해지면 편지가 와요.' }]);
      return G.ui.modal('우체통', (body) => {
        const render = () => {
          body.innerHTML = '';
          const head = document.createElement('div'); head.className = 'pane-head';
          head.innerHTML = `<span>안 읽은 편지 ${ML.unread()}통 · 최근 ${st.box.length}통</span>`;
          body.append(head);
          const list = document.createElement('div'); list.className = 'mailist';
          for (const l of st.box) {
            const from = l.from === 'bori' ? '보리 할멈' : G.npc.VILLAGERS[l.from].name;
            const b = document.createElement('button'); b.className = 'mailrow' + (l.read ? '' : ' new');
            b.innerHTML = `<span class="env">${l.read ? '📭' : '💌'}</span><b>${from}</b><span class="muted small">${G.str(l.body, { name: G.player.name }).slice(0, 22)}…</span>${l.gift && !l.taken ? '<i class="gift">🎁</i>' : ''}`;
            b.onclick = () => { G.audio.sfx('open'); read(l); };
            list.append(b);
          }
          body.append(list);
        };
        const read = (l) => {
          l.read = true; G.save.mark('mail');
          const from = l.from === 'bori' ? '보리 할멈' : G.npc.VILLAGERS[l.from].name;
          body.innerHTML = '';
          const card = document.createElement('div'); card.className = 'letter';
          card.innerHTML = `<div class="lt-to">${G.player.name}에게</div><p>${G.str(l.body, { name: G.player.name })}</p><p class="ps">${G.str(l.ps, { name: G.player.name })}</p><div class="lt-from">— ${from}</div>`;
          const row = document.createElement('div'); row.className = 'row wrap';
          if (l.gift && !l.taken) {
            const g = document.createElement('button'); g.className = 'btn';
            g.textContent = l.gift.money ? `동봉된 ${G.fmt.money(l.gift.money)} 받기` : `동봉된 ${G.items.name(l.gift.id, l.gift.x)} 받기`;
            g.onclick = () => {
              if (l.gift.money) { G.wallet.add(l.gift.money, 'mail'); G.audio.sfx('coin'); }
              else { if (!G.inv.canFit(l.gift.id, l.gift.x)) { G.ui.toast('가방이 꽉 찼어요.', { icon: '🎒' }); G.audio.sfx('error'); return; } G.inv.add(l.gift.id, 1, l.gift.x); G.audio.sfx('pickup'); }
              l.taken = true; G.save.mark('mail'); G.npc.addFs(l.from, 1, 'mail'); read(l);
            };
            row.append(g);
          }
          const back = document.createElement('button'); back.className = 'btn ghost'; back.textContent = '목록으로';
          back.onclick = () => { G.audio.sfx('tap'); render(); };
          row.append(back);
          body.append(card, row);
        };
        render();
      });
    },
  };
  G.on('time:day', (p) => { if (G.game && G.game.started) { setTimeout(() => ML.ritual(), 1600); setTimeout(() => G.events.checkFirstSnow(), 5000); } });

  G.save.section('mail', {
    v: 1, def: () => ({ box: [], lastGen: -1, lastRitual: -1, dreamDay: -1, dream: '', dreamSp: '', seq: 0 }),
    get: () => JSON.parse(JSON.stringify(st)), set: (d) => Object.assign(st, d),
  });
  G.modules.add('mail');
})(globalThis.G);
