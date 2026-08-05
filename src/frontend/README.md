# LogiForge Frontend

Enterprise 3PL WMS UI built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **AG Grid**, and **Zustand**.

## Prerequisites

- Node.js 20+
- npm 10+
- Optional: LogiForge API running at `http://localhost:5080`

## Setup

```bash
cd src/frontend
npm install
cp .env.example .env.local   # optional
```

Configure the API base URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5080/api/v1
```

If unset, the app defaults to `http://localhost:5080/api/v1`.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode

When the API is unavailable, pages render with sensible mock data. On the login screen, any email/password signs you into a demo admin session with full permissions.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start Next.js dev server |
| `npm run build`| Production build         |
| `npm run start`| Serve production build   |
| `npm run lint` | ESLint                   |

## App modules

- `/login` — branded auth (local + Microsoft)
- `/dashboard` — KPIs, AI insights, quick actions, activity
- `/inbound` · `/inbound/new` — receiving list + AG Grid form
- `/inventory` — filterable grid with Partial highlight
- `/outbound` · `/outbound/new` — shipments + ship form
- `/reports`, `/customers`, `/locations`, `/users`, `/company`
- `/ai` — operations chat assistant
- `/integrations` — connections + field mapper
- `/settings`

Navigation is permission-filtered (`inbound.view`, `inventory.view`, …) via the Zustand auth store.

## Brand

- Fonts: Sora (display), IBM Plex Sans (UI), IBM Plex Mono (IDs)
- Tokens: `--brand-ink`, `--brand-steel`, `--accent`, `--surface`, `--success`, `--warning`, `--danger`
