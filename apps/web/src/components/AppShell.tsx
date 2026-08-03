'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AiAssistant } from './AiAssistant';

const NAV: { href: string; label: string; icon: string; perm: string }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', perm: 'dashboard:view' },
  { href: '/inventory', label: 'Inventory', icon: '📦', perm: 'inventory:view' },
  { href: '/receiving', label: 'Receiving', icon: '📥', perm: 'inbound:view' },
  { href: '/shipping', label: 'Shipping', icon: '🚚', perm: 'outbound:view' },
  { href: '/customers', label: 'Customers', icon: '🤝', perm: 'customers:view' },
  { href: '/billing', label: 'Billing', icon: '💳', perm: 'billing:view' },
  { href: '/users', label: 'Users & Roles', icon: '🔐', perm: 'users:view' },
  { href: '/integrations', label: 'Integrations', icon: '🔌', perm: 'integrations:view' },
  { href: '/security', label: 'Security & Audit', icon: '🛡️', perm: 'audit:view' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading, logout, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!session) return null;

  const nav = NAV.filter((n) => can(n.perm));

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">A</div>
          <div>
            <p className="text-sm font-bold text-slate-800">AetherWMS</p>
            <p className="text-xs text-slate-400">3PL Operating System</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="px-2 text-xs font-medium text-slate-500">{session.tenant.name}</p>
          <p className="px-2 text-xs text-slate-400">{session.user.role}</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{session.tenant.name}</p>
            <h1 className="text-lg font-semibold capitalize text-slate-800">{pathname.split('/')[1] || 'dashboard'}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {session.user.firstName} {session.user.lastName}
              </p>
              <p className="text-xs text-slate-400">{session.user.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {session.user.firstName[0]}
              {session.user.lastName[0]}
            </div>
            <button onClick={logout} className="btn-ghost text-xs">
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>

      <AiAssistant />
    </div>
  );
}
