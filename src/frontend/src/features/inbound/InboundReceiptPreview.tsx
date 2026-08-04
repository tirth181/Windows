"use client";

import { FileText, Mail, Paperclip, Printer } from "lucide-react";
import { Button, Modal, StatusBadge } from "@/components/ui";
import {
  isSafeDownloadDataUrl,
  isSafeImageDataUrl,
  isSafePdfDataUrl,
  sanitizeAttachmentFilename,
} from "@/lib/secure-attachment";
import { formatFileSize } from "@/lib/ship-to";
import { printInboundReceipt } from "@/lib/print-document";
import { formatWeight } from "@/lib/utils";
import type { InboundLoad } from "@/types";

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

export function InboundReceiptPreview({
  open,
  load,
  onClose,
  onDone,
  onEmail,
}: {
  open: boolean;
  load: InboundLoad | null;
  onClose: () => void;
  /** Optional primary close after save (e.g. return to list). */
  onDone?: () => void;
  onEmail?: (load: InboundLoad) => void;
}) {
  if (!load) return null;

  const lines = (load.lines || []).filter((l) => l.materialCode);
  const plantLabel = load.storagePlantName
    ? `${load.storageLocationCode || ""} — ${load.storagePlantName}`.replace(
        /^ — /,
        "",
      )
    : load.storageLocationCode || "—";

  function handlePrintOrPdf() {
    printInboundReceipt(load!);
  }

  return (
    <Modal
      open={open}
      title={`Receipt preview · ${load.loadNumber || "Inbound"}`}
      description="Review the full receipt, then print, email, or save as PDF."
      onClose={onClose}
      className="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {onDone ? (
            <Button type="button" variant="secondary" onClick={onDone}>
              Done
            </Button>
          ) : null}
          {onEmail ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onEmail(load)}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={handlePrintOrPdf}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" onClick={handlePrintOrPdf}>
            <FileText className="h-4 w-4" />
            Save as PDF
          </Button>
        </>
      }
    >
      <div className="inbound-receipt-preview space-y-5 text-[var(--brand-ink)]">
        <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--brand-ink)] pb-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
              LogiForge
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Inbound receipt
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-mono)] text-lg font-semibold">
              {load.loadNumber || "—"}
            </p>
            <div className="mt-1 flex justify-end">
              <StatusBadge status={load.status} />
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Header
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Meta label="3PL company" value={load.warehouseName || "—"} />
            <Meta label="Storage plant" value={plantLabel} />
            <Meta label="Arrival" value={formatWhen(load.arrivalDate)} />
            <Meta label="Supplier" value={load.supplierName || "—"} />
            <Meta label="Carrier" value={load.carrier || "—"} />
            <Meta
              label="Trailer #"
              value={load.trailerNumber || "—"}
              mono
            />
            {load.receivedAt ? (
              <Meta label="Received at" value={formatWhen(load.receivedAt)} />
            ) : null}
            {load.notes ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
                  Notes
                </label>
                <p className="mt-0.5 whitespace-pre-wrap text-sm font-medium">
                  {load.notes}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Material lines
          </h2>
          <div className="mt-2 rounded-md border border-[var(--brand-steel)]/15">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-[#eef3f8] text-[10px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-2 py-2 font-semibold">Material</th>
                  <th className="px-2 py-2 font-semibold">Description</th>
                  <th className="px-2 py-2 font-semibold">Batch</th>
                  <th className="px-2 py-2 font-semibold">Pallet</th>
                  <th className="px-2 py-2 font-semibold">Storage location</th>
                  <th className="px-2 py-2 text-right font-semibold">Weight</th>
                  <th className="px-2 py-2 text-right font-semibold">Qty</th>
                  <th className="px-2 py-2 text-right font-semibold">Boxes</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-[var(--muted)]"
                    >
                      No material lines
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.id} className="border-t border-[var(--brand-steel)]/10">
                      <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)] font-medium">
                        {line.materialCode}
                      </td>
                      <td className="break-words px-2 py-2">
                        {line.materialDescription || "—"}
                      </td>
                      <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                        {line.batchNumber || "—"}
                      </td>
                      <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                        {line.palletId || "—"}
                      </td>
                      <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                        {line.locationCode || "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatWeight(line.weight)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {line.boxCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="totals mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              Lines <strong>{lines.length}</strong>
            </span>
            <span>
              Weight{" "}
              <strong>
                {formatWeight(
                  load.totalWeight ??
                    lines.reduce((s, l) => s + (Number(l.weight) || 0), 0),
                )}
              </strong>
            </span>
            <span>
              Qty{" "}
              <strong>
                {lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)}
              </strong>
            </span>
            <span>
              Boxes/drums{" "}
              <strong>
                {lines.reduce((s, l) => s + (Number(l.boxCount) || 0), 0)}
              </strong>
            </span>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Document attachment
          </h2>
          {load.attachment ? (
            <div className="attach mt-2 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface)]/60 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{load.attachment.name}</p>
                  <p className="muted text-xs text-[var(--muted)]">
                    {formatFileSize(load.attachment.size)}
                    {load.attachment.type ? ` · ${load.attachment.type}` : ""}
                  </p>
                </div>
                {isSafeDownloadDataUrl(load.attachment.dataUrl) ? (
                  <a
                    href={load.attachment.dataUrl}
                    download={sanitizeAttachmentFilename(load.attachment.name)}
                    className="ml-auto text-sm font-medium text-[var(--accent)] hover:underline"
                    rel="noopener"
                  >
                    Download
                  </a>
                ) : null}
              </div>
              {isSafeImageDataUrl(load.attachment.dataUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={load.attachment.dataUrl}
                  alt={sanitizeAttachmentFilename(load.attachment.name)}
                  className="max-h-[420px] w-full rounded border border-[var(--brand-steel)]/10 object-contain bg-white"
                />
              ) : null}
              {isSafePdfDataUrl(load.attachment.dataUrl) ? (
                <iframe
                  title={sanitizeAttachmentFilename(load.attachment.name)}
                  src={load.attachment.dataUrl}
                  sandbox=""
                  className="h-[420px] w-full rounded border border-[var(--brand-steel)]/10 bg-white"
                />
              ) : null}
            </div>
          ) : (
            <p className="muted mt-2 text-sm text-[var(--muted)]">
              No document attached to this receipt.
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="meta-item">
      <label className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </label>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          mono ? "font-[family-name:var(--font-mono)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
