# LogiForge — Complete Folder Structure

```
logiforge/
├── README.md
├── docker-compose.yml
├── .gitignore
├── .editorconfig
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_DESIGN.md
│   ├── UI_UX_DESIGN.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── FOLDER_STRUCTURE.md
│   └── SECURITY.md
├── scripts/
│   ├── init-db.sql
│   ├── seed-demo.sql
│   └── wait-for-it.sh
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.web
│   ├── k8s/
│   │   ├── namespace.yaml
│   │   ├── api-deployment.yaml
│   │   ├── web-deployment.yaml
│   │   ├── postgres.yaml
│   │   ├── redis.yaml
│   │   ├── ingress.yaml
│   │   └── configmap.yaml
│   └── github-actions/
│       └── (see .github/workflows)
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
└── src/
    ├── backend/
    │   ├── LogiForge.sln
    │   ├── Directory.Build.props
    │   ├── src/
    │   │   ├── LogiForge.Domain/           # Entities, enums, domain events, interfaces
    │   │   ├── LogiForge.Application/      # CQRS, DTOs, validators, use cases
    │   │   ├── LogiForge.Infrastructure/   # EF Core, Redis, Blob, Email, Auth, AI
    │   │   └── LogiForge.Api/              # Controllers, middleware, OpenAPI
    │   └── tests/
    │       ├── LogiForge.Domain.Tests/
    │       ├── LogiForge.Application.Tests/
    │       └── LogiForge.Api.Tests/
    └── frontend/
        ├── package.json
        ├── next.config.ts
        ├── tailwind.config.ts
        ├── tsconfig.json
        ├── public/
        └── src/
            ├── app/                        # Next.js App Router
            │   ├── (auth)/
            │   ├── (app)/                  # Authenticated shell
            │   │   ├── dashboard/
            │   │   ├── inbound/
            │   │   ├── inventory/
            │   │   ├── outbound/
            │   │   ├── reports/
            │   │   ├── customers/
            │   │   ├── locations/
            │   │   ├── users/
            │   │   ├── company/
            │   │   ├── ai/
            │   │   ├── integrations/
            │   │   └── settings/
            │   ├── layout.tsx
            │   └── page.tsx
            ├── components/
            ├── features/
            ├── hooks/
            ├── lib/
            ├── stores/
            ├── types/
            └── styles/
```
