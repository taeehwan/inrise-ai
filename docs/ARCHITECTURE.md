# Overview

iNRISE is a TOEFL/GRE mock test platform designed to help students worldwide prepare for their exams. Built with React, Express, and PostgreSQL, it offers comprehensive scoring, AI-powered feedback, and detailed performance analytics. The platform aims to provide an authentic test-taking experience with advanced AI features for personalized learning. All AI-generated content and test materials are permanently persisted in the database and subject to an admin approval system, ensuring content quality and reliability. The platform supports multi-language AI feedback for all major test sections (TOEFL Reading/Listening/Speaking/Writing, GRE Verbal/Quantitative/Analytical Writing) in Korean, Japanese, English, and Thai.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript**: Modern React 18 application utilizing functional components and hooks.
- **Wouter**: Lightweight client-side routing.
- **shadcn/ui + Radix UI**: Comprehensive UI component library.
- **TailwindCSS**: Custom color scheme (blue-primary, green-success, orange-warning).
- **TanStack Query**: Data fetching for various platform features.
- **React Hook Form + Zod**: Form validation for user input and test submissions.
- **Global Theme System (Dark/Light/System)**: `ThemeProvider` at `client/src/components/theme-provider.tsx` with `useTheme()` hook. FOUC prevention via inline script in `index.html`. localStorage key `'theme'` stores `'dark'|'light'|'system'`. CSS variables in `:root` (light) + `.dark` (dark) blocks. Section CSS systems (rd-*, sp-*, wt-*, gv-*, mp-*) use `html:not(.dark)` overrides for light mode. Theme toggle in `UserProfileHeader` dropdown (3-way: light/dark/system) and home/dashboard nav (sun/moon icon).

## Backend Architecture
- **Express.js**: REST API server managing test data, user progress, and scoring.
- **PostgreSQL Database + Drizzle ORM**: Primary data persistence for all user-generated content, shared between preview and production environments with automatic synchronization.
- **Test Engine**: Generates and scores mock tests for TOEFL/GRE sections.
- **API Structure**: RESTful endpoints for tests, attempts, results, reviews, and study plans.

