import {
  buildEmlDocument,
  documentToEmailAttachment,
  downloadEml,
  type EmailAttachment,
} from "@/lib/compose-email";
import {
  isSafeImageDataUrl,
  sanitizeAttachmentFilename,
} from "@/lib/secure-attachment";
import { formatFileSize, formatShipTo } from "@/lib/ship-to";
import { printHtmlDocument } from "@/lib/print-document";
import {
  loadReceiptEmailOutbox,
  normalizeEmailList,
  type ReceiptEmailLog,
} from "@/lib/receipt-email";
import { formatWeight } from "@/lib/utils";
import type { DocumentAttachment, OutboundOrder, Warehouse } from "@/types";

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

export type ShipLogAttachment = {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  attachment: DocumentAttachment;
};

/** All outbound document attachments for shipments in the Ship Log. */
export function collectShipLogAttachments(
  orders: OutboundOrder[],
): ShipLogAttachment[] {
  return orders
    .filter((o) => o.attachment?.name)
    .map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      attachment: o.attachment!,
    }));
}

function isImageAttachment(att: DocumentAttachment): boolean {
  return isSafeImageDataUrl(att.dataUrl);
}

function isPdfAttachment(att: DocumentAttachment): boolean {
  return (
    (att.type === "application/pdf" || /\.pdf$/i.test(att.name)) &&
    Boolean(att.dataUrl)
  );
}

export function attachmentLabel(order: OutboundOrder): string {
  return order.attachment?.name || "—";
}

/** Plain-text fallback (mailto cannot carry HTML tables or file attachments). */
export function buildShipLogEmailContent(
  orders: OutboundOrder[],
  dayKey: string,
  company?: Pick<Warehouse, "code" | "name"> | null,
): { subject: string; body: string; html: string } {
  const label = companyLabel(company, orders[0]?.warehouseName);
  const totals = shipLogTotals(orders);
  const dayLabel = formatDayLabel(dayKey);
  const attachments = collectShipLogAttachments(orders);
  const subject = `Ship Log · ${dayLabel} · ${label}`;

  const tableRows =
    orders.length === 0
      ? `<tr><td colspan="9" style="padding:10px;text-align:center;color:#64748b">No shipments shipped on this day</td></tr>`
      : orders
          .map((o) => {
            const shipTo = formatShipTo(o) || "—";
            const att = o.attachment;
            return `<tr>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;font-family:ui-monospace,Menlo,monospace">${escapeHtml(o.orderNumber)}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec">${escapeHtml(o.customerName || "—")}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec">${escapeHtml(formatWhen(o.shippedAt || o.shipDate))}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec">${escapeHtml(o.carrier || "—")}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;font-family:ui-monospace,Menlo,monospace">${escapeHtml(o.trackingNumber || "—")}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec">${escapeHtml(shipTo)}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;text-align:right">${escapeHtml(formatWeight(o.totalWeight || 0))}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;text-align:right">${escapeHtml(String(o.totalPallets ?? "—"))}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;font-family:ui-monospace,Menlo,monospace">${escapeHtml(att?.name || "—")}${
    att ? `<div style="color:#64748b;font-size:11px">${escapeHtml(formatFileSize(att.size))}</div>` : ""
  }</td>
</tr>`;
          })
          .join("\n");

  const attachmentListHtml =
    attachments.length === 0
      ? `<p style="color:#64748b;margin:0">No document attachments on shipments for this day.</p>`
      : `<ul style="margin:0;padding-left:18px">${attachments
          .map(
            (a) =>
              `<li style="margin-bottom:4px"><strong>${escapeHtml(a.orderNumber)}</strong> — ${escapeHtml(a.attachment.name)} <span style="color:#64748b">(${escapeHtml(formatFileSize(a.attachment.size))}${a.attachment.type ? ` · ${escapeHtml(a.attachment.type)}` : ""})</span>${
                a.attachment.dataUrl
                  ? ""
                  : ' <span style="color:#b45309">(reference stub attached)</span>'
              }</li>`,
          )
          .join("")}</ul>`;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:16px;background:#ffffff;color:#0f172a;font-family:'IBM Plex Sans','Segoe UI',system-ui,sans-serif;font-size:13px;line-height:1.45">
  <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0b1f33">
    <p style="margin:0;font-size:18px;font-weight:700;color:#0b1f33">LogiForge</p>
    <p style="margin:2px 0 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Ship Log · Outbound shipments by day</p>
  </div>
  <p style="margin:0 0 4px"><strong>3PL company:</strong> ${escapeHtml(label)}</p>
  <p style="margin:0 0 12px"><strong>Ship day:</strong> ${escapeHtml(dayLabel)}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
      <tr style="background:#eef3f8">
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Order</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Customer</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Shipped</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Carrier</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Tracking</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Ship-to</th>
        <th align="right" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Weight</th>
        <th align="right" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Pallets</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Attachment</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <p style="margin:12px 0 0">
    <strong>Totals:</strong>
    ${totals.shipments} shipment${totals.shipments === 1 ? "" : "s"} ·
    ${escapeHtml(formatWeight(totals.weight))} ·
    ${totals.pallets} pallets ·
    ${totals.lines} lines ·
    ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}
  </p>
  <h2 style="margin:18px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Document attachments</h2>
  ${attachmentListHtml}
  <p style="margin:16px 0 0;color:#64748b;font-size:12px">Outbound packing lists / BOLs are attached to this email when available. — Sent from LogiForge</p>
