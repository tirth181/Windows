# AetherWMS — AI-powered 3PL Logistics Platform

AetherWMS is a multi-tenant SaaS warehouse management platform for third-party
logistics (3PL) providers that store and ship products for **many independent
client companies out of one warehouse operation**. It combines enterprise-grade
tenant isolation and RBAC with a **permission-aware, natural-language AI
assistant** and a **no-code integration platform**.

> This repository contains a working, runnable foundation (a vertical slice) of
> the platform. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design
> and the enterprise roadmap.

## What's implemented

- **Multi-tenant core** — every record is scoped to a tenant (3PL company); two
  seeded companies (`ABC Logistics`, `Globex 3PL`) prove data isolation.
- **Enterprise security** — JWT sessions, bcrypt passwords, TOTP MFA enrollment,
  failed-login lockout, and login/IP monitoring.
- **Granular RBAC** — module- and function-level permissions (e.g. `inventory:move`,
  `customers:pricing`) plus warehouse-level (data) scoping. Built-in roles:
  Administrator, Warehouse Manager, Warehouse Associate, Executive.
- **Inventory** — weight-based lots, batch/pallet/box, storage locations, and
  automatic **partial / empty** status with color-coded highlighting.
- **Inbound & Outbound** — receipts with putaway-to-stock, and order entry with
  pick/ship, delayed-order detection, and **document attachments** (PO/BOL/etc.).
- **Document management** — upload/list/download files against orders & receipts.
- **Activity-based billing** — per-client rate cards (storage / receiving / pick)
  rolled into invoice-style summaries.
- **No-code integrations** — connection builder with field mapping (e.g. SAP
  `MATNR → materialCode`) and scheduled sync.
- **API keys** — issue/revoke keys with scopes for customer system-to-system access.
- **Permission-aware AI assistant** — ask in plain English; it reads live data,
  refuses anything outside your permissions, shows a reasoning trace, and can
  perform actions **only with explicit approval**. Ships with a built-in NL rules
  engine and an **optional OpenAI adapter** (set `OPENAI_API_KEY`).
- **Immutable audit trail** — who / when / what / before / after for every change.

## Tech stack

- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind CSS (`apps/web`)
- **Backend:** Node.js + Express + TypeScript + Prisma (`apps/api`)
- **Database:** SQLite for local dev (zero-dependency); Prisma keeps it portable to
  PostgreSQL for production.

## Quick start

```bash
npm install                 # installs both workspaces; generates Prisma client
npm run db:setup --workspace apps/api   # apply migrations + seed demo data (first time)
npm run dev                 # runs API (:4000) and web (:3000) together
```

Open http://localhost:3000. The API dev server also auto-applies migrations and
seeds demo data on first boot, so `npm run dev` alone is usually enough.

### Demo accounts (password `Password123!`)

| Email | Role | Highlights |
|-------|------|-----------|
| `admin@abc.com` | Administrator | Full access |
| `manager@abc.com` | Warehouse Manager | Ops + AI actions |
| `john@abc.com` | Warehouse Associate | No pricing/billing/users; AI refuses pricing |
| `exec@abc.com` | Executive | Read-only + pricing + billing |
| `admin@globex.com` | Administrator (separate tenant) | Fully isolated company |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run API + web in development |
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm test` | Run API test suite (Vitest) |
| `npm run db:setup --workspace apps/api` | Migrate + seed |
| `npm run db:reset --workspace apps/api` | Drop, migrate, reseed |

See [`AGENTS.md`](./AGENTS.md) for environment/run notes and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full architecture and roadmap.
