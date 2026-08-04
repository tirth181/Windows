"use client";

import { useEffect, useState } from "react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_CUSTOMERS } from "@/lib/mock-data";
import type { Customer } from "@/types";
import { DemoBanner, PageHeader, StatusBadge, Input, Button } from "@/components/ui";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [demo, setDemo] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<{ items: Customer[] } | Customer[]>(
        "/customers",
        DEMO_CUSTOMERS,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? DEMO_CUSTOMERS;
      setCustomers(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = customers.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="3PL customer accounts bound to warehouse inventory."
        actions={<Button variant="outline">Add customer</Button>}
      />
      <DemoBanner show={demo} />
      <div className="max-w-sm">
        <Input
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or code"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] font-medium">
                  {c.code}
                </td>
                <td className="px-4 py-3 text-[var(--brand-ink)]">{c.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.contactEmail || "—"}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {c.contactPhone || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.isActive ? "Active" : "Suspended"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
