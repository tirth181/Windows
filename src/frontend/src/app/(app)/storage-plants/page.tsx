"use client";

import { useEffect, useMemo, useState } from "react";
import { Factory, Pencil, Plus, Trash2 } from "lucide-react";
import { DEMO_STORAGE_PLANTS } from "@/lib/mock-data";
import {
  loadDemoCollection,
  saveDemoCollection,
  upsertDemoItem,
} from "@/lib/demo-store";
import { companiesForUser } from "@/lib/companies-scope";
import { STORAGE_PLANTS_KEY } from "@/lib/storage-plants";
import type { StoragePlant } from "@/types";
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

type FormState = {
  id?: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  address: "",
  isActive: true,
});

export default function StoragePlantsPage() {
  const user = useAuthStore((s) => s.user);
  const warehouses = useAuthStore((s) => s.warehouses);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const myCompany =
    warehouses.find((w) => w.id === selectedWarehouseId) ||
    warehouses[0] ||
    companiesForUser(user)[0];
  const canManage = useAuthStore(
    (s) =>
      s.hasPermission("locations.manage") ||
      s.hasPermission("warehouse.create") ||
      s.hasPermission("admin.full") ||
      s.hasPermission("platform.admin"),
  );

  const [plants, setPlants] = useState<StoragePlant[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StoragePlant | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    const all = loadDemoCollection(STORAGE_PLANTS_KEY, DEMO_STORAGE_PLANTS);
    const scoped = myCompany
      ? all.filter((p) => p.warehouseId === myCompany.id)
      : [];
    setPlants(scoped);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when company changes
  }, [myCompany?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plants;
    return plants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q),
    );
  }, [plants, query]);

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(plant: StoragePlant) {
    setForm({
      id: plant.id,
      code: plant.code,
      name: plant.name,
      address: plant.address || "",
      isActive: plant.isActive,
    });
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!myCompany) {
      setError("No 3PL company is available for this user.");
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const record: StoragePlant = {
      id: form.id || crypto.randomUUID(),
      warehouseId: myCompany.id,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      isActive: form.isActive,
    };
    const next = upsertDemoItem(STORAGE_PLANTS_KEY, DEMO_STORAGE_PLANTS, record);
    setPlants(next.filter((p) => p.warehouseId === myCompany.id));
    setSaving(false);
    setOpen(false);
    setMessage(form.id ? "Storage plant updated." : "Storage plant added.");
  }

  function handleDelete() {
    if (!confirmDelete || !myCompany) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const next = loadDemoCollection(
      STORAGE_PLANTS_KEY,
      DEMO_STORAGE_PLANTS,
    ).filter((p) => p.id !== confirmDelete.id);
    saveDemoCollection(STORAGE_PLANTS_KEY, next);
    setPlants(next.filter((p) => p.warehouseId === myCompany.id));
    setSaving(false);
    setConfirmDelete(null);
    setMessage(`Removed ${confirmDelete.name}.`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Storage Plants"
        description={
          myCompany
            ? `Configure storage plants for ${myCompany.name}. Only these plants appear on inbound receiving.`
            : "Configure storage plants for your 3PL company."
        }
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate} disabled={!myCompany}>
              <Plus className="h-4 w-4" />
              Add plant
            </Button>
          ) : null
        }
      />
      <DemoBanner show />
      {message ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {message}
        </p>
      ) : null}
      {error && !open ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] max-w-sm flex-1">
          <Input
            label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or code"
          />
        </div>
        {myCompany ? (
          <p className="pb-2 text-sm text-[var(--muted)]">
            <Factory className="mr-1 inline h-4 w-4" aria-hidden />
            {myCompany.code} — {myCompany.name}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Plant</th>
              <th className="px-4 py-3 font-semibold">Address</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[var(--muted)]"
                >
                  {canManage
                    ? "No storage plants yet. Add a plant to use it on inbound receiving."
                    : "No storage plants are configured for your company."}
                </td>
              </tr>
            ) : (
              filtered.map((plant) => (
                <tr key={plant.id} className="hover:bg-[var(--surface)]/80">
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] font-medium">
                    {plant.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--brand-ink)]">
                    {plant.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {plant.address || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={plant.isActive ? "Active" : "Suspended"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => openEdit(plant)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modify
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          onClick={() => setConfirmDelete(plant)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={form.id ? "Modify storage plant" : "Add storage plant"}
        description="Plants you add here are the only options on inbound Storage Plant."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
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
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="CHI-NORTH"
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Chicago North Plant"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            placeholder="Optional street address"
          />
          <Select
            label="Status"
            value={form.isActive ? "active" : "inactive"}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                isActive: e.target.value === "active",
              }))
            }
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        title="Remove storage plant?"
        description="Inbound forms will no longer offer this plant. Historical inbound rows keep the saved plant code."
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={saving}
              onClick={handleDelete}
            >
              {saving ? "Removing…" : "Remove"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--brand-ink)]">
          Remove <strong>{confirmDelete?.name}</strong> (
          {confirmDelete?.code})?
        </p>
      </Modal>
    </div>
  );
}
