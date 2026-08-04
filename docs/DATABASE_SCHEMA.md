# LogiForge — Database Schema (PostgreSQL)

## Conventions

- UUIDs (`uuid`) as primary keys
- `created_at`, `updated_at`, `created_by`, `updated_by` on mutable tables
- Soft delete via `is_deleted` + `deleted_at` where appropriate
- All tenant data includes `company_id`
- Monetary/weight: `numeric(18,4)`; quantities: `numeric(18,4)`
- Enums stored as strings (checked) or smallint with application mapping

## Core Identity & Tenancy

### companies
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | varchar(200) | |
| code | varchar(50) UNIQUE | short slug |
| status | varchar(30) | Active/Suspended/Trial |
| branding_json | jsonb | logo, colors |
| settings_json | jsonb | |
| created_at | timestamptz | |

### warehouses
| Column | Type |
|--------|------|
| id, company_id, code, name, address_json, timezone, is_active, created_at |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | nullable for platform admins |
| email | varchar(320) UNIQUE | |
| display_name | varchar(200) | |
| password_hash | text | null if Entra-only |
| auth_provider | varchar(30) | Local/Entra/Sso |
| entra_oid | varchar(100) | |
| mfa_enabled | bool | |
| is_active | bool | |
| last_login_at | timestamptz | |

### roles / permissions / role_permissions / user_roles
- `permissions`: `id`, `module`, `action`, `code` (unique), `description`
- `roles`: `id`, `company_id`, `name`, `is_system`
- `role_permissions`: `role_id`, `permission_id`
- `user_roles`: `user_id`, `role_id`, `warehouse_id` (nullable = all warehouses)

### login_history
`id`, `user_id`, `company_id`, `ip`, `user_agent`, `success`, `failure_reason`, `occurred_at`

## Master Data

### customers
`id`, `company_id`, `code`, `name`, `contact_json`, `billing_json`, `is_active`

### storage_locations
`id`, `company_id`, `warehouse_id`, `code`, `zone`, `aisle`, `rack`, `bin`, `location_type`, `capacity_weight`, `is_active`

### materials (optional catalog)
`id`, `company_id`, `customer_id`, `code`, `description`, `uom`, `is_active`

## Inbound

### inbound_loads
`id`, `company_id`, `warehouse_id`, `load_number` (unique per company), `customer_id`, `supplier_name`, `arrival_date`, `carrier`, `trailer_number`, `notes`, `status` (Draft/Received/Cancelled), `received_at`, `received_by`

### inbound_lines
`id`, `inbound_load_id`, `company_id`, `line_number`, `material_code`, `material_description`, `batch_number`, `weight`, `quantity`, `box_count`, `pallet_id`, `putaway_location_id`, `status`, `comments`

## Inventory

### inventory_items
`id`, `company_id`, `warehouse_id`, `customer_id`, `material_code`, `material_description`, `batch_number`, `pallet_id`, `location_id`, `original_weight`, `remaining_weight`, `quantity`, `box_count`, `status` (Available/Reserved/Partial/Hold/Damaged/Shipped), `inbound_line_id`, `last_updated_at`

Unique business key suggestion: `(company_id, warehouse_id, batch_number, pallet_id, location_id)` where applicable.

### inventory_transactions
`id`, `company_id`, `inventory_item_id`, `txn_type` (Receive/Ship/Adjust/Transfer/Hold/Release), `quantity_delta`, `weight_delta`, `reference_type`, `reference_id`, `notes`, `created_by`, `created_at`

## Outbound

### outbound_orders
`id`, `company_id`, `warehouse_id`, `order_number`, `customer_po`, `customer_id`, `shipping_terms`, `carrier`, `tracking_number`, `shipment_date`, `trailer_number`, `status` (Draft/Picking/Shipped/Cancelled), `shipped_at`, `shipped_by`, totals columns

### outbound_lines
`id`, `outbound_order_id`, `company_id`, `inventory_item_id`, `material_code`, `batch_number`, `weight`, `quantity`, `location_id`, `pallet_count`, `box_count`

## Reporting / Email / Integrations

### report_definitions — code, name, parameters_schema
### report_schedules — company_id, report_code, cron, recipients[], format, is_active
### email_configurations — company_id, provider (Smtp/Ms365), settings (encrypted), distribution_lists
### email_outbox — queued emails with status
### integrations — company_id, type (Rest/Soap/GraphQL/Webhook/Db/Csv/Excel), config_json (encrypted secrets), status
### field_mappings — integration_id, external_field, internal_field, transform
### api_keys — company_id, hashed_key, scopes, rate_limit, expires_at

## Audit & AI

### audit_logs
`id`, `company_id`, `user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip`, `occurred_at`

### activity_logs — lighter UI feed
### ai_conversations / ai_messages — tenant + user scoped chat history
### ai_document_chunks — RAG embeddings metadata (vector store may be external)

## Indexes (critical)

- `inventory_items (company_id, warehouse_id, status)`
- `inventory_items (company_id, batch_number)`
- `inventory_items (company_id, material_code)`
- `inbound_loads (company_id, arrival_date)`
- `outbound_orders (company_id, shipment_date)`
- `audit_logs (company_id, occurred_at DESC)`
