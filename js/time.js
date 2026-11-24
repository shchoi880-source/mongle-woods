// 시간: 마을 시계(놀고 있을 때만 흐름, 실제 1초 = 마을 1분 → 하루 24분), 05:00 하루 경계, 계절, 날씨(결정적)
// 오너 결정(2026-11): 실제 시간처럼 며칠씩 기다리는 건 재미없다 → 마을 시간이 빨리 흐르고, 오래 놀수록 더 많이 한다
(function (G) {
  'use strict';
  const u = G.u;
  const DAY_MS = 86400000;
  const SEASONS = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
  const SEASON_ID = { '봄': 'spring', '여름': 'summer', '가을': 'autumn', '겨울': 'winter' };
  const WD = ['일', '월', '화', '수', '목', '금', '토'];

  let offset = 0;           // 개발용 시간 이동(ms)
  let lastMin = -1, lastHour = -1, lastDay = null;
  const st = { lastMs: 0, maxDay: 0, playDays: 0, lastPlayDay: -1, tt: 0, vms: 0, realAt: 0, pms: 0 };
  const SPEED = 60; // 실제 1초 = 마을 1분
  // 오너 결정(D20 수정): 하루 24분 = 낮 20분 + 밤 4분. 낮(05~19시, 14시간)은 0.7배, 밤(19~05시, 10시간)은 2.5배
  // 하루 평균은 그대로 실제 1분 = 마을 60분이라 농사·목장 속도는 하루 단위로 같다
  const DAY_RATE = 0.7, NIGHT_RATE = 2.5, rateAt = (h) => (h >= 19 || h < 5 ? NIGHT_RATE : DAY_RATE);

  const T = G.time = {
    st,
    SPEED,
    // 마을 시각(ms). 처음엔 오늘 실제 날짜·시각에서 출발하고, 그다음은 놀고 있는 동안만 흐른다
    now: () => (st.vms || (st.vms = Date.now())) + offset,
    // 놀고 있는 동안 흐르게 한다 (탭 숨김·타이틀에선 안 부름). dt는 실제 초
    advance(dt) { if (!(dt > 0)) return; T.now(); st.vms += Math.min(dt, 0.25) * 1000 * SPEED * rateAt(T.hour()); T.pmin(); st.pms += Math.min(dt, 0.25); },
    // 놀이 시계: 실제 1초 = 1 (농사·목장 타이머용). 낮·밤 빠르기와 상관없이 실제 시간대로 자란다. 처음엔 마을 분에서 이어 받는다(옛 세이브 호환)
    pmin: () => { if (!st.pms) st.pms = Math.floor(T.now() / 60000); return Math.floor(st.pms); },
    rate: () => rateAt(T.hour()),
    // 다음 아침(05시)까지 실제 몇 분
    minsToMorning() {
      const d = T.date(); let left = (G.C.DAY_H * 60 - (d.getHours() * 60 + d.getMinutes()) + 1440) % 1440 || 1440, h = d.getHours(), mm = d.getMinutes(), real = 0;
      // 시간대마다 빠르기가 달라서 한 시간씩 나눠 계산 (실제 분)
      while (left > 0) { const step = Math.min(left, 60 - mm); real += step / SPEED / rateAt(h); left -= step; mm = 0; h = (h + 1) % 24; }
      return Math.max(1, Math.ceil(real));
    },
    gmin: () => Math.floor(T.now() / 60000),  // 마을 시각(분) — 농사·목장 타이머용
    date() { return new Date(T.now()); },
    // 게임 일 번호: 로컬 05:00 기준 (1970-01-01 05:00 = 0일)
    dayOf(ms) { const d = new Date(ms - G.C.DAY_H * 3600000); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / DAY_MS); },
    day() { return T.dayOf(T.now()); },
    // 게임 일의 달력 날짜(05시 이전이면 전날)
    dayDate(day) { const d = new Date(day * DAY_MS); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() }; },
    hour() { return T.date().getHours(); },
    minute() { return T.date().getMinutes(); },
    // 하루 중 위치 (0 = 자정, 0.5 = 정오)
    frac() { const d = T.date(); return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000) / 86400; },
    month() { return T.date().getMonth() + 1; },
    seasonName() { return SEASONS[T.month() - 1]; },
    season() { return SEASON_ID[T.seasonName()]; },
    isNight() { const h = T.hour(); return h >= 19 || h < 5; },
    label() {
      const d = T.date();
      return { date: `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`, clock: G.fmt.clock(d.getHours(), d.getMinutes()), season: T.seasonName() };
    },
    setOffset(ms) { offset = ms; T.tick(true); },
    addOffset(ms) { offset += ms; T.tick(true); },
    getOffset: () => offset,
    // 매 프레임: 분·시·일 경계 검사
    tick(force) {
      const now = T.now(); const d = new Date(now);
      const m = d.getMinutes(), h = d.getHours(), day = T.dayOf(now);
      if (m !== lastMin || force) { lastMin = m; G.emit('time:minute', { m }); }
      if (h !== lastHour) { const prev = lastHour; lastHour = h; if (prev >= 0) G.emit('time:hour', { h }); }
      if (lastDay === null) lastDay = day;
      if (day !== lastDay) {
        const prev = lastDay; lastDay = day;
        if (day < st.maxDay) st.tt++;              // 시간 역행 기록 (벌은 없음)
        const skipped = Math.max(0, day - prev - 1);
        T.markPlay(day);
        G.emit('time:day', { day, prev, skipped });
      }
      st.lastMs = now;
    },
    markPlay(day) {
      if (day > st.maxDay) st.maxDay = day;
      if (st.lastPlayDay !== day) { st.lastPlayDay = day; st.playDays++; }
    },
    init() { lastDay = T.day(); T.markPlay(lastDay); },
    // 자리를 비운 동안(앱을 닫거나 내린 동안): 마을 시계는 멈추지만, 작물·동물은 그만큼 자란다(오너 피드백: 물 주고 나갔다 오면 그대로라 답답)
    // 실제 1초 = 마을 1분 몫. 최대 마을 하루(실제 24분)까지만
    offlineCredit() {
      const now = Date.now(), at = st.realAt || now; st.realAt = now;
      const mins = Math.min(1440, Math.floor(Math.max(0, now - at) / 1000));
      if (mins >= 2) G.emit('time:away', { mins });
      return mins;
    },
    // 시계를 갈아 끼운 뒤(친구 마을 방문·복귀): 경계 이벤트 없이 현재 값으로 맞춘다
    resync() { lastDay = T.day(); lastHour = T.hour(); lastMin = T.minute(); st.lastMs = T.now(); },
    // 조수: 12시간 25분 주기, 0 = 간조 ~ 1 = 만조
    tide() { const p = (T.now() / 60000) % 745 / 745; return 0.5 + 0.5 * Math.cos(p * Math.PI * 2); },
  };

  G.save.section('time', {
    v: 1, def: () => ({ lastMs: 0, maxDay: 0, playDays: 0, lastPlayDay: -1, tt: 0, vms: 0, realAt: 0, pms: 0 }),
    get: () => Object.assign({}, st), set: (d) => { Object.assign(st, d); lastDay = null; lastMin = -1; lastHour = -1; },
  });

  // ---------- 날씨 ----------
  // 하루 패턴(결정적): 맑음 / 흐림 / 비(겨울 = 눈). 비는 하루 중 일부 시간대에만.
  const PATTERNS = [
    { id: 'clear', w: 5 }, { id: 'cloudy', w: 3 }, { id: 'shower', w: 2 }, { id: 'rainy', w: 1.2 },
  ];
  let override = null;
  G.weather = {
    pattern(day) {
      const r = G.rng.stream(G.rng.KEYS.WEATHER, day)();
      return u.pickW(PATTERNS, r).id;
    },
    at(day, hour) {
      if (override) return override;
      if (G.events && G.events.isFirstSnow(day) && hour >= 5 && hour < 16) return { type: 'snow', wind: 0.3, int: 0.8, first: true }; // 첫눈 아침
      const p = G.weather.pattern(day);
      const dd = T.dayDate(day); const winter = dd.m === 12 || dd.m <= 2;
      const wet = winter ? 'snow' : 'rain';
      const r = G.rng.stream(G.rng.KEYS.WEATHER, day, 7);
      const s1 = Math.floor(r() * 18), len = 3 + Math.floor(r() * 5);
      // 05시 기준으로 시간 재배열
      const hh = (hour - G.C.DAY_H + 24) % 24;
      // 8차 회의: 날씨 꾸밈(fx) — 기본 종류(type)는 그대로 두고 볼거리만 더한다 (무지개·안개·잎·꽃잎·천둥·함박눈)
      const r2 = r(), m = dd.m, fall = m >= 9 && m <= 11, spring = m >= 3 && m <= 5;
      const breeze = (w) => (w > 0.35 && (fall || spring) ? (fall ? 'leaves' : 'petals') : '');
      if (p === 'clear') { const w = r() * 0.5; return { type: 'clear', wind: w, fx: breeze(w + r2 * 0.3) }; }
      if (p === 'cloudy') { const w = 0.3 + r() * 0.4; return { type: 'cloudy', wind: w, fx: hh < 4 ? 'fog' : breeze(w) }; }
      if (p === 'shower') {
        if (hh >= s1 && hh < s1 + len) return { type: wet, wind: 0.5, int: 0.6 };
        // 소나기가 그친 뒤 낮 두 시간은 무지개
        if (!winter && hh >= s1 + len && hh < s1 + len + 2 && hour >= 6 && hour < 18) return { type: 'clear', wind: 0.2, fx: 'rainbow' };
        return { type: 'cloudy', wind: 0.3 };
      }
      const storm = r2 < 0.4;
      return (hh % 9 < 6) ? { type: wet, wind: storm ? 1 : 0.6, int: storm ? 1.5 : 1, fx: storm ? (winter ? 'blizzard' : 'storm') : '' } : { type: 'cloudy', wind: 0.4 };
    },
    now() { return G.weather.at(T.day(), T.hour()); },
    override(w) { override = w; G.emit('weather:change', {}); },
    LABEL: { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈' },
    FX_LABEL: { rainbow: '무지개', fog: '안개', leaves: '단풍 바람', petals: '꽃잎 바람', storm: '천둥 번개', blizzard: '함박눈' },
    FX_ICON: { rainbow: '🌈', fog: '🌫️', leaves: '🍂', petals: '🌸', storm: '⛈️', blizzard: '🌨️' },
    ICON: { clear: '☀️', cloudy: '☁️', rain: '🌧️', snow: '❄️' },
  };

  G.modules.add('time');
})(globalThis.G);
