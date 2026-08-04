"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_OUTBOUND } from "@/lib/mock-data";
import type { OutboundOrder } from "@/types";
import { Button, DemoBanner, PageHeader, StatusBadge } from "@/components/ui";
import { formatWeight } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function OutboundPage() {
  const canCreate = useAuthStore((s) => s.hasPermission("outbound.create"));
  const [rows, setRows] = useState<OutboundOrder[]>(DEMO_OUTBOUND);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<
        { items: OutboundOrder[] } | OutboundOrder[]
      >("/outbound", DEMO_OUTBOUND);
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? DEMO_OUTBOUND;
      setRows(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Outbound"
        description="Pick and ship customer orders with live weight and pallet totals."
        actions={
          canCreate ? (
            <Link href="/outbound/new">
              <Button>
                <Plus className="h-4 w-4" />
                New shipment
              </Button>
            </Link>
          ) : null
        }
      />
      <DemoBanner show={demo} />

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Warehouse</th>
              <th className="px-4 py-3 font-semibold">Ship date</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">Weight (lbs)</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] font-medium text-[var(--brand-ink)]">
                  {row.orderNumber}
                </td>
                <td className="px-4 py-3">{row.customerName}</td>
                <td className="px-4 py-3">{row.warehouseName}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                  {format(new Date(row.shipDate), "MMM d, HH:mm")}
                </td>
                <td className="px-4 py-3">{row.destination || "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.totalWeight != null ? formatWeight(row.totalWeight) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
