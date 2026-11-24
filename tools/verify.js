#!/usr/bin/env node
// 검증 스크립트 (Node 18+, 의존성 0). 종료 코드 0 = 통과, 1 = 실패.
// 사용: node tools/verify.js [시드 수=1000]
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const N = +(process.argv[2] || 1000);

// 브라우저 전용 파일(art·actors·input·audio·ui·dev·boot)은 로드하지 않는다. 나머지는 로드 시 DOM에 접근하지 않는다
for (const f of ['core', 'save', 'firebase-config', 'cloud', 'time', 'data', 'world', 'sys', 'eco', 'npc', 'house', 'museum', 'mail', 'nest', 'requests', 'news', 'tide', 'lantern', 'events', 'farm', 'ranch', 'game']) require(path.join(ROOT, 'js', f + '.js'));
const G = globalThis.G;
let fails = 0;
const ok = (name, cond, detail) => { console.log(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails++; };

// V1 데이터 무결성: 필수 필드·ix 중복은 G.data.add가 이미 검사. 여기선 수량과 참조.
ok('V1 곤충 10종 이상', G.data.all('bugs').length >= 10, String(G.data.all('bugs').length));
ok('V1 물고기 10종', G.data.all('fish').length === 10, String(G.data.all('fish').length));
ok('V1 화석 4종', G.data.all('fossils').length === 4);
ok('V1 조개 6종', G.data.all('shells').length === 6);
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
ok('계정 아이디 소문자 정규화', G.cloud._accountId('  Mongle_12 ') === 'mongle_12');
ok('계정 아이디 형식 검증', G.cloud._validAccountId('mongle_12') && !G.cloud._validAccountId('몽글12') && !G.cloud._validAccountId('abc'));
ok('실제 이메일을 만들지 않는 내부 식별자', G.cloud._accountEmail('Mongle_12') === 'mongle_12@accounts.mongle.invalid');

// 가방: 쌓기·가득 참
G.inv.slots.length = 0;
ok('가방 쌓기', G.inv.add('branch', 45) === 0 && G.inv.slots.length === 2 && G.inv.count('branch') === 45);
for (let i = 0; i < 25; i++) G.inv.add('fish:carp', 1, { size: 30 + i, v: 0 });
ok('가방 20칸 상한', G.inv.slots.length === 20 && !G.inv.canFit('fish:carp', { size: 1 }));

// 시간: 05:00 경계
const d1 = G.time.dayOf(new Date(2026, 10, 23, 4, 59).getTime()), d2 = G.time.dayOf(new Date(2026, 10, 23, 5, 0).getTime());
ok('시간 05:00 하루 경계', d2 === d1 + 1);
// 날씨 결정성
ok('날씨 결정적', JSON.stringify(G.weather.at(20000, 10)) === JSON.stringify(G.weather.at(20000, 10)));

// 이름 충돌 검사(r2-재미 1-5): '콩'·'몽' 첫 음절은 콩알·몽실 전용
const names = [...G.data.all('bugs'), ...G.data.all('fish'), ...G.data.all('fossils'), ...G.data.all('shells')].map((r) => r.name);
const clash = names.filter((n) => /^(콩|몽)/.test(n));
ok('이름 금칙(콩·몽 첫 음절)', clash.length === 0, clash.join(','));
const dup = names.filter((n, i) => names.indexOf(n) !== i);
ok('이름 중복 없음', dup.length === 0, dup.join(','));

console.log(fails ? `\n실패 ${fails}건` : '\n모두 통과');
process.exit(fails ? 1 : 0);
