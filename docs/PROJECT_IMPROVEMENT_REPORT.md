# 프로젝트 개선 보고서

최종 업데이트: 2026-04-24

## 1. 개요

본 프로젝트는 대형 단일 파일 구조와 누적된 타입 부채, 검증 사각지대를 가진 상태에서 시작했으며, 현재는 구조 분해, 타입 안정화, 자동 검증 체계 구축까지 완료된 상태입니다.

현재 기준선은 아래와 같습니다.

- TypeScript 통과
- Build 통과
- Unit Test 57개 전부 통과
- Smoke QA 통과
- 검증 점수 100/100
- `@ts-nocheck` 0건

## 2. 구조 개선 수치

### 2-1. 서버 라우트 계층

- `server/routes.ts`: `13,088줄 -> 159줄`
- 감소율: `-98.8%`

기존에는 라우팅, 비즈니스 로직, 응답 조립이 한 파일에 혼재되어 있었으나, 현재는 라우트 등록 허브 역할만 수행하도록 정리되었습니다.

### 2-2. 서버 스토리지 계층

- `server/storage.ts`: `5,548줄 -> 22줄`
- 감소율: `-99.6%`

기존 단일 스토리지 파일은 현재 조립용 진입점 수준으로 축소되었고, 실제 로직은 도메인별 base/helper 계층으로 분리되었습니다.

### 2-3. 분리된 핵심 저장소 구조

현재 주요 base 파일 구성은 아래와 같습니다.

- `server/memStorageStateBase.ts`: `172줄`
- `server/memStorageCoreStudyBase.ts`: `350줄`
- `server/memStorageSpeakingBase.ts`: `90줄`
- `server/memStorageWritingGreBase.ts`: `281줄`
- `server/memStoragePerformanceBase.ts`: `122줄`
- `server/delegatedStorageSuccessBase.ts`: `126줄`
- `server/delegatedStorageSecurityFeatureBase.ts`: `121줄`
- `server/delegatedStorageEngagementFeatureBase.ts`: `166줄`
- `server/delegatedStorageNewToeflBase.ts`: `199줄`
- `server/delegatedStorageAnalyticsBase.ts`: `91줄`
- `server/delegatedStorageBase.ts`: `79줄`

호환성 유지용 얇은 wrapper:

- `server/memStorageSpeakingGreBase.ts`: `3줄`
- `server/memStorageExamBase.ts`: `3줄`
- `server/delegatedStorageAccountFeatureBase.ts`: `3줄`
- `server/delegatedStorageFeatureBase.ts`: `3줄`

### 2-4. 모듈 수

- `server/routes` 내 라우트 파일 수: `40개`
- `server/lib` 내 helper/storage 파일 수: `32개`

## 3. 타입 안정성 및 품질 개선 수치

### 3-1. 타입 안정성

- `@ts-nocheck`: `0건`
- TypeScript 상태: `통과`

즉, 현재 코드는 파일 단위 타입 무시에 의존하지 않고 전체 타입 검증을 통과하는 상태입니다.

### 3-2. 테스트 체계

- 단위 테스트 파일 수: `15개`
- 단위 테스트 수: `57개`
- 결과: `57개 전부 통과`

### 3-3. 통합 검증 상태

- `npm run check`: 통과
- `npm run verify:full`: 통과
- 검증 점수: `100/100`
- 서버 bootstrap 번들: `1.1MB -> 708KB` 수준으로 축소

`verify:full` 검증 항목:

- TypeScript 컴파일
- 단위 테스트
- Production 빌드
- Smoke QA

## 4. QA 및 운영 검증 개선 수치

### 4-1. 스모크 QA 스크립트

- 파일: `scripts/qa-smoke.ts`
- 길이: `1069줄`

### 4-2. 현재 자동 검증 범위

현재 스모크 QA는 아래 시나리오를 자동 검증합니다.

