# 보안 리뷰 결과 (2026-04-23 야간 자율 세션)

업데이트: 2026-04-24 후속 정리 반영

본 문서는 자율 리뷰 중 발견한 보안 이슈와 조치 내용을 기록합니다.

## 1. 조치 완료

### 1-1. 인증 미들웨어 누락 AI 엔드포인트 24건

`app.post(...)` 핸들러에 `requireAuth`/`requireAdmin` 미들웨어가 없이 등록된
OpenAI 호출 엔드포인트 24건에 대해 가드를 추가했습니다. 공격자는 이들 엔드포인트를
비인증 상태로 호출하여 OpenAI 토큰을 무제한 소진하거나 테스트 세트 DB를
오염시킬 수 있었습니다.

**관리자 전용 처리 (requireAuth + requireAdmin)**

- `POST /api/ai/generate-questions`
- `POST /api/ai/generate-from-image`
- `POST /api/ai/generate-test-set`
- `POST /api/ai/generate-question` (중복 등록, 기존 가드와 2중 보호)
- `POST /api/ai/auto-generate-all-sections`
- `POST /api/ai/parse-text-questions`
- `POST /api/ai/parse-listening-passages`
- `POST /api/ai/generate-reading-section`
- `POST /api/ai/generate-speaking-section`
- `POST /api/ai/generate-writing-section`
- `POST /api/ai/generate-listening-section`
- `POST /api/ai/generate-quantitative-section`
- `POST /api/ai/generate-listening`
- `POST /api/ai/solve-reading-questions`
- `POST /api/gre/quant/parse`
- `POST /api/gre/quant/create`

**인증 사용자 처리 (requireAuth)**

- `POST /api/generate-reading-solution`
- `POST /api/ai/generate-tts`
- `POST /api/ai/solve-listening-questions`
- `POST /api/writing/listening-audio`
- `POST /api/writing/model-answer` (중복 등록, 실제 사용 버전에 가드 추가)
- `POST /api/speaking-analysis`
- `POST /api/speech-to-text`
- `POST /api/speech-to-text-enhanced`
- `POST /api/speaking/feedback` (중복 등록)

### 1-2. 결제 엔드포인트 인증 및 소유자 검증

- `POST /api/payments/confirm`: 인증 미설정이었습니다. `requireAuth` 추가 후,
  `confirmPayment`에서 `tossOrderId`로 결제 레코드를 조회해 호출자와
  `payment.userId`가 일치하지 않으면 403을 반환하도록 수정했습니다.
- `POST /api/payments/fail`: 동일하게 `requireAuth` 추가 및 소유자 검증 적용.
  기존에는 `orderId`만 알면 누구나 결제를 'cancelled' 상태로 바꿀 수 있어
  DoS 공격에 취약했습니다.

### 1-3. 오브젝트 업로드 URL 발급 엔드포인트 인증 추가

- `POST /api/objects/upload`: 기존에는 비인증 상태에서도 업로드용 signed URL 발급을
  시도할 수 있었습니다. 현재는 `requireAuth`가 적용되어 인증 사용자만 업로드 대상
  URL을 발급받을 수 있습니다.

## 2. 후속 조치 완료

### 2-1. 하드코딩된 기본 관리자 비밀번호 해시 제거 완료

기존 `server/lib/storageBootstrap.ts`에는 기본 관리자 계정의 bcrypt 해시가
소스 코드에 하드코딩되어 있었습니다.

현재는 아래 방식으로 변경되었습니다.

- 운영 환경: `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`가 없으면
  기본 관리자 자동 생성 자체를 건너뜀
- 개발 환경: 명시적 비밀번호가 없으면 매 부팅 시 강한 랜덤 임시 비밀번호를
  생성해 로그로만 안내
- 소스 코드와 git 히스토리 상에는 더 이상 고정 bcrypt 해시가 남아 있지 않음

즉, “코드에 박힌 공통 관리자 비밀번호 해시” 문제는 해소되었습니다.

