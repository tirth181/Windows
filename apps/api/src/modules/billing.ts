import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

export const billingRouter = Router();
billingRouter.use(authenticate);

// Activity-based billing: charges accrue from real warehouse events (storage,
// receiving, handling) against each client's rate card. This computes an
// invoice-style summary per customer for the current period.
billingRouter.get(
  '/',
  requirePermission('billing:view'),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const [customers, inventory, receipts, orders] = await Promise.all([
      prisma.customer.findMany({ where: { tenantId } }),
      prisma.inventoryItem.groupBy({ by: ['customerId'], where: { tenantId }, _count: { _all: true } }),
      prisma.inboundReceipt.findMany({ where: { tenantId }, include: { lines: true } }),
      prisma.outboundOrder.findMany({ where: { tenantId, status: 'shipped' } }),
    ]);

    const storageByCustomer = new Map<string, number>();
    for (const row of inventory) if (row.customerId) storageByCustomer.set(row.customerId, row._count._all);

    const receivingByCustomer = new Map<string, number>();
    for (const r of receipts) if (r.customerId) receivingByCustomer.set(r.customerId, (receivingByCustomer.get(r.customerId) ?? 0) + r.lines.length);

    const pickByCustomer = new Map<string, number>();
    for (const o of orders) if (o.customerId) pickByCustomer.set(o.customerId, (pickByCustomer.get(o.customerId) ?? 0) + 1);

    const invoices = customers.map((c) => {
      const storageUnits = storageByCustomer.get(c.id) ?? 0;
      const receivingUnits = receivingByCustomer.get(c.id) ?? 0;
      const pickUnits = pickByCustomer.get(c.id) ?? 0;
      const lines = [
        { activity: 'Storage', units: storageUnits, rate: c.ratePerPallet, uom: 'pallet/mo', amount: storageUnits * c.ratePerPallet },
        { activity: 'Receiving', units: receivingUnits, rate: c.receivingRate, uom: 'line', amount: receivingUnits * c.receivingRate },
        { activity: 'Pick & Ship', units: pickUnits, rate: c.pickRate, uom: 'order', amount: pickUnits * c.pickRate },
      ];
      const total = lines.reduce((s, l) => s + l.amount, 0);
      return { customerId: c.id, customer: c.name, code: c.code, pricingTier: c.pricingTier, lines, total: Math.round(total * 100) / 100 };
    });

    const grandTotal = Math.round(invoices.reduce((s, i) => s + i.total, 0) * 100) / 100;
    res.json({ period: new Date().toISOString().slice(0, 7), invoices, grandTotal });
  }),
);
