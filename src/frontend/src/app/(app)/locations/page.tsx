"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { apiFetch, apiFetchOrDemo } from "@/lib/api";
import { DEMO_LOCATIONS, DEMO_WAREHOUSES } from "@/lib/mock-data";
import { loadDemoCollection, upsertDemoItem } from "@/lib/demo-store";
import type { StorageLocation } from "@/types";
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

type LocationForm = {
  warehouseId: string;
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  bin: string;
  isActive: boolean;
};

const emptyForm = (): LocationForm => ({
  warehouseId: DEMO_WAREHOUSES[0]?.id || "",
  code: "",
  zone: "",
  aisle: "",
  rack: "",
  bin: "",
  isActive: true,
});

export default function LocationsPage() {
  const canManage = useAuthStore(
    (s) => s.hasPermission("locations.manage") || s.hasPermission("admin.full"),
  );
  const [locations, setLocations] = useState<StorageLocation[]>(DEMO_LOCATIONS);
  const [demo, setDemo] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StorageLocation | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadDemoCollection("locations", DEMO_LOCATIONS);
      const result = await apiFetchOrDemo<
        { items: StorageLocation[] } | StorageLocation[]
      >("/locations", local);
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
      setLocations(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function openEdit(loc: StorageLocation) {
    setEditing(loc);
    setForm({
      warehouseId: loc.warehouseId,
      code: loc.code,
      zone: loc.zone,
      aisle: loc.aisle || "",
      rack: loc.rack || "",
      bin: loc.bin || "",
      isActive: loc.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.warehouseId || !form.code.trim() || !form.zone.trim()) {
      setError("Warehouse, code, and zone are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      warehouseId: form.warehouseId,
      code: form.code.trim(),
      zone: form.zone.trim(),
      aisle: form.aisle.trim() || undefined,
      rack: form.rack.trim() || undefined,
      bin: form.bin.trim() || undefined,
      isActive: form.isActive,
    };
    const record: StorageLocation = {
      id: editing?.id || crypto.randomUUID(),
      warehouseId: payload.warehouseId,
      code: payload.code,
      zone: payload.zone,
      aisle: payload.aisle,
      rack: payload.rack,
      bin: payload.bin,
      isActive: payload.isActive,
    };
    try {
      if (editing) {
        await apiFetch(`/locations/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/locations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setLocations((prev) => {
        const idx = prev.findIndex((l) => l.id === record.id);
        return idx >= 0
          ? prev.map((l, i) => (i === idx ? record : l))
          : [record, ...prev];
      });
    } catch {
      const next = upsertDemoItem("locations", DEMO_LOCATIONS, record);
      setLocations(next);
      setDemo(true);
    } finally {
      setSaving(false);
      setModalOpen(false);
    }
  }

  const filtered = warehouseFilter
    ? locations.filter((l) => l.warehouseId === warehouseFilter)
    : locations;

  const warehouseName = (id: string) =>
    DEMO_WAREHOUSES.find((w) => w.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Locations"
        description="Storage slots, zones, and bins across warehouses."
        actions={
          canManage ? (
            <Button variant="outline" type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add location
            </Button>
          ) : null
        }
      />
      <DemoBanner show={demo} />
      <div className="max-w-xs">
        <Select
          label="Warehouse"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
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
              <th className="px-4 py-3 font-semibold">Actions</th>
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
                <td className="px-4 py-3">
                  {canManage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modify
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Modify location" : "Add location"}
        description={
          editing
            ? "Update storage slot details."
            : "Create a new storage location."
        }
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <Select
            label="Warehouse"
            value={form.warehouseId}
            onChange={(e) =>
              setForm((f) => ({ ...f, warehouseId: e.target.value }))
            }
            options={DEMO_WAREHOUSES.map((w) => ({
              value: w.id,
              label: `${w.code} — ${w.name}`,
            }))}
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="A-01-01"
            className="font-[family-name:var(--font-mono)]"
          />
          <Input
            label="Zone"
            value={form.zone}
            onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
            placeholder="A"
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Aisle"
              value={form.aisle}
              onChange={(e) => setForm((f) => ({ ...f, aisle: e.target.value }))}
              placeholder="01"
            />
            <Input
              label="Rack"
              value={form.rack}
              onChange={(e) => setForm((f) => ({ ...f, rack: e.target.value }))}
              placeholder="01"
            />
            <Input
              label="Bin"
              value={form.bin}
              onChange={(e) => setForm((f) => ({ ...f, bin: e.target.value }))}
              placeholder="01"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-[var(--brand-steel)]/30"
            />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}
