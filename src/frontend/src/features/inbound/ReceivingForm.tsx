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
import { DEMO_CUSTOMERS, DEMO_WAREHOUSES } from "@/lib/mock-data";
import { formatWeight } from "@/lib/utils";
import type { InboundLine } from "@/types";
import { useAuthStore } from "@/stores/auth-store";

ModuleRegistry.registerModules([AllCommunityModule]);

function newLine(): InboundLine {
  return {
    id: crypto.randomUUID(),
    materialCode: "",
    materialDescription: "",
    batchNumber: "",
    palletId: "",
    locationCode: "",
    weight: 0,
    quantity: 0,
    boxCount: 0,
  };
}

export function ReceivingForm() {
  const router = useRouter();
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || DEMO_WAREHOUSES[0]?.id || "",
  );
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMERS[0]?.id || "");
  const [supplierName, setSupplierName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [arrivalDate, setArrivalDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InboundLine[]>([newLine(), newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, newLine()]);
  }, []);

  const columnDefs = useMemo<ColDef<InboundLine>[]>(
    () => [
      { field: "materialCode", headerName: "Material", editable: true, flex: 1.1, minWidth: 130 },
      { field: "materialDescription", headerName: "Description", editable: true, flex: 1.4, minWidth: 160 },
      {
        field: "batchNumber",
        headerName: "Batch",
        editable: true,
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
      },
      {
        field: "palletId",
        headerName: "Pallet ID",
        editable: true,
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
      },
      { field: "locationCode", headerName: "Location", editable: true, flex: 0.9, minWidth: 110 },
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
        flex: 1,
        minWidth: 120,
      },
    ],
    [],
  );

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<InboundLine>) => {
    if (!e.data) return;
    setLines((prev) => prev.map((row) => (row.id === e.data!.id ? { ...e.data! } : row)));
  }, []);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.weight += Number(line.weight) || 0;
        acc.qty += Number(line.quantity) || 0;
        acc.boxes += Number(line.boxCount) || 0;
        acc.materials += line.materialCode ? 1 : 0;
        return acc;
      },
      { weight: 0, qty: 0, boxes: 0, materials: 0 },
    );
  }, [lines]);

  const canReceive =
    Boolean(warehouseId && customerId) &&
    lines.some((l) => l.materialCode && (l.weight > 0 || l.quantity > 0));

  async function handleReceive() {
    if (!canReceive) return;
    setSubmitting(true);
    try {
      // Demo mode: simulate receive success when API is unavailable
      await new Promise((r) => setTimeout(r, 500));
      setDone(true);
      setTimeout(() => router.push("/inbound"), 900);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <PageHeader
        title="New receiving"
        description="Capture load header, scan material lines, then receive into inventory."
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
          label="Arrival"
          type="datetime-local"
          value={arrivalDate}
          onChange={(e) => setArrivalDate(e.target.value)}
        />
        <Input
          label="Supplier"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="Supplier / vendor name"
        />
        <Input
          label="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="Carrier"
        />
        <Input
          label="Trailer #"
          value={trailerNumber}
          onChange={(e) => setTrailerNumber(e.target.value)}
          placeholder="Trailer number"
          className="font-[family-name:var(--font-mono)]"
        />
        <div className="md:col-span-2 xl:col-span-3">
          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional receiving notes"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Material lines
        </h2>
        <Button variant="outline" size="sm" type="button" onClick={addLine}>
          <Plus className="h-4 w-4" />
          Add line
        </Button>
      </div>

      <div className="ag-theme-quartz h-[360px] w-full overflow-hidden rounded-md border border-[var(--brand-steel)]/15">
        <AgGridReact<InboundLine>
          theme="legacy"
          rowData={lines}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onCellValueChanged={onCellValueChanged}
          defaultColDef={{
            resizable: true,
            sortable: false,
            editable: true,
          }}
          stopEditingWhenCellsLoseFocus
          singleClickEdit
          animateRows
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      <footer className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--brand-ink)]">
          <span>
            Materials{" "}
            <strong className="tabular-nums">{totals.materials}</strong>
          </span>
          <span>
            Weight{" "}
            <strong className="tabular-nums">{formatWeight(totals.weight)}</strong>
          </span>
          <span>
            Qty <strong className="tabular-nums">{totals.qty}</strong>
          </span>
          <span>
            Boxes/drums{" "}
            <strong className="tabular-nums">{totals.boxes}</strong>
          </span>
        </div>
        <Button
          size="lg"
          disabled={!canReceive || submitting || done}
          onClick={handleReceive}
          className="min-w-[160px]"
        >
          {done ? (
            <>
              <CheckCircle2 className="h-5 w-5 animate-pulse" />
              Received
            </>
          ) : submitting ? (
            "Receiving…"
          ) : (
            "Receive"
          )}
        </Button>
      </footer>
    </div>
  );
}
