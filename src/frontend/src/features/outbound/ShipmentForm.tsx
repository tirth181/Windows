"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type CellValueChangedEvent,
} from "ag-grid-community";
import { Plus, CheckCircle2, Save } from "lucide-react";
import { Button, Input, Select, PageHeader, TypeaheadInput } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import {
  DEMO_CUSTOMERS,
  DEMO_INVENTORY,
  DEMO_OUTBOUND,
  DEMO_WAREHOUSES,
} from "@/lib/mock-data";
import { getDemoItem, upsertDemoItem } from "@/lib/demo-store";
import {
  loadKnownCustomers,
  resolveOrRememberCustomer,
} from "@/lib/customers";
import { formatWeight } from "@/lib/utils";
import type { Customer, OutboundLine, OutboundOrder } from "@/types";
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

function linesFromOrder(order?: OutboundOrder | null): OutboundLine[] {
  if (order?.lines?.length) {
    return order.lines.map((l) => ({ ...l, id: l.id || crypto.randomUUID() }));
  }
  if (order) {
    return [
      {
        ...lineFromInventory(),
        weight: order.totalWeight ?? 0,
        quantity: order.lineCount ?? 1,
      },
    ];
  }
  return [lineFromInventory("inv-2"), lineFromInventory("inv-1")];
}

interface ShipmentFormProps {
  orderId?: string;
}

