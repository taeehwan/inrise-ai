# QA Runbook

## Automated QA

Run:

```bash
npm run qa:smoke
```

Real-provider mode:

```bash
QA_REAL_PROVIDERS=1 npm run qa:smoke
```

This mode only switches to real external calls when all of the following are configured with non-placeholder values:

- `OPENAI_API_KEY`
- `TOSS_PAYMENTS_SECRET_KEY`
- `TOSS_PAYMENTS_CLIENT_KEY`
- `BASE_URL`

If any of them are missing, smoke automatically falls back to mock mode.

Current automated coverage:

- user registration
- session creation
- authenticated `GET /api/auth/me`
- unauthenticated `401` guard checks for admin, AI, and payment endpoints
- unauthenticated `401` guard checks for object upload signed URL issuance
- unauthenticated `401` guard checks for admin-only test creation endpoints
- unauthenticated `401` guard checks for admin-only PATCH/PUT/DELETE mutation endpoints
- authenticated non-admin `403` guard checks for admin-only AI and dashboard endpoints
- authenticated non-admin `403` guard checks for admin-only test creation endpoints
- authenticated non-admin `403` guard checks for admin-only PATCH/PUT/DELETE mutation endpoints
- authenticated non-owner `403` guard checks for payment `confirm/fail`
- authenticated user endpoints:
  - `/api/user/credits`
  - `/api/user/test-attempts`
  - `/api/user/saved-explanations`
  - `/api/performance-summary`
  - `/api/user/ai-tests`
  - `/api/test-sets`
- NEW TOEFL feedback request creation
- NEW TOEFL feedback request listing
- admin promotion inside smoke flow
- admin dashboard
- admin analytics events summary
- admin NEW TOEFL reading list
- admin pending feedback list
- admin feedback approve flow
- approved feedback listing after approval
- admin NEW TOEFL reading create/update/delete
- admin feedback reject flow
- payment confirm success flow and subscription persistence
- AI generate-questions success flow
- TTS generation success flow
- writing listening-audio success flow
- speech-to-text success flow
- enhanced speech-to-text success flow
- speaking feedback success flow
- speaking attempt upload success flow
- payment fail flow with authenticated ownership check
- payment confirm ownership guard
- logout
- unauthenticated `GET /api/auth/me`
- public test list endpoints
- GRE verbal and quantitative list endpoints
- NEW TOEFL full test list endpoint
- study plans
- reviews
- `/api/tests/:id`
- `/api/tests/:id/questions`
- row-count sanity checks for users, AI tests, and subscriptions

Representative authorization guard matrix:

- unauthenticated `GET /api/admin/dashboard` -> `401`
- unauthenticated `POST /api/ai/generate-questions` -> `401`
- unauthenticated `POST /api/payments/fail` -> `401`
- unauthenticated `POST /api/objects/upload` -> `401`
- unauthenticated `POST /api/new-toefl/full-tests` -> `401`
- unauthenticated `POST /api/speaking-tests` -> `401`
- unauthenticated `POST /api/writing-tests` -> `401`
- unauthenticated `PATCH /api/ai/tests/:id` -> `401`
- unauthenticated `DELETE /api/ai/tests/:id` -> `401`
- unauthenticated `PATCH /api/admin/tests/:id/restore` -> `401`
- unauthenticated `PATCH /api/test-sets/:id` -> `401`
- unauthenticated `DELETE /api/admin/test-sets/:id` -> `401`
- unauthenticated `PUT /api/admin/speaking-topics/:id` -> `401`
- unauthenticated `DELETE /api/admin/speaking-topics/:id` -> `401`
- non-admin `GET /api/admin/dashboard` -> `403`
- non-admin `POST /api/ai/generate-questions` -> `403`
- non-admin `POST /api/new-toefl/full-tests` -> `403`
- non-admin `POST /api/speaking-tests` -> `403`
- non-admin `POST /api/writing-tests` -> `403`
- non-admin `PATCH /api/ai/tests/:id` -> `403`
- non-admin `DELETE /api/ai/tests/:id` -> `403`
- non-admin `PATCH /api/admin/tests/:id/restore` -> `403`
- non-admin `PATCH /api/test-sets/:id` -> `403`
- non-admin `DELETE /api/admin/test-sets/:id` -> `403`
- non-admin `PUT /api/admin/speaking-topics/:id` -> `403`
- non-admin `DELETE /api/admin/speaking-topics/:id` -> `403`
- other authenticated user `POST /api/payments/fail` -> `403`
- other authenticated user `POST /api/payments/confirm` -> `403`

## Manual Browser QA

Use this before production release with a real browser and a real `OPENAI_API_KEY`.

### Authentication

- sign up with a new email
- log out
- log back in
- refresh after login and confirm session persistence

### Student Paths

- open `/tests` and confirm lists render
- open one GRE verbal test
- open one GRE quantitative test
- open one TOEFL flow
- confirm history and results pages render after a saved attempt

### Admin Paths

- log in as admin
- open `/admin`
- confirm users, tests, and analytics tabs load
- upload one image through the object upload flow

### AI Paths

- request one AI explanation
- request one speaking or writing feedback flow
- generate one audio asset and confirm it is replayable

### Payment Paths

- run one sandbox payment flow for the active gateway
- confirm success and failure callbacks behave correctly

## Important Note

In this shell environment, binding a local TCP port is restricted, so full browser automation could not be executed here. Route-level and session-level QA were executed directly in-process instead.
