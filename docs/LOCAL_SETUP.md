# Local Setup

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- A local `.env`

## First Boot

1. Install dependencies.

```bash
npm ci
```

2. Restore the local database from the backup SQL.

```bash
npm run db:restore:local
```

If you want a different database name or dump path:

```bash
./scripts/restore-local-db.sh inrise ../_inrise-backup-sql/database_backup.sql
```

3. Create `.env` from `.env.example`.

Minimum local values:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=5000
BASE_URL=http://localhost:5000
DATABASE_URL=postgresql://YOUR_LOCAL_USER@localhost:5432/inrise
SESSION_SECRET=replace-with-a-random-secret
OPENAI_API_KEY=local-dev-placeholder-key
```

`OPENAI_API_KEY` must exist because the server imports AI modules on startup. A placeholder value is enough for local non-AI smoke checks, but real AI routes require a valid key.

Admin bootstrap behavior:

- In development, if `ADMIN_BOOTSTRAP_PASSWORD` is unset, the app generates a strong temporary admin password and logs it once at startup.
- In production, if `ADMIN_BOOTSTRAP_PASSWORD` is unset, the app does not create a bootstrap admin automatically.

Recommended local values:

```env
ADMIN_BOOTSTRAP_EMAIL=admin@inrise.com
ADMIN_BOOTSTRAP_PASSWORD=replace-with-a-strong-local-password
```

## Optional Object Storage

You now have two supported remote storage paths:

### Google Cloud Storage

```env
PRIVATE_OBJECT_DIR=/your-bucket/private
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json
```

### S3-compatible storage

This works with Cloudflare R2, Hetzner Object Storage, Backblaze B2 S3, and similar providers.

```env
S3_BUCKET=your-bucket
S3_REGION=auto
S3_ENDPOINT=https://<account-or-endpoint>
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PREFIX=
S3_FORCE_PATH_STYLE=false
```

4. Start the app.

```bash
npm run dev
```

## Verification

Build the production bundle:

```bash
npm run build
```

Run smoke QA without opening a socket:

```bash
npm run qa:smoke
```

This checks:

- auth session status
- public test list endpoints
- GRE verbal and quantitative list endpoints
- NEW TOEFL full test list endpoint
- study plans and reviews
- authenticated user endpoints
- NEW TOEFL feedback request creation
- admin dashboard and analytics summary
- admin NEW TOEFL reading read/write/delete flow
- admin pending feedback and reject flow
- payment fail flow with ownership validation
- database row counts for users, AI tests, and subscriptions

## Current Notes

- The app now loads `.env` through `server/bootstrap.ts`.
- Database access now uses `pg` + `drizzle-orm/node-postgres`, which works for local PostgreSQL and managed PostgreSQL alike.
- In constrained shells, binding a local TCP port may fail even when route-level QA passes. That is an environment limitation, not necessarily an app failure.
