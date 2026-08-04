import { DEMO_INVENTORY } from "@/lib/mock-data";
import {
  loadDemoCollection,
  saveDemoCollection,
} from "@/lib/demo-store";
import type { InboundLoad, InventoryItem } from "@/types";

const APPLIED_KEY = "logiforge.demo.inventoryFromInbound";

function loadAppliedInboundIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(APPLIED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function markInboundApplied(loadId: string) {
  if (typeof window === "undefined") return;
  const ids = new Set(loadAppliedInboundIds());
  ids.add(loadId);
  localStorage.setItem(APPLIED_KEY, JSON.stringify([...ids]));
}

/**
 * Post inbound material lines into the demo inventory store.
 * Safe to call more than once for the same load — subsequent calls no-op.
 */
export function applyReceivedInboundToInventory(
  load: InboundLoad,
): InventoryItem[] {
  if (!load?.id || load.status !== "Received") return [];
  if (loadAppliedInboundIds().includes(load.id)) return [];

  const lines = (load.lines || []).filter(
    (l) =>
      l.materialCode &&
      (Number(l.weight) > 0 || Number(l.quantity) > 0),
  );
  if (!lines.length) {
    markInboundApplied(load.id);
    return [];
  }

  const now = load.receivedAt || new Date().toISOString();
  const created: InventoryItem[] = lines.map((line) => ({
    id: crypto.randomUUID(),
    warehouseId: load.warehouseId,
    warehouseName: load.warehouseName,
    customerId: load.customerId || "cust-1",
    customerName: load.customerName || "Inbound customer",
    materialCode: line.materialCode,
    materialDescription: line.materialDescription || line.materialCode,
    batchNumber: line.batchNumber || "UNBATCHED",
    palletId: line.palletId,
    locationCode: line.locationCode || load.storageLocationCode,
    originalWeight: Number(line.weight) || 0,
    remainingWeight: Number(line.weight) || 0,
    quantity: Number(line.quantity) || 0,
    boxCount: Number(line.boxCount) || 0,
    status: "Available",
    lastUpdatedAt: now,
  }));

  const existing = loadDemoCollection("inventory", DEMO_INVENTORY);
  saveDemoCollection("inventory", [...created, ...existing]);
  markInboundApplied(load.id);
  return created;
}
