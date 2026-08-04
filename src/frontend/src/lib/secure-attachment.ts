import type { DocumentAttachment } from "@/types";

/** Hard cap for a single inbound/outbound document attachment. */
export const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;

/** Max total decoded attachment bytes allowed in one email draft. */
export const MAX_EMAIL_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Max number of file parts in one email draft. */
export const MAX_EMAIL_ATTACHMENT_COUNT = 20;

export const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv";

const ALLOWED_BY_EXT: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  txt: ["text/plain"],
  csv: ["text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"],
};

const BLOCKED_EXT = new Set([
  "svg",
  "html",
  "htm",
  "xhtml",
  "js",
  "mjs",
  "cjs",
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "vbs",
  "ps1",
  "sh",
  "php",
  "jar",
  "wasm",
  "apk",
  "dmg",
  "pkg",
]);

function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() || name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Strip path segments and dangerous characters from a display/storage filename. */
export function sanitizeAttachmentFilename(name: string): string {
  let base = (name || "attachment").split(/[/\\]/).pop() || "attachment";
  base = base.replace(/[\u0000-\u001f\u007f]/g, "");
  base = base.replace(/[<>:"|?*`$;{}]/g, "_");
  base = base.replace(/[\r\n]+/g, " ").trim();
  if (!base || base === "." || base === "..") base = "attachment";
  if (base.length > 180) {
    const ext = extensionOf(base);
    const stem = base.slice(0, 180 - (ext ? ext.length + 1 : 0));
    base = ext ? `${stem}.${ext}` : stem;
  }
  return base;
}

function bytesStartWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((b, i) => bytes[i] === b);
}

function sniffKind(bytes: Uint8Array): "pdf" | "png" | "jpeg" | "zip" | "text" | "unknown" {
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bytesStartWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || bytesStartWith(bytes, [0x50, 0x4b, 0x05, 0x06]))
    return "zip"; // docx/xlsx/etc
  // Reject HTML/SVG masquerading as text
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 256))
    .trimStart()
    .toLowerCase();
  if (
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    head.startsWith("<svg") ||
    head.startsWith("<?xml")
  ) {
    return "unknown";
  }
  // Printable / whitespace heavy → treat as text-ish
  let printable = 0;
  const sample = Math.min(bytes.length, 512);
  for (let i = 0; i < sample; i++) {
    const c = bytes[i];
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126)) printable += 1;
  }
  if (sample > 0 && printable / sample >= 0.85) return "text";
  return "unknown";
}

function magicMatchesExt(ext: string, kind: ReturnType<typeof sniffKind>): boolean {
  switch (ext) {
    case "pdf":
      return kind === "pdf";
    case "png":
      return kind === "png";
    case "jpg":
    case "jpeg":
      return kind === "jpeg";
    case "docx":
    case "xlsx":
      return kind === "zip";
    case "doc":
    case "xls":
      // Legacy OLE compounds vary; allow unknown/text for older office but not html/svg
      return kind === "unknown" || kind === "text" || kind === "zip";
    case "txt":
    case "csv":
      return kind === "text" || kind === "unknown";
    default:
      return false;
  }
}

export type SecureAttachmentResult =
  | { ok: true; attachment: DocumentAttachment }
  | { ok: false; error: string };

