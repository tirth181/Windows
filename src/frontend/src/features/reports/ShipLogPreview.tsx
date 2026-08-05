"use client";

import { FileText, Mail, Paperclip, Printer } from "lucide-react";
import { Button, Input, Modal, StatusBadge } from "@/components/ui";
import {
  collectShipLogAttachments,
  companyLabel,
  printShipLog,
  shipLogTotals,
} from "@/lib/ship-log";
import {
  isSafeDownloadDataUrl,
  isSafeImageDataUrl,
  isSafePdfDataUrl,
  sanitizeAttachmentFilename,
} from "@/lib/secure-attachment";
import { formatFileSize, formatShipTo } from "@/lib/ship-to";
import { formatWeight } from "@/lib/utils";
import type { OutboundOrder, Warehouse } from "@/types";

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

export function ShipLogPreview({
  open,
  dayKey,
  onDayChange,
  orders,
  company,
  onClose,
  onEmail,
}: {
  open: boolean;
  dayKey: string;
  onDayChange: (dayKey: string) => void;
  orders: OutboundOrder[];
  company?: Pick<Warehouse, "code" | "name"> | null;
  onClose: () => void;
  onEmail: () => void;
}) {
  const label = companyLabel(company);
  const totals = shipLogTotals(orders);
  const attachments = collectShipLogAttachments(orders);

  return (
    <Modal
      open={open}
      title="Ship Log"
      description={`Outbound shipments by day · ${label}`}
      onClose={onClose}
      className="max-w-5xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEmail}>
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => printShipLog(orders, dayKey, company)}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            onClick={() => printShipLog(orders, dayKey, company)}
          >
            <FileText className="h-4 w-4" />
            Save as PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--brand-ink)] pb-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
              LogiForge
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Ship Log · Outbound shipments by day
            </p>
          </div>
          <div className="w-full max-w-[220px] sm:w-auto">
            <Input
              label="Ship day"
              type="date"
              value={dayKey}
              onChange={(e) => onDayChange(e.target.value)}
            />
          </div>
        </div>

        <p className="text-sm text-[var(--muted)]">
          {label} · all shipments confirmed shipped on this day, including
          outbound document attachments
        </p>

        <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="bg-[#eef3f8] text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-2 py-2 font-semibold">Order</th>
                <th className="px-2 py-2 font-semibold">Customer</th>
                <th className="px-2 py-2 font-semibold">Shipped</th>
                <th className="px-2 py-2 font-semibold">Carrier</th>
                <th className="px-2 py-2 font-semibold">Tracking</th>
                <th className="px-2 py-2 font-semibold">Ship-to</th>
                <th className="px-2 py-2 text-right font-semibold">Weight</th>
                <th className="px-2 py-2 text-right font-semibold">Pallets</th>
                <th className="px-2 py-2 font-semibold">Attachment</th>
                <th className="px-2 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-[var(--muted)]"
                  >
                    No shipments shipped on this day.
                  </td>
                </tr>
              ) : (
                orders.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--brand-steel)]/10"
                  >
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)] font-medium">
                      {row.orderNumber}
                    </td>
                    <td className="break-words px-2 py-2">
                      {row.customerName || "—"}
                    </td>
                    <td className="break-words px-2 py-2 tabular-nums text-[var(--muted)]">
                      {formatWhen(row.shippedAt || row.shipDate)}
                    </td>
                    <td className="break-words px-2 py-2">
                      {row.carrier || "—"}
                    </td>
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                      {row.trackingNumber || "—"}
                    </td>
                    <td className="break-words px-2 py-2">
                      {formatShipTo(row) || "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.totalWeight != null
                        ? formatWeight(row.totalWeight)
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.totalPallets ?? "—"}
                    </td>
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                      {row.attachment?.name || "—"}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Document attachments
          </h2>
          {attachments.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No document attachments on shipments for this day.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {attachments.map((item) => {
                const att = item.attachment;
                return (
                  <li
                    key={`${item.orderId}-${att.name}`}
                    className="rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface)]/60 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Paperclip
                        className="h-4 w-4 shrink-0 text-[var(--accent)]"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--brand-ink)]">
                          <span className="font-[family-name:var(--font-mono)]">
                            {item.orderNumber}
                          </span>
                          {item.customerName ? (
                            <span className="text-[var(--muted)]">
                              {" "}
                              · {item.customerName}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-sm font-medium">
                          {att.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatFileSize(att.size)}
                          {att.type ? ` · ${att.type}` : ""}
                        </p>
                      </div>
                      {isSafeDownloadDataUrl(att.dataUrl) ? (
                        <a
                          href={att.dataUrl}
                          download={sanitizeAttachmentFilename(att.name)}
                          className="text-sm font-medium text-[var(--accent)] hover:underline"
                          rel="noopener"
                        >
                          Download
                        </a>
                      ) : null}
                    </div>
                    {isSafeImageDataUrl(att.dataUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={att.dataUrl}
                        alt={sanitizeAttachmentFilename(att.name)}
                        className="max-h-[320px] w-full rounded border border-[var(--brand-steel)]/10 bg-white object-contain"
                      />
                    ) : null}
                    {isSafePdfDataUrl(att.dataUrl) ? (
                      <iframe
                        title={sanitizeAttachmentFilename(att.name)}
                        src={att.dataUrl}
                        sandbox=""
                        className="h-[320px] w-full rounded border border-[var(--brand-steel)]/10 bg-white"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--brand-ink)]">
          <span>
            Shipments{" "}
            <strong className="tabular-nums">{totals.shipments}</strong>
          </span>
          <span>
            Weight{" "}
            <strong className="tabular-nums">
              {formatWeight(totals.weight)}
            </strong>
          </span>
          <span>
            Pallets <strong className="tabular-nums">{totals.pallets}</strong>
          </span>
          <span>
            Lines <strong className="tabular-nums">{totals.lines}</strong>
          </span>
          <span>
            Attachments{" "}
            <strong className="tabular-nums">{attachments.length}</strong>
          </span>
        </div>
      </div>
    </Modal>
  );
}
