# LogiForge — Security Model

## Controls

| Control | Implementation |
|---------|----------------|
| HTTPS | TLS termination at ingress / App Gateway; HSTS enabled outside Development |
| Encryption in transit | TLS 1.2+ |
| Encryption at rest | Azure Disk/Postgres TDE + Blob encryption |
| AuthN | Entra ID OIDC + local Identity + MFA-ready |
| AuthZ | Fine-grained RBAC + warehouse scope |
| Tenant isolation | CompanyId filters + claim binding |
| Audit | Immutable audit_logs + login history |
| Rate limiting | General API (120/min) · Auth endpoints (10/min) |
| Account lockout | 5 failed logins → 15 minute lockout |
| Input validation | FluentValidation + parameterized SQL |
| File uploads | MIME allow-list, size limits, virus scan hook |
| Secrets | Key Vault / env vars; never committed to source |
| Security headers | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| OWASP Top 10 | Centralized exception handling, XSS-safe React, SQLi prevention via EF |
| API docs | Swagger disabled unless Development or `Swagger:Enabled=true` |
| Demo bypass | Frontend offline login only when `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` |
| Access request gate | Marketing form required before `/login` when `NEXT_PUBLIC_REQUIRE_ACCESS_REQUEST` is not `false`; submissions emailed to `DEMO_REQUEST_TO` |

## Password Policy (Local)

- Min 12 chars, upper/lower/digit/symbol
- History of last 5
- Lockout after 5 failures / 15 minutes
- Optional forced rotation (90 days)

## API Keys

- Stored as SHA-256 hashes
- Scoped permissions
- Rotatable; shown once on create

## Production publish checklist

1. Set a strong `Jwt__Key` (32+ characters). Startup **fails** if the key is missing or still contains `ChangeMe`.
2. Set `ConnectionStrings__DefaultConnection` and Redis from Key Vault / secrets — leave `appsettings.json` blanks.
3. Configure `Cors__Origins__0` (and additional indices) to your exact public web origin(s).
4. Keep `Swagger__Enabled=false` (default).
5. Do **not** set `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` on customer-facing publishes.
6. Terminate TLS at the edge; enable the ingress TLS secret / cert-manager issuer.
7. Confirm security response headers on `/` and `/api/v1/health/live`.
8. Rotate demo seed passwords before any shared environment goes live.

## Frontend hardening

Next.js emits:

- `Strict-Transport-Security` (production)
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo disabled)
- `poweredByHeader: false`
