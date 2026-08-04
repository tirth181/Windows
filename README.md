# LogiForge

Enterprise AI-powered multi-tenant 3PL Warehouse Management Platform.

**Stack:** Next.js · ASP.NET Core 8 · PostgreSQL · Redis · Azure OpenAI · Docker / Kubernetes

## Product site

The root route (`/`) is the publishable marketing site — best use cases, live product videos, and security positioning. The operations app starts at `/login` → `/dashboard`.

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, tenancy, layers |
| [Database Schema](docs/DATABASE_SCHEMA.md) | PostgreSQL model |
| [API Design](docs/API_DESIGN.md) | REST endpoints |
| [UI/UX Design](docs/UI_UX_DESIGN.md) | Brand & UX principles |
| [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) | Phased delivery |
| [Security](docs/SECURITY.md) | AuthN/Z, headers, publish checklist |
| [Folder Structure](docs/FOLDER_STRUCTURE.md) | Monorepo layout |

## Quick Start

### Docker Compose (recommended)

```bash
docker compose up --build
```

- Marketing + app: http://localhost:3000  
- API / Swagger (dev): http://localhost:5080/swagger  

### Local development

**Backend**

```bash
export PATH="$HOME/.dotnet:$PATH"
cd src/backend
dotnet run --project src/LogiForge.Api --urls http://localhost:5080
```

**Frontend**

```bash
cd src/frontend
cp ../../.env.example .env.local   # optional
# For local demo bypass when the API is down:
# NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true
npm install
npm run dev
```

### Demo credentials (seeded API)

| User | Password | Role |
|------|----------|------|
| `admin@harborline.com` | `ChangeMe!Harbor12` | Company Administrator |
| `floor@harborline.com` | `ChangeMe!Floor12` | Warehouse Associate |

Demo tenant: **Harborline Logistics** · Warehouse **DFW1**

> Offline demo login (any password) is only available when `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true`. Leave this **false** for production publishes.

## Modules

1. Dashboard · 2. Inbound · 3. Inventory · 4. Outbound · 5. Reports  
6. Customers · 7. 3PL Companies · 8. Users · 9. Company · 10. AI Assistant  
11. Integration Center · 12. Settings

## Security highlights

- Row-level multi-tenant isolation (`company_id` + EF global filters)
- JWT required in non-Development (startup fails on weak/missing keys)
- Login lockout (5 failures / 15 minutes) + auth rate limits (10/min)
- Security headers + HSTS + CSP on web and API
- Swagger off by default outside Development
- Fine-grained RBAC (module / action / warehouse scope)
- Permission-aware AI assistant (never returns unauthorized data)
- Audit logs + login history

See [docs/SECURITY.md](docs/SECURITY.md) for the full production publish checklist.

## Tests & CI

```bash
dotnet test src/backend/LogiForge.sln
cd src/frontend && npm run build
```

GitHub Actions workflow: `.github/workflows/ci.yml`
