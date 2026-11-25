// 큰 목표 진행 바 (10차 회의 B): 등불·집·박물관·도감이 "얼마나 남았는지" 늘 보이게 → "조금만 더" 느낌
// 화면 왼쪽 위(할 일 아래)에 가장 완성에 가까운 목표 하나를 막대로, 누르면 전체 목표 + 「🚶 가기」
(function (G) {
  'use strict';
  const TILE = G.C.TILE;
  const GO = G.goals = {};
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const avg = (cs) => cs.reduce((a, c) => a + clamp(c.cur / c.need), 0) / cs.length;

  // 목표 목록: {id, icon, name, pct(0~1), sub, pos:{tx,ty}|null, done}
  GO.list = () => {
    const out = [], m = G.world && G.world.map; if (!m) return out;
    const plot = (k) => { const p = m.plots[k]; return p ? { tx: p.door.x, ty: p.door.y + 1 } : null; };
    const npc = (id) => { const n = G.npc && G.npc.get(id); return n && n.vis ? { tx: Math.floor(n.x / TILE), ty: Math.floor(n.y / TILE) + 1 } : null; };
    // 등불
    const lit = G.lantern.count();
    if (lit >= 10) out.push({ id: 'lantern', icon: '🏮', name: '등불 10개', pct: 1, sub: '큰솜이가 깨어났어요!', pos: null, done: true });
    else {
      const n = lit + 1, cs = G.lantern.conds(n), o = m.objs.find((x) => x.kind === 'lantern' && x.n === n);
      const left = cs.filter((c) => !c.ok).map((c) => `${c.text} ${G.fmt.num(Math.min(c.cur, c.need))}/${G.fmt.num(c.need)}`);
      out.push({ id: 'lantern', icon: '🏮', name: `${n}번 등불`, pct: avg(cs), sub: left.length ? left.join(' · ') : '기둥에 불을 켤 수 있어요!', pos: o ? { tx: o.tx, ty: o.ty + 1 } : null, done: false, ready: !left.length });
    }
    // 집
    const NS = G.nest, s = NS.st, cur = NS.cur(), nx = NS.next();
    if (s.building >= 0) out.push({ id: 'house', icon: '🏠', name: `${nx ? nx.name : '집'} 공사`, pct: 1, sub: `다음 아침(약 ${G.time.minsToMorning()}분 뒤) 완공!`, pos: plot('tent'), done: false, ready: true });
    else if (s.debt > 0) out.push({ id: 'house', icon: '🏠', name: `${cur.name} 약정`, pct: clamp(1 - s.debt / cur.cost), sub: `${G.fmt.money(s.debt)} 남음 · 보리 할멈에게 갚기`, pos: npc('bori') || plot('post'), done: false });
    else if (nx) {
      const created = (G.save.sections.get('meta').get() || {}).created || 0;
      const cs = [{ text: '이사 후', cur: G.time.day() - created, need: nx.days, u: '일' }, { text: '마을에 온 날', cur: G.time.st.playDays, need: nx.active, u: '일' }];
      if (nx.cond) cs.push({ text: nx.condText, cur: nx.cond() ? 1 : 0, need: 1 });
      const left = cs.filter((c) => c.cur < c.need).map((c) => c.u ? `${c.text} ${Math.max(0, c.cur)}/${c.need}${c.u}` : c.text);
      out.push({ id: 'house', icon: '🏠', name: `${nx.name}으로 넓히기`, pct: avg(cs), sub: left.length ? left.join(' · ') : '보리 할멈에게 증축을 부탁해요!', pos: npc('bori') || plot('post'), done: false, ready: !left.length });
    } else out.push({ id: 'house', icon: '🏠', name: cur.name, pct: 1, sub: '가장 큰 집이에요!', pos: null, done: true });
    // 박물관 · 도감
    const all = ['bugs', 'fish', 'sea', 'fossils'].reduce((a, t) => a + G.data.all(t).length, 0) || 1;
    const mus = G.museum.total(), dex = G.collect.total();
    out.push({ id: 'museum', icon: '🏛️', name: '박물관 채우기', pct: clamp(mus / all), sub: `기증 ${mus}/${all}점`, pos: plot('museum2'), done: mus >= all });
    out.push({ id: 'dex', icon: '📖', name: '도감 채우기', pct: clamp(dex / all), sub: `${dex}/${all}종`, pos: null, done: dex >= all });
    return out;
  };
  // 화면에 띄울 하나: 바로 할 수 있는 것 → 가장 완성에 가까운 것 (도감·박물관은 등불·집이 다 끝났을 때만)
  GO.featured = (list = GO.list()) => {
    const open = list.filter((g) => !g.done);
    return open.find((g) => g.ready) || open.filter((g) => g.id === 'lantern' || g.id === 'house').sort((a, b) => b.pct - a.pct)[0] || open.sort((a, b) => b.pct - a.pct)[0] || null;
  };

  // 진행 알림: 25% 단위를 넘으면 한 번 (목표가 바뀌면 다시)
  const seen = {};
  GO.check = (list) => {
    for (const g of list) {
      const k = g.id + ':' + g.name, q = Math.floor(g.pct * 4);
      if (!(k in seen)) { seen[k] = q; continue; }
      if (q > seen[k] && !g.done) {
        seen[k] = q;
        if (q < 4) G.ui.toast(`${g.icon} ${g.name} ${q * 25}% 달성! ${q === 3 ? '조금만 더!' : '잘하고 있어요.'}`, { icon: '✨', ms: 2600 });
        G.emit('goal:step', { id: g.id, q });
      }
    }
  };

  // 전체 목표 창
  GO.open = () => {
    G.ui.modal('큰 목표', (body, close) => {
      for (const g of GO.list()) {
        const row = document.createElement('div'); row.className = 'goalrow' + (g.done ? ' done' : '') + (g.ready ? ' ready' : '');
        row.innerHTML = `<div class="gr-top"><b></b><span>${Math.floor(g.pct * 100)}%</span></div><div class="gbar"><i style="width:${(g.pct * 100).toFixed(1)}%"></i></div><div class="gr-sub muted small"></div>`;
        row.querySelector('.gr-sub').textContent = g.sub; row.querySelector('b').textContent = `${g.icon} ${g.name}`;
        if (g.pos && !g.done) {
          const b = document.createElement('button'); b.className = 'btn small'; b.textContent = '🚶 가기';
          b.onclick = () => { if (G.game.autoGo(g.pos.tx, g.pos.ty, g.name)) { G.audio.sfx('tap'); close(); } else G.ui.toast('거기로 가는 길을 찾지 못했어요.', { icon: '🚧' }); };
          row.append(b);
        }
        body.append(row);
      }
      const tip = document.createElement('div'); tip.className = 'muted small'; tip.style.marginTop = '8px';
      tip.textContent = '등불을 켤 때마다 가구 선물과 그림책 한 장! 집을 넓히면 방이 커져요.';
      body.append(tip);
    });
  };
  G.modules.add('goals');
})(globalThis.G);
