'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuth } from '@/lib/auth';

interface Connection {
  id: string;
  name: string;
  type: string;
  system: string;
  schedule: string;
  status: string;
  lastSyncAt: string | null;
  lastStatus: string;
  mappings: { id: string; sourceField: string; targetField: string }[];
}

export default function IntegrationsPage() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useFetch<Connection[]>('/api/integrations');
  const [busy, setBusy] = useState<string | null>(null);

  async function sync(id: string) {
    setBusy(id);
    try {
      await api(`/api/integrations/${id}/sync`, { method: 'POST' });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-slate-400">Loading integrations…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Connect external systems (SAP, Oracle, Shopify, databases, EDI…) with a no-code field mapping and schedule.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{c.system || c.type} · {c.type.toUpperCase()}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium text-slate-500">Field mapping</p>
              {c.mappings.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <code className="rounded bg-white px-1.5 py-0.5">{m.sourceField}</code>
                  <span>→</span>
                  <code className="rounded bg-white px-1.5 py-0.5">{m.targetField}</code>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Schedule: {c.schedule}{c.lastSyncAt ? ` · last: ${new Date(c.lastSyncAt).toLocaleTimeString()}` : ''}
              </span>
              {can('integrations:manage') && (
                <button className="btn-ghost text-xs" disabled={busy === c.id} onClick={() => sync(c.id)}>
                  {busy === c.id ? 'Syncing…' : 'Run sync'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
