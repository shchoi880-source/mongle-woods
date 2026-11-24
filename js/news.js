// 쫑알 일보: 광장 게시판의 매일 신문 (쫑알 입주 후). 어제 플레이 기록으로 기사를 만든다 + 이사 알림
(function (G) {
  'use strict';
  const u = G.u;
  const st = { day: -1, today: null, yest: null, lastMoveNote: -1 };
  const blank = (day) => ({ day, catches: 0, best: null, donations: 0, requests: 0, sold: 0, newSp: 0 });

  function cur() { const d = G.time.day(); if (!st.today || st.today.day !== d) { if (st.today && st.today.day === d - 1) st.yest = st.today; else if (st.today && st.today.day < d - 1) st.yest = blank(d - 1); st.today = blank(d); } return st.today; }
  G.on('eco:caught', (p) => {
    const t = cur(); t.catches++;
    const sp = G.data.byIx(({ bug: 'bugs', fish: 'fish', sea: 'sea' })[p.kind] || 'fish', p.ix);
    if (sp && (!t.best || p.size / sp.size[1] > t.best.k)) t.best = { name: (p.v ? G.VARIANTS[p.v].name + ' ' : '') + sp.name, size: p.size, k: p.size / sp.size[1], kind: p.kind };
    G.save.mark('news');
  });
  G.on('dex:new', (p) => { if (p.newSp) { cur().newSp++; G.save.mark('news'); } });
  G.on('museum:donate', () => { cur().donations++; G.save.mark('news'); });
  G.on('request:done', () => { cur().requests++; G.save.mark('news'); });
  G.on('farm:harvest', (p) => { if (p.giant) { cur().giantCrop = G.data.get('crops', p.crop).name; G.save.mark('news'); } });
  G.on('market:sell', (p) => { cur().sold += p.total; G.save.mark('news'); });

  const GOSSIP = [
    '딸랑, 숨바꼭질 연패 기록 경신 중. 본인은 「연승의 반대말일 뿐」이라고 밝혀.',
    '소금의 물고기 번역 진척도 3%에서 4%로. 연구실(강가) 관계자 「역사적인 1%」.',
    '라임, 밤의 화단 물주기 의혹에 「노코멘트」. 기자의 세 번째 질문도 「노코멘트」.',
    '단추, 광장 벤치 개수 재조사. 결과는 열두 개. 지난주 열세 번째 벤치의 행방은 여전히 미궁.',
    '콩알, 우편지기 모자 위에서 하루 평균 꼬물 47회. 꼬물 전문가 「건강하다는 뜻」.',
    '보리 할멈, 61년째 무지각에 도전. 비결은 「일찍 자는 것」 그대로.',
    '토닥, 「우주 최고의 땅굴상점」 표현 사용. 토실 「몽글숲 최고 정도로 정정합니다」.',
    '느림보 박사, 어제 오후 3시에 「안녕하세요」 인사를 시작해 3시 4분에 마쳐.',
  ];
  const CORRECTION = [
    '어제 기사에서 우편지기 키를 「3미터」로 보도했으나, 실제로는 그보다 조금 작은 것으로 확인됐습니다.',
    '어제 「고래가 잡혔다」는 기사는 피라미였습니다. 크기는 고래의 약 400분의 1입니다.',
    '어제 「딸랑 숨바꼭질 첫 승」 기사는 기자의 꿈이었습니다. 독자 여러분께 사과드립니다.',
    '어제 날씨 기사의 「맑음」은 「맑음일지도 모름」의 오타였습니다.',
    '어제 「소금이 물고기와 대화」 기사는 「소금이 물고기에게 일방적으로 말함」으로 바로잡습니다.',
  ];

  const N = G.news = {
    st,
    available: () => G.npc.isResident('jjongal'),
    issueNo() { const created = (G.save.sections.get('meta').get() || {}).created || 0; return Math.max(1, G.time.day() - (created + (G.npc.VILLAGERS.jjongal.moveIn || 1)) + 1); },
    build() {
      cur();
      const d = G.time.day(), y = st.yest || blank(d - 1), R = G.rng.stream(G.rng.KEYS.TALK, d, 77);
      const name = G.player.name || '우편지기';
      let head;
      if (y.giantCrop) head = `우편지기 텃밭에서 거대 ${y.giantCrop} 수확! 「두 손으로도 모자랐다」`;
      else if (y.best && y.best.size) head = `${name}, ${y.best.name} ${y.best.size}cm ${y.best.kind === 'fish' ? '낚아' : '잡아'}! 「손이 떨렸다」`;
      else if (y.donations) head = `조약돌 박물관에 ${y.donations}점 기증! 느림보 박사 「고…맙…네…」`;
      else if (y.requests) head = `우편지기, 이웃 부탁 ${y.requests}건 해결! 마을 만족도 급상승(기자 추정)`;
      else if (N.issueNo() === 1) head = `쫑알 일보 창간! 새 우편지기 입주 — 키 추정 3미터(정정 예정)`;
      else head = ['몽글바람, 오늘도 무언가를 실어 왔다! 무엇인지는 취재 중', '광장 할아버지 참나무, 오늘도 그 자리에. 「믿음직하다」 여론'][Math.floor(R() * 2)];
      const sub = [];
      if (y.catches) sub.push(`어제 우편지기가 잡은 생물: ${y.catches}마리${y.newSp ? ` (도감 새 친구 ${y.newSp}종)` : ''}.`);
      if (y.sold) sub.push(`땅굴상점 어제 매출 중 우편지기 몫: ${G.fmt.money(y.sold)}. 토닥 「전설」, 토실 「정확한 금액입니다」.`);
      const wNow = G.weather.at(d, 12), wTom = G.weather.at(d + 1, 12);
      const weather = `오늘 낮 ${G.weather.LABEL[wNow.type]}, 내일 낮 ${G.weather.LABEL[wTom.type]}${wTom.type === 'rain' ? ' — 우산 챙기세요!' : wTom.type === 'snow' ? ' — 눈사람 각!' : '.'}`;
      const fox = G.npc.st.fox;
      const gossip = fox && fox.seen && fox.seen >= d - 1 && !G.lantern.count() ? '「밤 열 시가 넘으면 나무 다리 위에 여우가 선다」는 제보 입수! 기자가 다가가자 사라져… 정체는 미궁. (본지 단독)' : GOSSIP[Math.floor(R() * GOSSIP.length)];
      const corr = N.issueNo() > 1 ? CORRECTION[Math.floor(R() * CORRECTION.length)] : '';
      return { no: N.issueNo(), head, sub, weather, gossip, corr, trend: G.market.trend().name };
    },
    open() {
      const n = N.build();
      return G.ui.modal(`쫑알 일보 제${n.no}호`, (body) => {
        const el = document.createElement('div'); el.className = 'paper';
        const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        el.innerHTML = `<div class="ph">쫑알 일보 <small>제${n.no}호 · ${G.time.label().date} · 구독료: 소문 하나</small></div>
          <h3>${esc(n.head)}</h3>${n.sub.map((s) => `<p>${esc(s)}</p>`).join('')}
          <div class="pcol"><div><b>☁️ 날씨</b><p>${esc(n.weather)}</p></div><div><b>🍃 유행 바람</b><p>오늘은 「${esc(n.trend)}」 쪽으로 분다는 소문. 땅굴상점에서 조금 더 쳐 준대요.</p></div></div>
          <div class="pgos"><b>📣 마을 소식</b><p>${esc(n.gossip)}</p></div>
          ${n.corr ? `<div class="pcorr"><b>정정 보도</b> ${esc(n.corr)}</div>` : ''}`;
        body.append(el);
      });
    },
    // 오늘 이사 온 주민 알림 (아침 의식 뒤)
    moveInNote() {
      const d = G.time.day(); if (st.lastMoveNote === d) return;
      const created = (G.save.sections.get('meta').get() || {}).created || 0;
      const arrived = Object.entries(G.npc.VILLAGERS).filter(([, v]) => v.moveIn && created + v.moveIn === d).map(([, v]) => v.name);
      st.lastMoveNote = d; G.save.mark('news');
      if (arrived.length) setTimeout(() => G.ui.toast(`새 이웃 ${arrived.join('·')}${G.josa(arrived[arrived.length - 1], '이/가').slice(-1)} 이사 왔어요! 머리 위 「?」를 찾아 인사해요.`, { icon: '📦', ms: 4500 }), 2500);
    },
  };

  G.save.section('news', {
    v: 1, def: () => ({ day: -1, today: null, yest: null, lastMoveNote: -1 }),
    get: () => JSON.parse(JSON.stringify(st)), set: (d) => Object.assign(st, d),
  });
  G.modules.add('news');
})(globalThis.G);
