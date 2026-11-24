// 시간: 실제 시계, 05:00 하루 경계, 계절, 날씨(결정적) — r2-기술 T15·T16
(function (G) {
  'use strict';
  const u = G.u;
  const DAY_MS = 86400000;
  const SEASONS = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
  const SEASON_ID = { '봄': 'spring', '여름': 'summer', '가을': 'autumn', '겨울': 'winter' };
  const WD = ['일', '월', '화', '수', '목', '금', '토'];

  let offset = 0;           // 개발용 시간 이동(ms)
  let lastMin = -1, lastHour = -1, lastDay = null;
  const st = { lastMs: 0, maxDay: 0, playDays: 0, lastPlayDay: -1, tt: 0 };

  const T = G.time = {
    st,
    now: () => Date.now() + offset,
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
    // 조수: 12시간 25분 주기, 0 = 간조 ~ 1 = 만조
    tide() { const p = (T.now() / 60000) % 745 / 745; return 0.5 + 0.5 * Math.cos(p * Math.PI * 2); },
  };

  G.save.section('time', {
    v: 1, def: () => ({ lastMs: 0, maxDay: 0, playDays: 0, lastPlayDay: -1, tt: 0 }),
    get: () => Object.assign({}, st), set: (d) => Object.assign(st, d),
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
      if (p === 'clear') return { type: 'clear', wind: r() * 0.5 };
      if (p === 'cloudy') return { type: 'cloudy', wind: 0.3 + r() * 0.4 };
      if (p === 'shower') return (hh >= s1 && hh < s1 + len) ? { type: wet, wind: 0.5, int: 0.6 } : { type: 'cloudy', wind: 0.3 };
      return (hh % 9 < 6) ? { type: wet, wind: 0.6, int: 1 } : { type: 'cloudy', wind: 0.4 };
    },
    now() { return G.weather.at(T.day(), T.hour()); },
    override(w) { override = w; G.emit('weather:change', {}); },
    LABEL: { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈' },
    ICON: { clear: '☀️', cloudy: '☁️', rain: '🌧️', snow: '❄️' },
  };

  G.modules.add('time');
})(globalThis.G);
