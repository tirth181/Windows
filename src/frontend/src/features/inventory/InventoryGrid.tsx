"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type RowClassParams,
} from "ag-grid-community";
import { Download, SlidersHorizontal } from "lucide-react";
import { apiFetch, apiFetchOrDemo } from "@/lib/api";
import { DEMO_CUSTOMERS, DEMO_INVENTORY, DEMO_WAREHOUSES } from "@/lib/mock-data";
import { loadDemoCollection, upsertDemoItem } from "@/lib/demo-store";
import type { InventoryItem, InventoryStatus } from "@/types";
import {
  Button,
  DemoBanner,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
} from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "Available", label: "Available" },
  { value: "Reserved", label: "Reserved" },
  { value: "Partial", label: "Partial" },
  { value: "Hold", label: "Hold" },
  { value: "Damaged", label: "Damaged" },
  { value: "Shipped", label: "Shipped" },
];

function deriveStatus(
  remainingWeight: number,
  originalWeight: number,
  previous: InventoryStatus,
): InventoryStatus {
  if (remainingWeight <= 0) return "Shipped";
  if (remainingWeight < originalWeight && remainingWeight > 0) return "Partial";
  if (previous === "Partial" && remainingWeight >= originalWeight) return "Available";
  return previous === "Shipped" ? "Available" : previous;
}

