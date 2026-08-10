"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { addDaysISO, invoiceTotals, money, todayISO, uid } from "@/lib/format";
import {
  Alert,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "@/components/ui";

export default function EstimatesPage() {
  const router = useRouter();
  const org = useAppStore((s) => s.currentOrg());
  const clients = useAppStore((s) => s.clients.filter((c) => c.organizationId === org?.id));
  const estimates = useAppStore((s) => s.estimates);
  const addEstimate = useAppStore((s) => s.addEstimate);
  const deleteEstimate = useAppStore((s) => s.deleteEstimate);
  const convertEstimateToInvoice = useAppStore((s) => s.convertEstimateToInvoice);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    description: "",
    amount: 0,
  });

  const rows = useMemo(
    () =>
      estimates
        .filter((e) => e.organizationId === org?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [estimates, org],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setError("Select a client.");
      return;
    }
    addEstimate({
      clientId: form.clientId,
      status: "draft",
      issueDate: todayISO(),
      validUntil: addDaysISO(30),
      items: [
        {
          id: uid("li"),
          description: form.description || "Estimate item",
          quantity: 1,
          unitPrice: Number(form.amount) || 0,
          taxRate: 0,
        },
      ],
      discountPercent: 0,
      currency: org?.currency ?? "USD",
    });
    setOpen(false);
    setForm({ clientId: "", description: "", amount: 0 });
    setError("");
  }

  return (
    <div>
      <PageHeader
        title="Estimates"
        subtitle="Quote work, then convert accepted estimates into invoices."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus size={16} /> {open ? "Close" : "New estimate"}
          </Button>
        }
      />
      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      {open ? (
        <form onSubmit={onSubmit} className="surface mb-5 grid gap-3 p-5 md:grid-cols-3">
          <Field label="Client">
            <Select
              required
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <Input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
          <div className="md:col-span-3">
            <Button type="submit">Save estimate</Button>
          </div>
        </form>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No estimates" body="Create a quote for a client before you invoice." />
      ) : (
        <div className="surface table-wrap p-2 md:p-4">
          <table className="data">
            <thead>
              <tr>
                <th>Number</th>
                <th>Client</th>
                <th>Status</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((estimate) => {
                const client = clients.find((c) => c.id === estimate.clientId);
                return (
                  <tr key={estimate.id}>
                    <td className="font-700">{estimate.number}</td>
                    <td>{client?.company || client?.name || "—"}</td>
                    <td>
                      <StatusBadge status={estimate.status} />
                    </td>
                    <td>{money(invoiceTotals(estimate).total, estimate.currency)}</td>
                    <td className="space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const invoice = convertEstimateToInvoice(estimate.id);
                          if (invoice) router.push(`/app/invoices/${invoice.id}`);
                        }}
                      >
                        Convert
                      </Button>
                      <button className="btn btn-ghost" onClick={() => deleteEstimate(estimate.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {clients.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Need a client first?{" "}
          <Link href="/app/clients" className="font-700 text-teal">
            Add one
          </Link>
        </p>
      ) : null}
    </div>
  );
}
