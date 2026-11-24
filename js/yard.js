// 마당 꾸미기 (9차 회의): 집 주변(문에서 10칸 안) 풀밭·길에 가방의 가구를 놓는다. 내 앞 칸에 놓고, 앞에 서서 행동 = 치우기
// 깔개·방석은 밟고 지나갈 수 있고, 나머지는 길을 막는다. 친구 마을(손님)에서는 보이지 않는다
(function (G) {
  'use strict';
  const TILE = G.C.TILE;
  const st = { items: [] }; // {f, tx, ty, c}
  const YD = G.yard = { st, MAX: 40, RANGE: 10 };
  const form = (id) => G.house && G.house.FORMS.find((f) => f.id === id);
  const active = () => !(G.net && G.net.guest) && !!(G.world && G.world.map);

  YD.at = (tx, ty) => {
    if (!active()) return null;
    for (const o of st.items) { const f = form(o.f); if (f && tx >= o.tx && tx < o.tx + f.w && ty >= o.ty && ty < o.ty + f.h) return o; }
    return null;
  };
  YD.blocked = (tx, ty) => { const o = YD.at(tx, ty); return !!(o && form(o.f).layer !== 'rug'); };

  // 놓을 수 있나: 집 문에서 RANGE 칸 안, 풀·길, 물체·텃밭·목장·다른 가구 없음, 문 바로 앞 두 칸은 비움
  YD.check = (f, tx, ty) => {
    const W = G.world, m = W.map, door = m.plots.tent.door;
    if (st.items.length >= YD.MAX) return `마당에는 ${YD.MAX}개까지 놓을 수 있어요.`;
    const pen = G.ranch && G.ranch.st.pen;
    for (let y = ty; y < ty + f.h; y++) for (let x = tx; x < tx + f.w; x++) {
      if (Math.max(Math.abs(x - door.x), Math.abs(y - door.y)) > YD.RANGE) return '집 가까이(문에서 10칸 안)에만 놓을 수 있어요.';
      const t = W.tile(x, y);
      if (!(t === G.TERR.GRASS || t === G.TERR.PATH) || W.objAtTile(x, y)) return '여기엔 놓을 수 없어요. 빈 풀밭이나 길 위에 놓아요.';
      if (YD.at(x, y)) return '다른 가구가 있어요.';
      if (G.farm && G.farm.at(x, y)) return '텃밭 위에는 놓을 수 없어요.';
      if (pen && x >= pen.x - 1 && x <= pen.x + pen.w && y >= pen.y - 1 && y <= pen.y + pen.h) return '목장 울타리 근처에는 놓을 수 없어요.';
      if (x === door.x && y > door.y && y <= door.y + 2) return '집 문 앞은 비워 둬요.';
      const pt = Math.floor(G.player.x / TILE), pty = Math.floor(G.player.y / TILE);
      if (form(f.id).layer !== 'rug' && x === pt && y === pty) return '내가 서 있는 자리예요.';
    }
    return '';
  };
  // 가방 i번 칸의 가구를 내 앞에 놓기
  YD.placeFromBag = (i) => {
    const s = G.inv.slots[i]; if (!s || !s.id.startsWith('furn:')) return false;
    if (!active() || (G.house && G.house.inside)) { G.ui.toast('마당 꾸미기는 밖에서, 내 마을에서 해요.', { icon: '🏡' }); return false; }
    const f = form(s.id.slice(5)); if (!f) return false;
    const pl = G.player, DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]], [dx, dy] = DIRS[pl.dir];
    let tx = Math.floor(pl.x / TILE) + dx, ty = Math.floor(pl.y / TILE) + dy;
    if (dx < 0) tx -= f.w - 1; if (dy < 0) ty -= f.h - 1; // 왼쪽·위를 보면 가구가 그쪽으로 펼쳐지게
    const why = YD.check(f, tx, ty);
    if (why) { G.ui.toast(why, { icon: '🏡' }); G.audio.sfx('error'); return false; }
    st.items.push({ f: f.id, tx, ty, c: (s.x && s.x.c) || 0 });
    G.inv.removeAt(i, 1); G.audio.sfx('drop'); G.save.mark('yard');
    G.events && G.events.tip && G.events.tip('yard', '놓은 가구 앞에 서서 행동 버튼을 누르면 다시 가방에 넣어요.', '놓은 가구 앞에서 Space를 누르면 다시 가방에 넣어요.');
    return true;
  };
  YD.pickup = (o) => {
    const x = { c: o.c || 0 };
    if (!G.inv.canFit('furn:' + o.f, x)) { G.ui.toast('가방이 꽉 찼어요!', { icon: '🎒' }); G.audio.sfx('error'); return false; }
    st.items.splice(st.items.indexOf(o), 1); G.inv.add('furn:' + o.f, 1, x);
    G.audio.sfx('pickup'); G.ui.toast(`${G.items.name('furn:' + o.f, x)}를 가방에 넣었어요.`, { icon: '🎒', ms: 1600 }); G.save.mark('yard');
    return true;
  };
  // 그리기 (y-정렬 목록에 넣는다)
  YD.collect = (R, rect, t) => {
    if (!active() || !G.house) return;
    for (const o of st.items) {
      const f = form(o.f); if (!f) continue;
      const x = o.tx * TILE, y = o.ty * TILE;
      if (x > rect.x + rect.w + 64 || x + f.w * TILE < rect.x - 64 || y > rect.y + rect.h + 64 || y + f.h * TILE < rect.y - 96) continue;
      const draw = (c) => { c.save(); c.translate(x, y); G.house.drawFurn(c, { f: o.f, c: o.c || 0, r: 0 }, f.w, f.h); c.restore(); };
      if (f.layer === 'rug') R.push({ sy: y - 1000, draw }); else R.push({ sy: y + f.h * TILE - 6, draw });
    }
  };

  G.save.section('yard', { v: 1, def: () => ({ items: [] }), get: () => ({ items: st.items.map((o) => [o.f, o.tx, o.ty, o.c || 0]) }), set: (d) => { st.items = (d.items || []).filter((a) => form(a[0]) || !G.house).map((a) => ({ f: a[0], tx: a[1], ty: a[2], c: a[3] || 0 })); } });
  G.modules.add('yard');
})(globalThis.G);
