"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DEMO_COMPANY } from "@/lib/mock-data";
import { loadDemoCollection, saveDemoCollection, upsertDemoItem } from "@/lib/demo-store";
import type { Company } from "@/types";
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

const DEMO_COMPANIES: Company[] = [
  DEMO_COMPANY,
  {
    id: "co-2",
    name: "Harborline Logistics",
    legalName: "Harborline Logistics Inc.",
    status: "Active",
    primaryContactEmail: "admin@harborline.com",
    timezone: "America/Chicago",
    code: "HARBOR",
  },
  {
    id: "co-3",
    name: "Summit Freight Partners",
    legalName: "Summit Freight Partners LLC",
    status: "Trial",
    primaryContactEmail: "ops@summitfreight.example",
    timezone: "America/New_York",
    code: "SUMMIT",
  },
];

type FormState = {
  id?: string;
  name: string;
  code: string;
  legalName: string;
  primaryContactEmail: string;
  timezone: string;
  status: Company["status"];
};

const emptyForm = (): FormState => ({
  name: "",
  code: "",
  legalName: "",
  primaryContactEmail: "",
  timezone: "America/Chicago",
  status: "Active",
});

function normalizeCompany(raw: Record<string, unknown>): Company {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    code: String(raw.code ?? ""),
    legalName: raw.legalName ? String(raw.legalName) : undefined,
    primaryContactEmail: raw.primaryContactEmail
      ? String(raw.primaryContactEmail)
      : undefined,
    timezone: String(raw.timezone ?? "UTC"),
    status: (raw.status as Company["status"]) || "Active",
  };
}

export default function CompaniesPage() {
  const canManage = useAuthStore(
    (s) =>
      s.hasPermission("company.edit") ||
      s.hasPermission("admin.full") ||
      s.hasPermission("platform.admin"),
  );
  const currentCompanyId = useAuthStore((s) => s.user?.companyId);
  const [companies, setCompanies] = useState<Company[]>(DEMO_COMPANIES);
  const [demo, setDemo] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const local = loadDemoCollection("companies", DEMO_COMPANIES);
    try {
      const data = await apiFetch<Record<string, unknown>[]>("/companies");
      setCompanies(data.map(normalizeCompany));
      setDemo(false);
    } catch {
      setCompanies(local);
      setDemo(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = companies.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.code || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.legalName || "").toLowerCase().includes(query.toLowerCase()),
  );

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(company: Company) {
    setForm({
      id: company.id,
      name: company.name,
      code: company.code || "",
      legalName: company.legalName || "",
      primaryContactEmail: company.primaryContactEmail || "",
      timezone: company.timezone || "UTC",
      status: company.status,
    });
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      legalName: form.legalName.trim() || undefined,
      primaryContactEmail: form.primaryContactEmail.trim() || undefined,
      timezone: form.timezone,
      status: form.status,
    };
    const record: Company = {
      id: form.id || crypto.randomUUID(),
      ...payload,
    };
    try {
      if (form.id) {
        await apiFetch(`/companies/${form.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/companies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await refresh();
      setDemo(false);
    } catch {
      const next = upsertDemoItem("companies", DEMO_COMPANIES, record);
      setCompanies(next);
      setDemo(true);
    } finally {
      setSaving(false);
      setOpen(false);
      setMessage(form.id ? "3PL company updated." : "3PL company added.");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.id === currentCompanyId) {
      setError("You cannot remove the company you are signed into.");
      setConfirmDelete(null);
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/companies/${confirmDelete.id}`, { method: "DELETE" });
      await refresh();
      setDemo(false);
    } catch {
      const next = loadDemoCollection("companies", DEMO_COMPANIES).filter(
        (c) => c.id !== confirmDelete.id,
      );
      saveDemoCollection("companies", next);
      setCompanies(next);
      setDemo(true);
    } finally {
      setSaving(false);
      setConfirmDelete(null);
      setMessage(`Removed ${confirmDelete.name}.`);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="3PL Companies"
        description="Manage independent 3PL tenants on the platform. Add, modify, or remove companies."
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add company
            </Button>
          ) : null
        }
      />
      <DemoBanner show={demo} />
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
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Timezone</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {filtered.map((company) => (
              <tr key={company.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] font-medium">
                  {company.code || "—"}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--brand-ink)]">{company.name}</p>
                  {company.legalName ? (
                    <p className="text-xs text-[var(--muted)]">{company.legalName}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {company.primaryContactEmail || "—"}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{company.timezone}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={company.status} />
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => openEdit(company)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modify
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        disabled={company.id === currentCompanyId}
                        title={
                          company.id === currentCompanyId
                            ? "Cannot remove your signed-in company"
                            : "Remove company"
                        }
                        onClick={() => setConfirmDelete(company)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={form.id ? "Modify 3PL company" : "Add 3PL company"}
        description="Tenant profile for an independent 3PL operator."
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
            label="Company name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="font-[family-name:var(--font-mono)] uppercase"
          />
          <Input
            label="Legal name"
            value={form.legalName}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
          />
          <Input
            label="Primary contact email"
            type="email"
            value={form.primaryContactEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, primaryContactEmail: e.target.value }))
            }
          />
          <Input
            label="Timezone"
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as Company["status"],
              }))
            }
            options={[
              { value: "Active", label: "Active" },
              { value: "Trial", label: "Trial" },
              { value: "Suspended", label: "Suspended" },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        title="Remove 3PL company?"
        description="This suspends and soft-deletes the tenant. Historical data remains for audit."
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={saving}
              onClick={handleDelete}
            >
              {saving ? "Removing…" : "Remove company"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--brand-ink)]">
          Remove <strong>{confirmDelete?.name}</strong>
          {confirmDelete?.code ? ` (${confirmDelete.code})` : ""}?
        </p>
      </Modal>
    </div>
  );
}