export function ShipmentForm({ orderId }: ShipmentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(orderId);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const canEdit = useAuthStore(
    (s) => s.hasPermission("outbound.edit") || s.hasPermission("admin.full"),
  );
  const canShip = useAuthStore(
    (s) => s.hasPermission("outbound.ship") || s.hasPermission("admin.full"),
  );

  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState<OutboundOrder["status"]>("Draft");
  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || DEMO_WAREHOUSES[0]?.id || "",
  );
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [knownCustomers, setKnownCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [shipDate, setShipDate] = useState("");
  const [carrier, setCarrier] = useState("");
  const [destination, setDestination] = useState("");
  const [lines, setLines] = useState<OutboundLine[]>([
    lineFromInventory("inv-2"),
    lineFromInventory("inv-1"),
  ]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  const readOnly = isEdit && status !== "Draft" && status !== "Picking";

  useEffect(() => {
    setKnownCustomers(loadKnownCustomers());
  }, []);

  useEffect(() => {
    if (orderId) return;
    setShipDate(new Date().toISOString().slice(0, 16));
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let order: OutboundOrder | undefined;
        try {
          order = await apiFetch<OutboundOrder>(`/outbound/${orderId}`);
        } catch {
          order = getDemoItem("outbound", DEMO_OUTBOUND, orderId);
        }
        if (cancelled || !order) {
          if (!cancelled) {
            setMessage("Outbound order not found.");
            setLoading(false);
          }
          return;
        }
        setOrderNumber(order.orderNumber);
        setStatus(order.status);
        setWarehouseId(order.warehouseId);
        setCustomerId(order.customerId);
        const known = loadKnownCustomers();
        setKnownCustomers(known);
        setCustomerName(
          order.customerName ||
            known.find((c) => c.id === order.customerId)?.name ||
            "",
        );
        setShipDate(new Date(order.shipDate).toISOString().slice(0, 16));
        setCarrier(order.carrier || "");
        setDestination(order.destination || "");
        setLines(linesFromOrder(order));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const columnDefs = useMemo<ColDef<OutboundLine>[]>(
    () => [
      {
        field: "inventoryItemId",
        headerName: "Inventory pick",
        editable: !readOnly,
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
      {
        field: "batchNumber",
        headerName: "Batch",
        flex: 1,
        minWidth: 110,
        cellClass: "font-mono text-xs",
      },
      {
        field: "palletId",
        headerName: "Pallet",
        flex: 1,
        minWidth: 110,
        cellClass: "font-mono text-xs",
      },
      {
        field: "weight",
        headerName: "Weight (lbs)",
        editable: !readOnly,
        type: "numericColumn",
        flex: 0.9,
        minWidth: 110,
      },
      {
        field: "quantity",
        headerName: "Qty",
        editable: !readOnly,
        type: "numericColumn",
        flex: 0.7,
        minWidth: 90,
      },
      {
        field: "boxCount",
        headerName: "Boxes/drums",
        editable: !readOnly,
        type: "numericColumn",
        flex: 0.7,
        minWidth: 90,
      },
    ],
    [readOnly],
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

  const customerSuggestions = useMemo(
    () =>
      knownCustomers
        .filter((c) => c.isActive)
        .map((c) => c.name)
        .filter(Boolean),
    [knownCustomers],
  );

  const canConfirm =
    Boolean(warehouseId && customerName.trim() && destination) &&
    lines.some((l) => l.materialCode && l.weight > 0);

  async function persist(nextStatus: OutboundOrder["status"] = status) {
    const customer = await resolveOrRememberCustomer(customerName);
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setKnownCustomers(loadKnownCustomers());

    const warehouse =
      (warehouses.length ? warehouses : DEMO_WAREHOUSES).find((w) => w.id === warehouseId) ||
      DEMO_WAREHOUSES[0];
    const payload = {
      warehouseId,
      warehouseName: warehouse?.name,
      customerId: customer.id,
      customerName: customer.name,
      shipDate: new Date(shipDate).toISOString(),
      carrier: carrier || undefined,
      destination: destination || undefined,
      shippingTerms: destination || undefined,
      notes: destination || undefined,
      lines: lines
        .filter((l) => l.materialCode)
        .map((l) => ({
          inventoryItemId: l.inventoryItemId,
          materialCode: l.materialCode,
          materialDescription: l.materialDescription,
          batchNumber: l.batchNumber,
          palletId: l.palletId || undefined,
          weight: Number(l.weight) || 0,
          quantity: Number(l.quantity) || 0,
          boxCount: Number(l.boxCount) || 0,
        })),
    };

    const id = orderId || crypto.randomUUID();
    const record: OutboundOrder = {
      ...payload,
      id,
      orderNumber:
        orderNumber ||
        `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: nextStatus,
      lineCount: payload.lines.length,
      totalWeight: totals.weight,
      totalPallets: totals.pallets,
      lines: lines.filter((l) => l.materialCode),
    };

    try {
      if (isEdit && orderId) {
        await apiFetch(`/outbound/${orderId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/outbound", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    } catch {
      upsertDemoItem("outbound", DEMO_OUTBOUND, record);
    }
    return record;
  }

  async function handleSave() {
    if (!canConfirm || readOnly || (isEdit && !canEdit)) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const saved = await persist(status === "Picking" ? "Picking" : "Draft");
      setOrderNumber(saved.orderNumber);
      setDone(true);
      setMessage(isEdit ? "Changes saved." : "Draft created.");
      setTimeout(() => router.push("/outbound"), 700);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmShip() {
    if (!canConfirm || !canShip || readOnly) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const saved = await persist(status === "Picking" ? "Picking" : "Draft");
      try {
        await apiFetch(`/outbound/${saved.id}/ship`, { method: "POST" });
      } catch {
        upsertDemoItem("outbound", DEMO_OUTBOUND, {
          ...saved,
          status: "Shipped",
          shippedAt: new Date().toISOString(),
        });
      }
      setStatus("Shipped");
      setDone(true);
      setConfirmOpen(false);
      setMessage("Shipment confirmed.");
      setTimeout(() => router.push("/outbound"), 900);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ship failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading outbound order…</p>;
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <PageHeader
        title={isEdit ? `Modify ${orderNumber || "shipment"}` : "Ship outbound"}
        description={
          readOnly
            ? "This order is locked because it is shipped or cancelled. View only."
            : isEdit
              ? "Update header fields and pick lines, then save or confirm shipment."
              : "Select inventory lines, review totals, and confirm shipment."
        }
      />

      {message ? (
        <p className="rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--brand-ink)]">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Select
          label="3PL company"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          disabled={readOnly}
          options={(warehouses.length ? warehouses : DEMO_WAREHOUSES).map((w) => ({
            value: w.id,
            label: `${w.code} — ${w.name}`,
          }))}
        />
        <TypeaheadInput
          label="Customer"
          value={customerName}
          onChange={(value) => {
            setCustomerName(value);
            const match = knownCustomers.find(
              (c) => c.name.toLowerCase() === value.trim().toLowerCase(),
            );
            setCustomerId(match?.id || "");
          }}
          options={customerSuggestions}
          placeholder="Type customer name"
          hint="Type a name or pick a prior customer — new names are saved for next time."
          disabled={readOnly}
        />
        <Input
          label="Ship date"
          type="datetime-local"
          value={shipDate}
          onChange={(e) => setShipDate(e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="Carrier"
          disabled={readOnly}
        />
        <Input
          label="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ship-to address"
          disabled={readOnly}
          className="md:col-span-2 xl:col-span-2"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Shipment lines
        </h2>
        {!readOnly ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setLines((prev) => [...prev, lineFromInventory()])}
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        ) : null}
      </div>

      <div className="ag-theme-quartz h-[360px] w-full overflow-hidden rounded-md border border-[var(--brand-steel)]/15">
        <AgGridReact<OutboundLine>
          theme="legacy"
          rowData={lines}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onCellValueChanged={onCellValueChanged}
          defaultColDef={{
            resizable: true,
            editable: !readOnly,
          }}
          stopEditingWhenCellsLoseFocus
          singleClickEdit
          animateRows
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => router.push("/outbound")}>
            Back
          </Button>
          {!readOnly ? (
            <Button
              variant="secondary"
              size="lg"
              disabled={!canConfirm || submitting || done || (isEdit && !canEdit)}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          ) : null}
          {!readOnly && canShip ? (
            <Button
              size="lg"
              disabled={!canConfirm || submitting || done}
              onClick={() => setConfirmOpen(true)}
              className="min-w-[180px]"
            >
              {done && status === "Shipped" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 animate-pulse" />
                  Shipped
                </>
              ) : (
                "Confirm shipment"
              )}
            </Button>
          ) : null}
        </div>
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
