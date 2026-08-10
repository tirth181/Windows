import { format, parseISO, isAfter, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import type { Invoice, LineItem } from "./types";

export function money(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

export function lineSubtotal(item: LineItem): number {
  return item.quantity * item.unitPrice;
}

export function lineTax(item: LineItem): number {
  return lineSubtotal(item) * (item.taxRate / 100);
}

export function lineTotal(item: LineItem): number {
  return lineSubtotal(item) + lineTax(item);
}

export function invoiceTotals(invoice: Pick<Invoice, "items" | "discountPercent">) {
  const subtotal = invoice.items.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const tax = invoice.items.reduce((sum, item) => sum + lineTax(item), 0);
  const discount = subtotal * (invoice.discountPercent / 100);
  const total = subtotal + tax - discount;
  return { subtotal, tax, discount, total };
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") {
    return false;
  }
  return isAfter(new Date(), parseISO(invoice.dueDate));
}

export function invoicesThisMonth(invoices: Invoice[], organizationId: string): Invoice[] {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  return invoices.filter(
    (inv) =>
      inv.organizationId === organizationId &&
      isWithinInterval(parseISO(inv.createdAt), { start, end }),
  );
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
