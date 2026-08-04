"use client";

import { useEffect, useState } from "react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_LOCATIONS, DEMO_WAREHOUSES } from "@/lib/mock-data";
import type { StorageLocation } from "@/types";
import { DemoBanner, PageHeader, Select, StatusBadge, Button } from "@/components/ui";

export default function LocationsPage() {
  const [locations, setLocations] = useState<StorageLocation[]>(DEMO_LOCATIONS);
  const [demo, setDemo] = useState(true);
  const [warehouseId, setWarehouseId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<
        { items: StorageLocation[] } | StorageLocation[]
      >("/locations", DEMO_LOCATIONS);
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? DEMO_LOCATIONS;
      setLocations(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = warehouseId
    ? locations.filter((l) => l.warehouseId === warehouseId)
    : locations;

  const warehouseName = (id: string) =>
    DEMO_WAREHOUSES.find((w) => w.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Locations"
        description="Storage slots, zones, and bins across warehouses."
        actions={<Button variant="outline">Add location</Button>}
      />
      <DemoBanner show={demo} />
      <div className="max-w-xs">
        <Select
          label="Warehouse"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          options={[
            { value: "", label: "All warehouses" },
            ...DEMO_WAREHOUSES.map((w) => ({
              value: w.id,
              label: `${w.code} — ${w.name}`,
            })),
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Warehouse</th>
              <th className="px-4 py-3 font-semibold">Zone</th>
              <th className="px-4 py-3 font-semibold">Aisle</th>
              <th className="px-4 py-3 font-semibold">Rack</th>
              <th className="px-4 py-3 font-semibold">Bin</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {filtered.map((loc) => (
              <tr key={loc.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] font-medium text-[var(--brand-ink)]">
                  {loc.code}
                </td>
                <td className="px-4 py-3">{warehouseName(loc.warehouseId)}</td>
                <td className="px-4 py-3">{loc.zone}</td>
                <td className="px-4 py-3 tabular-nums">{loc.aisle || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{loc.rack || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{loc.bin || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={loc.isActive ? "Active" : "Suspended"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
