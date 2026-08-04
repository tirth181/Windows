# AGENTS.md

AetherWMS — multi-tenant 3PL WMS. Monorepo with npm workspaces:
`apps/api` (Express + Prisma backend) and `apps/web` (Next.js frontend).
See `README.md` for the feature list and `ARCHITECTURE.md` for design + roadmap.

## Cursor Cloud specific instructions

Services (run both with `npm run dev` from the repo root):

| Service | Dir | Dev command | Port |
|---------|-----|-------------|------|
| API | `apps/api` | `npm run dev` (runs `prisma migrate deploy` then `tsx watch`) | 4000 |
| Web | `apps/web` | `npm run dev` (`next dev`) | 3000 |

Non-obvious things worth knowing:

- **Open only the web port (3000).** The browser reaches the app through the
  forwarded web port; it does **not** have access to the API port. The web app
  therefore calls the API **same-origin** and Next.js `rewrites` (see
  `apps/web/next.config.js`) proxy `/api/*` and `/health` to
  `http://localhost:4000`. Do not set `NEXT_PUBLIC_API_URL` to `http://localhost:4000`
  for browser use — that reintroduces the cross-origin "Load failed" error.
- **Database is SQLite** at `apps/api/prisma/dev.db` (gitignored). A **dev-only,
  non-secret** `apps/api/.env` (DATABASE_URL + dev JWT secret) is committed so the
  app runs with no setup. Production switches the Prisma provider to PostgreSQL
  and injects real secrets via the environment.
- **Auto-seed on first boot:** the API's `ensureSeeded()` seeds demo data only
  when the DB is empty, so `npm run dev` alone yields a working, populated app.
  To rebuild data: `npm run db:reset --workspace apps/api` (drop + migrate + seed).
  Note: the API runs under `tsx watch`, so editing files under `apps/api/src`
  restarts it and re-runs `ensureSeeded` (a no-op unless the DB is empty).
- **Demo logins** (password `Password123!`): `admin@abc.com` (Administrator),
  `manager@abc.com` (Manager, has AI actions), `john@abc.com` (Associate, no
  pricing/billing/users), `exec@abc.com` (Executive), `admin@globex.com` (a
  separate, isolated tenant).
- **AI assistant** works out of the box with a built-in natural-language **rules
  engine**. Set `OPENAI_API_KEY` (optionally `OPENAI_MODEL`) to enable the LLM
  classifier; it degrades gracefully to rules on any error. Permission checks are
  always enforced server-side regardless of the classifier.
- **Uploaded documents** are stored on disk under `apps/api/uploads/<tenantId>/`
  (gitignored); metadata lives in the `Attachment` table. In production this
  should be object storage (e.g. S3/Azure Blob).
- Lint/test/build are standard (see root `package.json`): `npm run lint`,
  `npm test` (API Vitest; requires migrations applied — the dev/test flow handles
  this), `npm run build`.
