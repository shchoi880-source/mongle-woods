#!/usr/bin/env node
// 검증 스크립트 (Node 18+, 의존성 0). 종료 코드 0 = 통과, 1 = 실패.
// 사용: node tools/verify.js [시드 수=1000]
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const N = +(process.argv[2] || 1000);

// 브라우저 전용 파일(art·actors·input·audio·ui·dev·boot)은 로드하지 않는다. 나머지는 로드 시 DOM에 접근하지 않는다
for (const f of ['core', 'save', 'firebase-config', 'cloud', 'net', 'time', 'data', 'world', 'sys', 'eco', 'npc', 'house', 'yard', 'museum', 'mail', 'nest', 'requests', 'news', 'tide', 'lantern', 'story', 'festival', 'events', 'farm', 'ranch', 'game']) require(path.join(ROOT, 'js', f + '.js'));
const G = globalThis.G;
let fails = 0;
const ok = (name, cond, detail) => { console.log(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails++; };

// 우편지기 렌더러: 실제 게임이 선택하는 이미지, 방향 행, 보행 열을 확인한다.
{
  class PreviewImage {
    complete = true;
    naturalWidth = 432;
  }
  const art = { C: {}, paint: { shadow() {}, blob() {} } };
  const moduleG = { art, u: G.u, modules: new Set(), settings: { get() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'actors.js'), 'utf8'), { G: moduleG, Image: PreviewImage });
  let sample, flip, toolAngle;
  const ctx = {
    save() {}, restore() {}, translate() {},
    scale(x) { flip = x; },
    rotate(angle) { toolAngle = angle; },
    transform() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
    stroke() {}, clip() {}, arc() {}, closePath() {}, fill() {},
    createLinearGradient() { return { addColorStop() {} }; },
    drawImage(im, x, y) { sample = [path.basename(im.src), x, y, flip < 0]; },
  };
  const render = (look, dir, moving = false, walk = 0) => {
    art.actor.draw(ctx, { species: 'human', look, x: 0, y: 0, dir, moving, walk }, 0);
    return sample.join('/');
  };
  const male = { illu: 'postkeeper-male' };
  ok('우편지기: 이전 외형 저장도 새 여자 기본형으로 표시', render({ hair: 4 }, 0) === 'postkeeper-walk.png/0/0/false');
  ok('우편지기: 옆·뒤 방향과 좌우 반전', render(male, 3) === 'postkeeper-male-walk.png/0/144/false' &&
    render(male, 1) === 'postkeeper-male-walk.png/0/144/true' && render(male, 2) === 'postkeeper-male-walk.png/0/288/false');
  ok('우편지기: 걸음마다 두 자세를 교대로 사용', render(male, 2, true, 0.1) === 'postkeeper-male-walk.png/144/288/false' &&
    render(male, 2, true, 0.6) === 'postkeeper-male-walk.png/288/288/false');
  const swing = (tool, actionPhase) => {
    art.actor.draw(ctx, { species: 'human', look: male, x: 0, y: 0, dir: 3, tool, actionPhase }, 0);
    return [sample[1], toolAngle];
  };
  const [windupFrame, windupAngle] = swing('net', 0.23);
  const [strikeFrame, strikeAngle] = swing('net', 0.46);
  const [, axeAngle] = swing('axe', 0.46);
  ok('우편지기: 도구 준비와 타격의 발·손 자세가 바뀜', windupFrame !== strikeFrame && windupAngle < 0 && strikeAngle > 1);
  ok('우편지기: 채와 도끼의 타격 궤적이 다름', Math.abs(strikeAngle - axeAngle) > 0.5);
  for (const name of ['postkeeper-walk.png', 'postkeeper-male-walk.png']) {
    const data = fs.readFileSync(path.join(ROOT, 'assets', 'chars', 's', name));
    ok('우편지기: 투명 3×3 그림 파일 ' + name, data.toString('ascii', 12, 16) === 'IHDR' &&
      data.readUInt32BE(16) === 432 && data.readUInt32BE(20) === 432 && data[25] === 6);
  }
}

