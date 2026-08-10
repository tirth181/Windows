"use client";

import { FormEvent, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { Organization, WorkspaceType } from "@/lib/types";
import { Alert, Button, Field, Input, PageHeader, Select } from "@/components/ui";

function orgToForm(org: Organization) {
  return {
    name: org.name,
    email: org.email,
    phone: org.phone ?? "",
    address: org.address ?? "",
    website: org.website ?? "",
    taxId: org.taxId ?? "",
    currency: org.currency,
    invoicePrefix: org.invoicePrefix,
    workspaceType: org.workspaceType,
  };
}

export default function SettingsPage() {
  const org = useAppStore((s) => s.currentOrg());
  const updateOrg = useAppStore((s) => s.updateOrg);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<ReturnType<typeof orgToForm> | null>(null);
  const form = draft ?? (org ? orgToForm(org) : null);

  if (!org || !form) {
    return <div className="text-muted">Loading settings…</div>;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    updateOrg(form);
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Business profile shown on invoices and PDFs." />
      <form onSubmit={onSubmit} className="surface grid max-w-3xl gap-3 p-5 md:grid-cols-2">
        {saved ? (
          <div className="md:col-span-2">
            <Alert>Settings saved.</Alert>
          </div>
        ) : null}
        <Field label="Business name">
          <Input
            required
            value={form.name}
            onChange={(e) => setDraft({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setDraft({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setDraft({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Website">
          <Input
            value={form.website}
            onChange={(e) => setDraft({ ...form, website: e.target.value })}
          />
        </Field>
        <Field label="Address" className="md:col-span-2">
          <Input
            value={form.address}
            onChange={(e) => setDraft({ ...form, address: e.target.value })}
          />
        </Field>
        <Field label="Tax ID">
          <Input value={form.taxId} onChange={(e) => setDraft({ ...form, taxId: e.target.value })} />
        </Field>
        <Field label="Currency">
          <Select
            value={form.currency}
            onChange={(e) => setDraft({ ...form, currency: e.target.value })}
          >
            {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice prefix">
          <Input
            value={form.invoicePrefix}
            onChange={(e) => setDraft({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Default workspace type">
          <Select
            value={form.workspaceType}
            onChange={(e) =>
              setDraft({ ...form, workspaceType: e.target.value as WorkspaceType })
            }
          >
            <option value="individual">Individual</option>
            <option value="family">Family</option>
            <option value="company">Company</option>
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Button type="submit">Save settings</Button>
        </div>
      </form>
    </div>
  );
}
