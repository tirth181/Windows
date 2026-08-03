'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  { email: 'admin@abc.com', role: 'Administrator', note: 'Full access' },
  { email: 'manager@abc.com', role: 'Warehouse Manager', note: 'Ops + AI actions' },
  { email: 'john@abc.com', role: 'Warehouse Associate', note: 'No pricing/billing' },
  { email: 'exec@abc.com', role: 'Executive', note: 'Read-only + pricing' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('admin@abc.com');
  const [password, setPassword] = useState('Password123!');
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(email, password, otp || undefined);
      if (res.mfaRequired) {
        setMfaRequired(true);
        setError('Enter the 6-digit code from your authenticator app.');
        return;
      }
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-xl font-bold">A</div>
          <span className="text-lg font-semibold">AetherWMS</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">The AI-powered 3PL Operating System.</h1>
          <p className="mt-4 max-w-md text-brand-100">
            Multi-tenant warehouse management with enterprise RBAC, complete audit trails, no-code integrations, and a
            permission-aware AI assistant on every page.
          </p>
          <div className="mt-8 flex gap-6 text-sm text-brand-100">
            <div><p className="text-2xl font-bold text-white">Multi-tenant</p><p>Isolated per company</p></div>
            <div><p className="text-2xl font-bold text-white">RBAC</p><p>Module & data level</p></div>
            <div><p className="text-2xl font-bold text-white">AI</p><p>Permission-aware</p></div>
          </div>
        </div>
        <p className="text-xs text-brand-200">© AetherWMS — demo environment</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-800">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Access your warehouse operations.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            {mfaRequired && (
              <div>
                <label className="label">Authentication code</label>
                <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
              </div>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Demo accounts (password: Password123!)</p>
            <div className="space-y-1">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword('Password123!');
                    setMfaRequired(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">{a.email}</span>
                  <span className="text-xs text-slate-400">{a.role} · {a.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
