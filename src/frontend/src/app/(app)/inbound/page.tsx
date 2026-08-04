"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Pencil, Plus } from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_INBOUND } from "@/lib/mock-data";
import { loadDemoCollection } from "@/lib/demo-store";
import type { InboundLoad } from "@/types";
import {
  Badge,
  Button,
  DemoBanner,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { formatWeight } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function InboundPage() {
  const canCreate = useAuthStore((s) => s.hasPermission("inbound.create"));
  const canEdit = useAuthStore(
    (s) => s.hasPermission("inbound.edit") || s.hasPermission("admin.full"),
  );
  const [rows, setRows] = useState<InboundLoad[]>(DEMO_INBOUND);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadDemoCollection("inbound", DEMO_INBOUND);
      const result = await apiFetchOrDemo<{ items: InboundLoad[] } | InboundLoad[]>(
        "/inbound",
        local,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
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
        title="Inbound"
        description="Receiving queue and load history. Use Modify to update draft entries."
        actions={
          canCreate ? (
            <Link href="/inbound/new">
              <Button size="md">
                <Plus className="h-4 w-4" />
                New receiving
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
              <th className="px-4 py-3 font-semibold">Load</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">3PL company</th>
              <th className="px-4 py-3 font-semibold">Arrival</th>
              <th className="px-4 py-3 font-semibold">Lines</th>
              <th className="px-4 py-3 font-semibold">Weight (lbs)</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/inbound/${row.id}`}
                    className="font-[family-name:var(--font-mono)] font-medium text-[var(--brand-ink)] hover:text-[var(--accent)]"
                  >
                    {row.loadNumber}
                  </Link>
                  {row.carrier ? (
                    <p className="text-xs text-[var(--muted)]">{row.carrier}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[var(--brand-ink)]">
                  {row.customerName}
                </td>
                <td className="px-4 py-3">{row.warehouseName}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                  {format(new Date(row.arrivalDate), "MMM d, HH:mm")}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.lineCount ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.totalWeight != null ? formatWeight(row.totalWeight) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Link href={`/inbound/${row.id}`}>
                      <Button variant="outline" size="sm" type="button">
                        <Pencil className="h-3.5 w-3.5" />
                        {row.status === "Draft" ? "Modify" : "View"}
                      </Button>
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 text-xs text-[var(--muted)]">
        <Badge tone="steel">{rows.length} loads</Badge>
      </div>
    </div>
  );
}
