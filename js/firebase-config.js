// Firebase 콘솔에서 웹 앱을 등록한 뒤 받은 설정을 여기에 넣는다.
// 이 값들은 클라이언트 식별 정보이며 비밀키가 아니다. 접근 권한은 Database Rules가 막는다.
(function (G) {
  'use strict';
  G.FIREBASE_CONFIG = G.FIREBASE_CONFIG || null;
  G.modules.add('firebase-config');
})(globalThis.G);
