'use client';

import { useFetch } from '@/lib/useFetch';

interface Customer {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
  pricingVisible: boolean;
  pricingTier?: string;
  ratePerPallet?: number;
}

export default function CustomersPage() {
  const { data, loading, error } = useFetch<Customer[]>('/api/customers');

  if (loading) return <p className="text-slate-400">Loading customers…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const showPricing = data?.[0]?.pricingVisible;

  return (
    <div className="space-y-3">
      {!showPricing && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Pricing columns are hidden — your role lacks the <code>customers:pricing</code> permission.
        </p>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th>
              {showPricing && <><th className="px-4 py-3">Tier</th><th className="px-4 py-3">Rate / pallet</th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{c.code}</td>
                <td className="px-4 py-3 text-slate-600">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.contactEmail || '—'}</td>
                {showPricing && <><td className="px-4 py-3 capitalize text-slate-600">{c.pricingTier}</td><td className="px-4 py-3 text-slate-600">${c.ratePerPallet?.toFixed(2)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
