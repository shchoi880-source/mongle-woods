// 살아 있는 이웃 (11차 회의 결정 2): 날씨·계절·시간·축제·내가 한 일에 반응하는 대사(성격별 말투) + 이웃끼리 수다(말풍선)
(function (G) {
  'use strict';
  const N = G.npc, TILE = G.C.TILE, u = G.u;
  if (!N) return;
  const V = N.VILLAGERS;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- 최근 일 기억 ----------
  const mem = { catch: null, catchAt: 0, look: 0, cook: null, cookAt: 0 };
  G.on('eco:caught', (p) => { const t = p.kind === 'bug' ? 'bugs' : p.kind === 'fish' ? 'fish' : null; const r = t && G.data.all(t).find((x) => x.ix === p.ix); if (r) { mem.catch = r.name; mem.catchAt = Date.now(); } });
  G.on('player:look', () => { mem.look = Date.now(); });
  G.on('craft:make', (p) => { if (p.rid && p.rid.startsWith('cook_')) { const it = G.items.get('dish:' + p.rid.slice(5)); if (it) { mem.cook = it.name; mem.cookAt = Date.now(); } } });
  const recent = (t, min = 10) => t && Date.now() - t < min * 60000;

  // ---------- 성격별 말투 ----------
  // 같은 상황이라도 성격마다 다르게. {name} 우편지기 이름, {x} 상황 단어, {c} 입버릇
  const P = {
    햇살: { rain: ['비다 비! 웅덩이 첨벙첨벙 하고 싶어! {c}!', '비 오는 날엔 방울 소리가 더 동그랗게 들려!'], snow: ['눈이야 눈! {name}, 눈사람 같이 만들자! {c}!', '내 귀에 눈 쌓였어? 차가워! 히히!'], clear: ['날씨 진짜 좋다~ 오늘은 뭐든 잘될 거야! {c}!', '햇살이 반짝반짝! 너도 반짝반짝!'], night: ['밤인데 안 자? 나도 안 자! 비밀이야! {c}', '별이 방울처럼 달랑달랑 매달린 것 같아!'], morning: ['좋은 아침! 오늘 첫 인사는 너한테 하는 거야! {c}!'], rainbow: ['무지개다!! 끝에 뭐가 있을까? 같이 가 볼래? {c}!'], spring: ['꽃 냄새 맡았어? 봄이야 봄! {c}!'], summer: ['더워~ 그래도 수박 먹으면 괜찮아! {c}!'], autumn: ['낙엽 밟는 소리 좋아! 바삭바삭! {c}!'], winter: ['손 시려! 호~ 해 줄래? {c}!'], catch: ['{x} 잡았다며?! 최고야 최고! {c}!', '우와, {x}! 나도 보고 싶었는데! {c}!'], look: ['어?! 옷 바꿨지? 엄청 잘 어울려! {c}!'], cook: ['{x} 냄새가 여기까지 났어! 맛있겠다~ {c}!'], fest: ['{x}다! 두근두근! 오늘은 하루 종일 축제할 거야! {c}!'], museum: ['박물관에 벌써 {x}점이나? 너 대단하다! {c}!'], farm: ['밭에 다 자란 게 있던데? 얼른 거둬! {c}!'] },
    엉뚱: { rain: ['비. 물고기들이 하늘에서 내려오는 소리 같다. 퐁당.', '가설: 비 오는 날 물고기가 더 잘 문다. 검증 중. {c}.'], snow: ['눈 결정은 육각형이다. 확인했다. 혀로. {c}.'], clear: ['맑음. 강 수온 적당. 낚시하기 딱. {c}.'], night: ['밤의 강은 소리가 다르다. 들어 봤나? {c}.'], morning: ['아침이다. 물고기들도 지금 일어난다. {c}.'], rainbow: ['무지개. 빛의 굴절. …그래도 예쁘다. {c}.'], spring: ['봄. 송사리가 늘었다. 기록했다. {c}.'], summer: ['여름엔 물속이 제일 시원하다. 들어와라. {c}.'], autumn: ['가을 물고기는 살이 올랐다. 연구 결과다. {c}.'], winter: ['얼음 밑에서도 물고기는 산다. 대단하다. {c}.'], catch: ['{x}를 잡았다고 들었다. 크기는? …궁금하다. {c}.', '{x}. 좋은 표본이다. 박물관에 보내라. {c}.'], look: ['외형 변화 감지. …좋다. {c}.'], cook: ['{x}. 조리법을 알려 달라. 연구하겠다. {c}.'], fest: ['{x}. 사람들이 모이면 물가가 조용해진다. 나는 축제 간다. {c}.'], museum: ['박물관 {x}점. 박사님이 기뻐하더라. 느리게. {c}.'], farm: ['밭에 수확할 것이 있다. 관찰 결과다. {c}.'] },
    새침: { rain: ['비 와서 털 젖었어. …보지 마. 흥칫.', '비 오는 날 꽃은 더 진해져. …그것만 좋아.'], snow: ['눈. 차가워. …근데 예쁘긴 해. 흥칫.'], clear: ['날씨 좋네. 꽃들도 기분 좋아 보여. …나도 조금.'], night: ['밤 산책 중이야. 따라오지 마. …천천히 걸을 거지만.'], morning: ['일찍 일어났네. …나도 방금 일어난 거 아니야.'], rainbow: ['무지개…. 소원 빌었어? 난 안 빌었어. 흥칫.'], spring: ['봄꽃 피었어. 같이 보러 갈래? …싫으면 말고.'], summer: ['더워서 그늘에만 있을 거야. 흥칫.'], autumn: ['가을바람 좋아. 꼬리가 저절로 살랑거려.'], winter: ['추워. 목도리 하나 더 할 걸 그랬어.'], catch: ['{x} 잡았다며. …흥, 나도 잡을 수 있어. 아마도.', '{x}? 제법이네. 칭찬은 아니야. 흥칫.'], look: ['…옷 바꿨네. 나쁘지 않아. 아주 조금 귀여워. 흥칫.'], cook: ['{x} 했다며? …한 입만 줘. 맛만 볼게.'], fest: ['{x}…. 시끄러운 건 싫은데, 이번엔 가 줄게.'], museum: ['박물관에 {x}점? 꽃 표본도 만들어야 해. 흥칫.'], farm: ['밭에 다 자란 거 있더라. 꽃은 아니지만. …축하해.'] },
    수다: { rain: ['비 오는 날 소식! 소금이가 우산 없이 웃으면서 걸어가더라! 도토독!', '오늘 쫑알 일보 1면: 비! 2면도 비! 도토독!'], snow: ['첫눈 소식 들었어? 내가 제일 먼저 봤어! 도토독!'], clear: ['날씨 맑음! 오늘의 쫑알 예보는 기분 최고! 도토독!'], night: ['밤에도 소식은 계속돼! 몽실이가 하품하는 걸 봤어! 도토독!'], morning: ['아침 소식! 너 일찍 일어났다고 적어 둘게! 도토독!'], rainbow: ['호외! 호외! 무지개 떴다! 도토독!'], spring: ['봄 특집호 준비 중이야! 꽃 이야기 많이 해 줘! 도토독!'], summer: ['여름 특종: 호떡이가 수박을 한 통 다 먹었대! 도토독!'], autumn: ['가을 소식: 도토리가 풍년이야! 행복해! 도토독!'], winter: ['겨울 소식: 단추가 눈 위에서 미끄러졌대! 비밀! 도토독!'], catch: ['특종! {name}가 {x}를 잡았대! 벌써 다 알아! 도토독!', '{x} 잡은 얘기 자세히 해 줘! 기사 쓸 거야! 도토독!'], look: ['새 옷 소식 접수! 「{name}, 오늘 멋짐」 도토독!'], cook: ['{x} 만든 소식 들었어! 맛 평가 기사 써도 돼? 도토독!'], fest: ['{x} 특집호 발행! 다들 모여라! 도토독!'], museum: ['박물관 {x}점 돌파! 기념 기사 쓴다! 도토독!'], farm: ['밭 소식: 다 자란 작물 발견! 수확하러 가자! 도토독!'] },
    씩씩: { rain: ['비? 괜찮아! 비 맞으며 달리기도 운동이야! 후끈!', '비 오는 날 근육이 더 촉촉해지는 느낌! 후끈!'], snow: ['눈이다! 눈밭 달리기 시합 할래? 후끈!'], clear: ['날씨 최고! 오늘 마을 열 바퀴 뛸 거야! 후끈!'], night: ['밤 운동도 좋지! 별 보면서 스트레칭! 후끈!'], morning: ['아침 체조 했어? 하나 둘! 하나 둘! 후끈!'], rainbow: ['무지개까지 달려가 볼까?! 후끈!'], spring: ['봄이다! 몸이 근질근질해! 후끈!'], summer: ['여름엔 땀 흘리는 게 최고야! 후끈!'], autumn: ['가을은 운동의 계절이야! 후끈!'], winter: ['추울수록 더 움직여야 해! 후끈!'], catch: ['{x} 잡았어?! 대단해! 하이파이브! 후끈!'], look: ['오, 새 옷! 운동하기 좋아 보이는데? 후끈!'], cook: ['{x}? 힘이 불끈 나겠는걸! 후끈!'], fest: ['{x}! 오늘은 응원단장 할 거야! 후끈!'], museum: ['박물관 {x}점이라니! 너 진짜 열심이다! 후끈!'], farm: ['밭일도 운동이지! 수확하러 가자! 후끈!'] },
    뒹굴: { rain: ['비 오는 날은… 이불 속이 제일이야… 말랑….', '빗소리 들으면서 낮잠… 최고야… 말랑….'], snow: ['눈… 폭신폭신… 거기 누우면 안 될까…? 말랑….'], clear: ['햇볕 따뜻해… 여기서 뒹굴래… 말랑….'], night: ['벌써 밤…? 아까 낮잠 잔 것 같은데… 말랑….'], morning: ['아침…? 오 분만 더…. 말랑….'], rainbow: ['무지개… 미끄럼틀 같아… 타 보고 싶어… 말랑….'], spring: ['봄바람… 솔솔… 졸려… 말랑….'], summer: ['더워… 그늘에서 뒹굴… 말랑….'], autumn: ['낙엽 위에서 뒹굴면… 바삭바삭… 좋아… 말랑….'], winter: ['겨울잠 자고 싶어… 봄에 깨워 줘… 말랑….'], catch: ['{x}…? 대단해… 나는 잡는 꿈만 꿨어… 말랑….'], look: ['옷… 바꿨네… 폭신해 보여… 말랑….'], cook: ['{x}… 냄새… 배고파졌어… 말랑….'], fest: ['{x}… 구경은… 누워서 할게… 말랑….'], museum: ['박물관 {x}점… 다 보려면… 오래 걸리겠다… 말랑….'], farm: ['밭에… 다 자란 거 있더라… 나 대신 거둬 줘… 말랑….'] },
    꿈꾸미: { rain: ['비는 구름이 우는 게 아니래. 노래하는 거래. 포슬.', '빗방울마다 작은 꿈이 들어 있대. 포슬.'], snow: ['눈은 별이 떨어진 거래. 그래서 반짝여. 포슬.'], clear: ['구름 하나 없네. 큰솜이도 기분 좋은가 봐. 포슬.'], night: ['밤하늘 보고 있었어. 별똥별 보면 꼭 말해 줘. 포슬.'], morning: ['어젯밤 꿈에 네가 나왔어. 하늘을 날았어. 포슬.'], rainbow: ['무지개는 꿈으로 가는 다리래. 포슬.'], spring: ['봄은 겨울이 꾸던 꿈이래. 포슬.'], summer: ['여름밤 반딧불은 별의 동생들이야. 포슬.'], autumn: ['가을 하늘은 높아서 꿈도 멀리 날아가. 포슬.'], winter: ['겨울엔 꿈이 더 포근해. 포슬.'], catch: ['{x}… 그 아이도 꿈을 꿀까? 포슬.'], look: ['오늘 너 꿈속 주인공 같아. 포슬.'], cook: ['{x} 냄새가 꿈처럼 달콤해. 포슬.'], fest: ['{x}… 오늘 밤 꿈은 분명 예쁠 거야. 포슬.'], museum: ['박물관은 오래된 꿈들이 모인 곳 같아. 벌써 {x}점이래. 포슬.'], farm: ['밭의 작물들이 다 자랐대. 꿈을 다 꾼 거야. 포슬.'] },
    꼼꼼: { rain: ['비. 우산 챙기셨습니까. 저는 두 개 챙겼습니다. 단정.', '강수 확인. 오늘 밭에 물은 안 주셔도 됩니다. 단정.'], snow: ['적설 확인. 미끄럼 주의. 저는 이미 한 번 미끄러졌습니다. 단정.'], clear: ['맑음. 일정대로 진행하기 좋은 날입니다. 단정.'], night: ['늦은 시각입니다. 충분한 수면을 권합니다. 단정.'], morning: ['좋은 아침입니다. 오늘 할 일을 확인하셨습니까. 단정.'], rainbow: ['무지개 관측. 기록부에 적었습니다. 일곱 색 모두. 단정.'], spring: ['봄. 씨앗 심기 좋은 시기입니다. 단정.'], summer: ['여름. 수분 섭취를 잊지 마십시오. 단정.'], autumn: ['가을. 수확의 계절입니다. 정리 정돈도. 단정.'], winter: ['겨울. 보온에 유의하십시오. 단정.'], catch: ['{x} 포획 기록 확인했습니다. 훌륭합니다. 단정.'], look: ['복장 변경 확인. 단정합니다. 좋습니다. 단정.'], cook: ['{x} 조리 완료 기록. 영양 균형이 좋습니다. 단정.'], fest: ['{x} 일정 확인. 질서 있게 즐깁시다. 단정.'], museum: ['박물관 소장품 {x}점. 체계적입니다. 단정.'], farm: ['수확 가능 작물 있음. 적기를 놓치지 마십시오. 단정.'] },
  };

  // 지금 이 이웃이 할 만한 상황 대사 (없으면 null)
  N.contextLine = (id) => {
    const v = V[id]; if (!v) return null; const B = P[v.pers]; if (!B) return null;
    const cands = [];
    const add = (k, x, w = 1) => { if (B[k]) for (let i = 0; i < w; i++) cands.push([k, x]); };
    const w = G.weather.now(), h = G.time.hour();
    if (w.fx === 'rainbow') add('rainbow', '', 3);
    if (w.type === 'rain') add('rain', '', 2); else if (w.type === 'snow') add('snow', '', 2); else if (w.type === 'clear') add('clear');
    if (h >= 21 || h < 4) add('night', '', 2); else if (h >= 5 && h < 9) add('morning', '', 2);
    add(G.time.season());
    if (recent(mem.catchAt)) add('catch', mem.catch, 3);
    if (recent(mem.look, 20)) add('look', '', 3);
    if (recent(mem.cookAt, 15)) add('cook', mem.cook, 2);
    const f = G.fest && G.fest.now(); if (f) add('fest', f.name, 2);
    const mus = G.museum.total(); if (mus >= 5) add('museum', mus);
    if (G.farm && G.farm.st.plots.some((p) => p.crop && G.farm.stage(p) === 3)) add('farm');
    if (!cands.length) return null;
    const [k, x] = pick(cands);
    return G.str(pick(B[k]), { name: G.player.name, x, c: v.catch });
  };

  // ---------- 이웃끼리 수다 (말풍선) ----------
  // [A, B, A] 세 마디. {A}{B} 이웃 이름, {p} 우편지기
  const TALKS = [
    ['{B}, 안녕! 오늘 기분 어때?', '좋아! 너는?', '나도 최고야!'],
    ['{B}! 방금 나비 봤어!', '어디서? 나도 볼래!', '저쪽 꽃밭!'],
    ['{p} 요즘 엄청 바쁘더라.', '편지 나르느라 그렇지.', '내일 응원해 주자!'],
    ['배고프다~', '나도… 호떡 먹고 싶다.', '호떡이 들으면 화낸다!'],
    ['{B}, 박물관 가 봤어?', '응! 물고기가 헤엄쳐!', '나도 보러 갈래!'],
    ['오늘 하늘 봤어?', '응, 구름이 솜사탕 같아.', '큰솜이 친구인가 봐!'],
    ['쉿, 비밀인데…', '응응, 뭔데?', '…까먹었어!'],
    ['{B}, 너 그 목도리 예쁘다!', '헤헤, 고마워!', '나도 하나 갖고 싶다!'],
    ['밭에 작물 자라는 거 봤어?', '응, 쑥쑥 크더라!', '{p} 대단해!'],
    ['요즘 무슨 꿈 꿔?', '하늘 나는 꿈!', '우와, 나도 꾸고 싶다!'],
  ];
  const chats = []; // {a, b, lines, i, t}
  let scan = 0;
  const free = (n) => n.vis && n.villager && !n.talking && !n.chat && !(n.chatCool > 0);
  const show = (n, text) => { n.sayText = text; n.sayT = 2.4; };
  const origUpdate = N.update;
  N.update = (dt, p, t) => {
    origUpdate(dt, p, t);
    for (const n of N.list) { if (n.sayT > 0) n.sayT -= dt; if (n.chatCool > 0) n.chatCool -= dt; }
    // 진행 중인 수다
    for (let i = chats.length - 1; i >= 0; i--) {
      const c = chats[i]; c.t -= dt;
      const stop = !c.a.vis || !c.b.vis || c.a.talking || c.b.talking;
      for (const n of [c.a, c.b]) { n.wait = Math.max(n.wait || 0, 0.5); n.moving = false; }
      c.a.dir = N.faceDir(c.b.x - c.a.x, c.b.y - c.a.y); c.b.dir = N.faceDir(c.a.x - c.b.x, c.a.y - c.b.y);
      if (stop || (c.t <= 0 && c.i >= c.lines.length)) { for (const n of [c.a, c.b]) { n.chat = null; n.chatCool = 30 + Math.random() * 30; n.wait = 1 + Math.random() * 2; } chats.splice(i, 1); continue; }
      if (c.t <= 0) { const who = c.i % 2 ? c.b : c.a; show(who, c.lines[c.i]); c.i++; c.t = 2.2; if (c.i === 1 && Math.random() < 0.5) N.pop(c.b, 'note'); }
    }
    // 새 수다 찾기 (1초마다): 가까이 선 이웃 둘
    scan -= dt; if (scan > 0) return; scan = 1;
    const vs = N.list.filter(free);
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i], b = vs[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > TILE * 2.8 || Math.random() > 0.35) continue;
      const tpl = pick(TALKS), names = { A: a.name, B: b.name, p: G.player.name };
      const lines = tpl.map((s) => G.str(s, names));
      a.chat = b.chat = true; chats.push({ a, b, lines, i: 0, t: 0.2 });
      return;
    }
  };
  if (!N.faceDir) N.faceDir = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : dy > 0 ? 0 : 2);
  G.modules.add('npclife');
})(globalThis.G);
