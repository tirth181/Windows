"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { invoiceTotals, money, shortDate } from "@/lib/format";
import { downloadInvoicePdf } from "@/lib/pdf";
import { Button, Card, PageHeader, StatusBadge } from "@/components/ui";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { useState } from "react";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const org = useAppStore((s) => s.currentOrg());
  const invoice = useAppStore((s) => s.invoices.find((i) => i.id === params.id));
  const client = useAppStore((s) => s.clients.find((c) => c.id === invoice?.clientId));
  const deleteInvoice = useAppStore((s) => s.deleteInvoice);
  const updateInvoice = useAppStore((s) => s.updateInvoice);

  if (!invoice || !org) {
    return (
      <Card>
        <p>Invoice not found.</p>
        <Link href="/app/invoices" className="btn btn-secondary mt-4">
          Back to invoices
        </Link>
      </Card>
    );
  }

  const totals = invoiceTotals(invoice);

  if (editing) {
    return (
      <div>
        <PageHeader title={`Edit ${invoice.number}`} />
        <InvoiceEditor invoice={invoice} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={invoice.number}
        subtitle={client?.company || client?.name || "Client"}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (client) downloadInvoicePdf(org, client, invoice);
              }}
            >
              <Download size={16} /> PDF
            </Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Edit
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                deleteInvoice(invoice.id);
                router.push("/app/invoices");
              }}
            >
              <Trash2 size={16} /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <StatusBadge status={invoice.status} />
            <div className="flex flex-wrap gap-2">
              {(["draft", "sent", "paid", "overdue"] as const).map((status) => (
                <button
                  key={status}
                  className="badge bg-paper-2 text-muted"
                  onClick={() => updateInvoice(invoice.id, { status })}
                >
                  Mark {status}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-normal">{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.unitPrice, invoice.currency)}</td>
                    <td>{money(item.quantity * item.unitPrice, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-1 text-right">
            <p className="text-sm text-muted">Subtotal {money(totals.subtotal, invoice.currency)}</p>
            <p className="text-sm text-muted">Tax {money(totals.tax, invoice.currency)}</p>
            <p className="display text-3xl font-800 text-teal">
              Total {money(totals.total, invoice.currency)}
            </p>
          </div>
        </Card>
        <Card>
          <h2 className="display text-xl font-700">Details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Issue date</dt>
              <dd className="font-700">{shortDate(invoice.issueDate)}</dd>
            </div>
            <div>
              <dt className="text-muted">Due date</dt>
              <dd className="font-700">{shortDate(invoice.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-muted">Bill to</dt>
              <dd className="font-700">{client?.name}</dd>
              <dd className="text-muted">{client?.email}</dd>
              <dd className="text-muted">{client?.address}</dd>
            </div>
            {invoice.notes ? (
              <div>
                <dt className="text-muted">Notes</dt>
                <dd>{invoice.notes}</dd>
              </div>
            ) : null}
            {invoice.terms ? (
              <div>
                <dt className="text-muted">Terms</dt>
                <dd>{invoice.terms}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>
    </div>
  );
}
