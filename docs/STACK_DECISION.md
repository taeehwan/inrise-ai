# Stack Decision

## Chosen Default

- App: Render Web Service
- Database: Neon Postgres
- Object Storage: Cloudflare R2
- DNS / CDN / edge: Cloudflare
- Monitoring: Sentry

## Why This Wins

- Lower ops burden than a self-managed VPS
- Cheaper and simpler storage than a Google Cloud setup
- Better early-stage cost control than a fully usage-driven all-in-one stack
- Clean migration path if traffic grows

## Practical Baseline Cost

As of 2026-04-21, based on official pricing pages:

- Render Starter web service: `Starter $7/month`
- Neon Launch: `Typical spend $15/month` for intermittent load, 1 GB
- Cloudflare R2: `10 GB free tier`, then `Standard storage $0.015 / GB-month`, `egress free`
- Cloudflare DNS proxy: free entry point for DNS/CDN/basic edge

That makes the realistic baseline roughly:

- about `$22/month + domain + OpenAI usage + payment gateway fees`

## When To Choose Another Stack

### Choose Railway if:

- you want the fastest setup
- you are okay with usage-based billing

Notes:

- Railway Hobby is `"$5 minimum usage"` and includes `$5 of monthly usage credits`
- Railway object storage is `"$0.015 per GB-month"` with `free egress`

### Choose Hetzner if:

- lowest raw hosting cost matters most
- you can manage Linux, backups, monitoring, and incident response yourself

Notes:

- Hetzner Cloud is the lowest-cost serious option among the candidates considered here
- it is not the best default for this project unless you want to own operations directly

## Migration Path

### Phase 1

- Render Starter
- Neon Launch
- Cloudflare R2

### Phase 2

- Render Standard or Pro
- Neon larger compute or Scale
- R2 stays as storage
- add Sentry alerts and uptime checks

### Phase 3

- split background or AI-heavy jobs into separate services
- add Redis or queue only if real workload justifies it
- consider moving to a VPS or Kubernetes only after traffic or cost data proves it is worth the complexity
