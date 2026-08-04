# LogiForge

Enterprise AI-powered multi-tenant 3PL Warehouse Management Platform.

**Stack:** Next.js · ASP.NET Core 8 · PostgreSQL · Redis · Azure OpenAI · Docker / Kubernetes

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, tenancy, layers |
| [Database Schema](docs/DATABASE_SCHEMA.md) | PostgreSQL model |
| [API Design](docs/API_DESIGN.md) | REST endpoints |
| [UI/UX Design](docs/UI_UX_DESIGN.md) | Brand & UX principles |
| [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) | Phased delivery |
| [Security](docs/SECURITY.md) | AuthN/Z and controls |
| [Folder Structure](docs/FOLDER_STRUCTURE.md) | Monorepo layout |

## Quick Start

### Docker Compose (recommended)

```bash
docker compose up --build
```

- Web: http://localhost:3000  
- API / Swagger: http://localhost:5080/swagger  

### Local development

**Backend**

```bash
# Start Postgres + Redis (or use docker compose up postgres redis)
export PATH="$HOME/.dotnet:$PATH"
cd src/backend
dotnet run --project src/LogiForge.Api --urls http://localhost:5080
```

**Frontend**

```bash
cd src/frontend
npm install
npm run dev
```

### Demo credentials

| User | Password | Role |
|------|----------|------|
| `admin@harborline.com` | `ChangeMe!Harbor12` | Company Administrator |
| `floor@harborline.com` | `ChangeMe!Floor12` | Warehouse Associate |

Demo tenant: **Harborline Logistics** · Warehouse **DFW1**

## Modules

1. Dashboard · 2. Inbound · 3. Inventory · 4. Outbound · 5. Reports  
6. Customers · 7. 3PL Companies · 8. Users · 9. Company · 10. AI Assistant  
11. Integration Center · 12. Settings

## Security highlights

- Row-level multi-tenant isolation (`company_id` + EF global filters)
- JWT + Microsoft Entra ID (OIDC) ready
- Fine-grained RBAC (module / action / warehouse scope)
- Permission-aware AI assistant (never returns unauthorized data)
- Audit logs, rate limiting, OpenAPI

## Tests & CI

```bash
dotnet test src/backend/LogiForge.sln
cd src/frontend && npm run build
```

GitHub Actions workflow: `.github/workflows/ci.yml`
