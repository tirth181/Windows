import {
  MAX_EMAIL_ATTACHMENT_BYTES,
  MAX_EMAIL_ATTACHMENT_COUNT,
  sanitizeAttachmentFilename,
  sanitizeHeaderValue,
  sanitizeMimeType,
} from "@/lib/secure-attachment";
import type { DocumentAttachment } from "@/types";

export type EmailAttachment = {
  name: string;
  type?: string;
  /** Base64 data URL (data:mime;base64,...) or raw base64. */
  dataUrl?: string;
};

function encodeSubject(subject: string): string {
  const clean = sanitizeHeaderValue(subject);
  // Always encode to neutralize CRLF / special header chars
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(clean)))
      : Buffer.from(clean, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function foldBase64(b64: string): string {
  const clean = b64.replace(/\s+/g, "");
  const lines: string[] = [];
  for (let i = 0; i < clean.length; i += 76) {
    lines.push(clean.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

function parseDataUrl(dataUrl: string): {
  mime: string;
  base64: string;
} | null {
  const m = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(
    dataUrl.replace(/\s+/g, ""),
  );
  if (!m) return null;
  const base64 = m[2];
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) return null;
  return { mime: sanitizeMimeType(m[1]), base64 };
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = sanitizeAttachmentFilename(name);
  if (!used.has(candidate.toLowerCase())) {
    used.add(candidate.toLowerCase());
    return candidate;
  }
  const dot = candidate.lastIndexOf(".");
  const base = dot > 0 ? candidate.slice(0, dot) : candidate;
  const ext = dot > 0 ? candidate.slice(dot) : "";
  let n = 2;
  while (used.has(`${base}-${n}${ext}`.toLowerCase())) n += 1;
  candidate = `${base}-${n}${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

function estimatedBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/** Build a multipart .eml (HTML body + file attachments). */
export function buildEmlDocument(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}): string {
  const boundary = `----=_LogiForge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const from = sanitizeHeaderValue(opts.from || "LogiForge <noreply@logiforge.demo>");
  const toHeader = sanitizeHeaderValue(opts.to.join(", "));
  const date = new Date().toUTCString();

  const parts: string[] = [
    `From: ${from}`,
    `To: ${toHeader}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    `Date: ${date}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    "This is a multi-part message in MIME format.",
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    opts.html,
    "",
  ];

  const usedNames = new Set<string>();
  let totalBytes = 0;
  let attached = 0;

  for (const att of opts.attachments || []) {
    if (attached >= MAX_EMAIL_ATTACHMENT_COUNT) break;
    if (!att.dataUrl) continue;
    const parsed = parseDataUrl(att.dataUrl);
    if (!parsed) continue;
    const size = estimatedBytes(parsed.base64);
    if (size <= 0) continue;
    if (totalBytes + size > MAX_EMAIL_ATTACHMENT_BYTES) break;

    const filename = uniqueName(att.name, usedNames);
    const mime = sanitizeMimeType(att.type || parsed.mime);
    parts.push(
      `--${boundary}`,
      `Content-Type: ${mime}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      foldBase64(parsed.base64),
      "",
    );
    totalBytes += size;
    attached += 1;
  }

  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

/** Download a composed .eml so the mail client opens with HTML + attachments. */
export function downloadEml(filename: string, eml: string): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeAttachmentFilename(filename.endsWith(".eml") ? filename : `${filename}.eml`);
  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  a.style.display = "none";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function documentToEmailAttachment(
  att: DocumentAttachment | null | undefined,
): EmailAttachment | null {
  if (!att?.name) return null;
  return {
    name: sanitizeAttachmentFilename(att.name),
    type: sanitizeMimeType(att.type),
    dataUrl: att.dataUrl,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
