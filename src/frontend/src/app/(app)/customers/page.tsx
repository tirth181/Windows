"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { apiFetch, apiFetchOrDemo } from "@/lib/api";
import { DEMO_CUSTOMERS } from "@/lib/mock-data";
import { loadDemoCollection, upsertDemoItem } from "@/lib/demo-store";
import type { Customer } from "@/types";
import {
  Button,
  DemoBanner,
  Input,
  Modal,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

type CustomerForm = {
  code: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};

const emptyForm = (): CustomerForm => ({
  code: "",
  name: "",
  contactEmail: "",
  contactPhone: "",
  isActive: true,
});

export default function CustomersPage() {
  const canManage = useAuthStore(
    (s) => s.hasPermission("customers.manage") || s.hasPermission("admin.full"),
  );
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [demo, setDemo] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return loadDemoCollection("customers", DEMO_CUSTOMERS);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = refresh();
      const result = await apiFetchOrDemo<{ items: Customer[] } | Customer[]>(
        "/customers",
        local,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
      setCustomers(data);
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

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      code: customer.code,
      name: customer.name,
      contactEmail: customer.contactEmail || "",
      contactPhone: customer.contactPhone || "",
      isActive: customer.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      isActive: form.isActive,
    };
    const record: Customer = {
      id: editing?.id || crypto.randomUUID(),
      ...payload,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
    };
    try {
      if (editing) {
        await apiFetch(`/customers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === record.id);
        return idx >= 0
          ? prev.map((c, i) => (i === idx ? record : c))
          : [record, ...prev];
      });
    } catch {
      const next = upsertDemoItem("customers", DEMO_CUSTOMERS, record);
      setCustomers(next);
      setDemo(true);
    } finally {
      setSaving(false);
      setModalOpen(false);
    }
  }

  const filtered = customers.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="3PL customer accounts bound to warehouse inventory."
        actions={
          canManage ? (
            <Button variant="outline" type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          ) : null
        }
      />
      <DemoBanner show={demo} />
      <div className="max-w-sm">
        <Input
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or code"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] font-medium">
                  {c.code}
                </td>
                <td className="px-4 py-3 text-[var(--brand-ink)]">{c.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.contactEmail || "—"}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.contactPhone || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.isActive ? "Active" : "Suspended"} />
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => openEdit(c)}
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
        title={editing ? "Modify customer" : "Add customer"}
        description={
          editing
            ? "Update customer contact details and active status."
            : "Create a new customer account."
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
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Customer code"
            className="font-[family-name:var(--font-mono)]"
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Customer name"
          />
          <Input
            label="Contact email"
            type="email"
            value={form.contactEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactEmail: e.target.value }))
            }
            placeholder="ops@example.com"
          />
          <Input
            label="Contact phone"
            value={form.contactPhone}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactPhone: e.target.value }))
            }
            placeholder="+1-555-0100"
          />
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
