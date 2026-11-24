// 이 값들은 클라이언트 식별 정보이며 비밀키가 아니다. 접근 권한은 Database Rules가 막는다.
(function (G) {
  'use strict';
  G.FIREBASE_CONFIG = G.FIREBASE_CONFIG || {
    apiKey: 'AIzaSyCZINa162mbHVgp99JGVDlFJYgcu826RfE',
    authDomain: 'mongle-woods-1539.firebaseapp.com',
    databaseURL: 'https://mongle-woods-1539-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'mongle-woods-1539',
    storageBucket: 'mongle-woods-1539.firebasestorage.app',
    messagingSenderId: '160287410478',
    appId: '1:160287410478:web:b5e2d30293184d468292bf'
  };
  G.modules.add('firebase-config');
})(globalThis.G);
