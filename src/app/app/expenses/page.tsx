"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { money, shortDate, todayISO } from "@/lib/format";
import { Button, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";

export default function ExpensesPage() {
  const org = useAppStore((s) => s.currentOrg());
  const expenses = useAppStore((s) => s.expenses);
  const budgets = useAppStore((s) => s.budgets.filter((b) => b.organizationId === org?.id));
  const addExpense = useAppStore((s) => s.addExpense);
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: 0,
    category: "General",
    date: todayISO(),
    budgetId: "",
  });

  const rows = useMemo(
    () =>
      expenses
        .filter((e) => e.organizationId === org?.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, org],
  );

  const categories = useMemo(() => {
    const fromBudgets = budgets.flatMap((b) => b.categories.map((c) => c.name));
    return Array.from(new Set(["General", ...fromBudgets]));
  }, [budgets]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addExpense({
      title: form.title,
      amount: Number(form.amount) || 0,
      category: form.category,
      date: form.date,
      budgetId: form.budgetId || undefined,
    });
    setForm({ title: "", amount: 0, category: "General", date: todayISO(), budgetId: "" });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Log spending and attach it to a budget category."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus size={16} /> {open ? "Close" : "Add expense"}
          </Button>
        }
      />
      {open ? (
        <form onSubmit={onSubmit} className="surface mb-5 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Title">
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Link to budget" className="md:col-span-2">
            <Select value={form.budgetId} onChange={(e) => setForm({ ...form, budgetId: e.target.value })}>
              <option value="">None</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Save expense</Button>
          </div>
        </form>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No expenses" body="Track everyday spending for personal, family, or company budgets." />
      ) : (
        <div className="surface table-wrap p-2 md:p-4">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => (
                <tr key={expense.id}>
                  <td className="font-700">{expense.title}</td>
                  <td>{expense.category}</td>
                  <td>{shortDate(expense.date)}</td>
                  <td>{money(expense.amount, org?.currency)}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => deleteExpense(expense.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
