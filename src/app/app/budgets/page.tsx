"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAppStore } from "@/lib/store";
import type { BudgetPeriod, WorkspaceType } from "@/lib/types";
import { money, todayISO, uid } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";

const DEFAULT_COLORS = ["#0F6E56", "#C26401", "#185FA5", "#534AB7", "#993C1D", "#3B6D11"];

export default function BudgetsPage() {
  const org = useAppStore((s) => s.currentOrg());
  const budgets = useAppStore((s) => s.budgets);
  const expenses = useAppStore((s) => s.expenses);
  const addBudget = useAppStore((s) => s.addBudget);
  const deleteBudget = useAppStore((s) => s.deleteBudget);
  const canCreateBudget = useAppStore((s) => s.canCreateBudget);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    workspaceType: "individual" as WorkspaceType,
    period: "monthly" as BudgetPeriod,
    incomeTarget: 5000,
    categoriesText: "Housing:2200\nFood:600\nTransport:300\nSavings:800",
  });

  const rows = useMemo(
    () => budgets.filter((b) => b.organizationId === org?.id),
    [budgets, org],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const gate = canCreateBudget(form.workspaceType);
    if (!gate.ok) {
      setError(gate.error);
      return;
    }
    const categories = form.categoriesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [name, allocated] = line.split(":");
        return {
          id: uid("cat"),
          name: (name || `Category ${index + 1}`).trim(),
          allocated: Number(allocated) || 0,
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        };
      });
    const created = addBudget({
      name: form.name || `${form.workspaceType} budget`,
      workspaceType: form.workspaceType,
      period: form.period,
      startDate: todayISO().slice(0, 8) + "01",
      incomeTarget: Number(form.incomeTarget) || 0,
      categories,
    });
    if (!created) {
      setError("Could not create budget.");
      return;
    }
    setOpen(false);
    setError("");
  }

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Plan spending for an individual, family, or company — gated by your subscription."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus size={16} /> {open ? "Close" : "New budget"}
          </Button>
        }
      />
      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      {open ? (
        <form onSubmit={onSubmit} className="surface mb-5 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Budget name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Family May Budget"
            />
          </Field>
          <Field label="Income target">
            <Input
              type="number"
              min={0}
              value={form.incomeTarget}
              onChange={(e) => setForm({ ...form, incomeTarget: Number(e.target.value) })}
            />
          </Field>
          <Field label="Who is this for?">
            <Select
              value={form.workspaceType}
              onChange={(e) =>
                setForm({ ...form, workspaceType: e.target.value as WorkspaceType })
              }
            >
              <option value="individual">Individual</option>
              <option value="family">Family (Pro+)</option>
              <option value="company">Company (Business)</option>
            </Select>
          </Field>
          <Field label="Period">
            <Select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value as BudgetPeriod })}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </Field>
          <Field label="Categories (one per line: Name:Amount)" className="md:col-span-2">
            <textarea
              className="field min-h-32"
              value={form.categoriesText}
              onChange={(e) => setForm({ ...form, categoriesText: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Create budget</Button>
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          body="Create a personal budget on Starter, family budgets on Pro, or company budgets on Business."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((budget) => {
            const related = expenses.filter(
              (e) => e.organizationId === org?.id && e.budgetId === budget.id,
            );
            const spentByCategory = budget.categories.map((cat) => {
              const spent = related
                .filter((e) => e.category === cat.name)
                .reduce((sum, e) => sum + e.amount, 0);
              return { ...cat, spent };
            });
            const allocated = budget.categories.reduce((sum, c) => sum + c.allocated, 0);
            const spent = related.reduce((sum, e) => sum + e.amount, 0);
            const chartData = spentByCategory.map((c) => ({
              name: c.name,
              value: c.spent || 0.0001,
              color: c.color,
            }));
            return (
              <Card key={budget.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="display text-2xl font-800">{budget.name}</h2>
                    <p className="text-sm text-muted capitalize">
                      {budget.workspaceType} · {budget.period}
                    </p>
                  </div>
                  <button className="btn btn-ghost" onClick={() => deleteBudget(budget.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted">Income target</p>
                    <p className="display text-2xl font-800">
                      {money(budget.incomeTarget, org?.currency)}
                    </p>
                    <p className="mt-3 text-sm text-muted">Spent / allocated</p>
                    <p className="font-700">
                      {money(spent, org?.currency)} / {money(allocated, org?.currency)}
                    </p>
                    <div className="progress mt-2">
                      <span
                        style={{
                          width: `${allocated ? Math.min(100, Math.round((spent / allocated) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" innerRadius={40} outerRadius={70}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => money(Number(value) || 0, org?.currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {spentByCategory.map((cat) => {
                    const pct = cat.allocated
                      ? Math.min(100, Math.round((cat.spent / cat.allocated) * 100))
                      : 0;
                    return (
                      <div key={cat.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-700">{cat.name}</span>
                          <span className="text-muted">
                            {money(cat.spent, org?.currency)} / {money(cat.allocated, org?.currency)}
                          </span>
                        </div>
                        <div className="progress">
                          <span style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
