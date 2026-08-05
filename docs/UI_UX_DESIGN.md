# LogiForge — UI/UX Design

## Brand

- **Name:** LogiForge
- **Personality:** Precise, industrial, calm confidence — built for warehouse floors and boardrooms
- **Logo mark:** Geometric “LF” forged mark (angular, stamped)

## Visual Direction

Not purple SaaS. Not cream-serif. Not dark-mode-by-default.

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-ink` | `#0B1F33` | Primary brand, headers |
| `--brand-steel` | `#1E3A54` | Nav, panels |
| `--accent` | `#D97706` | CTAs, focus, scanner highlights |
| `--surface` | `#F3F6F9` | Page background (subtle grain/gradient) |
| `--surface-raised` | `#FFFFFF` | Interactive work surfaces |
| `--success` | `#0F766E` | Available / received |
| `--warning` | `#B45309` | Partial / delayed |
| `--danger` | `#B91C1C` | Hold / damaged / errors |
| `--text` | `#0F172A` | Body |
| `--muted` | `#64748B` | Secondary |

**Typography**
- Display/Brand: **Sora**
- UI/Body: **IBM Plex Sans**
- Mono (batch/pallet IDs): **IBM Plex Mono**

**Atmosphere**
- Soft steel-to-sky gradient on auth and marketing shells
- Subtle diagonal hatch / blueprint grid on app chrome (low opacity)
- Real warehouse photography only on marketing; app focuses on data clarity

## Layout Principles

1. **One job per screen** — receive, pick, ship, or search — not dashboards inside forms
2. **Warehouse-first density** — large touch targets (44px+), high contrast status chips
3. **Scanner-friendly** — barcode fields auto-focus, Enter advances row
4. **Permission-driven nav** — modules vanish if unauthorized
5. **Cards only for interactive containers** — KPI tiles and AI composer; no decorative card sprawl

## First Viewport (App Home / Dashboard)

Composition (not a marketing hero):
- Brand mark + warehouse context selector
- One-line operational headline (“Tuesday operations”)
- KPI strip: Today Inbound · Today Shipments · On Hand · Utilization
- Secondary row: Partial · On Hold · Delayed
- AI Insights panel + Quick Actions
- Recent Activity feed

## Module UX Notes

### Inbound (Receiving)
- Header form (load meta) fixed top
- AG Grid material lines — add row via scanner or button
- Sticky footer: totals + primary **Receive** CTA
- Success: toast + auto-redirect to load detail / print

### Inventory
- Filter bar (material, batch, customer, warehouse, location, pallet)
- Grid with **Partial** rows highlighted amber left border
- Export menu: Excel / CSV / PDF

### Outbound
- Header + line grid with inventory picker
- Live totals: weight (lbs), pallets, materials, boxes/drums
- **Confirm Shipment** with validation modal

### AI Assistant
- Full-height chat, suggested prompts by role
- Inline action chips (“Open inbound”, “Export report”) when authorized

### Integration Center
- Connection list + visual field mapper (source → target columns)
- Test / Sync actions with status timeline

## Responsive

- Desktop: left rail nav (collapsible)
- Tablet: icon rail + large grids
- Mobile: bottom nav for floor roles (Inbound, Inventory, Outbound, AI); admin modules desktop-preferred

## Motion (intentional)

1. Nav item active indicator slides
2. KPI numbers count-up on dashboard load
3. Receive/Ship success checkmark draw + subtle confirmation pulse

## Accessibility

- WCAG 2.1 AA contrast
- Keyboard operable grids
- Focus visible rings in accent color
- Status never color-only (icons + text)
