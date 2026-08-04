import { formatShipTo } from "@/lib/ship-to";
import { printHtmlDocument } from "@/lib/print-document";
import {
  loadReceiptEmailOutbox,
  normalizeEmailList,
  type ReceiptEmailLog,
} from "@/lib/receipt-email";
import { formatWeight } from "@/lib/utils";
import type { OutboundOrder, Warehouse } from "@/types";

const SHIP_LOG_OUTBOX_KEY = "logiforge.demo.shipLogEmailOutbox";
const RECEIPT_OUTBOX_KEY = "logiforge.demo.receiptEmailOutbox";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Local calendar day key YYYY-MM-DD for an ISO timestamp. */
export function toLocalDayKey(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalDayKey(): string {
  return toLocalDayKey(new Date().toISOString()) || new Date().toISOString().slice(0, 10);
}

function shipmentDayKey(order: OutboundOrder): string | null {
  return toLocalDayKey(order.shippedAt) || toLocalDayKey(order.shipDate);
}

/** Shipments confirmed shipped on the given local day, scoped to 3PL company. */
export function filterShipLogOrders(
  orders: OutboundOrder[],
  dayKey: string,
  companyId?: string | null,
): OutboundOrder[] {
  return orders
    .filter((o) => {
      if (o.status !== "Shipped") return false;
      if (companyId && o.warehouseId !== companyId) return false;
      return shipmentDayKey(o) === dayKey;
    })
    .sort((a, b) => {
      const at = new Date(a.shippedAt || a.shipDate).getTime();
      const bt = new Date(b.shippedAt || b.shipDate).getTime();
      return at - bt;
    });
}

export function shipLogTotals(orders: OutboundOrder[]) {
  return orders.reduce(
    (acc, o) => {
      acc.shipments += 1;
      acc.weight += Number(o.totalWeight) || 0;
      acc.pallets += Number(o.totalPallets) || 0;
      acc.lines +=
        Number(o.lineCount) ||
        (o.lines?.length ?? 0) ||
        0;
      return acc;
    },
    { shipments: 0, weight: 0, pallets: 0, lines: 0 },
  );
}

function formatWhen(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function companyLabel(
  company?: Pick<Warehouse, "code" | "name"> | null,
  fallback?: string,
): string {
  if (company?.code && company?.name) return `${company.code} — ${company.name}`;
  if (company?.name) return company.name;
  return fallback || "3PL company";
}

export function buildShipLogEmailContent(
  orders: OutboundOrder[],
  dayKey: string,
  company?: Pick<Warehouse, "code" | "name"> | null,
): { subject: string; body: string } {
  const label = companyLabel(company, orders[0]?.warehouseName);
  const totals = shipLogTotals(orders);
  const dayLabel = formatDayLabel(dayKey);

  const block =
    orders.length === 0
      ? "  (no shipments shipped this day)"
      : orders
          .map((o, i) => {
            const shipTo = formatShipTo(o) || "—";
            return [
              `  ${i + 1}. ${o.orderNumber} — ${o.customerName || "—"}`,
              `     Shipped: ${formatWhen(o.shippedAt || o.shipDate)}`,
              `     Carrier: ${o.carrier || "—"} · Tracking: ${o.trackingNumber || "—"}`,
              `     Ship-to: ${shipTo}`,
              `     Weight: ${formatWeight(o.totalWeight || 0)} · Pallets: ${o.totalPallets ?? "—"}`,
            ].join("\n");
          })
          .join("\n\n");

  const subject = `Ship Log · ${dayLabel} · ${label}`;
  const body = [
    "LogiForge Ship Log",
    "Outbound shipments by day",
    "",
    `3PL company: ${label}`,
    `Ship day: ${dayLabel}`,
    "",
    "Shipments:",
    block,
    "",
    `Totals: ${totals.shipments} shipment${totals.shipments === 1 ? "" : "s"} · ${formatWeight(totals.weight)} · ${totals.pallets} pallets · ${totals.lines} lines`,
    "",
    "— Sent from LogiForge",
  ].join("\n");

  return { subject, body };
}

export function sendShipLogEmail(
  orders: OutboundOrder[],
  dayKey: string,
  recipients: string[],
  company?: Pick<Warehouse, "code" | "name"> | null,
  opts?: { openMailClient?: boolean },
): { to: string[]; subject: string } {
  const to = normalizeEmailList(recipients);
  if (!to.length) {
    throw new Error("Add at least one valid email address.");
  }
  const { subject, body } = buildShipLogEmailContent(orders, dayKey, company);

  const entry: ReceiptEmailLog = {
    id: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
    loadId: `ship-log-${dayKey}`,
    loadNumber: `Ship Log ${dayKey}`,
    to,
    subject,
  };
  const outbox = [entry, ...loadReceiptEmailOutbox()].slice(0, 50);
  if (typeof window !== "undefined") {
    localStorage.setItem(RECEIPT_OUTBOX_KEY, JSON.stringify(outbox));
    localStorage.setItem(SHIP_LOG_OUTBOX_KEY, JSON.stringify(outbox));
  }

  if (opts?.openMailClient !== false && typeof window !== "undefined") {
    const mailto = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return { to, subject };
}

export function buildShipLogPrintHtml(
  orders: OutboundOrder[],
  dayKey: string,
  company?: Pick<Warehouse, "code" | "name"> | null,
): string {
  const label = companyLabel(company, orders[0]?.warehouseName);
  const totals = shipLogTotals(orders);
  const dayLabel = formatDayLabel(dayKey);
  const generated = new Date().toLocaleString();

  const bodyRows =
    orders.length === 0
      ? `<tr><td colspan="8" class="muted" style="text-align:center;padding:14px">No shipments shipped on this day</td></tr>`
      : orders
          .map((o) => {
            const shipTo = formatShipTo(o) || "—";
            return `
      <tr>
        <td class="mono">${escapeHtml(o.orderNumber)}</td>
        <td>${escapeHtml(o.customerName || "—")}</td>
        <td>${escapeHtml(formatWhen(o.shippedAt || o.shipDate))}</td>
        <td>${escapeHtml(o.carrier || "—")}</td>
        <td class="mono">${escapeHtml(o.trackingNumber || "—")}</td>
        <td>${escapeHtml(shipTo)}</td>
        <td class="num">${escapeHtml(formatWeight(o.totalWeight || 0))}</td>
        <td class="num">${escapeHtml(String(o.totalPallets ?? "—"))}</td>
      </tr>`;
          })
          .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ship Log — ${escapeHtml(dayLabel)}</title>
  <style>
    @page { size: letter landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; background: #fff !important; color: #0f172a;
      font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
      font-size: 11px; line-height: 1.4;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .brand {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; margin-bottom: 12px; padding-bottom: 8px;
      border-bottom: 2px solid #0b1f33;
    }
    .brand-mark { font-size: 18px; font-weight: 700; margin: 0; color: #0b1f33; }
    .eyebrow { margin: 2px 0 0; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
    .company { margin: 0; font-size: 14px; font-weight: 700; text-align: right; }
    .meta { margin: 2px 0 0; font-size: 11px; color: #64748b; text-align: right; }
    table {
      width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; font-size: 10px;
    }
    th, td {
      border: 1px solid #dbe3ec; padding: 5px 4px; text-align: left; vertical-align: top;
      word-wrap: break-word; overflow-wrap: anywhere;
    }
    th {
      background: #eef3f8; font-size: 9px; letter-spacing: 0.04em;
      text-transform: uppercase; color: #64748b;
    }
    .mono { font-family: ui-monospace, Menlo, monospace; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals {
      display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; padding-top: 8px;
      border-top: 1px solid #dbe3ec; font-size: 11px;
    }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <div class="brand">
    <div>
      <p class="brand-mark">LogiForge</p>
      <p class="eyebrow">Ship Log · Outbound shipments by day</p>
    </div>
    <div>
      <p class="company">${escapeHtml(label)}</p>
      <p class="meta">${escapeHtml(dayLabel)}</p>
      <p class="meta">Generated ${escapeHtml(generated)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:12%">Order</th>
        <th style="width:14%">Customer</th>
        <th style="width:12%">Shipped</th>
        <th style="width:11%">Carrier</th>
        <th style="width:12%">Tracking</th>
        <th style="width:23%">Ship-to</th>
        <th class="num" style="width:9%">Weight</th>
        <th class="num" style="width:7%">Pallets</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>

  <div class="totals">
    <span>Shipments <strong>${totals.shipments}</strong></span>
    <span>Weight <strong>${escapeHtml(formatWeight(totals.weight))}</strong></span>
    <span>Pallets <strong>${totals.pallets}</strong></span>
    <span>Lines <strong>${totals.lines}</strong></span>
  </div>
</body>
</html>`;
}

export function printShipLog(
  orders: OutboundOrder[],
  dayKey: string,
  company?: Pick<Warehouse, "code" | "name"> | null,
): void {
  printHtmlDocument(
    buildShipLogPrintHtml(orders, dayKey, company),
    `Ship Log ${dayKey}`,
  );
}
