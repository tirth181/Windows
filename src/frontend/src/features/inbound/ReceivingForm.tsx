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
import { Button, Input, Select, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { DEMO_INBOUND, DEMO_LOCATIONS, DEMO_WAREHOUSES } from "@/lib/mock-data";
import { getDemoItem, upsertDemoItem } from "@/lib/demo-store";
import { formatWeight } from "@/lib/utils";
import type { InboundLine, InboundLoad } from "@/types";
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

function linesFromLoad(load?: InboundLoad | null): InboundLine[] {
  if (load?.lines?.length) {
    return load.lines.map((l) => ({ ...l, id: l.id || crypto.randomUUID() }));
  }
  if (load) {
    // Seed editable rows from list summary when detail lines are absent
    return [
      {
        ...newLine(),
        materialCode: "EDIT-ME",
        materialDescription: "Update material lines",
        batchNumber: "BATCH-1",
        weight: load.totalWeight ?? 0,
        quantity: load.lineCount ?? 1,
      },
    ];
  }
  return [newLine(), newLine()];
}

interface ReceivingFormProps {
  loadId?: string;
}

export function ReceivingForm({ loadId }: ReceivingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(loadId);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const canEdit = useAuthStore(
    (s) => s.hasPermission("inbound.edit") || s.hasPermission("admin.full"),
  );
  const canReceive = useAuthStore(
    (s) => s.hasPermission("inbound.approve") || s.hasPermission("admin.full"),
  );
  const isAdmin = useAuthStore(
    (s) => s.hasPermission("admin.full") || s.hasPermission("platform.admin"),
  );

  const [loadNumber, setLoadNumber] = useState<string>("");
  const [status, setStatus] = useState<InboundLoad["status"]>("Draft");
  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || DEMO_WAREHOUSES[0]?.id || "",
  );
  const [storageLocationId, setStorageLocationId] = useState(
    DEMO_LOCATIONS.find((l) => l.warehouseId === (selectedWarehouseId || DEMO_WAREHOUSES[0]?.id))
      ?.id ||
      DEMO_LOCATIONS[0]?.id ||
      "",
  );
  const [supplierName, setSupplierName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InboundLine[]>([newLine(), newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  // Admins may still modify received loads; cancelled stays locked for everyone
  const readOnly =
    isEdit &&
    (status === "Cancelled" ||
      (status !== "Draft" && !(isAdmin && status === "Received")));
  const canAdminEditReceived = isAdmin && status === "Received";

  useEffect(() => {
    if (loadId) return;
    // Set after mount so SSR and first client paint match (empty → then local now)
    setArrivalDate(new Date().toISOString().slice(0, 16));
  }, [loadId]);

  // Keep storage plant valid when 3PL company changes
  useEffect(() => {
    const stillValid = DEMO_LOCATIONS.some(
      (l) => l.id === storageLocationId && l.warehouseId === warehouseId,
    );
    if (stillValid) return;
    const next =
      DEMO_LOCATIONS.find((l) => l.warehouseId === warehouseId && l.isActive) ||
      DEMO_LOCATIONS.find((l) => l.warehouseId === warehouseId);
    setStorageLocationId(next?.id || "");
  }, [warehouseId, storageLocationId]);

  useEffect(() => {
    if (!loadId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let load: InboundLoad | undefined;
        try {
          load = await apiFetch<InboundLoad>(`/inbound/${loadId}`);
        } catch {
          load = getDemoItem("inbound", DEMO_INBOUND, loadId);
        }
        if (cancelled || !load) {
          if (!cancelled) {
            setMessage("Inbound load not found.");
            setLoading(false);
          }
          return;
        }
        setLoadNumber(load.loadNumber);
        setStatus(load.status);
        setWarehouseId(load.warehouseId);
        const fromLoad =
          load.storageLocationId ||
          DEMO_LOCATIONS.find((l) => l.code === load.storageLocationCode)?.id ||
          DEMO_LOCATIONS.find(
            (l) =>
              l.warehouseId === load.warehouseId &&
              load.lines?.some((line) => line.locationCode === l.code),
          )?.id ||
          DEMO_LOCATIONS.find((l) => l.warehouseId === load.warehouseId)?.id ||
          "";
        setStorageLocationId(fromLoad);
        setSupplierName(load.supplierName || "");
        setCarrier(load.carrier || "");
        setTrailerNumber(load.trailerNumber || "");
        setArrivalDate(new Date(load.arrivalDate).toISOString().slice(0, 16));
        setNotes(load.notes || "");
        setLines(linesFromLoad(load));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadId]);

  const addLine = useCallback(() => {
    if (readOnly) return;
    setLines((prev) => [...prev, newLine()]);
  }, [readOnly]);

  const columnDefs = useMemo<ColDef<InboundLine>[]>(
    () => [
      { field: "materialCode", headerName: "Material", editable: !readOnly, flex: 1.1, minWidth: 130 },
      { field: "materialDescription", headerName: "Description", editable: !readOnly, flex: 1.4, minWidth: 160 },
      {
        field: "batchNumber",
        headerName: "Batch",
        editable: !readOnly,
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
      },
      {
        field: "palletId",
        headerName: "Pallet ID",
        editable: !readOnly,
        flex: 1,
        minWidth: 120,
        cellClass: "font-mono text-xs",
      },
      {
        field: "locationCode",
        headerName: "Storage Location",
        editable: !readOnly,
        flex: 1.1,
        minWidth: 130,
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
        flex: 1,
        minWidth: 120,
      },
    ],
    [readOnly],
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

  const locationOptions = useMemo(
    () =>
      DEMO_LOCATIONS.filter((l) => !warehouseId || l.warehouseId === warehouseId).filter(
        (l) => l.isActive,
      ),
    [warehouseId],
  );

  const canSave =
    Boolean(warehouseId && storageLocationId) &&
    lines.some((l) => l.materialCode && (l.weight > 0 || l.quantity > 0));

  function buildPayload() {
    const warehouse =
      (warehouses.length ? warehouses : DEMO_WAREHOUSES).find((w) => w.id === warehouseId) ||
      DEMO_WAREHOUSES[0];
    const location =
      DEMO_LOCATIONS.find((l) => l.id === storageLocationId) || locationOptions[0];
    return {
      warehouseId,
      warehouseName: warehouse?.name,
      storageLocationId: location?.id,
      storageLocationCode: location?.code,
      // Backend still expects a customer id; not shown in inbound UI.
      customerId: "cust-1",
      supplierName: supplierName || undefined,
      arrivalDate: new Date(arrivalDate).toISOString(),
      carrier: carrier || undefined,
      trailerNumber: trailerNumber || undefined,
      notes: notes || undefined,
      lines: lines
        .filter((l) => l.materialCode)
        .map((l) => {
          const lineLoc =
            DEMO_LOCATIONS.find(
              (loc) => loc.code === l.locationCode && loc.warehouseId === warehouseId,
            ) || location;
          return {
            materialCode: l.materialCode,
            materialDescription: l.materialDescription,
            batchNumber: l.batchNumber,
            weight: Number(l.weight) || 0,
            quantity: Number(l.quantity) || 0,
            boxCount: Number(l.boxCount) || 0,
            palletId: l.palletId || undefined,
            locationCode: l.locationCode || location?.code,
            putawayLocationId: lineLoc?.id,
            comments: undefined as string | undefined,
          };
        }),
    };
  }

  async function persist(nextStatus: InboundLoad["status"] = status) {
    const payload = buildPayload();
    const id = loadId || crypto.randomUUID();
    const defaultCode = payload.storageLocationCode;
    const record: InboundLoad = {
      ...payload,
      id,
      loadNumber:
        loadNumber ||
        `INB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: nextStatus,
      lineCount: payload.lines.length,
      totalWeight: totals.weight,
      lines: lines
        .filter((l) => l.materialCode)
        .map((l) => ({
          ...l,
          locationCode: l.locationCode || defaultCode,
        })),
    };

    try {
      if (isEdit && loadId) {
        await apiFetch(`/inbound/${loadId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/inbound", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    } catch {
      upsertDemoItem("inbound", DEMO_INBOUND, record);
    }
    return record;
  }

  async function handleSave() {
    if (!canSave || readOnly || (isEdit && !canEdit && !canAdminEditReceived)) return;
    setSubmitting(true);
    setMessage(null);
    try {
      // Keep Received status when an admin edits an already-received load
      const nextStatus = status === "Received" ? "Received" : "Draft";
      const saved = await persist(nextStatus);
      setLoadNumber(saved.loadNumber);
      setStatus(saved.status);
      setDone(true);
      setMessage(
        status === "Received"
          ? "Received load updated."
          : isEdit
            ? "Changes saved."
            : "Draft created.",
      );
      setTimeout(() => router.push("/inbound"), 700);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReceive() {
    if (!canSave || !canReceive || readOnly || status !== "Draft") return;
    setSubmitting(true);
    setMessage(null);
    try {
      const saved = await persist("Draft");
      try {
        await apiFetch(`/inbound/${saved.id}/receive`, { method: "POST" });
      } catch {
        upsertDemoItem("inbound", DEMO_INBOUND, {
          ...saved,
          status: "Received",
          receivedAt: new Date().toISOString(),
        });
      }
      setStatus("Received");
      setDone(true);
      setMessage("Load received into inventory.");
      setTimeout(() => router.push("/inbound"), 900);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Receive failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading inbound load…</p>;
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <PageHeader
        title={isEdit ? `Modify ${loadNumber || "inbound"}` : "New receiving"}
        description={
          readOnly
            ? "This load is locked. View only."
            : canAdminEditReceived
              ? "Admin override — you can update this received inbound shipment."
              : isEdit
                ? "Update header fields and material lines, then save."
                : "Capture load header, scan material lines, then receive into inventory."
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
        <Select
          label="Storage Plant"
          value={storageLocationId}
          onChange={(e) => {
            const nextId = e.target.value;
            setStorageLocationId(nextId);
            const code = DEMO_LOCATIONS.find((l) => l.id === nextId)?.code;
            if (!code || readOnly) return;
            // Prefill empty line putaway codes from the header storage plant
            setLines((prev) =>
              prev.map((line) =>
                line.locationCode ? line : { ...line, locationCode: code },
              ),
            );
          }}
          disabled={readOnly}
          options={locationOptions.map((l) => ({
            value: l.id,
            label: `${l.code}${l.zone ? ` · Zone ${l.zone}` : ""}`,
          }))}
        />
        <Input
          label="Arrival"
          type="datetime-local"
          value={arrivalDate}
          onChange={(e) => setArrivalDate(e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Supplier"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="Supplier / vendor name"
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
          label="Trailer #"
          value={trailerNumber}
          onChange={(e) => setTrailerNumber(e.target.value)}
          placeholder="Trailer number"
          disabled={readOnly}
          className="font-[family-name:var(--font-mono)]"
        />
        <div className="md:col-span-2 xl:col-span-3">
          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional receiving notes"
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Material lines
        </h2>
        {!readOnly ? (
          <Button variant="outline" size="sm" type="button" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        ) : null}
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
            editable: !readOnly,
          }}
          stopEditingWhenCellsLoseFocus
          singleClickEdit
          animateRows
        />
      </div>

      <footer className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--brand-ink)]">
          <span>
            Materials <strong className="tabular-nums">{totals.materials}</strong>
          </span>
          <span>
            Weight <strong className="tabular-nums">{formatWeight(totals.weight)}</strong>
          </span>
          <span>
            Qty <strong className="tabular-nums">{totals.qty}</strong>
          </span>
          <span>
            Boxes/drums <strong className="tabular-nums">{totals.boxes}</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => router.push("/inbound")}>
            Back
          </Button>
          {!readOnly ? (
            <Button
              variant="secondary"
              size="lg"
              disabled={
                !canSave ||
                submitting ||
                done ||
                (isEdit && !canEdit && !canAdminEditReceived)
              }
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          ) : null}
          {!readOnly && canReceive && status === "Draft" ? (
            <Button
              size="lg"
              disabled={!canSave || submitting || done}
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
          ) : null}
        </div>
      </footer>
    </div>
  );
}
