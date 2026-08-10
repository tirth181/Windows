# Fynvo

**Fynvo** is an original invoicing and budgeting application for individuals, families, and companies.

- Create professional invoices, estimates, clients, and products
- Export invoice PDFs
- Track expenses and budgets (personal / family / company)
- Subscription plans: Starter (free), Pro, Business
- Web app + PWA; packaging path for App Store and Google Play

Fynvo is an independent product. It is **not** affiliated with Zoho or any other accounting brand.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo login from the Sign in page: **Open demo** (`demo@fynvo.app` / `demo123`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Product modules

- Marketing site + pricing
- Auth (local demo accounts)
- Dashboard
- Invoices (create / edit / status / PDF)
- Estimates → invoice conversion
- Clients & products
- Budgets & expenses
- Subscription billing UI (Stripe / store hooks documented)

## Publishing

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for web, App Store, Play Store, and subscription setup.

## Tech

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Zustand (persisted local workspace)
- jsPDF + Recharts

> LocalStorage persistence is for the MVP demo. Before charging real customers, move entitlements and data to a secure backend.