// V1 데이터 무결성: 필수 필드·ix 중복은 G.data.add가 이미 검사. 여기선 수량과 참조.
ok('V1 곤충 40종 이상', G.data.all('bugs').length >= 40, String(G.data.all('bugs').length));
ok('V1 물고기 30종 이상', G.data.all('fish').length >= 30, String(G.data.all('fish').length));
ok('V1 화석 12종', G.data.all('fossils').length === 12);
ok('V1 바다생물 10종', G.data.all('sea').length === 10);
ok('V1 조개 10종', G.data.all('shells').length === 10);
for (const t of ['bugs', 'fish', 'fossils', 'shells', 'sea']) { const ix = G.data.all(t).map((r) => r.ix).sort((a, b) => a - b); ok(`V1 ${t} 번호 빈칸 없음`, ix.every((v, i) => v === i)); }
for (const t of ['bugs', 'fish', 'fossils', 'shells', 'sea']) for (const r of G.data.all(t)) if (!G.items.get((t === 'bugs' ? 'bug' : t === 'fossils' ? 'fossil' : t === 'shells' ? 'shell' : t) + ':' + r.id)) ok(`V1 ${r.id} 아이템`, false);
for (const t of ['bugs', 'fish']) for (const r of G.data.all(t)) {
  if (!(r.size[0] < r.size[1])) ok(`V1 ${r.id} 크기 범위`, false);
  if (!r.months.every((m) => m >= 1 && m <= 12)) ok(`V1 ${r.id} 월`, false);
}
// 매달·매시 최소 1종 곤충이 나온다 (빈 화면 금지)
let gap = [];
for (let m = 1; m <= 12; m++) for (let h = 0; h < 24; h++) {
  const any = G.data.all('bugs').some((b) => b.months.includes(m) && b.hours.some(([a, c]) => h >= a && h < c));
  if (!any) gap.push(`${m}월 ${h}시`);
}
ok('V1 곤충 공백 시간 없음', gap.length === 0, gap.slice(0, 5).join(', '));
for (const loc of ['river', 'pond', 'sea']) {
  let g2 = []; for (let m = 1; m <= 12; m++) for (let h = 0; h < 24; h++) if (!G.data.all('fish').some((f) => f.loc === loc && f.months.includes(m) && f.hours.some(([a, c]) => h >= a && h < c))) g2.push(`${m}월 ${h}시`);
  ok(`V1 물고기(${loc}) 공백 없음`, g2.length === 0, g2.slice(0, 3).join(', '));
}

// V6 월드 생성: 시드 1..N 검증 통과율 100%, 생성 시간
let bad = [], t0 = Date.now();
for (let s = 1; s <= N; s++) { const m = G.world.generateValid(s); const v = G.world.validate(m); if (!v.ok) bad.push(s + ':' + v.errs.join('/')); }
const per = (Date.now() - t0) / N;
ok(`V6 월드 생성 시드 1~${N} 검증`, bad.length === 0, bad.slice(0, 5).join(' '));
ok('V6 생성 시간 < 150ms', per < 150, per.toFixed(1) + 'ms/맵');
// 결정성: 같은 시드 → 같은 맵
const a = G.world.generate(12345), b = G.world.generate(12345);
ok('V6 결정적 생성', Buffer.from(a.terr).equals(Buffer.from(b.terr)) && a.objs.length === b.objs.length);

