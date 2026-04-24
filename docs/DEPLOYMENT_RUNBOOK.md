# Deployment Runbook

## Recommended Production Shape

- One Node.js web service for the Express API and the built Vite frontend
- One managed PostgreSQL instance
- One object storage bucket for audio and uploads
- One error/uptime monitoring layer

## Recommended Default Stack

- App runtime: Render web service
- Database: Neon PostgreSQL
- Object storage: Cloudflare R2
- DNS / CDN / edge protection: Cloudflare
- Error monitoring: Sentry

## Why This Is The Default

- It avoids the Google Cloud setup and billing surface area that is often overkill for an early-stage product.
- Render is operationally simpler than a self-managed VPS.
- Neon gives easy Postgres branching, backups, and restore flows.
- Cloudflare R2 is usually the cheapest simple object storage choice because it supports an S3-compatible API and avoids typical egress pain.
- The codebase now supports both Google Cloud Storage and S3-compatible object storage, so R2 or Hetzner Object Storage can be used without keeping Google in the stack.

## Cost-Oriented Options

### Option A: Balanced Default

- Render for app
- Neon for database
- Cloudflare R2 for storage

Use this when:

- you want low ops burden
- you need a clean path from MVP to production
- you want predictable enough billing without babysitting servers

### Option B: Cheapest If You Accept More Ops

- Hetzner Cloud VM
- PostgreSQL on the same VM at first, then move to managed Postgres later
- Cloudflare R2 or Hetzner Object Storage
- Coolify or Docker Compose for deployment

Use this when:

- monthly budget is the top priority
- you are okay handling OS patching, backups, firewall rules, and incidents yourself

Tradeoff:

- this is cheaper on paper
- total engineering time and operational risk are higher

### Option C: All-in-One Simplicity

- Railway for app and database
- Cloudflare R2 for storage

Use this when:

- you want the fastest initial deployment
- traffic is still small and uneven

Tradeoff:

- usage-based pricing is convenient early but can be less predictable than the default stack

## Why This Shape Fits This Codebase

- The repository is already a single deployable Node app with the frontend built into `dist/public`.
- The server expects PostgreSQL and session persistence.
- Audio and private files now support both Google Cloud Storage and S3-compatible object storage.
- The new `pg` database layer works against both local PostgreSQL and managed PostgreSQL.

## Production Environment Variables

Required:

- `NODE_ENV=production`
- `PORT`
- `BASE_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `OPENAI_API_KEY`

Required for first-time admin bootstrap in production:

- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`

Important:

- The application no longer ships with a hardcoded default admin password hash.
- If `ADMIN_BOOTSTRAP_PASSWORD` is unset in production, no bootstrap admin is auto-created.
- After the first successful admin bootstrap, you should rotate credentials through the real user account flow and then remove or rotate the bootstrap password.

Recommended for storage:

- `PRIVATE_OBJECT_DIR`
- `GOOGLE_APPLICATION_CREDENTIALS`

Or for S3-compatible storage:

- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PREFIX`
- `S3_FORCE_PATH_STYLE`

Optional depending on enabled features:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `KAKAO_CLIENT_ID`
- `TOSS_PAYMENTS_CLIENT_KEY`
- `TOSS_PAYMENTS_SECRET_KEY`
- `VITE_TOSS_CLIENT_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

## Deployment Steps

1. Provision managed PostgreSQL.
2. Restore the latest SQL backup into the managed database.
3. Provision object storage and upload service credentials.
4. Set production environment variables.
5. Build the app with `npm run build`.
6. Start the app with `npm run start`.
7. Run the smoke QA flow against the deployed environment.
8. Enable monitoring and alerts before opening traffic.

## Release Checklist

- `npm ci`
- `npm run build`
- `npm run qa:smoke`
- confirm `ADMIN_BOOTSTRAP_PASSWORD` is set for the initial production bootstrap, or confirm an admin already exists
- verify login and session cookie behavior on the real domain
- verify one payment sandbox flow
- verify one AI feedback flow with a real `OPENAI_API_KEY`
- verify upload and audio generation against object storage
- verify admin login and admin list endpoints
- verify admin write flow for NEW TOEFL reading
- verify admin pending feedback queue access

## Hardening Priorities

1. Break `server/routes.ts` into route modules by domain.
2. Break `server/storage.ts` into repository modules by table group.
3. Make `npm run check` a required CI gate after remaining legacy typing issues are cleaned up.
4. Add Playwright end-to-end coverage for login, purchase, TOEFL, GRE, and admin flows.
5. Upgrade vulnerable packages and pin the final deployment image.
