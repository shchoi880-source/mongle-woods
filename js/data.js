// 데이터: 아이템·곤충·물고기·화석·조개·대사 (M-a 수량: 곤충 10, 물고기 10, 화석 4, 조개 6)
// 인덱스(ix)는 추가만 한다. 재배열·삭제 금지(r2-기술 원칙 4).
(function (G) {
  'use strict';
  const D = G.data;
  D.table('items', { key: 'id', required: ['id', 'name', 'cat', 'val'] });
  D.table('bugs', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'tpl', 'months', 'hours', 'loc', 'tier', 'val', 'size', 'beh'] });
  D.table('fish', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'months', 'hours', 'loc', 'shadow', 'tier', 'val', 'size'] });
  D.table('fossils', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'val'] });
  D.table('shells', { key: 'id', ix: true, required: ['id', 'ix', 'name', 'val', 'w'] });
  D.table('lines', { key: 'id', required: ['id', 'who', 'sit', 'text'] });

  const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const DAY = [[6, 18]], NIGHT = [[19, 24], [0, 5]], ALLDAY = [[0, 24]];

  // 곤충 — tpl: 그림 원형, loc: 출현 위치, beh: A 날아다님 / B 땅을 기어다님 / C 나무에 붙어 있음
  D.add('bugs', [
    { id: 'yellow_butterfly', ix: 0, name: '노랑나비', tpl: 'butterfly', col: ['#ffd84d', '#f0a81c'], months: [3, 4, 5, 6, 7, 8, 9, 10], hours: [[6, 17]], loc: 'flower', tier: 1, val: 120, size: [4, 6], beh: 'A', spd: 1.6, flee: 2.2 },
    { id: 'white_butterfly', ix: 1, name: '배추흰나비', tpl: 'butterfly', col: ['#fbfbf4', '#b9c2c9'], months: [3, 4, 5, 6, 7, 8, 9, 10, 11], hours: [[6, 17]], loc: 'flower', tier: 1, val: 100, size: [4, 5.5], beh: 'A', spd: 1.5, flee: 2.2 },
    { id: 'red_dragonfly', ix: 2, name: '고추잠자리', tpl: 'dragonfly', col: ['#ff6b4a', '#c43d2a'], months: [8, 9, 10, 11], hours: [[8, 17]], loc: 'air', tier: 2, val: 260, size: [4, 5], beh: 'A', spd: 2.6, flee: 2.8 },
    { id: 'ladybug', ix: 3, name: '무당벌레', tpl: 'ladybug', col: ['#ff5252', '#2b2b2b'], months: [3, 4, 5, 6, 9, 10, 11], hours: [[8, 17]], loc: 'flower', tier: 1, val: 150, size: [0.6, 0.9], beh: 'B', spd: 0.5, flee: 1.2 },
    { id: 'pillbug', ix: 4, name: '공벌레', tpl: 'pillbug', col: ['#8b8fa3', '#5d6175'], months: ALL, hours: [[5, 19]], loc: 'rock', tier: 1, val: 80, size: [1, 1.5], beh: 'B', spd: 0.4, flee: 1.0 },
    { id: 'ant', ix: 5, name: '개미', tpl: 'ant', col: ['#4a3a35', '#2a201d'], months: ALL, hours: [[6, 18]], loc: 'ground', tier: 1, val: 60, size: [0.5, 1], beh: 'B', spd: 0.9, flee: 1.0 },
    { id: 'cricket', ix: 6, name: '귀뚜라미', tpl: 'cricket', col: ['#8a6a3c', '#5b4424'], months: [8, 9, 10, 11], hours: [[17, 24], [0, 5]], loc: 'ground', tier: 2, val: 300, size: [2, 3], beh: 'B', spd: 1.2, flee: 1.8 },
    { id: 'rhino_beetle', ix: 7, name: '장수풍뎅이', tpl: 'beetle', col: ['#6b3f22', '#3b2213'], months: [6, 7, 8], hours: [[17, 24], [0, 8]], loc: 'tree', tier: 4, val: 3000, size: [5, 8], beh: 'C', spd: 1.0, flee: 1.6 },
    { id: 'firefly', ix: 8, name: '반딧불이', tpl: 'firefly', col: ['#d9ff6b', '#3a3a2a'], months: [6, 7], hours: [[19, 24], [0, 4]], loc: 'water', tier: 3, val: 1200, size: [1, 1.5], beh: 'A', spd: 0.8, flee: 1.6 },
    { id: 'starlight_moth', ix: 9, name: '별빛나방', tpl: 'moth', col: ['#cfd6ff', '#7e86c9'], months: ALL, hours: [[19, 24], [0, 5]], loc: 'lamp', tier: 2, val: 400, size: [5, 7], beh: 'A', spd: 1.2, flee: 2.0 },
  ]);

  // 물고기 — shadow: 그림자 크기 1~5
  D.add('fish', [
    { id: 'pale_chub', ix: 0, name: '피라미', months: ALL, hours: ALLDAY, loc: 'river', shadow: 1, tier: 1, val: 100, size: [8, 12] },
    { id: 'minnow', ix: 1, name: '버들치', months: ALL, hours: ALLDAY, loc: 'river', shadow: 1, tier: 1, val: 120, size: [7, 11] },
    { id: 'catfish', ix: 2, name: '메기', months: [5, 6, 7, 8, 9, 10], hours: [[16, 24], [0, 9]], loc: 'river', shadow: 4, tier: 3, val: 1600, size: [30, 60] },
    { id: 'medaka', ix: 3, name: '송사리', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 1, tier: 1, val: 80, size: [2, 4] },
    { id: 'crucian', ix: 4, name: '붕어', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 2, tier: 1, val: 160, size: [10, 20] },
    { id: 'carp', ix: 5, name: '잉어', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 4, tier: 2, val: 400, size: [30, 60] },
    { id: 'smelt', ix: 6, name: '빙어', months: [12, 1, 2], hours: DAY, loc: 'pond', shadow: 1, tier: 2, val: 350, size: [8, 12] },
    { id: 'horse_mackerel', ix: 7, name: '전갱이', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 2, tier: 1, val: 150, size: [15, 25] },
    { id: 'mackerel', ix: 8, name: '고등어', months: [9, 10, 11, 12, 1, 2], hours: ALLDAY, loc: 'sea', shadow: 3, tier: 2, val: 500, size: [25, 40] },
    { id: 'red_seabream', ix: 9, name: '참돔', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 4, tier: 4, val: 2500, size: [30, 60], rare: 0.25 },
  ]);

  D.add('fossils', [
    { id: 'ammonite', ix: 0, name: '암모나이트', val: 1100 },
    { id: 'trilobite', ix: 1, name: '삼엽충', val: 1300 },
    { id: 'fern_fossil', ix: 2, name: '고사리 화석', val: 700 },
    { id: 'baby_dino_tooth', ix: 3, name: '아기 공룡 이빨', val: 2000 },
  ]);

  D.add('shells', [
    { id: 'clam_shell', ix: 0, name: '조개껍데기', val: 60, w: 30, col: '#f3e2cf' },
    { id: 'scallop', ix: 1, name: '가리비', val: 120, w: 22, col: '#ffb38a' },
    { id: 'conch', ix: 2, name: '소라 껍데기', val: 150, w: 18, col: '#f6d4b0' },
    { id: 'coral', ix: 3, name: '산호 조각', val: 200, w: 14, col: '#ff8a8a' },
    { id: 'urchin_shell', ix: 4, name: '성게 껍질', val: 180, w: 14, col: '#b9a7e6' },
    { id: 'pearl_oyster', ix: 5, name: '진주조개', val: 3000, w: 2, col: '#f4f1ff' },
  ]);

  // 아이템: 생물·화석·조개는 데이터에서 파생, 나머지는 직접
  const items = [
    { id: 'branch', name: '나뭇가지', cat: 'mat', val: 15, stack: 30 },
    { id: 'fruit_acorn', name: '도토리', cat: 'mat', val: 30, stack: 30 },
    { id: 'letter_ddalang', name: '딸랑에게 갈 편지', cat: 'letter', val: 0, stack: 1, nosell: true },
  ];
  for (const b of D.all('bugs')) items.push({ id: 'bug:' + b.id, name: b.name, cat: 'bug', val: b.val, stack: 1, ref: b });
  for (const f of D.all('fish')) items.push({ id: 'fish:' + f.id, name: f.name, cat: 'fish', val: f.val, stack: 1, ref: f });
  for (const f of D.all('fossils')) items.push({ id: 'fossil:' + f.id, name: f.name, cat: 'fossil', val: f.val, stack: 1, ref: f });
  for (const s of D.all('shells')) items.push({ id: 'shell:' + s.id, name: s.name, cat: 'shell', val: s.val, stack: 10, ref: s });
  D.add('items', items);

  // 도구 (가방 칸을 차지하지 않음)
  G.TOOLS = {
    hand: { name: '맨손', icon: '✋' },
    net: { name: '잠자리채', icon: '🪲' },
    rod: { name: '낚싯대', icon: '🎣' },
    shovel: { name: '삽', icon: '⛏️', price: 500 },
  };

  // 유행 바람 태그 (하루 1개, 판매가 ×1.2)
  G.TRENDS = [
    { id: 'bug', name: '곤충', test: (it) => it.cat === 'bug' },
    { id: 'fish', name: '물고기', test: (it) => it.cat === 'fish' },
    { id: 'shell', name: '바닷가 물건', test: (it) => it.cat === 'shell' },
    { id: 'fossil', name: '화석', test: (it) => it.cat === 'fossil' },
    { id: 'mat', name: '나무 재료', test: (it) => it.cat === 'mat' },
  ];

  // ---------- 대사 ----------
  // sit: greet_morning / greet_day / greet_evening / greet_night / chat / net / rod / gift / hearts / letter / sleepy
  const L = [];
  const add = (who, sit, arr) => arr.forEach((text, i) => L.push({ id: `${who}.${sit}.${i}`, who, sit, text }));

  // 딸랑 (토끼, 햇살, 입버릇 "랄랄") — 20줄
  add('ddalang', 'greet_morning', [
    '{name}! 좋은 아침이야, 랄랄! 오늘 하늘 색 봤어? 딸기우유 색이었어!',
    '아침 바람에서 빵 냄새가 나! 아무도 안 굽는데! 랄랄!',
  ]);
  add('ddalang', 'greet_day', [
    '앗, {name}다! 방금 귀 방울이 딸랑 했는데, 네가 오는 소리였구나!',
    '우와, 오늘도 만났다! 이건 우연이 아니라 운명이야, 랄랄!',
  ]);
  add('ddalang', 'greet_evening', [
    '노을이 내 귀 끝까지 빨갛게 물들였어! …원래 분홍이긴 해, 랄랄.',
    '저녁이다! 하루가 벌써 반쯤 졸고 있어.',
  ]);
  add('ddalang', 'greet_night', [
    '쉿… 밤에는 방울도 작게 울려야 해. 딸… 랑.',
    '별이 너무 많아서 세다가 잠들 뻔했어, 랄랄….',
  ]);
  add('ddalang', 'chat', [
    '나 숨바꼭질 한 번도 안 졌어! …한 번도 안 이겼어! 다들 방울 소리로 찾아내거든.',
    '콩알이 오늘 나한테 먼저 인사했어! 그러니까 콩알이 날 더 좋아하는 거야, 랄랄!',
    '광장 참나무 할아버지한테 말 걸면, 바람 불 때 대답해 줘. 진짜야!',
    '오늘의 목표: 깡충 백 번! 지금 마흔세 번째야. 마흔넷! 마흔다섯!',
    '토실이가 그러는데, 토닥 오빠는 숫자를 거꾸로 센대. 그래서 가격이 이상한 거래!',
    '바닷가 조개를 귀에 대면 파도 소리가 나! 내 귀에 대면 방울 소리가 나지만!',
  ]);
  add('ddalang', 'net', ['잠자리채다! 나 말고 벌레를 잡는 거지? 그치? 랄랄…?']);
  add('ddalang', 'rod', ['낚싯대네! 큰 거 잡으면 나한테 제일 먼저 보여 줘야 해!']);
  add('ddalang', 'letter', ['편지? 나한테? 우와아! 우편지기가 직접 가져다준 첫 편지야! 평생 간직할게, 랄랄!']);
  add('ddalang', 'hearts', ['{name}이랑 있으면 귀가 저절로 쫑긋해져. 이거 좋은 뜻이야!']);
  add('ddalang', 'sleepy', ['으음… 지금은 꿈속에서 숨바꼭질 하는 중이야… 랄…']);

  // 토닥(오빠, 과장)·토실(동생, 정정·몰래 덤) — 10줄
  add('todak', 'hello', [
    '어서 오세요! 몽글숲 최고의, 아니 우주 최고의 땅굴상점입니다!',
    '오늘도 전설의 물건을 가져오셨군요! 제 코가 그렇게 말하고 있어요!',
    '손님! 마침 딱 기다리고 있었어요. 삼백 년쯤!',
  ]);
  add('tosil', 'hello', [
    '오빠 말은 반만 들으세요. 어서 오세요.',
    '삼백 년 아니고 세 시간이에요. 어서 오세요.',
  ]);
  add('todak', 'sold', ['역시! 이건 전설이에요! 박물관이 울고 갈 물건이에요!', '훌륭해요! 이 정도면… 음… 아주 훌륭해요!']);
  add('tosil', 'sold', ['{total} 맞아요. 오빠가 또 숫자를 거꾸로 셀 뻔했어요.', '계산 끝났어요. 덤으로 사탕 하나… 오빠한테 말하지 마세요.']);
  add('tosil', 'trend', ['오늘 유행 바람은 「{trend}」 쪽으로 불어요. 조금 더 쳐 드려요.']);

  // 보리 할멈 (고슴도치, 우체국장, 입버릇 "콕!")
  add('bori', 'chat', [
    '편지는 발로 쓰는 거란다. 걸어서 전하니까. 콕!',
    '나는 60년 동안 한 번도 지각한 적이 없단다. 비결? 일찍 자는 거지.',
    '바람이 오늘 뭘 실어 올지는 아무도 몰라. 그래서 아침이 재밌는 거란다.',
    '모자 위의 그 솜뭉치, 오늘은 기분이 좋아 보이는구나. 콕!',
  ]);

  // 콩알 (말 없음: 의성어만)
  add('kongal', 'idle', ['꼬물.', '킁킁.', '폴짝!', '새근….']);
  add('kongal', 'rare', ['꼬물! 꼬물꼬물!']);
  add('kongal', 'catch', ['폴짝!', '꼬물~!']);
  add('kongal', 'miss', ['…꼬물.', '킁.']);
  add('kongal', 'dig', ['킁킁! 킁킁킁!']);
  add('kongal', 'goodjob', ['꼬물꼬물! (오늘 멋졌어!)']);
  D.add('lines', L);
  G.lines = (who, sit) => L.filter((l) => l.who === who && l.sit === sit);

  G.modules.add('data');
})(globalThis.G);
