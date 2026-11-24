// 등불 기둥 10개 (메타 목표 ④, 4차 회의 판정 B) + 큰솜이 그림책. 1~10번 전부 (3~10번: 2026-11 긴 목표 확장)
(function (G) {
  'use strict';
  const st = { lit: 0, litDay: [], pages: 0 };
  const LN = G.lantern = {
    st,
    count: () => st.lit,
    golden: () => st.lit >= 1,
    // 다음 등불 조건: [{text, ok, cur, need}]
    conds(n) {
      const res = Object.keys(G.npc.VILLAGERS).filter((id) => G.npc.isResident(id)).length;
      if (n === 1) return [
        { text: '이웃 8명이 이사 오기', cur: res, need: 8 },
        { text: '박물관 기증 15점', cur: G.museum.total(), need: 15 },
      ].map((c) => Object.assign(c, { ok: c.cur >= c.need }));
      if (n === 2) {
        const close = Object.keys(G.npc.VILLAGERS).filter((id) => G.npc.level(id) >= 3).length;
        return [
          { text: '오늘의 부탁 15건 들어주기', cur: G.requests.st.doneCount || 0, need: 15 },
          { text: '하트 3개 이상인 이웃 2명', cur: close, need: 2 },
        ].map((c) => Object.assign(c, { ok: c.cur >= c.need }));
      }
      const stage = G.nest ? G.nest.st.stage : 0, sales = (G.save.sections.get('econ').get() || {}).salesTotal || 0;
      const hearts = (lv) => Object.keys(G.npc.VILLAGERS).filter((id) => G.npc.level(id) >= lv).length;
      const dex = G.collect.total(), mus = G.museum.total(), reqs = G.requests.st.doneCount || 0;
      const T = {
        3: [['도감 30종 채우기', dex, 30], ['텃밭 작물 30개 수확', G.farm.st.harvested || 0, 30]],
        4: [['「작은 집」으로 넓히기', stage >= 2 ? 1 : 0, 1], ['목장 생산물 20개 거두기', G.ranch.st.collected || 0, 20]],
        5: [['박물관 기증 35점', mus, 35], ['하트 3개 이상인 이웃 4명', hearts(3), 4]],
        6: [['거대 작물 3개 수확', G.farm.st.giants || 0, 3], ['누적 판매 30만 몽', sales, 300000]],
        7: [['도감 60종 채우기', dex, 60], ['「큰 집」으로 넓히기', stage >= 3 ? 1 : 0, 1]],
        8: [['박물관 기증 60점', mus, 60], ['하트 4개인 이웃 4명', hearts(4), 4]],
        9: [['누적 판매 100만 몽', sales, 1000000], ['오늘의 부탁 80건 들어주기', reqs, 80]],
        10: [['박물관 기증 85점', mus, 85], ['「꿈의 집」 짓기', stage >= 4 ? 1 : 0, 1]],
      }[n];
      if (T) return T.map(([text, cur, need]) => ({ text, cur, need, ok: cur >= need }));
      return [{ text: '모든 등불이 켜졌어요', cur: 1, need: 1, ok: true }];
    },
    ready(n) { return n === st.lit + 1 && n <= 10 && LN.conds(n).every((c) => c.ok); },
    // 등불마다 선물 (가구 + 몽)
    REWARD: { 3: 'starlamp', 4: 'aquarium', 5: 'piano', 6: 'fireplace', 7: 'globe', 8: 'bathtub', 9: 'teddy', 10: 'cake' },
    async interact(o) {
      const n = o.n, say = (who, text) => ({ who, text });
      if (n <= st.lit) { await G.ui.say([say('sys', `${n}번 등불 기둥이 따뜻하게 빛나고 있어요. 큰솜이가 조금 더 깊이 꿈을 꾸는 것 같아요.`)]); return; }
      if (n !== st.lit + 1) { await G.ui.say([say('sys', `꺼진 ${n}번 등불 기둥이에요. 먼저 ${st.lit + 1}번 기둥을 밝혀야 해요.`)]); return; }
      if (!LN.ready(n)) {
        const cs = LN.conds(n).map((c) => `${c.ok ? '✔' : '·'} ${c.text} (${Math.min(c.cur, c.need)}/${c.need})`).join('\n');
        await G.ui.say([say('sys', `꺼진 ${n}번 등불 기둥이에요. 기둥에 작은 글씨가 새겨져 있어요.\n${cs}`)]);
        return;
      }
      await LN.ceremony(n);
    },
    async ceremony(n) {
      G.audio.sfx('chime');
      const names = Object.keys(G.npc.VILLAGERS).filter((id) => G.npc.isResident(id)).map((id) => G.npc.VILLAGERS[id].name);
      await G.ui.say([
        { who: 'bori', text: n === 1 ? '모두 모였구나. 몽글숲에 첫 등불을 밝히는 날이란다. 콕!' : n === 2 ? '두 번째 등불이로구나. 마을이 한결 따뜻해졌어.' : n === 10 ? '마지막 열 번째 등불이로구나…. 이 날을 얼마나 기다렸는지 모른단다. 콕.' : `${n}번째 등불이로구나. 큰솜이의 꿈이 점점 또렷해지는구나.` },
        { who: 'ddalang', text: n === 1 ? '두근두근해! 방울도 두근두근해! 랄랄!' : n === 10 ? '다 켜면… 큰솜이가 우리 얼굴을 볼 수 있을까? 랄랄…!' : '이번엔 내가 제일 먼저 박수 칠 거야!' },
        { who: 'sys', text: `${names.join(', ')}… 이웃들이 기둥 둘레에 모였어요.` },
        { who: 'bori', text: '우편지기, 네가 불을 붙이렴. 이 마을에 편지를 나르는 건 너니까.' },
      ]);
      st.lit = n; st.litDay.push(G.time.day()); st.pages = n;
      G.save.now('lantern');
      G.audio.sfx('stamp'); setTimeout(() => G.audio.sfx('rare'), 400);
      G.game.sparkle(G.player.x, G.player.y - 60, 16, '#ffe066');
      G.emit('lantern:lit', { n });
      await G.ui.say([
        { who: 'sys', text: `${n}번 등불이 켜졌어요! 땅이 아주 천천히 올라갔다 내려가요. 큰솜이가 꿈을 꾸기 시작했어요.` },
        { who: 'kongal', text: '꼬물꼬물꼬물!' },
      ].concat(n === 1 ? [{ who: 'sys', text: '이제부터 아주 드물게 「황금」 빛 생물이 나타난대요.' }] : []));
      const rw = LN.REWARD[n];
      if (rw) {
        const money = n * 10000; G.wallet.add(money, 'lantern');
        if (G.inv.canFit('furn:' + rw, { c: 0 })) G.inv.add('furn:' + rw, 1, { c: 0 });
        await G.ui.say([{ who: 'bori', text: `이웃들이 모은 선물이란다. ${G.fmt.money(money)}이랑 「${G.items.name('furn:' + rw)}」. 집에 놓아 보렴. 콕!` }]);
        G.save.now('lantern-gift');
      }
      await LN.book(n);
    },
    // 큰솜이 그림책 (등불마다 한 장)
    book(only) {
      const PAGES = [
        ['아주 먼 옛날, 하늘을 떠돌던 커다란 구름양 한 마리가 있었어요.', '구름양은 너무 오래 떠돌아서, 그만 졸음이 쏟아졌지요.', '「조금만… 쉬었다 가야지.」', '구름양이 웅크려 잠들자, 등 위에 작은 씨앗 하나가 내려앉았어요.'],
        ['씨앗은 숲이 되고, 숲에는 친구들이 하나둘 이사 왔어요.', '친구들은 구름양을 「큰솜이」라고 불렀어요.', '큰솜이가 숨 쉴 때마다 부는 바람이 매일 새 선물을 실어 왔지요.', '그런데 큰솜이는 아직 한 번도 친구들의 얼굴을 본 적이 없었어요.'],
        ['세 번째 불빛이 켜지자, 큰솜이의 꿈에 처음으로 색이 생겼어요.', '꿈속은 온통 연두색이었어요. 텃밭에서 자라는 작은 잎들의 색.', '「이건… 누가 심은 걸까?」', '큰솜이는 꿈속에서 흙 냄새를 맡았어요.'],
        ['네 번째 불빛. 꿈에 소리가 들리기 시작했어요.', '꼬꼬댁, 음매, 히힝. 그리고 누군가 웃는 소리.', '큰솜이는 귀를 쫑긋 세웠어요. 물론 구름이라 귀가 어디 있는지는 아무도 몰라요.', '「시끄럽지만… 좋은 소리야.」'],
        ['다섯 번째 불빛. 꿈속에 박물관이 생겼어요.', '거기엔 큰솜이가 한 번도 본 적 없는 반짝이는 것들이 가득했어요.', '나비 날개, 물고기 비늘, 아주 오래된 돌멩이.', '「내 등 위에 이렇게 예쁜 게 많았구나.」'],
        ['여섯 번째 불빛. 꿈이 따뜻해졌어요.', '누군가 아주 커다란 호박을 들고 자랑하는 모습이 보였어요.', '큰솜이는 웃음이 나왔어요. 몸이 조금 들썩였지요.', '그날 마을에는 작은 지진이 났대요. 아주 기분 좋은 지진.'],
        ['일곱 번째 불빛. 꿈속에 집들이 보였어요.', '창문마다 불이 켜져 있었고, 굴뚝에선 저녁 냄새가 났어요.', '「모두 여기서 살고 있구나. 내 등 위에서.」', '큰솜이는 처음으로 자기가 집이 되었다는 걸 알았어요.'],
        ['여덟 번째 불빛. 꿈에서 이름들이 들렸어요.', '딸랑, 소금, 라임, 쫑알, 단추, 호떡, 뭉치, 몽실….', '그리고 매일 편지를 나르는 작은 우편지기의 이름도.', '큰솜이는 이름 하나하나를 마음속에 꼭 적어 두었어요.'],
        ['아홉 번째 불빛. 큰솜이가 뒤척였어요.', '아주 오랜 잠에서 깨어나려는 것처럼.', '「조금만 더… 조금만 더 밝으면 볼 수 있을 것 같아.」', '마을 사람들은 마지막 기둥 앞에 모이기 시작했어요.'],
        ['열 번째 불빛이 켜지는 순간, 큰솜이가 눈을 떴어요.', '등 위로 반짝이는 마을과, 손을 흔드는 친구들이 보였어요.', '「안녕. 너희가 나를 깨워 줬구나. 고마워.」', '그날 밤, 몽글숲 하늘에는 별이 아주 많이 떴대요. 큰솜이가 웃을 때마다 하나씩. — 끝, 그리고 계속'],
      ];
      return G.ui.modal('큰솜이 그림책', (body) => {
        let page = Math.max(0, (only || st.pages) - 1);
        const render = () => {
          body.innerHTML = '';
          const p = PAGES[page] || ['(다음 등불이 켜지면 이어져요)'];
          const el = document.createElement('div'); el.className = 'book';
          el.innerHTML = `<div class="bk-no">${page + 1}장</div><div class="bk-pic"><span>☁️</span><span class="z">z z</span></div>` + p.map((t) => `<p>${t}</p>`).join('');
          body.append(el);
          const row = document.createElement('div'); row.className = 'row';
          if (page > 0) { const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = '◀ 앞 장'; b.onclick = () => { page--; render(); }; row.append(b); }
          if (page < st.pages - 1) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = '다음 장 ▶'; b.onclick = () => { page++; render(); }; row.append(b); }
          body.append(row);
        };
        render();
      });
    },
  };

  G.save.section('lantern', {
    v: 1, def: () => ({ lit: 0, litDay: [], pages: 0 }),
    get: () => JSON.parse(JSON.stringify(st)), set: (d) => Object.assign(st, d),
  });
  G.modules.add('lantern');
})(globalThis.G);