// V7 비트셋 직렬화 왕복 + 다운그레이드 안전
const bits = new G.Bits(300); [0, 5, 7, 64, 199, 299].forEach((i) => bits.set(i));
const back = G.Bits.from(bits.toStr(), 300);
ok('V7 비트셋 왕복', [0, 5, 7, 64, 199, 299].every((i) => back.has(i)) && back.count() === 6);
const shorter = G.Bits.from(bits.toStr(), 100);
ok('V7 비트셋 짧게 읽기', shorter.has(64) && !shorter.has(199) && shorter.count() === 4);
const longer = G.Bits.from(new G.Bits(10).toStr(), 500);
ok('V7 비트셋 길게 읽기', longer.count() === 0);

// V8 세이브 왕복 + 체크섬 + A/B 슬롯 + 마이그레이션
G.world.build(777);
G.inv.add('branch', 3); G.inv.add('fish:carp', 1, { size: 42.5, v: 1 });
G.wallet.add(4321, 'test');
G.collect.record('bug', 3, 0, 0.8); G.collect.record('fish', 5, 1, 42.5);
const r1 = G.save.now('t1');
ok('V8 저장', r1.ok, r1.size + 'B');
const snapMoney = G.wallet.get(), snapInv = JSON.stringify(G.inv.slots);
G.wallet.add(999, 'x'); G.save.now('t2');
// 최신 슬롯을 1바이트 변조 → 다른 슬롯(이전 저장)으로 로드돼야 한다
const meta = JSON.parse(G.store.getItem(G.save.KEY.META));
const k = G.save.KEY[meta.last]; const raw = G.store.getItem(k);
G.store.setItem(k, raw.slice(0, 40) + (raw[40] === 'a' ? 'b' : 'a') + raw.slice(41));
G.inv.slots.length = 0; G.wallet.add(-G.wallet.get(), 'wipe');
const lr = G.save.load();
ok('V8 손상 슬롯 건너뛰고 로드', lr.ok && G.wallet.get() === snapMoney && JSON.stringify(G.inv.slots) === snapInv, `money=${G.wallet.get()}`);
ok('V8 도감 복원', G.collect.has('bug', 3, 0) && G.collect.has('fish', 5, 1) && G.collect.best('fish', 5) === 42.5);
// 내보내기 → 가져오기
const ex = G.save.exportString(); const pi = G.save.parseImport(ex);
ok('V8 내보내기 문자열 검증', pi.ok && ex.startsWith('MG1:'));
ok('V8 손상된 내보내기 거부', !G.save.parseImport(ex.slice(0, -3) + 'zzz').ok);
ok('V8 상태 지문 안정성', G.save.fingerprint() === G.save.fingerprint() && G.save.fingerprint(pi.env) === G.save.fingerprint(JSON.parse(JSON.stringify(pi.env))));
{ // 시각(time.lastMs)만 바뀌면 지문은 그대로, 돈이 바뀌면 달라진다 (가짜 충돌 방지)
  const e1 = JSON.parse(JSON.stringify(pi.env)), e2 = JSON.parse(JSON.stringify(pi.env)), e3 = JSON.parse(JSON.stringify(pi.env));
  e2.s.time.d.lastMs = (e2.s.time.d.lastMs || 0) + 123456; e3.s.econ.d.money += 1;
  ok('V8 지문: 시각만 바뀌면 같음', G.save.fingerprint(e1) === G.save.fingerprint(e2));
  ok('V8 지문: 진행이 바뀌면 다름', G.save.fingerprint(e1) !== G.save.fingerprint(e3));
}
ok('V8 세이브 요약', pi.summary.money === snapMoney && pi.summary.name !== undefined && pi.summary.playDays !== undefined);
// 마이그레이션 v1 → v2 (player.ring 추가)
const env = JSON.parse(JSON.stringify(pi.env));
env.s.player = { v: 1, d: { x: 100, y: 200, dir: 0, look: {}, name: '옛날', town: '마을', tools: ['hand', 'net'], tool: 'net' } };
env.sum = G.u.fnv1a(JSON.stringify(env.s));
const mr = G.save.importEnv(env);
ok('V8 마이그레이션 v1→v2', mr.ok && mr.migrated && Array.isArray(G.player.ring) && G.player.ring.length === 2 && G.player.name === '옛날');
// 미래 섹션 보존
const env2 = JSON.parse(JSON.stringify(G.save.envelope())); env2.s.future_thing = { v: 1, d: { hello: 1 } }; env2.sum = G.u.fnv1a(JSON.stringify(env2.s));
G.save.importEnv(env2);
ok('V8 모르는 섹션 보존', !!G.save.snapshot().future_thing);
// 크기 예산
ok('V10 세이브 크기 ≤ 160KB', G.save.size() <= G.save.LIMIT, (G.save.size() / 1024).toFixed(1) + 'KB');

