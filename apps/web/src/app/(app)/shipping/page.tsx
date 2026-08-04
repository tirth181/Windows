'use client';

import { Fragment, useState } from 'react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuth } from '@/lib/auth';
import { Attachments } from '@/components/Attachments';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  delayed: boolean;
  dueDate: string | null;
  warehouseCode: string;
  customerName: string | null;
  lines: { materialCode: string; quantity: number; unitOfMeasure: string }[];
}

interface Line {
  materialCode: string;
  quantity: string;
  unitOfMeasure: string;
}

export default function ShippingPage() {
  const { can, session } = useAuth();
  const { data, loading, error, reload } = useFetch<Order[]>('/api/outbound');
  const { data: customers } = useFetch<{ id: string; name: string }[]>(can('customers:view') ? '/api/customers' : null);
  const fetchedWarehouses = useFetch<{ id: string; code: string; name: string }[]>(
    can('warehouses:view') && !(session?.warehouses.length) ? '/api/warehouses' : null,
  );
  const warehouses = session?.warehouses.length ? session.warehouses : fetchedWarehouses.data ?? [];

  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [form, setForm] = useState({ orderNumber: '', customerId: '', warehouseId: '', dueDate: '' });
  const [lines, setLines] = useState<Line[]>([{ materialCode: '', quantity: '', unitOfMeasure: 'each' }]);

  async function act(id: string, action: 'pick' | 'ship') {
    setBusy(id + action);
    try {
      await api(`/api/outbound/${id}/${action}`, { method: 'POST' });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  function resetModal() {
    setForm({ orderNumber: '', customerId: '', warehouseId: '', dueDate: '' });
    setLines([{ materialCode: '', quantity: '', unitOfMeasure: 'each' }]);
    setCreatedOrderId(null);
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy('new');
    try {
      const payload = {
        orderNumber: form.orderNumber,
        customerId: form.customerId || undefined,
        warehouseId: form.warehouseId || warehouses[0]?.id,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        lines: lines
          .filter((l) => l.materialCode && l.quantity)
          .map((l) => ({ materialCode: l.materialCode, quantity: Number(l.quantity), unitOfMeasure: l.unitOfMeasure })),
      };
      const order = await api<{ id: string }>('/api/outbound', { method: 'POST', body: JSON.stringify(payload) });
      setCreatedOrderId(order.id); // reveal document uploader for the new order
      await reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-slate-400">Loading orders…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      {can('outbound:view') && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => { resetModal(); setShowModal(true); }}>+ New order</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Lines</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data ?? []).map((o) => (
              <Fragment key={o.id}>
                <tr className={o.delayed ? 'bg-red-50/50' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-800">{o.orderNumber} <span className="text-xs text-slate-400">{o.warehouseCode}</span></td>
                  <td className="px-4 py-3 text-slate-600">{o.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.lines.map((l) => `${l.materialCode} ×${l.quantity}`).join(', ')}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : '—'}
                    {o.delayed && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Delayed</span>}
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">{o.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="btn-ghost text-xs" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>📎 Docs</button>
                      {can('outbound:pick') && ['open', 'picking'].includes(o.status) && (
                        <button className="btn-ghost text-xs" disabled={busy === o.id + 'pick'} onClick={() => act(o.id, 'pick')}>Pick</button>
                      )}
                      {can('outbound:ship') && o.status === 'picked' && (
                        <button className="btn-primary text-xs" disabled={busy === o.id + 'ship'} onClick={() => act(o.id, 'ship')}>Ship</button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-3">
                      <Attachments entityType="order" entityId={o.id} compact />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{createdOrderId ? 'Order created' : 'New outbound order'}</h2>
              <button onClick={() => { setShowModal(false); reload(); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {!createdOrderId ? (
              <form onSubmit={createOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Order number</label><input className="input" required value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} placeholder="SO-2001" /></div>
                  <div><label className="label">Due date</label><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  <div>
                    <label className="label">Customer</label>
                    <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                      <option value="">— none —</option>
                      {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Warehouse</label>
                    <select className="input" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="label mb-0">Line items</label>
                    <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setLines([...lines, { materialCode: '', quantity: '', unitOfMeasure: 'each' }])}>+ Add line</button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((l, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <input className="input col-span-6" placeholder="Material code" value={l.materialCode} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, materialCode: e.target.value } : x)))} />
                        <input className="input col-span-3" type="number" placeholder="Qty" value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} />
                        <select className="input col-span-2" value={l.unitOfMeasure} onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, unitOfMeasure: e.target.value } : x)))}>
                          <option value="each">each</option>
                          <option value="lb">lb</option>
                          <option value="kg">kg</option>
                        </select>
                        {lines.length > 1 && <button type="button" className="col-span-1 text-red-400 hover:text-red-600" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={busy === 'new'}>{busy === 'new' ? 'Creating…' : 'Create order'}</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">✓ Order {form.orderNumber} created. Attach any documents (PO, BOL, packing list) below.</p>
                <Attachments entityType="order" entityId={createdOrderId} compact />
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => { setShowModal(false); reload(); }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