### 2-2. 중복 라우트 등록 정리 완료

기존에 Express 등록 순서에 따라 뒤쪽 핸들러가 dead code가 되는 중복 라우트가
남아 있었고, 일부는 보안 검토 문서에도 후속 과제로 적혀 있었습니다.

정리 완료된 경로:

- `POST /api/writing/model-answer`
- `POST /api/speaking/feedback`
- `POST /api/ai/generate-question`

현재는 실제 사용되지 않던 뒤쪽 핸들러를 제거해 단일 진입점만 남았습니다.

## 3. 추가 확인 필요

### 3-1. 업로드 파일명 정규화 (부분 완료)

업로드 원본 파일명을 그대로 이어 붙이는 경로가 일부 남아 있어 후속 정리가
필요했습니다. 현재는 아래 경로에 공통 파일명 정규화 helper를 적용했습니다.

- `POST /api/admin/gre/quantitative-questions`
- `POST /api/admin/upload-achievement-image`
- `POST /api/speaking-attempts`

즉, 사용자 입력 기반 파일명은 이제 `path.basename()` + 화이트리스트 정규화
기준으로 저장/기록됩니다.

다만 `server/lib/aiGenerationHelpers.ts`처럼 내부적으로 조합되는 로컬 캐시 경로는
여전히 방어 깊이 관점에서 추가 검토 여지가 있습니다. 현재는 사용자 업로드
파일명 기반 경로 오염 리스크가 먼저 줄어든 상태입니다.

### 3-2. Toss 결제 webhook 서명 검증 부재

현재 `/api/payments/confirm`은 클라이언트 POST를 받아 Toss API로 2차 조회를
수행하는 방식입니다 (webhook이 아님). Toss가 서버 간 webhook을 제공하면
webhook 엔드포인트를 추가하고 공식 서명 검증(`X-TOSS-SIGNATURE` 등)을
적용하는 것이 권장 구성입니다.

## 4. 확인 후 이상 없음

- **SQL 인젝션**: 모든 raw SQL이 drizzle의 `sql` 태그를 사용하거나 pool.query
  파라미터화(`$1`, `$2`)를 사용하고 있어 안전.
- **민감정보 로그 유출**: `console.log` 스캔 결과 실제 비밀번호/토큰/키가
  로그로 출력되는 경로는 발견되지 않았습니다. 메타데이터(userId, email,
  hashSuccess) 수준만 로깅됨.

## 5. 검증 상태

모든 후속 조치 후 `verify:full` 100/100 통과

- TypeScript 통과
- Unit tests `57/57` 통과
- 프로덕션 빌드 통과
- Smoke QA 통과

대표 검증 항목:

- `/api/objects/upload (unauthenticated) -> 401`
- `/api/new-toefl/full-tests (unauthenticated) -> 401`
- `/api/speaking-tests (unauthenticated) -> 401`
- `/api/writing-tests (unauthenticated) -> 401`
- `/api/ai/tests/:id (unauthenticated PATCH/DELETE) -> 401`
- `/api/test-sets/:id (unauthenticated PATCH) -> 401`
- `/api/admin/test-sets/:id (unauthenticated DELETE) -> 401`
- `/api/admin/speaking-topics/:id (unauthenticated PUT/DELETE) -> 401`
- `/api/payments/fail (other user forbidden) -> 403`
- `/api/payments/confirm (other user forbidden) -> 403`
- `/uploads/%2e%2e/%2e%2e/package.json -> 404`
- `/api/audio/%2e%2e%2f%2e%2e%2fpackage.json -> 404`
- `/api/admin/feedback/:id/approve -> 200`
- `/api/payments/confirm -> 200`
- `/api/ai/generate-questions -> 200`
- `/api/ai/generate-tts -> 200`
- `/api/writing/listening-audio -> 200`
- `/api/speech-to-text -> 200`
- `/api/speech-to-text-enhanced -> 200`
- `/api/speaking/feedback -> 200`
