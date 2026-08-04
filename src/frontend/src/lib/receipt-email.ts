import {
  buildEmlDocument,
  documentToEmailAttachment,
  downloadEml,
  escapeHtml,
  type EmailAttachment,
} from "@/lib/compose-email";
import { formatFileSize } from "@/lib/ship-to";
import { formatWeight } from "@/lib/utils";
import type { InboundLoad } from "@/types";

const DEFAULTS_KEY = "logiforge.settings.receiptDefaultEmails";
const OUTBOX_KEY = "logiforge.demo.receiptEmailOutbox";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function normalizeEmailList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const email = raw.trim().toLowerCase();
    if (!email || !isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Default recipient emails used when emailing inbound receipts. */
export function loadDefaultReceiptEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeEmailList(parsed.map(String));
  } catch {
    return [];
  }
}

export function saveDefaultReceiptEmails(emails: string[]): string[] {
  const next = normalizeEmailList(emails);
  if (typeof window !== "undefined") {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(next));
  }
  return next;
}

export function parseEmailsInput(value: string): string[] {
  return normalizeEmailList(
    value
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean),
  );
}

function formatWhen(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function buildReceiptEmailContent(load: InboundLoad): {
  subject: string;
  body: string;
  html: string;
} {
  const lines = (load.lines || []).filter((l) => l.materialCode);
  const plant = load.storagePlantName
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

  const lineBlock =
    lines.length === 0
      ? "  (none)"
      : lines
          .map(
            (l, i) =>
              `  ${i + 1}. ${l.materialCode} — ${l.materialDescription || "—"} | Batch ${l.batchNumber || "—"} | Loc ${l.locationCode || "—"} | ${formatWeight(l.weight)} | Qty ${l.quantity} | Boxes ${l.boxCount}`,
          )
          .join("\n");

  const subject = `Inbound receipt ${load.loadNumber || ""}`.trim();
  const att = load.attachment;
  const body = [
    "LogiForge inbound receipt",
    "",
    `Load: ${load.loadNumber || "—"}`,
    `Status: ${load.status}`,
    `3PL company: ${load.warehouseName || "—"}`,
    `Storage plant: ${plant}`,
    `Arrival: ${formatWhen(load.arrivalDate)}`,
    `Supplier: ${load.supplierName || "—"}`,
    `Carrier: ${load.carrier || "—"}`,
    `Trailer #: ${load.trailerNumber || "—"}`,
    load.notes ? `Notes: ${load.notes}` : null,
    att?.name
      ? `Attachment: ${att.name} (${formatFileSize(att.size)})`
      : "Attachment: (none)",
    "",
    "Material lines:",
    lineBlock,
    "",
    `Totals: ${lines.length} lines · ${formatWeight(totalWeight)} · Qty ${totalQty} · Boxes ${totalBoxes}`,
    "",
    "Open the downloaded .eml draft to include the document attachment.",
    "— Sent from LogiForge",
  ]
    .filter((line) => line != null)
    .join("\n");

  const lineRows =
    lines.length === 0
      ? `<tr><td colspan="7" style="padding:10px;text-align:center;color:#64748b">No material lines</td></tr>`
      : lines
          .map(
            (l) => `<tr>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;font-family:ui-monospace,Menlo,monospace">${escapeHtml(l.materialCode)}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec">${escapeHtml(l.materialDescription || "—")}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;font-family:ui-monospace,Menlo,monospace">${escapeHtml(l.batchNumber || "—")}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;font-family:ui-monospace,Menlo,monospace">${escapeHtml(l.locationCode || "—")}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;text-align:right">${escapeHtml(formatWeight(l.weight))}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;text-align:right">${escapeHtml(String(l.quantity ?? 0))}</td>
  <td style="padding:6px 8px;border:1px solid #dbe3ec;text-align:right">${escapeHtml(String(l.boxCount ?? 0))}</td>
</tr>`,
          )
          .join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:16px;background:#ffffff;color:#0f172a;font-family:'IBM Plex Sans','Segoe UI',system-ui,sans-serif;font-size:13px;line-height:1.45">
  <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #0b1f33">
    <p style="margin:0;font-size:18px;font-weight:700;color:#0b1f33">LogiForge</p>
    <p style="margin:2px 0 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Inbound receipt</p>
  </div>
  <p style="margin:0 0 4px"><strong>Load:</strong> ${escapeHtml(load.loadNumber || "—")} · <strong>Status:</strong> ${escapeHtml(load.status)}</p>
  <p style="margin:0 0 4px"><strong>3PL company:</strong> ${escapeHtml(load.warehouseName || "—")}</p>
  <p style="margin:0 0 4px"><strong>Storage plant:</strong> ${escapeHtml(plant)}</p>
  <p style="margin:0 0 4px"><strong>Arrival:</strong> ${escapeHtml(formatWhen(load.arrivalDate))}</p>
  <p style="margin:0 0 4px"><strong>Supplier:</strong> ${escapeHtml(load.supplierName || "—")}</p>
  <p style="margin:0 0 4px"><strong>Carrier:</strong> ${escapeHtml(load.carrier || "—")} · <strong>Trailer:</strong> ${escapeHtml(load.trailerNumber || "—")}</p>
  ${load.notes ? `<p style="margin:0 0 4px"><strong>Notes:</strong> ${escapeHtml(load.notes)}</p>` : ""}
  <p style="margin:0 0 12px"><strong>Attachment:</strong> ${
    att?.name
      ? `${escapeHtml(att.name)} <span style="color:#64748b">(${escapeHtml(formatFileSize(att.size))})</span>`
      : "(none)"
  }</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
      <tr style="background:#eef3f8">
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Material</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Description</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Batch</th>
        <th align="left" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Location</th>
        <th align="right" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Weight</th>
        <th align="right" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Qty</th>
        <th align="right" style="padding:6px 8px;border:1px solid #dbe3ec;font-size:10px;text-transform:uppercase;color:#64748b">Boxes</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>
  <p style="margin:12px 0 0"><strong>Totals:</strong> ${lines.length} lines · ${escapeHtml(formatWeight(totalWeight))} · Qty ${totalQty} · Boxes ${totalBoxes}</p>
  <p style="margin:16px 0 0;color:#64748b;font-size:12px">Document attachment is included with this email when available. — Sent from LogiForge</p>
</body>
</html>`;

  return { subject, body, html };
}

export interface ReceiptEmailLog {
  id: string;
  sentAt: string;
  loadId: string;
  loadNumber: string;
  to: string[];
  subject: string;
}

export function loadReceiptEmailOutbox(): ReceiptEmailLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReceiptEmailLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sendInboundReceiptEmail(
  load: InboundLoad,
  recipients: string[],
  opts?: { downloadEml?: boolean; openMailClient?: boolean },
): { to: string[]; subject: string; attachmentCount: number } {
  const to = normalizeEmailList(recipients);
  if (!to.length) {
    throw new Error("Add at least one valid email address.");
  }
  const { subject, body, html } = buildReceiptEmailContent(load);

  const attachments: EmailAttachment[] = [];
  const mapped = documentToEmailAttachment(load.attachment);
  if (mapped?.dataUrl) {
    attachments.push(mapped);
  } else if (load.attachment?.name) {
    const stub = [
      "LogiForge inbound attachment reference",
      `Load: ${load.loadNumber}`,
      `File: ${load.attachment.name}`,
      `Size: ${formatFileSize(load.attachment.size)}`,
      `Type: ${load.attachment.type || "—"}`,
      "",
      "Original binary was not stored with this demo record.",
      "Re-attach the document on the inbound load to include the real file next time.",
      "",
    ].join("\n");
    const b64 =
      typeof btoa !== "undefined"
        ? btoa(unescape(encodeURIComponent(stub)))
        : Buffer.from(stub, "utf8").toString("base64");
    const base =
      load.attachment.name.replace(/\.[^.]+$/, "") || "attachment";
    attachments.push({
      name: `${load.loadNumber || "inbound"}-${base}-reference.txt`,
      type: "text/plain",
      dataUrl: `data:text/plain;base64,${b64}`,
    });
  }

  const entry: ReceiptEmailLog = {
    id: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
    loadId: load.id,
    loadNumber: load.loadNumber,
    to,
    subject,
  };
  const outbox = [entry, ...loadReceiptEmailOutbox()].slice(0, 50);
  if (typeof window !== "undefined") {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  }

  if (opts?.downloadEml !== false && typeof window !== "undefined") {
    const eml = buildEmlDocument({
      to,
      subject,
      html,
      text: body,
      attachments,
    });
    downloadEml(
      `inbound-${(load.loadNumber || load.id).replace(/[^\w.-]+/g, "_")}.eml`,
      eml,
    );
  }

  // mailto cannot include HTML or binary attachments — optional plain fallback only
  if (opts?.openMailClient && typeof window !== "undefined") {
    const mailto = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return { to, subject, attachmentCount: attachments.length };
}