// 클라우드 충돌 정책: 한쪽만 바뀌면 자동, 양쪽이 바뀌면 반드시 선택.
const dc = G.cloud._decide, cm = { uid: 'u1', baseFingerprint: 'base', baseRevision: 2 };
ok('클라우드 첫 연결은 로컬 업로드', dc('local', true, null, {}, 'u1') === 'upload');
ok('클라우드 새 기기는 서버 복원', dc('blank', false, { fingerprint: 'server' }, {}, 'u1') === 'remote');
ok('클라우드 서버만 변경 시 복원', dc('base', true, { fingerprint: 'server' }, cm, 'u1') === 'remote');
ok('클라우드 로컬만 변경 시 업로드', dc('local', true, { fingerprint: 'base' }, cm, 'u1') === 'upload');
ok('클라우드 양쪽 변경 시 충돌', dc('local', true, { fingerprint: 'server' }, cm, 'u1') === 'conflict');
ok('클라우드: 다른 계정 기기 마을은 서버 마을로', dc('local', true, { fingerprint: 'server' }, { uid: 'u2', baseFingerprint: 'b' }, 'u1') === 'remote');
ok('클라우드: 계정 없이 하던 기존 마을 + 서버 마을 = 고르기', dc('local', true, { fingerprint: 'server' }, {}, 'u1') === 'conflict');
ok('클라우드: 계정 없이 하던 기존 마을 + 빈 계정 = 그 마을로 연결', dc('local', true, null, {}, 'u1') === 'upload');
ok('계정 아이디 소문자 정규화', G.cloud._accountId('  Mongle_12 ') === 'mongle_12');
ok('계정 아이디 형식 검증', G.cloud._validAccountId('mongle_12') && !G.cloud._validAccountId('몽글12') && !G.cloud._validAccountId('abc'));
ok('실제 이메일을 만들지 않는 내부 식별자', G.cloud._accountEmail('Mongle_12') === 'mongle_12@accounts.mongle.invalid');
{
  const gameSource = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
  const cloudSource = fs.readFileSync(path.join(ROOT, 'js', 'cloud.js'), 'utf8');
  const inputSource = fs.readFileSync(path.join(ROOT, 'js', 'input.js'), 'utf8');
  const uiSource = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
  ok('폰 첫 화면 로그인 뒤 게임 진행', gameSource.includes("G.ui.account('login', auto)") && gameSource.includes("sessionStorage.getItem('mg.autogo')"));
  ok('Google 로그인은 모바일 호환 팝업 방식', cloudSource.includes('signInWithPopup') && !cloudSource.includes('signInWithRedirect'));
  ok('PC 행동 단축키는 Space 하나', inputSource.includes("ACTION_KEYS = new Set(['Space'])"));
  ok('PC 도구 단축키는 Q 하나', inputSource.includes("TOOL_KEYS = new Set(['KeyQ'])"));
  ok('PC 우측 버튼에 단축키 표시', uiSource.includes("$('kbd', 'hud-key', 'Q')") && uiSource.includes("$('kbd', 'hud-key', 'Space')"));
}
{
  const prevUI = G.ui, prevAudio = G.audio;
  G.ui = { itemPop() {} }; G.audio = { sfx() {} }; G.player.tool = 'net';
  G.game.gain('branch', 1, null, { keepTool: true, sfx: false });
  ok('곤충 포획 뒤 잠자리채 유지', G.player.tool === 'net' && !G.player.hold && G.player.holdT === 0);
  G.ui = prevUI; G.audio = prevAudio;
}
ok('곤충: 채를 들고 걸으면 덜 놀람', G.eco._scareScale({ mode: 'walk', tool: 'net' }) < G.eco._scareScale({ mode: 'walk', tool: 'hand' }));
ok('곤충: 달리면 여전히 도망', G.eco._scareScale({ mode: 'run', tool: 'net' }) > G.eco._scareScale({ mode: 'walk', tool: 'net' }));
ok('곤충: 포획 판정 완화', G.eco._bugTune.catchRadius >= 34 && G.eco._bugTune.catchGrace >= 0.5 && G.eco._bugTune.fleeSpeed < 140);
ok('곤충: 가장 예민한 종도 채 들고 걸어서 포획 거리 진입', Math.max(...G.data.all('bugs').map((x) => x.flee)) * G.C.TILE * G.eco._bugTune.netWalkScare < 22 + G.eco._bugTune.catchRadius);
{
  const sp = G.data.all('bugs')[0], p = { x: 0, y: 0, dir: 3 };
  const edge = { sp, x: 55, y: 0, alt: 0, fade: 1, state: 'idle', t: 0 };
  G.eco.bugs.push(edge); ok('곤충: 넓어진 채 끝자락에서 포획', G.eco.swing(p) === edge);
  const startled = { sp, x: 45, y: 0, alt: 0, fade: 1, state: 'flee', t: 0.4 };
  G.eco.bugs.push(startled); ok('곤충: 도망 직후에도 포획', G.eco.swing(p) === startled); G.eco.clear();
}

