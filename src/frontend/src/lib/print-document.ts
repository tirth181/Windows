import { formatFileSize } from "@/lib/ship-to";
import { formatWeight } from "@/lib/utils";
import type { DocumentAttachment, InboundLoad } from "@/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWhen(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return escapeHtml(
    d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

function isImage(att: DocumentAttachment): boolean {
  return (
    att.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(att.name)
  );
}

const PRINT_STYLES = `
  @page { size: letter landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #0f172a;
    font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 100%; max-width: 100%; }
  .brand {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #0b1f33;
  }
  .brand-mark { font-size: 18px; font-weight: 700; color: #0b1f33; margin: 0; }
  .eyebrow { margin: 2px 0 0; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
  .load-no { margin: 0; font-family: ui-monospace, Menlo, monospace; font-size: 16px; font-weight: 700; text-align: right; }
  .status {
    display: inline-block;
    margin-top: 4px;
    padding: 2px 8px;
    border: 1px solid #94a3b8;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
  }
  h2 {
    margin: 14px 0 6px;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
  }
  .grid-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px 14px;
  }
  .meta-item label {
    display: block;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }
  .meta-item p {
    margin: 2px 0 0;
    font-size: 12px;
    font-weight: 600;
    color: #0b1f33;
    word-break: break-word;
  }
  .notes { grid-column: 1 / -1; }
  .notes p { white-space: pre-wrap; font-weight: 500; }
  table.lines {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-top: 4px;
    font-size: 10px;
  }
  table.lines th, table.lines td {
    border: 1px solid #dbe3ec;
    padding: 5px 4px;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  table.lines th {
    background: #eef3f8;
    font-size: 9px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64748b;
  }
  .col-mat { width: 12%; }
  .col-desc { width: 18%; }
  .col-batch { width: 12%; }
  .col-pallet { width: 11%; }
  .col-loc { width: 13%; }
  .col-wt { width: 12%; }
  .col-qty { width: 8%; }
  .col-box { width: 14%; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: ui-monospace, Menlo, monospace; }
  .totals {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #dbe3ec;
    font-size: 11px;
  }
  .attach {
    margin-top: 4px;
    padding: 8px;
    border: 1px solid #dbe3ec;
    border-radius: 6px;
  }
  .attach img {
    display: block;
    max-width: 100%;
    max-height: 280px;
    margin-top: 6px;
    object-fit: contain;
  }
  .muted { color: #64748b; }
`;