## Test Platform Features
- **TOEFL Tests**: Complete implementation with section-specific color themes for Reading, Listening, Speaking, and Writing, including real-time audio generation via ElevenLabs TTS. Speaking feedback incorporates official 2024 ETS rubrics with sentence-by-sentence corrections. Writing feedback uses official ETS TOEFL Writing rubric (1-6 scale: Fully Successful, Generally Successful, Partially Successful, Limited Success, Unsuccessful) instead of CEFR levels.
- **TOEFL Speaking Luxury Mint Dark 리디자인 (Task #57–59)**: `sp-*` CSS class system 적용. 인트로/완료/탭바/Listen&Repeat/Interview 전 화면 딥 민트 다크(#08130F)+민트(#2DD4BF/#5EEAD4) 팔레트로 완전 교체. `NewToeflLayout.tsx`의 speaking 섹션 테마도 민트로 통일 (gradient/badge/progress/bgGradient/navBg 전부). btn-act.amber/.blue → 민트 그라데이션. speak-ring active → 민트. 경고박스 amber 팔레트 유지. rec-bar/dot 빨간색 유지(녹음 universal warning).
- **TOEFL Writing 딥 블루+바이올렛 리디자인 (Task #40)**: `wt-*` CSS class system (wt-card, bloom.violet .c1/.c2, wt-tabs-list/wt-tab/wt-tab-active, wb/wb-chip, sb-row/sb-blank, ctx/ctx.vi, email-fields/ef, dc/dc-av/dc-rl/dc-text, wc-bar, write-area, dc-panel/dc-panel-bar, btn-wt.violet/.green/.slate) 적용. 인트로/완료/탭바/Build a Sentence/Write an Email/Academic Discussion 6개 섹션 전부 딥 블루(#070B14)+바이올렛(#7C3AED) 팔레트로 교체. Card/Badge/Button 컴포넌트 완전 제거. CSS 시스템 패턴: Reading(사이언)/Listening(그린)/Speaking(앰버)/Writing(바이올렛).
- **NEW TOEFL Full Test Mode (2026)**: Complete full test session flow at `/new-toefl/full-test`. Sequential sections (Reading → Listening → Speaking → Writing) with `?fullTest=true&attemptId=xxx` URL params. Each section hides feedback/answer panels in exam mode and redirects back to the controller on completion. The controller tracks state via localStorage, generates a unique attemptId per session, and auto-advances to the next section. Completed session data is saved for the report page at `/new-toefl/full-test/report`. Admin Writing management page at `/admin/new-toefl-writing`.
- **GRE Tests**: Full implementation for Analytical Writing, Verbal Reasoning, and Quantitative Reasoning with modern interfaces and AI feedback.
- **Analytics Dashboard (Task #49)**: 완전 재구축된 어드민 애널리틱스 `/admin-analytics`. 4탭 구조 (Overview/Users/AI & Tests/Revenue), Recharts 기반 차트. `analytics_events` DB 테이블 + `POST /api/analytics/track` (봇 필터링) + `GET /api/admin/analytics/events/summary` + `GET /api/admin/analytics/events/trend` 엔드포인트. 클라이언트 `client/src/lib/analytics.ts`에서 sessionId 관리 + `trackEvent()`. `AnalyticsTracker` 컴포넌트가 App.tsx에서 session_start + page_view 자동 수집. Users탭/AI탭은 `/api/admin/users-with-stats` 엔드포인트로 featureStats 조회.
- **User Feedback Survey System**: 6-step satisfaction survey (NPS, AI feedback rating, similarity rating, main feature, improvements, free text). Triggered automatically after 3+ AI feedbacks via localStorage counter (`inrise_ai_feedback_count`). Dismissable for 7 days or permanently. Completing the survey awards 50 credits. Survey banner also shown in dashboard. Admin analytics shows survey stats (NPS score, ratings, comments). API: `GET /api/survey/active`, `POST /api/survey/respond`, `GET /api/admin/survey-stats`. DB tables: `surveys`, `survey_responses`.
- **AI-Powered Features**:
    - **Real AI Test Generation**: Uses OpenAI GPT-5.4 to create authentic, new test questions with permanent data persistence.
    - **Admin-Approval System**: All AI-generated content requires administrator approval before becoming visible to users.
    - **Comprehensive Question Generation**: AI auto-generates questions for all test sections with customizable difficulty and topics.
    - **Image-Based Question Creation**: OCR capabilities for generating contextual questions from uploaded images.
    - **Multi-Language AI Feedback**: Dynamically localizes explanations and feedback in Korean, Japanese, English, and Thai.
    - **OpenAI TTS Integration**: All new audio generation uses OpenAI TTS exclusively (tts-1-hd model) with optimized voice mapping (conversation→nova/onyx male-female pair, lecture→nova, choose-response→onyx, announcement→nova) at 1.0 speed. Nova is a bright, warm female voice; Onyx is a clear, deep male voice — chosen for cheerful tone and strong gender distinction. Conversation dialogues always feature one male (onyx) and one female (nova) voice with smart gender detection. Audio is cached to eliminate per-playback costs. Existing cached ElevenLabs audio files remain playable.
- **Test Result & History Pages (Task #62)**: `/test/result/:attemptId` 다크 네이비 결과 페이지 (요약 카드, 섹션별 막대그래프, 문항별 정오답 리스트+펼치기 해설, AI 종합 분석 CTA). `/history` 히스토리 페이지 (완료 테스트 목록, 통계 카드, 섹션 아이콘+색상). `GET /api/attempts/:attemptId` 조인 엔드포인트 (인증+소유권 검증, 미완료 시 정답/해설 마스킹). 마이페이지 "완료 테스트" 카드 클릭 시 `/history`로 이동. CSS 변수 기반(`--tr-*`, `--th-*`) 라이트모드 호환 구조.
- **Performance Tracking**: Detailed scoring, time tracking, and progress analytics.
- **Student Dashboard**: Comprehensive view of test history and performance metrics.
- **Authentication**: Enhanced security with rate limiting, Zod validation, standardized error codes, and PostgreSQL-backed session management compatible with HTTPS environments.
- **Tier-Based Access Control**: Enforced on both frontend and backend. guest: no AI feedback; light: AI feedback (Speaking/Writing/Reading/Listening); pro+: all AI + Full Test access. `requireAIAccess` middleware on all AI feedback endpoints, `requireAdvancedAI` on full test. `SubscriptionGuard` component (dark glassmorphism, inline/compact/page variants) gates UI. `useSubscription` hook exposes `canGetAIFeedback`, `canDoFullTest`, `canUseGRE`, `canUseAdvancedFeatures`, `canUseCoaching`.
- **GRE Verbal Dark Luxury Purple 리디자인 (Task #55)**: `gv-*` CSS class system 적용. 인트로/결과/로딩/테스트선택/메인시험 5개 뷰 전부 딥 퍼플(#0A0714)+아멘서(#7C3AED) 팔레트로 교체. shadcn Card/Button/RadioGroup/RadioGroupItem/Label/Progress/Badge 완전 제거. 커스텀 `gv-choice`(라디오/체크박스 교체), `gv-navigator`(문항 이동), `gv-blank-group`(TC 빈칸), `gv-passage-panel`/`gv-question-panel`(RC/SE 스플릿), `gv-ai-card`(AI 해설), `gv-btn-primary`/`gv-btn-secondary`/`gv-btn-submit` 버튼, `gv-timer`/`gv-progress-track`/`gv-progress-fill`/`gv-separator` 유틸리티. CSS 시스템 패턴: Reading(사이언)/Listening(그린)/Speaking(앰버)/Writing(바이올렛)/Verbal(퍼플).

## System Design Choices
- **Single Database Architecture**: Preview and Production environments share the same PostgreSQL database, ensuring real-time data availability and zero data loss on republish.
- **Admin-Approval Content System**: Guarantees content quality and user protection by making all AI-generated content inactive by default, requiring admin approval.
- **Environment-Aware Cookie Configuration**: Dynamically adjusts cookie settings for secure operation in both development (HTTP) and production (HTTPS) environments.

# External Dependencies

- **OpenAI GPT-5.4**: AI question generation, image analysis, text extraction, speech synthesis, and personalized study plan generation.
- **OpenAI TTS (tts-1-hd)**: Primary text-to-speech service for all new audio generation. ElevenLabs module retained for backward compatibility only.
- **PostgreSQL (via Neon Database)**: Database hosting.
- **Vercel/Replit**: Deployment platform.
- **Unsplash**: Art images.
- **Google Fonts**: Typography.