/** Validate a user-selected file and build a safe DocumentAttachment. */
export async function readSecureAttachment(
  file: File | null | undefined,
): Promise<SecureAttachmentResult> {
  if (!file) return { ok: false, error: "No file selected." };
  if (file.size <= 0) return { ok: false, error: "Attachment is empty." };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Attachment must be 1.5 MB or smaller." };
  }

  const safeName = sanitizeAttachmentFilename(file.name);
  const ext = extensionOf(safeName);
  if (!ext || BLOCKED_EXT.has(ext) || !(ext in ALLOWED_BY_EXT)) {
    return {
      ok: false,
      error: "File type not allowed. Use PDF, Office, PNG, JPEG, TXT, or CSV.",
    };
  }

  const declared = (file.type || "").toLowerCase().split(";")[0].trim();
  const allowedMimes = ALLOWED_BY_EXT[ext];
  if (declared && !allowedMimes.includes(declared) && declared !== "application/octet-stream") {
    // Some browsers send empty/odd types; only reject clear mismatches
    if (declared.includes("svg") || declared.includes("html") || declared.includes("javascript")) {
      return { ok: false, error: "File type not allowed." };
    }
    if (!allowedMimes.some((m) => declared.startsWith(m.split("/")[0]))) {
      // Allow octet-stream / empty; reject cross-family mismatches like image vs pdf
      const declaredFamily = declared.split("/")[0];
      const allowedFamilies = new Set(allowedMimes.map((m) => m.split("/")[0]));
      if (!allowedFamilies.has(declaredFamily) && declared !== "application/octet-stream") {
        return { ok: false, error: "File type does not match the file extension." };
      }
    }
  }

  const header = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const kind = sniffKind(header);
  if (!magicMatchesExt(ext, kind)) {
    return {
      ok: false,
      error: "File contents do not match a safe attachment type.",
    };
  }

  const canonicalType = allowedMimes[0];
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  }).catch(() => "");

  if (!dataUrl.startsWith("data:")) {
    return { ok: false, error: "Could not read file securely." };
  }

  // Normalize data URL mime to the allowlisted type (prevents spoofed data:text/html;...)
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return { ok: false, error: "Could not read file securely." };
  const payload = dataUrl.slice(comma + 1);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(payload)) {
    return { ok: false, error: "Could not read file securely." };
  }
  const normalized = `data:${canonicalType};base64,${payload.replace(/\s+/g, "")}`;

  if (!assertSafePreviewDataUrl(normalized)) {
    return { ok: false, error: "Attachment failed safety checks." };
  }

  return {
    ok: true,
    attachment: {
      name: safeName,
      size: file.size,
      type: canonicalType,
      dataUrl: normalized,
    },
  };
}

const PREVIEW_IMAGE_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/i;
const PREVIEW_PDF_RE = /^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/i;

/** Only allow embedding known-safe binary data URLs in img/iframe. */
export function assertSafePreviewDataUrl(
  dataUrl: string | undefined | null,
): dataUrl is string {
  if (!dataUrl) return false;
  const compact = dataUrl.replace(/\s+/g, "");
  if (compact.length > MAX_ATTACHMENT_BYTES * 2 + 64) return false;
  return PREVIEW_IMAGE_RE.test(compact) || PREVIEW_PDF_RE.test(compact);
}

export function isSafeImageDataUrl(dataUrl?: string | null): boolean {
  if (!dataUrl) return false;
  return PREVIEW_IMAGE_RE.test(dataUrl.replace(/\s+/g, ""));
}

export function isSafePdfDataUrl(dataUrl?: string | null): boolean {
  if (!dataUrl) return false;
  return PREVIEW_PDF_RE.test(dataUrl.replace(/\s+/g, ""));
}

export function isSafeDownloadDataUrl(dataUrl?: string | null): boolean {
  if (!dataUrl) return false;
  const compact = dataUrl.replace(/\s+/g, "");
  if (!compact.startsWith("data:")) return false;
  if (/data:text\/html/i.test(compact) || /data:image\/svg/i.test(compact)) {
    return false;
  }
  return /^data:[a-z0-9.+/-]+;base64,[A-Za-z0-9+/]+=*$/i.test(compact);
}

export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function sanitizeMimeType(value: string | undefined | null): string {
  const raw = (value || "application/octet-stream").toLowerCase().split(";")[0].trim();
  if (!/^[a-z0-9]+\/[a-z0-9.+-]+$/.test(raw)) return "application/octet-stream";
  if (raw.includes("svg") || raw.includes("html") || raw.includes("javascript")) {
    return "application/octet-stream";
  }
  return raw;
}
