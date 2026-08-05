# LogiForge — API Design

Base URL: `/api/v1`  
Auth: `Authorization: Bearer <jwt>`  
Tenant: claim `company_id` (required for tenant users)  
Content-Type: `application/json`  
Idempotency: `Idempotency-Key` on receive/ship

## Conventions

- Success: `200` / `201` / `204`
- Errors: RFC 7807 ProblemDetails `{ type, title, status, detail, errors }`
- Pagination: `?page=1&pageSize=50` → `{ items, page, pageSize, totalCount }`
- Filtering: query string; sorting: `?sort=field:asc`

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Self-serve signup (trial company + admin) |
| POST | `/auth/login` | Local login |
| POST | `/auth/verify-email` | Confirm email token |
| POST | `/auth/forgot-password` | Request reset email |
| POST | `/auth/reset-password` | Set new password with token |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Revoke refresh |
| GET | `/auth/entra/challenge` | Start Entra OIDC |
| GET | `/auth/entra/callback` | Entra callback |
| GET | `/auth/me` | Current user + permissions + warehouses |

## Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/status` | Trial/plan/Stripe status + catalog |
| POST | `/billing/checkout` | Create Stripe Checkout session |
| POST | `/billing/portal` | Create Stripe Customer Portal session |
| POST | `/billing/webhook` | Stripe webhooks (anonymous, signed) |

Suspended companies receive **402** on non-billing/auth APIs.

## Companies & Warehouses

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/companies` | platform.admin |
| GET/PUT | `/companies/{id}` | company.view / company.edit |
| GET/POST | `/warehouses` | warehouse.view / warehouse.create |
| PUT/DELETE | `/warehouses/{id}` | warehouse.edit / warehouse.delete |

## Users & RBAC

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/users` | users.view / users.create |
| GET/PUT | `/users/{id}` | users.view / users.edit |
| POST | `/users/{id}/roles` | users.assign_roles |
| GET | `/roles` | roles.view |
| POST/PUT | `/roles` | roles.manage |
| GET | `/permissions` | roles.view |

## Customers & 3PL Companies

| Method | Path | Permission |
|--------|------|------------|
| CRUD | `/customers` | customers.* |
| CRUD | `/locations` | locations.* |

## Inbound

| Method | Path | Permission |
|--------|------|------------|
| GET | `/inbound` | inbound.view |
| GET | `/inbound/{id}` | inbound.view |
| POST | `/inbound` | inbound.create |
| PUT | `/inbound/{id}` | inbound.edit |
| POST | `/inbound/{id}/receive` | inbound.approve |
| DELETE | `/inbound/{id}` | inbound.delete |

**POST `/inbound/{id}/receive` effects:** validate → persist → update inventory → batches → audit → report → email → dashboard invalidate

## Inventory

| Method | Path | Permission |
|--------|------|------------|
| GET | `/inventory` | inventory.view |
| GET | `/inventory/{id}` | inventory.view |
| POST | `/inventory/adjust` | inventory.adjust |
| POST | `/inventory/transfer` | inventory.transfer |
| GET | `/inventory/export` | inventory.export |

Filters: material, batch, customer, warehouse, location, palletId, status

## Outbound

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/outbound` | outbound.view / outbound.create |
| GET/PUT | `/outbound/{id}` | outbound.view / outbound.edit |
| POST | `/outbound/{id}/ship` | outbound.ship |
| POST | `/outbound/{id}/cancel` | outbound.cancel |

## Dashboard

| Method | Path | Permission |
|--------|------|------------|
| GET | `/dashboard/summary` | dashboard.view |
| GET | `/dashboard/activity` | dashboard.view |
| GET | `/dashboard/ai-insights` | dashboard.view |

## Reports & Email

| Method | Path | Permission |
|--------|------|------------|
| GET | `/reports` | reports.view |
| POST | `/reports/{code}/run` | reports.view |
| GET | `/reports/{code}/export` | reports.export |
| CRUD | `/report-schedules` | reports.schedule |
| GET/PUT | `/email/config` | admin.full |
| GET | `/email/outbox` | admin.full |

## AI Assistant

| Method | Path | Permission |
|--------|------|------------|
| POST | `/ai/chat` | ai.use |
| GET | `/ai/conversations` | ai.use |
| GET | `/ai/conversations/{id}` | ai.use |

AI responses are permission-filtered server-side; the model only receives authorized tool results.

## Integration Center

| Method | Path | Permission |
|--------|------|------------|
| CRUD | `/integrations` | integrations.manage |
| PUT | `/integrations/{id}/mappings` | integrations.manage |
| POST | `/integrations/{id}/test` | integrations.manage |
| POST | `/integrations/{id}/sync` | integrations.manage |
| CRUD | `/api-keys` | integrations.manage |

## Settings & Audit

| Method | Path | Permission |
|--------|------|------------|
| GET/PUT | `/settings` | settings.manage |
| GET | `/audit-logs` | audit.view |
| GET | `/login-history` | audit.view |

## Health

| Method | Path |
|--------|------|
| GET | `/health/live` |
| GET | `/health/ready` |
