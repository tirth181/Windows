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
import {
  Plus,
  CheckCircle2,
  Save,
  Trash2,
  Eye,
  Paperclip,
  Pencil,
  Printer,
  X,
} from "lucide-react";
import { Button, Input, Select, PageHeader, Modal } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { DEMO_INBOUND } from "@/lib/mock-data";
import {
  getDemoItem,
  loadDemoCollection,
  saveDemoCollection,
  upsertDemoItem,
} from "@/lib/demo-store";
import { companiesForUser } from "@/lib/companies-scope";
import {
  findStoragePlant,
  plantsForCompany,
} from "@/lib/storage-plants";
import { printInboundReceipt } from "@/lib/print-document";
import { formatFileSize } from "@/lib/ship-to";
import { formatWeight } from "@/lib/utils";
import type {
  DocumentAttachment,
  InboundLine,
  InboundLoad,
  StoragePlant,
} from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import { InboundReceiptPreview } from "./InboundReceiptPreview";

const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv";

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
  /** When true, force read-only even if the user could otherwise edit. */
  viewOnly?: boolean;
}

export function ReceivingForm({ loadId, viewOnly = false }: ReceivingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(loadId);
  const user = useAuthStore((s) => s.user);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const myCompanies = warehouses.length ? warehouses : companiesForUser(user);
  const myCompany = myCompanies[0];
  const canEdit = useAuthStore(
    (s) => s.hasPermission("inbound.edit") || s.hasPermission("admin.full"),
  );
  const canReceive = useAuthStore(
    (s) => s.hasPermission("inbound.approve") || s.hasPermission("admin.full"),
  );
  const isAdmin = useAuthStore(
    (s) => s.hasPermission("admin.full") || s.hasPermission("platform.admin"),
  );
  const canDelete = useAuthStore(
    (s) =>
      s.hasPermission("inbound.delete") ||
      s.hasPermission("admin.full") ||
      s.hasPermission("platform.admin"),
  );

  const [loadNumber, setLoadNumber] = useState<string>("");
  const [status, setStatus] = useState<InboundLoad["status"]>("Draft");
  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || myCompany?.id || "",
  );
  const [storagePlants, setStoragePlants] = useState<StoragePlant[]>([]);
  const [storageLocationId, setStorageLocationId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InboundLine[]>([newLine(), newLine()]);
  const [attachment, setAttachment] = useState<DocumentAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoad, setPreviewLoad] = useState<InboundLoad | null>(null);
  const [previewAfterSave, setPreviewAfterSave] = useState(false);

  // Admins may still edit received loads; cancelled stays locked for everyone
  const canAdminEditReceived = isAdmin && status === "Received";
  const canEditThisLoad =
    !isEdit ||
    status === "Draft" ||
    canAdminEditReceived;
  const canDeleteThisLoad =
    Boolean(loadId) &&
    canDelete &&
    (isAdmin || status === "Draft");
  const readOnly =
    viewOnly ||
    (isEdit &&
      (status === "Cancelled" ||
        (status !== "Draft" && !canAdminEditReceived)));

  useEffect(() => {
    if (loadId) return;
    // Set after mount so SSR and first client paint match (empty → then local now)
    setArrivalDate(new Date().toISOString().slice(0, 16));
  }, [loadId]);

  // Receiving is always scoped to the signed-in 3PL company only
  useEffect(() => {
    if (!myCompany) return;
    if (warehouseId !== myCompany.id) setWarehouseId(myCompany.id);
  }, [myCompany, warehouseId]);

  // Only admin-configured plants for this 3PL company
  useEffect(() => {
    const plants = plantsForCompany(warehouseId);
    setStoragePlants(plants);
    const stillValid = plants.some((p) => p.id === storageLocationId);
    if (stillValid) return;
    // Keep a previously saved plant id while editing even if inactive
    if (isEdit && storageLocationId && findStoragePlant(storageLocationId)) {
      return;
    }
    setStorageLocationId(plants[0]?.id || "");
  }, [warehouseId, storageLocationId, isEdit]);

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
          findStoragePlant(load.storageLocationCode)?.id ||
          plantsForCompany(load.warehouseId)[0]?.id ||
          "";
        setStorageLocationId(fromLoad);
        setSupplierName(load.supplierName || "");
        setCarrier(load.carrier || "");
        setTrailerNumber(load.trailerNumber || "");
        setArrivalDate(new Date(load.arrivalDate).toISOString().slice(0, 16));
        setNotes(load.notes || "");
        setAttachment(load.attachment || null);
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

  const plantOptions = useMemo(() => {
    const active = storagePlants.filter((p) => p.isActive);
    // Include the currently selected plant even if inactive (edit/view)
    if (
      storageLocationId &&
      !active.some((p) => p.id === storageLocationId)
    ) {
      const selected =
        storagePlants.find((p) => p.id === storageLocationId) ||
        findStoragePlant(storageLocationId);
      if (selected) return [selected, ...active];
    }
    return active;
  }, [storagePlants, storageLocationId]);

  const canSave =
    Boolean(warehouseId && storageLocationId) &&
    plantOptions.some((p) => p.id === storageLocationId) &&
    lines.some((l) => l.materialCode && (l.weight > 0 || l.quantity > 0));

  function selectedPlant() {
    return (
      plantOptions.find((p) => p.id === storageLocationId) ||
      findStoragePlant(storageLocationId) ||
      plantOptions[0]
    );
  }

  function buildPayload() {
    const warehouse = myCompany || myCompanies[0];
    const plant = selectedPlant();
    return {
      warehouseId: warehouse?.id || warehouseId,
      warehouseName: warehouse?.name,
      storageLocationId: plant?.id,
      storageLocationCode: plant?.code,
      storagePlantName: plant?.name,
      // Backend still expects a customer id; not shown in inbound UI.
      customerId: "cust-1",
      supplierName: supplierName || undefined,
      arrivalDate: arrivalDate
        ? new Date(arrivalDate).toISOString()
        : new Date().toISOString(),
      carrier: carrier || undefined,
      trailerNumber: trailerNumber || undefined,
      notes: notes || undefined,
      lines: lines
        .filter((l) => l.materialCode)
        .map((l) => {
          return {
            materialCode: l.materialCode,
            materialDescription: l.materialDescription,
            batchNumber: l.batchNumber,
            weight: Number(l.weight) || 0,
            quantity: Number(l.quantity) || 0,
            boxCount: Number(l.boxCount) || 0,
            palletId: l.palletId || undefined,
            locationCode: l.locationCode || plant?.code,
            putawayLocationId: plant?.id,
            comments: undefined as string | undefined,
          };
        }),
    };
  }

  function buildReceiptSnapshot(
    nextStatus: InboundLoad["status"] = status,
    id?: string,
  ): InboundLoad {
    const payload = buildPayload();
    const defaultCode = payload.storageLocationCode;
    const plant = selectedPlant();
    return {
      ...payload,
      id: id || loadId || crypto.randomUUID(),
      loadNumber:
        loadNumber ||
        `INB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: nextStatus,
      lineCount: payload.lines.length,
      totalWeight: totals.weight,
      storagePlantName: plant?.name,
      attachment: attachment || undefined,
      lines: lines
        .filter((l) => l.materialCode)
        .map((l) => ({
          ...l,
          locationCode: l.locationCode || defaultCode,
        })),
    };
  }

  async function onAttachmentSelected(fileList: FileList | null) {
    setAttachError(null);
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError("Attachment must be 1.5 MB or smaller.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    }).catch(() => undefined);

    setAttachment({
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      dataUrl,
    });
  }

  async function persist(nextStatus: InboundLoad["status"] = status) {
    const payload = buildPayload();
    const record = buildReceiptSnapshot(nextStatus);

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

  function openPreview(load: InboundLoad, afterSave = false) {
    setPreviewLoad(load);
    setPreviewAfterSave(afterSave);
    setPreviewOpen(true);
  }

  function handlePreview() {
    if (!canSave && !loadId && !loadNumber) return;
    openPreview(buildReceiptSnapshot(status), false);
  }

  function handlePrint() {
    if (!canSave && !loadId && !loadNumber) return;
    printInboundReceipt(buildReceiptSnapshot(status));
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
      openPreview(saved, true);
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
      let received: InboundLoad = {
        ...saved,
        status: "Received",
        receivedAt: new Date().toISOString(),
      };
      try {
        await apiFetch(`/inbound/${saved.id}/receive`, { method: "POST" });
      } catch {
        upsertDemoItem("inbound", DEMO_INBOUND, received);
      }
      setLoadNumber(saved.loadNumber);
      setStatus("Received");
      setDone(true);
      setMessage("Load received into inventory.");
      openPreview(received, true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Receive failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!loadId || !canDeleteThisLoad) return;
    setDeleting(true);
    setMessage(null);
    try {
      try {
        await apiFetch(`/inbound/${loadId}`, { method: "DELETE" });
      } catch {
        const next = loadDemoCollection("inbound", DEMO_INBOUND).filter(
          (r) => r.id !== loadId,
        );
        saveDemoCollection("inbound", next);
      }
      setConfirmDelete(false);
      setMessage("Inbound shipment deleted.");
      setTimeout(() => router.push("/inbound"), 500);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
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
          viewOnly
            ? "Viewing inbound shipment. Use Edit to make changes when allowed."
            : readOnly
              ? "This load is locked. View only."
              : canAdminEditReceived
                ? "Admin override — you can edit this received inbound shipment."
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
        <Input
          label="3PL company"
          value={
            myCompany
              ? `${myCompany.code} — ${myCompany.name}`
              : "Your 3PL company"
          }
          readOnly
          disabled
          hint="Only your 3PL company is available for receiving."
        />
        <Select
          label="Storage Plant"
          value={storageLocationId}
          onChange={(e) => {
            const nextId = e.target.value;
            setStorageLocationId(nextId);
            const code =
              plantOptions.find((p) => p.id === nextId)?.code ||
              findStoragePlant(nextId)?.code;
            if (!code || readOnly) return;
            // Prefill empty line storage locations from the selected plant code
            setLines((prev) =>
              prev.map((line) =>
                line.locationCode ? line : { ...line, locationCode: code },
              ),
            );
          }}
          disabled={readOnly}
          placeholder={
            plantOptions.length === 0
              ? "No plants configured — add under Storage Plants"
              : "Select storage plant"
          }
          error={
            !readOnly && plantOptions.length === 0
              ? "An admin must add storage plants for your 3PL company."
              : undefined
          }
          options={plantOptions.map((p) => ({
            value: p.id,
            label: `${p.code} — ${p.name}`,
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
        <div className="md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-[var(--brand-ink)]">
            Document attachment
          </span>
          {attachment ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] px-3 py-2.5">
              <Paperclip className="h-4 w-4 text-[var(--accent)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--brand-ink)]">
                  {attachment.name}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatFileSize(attachment.size)}
                  {attachment.type ? ` · ${attachment.type}` : ""}
                </p>
              </div>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttachment(null);
                    setAttachError(null);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-md border border-dashed border-[var(--brand-steel)]/25 bg-[var(--surface-raised)]/70 px-3 py-3 transition-colors hover:border-[var(--accent)]/40 ${
                readOnly ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-ink)]">
                <Paperclip className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                Attach packing list / BOL / reference document
              </span>
              <span className="text-xs text-[var(--muted)]">
                PDF, Office, image, or text — max 1.5 MB
              </span>
              <input
                type="file"
                className="sr-only"
                accept={ATTACHMENT_ACCEPT}
                disabled={readOnly}
                onChange={(e) => {
                  void onAttachmentSelected(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {attachError ? (
            <p className="mt-1.5 text-xs text-[var(--danger)]" role="alert">
              {attachError}
            </p>
          ) : null}
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
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!canSave && !loadNumber}
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!canSave && !loadNumber}
            onClick={handlePreview}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          {isEdit && viewOnly && canEditThisLoad && (canEdit || canAdminEditReceived) ? (
            <Button
              type="button"
              size="lg"
              onClick={() => loadId && router.push(`/inbound/${loadId}`)}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : null}
          {canDeleteThisLoad ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="text-[var(--danger)] hover:bg-[var(--danger)]/5"
              disabled={deleting || submitting}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          {!readOnly ? (
            <Button
              variant="secondary"
              size="lg"
              disabled={
                !canSave ||
                submitting ||
                (isEdit && !canEdit && !canAdminEditReceived)
              }
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving…" : "Save & preview"}
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

      <Modal
        open={confirmDelete}
        title="Delete inbound shipment?"
        description="This removes the load from the active queue. Admins can delete received loads."
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="bg-[var(--danger)] hover:opacity-90"
            >
              {deleting ? "Deleting…" : "Delete shipment"}
            </Button>
          </>
        }
      >
        Delete <strong>{loadNumber || "this load"}</strong>
        {status === "Received" ? " (received — admin delete)." : "."}
      </Modal>

      <InboundReceiptPreview
        open={previewOpen}
        load={previewLoad}
        onClose={() => {
          setPreviewOpen(false);
          if (previewAfterSave) setDone(false);
        }}
        onDone={
          previewAfterSave
            ? () => {
                setPreviewOpen(false);
                router.push("/inbound");
              }
            : undefined
        }
      />
    </div>
  );
}
