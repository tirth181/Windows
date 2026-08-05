# LogiForge SaaS deployment

Self-serve signup, email auth, 14-day trials, and Stripe subscriptions.

## What ships

| Area | Behavior |
|------|----------|
| Signup | `POST /api/v1/auth/register` creates Trial company + admin + default warehouse/roles |
| Email verify | Optional (`App:RequireEmailVerification`). Links to `/verify-email?token=` |
| Password reset | `forgot-password` / `reset-password` (enumeration-safe) |
| Trial | `Company.TrialEndsAt`; after expiry status → `Suspended` |
| Gate | Suspended tenants can use `/auth/*` and `/billing/*`; other APIs return **402** |
| Stripe | Checkout Session + Customer Portal + webhook when keys are set |
| Demo login | Frontend offline fallback **off in production** unless `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=true` |

## Environment variables

### API (ASP.NET)

| Variable | Purpose |
|----------|---------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL |
| `Jwt__Key` | **Required in prod** — long random secret (≥32 chars) |
| `Cors__Origins__0` | Frontend origin, e.g. `https://app.example.com` |
| `App__PublicWebBaseUrl` | Frontend base URL for email links |
| `App__TrialDays` | Default `14` |
| `App__RequireEmailVerification` | `true` in production when SMTP is ready |
| `Smtp__Host` / `Port` / `Username` / `Password` / `FromEmail` | Real email delivery |
| `Stripe__SecretKey` | `sk_live_…` or `sk_test_…` |
| `Stripe__PublishableKey` | Optional (Checkout is server-redirect) |
| `Stripe__WebhookSecret` | `whsec_…` from Stripe Dashboard |
| `Stripe__PriceStarter` / `PriceGrowth` / `PriceScale` | Stripe Price IDs |

### Web (Next.js)

| Variable | Purpose |
|----------|---------|
| `API_ORIGIN` | Internal API URL for rewrites (e.g. `http://127.0.0.1:5080`) |
| `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK` | Set `false` in production |
| `PREVIEW_ACCESS_CODE` | Optional employee preview gate |
| `NODE_ENV` | `production` for `next start` |

## Stripe setup

1. Create Products/Prices in Stripe (Starter / Growth monthly).
2. Set price IDs on the API.
3. Add webhook endpoint: `https://<api-host>/api/v1/billing/webhook`
4. Subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Paste signing secret into `Stripe__WebhookSecret`

Without Stripe keys, trials still work; the Billing page shows plans as unavailable.

## SMTP

When `Smtp__Host` is empty, emails are **logged** and marked sent (dev). For production verification and password reset, configure SMTP (or swap the `EmailService` for Microsoft Graph / Resend later).

## Suggested production checklist

1. Strong `Jwt__Key`; never ship the compose default.
2. `App__RequireEmailVerification=true` + working SMTP.
3. `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false`.
4. HTTPS only; keep API off the public internet if possible (same-origin Next rewrite).
5. Stripe live keys + verified webhook.
6. Backups for PostgreSQL; plan EF migrations before the next schema wave (`EnsureCreated` + SQL patches are transitional).
7. Replace in-memory refresh tokens with a persistent store before multi-instance scale-out.

## Local trial without Stripe

```bash
# API
cd src/backend && dotnet run --project src/LogiForge.Api --urls http://localhost:5080

# Web
cd src/frontend && npm run dev
```

Open `/signup`, create a company (verification off in default `appsettings.json`), then use **Billing** to inspect trial status.

## One-command live deploy (this environment)

```bash
# Optional Stripe (creates Starter/Growth prices automatically)
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...   # after Dashboard webhook is created

bash scripts/deploy-live.sh
```

What it does:
- Generates a strong `Jwt__Key` under `.local-secrets/` (gitignored)
- Wires SMTP (Ethereal by default so the send path is real)
- Builds Next with `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false`
- Runs Release API on `127.0.0.1:5080` + Next on `127.0.0.1:3000`
- Publishes HTTPS via Cloudflare quick tunnel
- Sets `App__PublicWebBaseUrl` + CORS to that public URL
- Writes credentials to `/opt/cursor/artifacts/LIVE_CREDENTIALS.txt`

Provision Stripe catalog only:

```bash
export STRIPE_SECRET_KEY=sk_test_...
bash scripts/provision-stripe.sh
```

Then point Stripe webhook to `https://<your-host>/api/v1/billing/webhook`.
