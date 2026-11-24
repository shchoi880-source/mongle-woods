// 이웃 이야기 (6차 회의 묶음 B): 하트가 오를 때마다 주민별 특별 이야기 1장 + 선물, 주민 생일 축하
// 하트 1~4 = 주민마다 4장. 말을 걸면 아직 안 본 장이 먼저 나온다. 벌 없음 — 놓쳐도 나중에 이어서 본다
(function (G) {
  'use strict';
  // gift: 아이템 id(가구는 'furn:id#색'), money: 몽
  const S = {
    ddalang: [
      { t: ['{name}! 비밀 하나 알려 줄까? 나 사실… 숨바꼭질 이기는 법을 드디어 알아냈어!', '방울을 손으로 꼭 쥐고 있으면 소리가 안 나! 랄랄!', '…근데 그러면 손이 없어서 숨을 데를 못 짚어. 다음 연구 과제야.'], gift: 'dish:jam' },
      { t: ['오늘 할아버지 참나무한테 네 이야기 했어.', '바람이 불었는데, 잎사귀가 「좋은 친구구나」 하고 대답했어. 진짜야!', '그래서 이거 줄게. 참나무 그늘에서 쉬라고. 랄랄!'], gift: 'furn:cushion#1' },
      { t: ['{name}, 있잖아. 나 처음 이사 왔을 때 아무도 없어서 조금 무서웠어.', '방울 소리만 혼자 딸랑딸랑. 근데 이제는 소리가 들리면 다들 「딸랑이다!」 해 줘.', '그 첫 번째가 너였어. 고마워. 이거 내 보물 상자에서 꺼낸 거야.'], money: 5000 },
      { t: ['오늘은 내가 편지를 썼어. 우편지기한테 우편지기가 편지 받는 거 처음이지? 랄랄!', '「{name}에게. 세상에서 제일 친한 친구야. 숨바꼭질은 평생 져 줄게.」', '…읽지 마! 아니 읽어! 둘 다야! 랄랄랄!'], gift: 'furn:teddy#1' },
    ],
    sogeum: [
      { t: ['관찰 일지 3쪽. 「우편지기는 물고기를 보면 눈이 반짝인다」.', '가설: 너는 물고기를 좋아한다. 검증 방법: 같이 낚시를 간다.', '…검증은 나중에. 일단 이 수프부터. 퐁당.'], gift: 'dish:radish_soup' },
      { t: ['연구 결과 발표. 이 마을 강물은 하루에 0.3센티미터씩 바다 쪽으로 기운다.', '의미는 없다. 그냥 재밌다. 너도 재밌지?', '재밌다고 하면 이걸 준다. 연구실 남는 의자다.'], gift: 'furn:chair#0' },
      { t: ['나는 원래 혼자 연구하는 게 편했다.', '그런데 네가 잡아 온 물고기를 볼 때마다 새 가설이 생긴다. 공동 연구자가 필요하다는 가설.', '그 가설은… 맞았다. 연구비다. 받아라. 퐁당.'], money: 5000 },
      { t: ['최종 보고서. 제목: 「몽글숲에서 가장 중요한 발견」.', '결론: 친구. 근거: 너. 참고 문헌: 없음. 직접 관찰했으니까.', '이 어항, 내 연구실 거랑 똑같은 거다. 같은 물고기를 보자. 퐁당.'], gift: 'furn:aquarium#0' },
    ],
    lime: [
      { t: ['…뭐야. 꽃밭에 왜 왔어. 흥칫.', '…꽃 밟지 않고 걸어왔네. 그건 칭찬해 줄게.', '이거 남은 거야. 일부러 남긴 거 아니야.'], gift: 'dish:pumpkin_pie' },
      { t: ['나 고양이라서 혼자가 좋아. 원래 그래.', '…근데 네가 안 오는 날은 꽃이 덜 예쁘게 피는 것 같아. 착각이겠지만.', '화분 하나 가져가. 착각인지 확인해 보게.'], gift: 'furn:plant#0' },
      { t: ['{name}. 너 잠자리채 잡는 자세가 엉망이야.', '이렇게. 손목을 부드럽게. …그래, 그거. 흥칫, 금방 배우네.', '이건 내가 처음 잡은 나비 값으로 받은 돈이야. 줄게. 이유는 묻지 마.'], money: 5000 },
      { t: ['…한 번만 말할 거야. 잘 들어.', '너랑 있으면 편해. 꼬리가 저절로 동그랗게 말려. 이건 고양이한테 엄청난 거야.', '…끝! 이 등 가져가. 밤에도 꽃밭 보러 와도 되게. 흥칫.'], gift: 'furn:starlamp#2' },
    ],
    jjongal: [
      { t: ['특종! 우편지기 인터뷰! 첫 질문! 좋아하는 음식은?', '…대답하기 전에 내가 적었어. 「아마 옥수수」. 맞지? 도토독!', '틀려도 기사는 그대로 나가. 대신 이거 줄게.'], gift: 'dish:grilled_corn' },
      { t: ['쫑알 일보 구독자 수 발표! 열한 명! 그중 한 명이 너야!', '…사실 나머지 열 명도 다 네가 아는 이웃이야. 그래도 숫자는 숫자니까!', '구독 감사 선물! 라디오야. 내 방송도 곧 시작할 거야!'], gift: 'furn:radio#3' },
      { t: ['기자는 원래 남 이야기만 써. 근데 오늘은 내 이야기를 쓰고 싶어졌어.', '제목은 「도토리 하나로 시작된 우정」. 주인공은 나랑 너. 도토독.', '원고료 대신 이거. 아껴 쓴 거야!'], money: 5000 },
      { t: ['호외! 호외! 쫑알 일보 창간 이래 최대 특종!', '「몽글숲 다람쥐 기자, 평생 친구를 찾다」. 사진은 없지만 마음속엔 있어!', '1면 기념 지구본이야. 세상 모든 소식보다 네 소식이 좋아!'], gift: 'furn:globe#0' },
    ],
    danchu: [
      { t: ['안녕하십니까. 기록부에 새 항목을 만들었습니다. 「{name}」.', '오늘 기록: 인사를 잘함. 발걸음이 단정함. 좋습니다.', '첫 기록 기념으로 이것을 드립니다. 단정.'], gift: 'dish:carrot_soup' },
      { t: ['저는 매일 같은 시각에 같은 일을 합니다. 그게 편합니다.', '그런데 요즘은 「{name}을 만나는 시간」도 일과에 넣었습니다. 아주 정확히.', '단정한 책상 하나 드리겠습니다. 기록하실 일이 많으실 테니.'], gift: 'furn:desk#0' },
      { t: ['기록부를 다시 읽어 보았습니다. 당신 이름이 제일 많이 나옵니다.', '통계적으로 매우 의미 있는 수치입니다. 결론: 당신은 제 친구입니다.', '…결론을 말로 하니 조금 쑥스럽군요. 이것을 받으십시오.'], money: 5000 },
      { t: ['오늘은 기록부를 덮었습니다. 처음 있는 일입니다.', '적지 않아도 기억하고 싶은 날이 생겼기 때문입니다. 바로 오늘입니다.', '시계를 드리겠습니다. 함께한 시간이 정확히 흐르도록. 단정.'], gift: 'furn:clock#0' },
    ],
    hotteok: [
      { t: ['우편지기! 아침 달리기 같이 할래? 바닷가 열 바퀴! 후끈!', '…다섯 바퀴로 하자. 아니 세 바퀴. 너 표정이 너무 솔직해!', '달리고 나면 이거 먹어. 힘이 난다!'], gift: 'dish:pancake' },
      { t: ['나 사실 운동회 처음 열었을 때 아무도 안 올까 봐 걱정했어.', '근데 네가 제일 먼저 와서 몸풀기를 했잖아. 그게 엄청 힘이 됐어!', '이 벤치, 응원석이야! 네 자리!'], gift: 'furn:bench#0' },
      { t: ['힘센 것보다 중요한 게 뭔지 알아? 같이 뛰어 줄 친구야! 후끈!', '혼자 뛰면 빠르지만, 같이 뛰면 멀리 간대. 누가 한 말인지는 몰라!', '상금이다! 우승은 못 했지만 우정상이야!'], money: 5000 },
      { t: ['오늘은 달리기 말고 그냥 앉아 있자.', '…이런 날도 좋네. 너랑이면 가만히 있어도 심장이 후끈해.', '벽난로 줄게. 추운 날엔 이거 보면서 나 생각해! 하하!'], gift: 'furn:fireplace#0' },
    ],
    mungchi: [
      { t: ['…앗, 깼어. 아니 안 잤어. 눈만 감고 있었어… 말랑.', '너 오는 소리 들으면 이상하게 잠이 확 깨. 신기해.', '볼 주머니에서 꺼낸 거야… 따뜻해… 먹어도 돼….'], gift: 'crop:pumpkin' },
      { t: ['나 낮잠 자는 곳 알려 줄게. 할아버지 참나무 뿌리 사이. 비밀이야….', '거기 누우면 하늘이 동그랗게 보여. 너도 누워 봐… 말랑….', '이 방석 깔고 누우면 더 좋아….'], gift: 'furn:cushion#4' },
      { t: ['다들 내가 게으르대. 맞아… 근데 너는 그 말 안 해.', '그냥 옆에 앉아서 같이 쉬어 줘. 그게 얼마나 좋은지 몰라….', '모아 둔 거 줄게… 해바라기씨 판 돈이야… 말랑.'], money: 5000 },
      { t: ['꿈에 네가 나왔어…. 같이 구름 위에서 뒹굴었어.', '깨어나서도 기분이 좋았어. 꿈이랑 똑같이 너가 있으니까….', '이 침대… 같이 꿈꾸자는 뜻이야…. 말랑.'], gift: 'furn:bed#4' },
    ],
    mongsil: [
      { t: ['오늘의 구름 예보: {name}네 위에 「반가움」 구름! 포슬!', '…맞았지? 지금 반가운 얼굴이잖아! 드디어 예보 적중!', '적중 기념 선물이야!'], gift: 'dish:cabbage_stew' },
      { t: ['나 구름을 병에 모으고 있어. 아무도 안 믿지만 진짜야.', '이건 「처음 너를 만난 날」 구름이야. 몽글몽글하지?', '병은 비밀이고… 이 등은 줄게. 밤에 구름처럼 빛나!'], gift: 'furn:floorlamp#4' },
      { t: ['예보는 자꾸 틀려도 괜찮아. 너는 늘 와 주니까.', '그건 예보가 필요 없는 일이야. 확실한 거야. 포슬.', '꿈 저금통 털었어! 다 줄게!'], money: 5000 },
      { t: ['큰솜이는 아직 자고 있지만, 나는 알아. 꿈속에서 우리를 보고 있어.', '그리고 큰솜이 꿈에서 제일 반짝이는 건 분명 너야. 예보가 아니라 진짜야.', '별빛 조명 줄게. 꿈이 밝아지게. 포슬!'], gift: 'furn:starlamp#4' },
    ],
  };

  const st = { done: {}, bday: {} };
  const SY = G.story = { S, st };

  // 오늘이 생일인 주민 (마을 달력)
  SY.birthdayToday = () => {
    const dd = G.time.dayDate(G.time.day()), key = String(dd.m).padStart(2, '0') + '-' + String(dd.d).padStart(2, '0');
    return Object.keys(G.npc.VILLAGERS).filter((id) => G.npc.VILLAGERS[id].bday === key && G.npc.isResident(id));
  };
  // 주민에게 말을 걸 때: 생일 → 아직 안 본 하트 이야기. 처리했으면 true
  SY.onTalk = async (n) => {
    const id = n.id, v = G.npc.VILLAGERS[id]; if (!v || !S[id]) return false;
    const name = G.player.name, say = (text) => ({ who: id, text: G.str(text, { name }) });
    // 생일 (마을 1년에 한 번)
    const year = G.time.dayDate(G.time.day()).y;
    if (SY.birthdayToday().includes(id) && st.bday[id] !== year) {
      st.bday[id] = year; G.save.mark('story');
      G.npc.pop(n, 'heart'); G.audio.sfx('chime');
      await G.ui.say([say(`앗, 기억해 줬어?! 오늘 내 생일이야! ${v.catch}!`), say('축하 받으니까 하늘을 나는 기분이야. 고마워!'), { who: 'sys', text: `🎂 ${v.name}의 생일을 축하했어요! (친밀도 크게 올라요)` }]);
      G.npc.addFs(id, 6, 'bday');
      if (G.inv.canFit('dish:pancake')) { G.inv.add('dish:pancake', 1); G.ui.itemPop('dish:pancake', null, `${v.name}에게 생일 답례 팬케이크를 받았다!`); }
      return true;
    }
    // 하트 이야기
    const lvl = G.npc.level(id), done = st.done[id] || 0;
    if (lvl > done && done < 4) {
      const sc = S[id][done];
      st.done[id] = done + 1; G.save.mark('story');
      G.npc.pop(n, 'heart');
      await G.ui.say(sc.t.map(say).concat([{ who: 'sys', text: `💗 ${v.name} 이야기 ${done + 1}/4` }]));
      if (sc.money) { G.wallet.add(sc.money, 'story'); G.audio.sfx('coin'); G.ui.toast(`${v.name}에게 ${G.fmt.money(sc.money)}을 받았어요!`, { icon: '💗' }); }
      if (sc.gift) {
        const [gid, c] = sc.gift.split('#'), x = gid.startsWith('furn:') ? { c: +c || 0 } : null;
        if (G.inv.canFit(gid, x)) { G.inv.add(gid, 1, x); G.ui.itemPop(gid, x, `${v.name}에게 ${G.items.name(gid, x)}${G.josa(G.items.name(gid, x), '을/를').slice(-1)} 받았다!`); G.audio.sfx('catch'); }
        else { G.storage && G.storage.slots.length < G.storage.size ? (G.storage.slots.push({ id: gid, n: 1, x }), G.ui.toast(`가방이 꽉 차서 ${v.name}의 선물을 집 보관함에 넣어 뒀어요.`, { icon: '📦' })) : G.ui.toast('가방이 꽉 찼어요!', { icon: '🎒' }); }
      }
      G.emit('story:scene', { id, n: done + 1 });
      return true;
    }
    return false;
  };
  // 이야기 진행 (이웃 탭 표시용)
  SY.progress = (id) => st.done[id] || 0;

  // 새 아침: 오늘 생일인 주민 알림
  G.on('time:day', () => {
    if (!G.game || !G.game.started) return;
    const b = SY.birthdayToday().filter((id) => st.bday[id] !== G.time.dayDate(G.time.day()).y);
    if (b.length) setTimeout(() => G.ui.toast(`🎂 오늘은 ${b.map((id) => G.npc.VILLAGERS[id].name).join('·')}의 생일이에요! 말을 걸어 축하해 줘요.`, { icon: '🎉', ms: 5000 }), 2500);
  });

  G.save.section('story', { v: 1, def: () => ({ done: {}, bday: {} }), get: () => JSON.parse(JSON.stringify(st)), set: (d) => { st.done = d.done || {}; st.bday = d.bday || {}; } });
  G.modules.add('story');
})(globalThis.G);
