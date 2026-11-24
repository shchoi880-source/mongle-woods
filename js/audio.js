// 사운드: WebAudio 절차적 생성. 버스 3(bgm/sfx/voice) + 마스터 컴프레서 + 생성 리버브.
// 샘플 뱅크: 칼림바·마림바·플럭을 오프라인으로 한 번 구워 재사용(사각파 금지).
(function (G) {
  'use strict';
  let ac = null, master, bus = {}, rev, unlocked = false;
  const bank = {};
  const AU = G.audio = { ready: false };

  function mkReverb(ctx) {
    const len = ctx.sampleRate * 1.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const c = ctx.createConvolver(); c.buffer = buf; return c;
  }
  // 악기 한 음(기준 C5)을 오프라인으로 굽기
  async function bake(kind) {
    const sr = 22050, dur = kind === 'pad' ? 2.4 : 1.4;
    const oc = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
    const f = 523.25, out = oc.createGain(); out.connect(oc.destination);
    const partials = kind === 'kalimba' ? [[1, 1, 1.2], [5.4, 0.25, 6], [2, 0.12, 3]]
      : kind === 'marimba' ? [[1, 1, 2.2], [4, 0.35, 9], [10, 0.08, 20]]
        : kind === 'pluck' ? [[1, 1, 3], [2, 0.5, 5], [3, 0.25, 8]]
          : [[1, 1, 0.6], [2, 0.3, 0.8], [3.01, 0.12, 1]];
    for (const [mul, amp, decay] of partials) {
      const o = oc.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
      const g = oc.createGain();
      const atk = kind === 'pad' ? 0.25 : 0.004;
      g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(amp * 0.5, atk);
      g.gain.exponentialRampToValueAtTime(0.0008, dur * (kind === 'pad' ? 1 : 1 / decay) + atk + 0.05);
      o.connect(g); g.connect(out); o.start(0); o.stop(dur);
    }
    return oc.startRendering();
  }

  AU.unlock = () => {
    if (unlocked) { if (ac && ac.state === 'suspended') ac.resume(); return; }
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext; if (!Ctx) return;
    unlocked = true;
    ac = new Ctx();
    master = ac.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 3;
    const mg = ac.createGain(); mg.gain.value = 0.9; master.connect(mg); mg.connect(ac.destination);
    rev = mkReverb(ac); const rg = ac.createGain(); rg.gain.value = 0.22; rev.connect(rg); rg.connect(master);
    for (const b of ['bgm', 'sfx', 'voice', 'amb']) {
      bus[b] = ac.createGain(); bus[b].connect(master);
      if (b !== 'amb') { const s = ac.createGain(); s.gain.value = b === 'bgm' ? 0.5 : 0.25; bus[b].connect(s); s.connect(rev); }
    }
    AU.applyVolumes();
    // 굽기 (병렬)
    Promise.all(['kalimba', 'marimba', 'pluck', 'pad'].map((k) => bake(k).then((b) => { bank[k] = b; }))).then(() => { AU.ready = true; });
    if (ac.state === 'suspended') ac.resume();
    // 아주 짧은 무음으로 iOS 잠금 해제
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  };
  AU.applyVolumes = () => {
    if (!ac) return;
    bus.bgm.gain.value = G.settings.get('bgm') * 0.55;
    bus.sfx.gain.value = G.settings.get('sfx');
    bus.voice.gain.value = G.settings.get('voice') * 0.7;
    bus.amb.gain.value = G.settings.get('sfx') * 0.5;
  };
  G.on('settings:change', () => AU.applyVolumes());

  // 악기 재생: midi 음높이
  function note(inst, midi, when, vel = 0.6, b = 'bgm', dur) {
    if (!ac || !bank[inst]) return;
    const s = ac.createBufferSource(); s.buffer = bank[inst];
    s.playbackRate.value = Math.pow(2, (midi - 72) / 12);
    const g = ac.createGain(); g.gain.value = vel;
    if (dur) { g.gain.setValueAtTime(vel, when + dur); g.gain.linearRampToValueAtTime(0, when + dur + 0.3); }
    s.connect(g); g.connect(bus[b]); s.start(when);
  }
  // 간단한 톤 (효과음용)
  function tone(type, f0, f1, dur, vol = 0.3, when = 0, b = 'sfx') {
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(bus[b]); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, fc, q = 1, when = 0, type = 'bandpass', b = 'sfx') {
    if (!ac) return;
    const t = ac.currentTime + when;
    const len = Math.ceil(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = fc; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(bus[b]); s.start(t);
  }

  // ---------- 효과음 15+ ----------
  const SFX = {
    tap: () => note('marimba', 84, ac.currentTime, 0.35, 'sfx'),
    open: () => { note('kalimba', 79, ac.currentTime, 0.4, 'sfx'); note('kalimba', 84, ac.currentTime + 0.06, 0.35, 'sfx'); },
    close: () => { note('kalimba', 84, ac.currentTime, 0.3, 'sfx'); note('kalimba', 79, ac.currentTime + 0.06, 0.28, 'sfx'); },
    step: (o) => noise(0.05, 0.05 * (o.vol || 1), o.surf === 'sand' ? 2200 : o.surf === 'wood' ? 700 : o.surf === 'snow' ? 3000 : 1400, 1.4),
    swing: () => noise(0.16, 0.12, 1800, 0.7, 0, 'highpass'),
    whiff: () => { noise(0.12, 0.08, 2400, 0.7, 0, 'highpass'); tone('sine', 520, 380, 0.12, 0.08, 0.05); },
    catch: () => { [72, 76, 79, 84].forEach((m, i) => note('kalimba', m, ac.currentTime + i * 0.07, 0.5, 'sfx')); },
    rare: () => { [72, 76, 79, 83, 86, 91].forEach((m, i) => note('kalimba', m, ac.currentTime + i * 0.06, 0.5, 'sfx')); note('pad', 60, ac.currentTime, 0.25, 'sfx', 1); },
    miss: () => { note('marimba', 67, ac.currentTime, 0.35, 'sfx'); note('marimba', 64, ac.currentTime + 0.1, 0.3, 'sfx'); },
    cast: () => { noise(0.25, 0.1, 1200, 0.6, 0, 'highpass'); },
    plop: () => { tone('sine', 900, 280, 0.12, 0.25); noise(0.15, 0.08, 800, 1, 0.02); },
    nibble: () => tone('sine', 1500, 1300, 0.05, 0.22),
    bite: () => { tone('sine', 320, 120, 0.25, 0.35); noise(0.3, 0.2, 500, 0.8); },
    coin: () => { note('kalimba', 88, ac.currentTime, 0.4, 'sfx'); note('kalimba', 93, ac.currentTime + 0.08, 0.4, 'sfx'); },
    dig: () => { noise(0.12, 0.25, 400, 0.8); noise(0.1, 0.15, 300, 0.8, 0.12); },
    dug: () => { tone('triangle', 660, 990, 0.1, 0.15); [79, 84, 88].forEach((m, i) => note('kalimba', m, ac.currentTime + 0.1 + i * 0.07, 0.4, 'sfx')); },
    shake: () => { for (let i = 0; i < 4; i++) noise(0.09, 0.1, 2500 + i * 300, 0.8, i * 0.06); },
    drop: () => { tone('sine', 700, 350, 0.1, 0.2); },
    pickup: () => { note('pluck', 79, ac.currentTime, 0.4, 'sfx'); note('pluck', 86, ac.currentTime + 0.05, 0.35, 'sfx'); },
    bump: () => tone('sine', 220, 160, 0.08, 0.15),
    error: () => { note('marimba', 60, ac.currentTime, 0.3, 'sfx'); note('marimba', 59, ac.currentTime + 0.09, 0.3, 'sfx'); },
    pop: () => tone('sine', 600, 1200, 0.08, 0.18),
    kongal: () => { tone('sine', 1400, 1900, 0.06, 0.12); tone('sine', 1700, 2300, 0.06, 0.1, 0.07); },
    chime: () => { [76, 79, 84].forEach((m, i) => note('kalimba', m, ac.currentTime + i * 0.12, 0.35, 'sfx')); },
    save: () => note('kalimba', 91, ac.currentTime, 0.2, 'sfx'),
    stamp: () => { tone('sine', 200, 90, 0.15, 0.3); [84, 88, 91, 96].forEach((m, i) => note('kalimba', m, ac.currentTime + 0.1 + i * 0.06, 0.4, 'sfx')); },
  };
  AU.sfx = (name, o = {}) => {
    if (!ac) return;
    try { const f = SFX[name]; if (f) f(o); } catch (e) { G.log.err('sfx:' + name, e); }
  };

  // ---------- 옹알이 목소리 ----------
  // 글자마다 짧은 음절 블립. 화자별 음높이·빠르기.
  const VOICES = { ddalang: { base: 76, var: 5, inst: 'pluck' }, bori: { base: 62, var: 3, inst: 'marimba' }, todak: { base: 60, var: 6, inst: 'marimba' }, tosil: { base: 70, var: 3, inst: 'pluck' }, kongal: { base: 90, var: 4, inst: 'kalimba' }, sogeum: { base: 64, var: 4, inst: 'marimba' }, lime: { base: 79, var: 3, inst: 'pluck' }, slowpoke: { base: 55, var: 2, inst: 'marimba' }, jjongal: { base: 82, var: 6, inst: 'pluck' }, danchu: { base: 68, var: 1, inst: 'kalimba' }, hotteok: { base: 57, var: 5, inst: 'marimba' }, mungchi: { base: 74, var: 2, inst: 'kalimba' }, mongsil: { base: 77, var: 4, inst: 'pluck' }, danpung: { base: 64, var: 2, inst: 'kalimba' }, sys: null };
  AU.voice = (who, ch, i) => {
    const v = VOICES[who]; if (!v || !ac || !bank[v.inst]) return;
    if (/[\s.,!?…~'"]/.test(ch) || i % 2) return;
    const h = G.u.strHash(ch) % (v.var * 2 + 1) - v.var;
    note(v.inst, v.base + h, ac.currentTime, 0.22, 'voice');
  };

  // ---------- 배경음악: 펜타토닉 모티프 + 화음 ----------
  // 낮: 칼림바 멜로디 + 마림바 베이스 / 밤: 느리고 낮게 + 패드
  const PROG = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // I vi IV V (C 기준)
  const MOTIFS = [
    [0, 2, 4, 7, -1, 4, 2, -1], [4, -1, 2, 0, -1, -1, 7, 4], [9, 7, 4, -1, 2, 4, 0, -1], [7, 4, 2, 4, -1, 0, -1, -1],
  ];
  let nextBar = 0, bar = 0, musicOn = true;
  AU.music = {
    update() {
      if (!ac || !AU.ready || !musicOn) return;
      const night = G.time.isNight();
      const bpm = night ? 66 : 84, beat = 60 / bpm;
      const root = night ? 57 : 60; // A3 / C4
      if (nextBar < ac.currentTime) nextBar = ac.currentTime + 0.1;
      if (nextBar - ac.currentTime > 0.5) return;
      const ch = PROG[bar % 4];
      // 베이스
      note('marimba', root - 12 + ch[0], nextBar, night ? 0.22 : 0.3);
      note('marimba', root - 12 + ch[0] + 7, nextBar + beat * 2, night ? 0.16 : 0.22);
      // 화음 (패드, 밤에 더 큼)
      for (const n of ch) note('pad', root + n, nextBar, night ? 0.12 : 0.06, 'bgm', beat * 3.5);
      // 멜로디 (8분음표, 쉼표 -1) — 날마다 모티프 선택이 바뀐다
      const m = MOTIFS[(bar + G.time.day()) % 4];
      const rain = G.weather && (G.weather.now().type === 'rain');
      for (let i = 0; i < 8; i++) {
        const n = m[i]; if (n < 0) continue;
        if (night && i % 2) continue;
        const sw = (i % 2) * beat * 0.06; // 살짝 스윙
        note(rain ? 'pluck' : 'kalimba', root + 12 + n, nextBar + i * beat / 2 + sw, 0.2 + ((G.u.hash32(bar, i) & 7) / 70));
      }
      nextBar += beat * 4; bar++;
    },
    stinger(id) { if (id === 'hour') [72, 76, 79, 84].forEach((m, i) => note('kalimba', m, ac.currentTime + i * 0.25, 0.3)); },
    set(on) { musicOn = on; },
  };
  // 빗소리 앰비언스
  let rainNode = null;
  AU.ambient = (type) => {
    if (!ac) return;
    const want = type === 'rain';
    if (want && !rainNode) {
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
      const g = ac.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.18, ac.currentTime + 2);
      s.connect(f); f.connect(g); g.connect(bus.amb); s.start(); rainNode = { s, g };
    } else if (!want && rainNode) {
      const r = rainNode; rainNode = null;
      r.g.gain.linearRampToValueAtTime(0, ac.currentTime + 2); setTimeout(() => r.s.stop(), 2200);
    }
  };
  AU.suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };
  AU.resume = () => { if (ac && ac.state === 'suspended') ac.resume(); };
  G.on('time:hour', () => AU.music.stinger && ac && AU.ready && AU.music.stinger('hour'));

  G.modules.add('audio');
})(globalThis.G);
