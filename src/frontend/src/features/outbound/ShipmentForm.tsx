"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Save, Paperclip, Trash2, X } from "lucide-react";
import { Button, Input, PageHeader, TypeaheadInput } from "@/components/ui";
import { ApiError, apiFetch, apiFetchOrDemo, shouldFallbackToDemo } from "@/lib/api";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  readSecureAttachment,
  sanitizeAttachmentFilename,
} from "@/lib/secure-attachment";
import {
  DEMO_CUSTOMERS,
  DEMO_INVENTORY,
  DEMO_OUTBOUND,
} from "@/lib/mock-data";
import {
  getDemoItem,
  loadDemoCollection,
  upsertDemoItem,
} from "@/lib/demo-store";
import {
  loadKnownCustomers,
  resolveOrRememberCustomer,
} from "@/lib/customers";
import { companiesForUser } from "@/lib/companies-scope";
import { companyInventoryRows } from "@/lib/inventory-snapshot";
import { formatFileSize, formatShipTo } from "@/lib/ship-to";
import { applyShippedOutboundToInventory } from "@/lib/ship-to-inventory";
import { formatWeight } from "@/lib/utils";
import type {
  Customer,
  InventoryItem,
  OutboundAttachment,
  OutboundLine,
  OutboundOrder,
} from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import {
  BinPickTypeahead,
  buildBinPickOptions,
  type BinPickOption,
} from "./BinPickTypeahead";

