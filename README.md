# 몽글숲 이야기 (Mongle Woods)

구름양 **큰솜이**의 등 위에 생긴 작은 숲마을에서, 새 우편지기가 되어 실제 시계에 맞춰 천천히 살아가는 귀여운 2D 코지 라이프 게임.

- 순수 JavaScript + Canvas 2D, 빌드 도구 없음. 그래픽은 전부 코드로 그리고, 소리는 WebAudio로 만든다.
- 저장은 기기 `localStorage`(A/B 이중 슬롯), 내보내기/가져오기 지원. Firebase 설정 시 무료 계정 연결·기기간 동기화를 사용하며 오프라인 저장은 그대로 유지한다. PWA로 오프라인 실행.

## 실행
```
node tools/serve.js        # http://127.0.0.1:8765/  (?dev=1 = 디버그 패널)
node tools/verify.js       # 자동 검증
```

## 문서
- `docs/BRIEF.md` — 프로젝트 브리프
- `docs/meetings/` — 1·2차 기획 회의록
- `docs/DECISIONS.md` — 오너 결정 기록
- `docs/PROGRESS.md` — 진행 상황과 다음 할 일
- `docs/HANDOFF.md` — 다른 AI·개발자를 위한 인수인계
- `docs/CLOUD_SETUP.md` — 무료 계정 연결 설정과 충돌 방지 원칙
