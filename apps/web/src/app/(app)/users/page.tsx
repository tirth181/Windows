'use client';

import { useFetch } from '@/lib/useFetch';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  warehouses: string[];
}
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  _count: { users: number };
}

export default function UsersPage() {
  const { data: users, loading } = useFetch<User[]>('/api/users');
  const { data: roles } = useFetch<Role[]>('/api/roles');

  if (loading) return <p className="text-slate-400">Loading users…</p>;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Users</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Warehouses</th><th className="px-4 py-3">MFA</th><th className="px-4 py-3">Last login</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{u.role ?? 'none'}</span></td>
                  <td className="px-4 py-3 text-slate-600">{u.warehouses.length ? u.warehouses.join(', ') : 'All'}</td>
                  <td className="px-4 py-3">{u.mfaEnabled ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Roles & permissions</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {(roles ?? []).map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{r.name}</p>
                <span className="text-xs text-slate-400">{r._count.users} user(s)</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {r.permissions.includes('*') ? (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Full access (*)</span>
                ) : (
                  r.permissions.map((p) => (
                    <span key={p} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{p}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