function emptyLine(): OutboundLine {
  return {
    id: crypto.randomUUID(),
    inventoryItemId: undefined,
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

function applyInventoryToLine(
  line: OutboundLine,
  inv: InventoryItem,
): OutboundLine {
  return {
    ...line,
    inventoryItemId: inv.id,
    materialCode: inv.materialCode,
    materialDescription: inv.materialDescription,
    batchNumber: inv.batchNumber,
    palletId: inv.palletId,
    locationCode: inv.locationCode,
    weight: inv.remainingWeight,
    quantity: inv.quantity,
    boxCount: inv.boxCount || 0,
  };
}

function linesFromOrder(
  order: OutboundOrder | null | undefined,
  inventory: InventoryItem[],
): OutboundLine[] {
  if (order?.lines?.length) {
    return order.lines.map((l) => {
      const inv = inventory.find((i) => i.id === l.inventoryItemId);
      return {
        ...l,
        id: l.id || crypto.randomUUID(),
        locationCode:
          l.locationCode ||
          inv?.locationCode ||
          "",
      };
    });
  }
  if (order) {
    return [
      {
        ...emptyLine(),
        weight: order.totalWeight ?? 0,
        quantity: order.lineCount ?? 1,
      },
    ];
  }
  return [emptyLine()];
}

interface ShipmentFormProps {
  orderId?: string;
}

export function ShipmentForm({ orderId }: ShipmentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(orderId);
  const user = useAuthStore((s) => s.user);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const myCompanies = warehouses.length ? warehouses : companiesForUser(user);
  const myCompany = myCompanies[0];
  const canEdit = useAuthStore(
    (s) => s.hasPermission("outbound.edit") || s.hasPermission("admin.full"),
  );
  const canShip = useAuthStore(
    (s) => s.hasPermission("outbound.ship") || s.hasPermission("admin.full"),
  );

  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState<OutboundOrder["status"]>("Draft");
  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || myCompany?.id || "",
  );
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [knownCustomers, setKnownCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [shipDate, setShipDate] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [attachment, setAttachment] = useState<OutboundAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lines, setLines] = useState<OutboundLine[]>([emptyLine()]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  const readOnly = isEdit && status !== "Draft" && status !== "Picking";
  /** Attachments can still be added/replaced after ship (cancelled stays locked). */
  const attachmentEditable =
    status !== "Cancelled" && (!readOnly || (status === "Shipped" && canEdit));

  useEffect(() => {
    setKnownCustomers(loadKnownCustomers());
  }, []);

  useEffect(() => {
    if (orderId) return;
    setShipDate(new Date().toISOString().slice(0, 16));
  }, [orderId]);

  // Shipping is always scoped to the signed-in 3PL company only
  useEffect(() => {
    if (!myCompany) return;
    if (warehouseId !== myCompany.id) setWarehouseId(myCompany.id);
  }, [myCompany, warehouseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadDemoCollection("inventory", DEMO_INVENTORY);
      const result = await apiFetchOrDemo<
        { items: InventoryItem[] } | InventoryItem[]
      >("/inventory", local);
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
      setInventory(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setTrackingNumber(order.trackingNumber || "");
        setAddress(order.address || order.destination || "");
        setState(order.state || "");
        setPostalCode(order.postalCode || "");
        setCountry(order.country || "United States");
        setAttachment(order.attachment || null);
        setAttachError(null);
        const invLocal = loadDemoCollection("inventory", DEMO_INVENTORY);
        setLines(linesFromOrder(order, invLocal));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const companyInventory = useMemo(
    () => companyInventoryRows(inventory, warehouseId || myCompany?.id),
    [inventory, warehouseId, myCompany?.id],
  );

  const binOptions = useMemo(
    () => buildBinPickOptions(companyInventory),
    [companyInventory],
  );

  const totals = useMemo(() => {
    const weight = lines.reduce((s, l) => s + (Number(l.weight) || 0), 0);
    const qty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const boxes = lines.reduce((s, l) => s + (Number(l.boxCount) || 0), 0);
    const pallets = new Set(lines.map((l) => l.palletId).filter(Boolean)).size;
    const materials = new Set(lines.map((l) => l.materialCode).filter(Boolean)).size;
    return { weight, qty, boxes, pallets, materials };
  }, [lines]);

  function updateLine(id: string, patch: Partial<OutboundLine>) {
    setLines((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function pickBinForLine(lineId: string, option: BinPickOption) {
    setLines((prev) =>
      prev.map((row) =>
        row.id === lineId ? applyInventoryToLine(row, option.item) : row,
      ),
    );
  }

  function removeLine(lineId: string) {
    setLines((prev) => {
      const next = prev.filter((row) => row.id !== lineId);
      return next.length ? next : [emptyLine()];
    });
  }

  const customerSuggestions = useMemo(
    () =>
      knownCustomers
        .filter((c) => c.isActive)
        .map((c) => c.name)
        .filter(Boolean),
    [knownCustomers],
  );

  const shipToSummary = formatShipTo({
    address,
    state,
    postalCode,
    country,
  });

  const canConfirm =
    Boolean(
      warehouseId &&
        customerName.trim() &&
        address.trim() &&
        state.trim() &&
        postalCode.trim() &&
        country.trim(),
    ) &&
    lines.some(
      (l) =>
        l.inventoryItemId &&
        l.locationCode &&
        l.materialCode &&
        (l.weight > 0 || l.quantity > 0),
    );

  async function onAttachmentSelected(fileList: FileList | null) {
    setAttachError(null);
    const result = await readSecureAttachment(fileList?.[0]);
    if (!result.ok) {
      setAttachError(result.error);
      return;
    }
    setAttachment(result.attachment);
  }

  async function persist(nextStatus: OutboundOrder["status"] = status) {
    const customer = await resolveOrRememberCustomer(customerName);
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setKnownCustomers(loadKnownCustomers());

    const warehouse = myCompany || myCompanies[0];
    const destination = shipToSummary;
    const safeAttachName = attachment
      ? sanitizeAttachmentFilename(attachment.name)
      : undefined;
    const attachmentNote = safeAttachName
      ? `Attachment: ${safeAttachName} (${formatFileSize(attachment!.size)})`
      : undefined;
    const payload = {
      warehouseId: warehouse?.id || warehouseId,
      warehouseName: warehouse?.name,
      customerId: customer.id,
      customerName: customer.name,
      shipDate: new Date(shipDate).toISOString(),
      shipmentDate: new Date(shipDate).toISOString(),
      carrier: carrier || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      address: address.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
      destination,
      // Backend fields — pack structured ship-to + attachment reference
      shippingTerms: [destination, attachmentNote].filter(Boolean).join(" | ").slice(0, 500),
      customerPo: safeAttachName?.slice(0, 180),
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
          palletCount: 1,
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
      attachment: attachment || undefined,
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
      // Keep local demo store in sync even when API succeeds
      upsertDemoItem("outbound", DEMO_OUTBOUND, record);
    } catch (e) {
      if (!shouldFallbackToDemo(e)) {
        throw e instanceof ApiError
          ? e
          : new Error("Could not save shipment — not authorized or rejected by server.");
      }
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

  async function handleSaveAttachment() {
    if (!attachmentEditable || status !== "Shipped" || !orderId || !canEdit) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const existing =
        getDemoItem("outbound", DEMO_OUTBOUND, orderId) ||
        ({
          id: orderId,
          orderNumber,
          warehouseId,
          customerId,
          customerName,
          shipDate: shipDate ? new Date(shipDate).toISOString() : new Date().toISOString(),
          status: "Shipped" as const,
          lines: lines.filter((l) => l.materialCode),
        } satisfies Partial<OutboundOrder> as OutboundOrder);

      const destination = shipToSummary || existing.destination || "";
      const safeAttachName = attachment
        ? sanitizeAttachmentFilename(attachment.name)
        : undefined;
      const attachmentNote = safeAttachName
        ? `Attachment: ${safeAttachName} (${formatFileSize(attachment!.size)})`
        : undefined;
      const payload = {
        warehouseId: existing.warehouseId || warehouseId,
        customerId: existing.customerId || customerId,
        customerPo: safeAttachName?.slice(0, 180),
        shippingTerms: [destination, attachmentNote]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 500),
        carrier: existing.carrier || carrier || undefined,
        trackingNumber:
          existing.trackingNumber || trackingNumber.trim() || undefined,
        shipmentDate: existing.shipDate || new Date().toISOString(),
        lines: (existing.lines || lines)
          .filter((l) => l.materialCode && l.inventoryItemId)
          .map((l) => ({
            inventoryItemId: l.inventoryItemId,
            weight: Number(l.weight) || 0,
            quantity: Number(l.quantity) || 0,
            boxCount: Number(l.boxCount) || 0,
            palletCount: 1,
          })),
      };

      const record: OutboundOrder = {
        ...existing,
        id: orderId,
        orderNumber: orderNumber || existing.orderNumber,
        status: "Shipped",
        shippedAt: existing.shippedAt,
        attachment: attachment
          ? { ...attachment, name: safeAttachName || attachment.name }
          : undefined,
        destination,
        address: address || existing.address,
        state: state || existing.state,
        postalCode: postalCode || existing.postalCode,
        country: country || existing.country,
      };

      try {
        await apiFetch(`/outbound/${orderId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        upsertDemoItem("outbound", DEMO_OUTBOUND, record);
      } catch (e) {
        if (!shouldFallbackToDemo(e)) {
          throw e instanceof ApiError
            ? e
            : new Error("Not authorized to update this shipped attachment.");
        }
        upsertDemoItem("outbound", DEMO_OUTBOUND, record);
      }
      setMessage(
        attachment
          ? "Attachment saved on shipped order."
          : "Attachment removed from shipped order.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save attachment.");
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
      const shipped: OutboundOrder = {
        ...saved,
        trackingNumber: trackingNumber.trim() || saved.trackingNumber,
        status: "Shipped",
        shippedAt: new Date().toISOString(),
      };
      try {
        await apiFetch(`/outbound/${saved.id}/ship`, { method: "POST" });
      } catch {
        // Demo / offline path — API ship unavailable
      }
      // Always persist shipped status + decrement inventory locally
      // (API also decrements when online; local store keeps demo inventory in sync)
      upsertDemoItem("outbound", DEMO_OUTBOUND, shipped);
      const { updated } = applyShippedOutboundToInventory(shipped);
      setStatus("Shipped");
      setDone(true);
      setConfirmOpen(false);
      setMessage(
        updated
          ? `Shipment confirmed — inventory updated on ${updated} line${updated === 1 ? "" : "s"}.`
          : "Shipment confirmed.",
      );
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
          status === "Cancelled"
            ? "This order is cancelled and locked. View only."
            : status === "Shipped"
              ? "Shipment is locked, but you can still add or replace the document attachment."
              : isEdit
                ? "Update header fields and pick lines, then save or confirm shipment."
                : "Type a storage location / bin to pick inventory, review totals, and confirm shipment."
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
          hint="Only your 3PL company is available for shipping."
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
          label="Tracking number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Optional carrier tracking #"
          disabled={readOnly}
          className="font-[family-name:var(--font-mono)]"
          hint="Saved with the shipment and shown on the outbound list."
        />
        <Input
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address"
          disabled={readOnly}
          className="md:col-span-2 xl:col-span-2"
        />
        <Input
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State / province"
          disabled={readOnly}
        />
        <Input
          label="Postal code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postal / ZIP"
          disabled={readOnly}
          className="font-[family-name:var(--font-mono)]"
        />
        <Input
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          disabled={readOnly}
        />
        <div className="md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-[var(--brand-ink)]">
            Document attachment
          </span>
          {status === "Shipped" && attachmentEditable ? (
            <p className="mb-1.5 text-xs text-[var(--muted)]">
              You can add or replace the packing list / BOL after shipping.
            </p>
          ) : null}
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
              {attachmentEditable ? (
                <>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--brand-ink)] hover:border-[var(--accent)]/40">
                    Replace
                    <input
                      type="file"
                      className="sr-only"
                      accept={ATTACHMENT_ACCEPT}
                      onChange={(e) => {
                        void onAttachmentSelected(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
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
                </>
              ) : null}
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-md border border-dashed border-[var(--brand-steel)]/25 bg-[var(--surface-raised)]/70 px-3 py-3 transition-colors hover:border-[var(--accent)]/40 ${
                !attachmentEditable ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-ink)]">
                <Paperclip className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                Attach document reference
              </span>
              <span className="text-xs text-[var(--muted)]">
                PDF, Office, PNG/JPEG, TXT, or CSV — max{" "}
                {(MAX_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(1)} MB. SVG/HTML
                blocked.
              </span>
              <input
                type="file"
                className="sr-only"
                accept={ATTACHMENT_ACCEPT}
                disabled={!attachmentEditable}
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
          Shipment lines
        </h2>
        {!readOnly ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-[var(--muted)]">
        Type a storage location / bin to see matching inventory, then select one
        to auto-fill material details.
      </p>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Line {index + 1}
              </p>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[var(--danger)]"
                  onClick={() => removeLine(line.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3">
                <BinPickTypeahead
                  value={line.locationCode || ""}
                  options={binOptions}
                  disabled={readOnly}
                  placeholder="Type bin / storage location (e.g. HARBOR-MAIN)"
                  hint={
                    binOptions.length
                      ? `${binOptions.length} pickable bins for your company`
                      : "No available inventory bins for your company"
                  }
                  onQueryChange={(query) =>
                    updateLine(line.id, {
                      locationCode: query,
                      // Clear pick until a suggestion is chosen
                      inventoryItemId: undefined,
                      materialCode: "",
                      materialDescription: "",
                      batchNumber: "",
                      palletId: "",
                      weight: 0,
                      quantity: 0,
                      boxCount: 0,
                    })
                  }
                  onPick={(option) => pickBinForLine(line.id, option)}
                />
              </div>
              <Input
                label="Material"
                value={line.materialCode}
                readOnly
                disabled
              />
              <Input
                label="Description"
                value={line.materialDescription}
                readOnly
                disabled
              />
              <Input
                label="Batch"
                value={line.batchNumber}
                readOnly
                disabled
                className="font-[family-name:var(--font-mono)]"
              />
              <Input
                label="Pallet"
                value={line.palletId || ""}
                readOnly
                disabled
                className="font-[family-name:var(--font-mono)]"
              />
              <Input
                label="Weight (lbs)"
                type="number"
                value={String(line.weight)}
                disabled={readOnly || !line.inventoryItemId}
                onChange={(e) =>
                  updateLine(line.id, { weight: Number(e.target.value) || 0 })
                }
              />
              <Input
                label="Qty"
                type="number"
                value={String(line.quantity)}
                disabled={readOnly || !line.inventoryItemId}
                onChange={(e) =>
                  updateLine(line.id, { quantity: Number(e.target.value) || 0 })
                }
              />
              <Input
                label="Boxes/drums"
                type="number"
                value={String(line.boxCount)}
                disabled={readOnly || !line.inventoryItemId}
                onChange={(e) =>
                  updateLine(line.id, { boxCount: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        ))}
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
          {status === "Shipped" && attachmentEditable ? (
            <Button
              variant="secondary"
              size="lg"
              disabled={submitting}
              onClick={() => void handleSaveAttachment()}
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving…" : "Save attachment"}
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
              {formatWeight(totals.weight)} across {totals.pallets} pallets and
              update inventory.
            </p>
            {trackingNumber.trim() ? (
              <p className="mt-2 text-sm text-[var(--brand-ink)]">
                Tracking{" "}
                <span className="font-[family-name:var(--font-mono)] font-medium">
                  {trackingNumber.trim()}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                No tracking number entered — you can add one on the form before
                confirming.
              </p>
            )}
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
