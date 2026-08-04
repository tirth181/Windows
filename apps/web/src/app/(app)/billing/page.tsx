'use client';

import { useFetch } from '@/lib/useFetch';

interface Invoice {
  customerId: string;
  customer: string;
  code: string;
  pricingTier: string;
  lines: { activity: string; units: number; rate: number; uom: string; amount: number }[];
  total: number;
}
interface BillingData {
  period: string;
  invoices: Invoice[];
  grandTotal: number;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export default function BillingPage() {
  const { data, loading, error } = useFetch<BillingData>('/api/billing');

  if (loading) return <p className="text-slate-400">Loading billing…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Activity-based billing for period <strong>{data.period}</strong> — charges accrue from real warehouse events against each client&apos;s rate card.</p>
        <div className="card px-5 py-3 text-right">
          <p className="text-xs text-slate-400">Total billable</p>
          <p className="text-2xl font-bold text-slate-800">{money(data.grandTotal)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.invoices.map((inv) => (
          <div key={inv.customerId} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{inv.customer}</p>
                <p className="text-xs text-slate-400">{inv.code} · {inv.pricingTier} tier</p>
              </div>
              <p className="text-lg font-bold text-slate-800">{money(inv.total)}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="py-1">Activity</th><th className="py-1">Units</th><th className="py-1">Rate</th><th className="py-1 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.activity} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-700">{l.activity}</td>
                    <td className="py-1.5 text-slate-600">{l.units} <span className="text-xs text-slate-400">{l.uom}</span></td>
                    <td className="py-1.5 text-slate-600">{money(l.rate)}</td>
                    <td className="py-1.5 text-right font-medium text-slate-700">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
