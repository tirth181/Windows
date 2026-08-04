'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';

interface Item {
  id: string;
  materialCode: string;
  description: string;
  batchNumber: string;
  palletId: string;
  boxId: string;
  unitOfMeasure: string;
  receivedQty: number;
  remainingQty: number;
  status: string;
  customerName: string | null;
  warehouseCode: string;
  locationCode: string | null;
}

const ROW_TINT: Record<string, string> = {
  partial: 'bg-amber-50/60',
  empty: 'bg-red-50/50',
  quality_hold: 'bg-orange-50/50',
};

export default function InventoryPage() {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, loading, error, reload } = useFetch<Item[]>('/api/inventory');
  const { data: locations } = useFetch<{ id: string; code: string }[]>('/api/locations');
  const [moving, setMoving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((i) => {
      const matchesQ =
        !q ||
        [i.materialCode, i.batchNumber, i.palletId, i.boxId, i.description].some((f) => f.toLowerCase().includes(q.toLowerCase()));
      const matchesStatus = !statusFilter || i.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [data, q, statusFilter]);

  async function move(itemId: string, locationId: string) {
    if (!locationId) return;
    setMoving(itemId);
    try {
      await api(`/api/inventory/${itemId}/move`, { method: 'POST', body: JSON.stringify({ locationId }) });
      await reload();
    } finally {
      setMoving(null);
    }
  }

  if (loading) return <p className="text-slate-400">Loading inventory…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search material, batch, pallet…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="partial">Partial</option>
          <option value="empty">Empty</option>
          <option value="quality_hold">Quality Hold</option>
          <option value="reserved">Reserved</option>
        </select>
        <span className="text-sm text-slate-500">{filtered.length} lots</span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Batch / Pallet</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Status</th>
              {can('inventory:move') && <th className="px-4 py-3">Move</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((i) => {
              const pct = i.receivedQty > 0 ? Math.round((i.remainingQty / i.receivedQty) * 100) : 0;
              return (
                <tr key={i.id} className={ROW_TINT[i.status] ?? ''}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{i.materialCode}</p>
                    <p className="text-xs text-slate-400">{i.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{i.batchNumber || '—'}</p>
                    <p className="text-xs text-slate-400">{i.palletId}{i.boxId ? ` · ${i.boxId}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{i.locationCode ?? 'unassigned'}</span>
                    <span className="ml-1 text-xs text-slate-400">{i.warehouseCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full ${i.status === 'partial' ? 'bg-amber-400' : i.status === 'empty' ? 'bg-red-400' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-slate-700">{i.remainingQty} / {i.receivedQty} {i.unitOfMeasure}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  {can('inventory:move') && (
                    <td className="px-4 py-3">
                      <select
                        className="input max-w-[120px] py-1 text-xs"
                        disabled={moving === i.id}
                        defaultValue=""
                        onChange={(e) => move(i.id, e.target.value)}
                      >
                        <option value="">Move to…</option>
                        {(locations ?? []).map((l) => (
                          <option key={l.id} value={l.id}>{l.code}</option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