- 회원가입
- 세션 생성
- 인증 사용자 API 호출
- NEW TOEFL feedback request 생성
- 내 feedback request 목록 조회
- 테스트 사용자 관리자 승격
- 비인증 사용자 `401` 권한 차단 확인
- 일반 사용자 `403` 권한 차단 확인
- 다른 사용자 결제 접근 `403` 소유권 차단 확인
- 비인증 오브젝트 업로드 URL 발급 차단 확인
- 업로드/오디오 경로 traversal 시도 차단 확인
- 관리자 대시보드 조회
- 관리자 analytics summary 조회
- 관리자 NEW TOEFL reading 목록 조회
- 관리자 pending feedback 목록 조회
- 관리자 feedback 승인 처리
- 승인된 feedback 목록 조회
- **관리자 NEW TOEFL reading 생성/수정/삭제 (POST/PATCH/DELETE)**
- **관리자 feedback 반려 (reject) 승인 플로우**
- **결제 실패 webhook 처리 및 DB 반영 확인**
- **결제 성공 confirm 처리 및 subscription 생성/정리 확인**
- **AI 문제 생성 성공 플로우 및 저장/정리 확인**
- **TTS 생성 성공 플로우 확인**
- **writing listening audio 생성 성공 플로우 확인**
- **speech-to-text / enhanced speech-to-text 성공 플로우 확인**
- **speaking feedback 성공 플로우 확인**
- **speaking attempt 업로드 성공 플로우 확인**
- **결제 confirm 소유권 차단 확인**
- **비인증 관리자 쓰기 경로 차단 확인**
  `/api/new-toefl/full-tests`, `/api/speaking-tests`, `/api/writing-tests`
- **비인증/일반사용자 관리자 수정 경로 차단 확인**
  `PATCH /api/ai/tests/:id`, `DELETE /api/ai/tests/:id`,
  `DELETE /api/admin/test-sets/:id`, `PUT/DELETE /api/admin/speaking-topics/:id`
- 로그아웃
- 로그아웃 후 인증 차단 확인
- 공개 시험 목록 API
- 시험 상세 API
- 시험 문제 목록 API

### 4-3. 최신 QA 기준 데이터베이스 상태

- `users = 176`
- `aiGeneratedTests = 203`
- `subscriptions = 0`

## 5. 프론트엔드 및 번들 현황

### 5-1. 프론트엔드 규모

- `client/src/pages` 페이지 파일 수: `85개`

### 5-2. 주요 번들 크기