// 마을 시계: 실제 1초 = 마을 1분, 농사·목장은 몇 분 안에
{
  const T = G.time, F = G.farm, t0 = T.now();
  void t0;
  { // 공통 시간(D21): 마을 시계는 실제 시각에서 계산 — 실제 1초 = 낮 42초·밤 150초, 기준 시각 = 마을 2027-03-01 05:00
    const dn = Date.now, base = Date.UTC(2026, 10, 25, 0, 0);
    Date.now = () => base; const d0 = T.date(), day0 = T.dayDate(T.day());
    Date.now = () => base + 1000; const dDay = T.now() - d0.getTime();
    Date.now = () => base + 21 * 60000; const t1 = T.now(); Date.now = () => base + 21 * 60000 + 1000; const dNight = T.now() - t1;
    Date.now = () => base + 24 * 60000; const d1 = T.date();
    Date.now = dn;
    ok('공통 시계: 기준 시각 = 마을 3월 1일 05시', d0.getHours() === 5 && day0.m === 3 && day0.d === 1);
    ok('공통 시계: 낮 0.7배·밤 2.5배', Math.abs(dDay - 42000) < 2 && Math.abs(dNight - 150000) < 2, `${dDay} ${dNight}`);
    ok('공통 시계: 실제 24분 = 하루', d1.getHours() === 5 && d1.getMinutes() === 0 && d1.getDate() === 2);
  }
  const step = (realSec) => { for (let i = 0; i < realSec * 4; i++) { T.advance(0.25); if (i % 4 === 3) { F.tick(); G.ranch.tick(); } } };
  F.st.plots = [{ tx: 1, ty: 1, crop: 'spinach', prog: 0, gp: 0, wet: 0, water: -1, giant: false }]; F.st.lastMin = -1; F.tick();
  const p = F.st.plots[0]; G.weather.override({ type: 'clear', wind: 0 });
  step(60); ok('농사: 물 안 주면 안 자람', p.prog === 0);
  p.wet = T.pmin() + F.WET_MIN; step(8 * 60 + 2);
  ok('농사: 물 주고 8분이면 시금치(2) 수확', F.stage(p) === 3, `prog=${p.prog}`);
  F.st.plots = [];
  const a = { id: 1, kind: 'chicken', born: T.day() - 2, petAt: T.pmin(), ready: false, love: 0 };
  G.ranch.st.animals = [a]; step(2 * 60 + 2);
  ok('목장: 닭 쓰다듬고 2분이면 달걀', a.ready === true && G.ranch.canPet(a) === false);
  G.ranch.st.animals = []; G.weather.override(null);
}

