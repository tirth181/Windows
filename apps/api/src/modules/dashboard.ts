import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission, warehouseScopeFilter } from '../middleware/rbac';
import { derivedStatus } from './inventory';
import { isDelayed } from './outbound';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/',
  requirePermission('dashboard:view'),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const scope = warehouseScopeFilter(req);

    const [items, orders, receipts, warehouses, customers] = await Promise.all([
      prisma.inventoryItem.findMany({ where: { tenantId, ...scope } }),
      prisma.outboundOrder.findMany({ where: { tenantId, ...scope } }),
      prisma.inboundReceipt.count({ where: { tenantId, ...scope } }),
      prisma.warehouse.count({ where: { tenantId } }),
      prisma.customer.count({ where: { tenantId } }),
    ]);

    const statusCounts: Record<string, number> = {};
    let partialCount = 0;
    let totalRemainingWeight = 0;
    for (const item of items) {
      const s = derivedStatus(item);
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      if (s === 'partial') partialCount += 1;
      if (item.unitOfMeasure !== 'each') totalRemainingWeight += item.remainingQty;
    }

    const openOrders = orders.filter((o) => ['open', 'picking'].includes(o.status)).length;
    const delayedOrders = orders.filter((o) => isDelayed(o)).length;

    res.json({
      kpis: {
        inventoryItems: items.length,
        partialItems: partialCount,
        totalRemainingWeight: Math.round(totalRemainingWeight),
        openOrders,
        delayedOrders,
        receipts,
        warehouses,
        customers,
      },
      inventoryByStatus: statusCounts,
    });
  }),
);
