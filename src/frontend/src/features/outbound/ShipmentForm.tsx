"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type CellValueChangedEvent,
} from "ag-grid-community";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button, Input, Select, PageHeader } from "@/components/ui";
import { DEMO_CUSTOMERS, DEMO_INVENTORY, DEMO_WAREHOUSES } from "@/lib/mock-data";
import { formatWeight } from "@/lib/utils";
import type { OutboundLine } from "@/types";
import { useAuthStore } from "@/stores/auth-store";

ModuleRegistry.registerModules([AllCommunityModule]);

function lineFromInventory(invId?: string): OutboundLine {
  const inv = DEMO_INVENTORY.find((i) => i.id === invId) || DEMO_INVENTORY[0];
  return {
    id: crypto.randomUUID(),
    inventoryItemId: inv?.id,
    materialCode: inv?.materialCode || "",
    materialDescription: inv?.materialDescription || "",
    batchNumber: inv?.batchNumber || "",
    palletId: inv?.palletId || "",
    weight: inv ? Math.min(inv.remainingWeight, 500) : 0,
    quantity: inv ? Math.min(inv.quantity, 10) : 0,
    boxCount: inv?.boxCount ? Math.min(inv.boxCount, 5) : 0,
  };
}

export function ShipmentForm() {
  const router = useRouter();
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || DEMO_WAREHOUSES[0]?.id || "",
  );
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMERS[0]?.id || "");
  const [shipDate, setShipDate] = useState(new Date().toISOString().slice(0, 16));
  const [carrier, setCarrier] = useState("");
  const [destination, setDestination] = useState("");
  const [lines, setLines] = useState<OutboundLine[]>([
    lineFromInventory("inv-2"),
    lineFromInventory("inv-1"),
  ]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const columnDefs = useMemo<ColDef<OutboundLine>[]>(
    () => [
      {
        field: "inventoryItemId",
        headerName: "Inventory pick",
        editable: true,
        flex: 1.2,
        minWidth: 160,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: DEMO_INVENTORY.map((i) => i.id),
        },
        valueFormatter: (p) => {
          const inv = DEMO_INVENTORY.find((i) => i.id === p.value);
          return inv ? `${inv.materialCode} / ${inv.palletId}` : String(p.value || "");
        },
      },
      { field: "materialCode", headerName: "Material", flex: 1, minWidth: 120 },
      { field: "batchNumber", headerName: "Batch", flex: 1, minWidth: 110, cellClass: "font-mono text-xs" },
      { field: "palletId", headerName: "Pallet", flex: 1, minWidth: 110, cellClass: "font-mono text-xs" },
      {
        field: "weight",
        headerName: "Weight (lbs)",
        editable: true,
        type: "numericColumn",
        flex: 0.9,
        minWidth: 110,
      },
      {
        field: "quantity",
        headerName: "Qty",
        editable: true,
        type: "numericColumn",
        flex: 0.7,
        minWidth: 90,
      },
      {
        field: "boxCount",
        headerName: "Boxes/drums",
        editable: true,
        type: "numericColumn",
        flex: 0.7,
        minWidth: 90,
      },
    ],
    [],
  );

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<OutboundLine>) => {
    if (!e.data) return;
    let next = { ...e.data };
    if (e.colDef.field === "inventoryItemId") {
      const inv = DEMO_INVENTORY.find((i) => i.id === next.inventoryItemId);
      if (inv) {
        next = {
          ...next,
          materialCode: inv.materialCode,
          materialDescription: inv.materialDescription,
          batchNumber: inv.batchNumber,
          palletId: inv.palletId,
        };
      }
    }
    setLines((prev) => prev.map((row) => (row.id === next.id ? next : row)));
  }, []);

  const totals = useMemo(() => {
    const weight = lines.reduce((s, l) => s + (Number(l.weight) || 0), 0);
    const qty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const boxes = lines.reduce((s, l) => s + (Number(l.boxCount) || 0), 0);
    const pallets = new Set(lines.map((l) => l.palletId).filter(Boolean)).size;
    const materials = new Set(lines.map((l) => l.materialCode).filter(Boolean)).size;
    return { weight, qty, boxes, pallets, materials };
  }, [lines]);

  const canShip =
    Boolean(warehouseId && customerId && destination) &&
    lines.some((l) => l.materialCode && l.weight > 0);

  async function confirmShip() {
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setDone(true);
      setConfirmOpen(false);
      setTimeout(() => router.push("/outbound"), 900);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <PageHeader
        title="Ship outbound"
        description="Select inventory lines, review totals, and confirm shipment."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Select
          label="Warehouse"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          options={(warehouses.length ? warehouses : DEMO_WAREHOUSES).map((w) => ({
            value: w.id,
            label: `${w.code} — ${w.name}`,
          }))}
        />
        <Select
          label="Customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={DEMO_CUSTOMERS.filter((c) => c.isActive).map((c) => ({
            value: c.id,
            label: `${c.code} — ${c.name}`,
          }))}
        />
        <Input
          label="Ship date"
          type="datetime-local"
          value={shipDate}
          onChange={(e) => setShipDate(e.target.value)}
        />
        <Input
          label="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="Carrier"
        />
        <Input
          label="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ship-to location"
          className="md:col-span-2 xl:col-span-2"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Shipment lines
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLines((prev) => [...prev, lineFromInventory()])}
        >
          <Plus className="h-4 w-4" />
          Add line
        </Button>
      </div>

      <div className="ag-theme-quartz h-[360px] w-full overflow-hidden rounded-md border border-[var(--brand-steel)]/15">
        <AgGridReact<OutboundLine>
          theme="legacy"
          rowData={lines}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onCellValueChanged={onCellValueChanged}
          defaultColDef={{ resizable: true, editable: true }}
          stopEditingWhenCellsLoseFocus
          singleClickEdit
          animateRows
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--brand-ink)]">
          <span>
            Weight <strong className="tabular-nums">{formatWeight(totals.weight)}</strong>
          </span>
          <span>
            Pallets <strong className="tabular-nums">{totals.pallets}</strong>
          </span>
          <span>
            Materials <strong className="tabular-nums">{totals.materials}</strong>
          </span>
          <span>
            Boxes/drums{" "}
            <strong className="tabular-nums">{totals.boxes}</strong>
          </span>
        </div>
        <Button
          size="lg"
          disabled={!canShip || submitting || done}
          onClick={() => setConfirmOpen(true)}
          className="min-w-[180px]"
        >
          {done ? (
            <>
              <CheckCircle2 className="h-5 w-5 animate-pulse" />
              Shipped
            </>
          ) : (
            "Confirm shipment"
          )}
        </Button>
      </footer>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--brand-ink)]/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-ship-title"
        >
          <div className="w-full max-w-md rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] p-5 shadow-xl">
            <h3
              id="confirm-ship-title"
              className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-ink)]"
            >
              Confirm shipment?
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This will allocate {totals.materials} materials totaling{" "}
              {formatWeight(totals.weight)} across {totals.pallets} pallets.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={confirmShip} disabled={submitting}>
                {submitting ? "Shipping…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
