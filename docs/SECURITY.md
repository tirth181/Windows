# LogiForge — Security Model

## Controls

| Control | Implementation |
|---------|----------------|
| HTTPS | TLS termination at ingress / App Gateway |
| Encryption in transit | TLS 1.2+ |
| Encryption at rest | Azure Disk/Postgres TDE + Blob encryption |
| AuthN | Entra ID OIDC + local Identity + MFA |
| AuthZ | Fine-grained RBAC + warehouse scope |
| Tenant isolation | CompanyId filters + claim binding |
| Audit | Immutable audit_logs |
| Rate limiting | Per IP / user / API key |
| Input validation | FluentValidation + parameterized SQL |
| File uploads | MIME allow-list, size limits, virus scan hook |
| Secrets | Key Vault; never in source |
| OWASP Top 10 | Centralized exception handling, CSRF for cookie auth, XSS-safe React, SQLi prevention via EF |

## Password Policy (Local)

- Min 12 chars, upper/lower/digit/symbol
- History of last 5
- Lockout after 5 failures / 15 minutes
- Optional forced rotation (90 days)

## API Keys

- Stored as SHA-256 hashes
- Scoped permissions
- Rotatable; shown once on create
