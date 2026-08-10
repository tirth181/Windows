"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Invoice, InvoiceStatus, LineItem } from "@/lib/types";
import { addDaysISO, invoiceTotals, money, todayISO, uid } from "@/lib/format";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";

function emptyItem(): LineItem {
  return { id: uid("li"), description: "", quantity: 1, unitPrice: 0, taxRate: 0 };
}

export function InvoiceEditor({ invoice }: { invoice?: Invoice }) {
  const router = useRouter();
  const org = useAppStore((s) => s.currentOrg());
  const clients = useAppStore((s) => s.clients.filter((c) => c.organizationId === org?.id));
  const products = useAppStore((s) => s.products.filter((p) => p.organizationId === org?.id));
  const addInvoice = useAppStore((s) => s.addInvoice);
  const updateInvoice = useAppStore((s) => s.updateInvoice);
  const canCreateInvoice = useAppStore((s) => s.canCreateInvoice);
  const addClient = useAppStore((s) => s.addClient);

  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(invoice?.clientId ?? clients[0]?.id ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft");
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? todayISO());
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? addDaysISO(14));
  const [discountPercent, setDiscountPercent] = useState(invoice?.discountPercent ?? 0);
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [terms, setTerms] = useState(invoice?.terms ?? "Payment due within 14 days.");
  const [items, setItems] = useState<LineItem[]>(invoice?.items ?? [emptyItem()]);
  const [quickClient, setQuickClient] = useState("");

  const totals = useMemo(
    () => invoiceTotals({ items, discountPercent }),
    [items, discountPercent],
  );

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addProductLine(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      {
        id: uid("li"),
        description: product.name,
        quantity: 1,
        unitPrice: product.unitPrice,
        taxRate: product.taxRate,
      },
    ]);
  }

  function createQuickClient() {
    if (!quickClient.trim()) return;
    const client = addClient({ name: quickClient.trim() });
    if (!client) {
      setError("Could not create client. Check your plan limits.");
      return;
    }
    setClientId(client.id);
    setQuickClient("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!clientId) {
      setError("Select or create a client.");
      return;
    }
    if (items.every((i) => !i.description.trim())) {
      setError("Add at least one line item.");
      return;
    }
    const payload = {
      clientId,
      status,
      issueDate,
      dueDate,
      items,
      notes,
      terms,
      discountPercent: Number(discountPercent) || 0,
      currency: org?.currency ?? "USD",
    };
    if (invoice) {
      updateInvoice(invoice.id, payload);
      router.push(`/app/invoices/${invoice.id}`);
      return;
    }
    const gate = canCreateInvoice();
    if (!gate.ok) {
      setError(gate.error);
      return;
    }
    const created = addInvoice(payload);
    if (!created) {
      setError("Could not create invoice.");
      return;
    }
    router.push(`/app/invoices/${created.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="surface grid gap-4 p-5 md:grid-cols-2">
        <Field label="Client">
          <Select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Or quick-add client name">
          <div className="flex gap-2">
            <Input value={quickClient} onChange={(e) => setQuickClient(e.target.value)} />
            <Button type="button" variant="secondary" onClick={createQuickClient}>
              Add
            </Button>
          </div>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
            {["draft", "sent", "viewed", "paid", "overdue", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Discount %">
          <Input
            type="number"
            min={0}
            max={100}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
          />
        </Field>
        <Field label="Issue date">
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      <div className="surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-xl font-700">Line items</h2>
          <div className="flex flex-wrap gap-2">
            {products.length > 0 ? (
              <Select defaultValue="" onChange={(e) => addProductLine(e.target.value)}>
                <option value="" disabled>
                  Add from products
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
              <Plus size={16} /> Add line
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-2xl bg-paper-2 p-3 md:grid-cols-[2fr_0.7fr_0.9fr_0.7fr_auto]">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Rate"
                value={item.unitPrice}
                onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Tax %"
                value={item.taxRate}
                onChange={(e) => updateItem(item.id, { taxRate: Number(e.target.value) })}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                aria-label="Remove line"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-5 ml-auto max-w-xs space-y-1 text-right">
          <p className="text-sm text-muted">Subtotal {money(totals.subtotal, org?.currency)}</p>
          <p className="text-sm text-muted">Tax {money(totals.tax, org?.currency)}</p>
          <p className="text-sm text-muted">Discount {money(totals.discount, org?.currency)}</p>
          <p className="display text-2xl font-800 text-teal">Total {money(totals.total, org?.currency)}</p>
        </div>
      </div>

      <div className="surface grid gap-4 p-5 md:grid-cols-2">
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Terms">
          <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{invoice ? "Save invoice" : "Create invoice"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