</body>
</html>`;

  // Tab-separated plain text still useful as mailto fallback
  const plainHeader = [
    "Order",
    "Customer",
    "Shipped",
    "Carrier",
    "Tracking",
    "Ship-to",
    "Weight",
    "Pallets",
    "Attachment",
  ].join("\t");
  const plainRows =
    orders.length === 0
      ? "(no shipments)"
      : orders
          .map((o) =>
            [
              o.orderNumber,
              o.customerName || "—",
              formatWhen(o.shippedAt || o.shipDate),
              o.carrier || "—",
              o.trackingNumber || "—",
              formatShipTo(o) || "—",
              formatWeight(o.totalWeight || 0),
              String(o.totalPallets ?? "—"),
              o.attachment?.name || "—",
            ].join("\t"),
          )
          .join("\n");

  const body = [
    "LogiForge Ship Log (table)",
    `3PL company: ${label}`,
    `Ship day: ${dayLabel}`,
    "",
    plainHeader,
    plainRows,
    "",
    `Totals: ${totals.shipments} shipments · ${formatWeight(totals.weight)} · ${totals.pallets} pallets · ${attachments.length} attachments`,
    "",
    "Open the downloaded .eml draft for the HTML table and file attachments.",
    "— Sent from LogiForge",
  ].join("\n");

  return { subject, body, html };
}

/** Build file parts for the Ship Log email (real files or demo stubs). */
export function buildShipLogEmailAttachments(
  orders: OutboundOrder[],
): EmailAttachment[] {
  const out: EmailAttachment[] = [];
  for (const item of collectShipLogAttachments(orders)) {
    const mapped = documentToEmailAttachment(item.attachment);
    if (!mapped) continue;
    if (mapped.dataUrl) {
      out.push(mapped);
      continue;
    }
    // Demo seed rows often store name/size only — attach a text stub so the file still goes out
    const stub = [
      "LogiForge outbound attachment reference",
      `Order: ${item.orderNumber}`,
      `Customer: ${item.customerName || "—"}`,
      `File: ${item.attachment.name}`,
      `Size: ${formatFileSize(item.attachment.size)}`,
      `Type: ${item.attachment.type || "—"}`,
      "",
      "Original binary was not stored with this demo record.",
      "Re-attach the document on the outbound order to include the real file next time.",
      "",
    ].join("\n");
    const b64 =
      typeof btoa !== "undefined"
        ? btoa(unescape(encodeURIComponent(stub)))
        : Buffer.from(stub, "utf8").toString("base64");
    const base = item.attachment.name.replace(/\.[^.]+$/, "") || "attachment";
    out.push({
      name: `${item.orderNumber}-${base}-reference.txt`,
      type: "text/plain",
      dataUrl: `data:text/plain;base64,${b64}`,
    });
  }
  return out;
}

export function sendShipLogEmail(
  orders: OutboundOrder[],
  dayKey: string,
  recipients: string[],
  company?: Pick<Warehouse, "code" | "name"> | null,
  opts?: { downloadEml?: boolean; openMailClient?: boolean },
): { to: string[]; subject: string; attachmentCount: number } {
  const to = normalizeEmailList(recipients);
  if (!to.length) {
    throw new Error("Add at least one valid email address.");
  }
  const { subject, body, html } = buildShipLogEmailContent(
    orders,
    dayKey,
    company,
  );
  const fileAttachments = buildShipLogEmailAttachments(orders);

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

  const shouldDownload = opts?.downloadEml !== false;
  if (shouldDownload && typeof window !== "undefined") {
    const eml = buildEmlDocument({
      to,
      subject,
      html,
      text: body,
      attachments: fileAttachments,
    });
    downloadEml(`ship-log-${dayKey}.eml`, eml);
  }

  // mailto cannot include HTML tables or binary attachments — optional plain fallback only
  if (opts?.openMailClient && typeof window !== "undefined") {
    const mailto = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return { to, subject, attachmentCount: fileAttachments.length };
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

  const attachments = collectShipLogAttachments(orders);

  const bodyRows =
    orders.length === 0
      ? `<tr><td colspan="9" class="muted" style="text-align:center;padding:14px">No shipments shipped on this day</td></tr>`
      : orders
          .map((o) => {
            const shipTo = formatShipTo(o) || "—";
            const att = o.attachment;
            const attCell = att
              ? `${escapeHtml(att.name)}<div class="muted">${escapeHtml(formatFileSize(att.size))}</div>`
              : "—";
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
        <td class="mono">${attCell}</td>
      </tr>`;
          })
          .join("");

  const attachmentSection =
    attachments.length === 0
      ? `<p class="muted">No document attachments on shipments for this day.</p>`
      : attachments
          .map((a) => {
            const att = a.attachment;
            const safeName = sanitizeAttachmentFilename(att.name);
            const img = isImageAttachment(att)
              ? `<img src="${att.dataUrl}" alt="${escapeHtml(safeName)}" />`
              : "";
            const note =
              att.dataUrl && !isImageAttachment(att)
                ? `<p class="muted" style="margin-top:6px">File attached${isPdfAttachment(att) ? " (PDF)" : ""} — open the digital Ship Log to download the full document.</p>`
                : !att.dataUrl
                  ? `<p class="muted" style="margin-top:6px">Document reference on file (binary not embedded in print).</p>`
                  : "";
            return `
      <div class="attach">
        <strong>${escapeHtml(a.orderNumber)}</strong>
        <span class="muted"> · ${escapeHtml(a.customerName || "—")}</span>
        <div style="margin-top:4px"><strong>${escapeHtml(safeName)}</strong></div>
        <div class="muted">${escapeHtml(formatFileSize(att.size))}${
          att.type ? ` · ${escapeHtml(att.type)}` : ""
        }</div>
        ${img}
        ${note}
      </div>`;
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
    h2 {
      margin: 16px 0 8px; font-size: 11px; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    .attach {
      border: 1px solid #dbe3ec; border-radius: 4px; padding: 8px 10px;
      margin-bottom: 8px; background: #f8fafc; page-break-inside: avoid;
    }
    .attach img {
      display: block; max-width: 100%; max-height: 280px; margin-top: 8px;
      object-fit: contain; background: #fff; border: 1px solid #e2e8f0;
    }
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
        <th style="width:10%">Order</th>
        <th style="width:12%">Customer</th>
        <th style="width:11%">Shipped</th>
        <th style="width:10%">Carrier</th>
        <th style="width:11%">Tracking</th>
        <th style="width:18%">Ship-to</th>
        <th class="num" style="width:8%">Weight</th>
        <th class="num" style="width:6%">Pallets</th>
        <th style="width:14%">Attachment</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>

  <div class="totals">
    <span>Shipments <strong>${totals.shipments}</strong></span>
    <span>Weight <strong>${escapeHtml(formatWeight(totals.weight))}</strong></span>
    <span>Pallets <strong>${totals.pallets}</strong></span>
    <span>Lines <strong>${totals.lines}</strong></span>
    <span>Attachments <strong>${attachments.length}</strong></span>
  </div>

  <h2>Document attachments</h2>
  ${attachmentSection}
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
