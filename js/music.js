// 배경음 v0.17 — 동물의 숲처럼 "시간대마다 다른 곡" (곡은 모두 몽글숲 창작)
// 마을 하루 = 실제 24분이라 매시간 바꾸면 1분마다 바뀐다 → 하루를 8구간(구간당 실제 약 3분)으로 나눈다.
// 비 오면 같은 곡을 피아노로 느리게, 겨울·눈이면 오르골로. 집 안·이웃 집·박물관은 전용 곡.
// 자연 소리: 낮엔 새, 밤엔 풀벌레, 바닷가는 파도.
(function (G) {
  'use strict';
  const AU = G.audio;
  const SCALE = [0, 2, 4, 5, 7, 9, 11];
  const semi = (d) => { const o = Math.floor(d / 7), k = ((d % 7) + 7) % 7; return o * 12 + SCALE[k]; };
  // 멜로디 한 마디: 8분음표 칸. 숫자 = 음계 도수(0=도), ~ = 앞 음 늘이기, . = 쉼표
  const bars = (s) => s.split('/').map((b) => b.trim().split(/\s+/));

  // 곡: root = 멜로디 으뜸음(MIDI), meter = 박(3 또는 4), prog = 마디별 화음(도수, A 4마디 + B 4마디), A·B = 멜로디
  // lead·comp(arp 펼침화음 / pad 긴 화음 / stride 쿵짝) · perc(살랑 셰이커) · sev(7화음)
  const SONGS = {
    dawn: { name: '새벽 이슬', bpm: 70, root: 74, meter: 4, lead: 'flute', comp: 'pad', perc: false,
      prog: [0, 5, 3, 4, 0, 2, 3, 0],
      A: bars('4 ~ ~ 2 1 ~ 0 ~ / 2 ~ 4 ~ 5 ~ ~ ~ / 3 ~ 2 3 4 ~ 2 ~ / 1 ~ ~ ~ . . . .'),
      B: bars('4 ~ 5 4 2 ~ 1 ~ / 2 ~ ~ 4 6 ~ 5 ~ / 5 ~ 4 3 2 ~ 1 ~ / 0 ~ ~ ~ . . . .') },
    morning: { name: '아침 햇살', bpm: 96, root: 72, meter: 4, lead: 'kalimba', comp: 'stride', perc: true,
      prog: [0, 4, 5, 3, 3, 4, 0, 0],
      A: bars('0 2 4 2 7 ~ 4 ~ / 4 ~ 6 4 8 ~ 6 ~ / 7 5 7 9 7 ~ 5 ~ / 5 ~ 3 ~ 5 4 3 2'),
      B: bars('3 5 7 5 3 ~ 5 ~ / 4 6 8 6 4 ~ ~ ~ / 7 ~ 9 7 8 7 4 2 / 0 ~ ~ ~ 7 ~ ~ ~') },
    forenoon: { name: '오전 산책', bpm: 104, root: 77, meter: 4, lead: 'pluck', comp: 'arp', perc: true,
      prog: [0, 3, 0, 4, 5, 3, 4, 0],
      A: bars('0 . 2 . 4 4 5 4 / 3 ~ 5 ~ 7 ~ 5 3 / 4 2 0 2 4 ~ 7 ~ / 6 ~ 4 ~ 1 ~ . .'),
      B: bars('5 4 5 7 9 ~ 7 5 / 3 ~ 5 3 2 ~ 0 ~ / 1 2 4 ~ 6 ~ 4 ~ / 7 ~ ~ ~ . . 7 .') },
    noon: { name: '한낮의 광장', bpm: 112, root: 79, meter: 4, lead: 'marimba', comp: 'stride', perc: true,
      prog: [0, 5, 1, 4, 0, 5, 3, 4],
      A: bars('4 4 . 4 2 0 2 ~ / 5 ~ 4 ~ 2 ~ 0 ~ / 1 1 . 3 5 4 3 1 / 4 ~ ~ ~ 6 ~ 4 ~'),
      B: bars('7 ~ 4 7 9 7 4 ~ / 5 ~ 7 5 4 ~ 2 ~ / 3 5 7 5 3 2 1 ~ / 1 ~ 4 ~ 6 ~ 7 ~') },
    afternoon: { name: '오후의 낮잠', bpm: 132, root: 70, meter: 3, lead: 'piano', comp: 'arp', perc: false,
      prog: [0, 3, 4, 0, 5, 3, 4, 0],
      A: bars('4 ~ ~ 2 3 4 / 5 ~ ~ ~ 3 ~ / 6 ~ 5 4 ~ 1 / 0 ~ ~ ~ . .'),
      B: bars('7 ~ 5 4 2 4 / 5 ~ ~ 3 ~ 5 / 4 ~ 6 ~ 8 ~ / 7 ~ ~ ~ . .') },
    evening: { name: '노을 언덕', bpm: 76, root: 77, meter: 4, lead: 'flute', comp: 'arp', perc: false, sev: true,
      prog: [3, 4, 2, 5, 1, 4, 0, 0],
      A: bars('5 ~ 4 ~ 3 ~ 2 ~ / 4 ~ ~ 1 ~ ~ ~ ~ / 4 ~ 2 ~ 4 6 7 ~ / 5 ~ ~ ~ ~ ~ . .'),
      B: bars('3 ~ 5 ~ 7 ~ 6 5 / 6 ~ ~ 4 ~ ~ ~ ~ / 2 ~ 4 ~ 7 ~ 6 ~ / 7 ~ ~ ~ ~ ~ . .') },
    night: { name: '별빛 오르골', bpm: 64, root: 72, meter: 4, lead: 'musicbox', comp: 'pad', perc: false,
      prog: [0, 2, 3, 0, 5, 3, 4, 0],
      A: bars('4 ~ 7 ~ 6 ~ 4 ~ / 2 ~ 4 ~ 6 ~ ~ ~ / 5 ~ 7 ~ 9 ~ 7 5 / 4 ~ ~ ~ . . . .'),
      B: bars('5 ~ 4 ~ 2 ~ 0 ~ / 3 ~ 5 ~ 7 ~ ~ ~ / 8 ~ 6 ~ 4 ~ 6 ~ / 7 ~ ~ ~ . . . .') },
    late: { name: '깊은 밤 자장가', bpm: 96, root: 67, meter: 3, lead: 'piano', comp: 'pad', perc: false,
      prog: [0, 5, 3, 4, 0, 3, 4, 0],
      A: bars('4 ~ 2 ~ 0 ~ / 2 ~ ~ ~ 4 ~ / 5 ~ 4 ~ 3 ~ / 1 ~ ~ ~ . .'),
      B: bars('4 ~ 5 ~ 7 ~ / 5 ~ ~ ~ 3 ~ / 4 ~ 2 ~ 1 ~ / 0 ~ ~ ~ . .') },
    home: { name: '우리 집', bpm: 80, root: 77, meter: 4, lead: 'piano', comp: 'stride', perc: false, soft: true,
      prog: [0, 2, 3, 4, 0, 5, 1, 4],
      A: bars('0 2 4 ~ 4 5 4 ~ / 2 ~ 4 2 0 ~ . . / 3 ~ 5 ~ 7 ~ 5 ~ / 4 ~ ~ ~ 6 ~ ~ ~'),
      B: bars('7 ~ 6 5 4 ~ 2 ~ / 5 ~ 4 2 0 ~ ~ ~ / 1 ~ 3 ~ 5 ~ 3 ~ / 4 ~ ~ ~ . . . .') },
    museum: { name: '조용한 전시실', bpm: 60, root: 74, meter: 4, lead: 'musicbox', comp: 'pad', perc: false, soft: true,
      prog: [0, 3, 5, 4, 3, 0, 1, 4],
      A: bars('4 ~ ~ ~ 7 ~ ~ ~ / 5 ~ ~ ~ 3 ~ ~ ~ / 2 ~ 4 ~ 9 ~ ~ ~ / 6 ~ ~ ~ . . . .'),
      B: bars('5 ~ ~ ~ 7 ~ ~ ~ / 4 ~ ~ ~ 2 ~ ~ ~ / 1 ~ 3 ~ 5 ~ ~ ~ / 4 ~ ~ ~ . . . .') },
  };
  // 하루 8구간 (마을 시각)
  const BLOCKS = [[0, 4, 'late'], [4, 6, 'dawn'], [6, 9, 'morning'], [9, 12, 'forenoon'], [12, 15, 'noon'], [15, 18, 'afternoon'], [18, 20, 'evening'], [20, 24, 'night']];
  const blockOf = (h) => (BLOCKS.find(([a, b]) => h >= a && h < b) || BLOCKS[0])[2];

  const M = { cur: null, bar: 0, next: 0, on: true, songId: null };
  function pickSong() {
    if (G.scene.is('museum_in')) return 'museum';
    if (G.scene.is('interior') || G.scene.is('vhome')) return 'home';
    return blockOf(G.time.hour());
  }
  // 날씨·계절에 따른 편곡
  function arrange(id) {
    const s = SONGS[id], w = G.weather && G.weather.now ? G.weather.now().type : 'clear', indoor = !!s.soft;
    const rain = !indoor && (w === 'rain' || w === 'storm'), snow = !indoor && (w === 'snow' || (G.time.season && G.time.season() === 'winter'));
    return Object.assign({}, s, {
      lead: rain ? 'piano' : snow && s.lead !== 'flute' ? 'musicbox' : s.lead,
      bpm: Math.round(s.bpm * (rain ? 0.88 : 1)), perc: s.perc && !rain, rain,
    });
  }
  // 펼침·쿵짝·긴 화음
  function chordNotes(s, deg) { const d = [deg, deg + 2, deg + 4]; if (s.sev) d.push(deg + 6); return d.map((x) => s.root - 12 + semi(x)); }

  function playBar(s, t0, bi) {
    const N = AU._note, beat = 60 / s.bpm, e8 = beat / 2, steps = s.meter * 2;
    const sec = bi % 16; // A A' B A
    const part = sec < 8 ? s.A : sec < 12 ? s.B : s.A, pi = sec % 4;
    const deg = s.prog[(sec >= 8 && sec < 12 ? 4 : 0) + pi];
    const ch = chordNotes(s, deg), bass = s.root - 24 + semi(deg);
    const vol = s.soft ? 0.75 : 1;
    // 베이스
    N('marimba', bass, t0, 0.26 * vol);
    if (s.meter === 4) N('marimba', bass + 7, t0 + beat * 2, 0.18 * vol); else N('marimba', bass + 7, t0 + beat * 2, 0.12 * vol);
    // 반주
    if (s.comp === 'pad' || s.rain) for (const n of ch.slice(0, 3)) N('pad', n, t0, (s.rain ? 0.1 : 0.08) * vol, 'bgm', beat * s.meter * 0.95);
    if (s.comp === 'arp') { const seq = [0, 2, 1, 2, 0, 2, 1, 2]; for (let i = 0; i < steps; i++) N('kalimba', ch[seq[i] % ch.length] + (i >= 4 && ch[3] ? 0 : 0), t0 + i * e8, 0.07 * vol); if (ch[3]) N('kalimba', ch[3], t0 + e8 * (steps - 1), 0.05); }
    if (s.comp === 'stride') for (let b = 1; b < s.meter; b += 2) for (const n of ch.slice(0, 3)) N(s.soft ? 'piano' : 'marimba', n, t0 + b * beat, 0.07 * vol);
    // 멜로디 (두 번째 A는 쉼표 자리에 살짝 꾸밈음)
    const mel = part[pi] || [];
    for (let i = 0; i < steps; i++) {
      const tok = mel[i]; if (!tok || tok === '~') continue;
      if (tok === '.') { if (sec >= 4 && sec < 8 && i % 2 === 1 && (G.u.hash32(bi, i) & 3) === 0) N(s.lead === 'flute' ? 'kalimba' : s.lead, s.root + semi(deg + 4), t0 + i * e8, 0.12 * vol); continue; }
      let len = 1; while (mel[i + len] === '~') len++;
      const swing = (i % 2) * e8 * 0.08, dv = (G.u.hash32(bi, i, 7) & 7) / 80;
      N(s.lead, s.root + semi(+tok), t0 + i * e8 + swing, (s.lead === 'flute' ? 0.24 : s.lead === 'musicbox' ? 0.3 : 0.28) * vol + dv, 'bgm', s.lead === 'flute' || s.lead === 'piano' ? len * e8 * 0.95 : undefined);
    }
    // 살랑 셰이커 (뒷박)
    if (s.perc) for (let i = 1; i < steps; i += 2) AU._noise(0.04, 0.025 + ((i & 2) ? 0.01 : 0), 7000, 0.8, t0 + i * e8 - AU._ctx().currentTime, 'highpass', 'bgm');
    return beat * s.meter;
  }

  M.update = () => {
    const ac = AU._ctx && AU._ctx(); if (!ac || !AU.ready || !M.on || !AU._has('piano')) return;
    if (M.next < ac.currentTime) M.next = ac.currentTime + 0.1;
    if (M.next - ac.currentTime > 0.5) return;
    const want = pickSong();
    // 곡이 바뀌면: 바깥 시간대가 넘어갈 때만 "띵~" 알림, 장소가 바뀌면 바로
    if (want !== M.songId) {
      const outdoorShift = M.songId && !SONGS[M.songId].soft && !SONGS[want].soft;
      if (outdoorShift) { [76, 79, 84, 88].forEach((m, i) => AU._note('kalimba', m, M.next + i * 0.22, 0.28)); M.next += 1.4; }
      M.songId = want; M.bar = 0;
      G.emit('music:song', { id: want, name: SONGS[want].name });
      if (outdoorShift && G.ui && G.ui.toast && G.settings.get('bgm') > 0) G.ui.toast(`🎵 ${SONGS[want].name}`, { icon: '🎶', ms: 2200 });
    }
    const s = arrange(M.songId);
    M.next += playBar(s, M.next, M.bar); M.bar++;
  };
  M.songs = SONGS; M.blockOf = blockOf; M.current = () => M.songId && SONGS[M.songId].name;
  // 기존 배경음을 이 엔진으로 바꾼다 (audio.js의 AU.music.update를 부르는 곳은 그대로)
  AU.music = { update: M.update, stinger() {}, set(on) { M.on = on; }, current: M.current, songs: SONGS };

  // ---------- 자연 소리 ----------
  let waves = null, ambT = 0, birdT = 2, bugT = 1;
  function seaNear() {
    const W = G.world, p = G.player, T = G.C.TILE; if (!W || !W.map || !p) return 0;
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T); let n = 0;
    for (let y = ty - 6; y <= ty + 6; y += 2) for (let x = tx - 6; x <= tx + 6; x += 2) if (W.tile(x, y) === G.TERR.SEA) n++;
    return Math.min(1, n / 10);
  }
  M.ambient = (dt) => {
    const ac = AU._ctx && AU._ctx(); if (!ac || !AU.ready) return;
    const outdoor = G.scene.is('town'), h = G.time.hour(), w = G.weather.now().type, wet = w === 'rain' || w === 'storm' || w === 'snow';
    ambT -= dt; birdT -= dt; bugT -= dt;
    if (ambT <= 0) {
      ambT = 0.5;
      const k = outdoor ? seaNear() : 0;
      if (k > 0 && !waves) {
        const len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
        const g = ac.createGain(); g.gain.value = 0;
        const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain); lfo.start();
        src.connect(f); f.connect(g); g.connect(AU._bus('amb')); src.start(); waves = { src, g, lfo };
      }
      if (waves) waves.g.gain.setTargetAtTime(k * 0.09, ac.currentTime, 0.8);
    }
    // 새: 아침~오후, 바깥, 맑을 때
    if (birdT <= 0) {
      birdT = 2.5 + Math.random() * 5;
      if (outdoor && !wet && h >= 5 && h < 18) {
        const base = 2600 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) AU._tone('sine', base * (1 + (i % 2) * 0.18), base * (1.25 - (i % 2) * 0.3), 0.07, 0.035, i * 0.11, 'amb');
      }
    }
    // 풀벌레: 밤, 바깥, 겨울 아님
    if (bugT <= 0) {
      bugT = 0.9 + Math.random() * 0.8;
      if (outdoor && !wet && (h >= 19 || h < 4) && G.time.season() !== 'winter') for (let i = 0; i < 3; i++) AU._tone('sine', 4300, 4250, 0.025, 0.012, i * 0.06, 'amb');
    }
  };
  // 매 프레임: 기존 배경음 호출 지점(town·집·박물관)에서 update가 불리고, 자연 소리는 여기서
  let last = 0;
  (function tick() { const now = performance.now(); const dt = Math.min(0.2, (now - last) / 1000 || 0); last = now; try { M.ambient(dt); } catch (e) { /* 소리 실패는 게임에 영향 없게 */ } setTimeout(tick, 100); })();
  G.music = M;
  G.modules.add('music');
})(globalThis.G);
