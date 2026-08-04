'use client';

import { Fragment, useState } from 'react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuth } from '@/lib/auth';
import { Attachments } from '@/components/Attachments';

interface Receipt {
  id: string;
  reference: string;
  status: string;
  warehouseCode: string;
  customerName: string | null;
  lines: { id: string; materialCode: string; batchNumber: string; quantity: number; unitOfMeasure: string }[];
}

export default function ReceivingPage() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useFetch<Receipt[]>('/api/inbound');
  const { data: warehouses } = useFetch<{ id: string; code: string; name: string }[]>('/api/warehouses');
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ reference: '', warehouseId: '', materialCode: '', batchNumber: '', quantity: '' });
  const [showForm, setShowForm] = useState(false);

  async function putaway(id: string) {
    setBusy(id);
    try {
      await api(`/api/inbound/${id}/putaway`, { method: 'POST' });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy('new');
    try {
      await api('/api/inbound', {
        method: 'POST',
        body: JSON.stringify({
          reference: form.reference,
          warehouseId: form.warehouseId || warehouses?.[0]?.id,
          lines: [{ materialCode: form.materialCode, batchNumber: form.batchNumber, unitOfMeasure: 'lb', quantity: Number(form.quantity) }],
        }),
      });
      setForm({ reference: '', warehouseId: '', materialCode: '', batchNumber: '', quantity: '' });
      setShowForm(false);
      await reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-slate-400">Loading receipts…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      {can('inbound:create') && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>+ New receipt</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="card grid grid-cols-2 gap-3 p-5 lg:grid-cols-5">
          <div><label className="label">Reference</label><input className="input" required value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div><label className="label">Warehouse</label>
            <select className="input" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
              {(warehouses ?? []).map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
            </select>
          </div>
          <div><label className="label">Material</label><input className="input" required value={form.materialCode} onChange={(e) => setForm({ ...form, materialCode: e.target.value })} /></div>
          <div><label className="label">Batch</label><input className="input" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></div>
          <div><label className="label">Qty (lb)</label><input className="input" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div className="col-span-full"><button className="btn-primary" disabled={busy === 'new'}>{busy === 'new' ? 'Saving…' : 'Create receipt'}</button></div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Lines</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data ?? []).map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.reference}</td>
                  <td className="px-4 py-3 text-slate-600">{r.warehouseCode}</td>
                  <td className="px-4 py-3 text-slate-600">{r.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.lines.map((l) => `${l.materialCode} (${l.quantity}${l.unitOfMeasure})`).join(', ')}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">{r.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="btn-ghost text-xs" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>📎 Docs</button>
                      {can('inbound:edit') && r.status !== 'closed' && (
                        <button className="btn-ghost text-xs" disabled={busy === r.id} onClick={() => putaway(r.id)}>
                          {busy === r.id ? 'Putting away…' : 'Putaway → stock'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-3"><Attachments entityType="receipt" entityId={r.id} compact /></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