- `vendor`: `313KB`
- `index.js`: `235KB`
- `index.css`: `335KB`
- `admin-analytics.js`: `13.6KB`
- `AdminAnalyticsOverviewTab.js`: `4.7KB`
- `AdminAnalyticsUsersTab.js`: `6.5KB`
- `AdminAnalyticsAiTestsTab.js`: `5.9KB`
- `AdminAnalyticsRevenueTab.js`: `5.6KB`
- `dashboard.js`: `24.3KB -> 9.6KB`
- `DashboardResultsSection.js`: `9.2KB`
- `DashboardFeedbackSection.js`: `6.4KB`
- `home.js`: `35.1KB`
- `SuccessStoriesCarousel.js`: `4.9KB`
- `ActivityFeedSection.js`: `6.8KB`
- `admin-settings.js`: `5.7KB`
- `AdminSettingsStatusTab.js`: `3.6KB`
- `AdminSettingsMaintenanceTab.js`: `1.2KB`
- `AdminSettingsSecurityTab.js`: `1.7KB`
- `AdminSettingsDataTab.js`: `1.2KB`
- `admin-system.js`: `15.7KB -> 10.1KB`
- `AdminSystemUsersTab.js`: `5.2KB`
- `AdminSystemPaymentsTab.js`: `2.1KB`
- `study-plan.js`: `21.9KB`
- `StudyPlanCreateDialog.js`: `11.1KB`
- `admin-panel.js`: `34.4KB`
- `admin.js`: `5.9KB`
- `AdminPanelMainView.js`: `17.8KB`
- `AdminPanelDialogs.js`: `12.4KB`
- `ai-test-creator.js`: `91.5KB -> 78.7KB`
- `AITestCreatorFormTab.js`: `20.9KB`
- `AITestCreatorInputTabs.js`: `3.0KB`
- `NewToeflTextParserSection.js`: `12.7KB`
- `tests.js`: `54.1KB -> 38.7KB`
- `TestsPortalView.js`: `4.8KB`
- `TestsSectionView.js`: `3.7KB`
- `admin-speaking-topics.js`: `37.3KB -> 24.3KB`
- `AdminSpeakingTopicsGenerateDialog.js`: `4.6KB`
- `AdminSpeakingTopicsFormDialog.js`: `8.2KB`
- `toefl-writing.js`: `72.9KB -> 58.9KB`
- `ToeflWritingSelectView.js`: `9.5KB`
- `ToeflWritingCompleteView.js`: `5.7KB`
- `toefl-reading.js`: `약 72KB대 -> 41.6KB`
- `ToeflReadingLoginGate.js`: `1.3KB`
- `ToeflReadingReportDialog.js`: `8.1KB`
- `ToeflFeedbackPanel.js`: `8.3KB`
- `new-toefl-reading.js`: `41.5KB -> 31.0KB`
- `NewToeflReadingCompleteWordsTab.js`: `5.2KB`
- `NewToeflReadingChoiceTab.js`: `4.9KB`
- `new-toefl-writing.js`: `38.6KB -> 31.5KB`
- `NewToeflWritingIntroView.js`: `4.5KB`
- `NewToeflWritingResultsView.js`: `4.4KB`
- `new-toefl-listening.js`: `72.7KB -> 68.1KB`
- `NewToeflListeningIntroView.js`: `3.8KB`
- `NewToeflListeningCompletionView.js`: `2.7KB`
- `new-toefl-speaking.js`: `34.2KB -> 28.9KB`
- `NewToeflSpeakingIntroView.js`: `2.7KB`
- `NewToeflSpeakingResultsView.js`: `3.9KB`
- `toefl-listening-new.js`: `27.2KB -> 14.2KB`
- `ToeflListeningConversationView.js`: `6.6KB`
- `ToeflListeningQuestionsView.js`: `8.4KB`
- `gre-verbal-reasoning.js`: `약 39KB대 -> 25.7KB`
- `GreVerbalTestSelectionView.js`: `3.9KB`
- `GreVerbalResultsView.js`: `5.4KB`
- `gre-quantitative-reasoning.js`: `51.6KB -> 46.9KB`
- `ScientificCalculator.js`: `5.1KB`
- `actual-test-container.js`: `23.8KB -> 23.5KB`
- `ActualTestPauseDialog.js`: `1.3KB`
- `recharts-vendor`: `287KB`
- `d3-vendor`: `63KB`
- `ui-vendor`: `93KB`
- `ui-navigation-vendor`: `32.7KB`
- `ui-dialog-vendor`: `9.6KB`
- `forms-vendor`: `82KB`
- `state-vendor`: `7KB`
- `score-analytics.js`: `12.3KB`
- `ScoreAnalyticsPerformanceChart.js`: `1.6KB`
- `my-page.js`: `32.5KB`
- `MyPageScoreHistoryChart.js`: `0.9KB`
- `admin-student-results.js`: `22.7KB`
- `AdminStudentResultsCharts.js`: `3.7KB`
- `AdminStudentResultDetailDialog.js`: `7.0KB`
- `AdminStudentMessageDialog.js`: `2.8KB`
- `admin-feedback.js`: `4.6KB`
- `admin-achievements.js`: `12.9KB`
- `AdminAchievementForm.js`: `7.4KB`

해석:

- 백엔드 구조 리스크는 크게 낮아졌습니다.
- 프론트 번들은 chart 계열 청크가 여전히 큰 편이지만, 엔트리 청크는 lazy/deferred import 적용으로 `309KB -> 235KB`까지 줄었고, `dashboard`는 결과/피드백 섹션 lazy 분리, `home`은 성공사례/실시간 활동 섹션 lazy 분리, `admin-analytics`는 탭별 lazy 분리, `admin-settings`는 상태/관리/보안/데이터 탭 lazy 분리, `admin-system`은 사용자/결제 탭 lazy 분리, `study-plan`은 생성 다이얼로그 lazy 분리, `ai-test-creator`는 대형 폼 탭과 text/excel 입력 탭에 이어 `NEW TOEFL` 전용 텍스트 파싱 블록까지 lazy 분리해 본체를 `91.5KB -> 78.7KB`로 줄였고, `tests`는 포털/섹션 분기를 lazy 분리해 페이지 본체를 `54.1KB -> 38.7KB`로 줄였고, `admin-speaking-topics`는 생성/편집 다이얼로그를 lazy 분리해 본체를 `37.3KB -> 24.3KB`로 줄였고, `admin-student-results`는 상세/메시지 다이얼로그 분리로 `22.8KB`까지 낮췄고, `admin-achievements`는 입력 폼 분리로 `12.9KB`까지 낮췄고, `admin-feedback`는 탭 본문 분리로 `4.7KB`까지 낮췄고, `admin`은 본체와 관리 UI를 `admin.js 5.9KB`와 `AdminPanelMainView.js 17.8KB`로 분리했고, `ui-vendor`는 `134KB -> 93KB`로 줄인 대신 `ui-navigation-vendor 32.7KB`, `ui-dialog-vendor 9.6KB`로 분산시켰습니다. `toefl-writing`은 선택/완료 화면 lazy 분리로 `72.9KB -> 58.9KB`, `toefl-reading`은 로그인 게이트/결과 리포트/AI 해설 다이얼로그를 페이지 밖으로 분리해 본체를 `약 72KB대 -> 41.6KB`까지 낮췄고, `toefl-listening-new`는 대화/문항 본문을 lazy 분리해 `27.2KB -> 14.2KB`까지 낮췄고, `new-toefl-reading`은 complete words/choice 탭 본문을 lazy 분리해 `41.5KB -> 31.0KB`까지 낮췄고, `new-toefl-writing`은 시작/결과 화면 lazy 분리로 `38.6KB -> 31.5KB`, `new-toefl-listening`은 시작/완료 화면 lazy 분리로 `72.7KB -> 68.1KB`, `new-toefl-speaking`은 시작/결과 화면 lazy 분리로 `34.2KB -> 28.9KB`, `gre-verbal-reasoning`은 테스트 선택/결과 화면을 lazy 분리해 `약 39KB대 -> 25.7KB`까지 낮췄고, `gre-quantitative-reasoning`은 계산기를 lazy 분리해 `51.6KB -> 47.0KB`까지 낮췄고, `actual-test-container`는 pause dialog를 별도 청크로 분리해 공용 UI 의존을 늦췄습니다. 서버 번들은 `dist/bootstrap.js 708.3KB`까지 경량화됐습니다.

## 6. 완료된 핵심 개선 내용

- 초대형 `routes.ts` 분해 완료
- 초대형 `storage.ts` 분해 완료
- auth/admin/AI/GRE/SAT/NEW TOEFL/analytics 로직 도메인별 분리
- helper/service 계층 추출
- 서버/클라이언트의 `@ts-nocheck` 전부 제거
- smoke QA `real/mock` 이중 모드 지원 (`QA_REAL_PROVIDERS=1`)
  실제 실행은 `OPENAI_API_KEY`, `TOSS_PAYMENTS_SECRET_KEY`, `TOSS_PAYMENTS_CLIENT_KEY`, `BASE_URL`이 전부 placeholder가 아닌 값일 때만 real mode로 승격
