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
    load.attachment?.name
      ? `Attachment: ${load.attachment.name}`
      : "Attachment: (none)",
    "",
    "Material lines:",
    lineBlock,
    "",
    `Totals: ${lines.length} lines · ${formatWeight(totalWeight)} · Qty ${lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)} · Boxes ${lines.reduce((s, l) => s + (Number(l.boxCount) || 0), 0)}`,
    "",
    "— Sent from LogiForge",
  ]
    .filter((line) => line != null)
    .join("\n");

  return { subject, body };
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
  opts?: { openMailClient?: boolean },
): { to: string[]; subject: string } {
  const to = normalizeEmailList(recipients);
  if (!to.length) {
    throw new Error("Add at least one valid email address.");
  }
  const { subject, body } = buildReceiptEmailContent(load);

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

  if (opts?.openMailClient !== false && typeof window !== "undefined") {
    const mailto = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Prefer a temporary anchor so we don't navigate away from the SPA
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return { to, subject };
}
