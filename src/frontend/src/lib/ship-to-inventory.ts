import { DEMO_INVENTORY } from "@/lib/mock-data";
import {
  loadDemoCollection,
  saveDemoCollection,
} from "@/lib/demo-store";
import type { InventoryItem, OutboundOrder } from "@/types";

const APPLIED_KEY = "logiforge.demo.inventoryFromOutbound";

function loadAppliedOutboundIds(): string[] {
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

function markOutboundApplied(orderId: string) {
  if (typeof window === "undefined") return;
  const ids = new Set(loadAppliedOutboundIds());
  ids.add(orderId);
  localStorage.setItem(APPLIED_KEY, JSON.stringify([...ids]));
}

function findInventoryItem(
  inventory: InventoryItem[],
  line: NonNullable<OutboundOrder["lines"]>[number],
): InventoryItem | undefined {
  if (line.inventoryItemId) {
    const byId = inventory.find((i) => i.id === line.inventoryItemId);
    if (byId) return byId;
  }
  return inventory.find(
    (i) =>
      (i.status === "Available" || i.status === "Partial") &&
      i.materialCode === line.materialCode &&
      (i.batchNumber || "") === (line.batchNumber || "") &&
      (i.locationCode || "") === (line.locationCode || ""),
  );
}

function nextStatus(
  remainingWeight: number,
  remainingQty: number,
  originalWeight: number,
): InventoryItem["status"] {
  if (remainingWeight <= 0 || remainingQty <= 0) return "Shipped";
  if (remainingWeight < originalWeight) return "Partial";
  return "Available";
}

/**
 * Decrement demo inventory for a shipped outbound order.
 * Safe to call more than once for the same order — subsequent calls no-op.
 */
export function applyShippedOutboundToInventory(
  order: OutboundOrder,
): { updated: number } {
  if (!order?.id || order.status !== "Shipped") return { updated: 0 };
  if (loadAppliedOutboundIds().includes(order.id)) return { updated: 0 };

  const lines = (order.lines || []).filter(
    (l) =>
      l.materialCode &&
      (Number(l.weight) > 0 || Number(l.quantity) > 0),
  );
  if (!lines.length) {
    markOutboundApplied(order.id);
    return { updated: 0 };
  }

  const inventory = loadDemoCollection("inventory", DEMO_INVENTORY);
  const byId = new Map(inventory.map((i) => [i.id, { ...i }]));
  let updated = 0;
  const now = order.shippedAt || new Date().toISOString();

  for (const line of lines) {
    const match = findInventoryItem([...byId.values()], line);
    if (!match) continue;
    const item = byId.get(match.id);
    if (!item) continue;

    const shipWeight = Number(line.weight) || 0;
    const shipQty = Number(line.quantity) || 0;
    const shipBoxes = Number(line.boxCount) || 0;

    item.remainingWeight = Math.max(
      0,
      Math.round((item.remainingWeight - shipWeight) * 1000) / 1000,
    );
    item.quantity = Math.max(
      0,
      Math.round((item.quantity - shipQty) * 1000) / 1000,
    );
    item.boxCount = Math.max(0, item.boxCount - shipBoxes);
    item.status = nextStatus(
      item.remainingWeight,
      item.quantity,
      item.originalWeight,
    );
    item.lastUpdatedAt = now;
    byId.set(item.id, item);
    updated += 1;
  }

  if (updated > 0) {
    saveDemoCollection("inventory", [...byId.values()]);
  }
  markOutboundApplied(order.id);
  return { updated };
}
