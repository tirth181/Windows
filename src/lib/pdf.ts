import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Client, Invoice, Organization } from "./types";
import { invoiceTotals, money, shortDate } from "./format";
import { getPlan } from "./plans";

export function downloadInvoicePdf(org: Organization, client: Client, invoice: Invoice) {
  const doc = new jsPDF();
  const totals = invoiceTotals(invoice);
  const plan = getPlan(org.plan);
  const accent: [number, number, number] = [15, 110, 86];

  doc.setFillColor(245, 241, 232);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(org.name, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("INVOICE", 196, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(invoice.number, 196, 26, { align: "right" });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 196, 32, { align: "right" });

  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.text("From", 14, y);
  doc.text("Bill to", 110, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  const fromLines = [org.name, org.email, org.phone, org.address].filter(Boolean) as string[];
  const toLines = [
    client.company || client.name,
    client.name !== client.company ? client.name : undefined,
    client.email,
    client.phone,
    client.address,
  ].filter(Boolean) as string[];
  fromLines.forEach((line, i) => doc.text(line, 14, y + i * 5));
  toLines.forEach((line, i) => doc.text(line, 110, y + i * 5));

  y = Math.max(y + fromLines.length * 5, y + toLines.length * 5) + 12;
  doc.text(`Issue date: ${shortDate(invoice.issueDate)}`, 14, y);
  doc.text(`Due date: ${shortDate(invoice.dueDate)}`, 110, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["Description", "Qty", "Rate", "Tax %", "Amount"]],
    body: invoice.items.map((item) => [
      item.description,
      String(item.quantity),
      money(item.unitPrice, invoice.currency),
      `${item.taxRate}%`,
      money(item.quantity * item.unitPrice, invoice.currency),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: accent, textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 10;
  const right = 196;
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ${money(totals.subtotal, invoice.currency)}`, right, finalY, { align: "right" });
  doc.text(`Tax: ${money(totals.tax, invoice.currency)}`, right, finalY + 6, { align: "right" });
  if (totals.discount > 0) {
    doc.text(`Discount: -${money(totals.discount, invoice.currency)}`, right, finalY + 12, {
      align: "right",
    });
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...accent);
  doc.text(`Total: ${money(totals.total, invoice.currency)}`, right, finalY + 20, {
    align: "right",
  });

  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let noteY = finalY + 32;
  if (invoice.notes) {
    doc.text("Notes", 14, noteY);
    doc.text(doc.splitTextToSize(invoice.notes, 180), 14, noteY + 5);
    noteY += 18;
  }
  if (invoice.terms) {
    doc.text("Terms", 14, noteY);
    doc.text(doc.splitTextToSize(invoice.terms, 180), 14, noteY + 5);
  }

  if (!plan.limits.removeWatermark) {
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.text("Created with Fynvo — upgrade to remove this mark", 105, 290, { align: "center" });
  }

  doc.save(`${invoice.number}.pdf`);
}
