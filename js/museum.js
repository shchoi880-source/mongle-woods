// 조약돌 박물관: 느림보 박사(거북), 화석 감정, 기증, 전시실 (이사 다음 날 개관)
(function (G) {
  'use strict';
  const u = G.u;
  const KINDS = [['bug', '곤충', 'bugs'], ['fish', '물고기', 'fish'], ['sea', '바다', 'sea'], ['fossil', '화석', 'fossils']];
  const st = { bug: new G.Bits(64), fish: new G.Bits(64), sea: new G.Bits(64), fossil: new G.Bits(64), greeted: false, appraised: 0 };

  G.data.add('items', [{ id: 'fossil_raw', name: '수상한 화석', cat: 'fossil', val: 100, stack: 1 }]);

  const M = G.museum = {
    st,
    // 이사한 다음 날(05시 기준) 문을 연다
    isOpen() { const created = (G.save.sections.get('meta').get() || {}).created || 0; return !!G.world.map && !!G.world.map.plots.museum2 && G.time.day() > created; },
    donated: (kind, ix) => st[kind].has(ix),
    count(kind) { if (!G.data.all(KINDS.find((k) => k[0] === kind)[2]).length) return 0; return G.data.all(KINDS.find((k) => k[0] === kind)[2]).filter((r) => st[kind].has(r.ix)).length; },
    total() { return KINDS.reduce((a, [k]) => a + M.count(k), 0); },
    // 가방 속 기증 가능한 칸
    donatable() {
      const out = [];
      G.inv.slots.forEach((s, i) => {
        const [cat, id] = s.id.split(':'); if (!id) return;
        const tb = cat === 'bug' ? 'bugs' : cat === 'fish' ? 'fish' : cat === 'fossil' ? 'fossils' : cat === 'sea' ? 'sea' : null; if (!tb) return;
        const r = G.data.get(tb, id); if (!r || st[cat].has(r.ix)) return;
        if (out.some((o) => o.cat === cat && o.r.ix === r.ix)) return; // 같은 종은 하나만
        out.push({ i, s, cat, r });
      });
      return out;
    },
    donate(entries) {
      const names = [];
      for (const e of [...entries].sort((a, b) => b.i - a.i)) {
        if (st[e.cat].has(e.r.ix)) continue;
        st[e.cat].set(e.r.ix); G.inv.removeAt(e.i, 1); names.push(e.r.name);
        G.emit('museum:donate', { kind: e.cat, ix: e.r.ix });
      }
      G.save.mark('museum');
      return names;
    },
    async talk() {
      const say = (text) => ({ who: 'slowpoke', text });
      if (!st.greeted) {
        st.greeted = true;
        await G.ui.say([say('어서… 오게나…. 나는… 느림보… 박사라네….'), say('어제… 도착할… 예정이었는데…. 오늘… 도착했지…. 조금… 느려서….'), say('화석을… 가져오면… 감정해… 주겠네…. 곤충이나… 물고기도… 기증해… 주면… 고맙겠네….')]);
        G.save.mark('museum');
      }
      const raw = G.inv.count('fossil_raw');
      const opts = [];
      if (raw) opts.push(`화석 감정 (${raw}개)`);
      opts.push('기증하기', '전시실 보기', '그만두기');
      const pick = opts[await G.ui.choose(say(raw ? '음…? 그 가방에서… 흙냄새가… 나는군….' : '무엇을… 도와줄까…?'), opts)];
      if (pick.startsWith('화석 감정')) await M.appraise();
      else if (pick === '기증하기') await M.donateUI();
      else if (pick === '전시실 보기') await M.gallery();
    },
    async appraise() {
      // 솔질 세 번 → 정체 공개
      const say = (text) => ({ who: 'slowpoke', text });
      await G.ui.say([say('어디… 보자…. 쓱싹…. 쓱싹…. 쓱싹….')]);
      while (G.inv.has('fossil_raw')) {
        const i = G.inv.slots.findIndex((s) => s.id === 'fossil_raw');
        const s = G.inv.slots[i];
        const rows = G.data.all('fossils');
        const fo = G.data.get('fossils', s.x && s.x.f) || rows[(st.appraised * 7 + 3) % rows.length];
        G.inv.removeAt(i, 1);
        const r = G.collect.record('fossil', fo.ix);
        G.inv.add('fossil:' + fo.id, 1, null);
        st.appraised++;
        G.audio.sfx('dug'); G.ui.itemPop('fossil:' + fo.id, { newSp: r.newSp }, `${G.josa(fo.name, '이/가')} 나왔다!`);
        await G.ui.say([say(`오오…! 이건… ${fo.name}…! ${M.donated('fossil', fo.ix) ? '이미… 전시실에… 있지만… 멋지군….' : '기증해… 주면… 좋겠는데….'}`)]);
      }
      G.save.mark('museum');
    },
    donateUI() {
      const list = M.donatable();
      if (!list.length) return G.ui.say([{ who: 'slowpoke', text: '지금… 가방에는… 전시실에… 없는 것이… 없구먼…. 다음에… 또… 오게나….' }]);
      const sel = new Set(list.map((_, k) => k));
      let result = null;
      return G.ui.modal('조약돌 박물관에 기증하기', (body, close) => {
        const render = () => {
          body.innerHTML = '';
          const head = document.createElement('div'); head.className = 'pane-head';
          head.innerHTML = `<span>전시실에 아직 없는 것만 보여요 · ${sel.size}개 고름</span>`;
          const grid = document.createElement('div'); grid.className = 'grid';
          list.forEach((e, k) => {
            const c = document.createElement('button'); c.className = 'slot' + (sel.has(k) ? ' sel' : '');
            c.innerHTML = `<img src="${G.art.iconURL(G.items.icon(e.s.id, e.s.x), 64)}" alt="">`;
            c.title = e.r.name;
            c.onclick = () => { if (sel.has(k)) sel.delete(k); else sel.add(k); G.audio.sfx('tap'); render(); };
            grid.append(c);
          });
          const go = document.createElement('button'); go.className = 'btn big' + (sel.size ? '' : ' off');
          go.textContent = sel.size ? `${sel.size}개 기증하기` : '기증할 것을 골라요';
          go.onclick = () => { if (!sel.size) return; result = M.donate([...sel].map((k) => list[k])); close(); };
          const foot = document.createElement('div'); foot.className = 'shopfoot'; foot.append(go);
          body.append(head, grid, foot);
        };
        render();
      }).then(async () => {
        if (!result || !result.length) return;
        G.audio.sfx('stamp');
        const first = result.slice(0, 3).join(', ') + (result.length > 3 ? ` 외 ${result.length - 3}개` : '');
        await G.ui.say([{ who: 'slowpoke', text: `오오…. ${first}…. 고맙네…. 정말… 고맙네….` }, { who: 'slowpoke', text: `전시실이… 조금… 더… 반짝이게… 되었구먼…. (전시 ${M.total()}점)` }]);
      });
    },
    gallery() {
      return G.ui.modal('조약돌 박물관 전시실', (body) => {
        let k = 'bug';
        const render = () => {
          body.innerHTML = '';
          const sub = document.createElement('div'); sub.className = 'subtabs';
          for (const [id, nm, tb] of KINDS) {
            const b = document.createElement('button'); b.className = 'chip' + (k === id ? ' on' : '');
            b.textContent = `${nm} ${M.count(id)}/${G.data.all(tb).length}`;
            b.onclick = () => { k = id; G.audio.sfx('tap'); render(); }; sub.append(b);
          }
          const grid = document.createElement('div'); grid.className = 'dex';
          const tb = KINDS.find((x) => x[0] === k)[2];
          for (const r of G.data.all(tb)) {
            const has = M.donated(k, r.ix);
            const c = document.createElement('div'); c.className = 'dexcell' + (has ? ' museum' : ' unknown');
            c.innerHTML = `<img src="${G.art.iconURL(k + ':' + r.id, 64)}" alt=""><span>${has ? r.name : '빈 자리'}</span>`;
            grid.append(c);
          }
          body.append(sub, grid);
          const note = document.createElement('div'); note.className = 'muted small'; note.style.marginTop = '10px';
          note.textContent = '빈 자리는 박사가 기다리는 친구들이에요. 기증하면 이름표가 붙어요.';
          body.append(note);
        };
        render();
      }, { wide: true });
    },
  };

  G.save.section('museum', {
    v: 1, def: () => ({ bug: '', fish: '', fossil: '', greeted: false, appraised: 0 }),
    get: () => ({ bug: st.bug.toStr(), fish: st.fish.toStr(), sea: st.sea.toStr(), fossil: st.fossil.toStr(), greeted: st.greeted, appraised: st.appraised }),
    set: (d) => { st.bug = G.Bits.from(d.bug, 64); st.fish = G.Bits.from(d.fish, 64); st.fossil = G.Bits.from(d.fossil, 64); st.sea = G.Bits.from(d.sea, 64); st.greeted = !!d.greeted; st.appraised = d.appraised || 0; },
  });

  G.modules.add('museum');
})(globalThis.G);
