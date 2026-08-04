"use client";

import { useRef } from "react";
import { FileText, Paperclip, Printer } from "lucide-react";
import { Button, Modal, StatusBadge } from "@/components/ui";
import { formatFileSize } from "@/lib/ship-to";
import { printElementAsDocument } from "@/lib/print-document";
import { formatWeight } from "@/lib/utils";
import type { DocumentAttachment, InboundLoad } from "@/types";

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

function isImage(att: DocumentAttachment): boolean {
  return (
    att.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(att.name)
  );
}

function isPdf(att: DocumentAttachment): boolean {
  return att.type === "application/pdf" || /\.pdf$/i.test(att.name);
}

export function InboundReceiptPreview({
  open,
  load,
  onClose,
  onDone,
}: {
  open: boolean;
  load: InboundLoad | null;
  onClose: () => void;
  /** Optional primary close after save (e.g. return to list). */
  onDone?: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!load) return null;

  const lines = (load.lines || []).filter((l) => l.materialCode);
  const plantLabel = load.storagePlantName
    ? `${load.storageLocationCode || ""} — ${load.storagePlantName}`.replace(
        /^ — /,
        "",
      )
    : load.storageLocationCode || "—";

  function handlePrintOrPdf() {
    printElementAsDocument(
      printRef.current,
      `Inbound ${load!.loadNumber || "receipt"}`,
    );
  }

  return (
    <Modal
      open={open}
      title={`Receipt preview · ${load.loadNumber || "Inbound"}`}
      description="Review the full receipt, then print or save as PDF."
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
      <div ref={printRef} className="inbound-receipt-preview space-y-5 text-[var(--brand-ink)]">
        <div className="brand flex items-start justify-between gap-3 border-b-2 border-[var(--brand-ink)] pb-3">
          <div>
            <p className="brand-mark font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
              LogiForge
            </p>
            <p className="muted text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Inbound receipt
            </p>
          </div>
          <div className="text-right">
            <p className="mono font-[family-name:var(--font-mono)] text-lg font-semibold">
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
          <div className="grid-meta mt-2 grid gap-3 sm:grid-cols-2">
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
              <div className="meta-item sm:col-span-2">
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
          <div className="mt-2 overflow-x-auto rounded-md border border-[var(--brand-steel)]/15">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#eef3f8] text-[10px] uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Material</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 font-semibold">Batch</th>
                  <th className="px-3 py-2 font-semibold">Pallet</th>
                  <th className="px-3 py-2 font-semibold">Storage location</th>
                  <th className="px-3 py-2 font-semibold">Weight</th>
                  <th className="px-3 py-2 font-semibold">Qty</th>
                  <th className="px-3 py-2 font-semibold">Boxes</th>
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
                      <td className="mono px-3 py-2 font-[family-name:var(--font-mono)] font-medium">
                        {line.materialCode}
                      </td>
                      <td className="px-3 py-2">{line.materialDescription || "—"}</td>
                      <td className="mono px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                        {line.batchNumber || "—"}
                      </td>
                      <td className="mono px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                        {line.palletId || "—"}
                      </td>
                      <td className="mono px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                        {line.locationCode || "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatWeight(line.weight)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{line.quantity}</td>
                      <td className="px-3 py-2 tabular-nums">{line.boxCount}</td>
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
                {load.attachment.dataUrl ? (
                  <a
                    href={load.attachment.dataUrl}
                    download={load.attachment.name}
                    className="ml-auto text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    Download
                  </a>
                ) : null}
              </div>
              {load.attachment.dataUrl && isImage(load.attachment) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={load.attachment.dataUrl}
                  alt={load.attachment.name}
                  className="max-h-[420px] w-full rounded border border-[var(--brand-steel)]/10 object-contain bg-white"
                />
              ) : null}
              {load.attachment.dataUrl && isPdf(load.attachment) ? (
                <iframe
                  title={load.attachment.name}
                  src={load.attachment.dataUrl}
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
