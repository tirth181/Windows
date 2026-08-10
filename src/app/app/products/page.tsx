"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { money } from "@/lib/format";
import { Button, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/ui";

export default function ProductsPage() {
  const org = useAppStore((s) => s.currentOrg());
  const products = useAppStore((s) => s.products);
  const addProduct = useAppStore((s) => s.addProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    unitPrice: 0,
    unit: "unit",
    taxRate: 0,
  });

  const rows = useMemo(
    () => products.filter((p) => p.organizationId === org?.id),
    [products, org],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addProduct({
      ...form,
      unitPrice: Number(form.unitPrice) || 0,
      taxRate: Number(form.taxRate) || 0,
    });
    setForm({ name: "", description: "", unitPrice: 0, unit: "unit", taxRate: 0 });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Products & services"
        subtitle="Reusable catalog items for faster invoicing."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus size={16} /> {open ? "Close" : "Add product"}
          </Button>
        }
      />
      {open ? (
        <form onSubmit={onSubmit} className="surface mb-5 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Unit price">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tax %">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Save product</Button>
          </div>
        </form>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No products" body="Add services or products to drop into invoices quickly." />
      ) : (
        <div className="surface table-wrap p-2 md:p-4">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Tax</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <p className="font-700">{product.name}</p>
                    <p className="text-sm text-muted whitespace-normal">{product.description}</p>
                  </td>
                  <td>{product.unit || "—"}</td>
                  <td>{money(product.unitPrice, org?.currency)}</td>
                  <td>{product.taxRate}%</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => deleteProduct(product.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
