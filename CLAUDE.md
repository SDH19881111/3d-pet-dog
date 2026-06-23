# CLAUDE.md

이 저장소에서 작업할 때 **먼저 [`작업노트.md`](작업노트.md)를 읽으세요.** 프로젝트 개요, 배포 방식, 지금까지의 변경 이력, 미해결 사항, 운영 메모가 모두 거기에 있습니다.

## 필수 규칙
- **작업 시작 전**: `작업노트.md`의 "🔄 다른 환경에서 이어서 작업하기"와 "변경 이력"을 읽고 현재 상태를 파악한다.
- **작업 종료 시**: `작업노트.md`의 "변경 이력"에 **새 커밋 해시 + 요약**을 이어서 기록하고 코드와 함께 push한다.
- **배포**: `main`에 push하면 Cloudflare Pages가 자동배포한다(약 30~60초). 별도 빌드 없음.
- **세이브 포맷 변경 시**: `src/state.js`의 `SAVE_VERSION`을 올린다(옛 로컬 캐시 자동 폐기 → 빈 화면 방지).
- **커밋 전 구문 검사**: `node --check src/*.js`.
- **공개 노출 주의**: 이 저장소는 그대로 `3d-pet-dog.pages.dev`로 서빙되므로, 토큰·개인정보 등을 파일에 넣지 않는다.

## 구조 요약
- 정적 프런트엔드: `index.html`, `style.css`, `src/{main,pet,state,items}.js` (three.js는 unpkg CDN)
- 서버: `functions/api/{login,signup,save}.js` (Cloudflare Pages Functions, KV `PUPPY_DB`)
- 캐시 정책: `_headers` (핵심 파일 no-store)
