# 인수인계 (다른 AI·개발자가 이어서 작업할 때 먼저 읽기)

## 프로젝트 한 줄
「몽글숲 이야기」 — 순수 JavaScript + Canvas 2D 코지 라이프 게임. 빌드 도구 없음. `main` 브랜치가 GitHub Pages로 바로 배포된다.
- 플레이 주소: https://shchoi880-source.github.io/mongle-woods/
- 실행: `node tools/serve.js` → http://127.0.0.1:8765/ (`?dev=1` = 디버그 패널: 시간 이동·날씨·몽)
- 검증: `node tools/verify.js` (데이터·지도 생성 1~1000 시드·세이브 왕복·마이그레이션). 커밋 전에 항상 통과시킬 것.

## 먼저 읽을 문서
1. `docs/PROGRESS.md` — 완료/남은 일, 테스터 피드백, 버그 기록 (가장 중요)
2. `docs/DECISIONS.md` — 오너 결정·임시 판단
3. `docs/meetings/r3-*.md`, `r4-*.md` — 최근 회의 결정
4. `docs/BRIEF.md` — 처음 방향(오리지널 IP 원칙: 동물의 숲 이름·캐릭터·화폐 흉내 금지)

## 코드 구조 (js/, index.html의 로드 순서가 곧 의존 순서)
- 전역은 `window.G` 하나. 파일은 IIFE. **로드 시점에 DOM 접근 금지**(Node에서 verify가 같은 파일을 로드함; 브라우저 전용은 art·actors·input·audio·ui·map·dev·boot).
- 세이브: `G.save.section(name, {v, def, get, set, migrate})` — localStorage A/B 슬롯 + 체크섬. **새 필드는 def 기본값으로, 버전을 올리면 migrate 필수.**
- 지도: `world.js` 결정적 생성. **기존 세이브 지도를 바꾸지 않으려면 새 건물·물체는 생성 함수 맨 끝에 덧붙인다**(앞 단계 난수 순서를 건드리면 오너 마을 지도가 바뀜).
- 주요 파일: core(버스·난수·루프·씬) / save / time(시계·날씨) / data(아이템·생물·대사) / world / art·actors(전부 코드로 그림) / input / audio(WebAudio 생성) / sys(가방·지갑·상점·도감·할 일) / eco(곤충·낚시) / npc(주민) / house(실내 꾸미기) / museum / mail(꿈·편지) / nest(집 확장·제작) / requests(오늘의 부탁) / news(쫑알 일보) / tide(조수 웅덩이) / lantern(등불) / map(지도·지금 할 일) / events(첫눈·별똥별·운동회·안내) / farm(텃밭) / ranch(목장) / ui / game(플레이어·렌더·씬) / boot
- 새 파일을 만들면: `index.html` script 추가, `sw.js` FILES 추가 + CACHE 이름 올리기, `tools/verify.js` 로드 목록 추가(Node 안전한 파일만).

## 개발 원칙 (오너 요청)
- **PC와 폰 둘 다** 동작해야 한다(오너가 오가며 플레이·개발). 기능마다 PC(1000×640)와 폰(iPhone 13 에뮬레이션) 두 화면으로 플레이 테스트.
- 작게 커밋·푸시하고, 묶음이 끝나면 `main`에 PR로 합쳐 Pages에 반영.
- 코지 원칙: 벌 없음(물 안 줘도 안 시듦, 동물 안 아픔), 동물을 잡지 않음. 도구 아이콘은 이모지 대신 직접 그린 그림.

## 진행 중이던 일: 계정 연결(클라우드 저장) + 멀티플레이 — 미완료
오너 요청: ①친구 10명 정도가 **같은 마을에서 만나 물건을 주고받기** ②**PC·모바일을 같은 계정으로 이어 하기(계정 연결)**. 둘 다 Firebase(무료 Spark)로 하기로 함.

### Firebase 현재 상태 (2026-11-24 기준)
- Google Cloud 프로젝트 **`mongle-woods-1539`** 생성 완료 (오너 계정 소유, 결제 미등록 = 무료).
- API 활성화 완료: firebase, firebasedatabase, identitytoolkit.
- **Firebase 추가는 실패**: `projects/mongle-woods-1539:addFirebase`가 "caller does not have permission". 오너가 **Firebase 약관에 아직 동의하지 않아서**로 추정.
  → 오너가 https://console.firebase.google.com/ → 프로젝트 만들기 → **「기존 Google Cloud 프로젝트에 Firebase 추가」 → mongle-woods-1539** 선택 → 약관 동의 → Spark(무료) 유지하면 해결될 것.
- 작업용으로 받았던 gcloud 로그인은 **해제(revoke)함**. 다음 작업자는 오너에게 다시 권한을 받거나, 오너가 콘솔에서 직접 하게 안내할 것.

### 남은 단계
1. Firebase 추가(위) → **Realtime Database** 만들기(asia-southeast1, 잠금 모드) → **웹 앱 등록**해서 `firebaseConfig` 받기.
2. **Authentication → Google 로그인 사용 설정**(무료). 익명 로그인도 켜 두면 계정 없이 멀티 입장 가능.
3. 게임에 Firebase JS SDK 연결(CDN, 정확한 버전 고정, 오프라인에서도 게임이 돌아가게 실패해도 무시).
4. **계정 연결**: 잎첩 설정에 「구글 계정으로 연결」. 처음 연결 시 지금 기기 세이브(`G.save.exportString()`)를 `users/{uid}/save`에 올림. 다른 기기에서 연결하면 서버 세이브와 기기 세이브 중 무엇을 쓸지 요약(`G.save.parseImport`의 summary)을 보여 주고 고르게. 이후 저장할 때마다 서버에도 저장(디바운스).
5. **멀티플레이(방식 A: 친구 마을 놀러 가기 먼저)**: 호스트 마을 시드로 같은 지도 생성(지도는 시드로 결정적) → `rooms/{hostUid}/players/{uid}` 에 위치·방향·외형 초당 5~10회 → 말풍선 채팅·감정 표현 → 바닥에 물건 내려놓기/줍기로 주고받기(`rooms/{room}/drops`, 줍기는 트랜잭션). 개인 가방·돈·집은 각자, 마을의 일일 자원(조개·화석 자리)은 호스트 기준.
6. **보안 규칙**: `users/{uid}`는 본인만 읽기·쓰기, `rooms/{room}`은 로그인한 사용자만, 크기·형식 검증.

## 기타
- 무료 한도(대략, 바뀔 수 있음): Realtime Database 동시 접속 100, 저장 1GB, 월 다운로드 10GB — 친구 10명 규모 충분.
- 세이브는 지금 각 기기 브라우저에만 저장된다(잎첩 설정의 내보내기/가져오기로 옮김).
