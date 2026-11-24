// 등불 기둥 10개 (메타 목표 ④, 4차 회의 판정 B) + 큰솜이 그림책. 지금은 1·2번까지 켤 수 있다
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
      return [{ text: '다음 이야기에서 열려요', cur: 0, need: 1, ok: false }];
    },
    ready(n) { return n === st.lit + 1 && n <= 2 && LN.conds(n).every((c) => c.ok); },
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
        { who: 'bori', text: n === 1 ? '모두 모였구나. 몽글숲에 첫 등불을 밝히는 날이란다. 콕!' : '두 번째 등불이로구나. 마을이 한결 따뜻해졌어.' },
        { who: 'ddalang', text: n === 1 ? '두근두근해! 방울도 두근두근해! 랄랄!' : '이번엔 내가 제일 먼저 박수 칠 거야!' },
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
      await LN.book(n);
    },
    // 큰솜이 그림책 (등불마다 한 장)
    book(only) {
      const PAGES = [
        ['아주 먼 옛날, 하늘을 떠돌던 커다란 구름양 한 마리가 있었어요.', '구름양은 너무 오래 떠돌아서, 그만 졸음이 쏟아졌지요.', '「조금만… 쉬었다 가야지.」', '구름양이 웅크려 잠들자, 등 위에 작은 씨앗 하나가 내려앉았어요.'],
        ['씨앗은 숲이 되고, 숲에는 친구들이 하나둘 이사 왔어요.', '친구들은 구름양을 「큰솜이」라고 불렀어요.', '큰솜이가 숨 쉴 때마다 부는 바람이 매일 새 선물을 실어 왔지요.', '그런데 큰솜이는 아직 한 번도 친구들의 얼굴을 본 적이 없었어요.'],
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
