import { formatWeight } from "@/lib/utils";
import { printHtmlDocument } from "@/lib/print-document";
import type { InventoryItem, Warehouse } from "@/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvEscape(value: string | number | undefined | null): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function companyInventoryRows(
  rows: InventoryItem[],
  companyId: string | null | undefined,
): InventoryItem[] {
  if (!companyId) return rows;
  return rows.filter((r) => r.warehouseId === companyId);
}

export function inventorySnapshotTotals(rows: InventoryItem[]) {
  return rows.reduce(
    (acc, r) => {
      acc.lines += 1;
      acc.weight += Number(r.remainingWeight) || 0;
      acc.qty += Number(r.quantity) || 0;
      return acc;
    },
    { lines: 0, weight: 0, qty: 0 },
  );
}

/** Download a CSV of the inventory snapshot for the selected 3PL company. */
export function exportInventoryCsv(
  rows: InventoryItem[],
  company?: Pick<Warehouse, "code" | "name"> | null,
): void {
  if (typeof window === "undefined") return;

  const headers = [
    "Material",
    "Description",
    "Batch",
    "Pallet",
    "Storage Location",
    "3PL company",
    "Remaining lbs",
    "Qty",
    "Status",
    "Last updated",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.materialCode),
        csvEscape(r.materialDescription),
        csvEscape(r.batchNumber),
        csvEscape(r.palletId),
        csvEscape(r.locationCode),
        csvEscape(r.warehouseName),
        csvEscape(r.remainingWeight),
        csvEscape(r.quantity),
        csvEscape(r.status),
        csvEscape(r.lastUpdatedAt),
      ].join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  const code = (company?.code || "3PL").replace(/[^\w-]+/g, "");
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-${code}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildInventorySnapshotPrintHtml(
  rows: InventoryItem[],
  company?: Pick<Warehouse, "code" | "name"> | null,
): string {
  const companyLabel = company
    ? `${company.code} — ${company.name}`
    : rows[0]?.warehouseName || "3PL company";
  const totals = inventorySnapshotTotals(rows);
  const generated = new Date().toLocaleString();

  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="8" class="muted" style="text-align:center;padding:14px">No inventory for this 3PL company</td></tr>`
      : rows
          .map(
            (r) => `
      <tr>
        <td class="mono">${escapeHtml(r.materialCode)}</td>
        <td>${escapeHtml(r.materialDescription || "—")}</td>
        <td class="mono">${escapeHtml(r.batchNumber || "—")}</td>
        <td class="mono">${escapeHtml(r.palletId || "—")}</td>
        <td class="mono">${escapeHtml(r.locationCode || "—")}</td>
        <td class="num">${escapeHtml(formatWeight(r.remainingWeight))}</td>
        <td class="num">${escapeHtml(String(r.quantity ?? 0))}</td>
        <td>${escapeHtml(r.status)}</td>
      </tr>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Inventory snapshot — ${escapeHtml(companyLabel)}</title>
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
      <p class="eyebrow">Inventory snapshot</p>
    </div>
    <div>
      <p class="company">${escapeHtml(companyLabel)}</p>
      <p class="meta">Generated ${escapeHtml(generated)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:12%">Material</th>
        <th style="width:18%">Description</th>
        <th style="width:12%">Batch</th>
        <th style="width:11%">Pallet</th>
        <th style="width:14%">Storage Location</th>
        <th class="num" style="width:12%">Remaining</th>
        <th class="num" style="width:8%">Qty</th>
        <th style="width:13%">Status</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>

  <div class="totals">
    <span>Lines <strong>${totals.lines}</strong></span>
    <span>Weight <strong>${escapeHtml(formatWeight(totals.weight))}</strong></span>
    <span>Qty <strong>${totals.qty}</strong></span>
  </div>
</body>
</html>`;
}

export function printInventorySnapshot(
  rows: InventoryItem[],
  company?: Pick<Warehouse, "code" | "name"> | null,
): void {
  printHtmlDocument(
    buildInventorySnapshotPrintHtml(rows, company),
    `Inventory ${company?.code || "snapshot"}`,
  );
}
