"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { invoiceTotals, money, shortDate } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function InvoicesPage() {
  const org = useAppStore((s) => s.currentOrg());
  const invoices = useAppStore((s) => s.invoices);
  const clients = useAppStore((s) => s.clients);

  const rows = useMemo(() => {
    if (!org) return [];
    return invoices
      .filter((i) => i.organizationId === org.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((inv) => ({
        inv,
        client: clients.find((c) => c.id === inv.clientId),
        total: invoiceTotals(inv).total,
      }));
  }, [org, invoices, clients]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Create, send, and track payments."
        actions={
          <Link href="/app/invoices/new" className="btn btn-primary">
            <Plus size={16} /> New invoice
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Send your first invoice and keep every status in one place."
          action={
            <Link href="/app/invoices/new" className="btn btn-primary">
              Create invoice
            </Link>
          }
        />
      ) : (
        <div className="surface table-wrap p-2 md:p-4">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Issue</th>
                <th>Due</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, client, total }) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/app/invoices/${inv.id}`} className="font-700 text-teal">
                      {inv.number}
                    </Link>
                  </td>
                  <td>{client?.company || client?.name || "—"}</td>
                  <td>{shortDate(inv.issueDate)}</td>
                  <td>{shortDate(inv.dueDate)}</td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td>{money(total, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
