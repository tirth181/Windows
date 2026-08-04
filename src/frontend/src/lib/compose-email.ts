import type { DocumentAttachment } from "@/types";

export type EmailAttachment = {
  name: string;
  type?: string;
  /** Base64 data URL (data:mime;base64,...) or raw base64. */
  dataUrl?: string;
};

function encodeSubject(subject: string): string {
  // RFC 2047 encoded-word when non-ASCII
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(subject)))
      : Buffer.from(subject, "utf8").toString("base64");
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
  return { mime: m[1] || "application/octet-stream", base64: m[2] };
}

function safeFilename(name: string): string {
  return name.replace(/[\r\n"\\]/g, "_").trim() || "attachment";
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = safeFilename(name);
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
  const from = opts.from || "LogiForge <noreply@logiforge.demo>";
  const toHeader = opts.to.join(", ");
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

  if (opts.text) {
    // Already included HTML; plain text omitted from multipart/mixed for simplicity
  }

  const usedNames = new Set<string>();
  for (const att of opts.attachments || []) {
    if (!att.dataUrl) continue;
    const parsed = parseDataUrl(att.dataUrl);
    if (!parsed) continue;
    const filename = uniqueName(att.name, usedNames);
    const mime = att.type || parsed.mime || "application/octet-stream";
    parts.push(
      `--${boundary}`,
      `Content-Type: ${mime}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      foldBase64(parsed.base64),
      "",
    );
  }

  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

/** Download a composed .eml so the mail client opens with HTML + attachments. */
export function downloadEml(filename: string, eml: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".eml") ? filename : `${filename}.eml`;
  a.style.display = "none";
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
    name: att.name,
    type: att.type,
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
