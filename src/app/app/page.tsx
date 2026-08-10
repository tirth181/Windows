"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, FilePlus2, Wallet } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { invoiceTotals, money, shortDate } from "@/lib/format";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  const org = useAppStore((s) => s.currentOrg());
  const invoices = useAppStore((s) => s.invoices);
  const clients = useAppStore((s) => s.clients);
  const expenses = useAppStore((s) => s.expenses);
  const budgets = useAppStore((s) => s.budgets);

  const mine = useMemo(() => {
    if (!org) return { invoices: [], clients: [], expenses: [], budgets: [] };
    return {
      invoices: invoices.filter((i) => i.organizationId === org.id),
      clients: clients.filter((c) => c.organizationId === org.id),
      expenses: expenses.filter((e) => e.organizationId === org.id),
      budgets: budgets.filter((b) => b.organizationId === org.id),
    };
  }, [org, invoices, clients, expenses, budgets]);

  const paid = mine.invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + invoiceTotals(i).total, 0);
  const outstanding = mine.invoices
    .filter((i) => ["sent", "viewed", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + invoiceTotals(i).total, 0);
  const spent = mine.expenses.reduce((sum, e) => sum + e.amount, 0);
  const recent = [...mine.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Hello, ${org?.name ?? "there"}`}
        subtitle="Track receivables and budgets from one calm workspace."
        actions={
          <>
            <Link href="/app/invoices/new" className="btn btn-primary">
              <FilePlus2 size={16} /> New invoice
            </Link>
            <Link href="/app/budgets" className="btn btn-secondary">
              <Wallet size={16} /> Budgets
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Outstanding", value: money(outstanding, org?.currency) },
          { label: "Paid", value: money(paid, org?.currency) },
          { label: "Clients", value: String(mine.clients.length) },
          { label: "Expenses tracked", value: money(spent, org?.currency) },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm font-700 uppercase tracking-wide text-muted">{stat.label}</p>
            <p className="display mt-2 text-3xl font-800">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="display text-xl font-700">Recent invoices</h2>
            <Link href="/app/invoices" className="text-sm font-700 text-teal inline-flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-muted">No invoices yet. Create your first one to get paid.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/app/invoices/${inv.id}`} className="font-700 text-teal">
                          {inv.number}
                        </Link>
                      </td>
                      <td>{shortDate(inv.dueDate)}</td>
                      <td>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td>{money(invoiceTotals(inv).total, inv.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="display text-xl font-700">Budgets</h2>
          <p className="mt-1 text-sm text-muted">
            {mine.budgets.length} active · personal, family, or company
          </p>
          <div className="mt-4 space-y-3">
            {mine.budgets.slice(0, 3).map((budget) => {
              const used = mine.expenses
                .filter((e) => e.budgetId === budget.id)
                .reduce((sum, e) => sum + e.amount, 0);
              const allocated = budget.categories.reduce((sum, c) => sum + c.allocated, 0);
              const pct = allocated ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
              return (
                <div key={budget.id} className="rounded-2xl bg-paper-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-700">{budget.name}</p>
                    <span className="badge bg-white text-muted">{budget.workspaceType}</span>
                  </div>
                  <div className="progress mt-3">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {money(used, org?.currency)} of {money(allocated, org?.currency)} spent
                  </p>
                </div>
              );
            })}
            {mine.budgets.length === 0 ? (
              <div>
                <p className="text-muted">No budgets yet.</p>
                <Link href="/app/budgets" className="btn btn-secondary mt-3">
                  Create a budget
                </Link>
              </div>
            ) : null}
          </div>
          <Link href="/app/billing" className="btn btn-ghost mt-5 px-0 text-teal">
            Manage subscription →
          </Link>
        </Card>
      </div>
    </div>
  );
}