// 등불 1~10 조건이 모두 정의돼 있다
{ let okAll = true; for (let n = 1; n <= 10; n++) { const c = G.lantern.conds(n); if (!(c.length === 2 && c.every((x) => typeof x.text === 'string' && x.need > 0))) okAll = false; } ok('등불 1~10 조건', okAll); }
ok('채팅 욕설 필터', G.net.filter('야 시발 뭐해').indexOf('시발') < 0 && G.net.filter('안녕 반가워') === '안녕 반가워');

// 이웃 이야기: 8명 × 4장, 선물 아이템이 모두 존재
{ let bad = []; for (const [id, arr] of Object.entries(G.story.S)) { if (arr.length !== 4) bad.push(id + ':len'); for (const sc of arr) if (sc.gift && !G.items.get(sc.gift.split('#')[0])) bad.push(sc.gift); }
  ok('이웃 이야기 8명×4장·선물 확인', Object.keys(G.story.S).length === 8 && !bad.length, bad.join(',')); }

// 축제: 4개, 조각 아이템·모자 잠금 번호
ok('축제 4개·조각 아이템', G.fest.FESTS.length === 4 && G.fest.FESTS.every((f) => G.items.get(f.token) && f.hat >= 13 && f.hat <= 16));

// 가방: 쌓기·가득 참
G.inv.slots.length = 0;
ok('가방 쌓기', G.inv.add('branch', 45) === 0 && G.inv.slots.length === 2 && G.inv.count('branch') === 45);
for (let i = 0; i < 35; i++) G.inv.add('fish:carp', 1, { size: 30 + i, v: 0 });
ok('가방 30칸 상한', G.inv.slots.length === G.inv.size && G.inv.size === 30 && !G.inv.canFit('fish:carp', { size: 1 }));

// 보관함: 넣고 빼기
{ G.inv.slots.length = 0; G.inv.add('branch', 25); G.storage.slots.length = 0;
  ok('보관함 넣기', G.storage.put(0) && G.inv.count('branch') === 0 && G.storage.slots[0].n === 25);
  ok('보관함 꺼내기', G.storage.take(0) && G.inv.count('branch') === 25 && G.storage.slots.length === 0); }

// 시간: 05:00 경계
const d1 = G.time.dayOf(new Date(2026, 10, 23, 4, 59).getTime()), d2 = G.time.dayOf(new Date(2026, 10, 23, 5, 0).getTime());
ok('시간 05:00 하루 경계', d2 === d1 + 1);
// 날씨 결정성
ok('날씨 결정적', JSON.stringify(G.weather.at(20000, 10)) === JSON.stringify(G.weather.at(20000, 10)));

// 이름 충돌 검사(r2-재미 1-5): '콩'·'몽' 첫 음절은 콩알·몽실 전용
const names = [...G.data.all('bugs'), ...G.data.all('fish'), ...G.data.all('fossils'), ...G.data.all('shells'), ...G.data.all('sea')].map((r) => r.name);
const clash = names.filter((n) => /^(콩|몽)/.test(n));
ok('이름 금칙(콩·몽 첫 음절)', clash.length === 0, clash.join(','));
const dup = names.filter((n, i) => names.indexOf(n) !== i);
ok('이름 중복 없음', dup.length === 0, dup.join(','));

console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과');
process.exit(fails ? 1 : 0);
