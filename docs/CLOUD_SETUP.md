# 계정 연결 설정 — 무료 Spark 전용

결제수단을 등록하지 않고 Firebase **Spark(무료)** 요금제만 사용한다. Cloud Functions, 유료 서버, Blaze 전환은 사용하지 않는다.

## Firebase 콘솔에서 한 번만 할 일

1. Firebase 콘솔에서 기존 Google Cloud 프로젝트 `mongle-woods-1539`에 Firebase를 추가하고 약관에 동의한다.
2. **Build → Realtime Database → Create Database**에서 `asia-southeast1`과 **잠금 모드**를 선택한다.
3. **Build → Authentication → Sign-in method**에서 Google 로그인을 활성화한다.
4. **Project settings → Your apps → Web**에서 웹 앱 `mongle-woods-web`을 등록한다.
5. 표시된 `firebaseConfig`를 `js/firebase-config.js`의 `G.FIREBASE_CONFIG`에 넣는다. `databaseURL`이 포함되어야 한다.
6. Realtime Database의 **Rules**에 `firebase.database.rules.json` 내용을 붙여 넣고 게시한다.
7. Authentication의 **Authorized domains**에 `shchoi880-source.github.io`가 있는지 확인한다.

Firebase 웹 설정값은 비밀키가 아니다. 실제 데이터 보호는 Database Rules가 담당하며, 현재 규칙은 `users/{uid}`를 해당 Google 계정 본인만 읽고 쓰게 한다.

## 동기화 원칙

- 기존 `localStorage` A/B 세이브는 계속 남는다. 계정 연결이 실패해도 오프라인 게임은 동작한다.
- 서버에 저장이 없으면 현재 기기의 기존 마을을 첫 서버 세이브로 올린다.
- 새 기기처럼 로컬 마을이 비어 있으면 서버 마을을 내려받는다.
- 마지막 동기화 이후 한쪽만 바뀌었으면 바뀐 쪽을 적용한다.
- PC와 폰 양쪽이 모두 바뀌었으면 자동 덮어쓰지 않고 두 저장의 마을명·이름·재화·도감·플레이 일수를 보여 주고 고르게 한다.
- 서버 또는 로컬을 덮어쓰기 전에는 반대편 저장을 `mg.cloud.backup`에 복구용으로 남긴다.
- 실제 게임 상태 지문이 달라졌을 때만 저장하며 5초 디바운스를 적용해 무료 사용량을 아낀다.

## 서버 데이터

`users/{uid}/save`에 MG1 세이브 문자열, 상태 지문, 서버 revision, 요약 정보만 저장한다. 비밀번호나 Google 토큰은 게임 데이터에 저장하지 않는다.

멀티플레이용 `rooms/`는 아직 쓰기 금지다. 친구 마을 기능을 구현할 때 별도의 크기·형식 검증 규칙과 초당 전송 제한을 추가한다.
