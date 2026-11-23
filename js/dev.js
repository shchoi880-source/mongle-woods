// 디버그 패널 (?dev=1): 시간 이동·날씨·몽·통계
(function (G) {
  'use strict';
  G.devpanel = () => {
    const el = document.createElement('div'); el.className = 'devpanel';
    const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = (e) => { e.stopPropagation(); fn(); upd(); }; el.append(b); return b; };
    const info = document.createElement('div'); info.className = 'devinfo';
    el.append(info);
    btn('+1시간', () => G.time.addOffset(3600e3));
    btn('+6시간', () => G.time.addOffset(6 * 3600e3));
    btn('+1일', () => G.time.addOffset(864e5));
    btn('시간 원래대로', () => G.time.setOffset(0));
    btn('맑음', () => G.weather.override({ type: 'clear', wind: 0.2 }));
    btn('비', () => G.weather.override({ type: 'rain', wind: 0.5, int: 1 }));
    btn('눈', () => G.weather.override({ type: 'snow', wind: 0.3, int: 1 }));
    btn('날씨 자동', () => G.weather.override(null));
    btn('+5000몽', () => G.wallet.add(5000, 'dev'));
    btn('삽 받기', () => G.player.giveTool('shovel'));
    btn('저장', () => G.save.now('dev'));
    const hide = btn('접기', () => el.classList.toggle('min'));
    hide.className = 'devmin';
    const upd = () => {
      if (!G.game.started) { info.textContent = 'dev'; return; }
      const r = G.loop;
      info.textContent = `${Math.round(r.fps)}fps · ${r.ms.toFixed(1)}ms · PX ${G.cam.PX} · T ${G.cam.T} · 벌레 ${G.eco.bugs.length} · 물고기 ${G.eco.fish.length} · 세이브 ${(G.save.size() / 1024).toFixed(1)}KB · ${G.time.label().clock} · ${G.weather.now().type} · 시드 ${G.world.map.seed}`;
    };
    setInterval(upd, 500);
    document.body.append(el);
  };
  G.modules.add('dev');
})(globalThis.G);
