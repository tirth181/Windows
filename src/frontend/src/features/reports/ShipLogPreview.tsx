"use client";

import { FileText, Mail, Printer } from "lucide-react";
import { Button, Input, Modal, StatusBadge } from "@/components/ui";
import {
  companyLabel,
  printShipLog,
  shipLogTotals,
} from "@/lib/ship-log";
import { formatShipTo } from "@/lib/ship-to";
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
          {label} · all shipments confirmed shipped on this day
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
                <th className="px-2 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
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
                    <td className="px-2 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
        </div>
      </div>
    </Modal>
  );
}
