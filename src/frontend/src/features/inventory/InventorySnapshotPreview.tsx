"use client";

import { Download, FileText, Printer } from "lucide-react";
import { Button, Modal, StatusBadge } from "@/components/ui";
import {
  exportInventoryCsv,
  inventorySnapshotTotals,
  printInventorySnapshot,
} from "@/lib/inventory-snapshot";
import { formatWeight } from "@/lib/utils";
import type { InventoryItem, Warehouse } from "@/types";

export function InventorySnapshotPreview({
  open,
  rows,
  company,
  onClose,
}: {
  open: boolean;
  rows: InventoryItem[];
  company?: Pick<Warehouse, "code" | "name"> | null;
  onClose: () => void;
}) {
  const companyLabel = company
    ? `${company.code} — ${company.name}`
    : "Your 3PL company";
  const totals = inventorySnapshotTotals(rows);

  return (
    <Modal
      open={open}
      title="Inventory snapshot"
      description={`${companyLabel} · full on-hand snapshot`}
      onClose={onClose}
      className="max-w-5xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => exportInventoryCsv(rows, company)}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => printInventorySnapshot(rows, company)}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            onClick={() => printInventorySnapshot(rows, company)}
          >
            <FileText className="h-4 w-4" />
            Save as PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[var(--brand-ink)] pb-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
              LogiForge
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Inventory snapshot
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--brand-ink)]">
              {companyLabel}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="bg-[#eef3f8] text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-2 py-2 font-semibold">Material</th>
                <th className="px-2 py-2 font-semibold">Description</th>
                <th className="px-2 py-2 font-semibold">Batch</th>
                <th className="px-2 py-2 font-semibold">Pallet</th>
                <th className="px-2 py-2 font-semibold">Storage Location</th>
                <th className="px-2 py-2 text-right font-semibold">Remaining</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-[var(--muted)]"
                  >
                    No inventory for this 3PL company.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--brand-steel)]/10"
                  >
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)] font-medium">
                      {row.materialCode}
                    </td>
                    <td className="break-words px-2 py-2">
                      {row.materialDescription || "—"}
                    </td>
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                      {row.batchNumber || "—"}
                    </td>
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                      {row.palletId || "—"}
                    </td>
                    <td className="break-words px-2 py-2 font-[family-name:var(--font-mono)]">
                      {row.locationCode || "—"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatWeight(row.remainingWeight)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.quantity}
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
            Lines <strong className="tabular-nums">{totals.lines}</strong>
          </span>
          <span>
            Weight{" "}
            <strong className="tabular-nums">
              {formatWeight(totals.weight)}
            </strong>
          </span>
          <span>
            Qty <strong className="tabular-nums">{totals.qty}</strong>
          </span>
        </div>
      </div>
    </Modal>
  );
}