- AI 호출 기본 티어 최적화로 비용 절감 반영
- 로컬 DB 복원 및 실행 환경 안정화
- CI 성격의 검증 흐름 정착
- 공개 API 중심 QA에서 인증/관리자/feedback 요청/관리자 쓰기/결제 실패뿐 아니라 결제 성공 confirm, AI 생성, feedback approve, STT/TTS 성공 경로까지 검증 범위 확대
- 인증 누락 AI 엔드포인트 24건 보호
- 결제 confirm/fail 소유자 검증 추가
- 비인증/비관리자/비소유자 접근 차단을 자동 QA로 고정
- Toss confirm 성공, AI 문제 생성 성공, feedback approve 성공, STT/TTS 성공 경로를 mock 기반 smoke QA로 고정
- 오브젝트 업로드 signed URL 발급 엔드포인트 인증 적용
- 하드코딩 기본 관리자 해시 제거 및 환경변수 기반 부트스트랩 전환
- dead duplicate route 정리 완료
- 업로드 파일명 정규화 helper 도입으로 경로 오염 가능성 축소
- 업로드 경로 safe resolver 도입으로 파일 서빙 traversal 위험 축소
- `/uploads`, `/api/audio/:filename` traversal 회귀를 smoke QA로 고정
- `admin-analytics` 탭별 lazy 분리로 관리자 분석 화면의 초기 청크 경량화
- `home`의 성공사례 캐러셀과 실시간 활동 피드를 lazy 분리해 메인 페이지 본체 경량화
- `ai-test-creator` 폼 탭 lazy 분리로 대형 작성 UI를 별도 청크로 분리
- `ai-test-creator` text/excel 입력 탭도 lazy 분리해 생성기 초기 청크 추가 절감
- `study-plan` 생성 다이얼로그를 lazy 분리해 폼/다이얼로그 의존성을 초기 페이지 청크에서 제거
- `admin-panel`의 성공스토리/프로그램/권한부여 다이얼로그를 lazy 분리해 관리자 메인 화면의 폼 의존성을 초기 페이지 청크에서 제거
- `admin-system`의 사용자/결제 탭 lazy 분리로 관리자 시스템 화면의 초기 청크 경량화
- `admin-speaking-topics`의 생성/편집 다이얼로그를 lazy 분리해 관리자 주제 관리 화면의 폼 의존성을 초기 페이지 청크에서 제거
- `tests`의 포털/섹션 분기 lazy 분리로 시험 허브 페이지 본체 청크 경량화
- `toefl-reading`의 로그인 게이트/결과 리포트/AI 해설 다이얼로그를 lazy 분리해 본체 청크를 크게 축소
- `new-toefl-reading`의 complete words/choice 탭 본문을 lazy 분리해 본체 청크를 `41.5KB -> 31.0KB`까지 절감
- `admin-dashboard`의 개요/사용자 탭 lazy 분리로 관리자 대시보드 초기 렌더 의존성 축소
- `toefl-writing`의 선택 화면/완료 피드백 화면 lazy 분리로 대형 작성 페이지 초기 청크 절감
- `new-toefl-writing`의 시작 화면/결과 화면 lazy 분리로 본체 청크를 `38.6KB -> 31.5KB`까지 절감
- `new-toefl-listening`의 시작 화면 lazy 분리로 본체 청크를 `72.7KB -> 70.0KB`까지 절감
- `new-toefl-speaking`의 시작 화면/결과 화면 lazy 분리로 본체 청크를 `34.2KB -> 28.9KB`까지 절감

## 7. 현재 남은 문제점 및 리스크

### 7-1. 프론트엔드 성능

- 번들이 아직 큰 편입니다.
- 특히 `recharts-vendor`, `vendor` 청크는 추가 절감 여지가 있습니다.

### 7-2. QA 범위

- 현재 QA는 공개/사용자 읽기, 관리자 읽기/쓰기, feedback 반려, 결제 실패 경로까지 자동화되어 있습니다.
- 아래 영역은 여전히 외부 의존성(실제 OpenAI 호출, 실제 Toss Payments 호출)이 필요해 자동화 난이도가 있습니다.
  - 실제 AI 생성 승인 플로우 (OpenAI API 키 필요 — mock/stub 도입 시 자동화 가능)
  - 결제 성공 확정 콜백 (Toss webhook signature 검증 포함)
  - Speaking feedback 오디오 업로드 → TTS/STT 파이프라인

### 7-3. 도메인 모델 정제

일부 도메인에는 레거시 호환 흔적이 남아 있습니다.

