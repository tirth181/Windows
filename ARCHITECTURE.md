# AetherWMS — Architecture

AetherWMS is a multi-tenant SaaS WMS for 3PL providers. This document describes
the current architecture and the enterprise roadmap. It is intentionally
pragmatic: the codebase is a working vertical slice that demonstrates the core
pillars end-to-end, designed so the remaining modules slot in cleanly.

## 1. System shape

```
apps/web  (Next.js 14, React, Tailwind)  ──►  apps/api (Express + Prisma)  ──►  DB
   client-side session (JWT)                    tenant-scoped REST API           SQLite (dev)
   proxies /api/* to the backend                RBAC + audit + AI                PostgreSQL (prod)
```

- The web app calls the API **same-origin**; Next.js `rewrites` proxy `/api/*` and
  `/health` to the backend so only one port needs to be exposed.
- The backend is a stateless REST API — horizontally scalable behind a load
  balancer. All state lives in the database (and object storage for files in prod).

## 2. Multi-tenancy & isolation

- Every business table carries a `tenantId`. The `authenticate` middleware loads
  the tenant from the JWT and every query is filtered by `tenantId` — a company
  can never read another company's data.
- **Warehouse-level (data) scoping**: users can be restricted to specific
  warehouses via `WarehouseAccess`; an empty set means all warehouses in the tenant.
- Each tenant has a per-tenant `encryptionKey` (envelope-key pattern). In
  production this is wrapped by a KMS/HSM master key; field-level encryption can
  then be applied to sensitive columns.
- **Production hardening:** enable PostgreSQL **Row-Level Security** so isolation
  is enforced at the database layer in addition to the application layer
  (defense in depth).

## 3. Security

- **AuthN:** email+password (bcrypt), JWT sessions, TOTP MFA enrollment
  (`otplib`), failed-login counting + lockout, and login/IP event logging.
- **AuthZ (RBAC):** module:function permission keys (`src/rbac/permissions.ts`)
  bundled into roles. Enforced by `requirePermission` on every route and mirrored
  in the UI (nav + controls hide when unauthorized). Sensitive fields (customer
  pricing) are stripped from responses unless permitted.
- **Auditing:** `AuditLog` records who/when/what/before/after + IP + user agent
  for every mutation, including AI actions. `LoginEvent` powers security monitoring.
- **Identity roadmap:** OIDC / OAuth2 / SAML SSO and **Microsoft Entra ID** via a
  pluggable identity provider layer in front of the existing session issuer;
  SCIM for user provisioning.

## 4. Domain model (current)

Tenant, User, Role, Warehouse, WarehouseAccess, Customer (with rate card),
Location, InventoryItem (weight-based + partial), InboundReceipt/ReceiptLine,
OutboundOrder/OrderLine, IntegrationConnection/FieldMapping, ApiKey, Attachment,
AuditLog, LoginEvent. See `apps/api/prisma/schema.prisma`.

Inventory supports **weight-based** stock (`receivedQty` vs `remainingQty`) and
derives operational status (`available / partial / empty / reserved / damaged /
blocked / quality_hold`) so partial and empty lots are surfaced immediately.

## 5. Integration platform

- No-code **connection builder**: REST / SOAP / GraphQL / webhook / database /
  file / EDI connection types, per-connection **field mapping**
  (e.g. SAP `MATNR → materialCode`, `LABST → remainingQty`), and a sync schedule
  (manual / realtime / 5-min / hourly / daily).
- **API keys** with scopes + rate limits let a client's own systems connect securely.
- The connector runtime (actually executing DB pulls / API calls / EDI parsing)
  is stubbed with a simulated sync; production plugs in per-type connector drivers
  and a job scheduler (e.g. BullMQ/Redis).

## 6. AI Operations Assistant

- **Ask · See · Act**, always within the caller's permissions. Flow:
  1. `classify()` turns natural language into `{intent, entities}` — using the
     built-in **rules engine** (synonyms, weighted keywords, entity extraction) or,
     when `OPENAI_API_KEY` is set, an **LLM classifier** (`classifyWithLLM`).
  2. A permission-gated **executor** runs the intent against live tenant data.
     Permission checks are **always server-side**, so the LLM can only choose an
     intent — it can never widen access.
  3. Read answers include a **reasoning trace**; write actions (e.g. move a pallet)
     are returned as a **proposed action requiring explicit human approval**, then
     executed via the same permission checks and written to the audit trail.
- This mirrors best-in-class agentic WMS assistants: live data (not stale
  snapshots), permission/RBAC guardrails, human-in-the-loop confirmation for
  mutations, and a full audit trail. [1][2][3]

## 7. Reliability & scaling (target)

- Stateless API + managed PostgreSQL (primary/replica) + Redis cache +
  Elasticsearch for search/analytics.
- Containerized (Docker) on Kubernetes with HPA; blue/green deploys; IaC.
- Automated backups + PITR; multi-AZ for HA; targets 99.9% uptime.

## 8. Enterprise roadmap (informed by market best practices)

Prioritized from current 3PL WMS market analysis. Items marked ✅ are implemented
in this slice.

- ✅ **Multi-tenant inventory partitioning** — strict per-client data separation. [4][5]
- ✅ **Per-client rate cards + activity-based billing** — charges accrue from real
  warehouse events (storage/receiving/pick) into invoice-ready records. This is a
  non-negotiable 3PL feature. [4][5][6]
- ✅ **Document management** — attach POs/BOLs/packing lists to orders & receipts.
- ✅ **Permission-aware natural-language AI** with approvals + audit. [1][2][3]
- **Client-facing portal** — white-label self-service so each brand sees only its
  own inventory, orders, and invoices (reduces inbound inquiries). [4][5][6]
- **Accounting sync** — two-way QuickBooks / NetSuite invoice sync. [4][6]
- **Carrier & marketplace integrations** — rate shopping, labels, tracking;
  Shopify/Amazon order ingestion. [6]
- **Per-client SLA scorecards** — automated service-level tracking & dispute data. [4][6]
- **Mobile & RF scanning** — barcode/QR on Android/Zebra for receive/putaway/pick. [4]
- **Lot / LPN & serial tracking**, putaway & pick-path optimization.
- **Predictive & proactive AI** — anomaly detection, labor forecasting, and 24/7
  KPI monitoring with daily briefings. [7][2]
- **Future modules** — TMS, procurement, billing engine, warehouse digital twin,
  autonomous workflows.

### Sources
1. Clarus WMS — AI Assistant ("Ask. See. Act.", GraphQL reads + MCP actions, RBAC, audit): https://claruswms.co.uk/features/how-ai-takes-the-effort-out-of-warehouse-decision-making/
2. SAP EWM + Joule (natural-language + transactional actions in EWM): https://quinaptis.com/blog/can-ai-replace-wms-sap-ewm/
3. Extensiv AI (conversational assistant over live WMS data, any language): https://www.extensiv.com/product-extensiv-ai
4. PackemWMS — 3PL WMS features that matter (multi-client billing, portals, lot tracking): https://packemwms.com/3pl-wms-features-what-matters/
5. Trenvar — multi-tenant WMS (workspace-scoped isolation, per-client rate cards): https://www.trenvar.com/multi-tenant-wms
6. Obol — WMS for 3PL operators guide (rate cards, activity-based billing, carrier/accounting integrations): https://withobol.com/blog/wms-for-3pl-operators-guide
7. Ticks / LogisticsWMS — proactive agentic monitoring + human confirmation: https://logistics-wms.com/en/product/ticks-ai
