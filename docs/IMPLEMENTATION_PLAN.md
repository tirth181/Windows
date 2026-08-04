# LogiForge — Implementation Plan

## Phase 1 — Foundation (Auth, Tenancy, RBAC)
- [x] Solution structure (Clean Architecture)
- [x] PostgreSQL schema + EF Core models
- [x] Tenant middleware + global query filters
- [x] Local auth + JWT + Entra ID hooks
- [x] User/Role/Permission APIs
- [x] Company & warehouse administration
- [x] Audit + login history scaffolding

## Phase 2 — Core WMS
- [x] Inbound receiving (multi-material loads)
- [x] Inventory ledger + statuses
- [x] Outbound shipping with inventory deduction
- [x] Dashboard summary API + UI
- [x] Customers & 3PL company administration (add/modify/remove)

## Phase 3 — Reports & Communications
- [x] Report runners (inbound/outbound/inventory/partial/KPI)
- [x] Excel export (ClosedXML)
- [x] Email configuration + outbox
- [x] Scheduled report stubs

## Phase 4 — AI & Integrations
- [x] Permission-aware AI chat endpoint (Azure OpenAI ready)
- [x] Integration Center models + mapping API
- [x] API keys + webhook stubs

## Phase 5 — Hardening & Ops
- [x] Docker Compose (API, Web, Postgres, Redis)
- [x] Kubernetes manifests
- [x] GitHub Actions CI
- [x] Unit/integration test scaffolding
- [x] Rate limiting, health checks, OpenAPI
- [x] Security documentation

## Delivery Order in This Repo

1. Architecture documentation (this `/docs` set)
2. Domain entities + permissions catalog
3. Application CQRS handlers for Phase 1–2
4. Infrastructure (EF, auth, redis, email, excel, AI)
5. API controllers + middleware
6. Next.js frontend with all modules
7. Infra + CI + tests
8. Seed data for demo tenant

## Definition of Done (enterprise bar)

- Tenant isolation enforced in DB filters and API
- Every mutating WMS action writes audit log
- OpenAPI published at `/swagger`
- Frontend menus respect permissions
- `docker compose up` boots API + web + postgres + redis
- CI builds backend + frontend and runs tests