export function InventoryGrid() {
  const canAdjust = useAuthStore(
    (s) => s.hasPermission("inventory.adjust") || s.hasPermission("admin.full"),
  );
  const [rows, setRows] = useState<InventoryItem[]>(DEMO_INVENTORY);
  const [demo, setDemo] = useState(true);
  const [material, setMaterial] = useState("");
  const [batch, setBatch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [location, setLocation] = useState("");
  const [pallet, setPallet] = useState("");
  const [status, setStatus] = useState("");
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [weightDelta, setWeightDelta] = useState("0");
  const [qtyDelta, setQtyDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadDemoCollection("inventory", DEMO_INVENTORY);
      const result = await apiFetchOrDemo<{ items: InventoryItem[] } | InventoryItem[]>(
        "/inventory",
        local,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
      setRows(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdjust = useCallback((item: InventoryItem) => {
    setAdjustItem(item);
    setWeightDelta("0");
    setQtyDelta("0");
    setReason("");
    setError(null);
  }, []);

  async function handleAdjust() {
    if (!adjustItem) return;
    const wDelta = Number(weightDelta) || 0;
    const qDelta = Number(qtyDelta) || 0;
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    if (wDelta === 0 && qDelta === 0) {
      setError("Enter a non-zero weight or quantity delta.");
      return;
    }
    setSaving(true);
    setError(null);

    const remainingWeight = Math.max(0, adjustItem.remainingWeight + wDelta);
    const quantity = Math.max(0, adjustItem.quantity + qDelta);
    const nextStatus = deriveStatus(
      remainingWeight,
      adjustItem.originalWeight,
      adjustItem.status,
    );
    const updated: InventoryItem = {
      ...adjustItem,
      remainingWeight,
      quantity,
      status: nextStatus,
      lastUpdatedAt: new Date().toISOString(),
    };

    const payload = {
      inventoryItemId: adjustItem.id,
      weightDelta: wDelta,
      quantityDelta: qDelta,
      reason: reason.trim(),
    };

    try {
      await apiFetch("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      const next = upsertDemoItem("inventory", DEMO_INVENTORY, updated);
      setRows(next);
      setDemo(true);
    } finally {
      setSaving(false);
      setAdjustItem(null);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (
        material &&
        !row.materialCode.toLowerCase().includes(material.toLowerCase()) &&
        !row.materialDescription.toLowerCase().includes(material.toLowerCase())
      ) {
        return false;
      }
      if (batch && !row.batchNumber.toLowerCase().includes(batch.toLowerCase())) return false;
      if (customerId && row.customerId !== customerId) return false;
      if (warehouseId && row.warehouseId !== warehouseId) return false;
      if (location && !(row.locationCode || "").toLowerCase().includes(location.toLowerCase())) {
        return false;
      }
      if (pallet && !(row.palletId || "").toLowerCase().includes(pallet.toLowerCase())) {
        return false;
      }
      if (status && row.status !== (status as InventoryStatus)) return false;
      return true;
    });
  }, [rows, material, batch, customerId, warehouseId, location, pallet, status]);

  const columnDefs = useMemo<ColDef<InventoryItem>[]>(
    () => [
      { field: "materialCode", headerName: "Material", flex: 1.1, minWidth: 130 },
      { field: "materialDescription", headerName: "Description", flex: 1.4, minWidth: 160 },
      {
        field: "batchNumber",
        headerName: "Batch",
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
      },
      {
        field: "palletId",
        headerName: "Pallet",
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
      },
      { field: "customerName", headerName: "Customer", flex: 1.1, minWidth: 140 },
      { field: "warehouseName", headerName: "3PL company", flex: 1, minWidth: 120 },
      { field: "locationCode", headerName: "Slot", flex: 0.9, minWidth: 100 },
      {
        field: "remainingWeight",
        headerName: "Remaining lbs",
        type: "numericColumn",
        flex: 0.9,
        minWidth: 120,
      },
      {
        field: "quantity",
        headerName: "Qty",
        type: "numericColumn",
        flex: 0.7,
        minWidth: 80,
      },
      {
        field: "boxCount",
        headerName: "Boxes/drums",
        type: "numericColumn",
        flex: 0.9,
        minWidth: 120,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.9,
        minWidth: 120,
        cellRenderer: (p: { value: InventoryStatus }) => (
          <StatusBadge status={p.value} />
        ),
      },
      ...(canAdjust
        ? [
            {
              headerName: "Actions",
              colId: "actions",
              flex: 0.9,
              minWidth: 110,
              sortable: false,
              filter: false,
              cellRenderer: (p: ICellRendererParams<InventoryItem>) => {
                if (!p.data) return null;
                return (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--brand-steel)]/25 bg-[var(--surface-raised)] px-2 py-1 text-xs font-medium text-[var(--brand-ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    onClick={() => openAdjust(p.data!)}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Adjust
                  </button>
                );
              },
            } satisfies ColDef<InventoryItem>,
          ]
        : []),
    ],
    [canAdjust, openAdjust],
  );

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <PageHeader
        title="Inventory"
        description="Filter on-hand stock. Partial rows are highlighted for floor attention."
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />
      <DemoBanner show={demo} />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Input
          label="Material"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="Code or description"
        />
        <Input
          label="Batch"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="Batch number"
          className="font-[family-name:var(--font-mono)]"
        />
        <Select
          label="Customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={[
            { value: "", label: "All customers" },
            ...DEMO_CUSTOMERS.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          label="3PL company"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          options={[
            { value: "", label: "All 3PL companies" },
            ...DEMO_WAREHOUSES.map((w) => ({
              value: w.id,
              label: w.name,
            })),
          ]}
        />
        <Input
          label="Slot"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Slot code"
        />
        <Input
          label="Pallet"
          value={pallet}
          onChange={(e) => setPallet(e.target.value)}
          placeholder="Pallet ID"
          className="font-[family-name:var(--font-mono)]"
        />
        <div className="xl:col-span-2">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <p className="text-sm text-[var(--muted)]">
        Showing{" "}
        <span className="font-medium text-[var(--brand-ink)] tabular-nums">
          {filtered.length}
        </span>{" "}
        of {rows.length} items
        {filtered.some((r) => r.status === "Partial")
          ? " · Partial rows marked with amber edge"
          : null}
      </p>

      <div className="ag-theme-quartz h-[480px] w-full overflow-hidden rounded-md border border-[var(--brand-steel)]/15">
        <AgGridReact<InventoryItem>
          theme="legacy"
          rowData={filtered}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          getRowClass={(params: RowClassParams<InventoryItem>) =>
            params.data?.status === "Partial" ? "lf-row-partial" : undefined
          }
          animateRows
        />
      </div>

      <Modal
        open={Boolean(adjustItem)}
        title="Adjust inventory"
        description={
          adjustItem
            ? `${adjustItem.materialCode} · ${adjustItem.palletId || "no pallet"} · ${adjustItem.remainingWeight} lbs on hand`
            : undefined
        }
        onClose={() => !saving && setAdjustItem(null)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              disabled={saving}
              onClick={() => setAdjustItem(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={handleAdjust}>
              {saving ? "Saving…" : "Apply adjustment"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <Input
            label="Weight delta (lbs)"
            type="number"
            value={weightDelta}
            onChange={(e) => setWeightDelta(e.target.value)}
            hint="Positive increases on-hand; negative decreases."
          />
          <Input
            label="Quantity delta"
            type="number"
            value={qtyDelta}
            onChange={(e) => setQtyDelta(e.target.value)}
          />
          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cycle count, damage, correction…"
          />
        </div>
      </Modal>
    </div>
  );
}
