'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/useFetch';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  user: string;
  ip: string;
  before: any;
  after: any;
  createdAt: string;
}
interface LoginEvent {
  id: string;
  email: string;
  success: boolean;
  reason: string;
  ip: string;
  createdAt: string;
}

export default function SecurityPage() {
  const [tab, setTab] = useState<'audit' | 'logins'>('audit');
  const { data: logs } = useFetch<AuditLog[]>('/api/audit/logs');
  const { data: logins } = useFetch<LoginEvent[]>('/api/audit/logins');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={tab === 'audit' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('audit')}>Audit trail</button>
        <button className={tab === 'logins' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('logins')}>Login monitoring</button>
      </div>

      {tab === 'audit' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">IP</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{l.user}</td>
                  <td className="px-4 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{l.action}</code></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {l.before || l.after ? (
                      <span>{JSON.stringify(l.before)} → {JSON.stringify(l.after)}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{l.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">IP</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logins ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-500">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{e.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {e.success ? 'success' : 'failed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.reason || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{e.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