/** Build a standalone printable HTML document for an inbound receipt only. */
export function buildInboundReceiptPrintHtml(load: InboundLoad): string {
  const lines = (load.lines || []).filter((l) => l.materialCode);
  const plantLabel = load.storagePlantName
    ? `${load.storageLocationCode || ""} — ${load.storagePlantName}`.replace(
        /^ — /,
        "",
      )
    : load.storageLocationCode || "—";

  const totalWeight =
    load.totalWeight ??
    lines.reduce((s, l) => s + (Number(l.weight) || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const totalBoxes = lines.reduce((s, l) => s + (Number(l.boxCount) || 0), 0);

  const lineRows =
    lines.length === 0
      ? `<tr><td colspan="8" class="muted" style="text-align:center;padding:12px">No material lines</td></tr>`
      : lines
          .map(
            (line) => `
      <tr>
        <td class="mono col-mat">${escapeHtml(line.materialCode)}</td>
        <td class="col-desc">${escapeHtml(line.materialDescription || "—")}</td>
        <td class="mono col-batch">${escapeHtml(line.batchNumber || "—")}</td>
        <td class="mono col-pallet">${escapeHtml(line.palletId || "—")}</td>
        <td class="mono col-loc">${escapeHtml(line.locationCode || "—")}</td>
        <td class="num col-wt">${escapeHtml(formatWeight(line.weight))}</td>
        <td class="num col-qty">${escapeHtml(String(line.quantity ?? 0))}</td>
        <td class="num col-box">${escapeHtml(String(line.boxCount ?? 0))}</td>
      </tr>`,
          )
          .join("");

  let attachmentBlock = `<p class="muted">No document attached to this receipt.</p>`;
  if (load.attachment) {
    const att = load.attachment;
    const img =
      att.dataUrl && isImage(att)
        ? `<img src="${att.dataUrl}" alt="${escapeHtml(att.name)}" />`
        : "";
    attachmentBlock = `
      <div class="attach">
        <strong>${escapeHtml(att.name)}</strong>
        <div class="muted">${escapeHtml(formatFileSize(att.size))}${
          att.type ? ` · ${escapeHtml(att.type)}` : ""
        }</div>
        ${img}
        ${
          att.dataUrl && !isImage(att)
            ? `<p class="muted" style="margin-top:6px">File attached (see digital copy for full document).</p>`
            : ""
        }
      </div>`;
  }

  const title = `Inbound ${load.loadNumber || "receipt"}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div>
        <p class="brand-mark">LogiForge</p>
        <p class="eyebrow">Inbound receipt</p>
      </div>
      <div>
        <p class="load-no">${escapeHtml(load.loadNumber || "—")}</p>
        <div style="text-align:right"><span class="status">${escapeHtml(load.status)}</span></div>
      </div>
    </div>

    <h2>Header</h2>
    <div class="grid-meta">
      <div class="meta-item"><label>3PL company</label><p>${escapeHtml(load.warehouseName || "—")}</p></div>
      <div class="meta-item"><label>Storage plant</label><p>${escapeHtml(plantLabel)}</p></div>
      <div class="meta-item"><label>Arrival</label><p>${formatWhen(load.arrivalDate)}</p></div>
      <div class="meta-item"><label>Supplier</label><p>${escapeHtml(load.supplierName || "—")}</p></div>
      <div class="meta-item"><label>Carrier</label><p>${escapeHtml(load.carrier || "—")}</p></div>
      <div class="meta-item"><label>Trailer #</label><p class="mono">${escapeHtml(load.trailerNumber || "—")}</p></div>
      ${
        load.receivedAt
          ? `<div class="meta-item"><label>Received at</label><p>${formatWhen(load.receivedAt)}</p></div>`
          : ""
      }
      ${
        load.notes
          ? `<div class="meta-item notes"><label>Notes</label><p>${escapeHtml(load.notes)}</p></div>`
          : ""
      }
    </div>

    <h2>Material lines</h2>
    <table class="lines">
      <colgroup>
        <col class="col-mat" /><col class="col-desc" /><col class="col-batch" />
        <col class="col-pallet" /><col class="col-loc" /><col class="col-wt" />
        <col class="col-qty" /><col class="col-box" />
      </colgroup>
      <thead>
        <tr>
          <th>Material</th>
          <th>Description</th>
          <th>Batch</th>
          <th>Pallet</th>
          <th>Storage location</th>
          <th class="num">Weight</th>
          <th class="num">Qty</th>
          <th class="num">Boxes</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
    <div class="totals">
      <span>Lines <strong>${lines.length}</strong></span>
      <span>Weight <strong>${escapeHtml(formatWeight(totalWeight))}</strong></span>
      <span>Qty <strong>${totalQty}</strong></span>
      <span>Boxes/drums <strong>${totalBoxes}</strong></span>
    </div>

    <h2>Document attachment</h2>
    ${attachmentBlock}
  </div>
</body>
</html>`;
}

/** Print a standalone HTML document via hidden iframe (never the app chrome). */
export function printHtmlDocument(html: string, title = "Print"): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = iframe.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    iframe.remove();
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 800);
    }
  };

  iframe.onload = () => setTimeout(doPrint, 150);
  setTimeout(doPrint, 350);
}

/**
 * Print only the inbound receipt (via hidden iframe — never the app chrome).
 * Browser "Save as PDF" works from the same print dialog.
 */
export function printInboundReceipt(load: InboundLoad): void {
  printHtmlDocument(
    buildInboundReceiptPrintHtml(load),
    `Inbound ${load.loadNumber || "receipt"}`,
  );
}

/** @deprecated Use printInboundReceipt — kept for any older callers. */
export function printElementAsDocument(
  _element: HTMLElement | null,
  _title: string,
): void {
  // Intentionally no-op for whole-page fallback; callers should use printInboundReceipt.
}
