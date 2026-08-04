"use client";

import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type RowClassParams,
} from "ag-grid-community";
import { Download } from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_CUSTOMERS, DEMO_INVENTORY, DEMO_WAREHOUSES } from "@/lib/mock-data";
import type { InventoryItem, InventoryStatus } from "@/types";
import {
  Button,
  DemoBanner,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "@/components/ui";

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

export function InventoryGrid() {
  const [rows, setRows] = useState<InventoryItem[]>(DEMO_INVENTORY);
  const [demo, setDemo] = useState(true);
  const [material, setMaterial] = useState("");
  const [batch, setBatch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [location, setLocation] = useState("");
  const [pallet, setPallet] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<{ items: InventoryItem[] } | InventoryItem[]>(
        "/inventory",
        DEMO_INVENTORY,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? DEMO_INVENTORY;
      setRows(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (material && !row.materialCode.toLowerCase().includes(material.toLowerCase()) &&
          !row.materialDescription.toLowerCase().includes(material.toLowerCase())) {
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
      { field: "warehouseName", headerName: "Warehouse", flex: 1, minWidth: 120 },
      { field: "locationCode", headerName: "Location", flex: 0.9, minWidth: 100 },
      {
        field: "remainingWeight",
        headerName: "Remaining kg",
        type: "numericColumn",
        flex: 0.9,
        minWidth: 110,
      },
      {
        field: "quantity",
        headerName: "Qty",
        type: "numericColumn",
        flex: 0.7,
        minWidth: 80,
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
    ],
    [],
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
          label="Warehouse"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          options={[
            { value: "", label: "All warehouses" },
            ...DEMO_WAREHOUSES.map((w) => ({
              value: w.id,
              label: w.code,
            })),
          ]}
        />
        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location code"
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
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