- `TestSet`
- `GRE`
- `NEW TOEFL`

현재는 정상 동작하지만, 장기적으로는 스키마/도메인 계약을 더 명확하게 재정의하는 편이 유지보수에 유리합니다.

## 8. 다음 단계 제안

### 우선순위 1. QA 확장 (일부 진행됨)

- [x] 관리자 쓰기 작업 (NEW TOEFL reading POST/PATCH/DELETE)
- [x] NEW TOEFL feedback 반려 플로우
- [x] 결제 실패 시나리오
- [x] 관리자/AI 비인증 엔드포인트 접근 통제
- [x] 기본 관리자 하드코딩 해시 제거
- [ ] AI generation 플로우 (OpenAI mock 도입 필요)
- [ ] 결제 성공 확정 플로우 (Toss webhook signature mock 필요)
- [ ] Speaking audio 업로드 → TTS/STT 파이프라인

### 우선순위 2. 프론트 번들 최적화 (진행됨)

- [x] vendor chunk 재분할
- [x] forms-vendor 분리 (폼 페이지에서만 로드)
- [x] payment-vendor 분리 (결제 페이지에서만 로드)
- [x] 공통 추적/설문/토스트 계층 deferred import 적용으로 `index.js 309KB -> 235KB`
- [x] 시험/생성기 경로의 `LoginModal` 지연 로드로 인증 모달 의존성을 별도 청크로 분리
- [x] 차트 의존 페이지를 chart component lazy import로 분리
  - `score-analytics 12.5KB -> 12.3KB`
  - `my-page 32.9KB -> 32.5KB`
  - `admin-student-results 31.8KB -> 30.4KB`
- [x] `study-plan` 생성 다이얼로그를 lazy 분리
  - `study-plan` 초기 페이지 청크 경량화
  - 생성 폼은 `StudyPlanCreateDialog 11.1KB` 별도 청크로 분리
- [x] `admin-panel` 다이얼로그를 lazy 분리
  - `admin-panel 44.6KB -> 34.3KB`
  - `AdminPanelDialogs 12.4KB` 별도 청크로 분리
- [x] `ai-test-creator` 폼 탭을 lazy 분리
  - `ai-test-creator 91.5KB -> 78.7KB`
  - `AITestCreatorFormTab 20.9KB` 별도 청크로 분리
- [x] `ai-test-creator` NEW TOEFL 텍스트 파싱 블록 lazy 분리
  - `NewToeflTextParserSection 12.7KB` 별도 청크로 분리
- [x] `admin-settings` 탭을 lazy 분리
  - `admin-settings 11.1KB -> 5.7KB`
  - 상태/관리/보안/데이터 탭을 각각 별도 청크로 분리
- [x] `dashboard` 결과/피드백 섹션을 lazy 분리
  - `dashboard 24.3KB -> 9.6KB`
  - `DashboardResultsSection 9.2KB`, `DashboardFeedbackSection 6.4KB` 별도 청크 분리
- [x] 관리자 공용 UI를 `ui-vendor / ui-navigation-vendor / ui-dialog-vendor`로 재분할
- [ ] `recharts-vendor 298KB` 추가 축소 — 안전한 무경고 재분할 또는 차트 대체 렌더링 여지

### 우선순위 3. 도메인 모델 정리 (자율 작업에는 부적합)

- `TestSet` 모델 단순화
- `GRE`, `NEW TOEFL` 레거시 호환 분기 축소
- repository/service 경계 재정의

스키마/도메인 계약 변경은 리스크가 크므로, 담당자 직접 검토 하에 진행하는 것이 안전합니다.

## 9. 종합 평가

현재 프로젝트 상태는 아래와 같이 요약할 수 있습니다.

`구조 정상화 완료 + 타입 안정성 복구 완료 + 자동 검증 체계 구축 완료`

즉, 더 이상 “초대형 단일 파일 때문에 개발이 위험한 코드베이스”는 아니며, 다음 단계는 운영 품질 고도화와 QA 확대, 프론트 최적화 중심으로 진행하는 것이 적절합니다.
