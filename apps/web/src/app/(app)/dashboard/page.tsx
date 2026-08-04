'use client';

import { useFetch } from '@/lib/useFetch';
import { StatusBadge } from '@/components/StatusBadge';

interface DashboardData {
  kpis: {
    inventoryItems: number;
    partialItems: number;
    totalRemainingWeight: number;
    openOrders: number;
    delayedOrders: number;
    receipts: number;
    warehouses: number;
    customers: number;
  };
  inventoryByStatus: Record<string, number>;
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ?? 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error } = useFetch<DashboardData>('/api/dashboard');

  if (loading) return <p className="text-slate-400">Loading dashboard…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return null;

  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Inventory lots" value={k.inventoryItems} />
        <Kpi label="Partial lots" value={k.partialItems} accent="text-amber-600" />
        <Kpi label="Remaining weight (lbs)" value={k.totalRemainingWeight.toLocaleString()} />
        <Kpi label="Open orders" value={k.openOrders} />
        <Kpi label="Delayed orders" value={k.delayedOrders} accent={k.delayedOrders ? 'text-red-600' : 'text-slate-800'} />
        <Kpi label="Receipts" value={k.receipts} />
        <Kpi label="Warehouses" value={k.warehouses} />
        <Kpi label="Customers" value={k.customers} />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Inventory by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.inventoryByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <StatusBadge status={status} />
              <span className="text-sm font-semibold text-slate-700">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-700">Try the AI assistant</h2>
        <p className="mt-1 text-sm text-slate-500">
          Open the ✨ assistant (bottom-right) and ask “How much inventory is available?”, “Show partial pallets”, or
          “Where is batch B240501?”. It only answers within your permissions.
        </p>
      </div>
    </div>
  );
}
