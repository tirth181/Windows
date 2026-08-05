# LogiForge — System Architecture

## Product Overview

**LogiForge** is a multi-tenant SaaS Warehouse Management Platform for 3PL operators. Each tenant (company) is fully isolated at the database row level and API layer. The platform serves warehouse floor workers (tablet/scanner-first UX), supervisors, administrators, and executives.

## Architectural Style

- **Clean Architecture** with clear dependency direction: Domain ← Application ← Infrastructure / Api
- **CQRS** via MediatR for commands and queries
- **Repository + Unit of Work** for persistence boundaries
- **Multi-tenant row isolation** using `CompanyId` on every tenant-scoped entity, enforced by EF Core global query filters and API middleware
- **Event-driven side effects** for email, audit, dashboard refresh (domain events → handlers)

## High-Level Diagram

```
┌─────────────┐     HTTPS/JWT      ┌──────────────────┐
│  Next.js UI │ ─────────────────► │  LogiForge.Api   │
│  (Azure SWA │                     │  ASP.NET Core 8  │
│   / AKS)    │ ◄──── SignalR ──── │                  │
└─────────────┘                     └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
             ┌────────────┐           ┌────────────┐           ┌────────────┐
             │ PostgreSQL │           │   Redis    │           │ Azure Blob │
             │ (primary)  │           │ (cache +   │           │ (reports)  │
             └────────────┘           │  sessions) │           └────────────┘
                                      └────────────┘
                    ▼                        ▼
             ┌────────────┐           ┌────────────┐
             │ Azure      │           │ Azure      │
             │ OpenAI+RAG │           │ Entra ID   │
             └────────────┘           └────────────┘
```

## Multi-Tenancy Strategy

| Layer | Mechanism |
|-------|-----------|
| Database | `company_id` NOT NULL on tenant tables; composite indexes; optional RLS policies |
| EF Core | Global query filter `e => e.CompanyId == _tenant.CompanyId` |
| API | `TenantMiddleware` resolves tenant from JWT claim `company_id` |
| Cache | Key prefix `tenant:{companyId}:*` |
| Blob | Container path `{companyId}/...` |
| AI | Retrieval scoped by company + user permissions |

**Hard rule:** No cross-tenant joins or queries. Platform super-admins use an explicit elevated context that bypasses filters only for company administration.

## Authentication

- **Primary:** Microsoft Entra ID (OIDC / OAuth 2.0)
- **Secondary:** Local accounts (ASP.NET Identity) with password policies
- **MFA:** Entra Conditional Access + TOTP for local accounts
- **SSO:** SAML/OIDC federation per tenant (Enterprise plan)
- Tokens: JWT access (short-lived) + refresh tokens in Redis/HttpOnly cookies

## Authorization (RBAC)

Permission keys follow: `{module}.{action}` e.g. `inbound.receive`, `inventory.adjust`.

Scopes:
1. **Company** — tenant-wide
2. **Warehouse** — optional warehouse assignment on role membership
3. **Module / Screen / Action** — permission catalog
4. **Data** — customer/warehouse filters on queries

Menus and API endpoints both check the same permission service.

## Backend Layers

### Domain
Entities, value objects, enums, domain events, repository interfaces. No infrastructure dependencies.

### Application
Commands/Queries (MediatR), DTOs, FluentValidation, authorization behaviors, mapping.

### Infrastructure
EF Core (`LogiForgeDbContext`), Redis, Azure Blob, SMTP/Graph email, Entra integration, OpenAI RAG, Excel generation (ClosedXML).

### Api
Controllers, middleware (tenant, exception, rate limit), Swagger/OpenAPI, health checks, SignalR hubs.

## Frontend Architecture

- Next.js 15 App Router + TypeScript + Tailwind
- AG Grid for transactional grids (inbound/outbound/inventory)
- Feature folders colocating UI + hooks
- Server components for shells; client components for interactive grids
- Permission-aware navigation from `/me/permissions`

## Cross-Cutting Concerns

- **Logging:** Serilog → structured JSON → Application Insights / Seq
- **Audit:** Immutable `audit_logs` for every mutating business action
- **Validation:** FluentValidation + domain invariants
- **Idempotency:** Optional `Idempotency-Key` header on receive/ship
- **Rate limiting:** ASP.NET rate limiter per user/tenant/API key
- **Health:** `/health/live`, `/health/ready` (DB + Redis)

## Deployment

- Containers on AKS (or App Service + Container Apps)
- GitHub Actions CI (build/test) + CD (deploy staging/prod)
- Secrets via Azure Key Vault
- Migrations applied as init Job or startup with lock
