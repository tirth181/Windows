"use client";

import { InvoiceEditor } from "@/components/InvoiceEditor";
import { PageHeader } from "@/components/ui";

export default function NewInvoicePage() {
  return (
    <div>
      <PageHeader title="New invoice" subtitle="Build a professional invoice in minutes." />
      <InvoiceEditor />
    </div>
  );
}
