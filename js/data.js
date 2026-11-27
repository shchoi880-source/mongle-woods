// 데이터: 아이템·곤충·물고기·화석·조개·대사 (2차 확장: 곤충 41, 물고기 34, 화석 12, 조개 10)
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

  // 곤충 — tpl: 그림 원형, loc: 출현 위치, beh: A 날아다님 / B 기어다님 / C 나무에 붙음 / D 폴짝 뜀 / E 놀라면 동글 말림(잡기 쉬움) / F 나무 줄기 오르내림 / G 물 위 빙글빙글
  D.add('bugs', [
    { id: 'yellow_butterfly', ix: 0, name: '노랑나비', tpl: 'butterfly', col: ['#ffd84d', '#f0a81c'], months: [3, 4, 5, 6, 7, 8, 9, 10], hours: [[6, 17]], loc: 'flower', tier: 1, val: 120, size: [4, 6], beh: 'A', spd: 1.6, flee: 2.2 },
    { id: 'white_butterfly', ix: 1, name: '배추흰나비', tpl: 'butterfly', col: ['#fbfbf4', '#b9c2c9'], months: [3, 4, 5, 6, 7, 8, 9, 10, 11], hours: [[6, 17]], loc: 'flower', tier: 1, val: 100, size: [4, 5.5], beh: 'A', spd: 1.5, flee: 2.2 },
    { id: 'red_dragonfly', ix: 2, name: '고추잠자리', tpl: 'dragonfly', col: ['#ff6b4a', '#c43d2a'], months: [8, 9, 10, 11], hours: [[8, 17]], loc: 'air', tier: 2, val: 260, size: [4, 5], beh: 'A', spd: 2.6, flee: 2.8 },
    { id: 'ladybug', ix: 3, name: '무당벌레', tpl: 'ladybug', col: ['#ff5252', '#2b2b2b'], months: [3, 4, 5, 6, 9, 10, 11], hours: [[8, 17]], loc: 'flower', tier: 1, val: 150, size: [0.6, 0.9], beh: 'B', spd: 0.5, flee: 1.2 },
    { id: 'pillbug', ix: 4, name: '공벌레', tpl: 'pillbug', col: ['#8b8fa3', '#5d6175'], months: ALL, hours: [[5, 19]], loc: 'rock', tier: 1, val: 80, size: [1, 1.5], beh: 'E', spd: 0.4, flee: 1.0 },
    { id: 'ant', ix: 5, name: '개미', tpl: 'ant', col: ['#4a3a35', '#2a201d'], months: ALL, hours: [[6, 18]], loc: 'ground', tier: 1, val: 60, size: [0.5, 1], beh: 'B', spd: 0.9, flee: 1.0 },
    { id: 'cricket', ix: 6, name: '귀뚜라미', tpl: 'cricket', col: ['#8a6a3c', '#5b4424'], months: [8, 9, 10, 11], hours: [[17, 24], [0, 5]], loc: 'ground', tier: 2, val: 300, size: [2, 3], beh: 'D', spd: 1.2, flee: 1.8 },
    { id: 'rhino_beetle', ix: 7, name: '장수풍뎅이', tpl: 'beetle', art: 'rhino', col: ['#6b3f22', '#3b2213'], months: [6, 7, 8], hours: [[17, 24], [0, 8]], loc: 'tree', tier: 4, val: 3000, size: [5, 8], beh: 'F', spd: 1.0, flee: 1.6 },
    { id: 'firefly', ix: 8, name: '반딧불이', tpl: 'firefly', col: ['#d9ff6b', '#3a3a2a'], months: [6, 7], hours: [[19, 24], [0, 4]], loc: 'water', tier: 3, val: 1200, size: [1, 1.5], beh: 'A', spd: 0.8, flee: 1.6 },
    { id: 'whirligig', ix: 10, name: '물맴이', tpl: 'whirligig', col: ['#3d4c5e', '#a9c4d8'], months: [4, 5, 6, 7, 8, 9, 10], hours: [[6, 18]], loc: 'surface', tier: 2, val: 350, size: [0.6, 1], beh: 'G', spd: 1.6, flee: 1.6 },
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

  // ---------- 2차 확장 (2026-11, 하루 24분 개편에 맞춰 도감을 크게) — ix는 이어서만 ----------
  const SPR = [3, 4, 5], SUM = [6, 7, 8], AUT = [9, 10, 11], WIN = [12, 1, 2], WARM = [4, 5, 6, 7, 8, 9, 10];
  D.add('bugs', [
    { id: 'swallowtail', ix: 11, name: '호랑나비', tpl: 'butterfly', col: ['#ffd84d', '#2b2b2b'], months: [4, 5, 6, 7, 8, 9], hours: [[7, 17]], loc: 'flower', tier: 2, val: 280, size: [7, 10], beh: 'A', spd: 1.8, flee: 2.4 },
    { id: 'black_swallowtail', ix: 12, name: '제비나비', tpl: 'butterfly', col: ['#3a3f6b', '#6fd0c8'], months: [5, 6, 7, 8, 9], hours: [[8, 16]], loc: 'flower', tier: 3, val: 800, size: [8, 11], beh: 'A', spd: 2.1, flee: 2.8 },
    { id: 'blue_hairstreak', ix: 13, name: '푸른부전나비', tpl: 'butterfly', col: ['#8fc4ff', '#d0e4ff'], months: WARM, hours: [[7, 17]], loc: 'flower', tier: 2, val: 220, size: [2, 3], beh: 'A', spd: 1.7, flee: 2.2 },
    { id: 'skimmer', ix: 14, name: '밀잠자리', tpl: 'dragonfly', col: ['#8fb4d8', '#3d5a7a'], months: [5, 6, 7, 8, 9], hours: [[7, 18]], loc: 'air', tier: 1, val: 160, size: [4, 5.5], beh: 'A', spd: 2.4, flee: 2.6 },
    { id: 'emperor_dragonfly', ix: 15, name: '왕잠자리', tpl: 'dragonfly', col: ['#6bcb77', '#2f6a8a'], months: [6, 7, 8, 9], hours: [[8, 17]], loc: 'water', tier: 3, val: 900, size: [7, 8.5], beh: 'A', spd: 3, flee: 3 },
    { id: 'honeybee', ix: 16, name: '꿀벌', tpl: 'bee', col: ['#ffd24d', '#3a2a20'], months: [3, 4, 5, 6, 7, 8, 9, 10], hours: [[7, 17]], loc: 'flower', tier: 1, val: 150, size: [1.2, 1.6], beh: 'A', spd: 1.4, flee: 2 },
    { id: 'bumblebee', ix: 17, name: '호박벌', tpl: 'bee', col: ['#2f2a2a', '#ffd24d'], months: [4, 5, 6, 7, 8, 9], hours: [[7, 16]], loc: 'flower', tier: 2, val: 350, size: [2, 2.6], beh: 'A', spd: 1.2, flee: 1.8 },
    { id: 'hoverfly', ix: 18, name: '꽃등에', tpl: 'bee', col: ['#ffb04a', '#3a2a20'], months: [3, 4, 5, 6, 7, 8, 9, 10, 11], hours: [[8, 17]], loc: 'flower', tier: 1, val: 120, size: [1, 1.4], beh: 'A', spd: 1.9, flee: 2.2 },
    { id: 'cicada', ix: 19, name: '참매미', tpl: 'cicada', col: ['#6b8a4a', '#3a2a20'], months: [7, 8], hours: [[6, 18]], loc: 'tree', tier: 2, val: 300, size: [3.5, 4.5], beh: 'C', spd: 1.2, flee: 1.6 },
    { id: 'big_cicada', ix: 20, name: '말매미', tpl: 'cicada', col: ['#3a2a20', '#8a6a3c'], months: [7, 8, 9], hours: [[8, 17]], loc: 'tree', tier: 3, val: 650, size: [4.5, 6], beh: 'C', spd: 1.2, flee: 1.8 },
    { id: 'evening_cicada', ix: 21, name: '쓰름매미', tpl: 'cicada', col: ['#9ab86a', '#4e6a3a'], months: [8, 9], hours: [[16, 20]], loc: 'tree', tier: 2, val: 420, size: [3, 4], beh: 'C', spd: 1.2, flee: 1.7 },
    { id: 'mantis', ix: 22, name: '사마귀', tpl: 'mantis', col: ['#7cc35a', '#4e8a3a'], months: [8, 9, 10, 11], hours: [[8, 18]], loc: 'flower', tier: 2, val: 450, size: [6, 9], beh: 'B', spd: 0.6, flee: 1.3 },
    { id: 'longhorn_grasshopper', ix: 23, name: '방아깨비', tpl: 'cricket', art: 'grasshopper', tint: '#9fd36a', col: ['#9fd36a', '#5a8a3a'], months: [7, 8, 9, 10], hours: [[7, 18]], loc: 'ground', tier: 1, val: 200, size: [6, 9], beh: 'D', spd: 1.3, flee: 1.8 },
    { id: 'locust', ix: 24, name: '메뚜기', tpl: 'cricket', art: 'grasshopper', col: ['#b8b04a', '#7a7430'], months: [7, 8, 9, 10], hours: [[7, 18]], loc: 'ground', tier: 1, val: 180, size: [3, 5], beh: 'D', spd: 1.4, flee: 1.9 },
    { id: 'stag_beetle', ix: 25, name: '사슴벌레', tpl: 'stag', col: ['#5a3a22', '#2b1a10'], months: [6, 7, 8, 9], hours: [[18, 24], [0, 6]], loc: 'tree', tier: 4, val: 2500, size: [4, 7], beh: 'F', spd: 1, flee: 1.6 },
    { id: 'giant_stag', ix: 26, name: '왕사슴벌레', tpl: 'stag', col: ['#2b2430', '#14101a'], months: [7, 8], hours: [[20, 24], [0, 4]], loc: 'tree', tier: 5, val: 6000, size: [6, 8], beh: 'F', spd: 1.1, flee: 1.8, rare: 0.4 },
    { id: 'flower_chafer', ix: 27, name: '꽃무지', tpl: 'beetle', col: ['#5fbf7a', '#2f7a4a'], months: [5, 6, 7, 8], hours: [[8, 17]], loc: 'flower', tier: 2, val: 400, size: [1.6, 2.4], beh: 'B', spd: 0.6, flee: 1.3 },
    { id: 'jewel_beetle', ix: 28, name: '비단벌레', tpl: 'beetle', col: ['#3fd0a0', '#c45ad0'], months: [7, 8], hours: [[9, 15]], loc: 'tree', tier: 4, val: 3500, size: [3, 4], beh: 'C', spd: 1.2, flee: 2, rare: 0.5 },
    { id: 'snail', ix: 29, name: '달팽이', tpl: 'snail', col: ['#d9a877', '#c9c9b0'], months: ALL, hours: ALLDAY, loc: 'rock', tier: 1, val: 150, size: [1.5, 3], beh: 'E', spd: 0.2, flee: 0.8 },
    { id: 'caterpillar', ix: 30, name: '배추벌레', tpl: 'caterpillar', col: ['#9fe07a', '#ffd24d'], months: [4, 5, 6, 7, 8, 9], hours: [[6, 18]], loc: 'flower', tier: 1, val: 90, size: [2, 3.5], beh: 'B', spd: 0.3, flee: 0.9 },
    { id: 'water_strider', ix: 31, name: '소금쟁이', tpl: 'whirligig', art: 'strider', col: ['#5a4a3a', '#c9d8e0'], months: WARM, hours: [[6, 19]], loc: 'surface', tier: 1, val: 160, size: [1, 1.6], beh: 'G', spd: 1.8, flee: 1.8 },
    { id: 'diving_beetle', ix: 32, name: '물방개', tpl: 'whirligig', art: 'diving', col: ['#2f3a2a', '#c9b45a'], months: [5, 6, 7, 8, 9], hours: ALLDAY, loc: 'surface', tier: 3, val: 750, size: [2.5, 3.8], beh: 'G', spd: 1.4, flee: 1.6 },
    { id: 'moon_moth', ix: 33, name: '달빛나방', tpl: 'moth', col: ['#e6ffd0', '#9ad8a0'], months: [5, 6, 7, 8, 9], hours: [[20, 24], [0, 4]], loc: 'lamp', tier: 3, val: 1000, size: [8, 11], beh: 'A', spd: 1, flee: 1.8 },
    { id: 'tiger_moth', ix: 34, name: '불나방', tpl: 'moth', col: ['#ff9a8a', '#c44a3a'], months: [6, 7, 8, 9, 10], hours: [[19, 24], [0, 5]], loc: 'lamp', tier: 2, val: 450, size: [3, 5], beh: 'A', spd: 1.3, flee: 2 },
    { id: 'winter_moth', ix: 35, name: '겨울자나방', tpl: 'moth', col: ['#d8d2e6', '#8a8098'], months: [11, 12, 1, 2], hours: [[17, 24], [0, 6]], loc: 'lamp', tier: 2, val: 380, size: [2.5, 3.5], beh: 'A', spd: 1.1, flee: 1.8 },
    { id: 'snow_ladybug', ix: 36, name: '눈송이무당벌레', tpl: 'ladybug', col: ['#e8f0ff', '#8fb4d8'], months: WIN, hours: [[9, 16]], loc: 'ground', tier: 3, val: 900, size: [0.5, 0.8], beh: 'B', spd: 0.4, flee: 1.1 },
    { id: 'frost_pillbug', ix: 37, name: '서리공벌레', tpl: 'pillbug', col: ['#d8e6f5', '#9ab0c8'], months: WIN, hours: [[6, 18]], loc: 'rock', tier: 2, val: 420, size: [1, 1.6], beh: 'E', spd: 0.4, flee: 1 },
    { id: 'rainbow_dragonfly', ix: 38, name: '무지개실잠자리', tpl: 'dragonfly', col: ['#ff8fd0', '#8fb4ff'], months: [5, 6, 7, 8, 9, 10], hours: [[10, 15]], loc: 'water', tier: 4, val: 2200, size: [3, 4], beh: 'A', spd: 3, flee: 3.2, rare: 0.4 },
    { id: 'aurora_butterfly', ix: 39, name: '오로라나비', tpl: 'butterfly', col: ['#c9b3ff', '#7fdcc4'], months: [11, 12, 1, 2, 3], hours: [[10, 15]], loc: 'flower', tier: 5, val: 5000, size: [9, 12], beh: 'A', spd: 2.2, flee: 3, rare: 0.3 },
    { id: 'house_cricket', ix: 40, name: '집귀뚜라미', tpl: 'cricket', col: ['#a8845a', '#6b4f30'], months: ALL, hours: [[19, 24], [0, 5]], loc: 'ground', tier: 1, val: 140, size: [1.5, 2.2], beh: 'D', spd: 1.1, flee: 1.6 },
    // 북쪽 고지대에서만 (high) — 2026-11 고지대 열기
    { id: 'mountain_swallowtail', ix: 41, name: '산호랑나비', tpl: 'butterfly', col: ['#ffe08a', '#3a3030'], months: [4, 5, 6, 7, 8, 9], hours: [[6, 18]], loc: 'flower', tier: 3, val: 1800, size: [7, 10], beh: 'A', spd: 1.8, flee: 2.4, high: true },
    { id: 'cloud_dragonfly', ix: 42, name: '구름잠자리', tpl: 'dragonfly', col: ['#e8f4ff', '#8fb4e8'], months: [5, 6, 7, 8, 9, 10], hours: [[8, 18]], loc: 'air', tier: 3, val: 1600, size: [5, 7], beh: 'A', spd: 2.8, flee: 3.0, high: true },
    { id: 'alpine_longhorn', ix: 43, name: '고산하늘소', tpl: 'beetle', art: 'longhorn', tint: '#4a6a9a', col: ['#4a6a9a', '#1a2a4a'], months: [6, 7, 8, 9], hours: ALLDAY, loc: 'tree', tier: 4, val: 3200, size: [4, 6], beh: 'F', spd: 1.0, flee: 1.6, high: true },
    { id: 'star_firefly', ix: 44, name: '별반딧불이', tpl: 'firefly', col: ['#b8f0ff', '#2a3a4a'], months: [6, 7, 8, 9], hours: [[20, 24], [0, 3]], loc: 'air', tier: 4, val: 3500, size: [1.2, 1.8], beh: 'A', spd: 0.8, flee: 1.6, high: true },
    { id: 'snow_moth', ix: 45, name: '눈꽃나방', tpl: 'moth', col: ['#ffffff', '#c8d8f0'], months: [11, 12, 1, 2], hours: [[17, 24], [0, 5]], loc: 'air', tier: 3, val: 2000, size: [5, 7], beh: 'A', spd: 1.2, flee: 2.0, high: true },
  ]);
  D.add('fish', [
    { id: 'mandarin_fish', ix: 10, name: '쏘가리', months: [4, 5, 6, 7, 8, 9, 10], hours: [[16, 24], [0, 6]], loc: 'river', shadow: 3, tier: 3, val: 1200, size: [20, 45] },
    { id: 'kkeokji', ix: 11, name: '꺽지', months: ALL, hours: ALLDAY, loc: 'river', shadow: 2, tier: 2, val: 450, size: [10, 20] },
    { id: 'sweetfish', ix: 12, name: '은어', months: [6, 7, 8, 9], hours: DAY, loc: 'river', shadow: 2, tier: 2, val: 600, size: [15, 25] },
    { id: 'bagrid', ix: 13, name: '동자개', months: [5, 6, 7, 8, 9, 10], hours: [[18, 24], [0, 5]], loc: 'river', shadow: 2, tier: 2, val: 400, size: [12, 25] },
    { id: 'eel', ix: 14, name: '뱀장어', months: [6, 7, 8, 9], hours: [[19, 24], [0, 4]], loc: 'river', shadow: 4, tier: 4, val: 2500, size: [40, 90], shape: 'eel', rare: 0.4 },
    { id: 'cherry_salmon', ix: 15, name: '산천어', months: [3, 4, 5, 6, 9, 10, 11], hours: ALLDAY, loc: 'river', shadow: 3, tier: 3, val: 1000, size: [20, 35] },
    { id: 'gold_minnow', ix: 16, name: '금강모치', months: ALL, hours: DAY, loc: 'river', shadow: 1, tier: 1, val: 180, size: [5, 8] },
    { id: 'loach', ix: 17, name: '미꾸라지', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 1, tier: 1, val: 150, size: [8, 15], shape: 'eel' },
    { id: 'snakehead', ix: 18, name: '가물치', months: [5, 6, 7, 8, 9, 10], hours: ALLDAY, loc: 'pond', shadow: 5, tier: 3, val: 1300, size: [40, 80], shape: 'long' },
    { id: 'goldfish', ix: 19, name: '금붕어', months: ALL, hours: DAY, loc: 'pond', shadow: 1, tier: 2, val: 500, size: [5, 12] },
    { id: 'bitterling', ix: 20, name: '납자루', months: [3, 4, 5, 6, 7, 8, 9, 10], hours: DAY, loc: 'pond', shadow: 1, tier: 1, val: 200, size: [5, 8] },
    { id: 'pond_turtle', ix: 21, name: '자라', months: [5, 6, 7, 8, 9], hours: ALLDAY, loc: 'pond', shadow: 3, tier: 3, val: 1500, size: [15, 30], shape: 'turtle' },
    { id: 'flounder', ix: 22, name: '광어', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 3, tier: 2, val: 700, size: [30, 60], shape: 'flat' },
    { id: 'rockfish', ix: 23, name: '우럭', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 2, tier: 1, val: 450, size: [20, 40] },
    { id: 'hairtail', ix: 24, name: '갈치', months: [7, 8, 9, 10, 11], hours: [[18, 24], [0, 5]], loc: 'sea', shadow: 3, tier: 3, val: 1100, size: [60, 120], shape: 'eel' },
    { id: 'puffer', ix: 25, name: '복어', months: [3, 4, 5, 6, 7, 8, 9], hours: ALLDAY, loc: 'sea', shadow: 2, tier: 2, val: 600, size: [15, 30], shape: 'puffer' },
    { id: 'squid', ix: 26, name: '오징어', months: [6, 7, 8, 9, 10], hours: [[18, 24], [0, 5]], loc: 'sea', shadow: 2, tier: 2, val: 500, size: [20, 35], shape: 'squid' },
    { id: 'octopus', ix: 27, name: '문어', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 3, tier: 3, val: 900, size: [30, 70], shape: 'octo' },
    { id: 'jellyfish', ix: 28, name: '해파리', months: [7, 8, 9], hours: ALLDAY, loc: 'sea', shadow: 1, tier: 1, val: 100, size: [10, 30], shape: 'jelly' },
    { id: 'yellowtail', ix: 29, name: '방어', months: [11, 12, 1, 2], hours: ALLDAY, loc: 'sea', shadow: 4, tier: 3, val: 1400, size: [50, 90] },
    { id: 'sunfish', ix: 30, name: '개복치', months: [6, 7, 8, 9], hours: DAY, loc: 'sea', shadow: 5, tier: 5, val: 6000, size: [100, 250], shape: 'sunfish', rare: 0.2 },
    { id: 'blue_crab', ix: 31, name: '꽃게', months: [4, 5, 6, 9, 10, 11], hours: ALLDAY, loc: 'sea', shadow: 2, tier: 2, val: 400, size: [10, 20], shape: 'crab' },
    { id: 'filefish', ix: 32, name: '쥐치', months: ALL, hours: DAY, loc: 'sea', shadow: 2, tier: 1, val: 220, size: [12, 22] },
    { id: 'tuna', ix: 33, name: '참치', months: [12, 1, 2, 3], hours: [[5, 12]], loc: 'sea', shadow: 5, tier: 5, val: 8000, size: [100, 200], rare: 0.15, shape: 'tuna' },
  ]);
  D.add('fossils', [
    { id: 'dino_egg', ix: 4, name: '공룡알 화석', val: 2500 },
    { id: 'shark_tooth', ix: 5, name: '상어 이빨 화석', val: 1500 },
    { id: 'leaf_fossil', ix: 6, name: '나뭇잎 화석', val: 800 },
    { id: 'amber', ix: 7, name: '호박(보석)', val: 3000 },
    { id: 'sea_lily', ix: 8, name: '바다나리 화석', val: 1200 },
    { id: 'mammoth_tooth', ix: 9, name: '매머드 어금니', val: 3500 },
    { id: 'pterosaur_claw', ix: 10, name: '익룡 발톱', val: 2800 },
    { id: 'dino_footprint', ix: 11, name: '공룡 발자국 화석', val: 2200 },
  ]);
  D.add('shells', [
    { id: 'moon_snail', ix: 6, name: '큰구슬우렁', val: 160, w: 16, col: '#e8d2b0' },
    { id: 'sea_glass', ix: 7, name: '바다 유리', val: 250, w: 10, col: '#9fe0d0' },
    { id: 'sand_dollar', ix: 8, name: '연잎성게', val: 400, w: 8, col: '#f3e8d0' },
    { id: 'abalone', ix: 9, name: '전복 껍데기', val: 900, w: 5, col: '#b8d8e0' },
  ]);

  // ---------- 2026-11 새 생물 (GPT 새 그림 27장 + 기존 모양 색 바꾸기) ----------
  // art = 새 그림 모양(itemart), tint = 같은 모양 다른 종 색, cloud = 구름섬에서만
  const SUMMER = [6, 7, 8, 9], NIGHTS = [[18, 24], [0, 6]];
  D.add('bugs', [
    { id: 'atlas_beetle', ix: 46, name: '아틀라스장수풍뎅이', tpl: 'stag', art: 'rhino', tint: '#3a6a5a', col: ['#3a6a5a', '#1a3a2a'], months: [7, 8, 9], hours: NIGHTS, loc: 'tree', tier: 4, val: 3500, size: [4, 8], beh: 'F', spd: 1, flee: 1.6 },
    { id: 'gold_rhino', ix: 47, name: '황금장수풍뎅이', tpl: 'stag', art: 'rhino', tint: '#e0b040', col: ['#e0b040', '#8a6a20'], months: [7, 8], hours: [[21, 24], [0, 3]], loc: 'tree', tier: 5, val: 8000, size: [6, 9], beh: 'F', spd: 1.1, flee: 1.8, rare: 0.3 },
    { id: 'rice_grasshopper', ix: 48, name: '벼메뚜기', tpl: 'cricket', art: 'grasshopper', tint: '#c9c060', col: ['#c9c060', '#8a8a30'], months: [8, 9, 10], hours: DAY, loc: 'ground', tier: 1, val: 160, size: [2.5, 4], beh: 'D', spd: 1.4, flee: 1.9 },
    { id: 'spotted_longhorn', ix: 49, name: '알락하늘소', tpl: 'beetle', art: 'longhorn', col: ['#2a2a30', '#ffffff'], months: [6, 7, 8], hours: DAY, loc: 'tree', tier: 2, val: 500, size: [2.5, 3.5], beh: 'C', spd: 1, flee: 1.5 },
    { id: 'musk_longhorn', ix: 50, name: '사향하늘소', tpl: 'beetle', art: 'longhorn', tint: '#3f9a6a', col: ['#3f9a6a', '#1a4a30'], months: [7, 8], hours: [[9, 16]], loc: 'tree', tier: 3, val: 1300, size: [2.5, 3.5], beh: 'C', spd: 1, flee: 1.6 },
    { id: 'dung_beetle', ix: 51, name: '쇠똥구리', tpl: 'beetle', art: 'dung', col: ['#3a3a40', '#8a6a4a'], months: [5, 6, 7, 8, 9], hours: DAY, loc: 'ground', tier: 3, val: 900, size: [1.5, 2.5], beh: 'B', spd: 0.4, flee: 1.1 },
    { id: 'walking_stick', ix: 52, name: '대벌레', tpl: 'mantis', art: 'stick', col: ['#b8a070', '#8a7050'], months: [7, 8, 9, 10], hours: ALLDAY, loc: 'tree', tier: 2, val: 600, size: [7, 11], beh: 'C', spd: 0.4, flee: 1 },
    { id: 'orb_spider', ix: 53, name: '무당거미', tpl: 'ladybug', art: 'spider', tint: '#e0b040', col: ['#e0b040', '#3a3a30'], months: [8, 9, 10], hours: DAY, loc: 'tree', tier: 1, val: 220, size: [2, 3], beh: 'C', spd: 0.6, flee: 1.2 },
    { id: 'jumping_spider', ix: 54, name: '깡충거미', tpl: 'ladybug', art: 'spider', col: ['#a8845a', '#5a4030'], months: ALL, hours: DAY, loc: 'ground', tier: 1, val: 150, size: [0.6, 1], beh: 'D', spd: 1.2, flee: 1.6 },
    { id: 'blue_morpho', ix: 55, name: '모르포나비', tpl: 'butterfly', col: ['#3a8aff', '#8fd0ff'], months: SUMMER, hours: [[9, 15]], loc: 'flower', tier: 4, val: 4000, size: [10, 13], beh: 'A', spd: 2, flee: 2.8, rare: 0.5 },
    { id: 'orange_tip', ix: 56, name: '갈구리나비', tpl: 'butterfly', col: ['#fff8ec', '#ff9a3a'], months: [4, 5], hours: DAY, loc: 'flower', tier: 2, val: 350, size: [3, 4], beh: 'A', spd: 1.6, flee: 2 },
    { id: 'peacock_butterfly', ix: 57, name: '공작나비', tpl: 'butterfly', col: ['#c44a3a', '#3a6aa8'], months: [5, 6, 7, 8, 9], hours: [[8, 16]], loc: 'flower', tier: 3, val: 1000, size: [5, 7], beh: 'A', spd: 1.8, flee: 2.4 },
    { id: 'damselfly', ix: 58, name: '실잠자리', tpl: 'dragonfly', col: ['#5ac8c0', '#2a6a7a'], months: [5, 6, 7, 8], hours: DAY, loc: 'water', tier: 1, val: 140, size: [3.5, 4.5], beh: 'A', spd: 2.4, flee: 2.6 },
    { id: 'field_cricket', ix: 59, name: '왕귀뚜라미', tpl: 'cricket', col: ['#3a2a20', '#6b4f30'], months: [8, 9, 10, 11], hours: [[18, 24], [0, 4]], loc: 'ground', tier: 2, val: 320, size: [2.5, 3.5], beh: 'D', spd: 1.1, flee: 1.6 },
    // 구름섬에서만
    { id: 'cloud_butterfly', ix: 60, name: '구름나비', tpl: 'butterfly', art: 'cloudfly', col: ['#cfe6ff', '#ffffff'], months: ALL, hours: ALLDAY, loc: 'flower', tier: 4, val: 3200, size: [8, 11], beh: 'A', spd: 1.6, flee: 2.4, cloud: true },
    { id: 'rainbow_cloudfly', ix: 61, name: '무지개구름나비', tpl: 'butterfly', art: 'cloudfly', tint: '#ffb0d8', col: ['#ffb0d8', '#b0d8ff'], months: ALL, hours: [[6, 18]], loc: 'flower', tier: 5, val: 7000, size: [9, 12], beh: 'A', spd: 1.8, flee: 2.6, cloud: true, rare: 0.4 },
    { id: 'fluffy_ladybug', ix: 62, name: '솜털무당벌레', tpl: 'ladybug', col: ['#ffffff', '#ffb0c8'], months: ALL, hours: ALLDAY, loc: 'flower', tier: 3, val: 1500, size: [0.6, 1], beh: 'B', spd: 0.4, flee: 1.1, cloud: true },
    { id: 'stardust_beetle', ix: 63, name: '별가루풍뎅이', tpl: 'beetle', col: ['#ffd86b', '#8a6aff'], months: ALL, hours: ALLDAY, loc: 'tree', tier: 4, val: 2800, size: [1.5, 2.5], beh: 'C', spd: 1, flee: 1.6, cloud: true },
  ]);
  D.add('fish', [
    { id: 'crayfish', ix: 34, name: '가재', months: [4, 5, 6, 7, 8, 9, 10], hours: ALLDAY, loc: 'river', shadow: 1, tier: 2, val: 450, size: [6, 12], shape: 'crayfish' },
    { id: 'river_shrimp', ix: 35, name: '징거미새우', months: ALL, hours: ALLDAY, loc: 'river', shadow: 1, tier: 1, val: 200, size: [5, 9], shape: 'shrimp' },
    { id: 'tree_frog', ix: 36, name: '청개구리', months: [4, 5, 6, 7, 8, 9], hours: ALLDAY, loc: 'pond', shadow: 1, tier: 1, val: 250, size: [3, 5], shape: 'frog' },
    { id: 'pond_frog', ix: 37, name: '참개구리', months: [5, 6, 7, 8, 9], hours: [[16, 24], [0, 6]], loc: 'pond', shadow: 2, tier: 2, val: 450, size: [6, 9], shape: 'frog', tint: '#8aa850' },
    { id: 'sturgeon', ix: 38, name: '철갑상어', months: [9, 10, 11, 12, 1, 2, 3], hours: ALLDAY, loc: 'river', shadow: 5, tier: 4, val: 4500, size: [80, 180], shape: 'sturgeon', rare: 0.3 },
    { id: 'trout', ix: 39, name: '송어', months: [3, 4, 5, 6, 9, 10, 11], hours: ALLDAY, loc: 'river', shadow: 3, tier: 2, val: 600, size: [25, 45] },
    { id: 'rainbow_trout', ix: 40, name: '무지개송어', months: [3, 4, 5, 10, 11], hours: DAY, loc: 'river', shadow: 3, tier: 3, val: 1100, size: [30, 55] },
    { id: 'stingray', ix: 41, name: '노랑가오리', months: [5, 6, 7, 8, 9, 10], hours: ALLDAY, loc: 'sea', shadow: 4, tier: 3, val: 1500, size: [40, 90], shape: 'ray' },
    { id: 'manta', ix: 42, name: '쥐가오리', months: [7, 8, 9], hours: DAY, loc: 'sea', shadow: 5, tier: 5, val: 7000, size: [150, 300], shape: 'ray', tint: '#4a5a78', rare: 0.25 },
    { id: 'small_shark', ix: 43, name: '별상어', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 4, tier: 3, val: 1800, size: [60, 110], shape: 'shark' },
    { id: 'hammerhead', ix: 44, name: '귀상어', months: [6, 7, 8, 9], hours: ALLDAY, loc: 'sea', shadow: 5, tier: 5, val: 7500, size: [150, 300], shape: 'shark', tint: '#6a7a8a', rare: 0.2 },
    { id: 'skipjack', ix: 45, name: '가다랑어', months: [4, 5, 6, 7, 8, 9], hours: DAY, loc: 'sea', shadow: 4, tier: 3, val: 1300, size: [40, 80], shape: 'tuna', tint: '#5a7aa8' },
    { id: 'spiny_puffer', ix: 46, name: '가시복', months: [7, 8, 9], hours: ALLDAY, loc: 'sea', shadow: 2, tier: 3, val: 1200, size: [20, 40], shape: 'puffer' },
    { id: 'sole', ix: 47, name: '가자미', months: ALL, hours: ALLDAY, loc: 'sea', shadow: 2, tier: 1, val: 300, size: [20, 40], shape: 'flat' },
    { id: 'conger', ix: 48, name: '붕장어', months: [5, 6, 7, 8, 9, 10], hours: NIGHT, loc: 'sea', shadow: 3, tier: 2, val: 550, size: [40, 90], shape: 'eel' },
    { id: 'moray', ix: 49, name: '곰치', months: [6, 7, 8, 9, 10], hours: NIGHT, loc: 'sea', shadow: 3, tier: 3, val: 1400, size: [50, 100], shape: 'moray' },
    { id: 'lobster', ix: 50, name: '바닷가재', months: [11, 12, 1, 2, 3, 4], hours: NIGHT, loc: 'sea', shadow: 2, tier: 4, val: 3200, size: [25, 45], shape: 'lobster' },
    // 구름섬에서만
    { id: 'star_medaka', ix: 51, name: '별빛송사리', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 1, tier: 4, val: 2600, size: [3, 5], shape: 'starfry', cloud: true },
    { id: 'cotton_goldfish', ix: 52, name: '솜사탕붕어', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 2, tier: 3, val: 1500, size: [8, 14], cloud: true },
    { id: 'cloud_jelly', ix: 53, name: '구름해파리', months: ALL, hours: ALLDAY, loc: 'pond', shadow: 2, tier: 5, val: 6500, size: [10, 25], shape: 'cloudjelly', cloud: true, rare: 0.35 },
  ]);

  // 아이템: 생물·화석·조개는 데이터에서 파생, 나머지는 직접
  const items = [
    { id: 'branch', name: '나뭇가지', cat: 'mat', val: 15, stack: 30 },
    { id: 'fruit_acorn', name: '도토리', cat: 'mat', val: 30, stack: 30 },
    { id: 'gold', name: '금', cat: 'mat', val: 0, stack: 1, nosell: true },
    { id: 'letter_ddalang', name: '딸랑에게 갈 편지', cat: 'letter', val: 0, stack: 1, nosell: true },
    { id: 'letter_noaddr', name: '주소 없는 편지', cat: 'letter', val: 0, stack: 1, nosell: true },
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
    shovel: { name: '삽', icon: '', price: 500 }, // 아이콘은 그린 그림(tool:shovel)을 쓴다
  };
  const TOOL_TIERS = {
    net: [
      { name: '기본 잠자리채', price: 0, reach: 1, grace: 0.50, rare: [1.1, 1.15, 1.25], minRare: 0 },
      { name: '튼튼 잠자리채', price: 3000, reach: 1.35, grace: 0.50, rare: [1.2, 1.5, 1.7], minRare: 0 },
      { name: '은물결 잠자리채', price: 10000, reach: 1.48, grace: 0.56, rare: [1.3, 1.75, 2.15], minRare: 0.02 },
      { name: '달빛 잠자리채', price: 25000, reach: 1.62, grace: 0.63, rare: [1.45, 2.1, 2.75], minRare: 0.035 },
      { name: '별빛 잠자리채', price: 50000, reach: 1.76, grace: 0.70, rare: [1.6, 2.45, 3.4], minRare: 0.05 },
    ],
    axe: [
      { name: '기본 도끼', price: 0, wood: [1, 1, 1] },
      { name: '튼튼 도끼', price: 3000, wood: [2, 1, 1] },
      { name: '은물결 도끼', price: 10000, wood: [2, 2, 1] },
      { name: '달빛 도끼', price: 25000, wood: [2, 2, 2] },
      { name: '별빛 도끼', price: 50000, wood: [3, 3, 2] },
    ],
  };
  G.toolTiers = (t) => t === 'rod' ? G.fishing?.RODS : TOOL_TIERS[t];
  G.toolLevel = (t, p = G.player) => {
    const level = Number(p?.up?.[t]), tiers = G.toolTiers(t);
    return tiers && Number.isInteger(level) ? G.u.clamp(level, 0, tiers.length - 1) : 0;
  };
  G.toolTier = (t, p) => G.toolTiers(t)?.[G.toolLevel(t, p)];

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
  G.lines = (who, sit) => G.data.all('lines').filter((l) => l.who === who && l.sit === sit);

  // ---------- 변이 6종 (도감 칸 = 종 × 6) ----------
  // 0 일반 · 1 거대 · 2 새하얀(알비노) · 3 줄무늬(희귀 무늬) · 4 황금 · 5 계절빛
  G.VARIANTS = [
    { v: 0, name: '', mul: 1 },
    { v: 1, name: '거대', mul: 1.5 },
    { v: 2, name: '새하얀', mul: 2 },
    { v: 3, name: '줄무늬', mul: 1.8 },
    { v: 4, name: '황금', mul: 5 },
    { v: 5, name: '계절빛', mul: 1.6 },
  ];
  // 확률: 거대 5% · 새하얀 1.2%(밤 ×2) · 줄무늬 2%(비·눈 ×2) · 계절빛 3% · 황금은 등불 1 점등 후(베타는 잠김)
  G.rollVariant = (r, ctx) => {
    const night = ctx && ctx.night, wet = ctx && ctx.wet;
    const t = [[1, 0.05], [2, 0.012 * (night ? 2 : 1)], [3, 0.02 * (wet ? 2 : 1)], [5, 0.03], [4, ctx && ctx.golden ? 0.004 : 0]];
    let acc = 0; for (const [v, p] of t) { acc += p; if (r < acc) return v; }
    return 0;
  };
  G.modules.add('data');
})(globalThis.G);
