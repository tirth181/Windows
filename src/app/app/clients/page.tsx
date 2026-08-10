"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Alert, Button, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/ui";

export default function ClientsPage() {
  const org = useAppStore((s) => s.currentOrg());
  const clients = useAppStore((s) => s.clients);
  const addClient = useAppStore((s) => s.addClient);
  const deleteClient = useAppStore((s) => s.deleteClient);
  const canCreateClient = useAppStore((s) => s.canCreateClient);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: "",
  });

  const rows = useMemo(
    () => clients.filter((c) => c.organizationId === org?.id).sort((a, b) => a.name.localeCompare(b.name)),
    [clients, org],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const gate = canCreateClient();
    if (!gate.ok) {
      setError(gate.error);
      return;
    }
    const created = addClient(form);
    if (!created) {
      setError("Could not create client.");
      return;
    }
    setForm({ name: "", email: "", phone: "", company: "", address: "", notes: "" });
    setOpen(false);
    setError("");
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="People and companies you bill."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus size={16} /> {open ? "Close" : "Add client"}
          </Button>
        }
      />
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      {open ? (
        <form onSubmit={onSubmit} className="surface mb-5 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Company">
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Save client</Button>
          </div>
        </form>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No clients" body="Add a client before sending your first invoice." />
      ) : (
        <div className="surface table-wrap p-2 md:p-4">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((client) => (
                <tr key={client.id}>
                  <td className="font-700">{client.name}</td>
                  <td>{client.company || "—"}</td>
                  <td>{client.email || "—"}</td>
                  <td>{client.phone || "—"}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => deleteClient(client.id)} aria-label="Delete">
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
