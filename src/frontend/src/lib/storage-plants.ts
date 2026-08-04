import { DEMO_STORAGE_PLANTS } from "@/lib/mock-data";
import { loadDemoCollection } from "@/lib/demo-store";
import type { StoragePlant } from "@/types";

export const STORAGE_PLANTS_KEY = "storagePlants";

export function loadStoragePlants(): StoragePlant[] {
  return loadDemoCollection(STORAGE_PLANTS_KEY, DEMO_STORAGE_PLANTS);
}

/** Active plants for a single 3PL company (warehouse scope id). */
export function plantsForCompany(
  warehouseId: string | null | undefined,
  opts?: { includeInactive?: boolean },
): StoragePlant[] {
  if (!warehouseId) return [];
  return loadStoragePlants().filter(
    (p) =>
      p.warehouseId === warehouseId &&
      (opts?.includeInactive || p.isActive),
  );
}

export function findStoragePlant(
  idOrCode: string | null | undefined,
): StoragePlant | undefined {
  if (!idOrCode) return undefined;
  const plants = loadStoragePlants();
  return (
    plants.find((p) => p.id === idOrCode) ||
    plants.find((p) => p.code.toLowerCase() === idOrCode.toLowerCase())
  );
}
