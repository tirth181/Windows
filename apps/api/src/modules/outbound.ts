import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission, warehouseScopeFilter } from '../middleware/rbac';
import { writeAudit } from '../audit';

export const outboundRouter = Router();
outboundRouter.use(authenticate);

export function isDelayed(order: { status: string; dueDate: Date | null }): boolean {
  if (!order.dueDate) return false;
  return ['open', 'picking'].includes(order.status) && order.dueDate.getTime() < Date.now();
}

outboundRouter.get(
  '/',
  requirePermission('outbound:view'),
  asyncHandler(async (req, res) => {
    const orders = await prisma.outboundOrder.findMany({
      where: { tenantId: req.auth!.tenantId, ...warehouseScopeFilter(req) },
      include: { lines: true, warehouse: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(
      orders.map((o) => ({
        ...o,
        delayed: isDelayed(o),
        warehouseCode: o.warehouse.code,
        customerName: o.customer?.name ?? null,
      })),
    );
  }),
);

const createSchema = z.object({
  warehouseId: z.string(),
  customerId: z.string().optional(),
  orderNumber: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  lines: z
    .array(
      z.object({
        materialCode: z.string().min(1),
        batchNumber: z.string().optional(),
        unitOfMeasure: z.string().optional(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

outboundRouter.post(
  '/',
  requirePermission('outbound:view'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const warehouse = await prisma.warehouse.findFirst({ where: { id: body.warehouseId, tenantId: req.auth!.tenantId } });
    if (!warehouse) throw new ApiError(400, 'Warehouse not found in this tenant');
    const order = await prisma.outboundOrder.create({
      data: {
        tenantId: req.auth!.tenantId,
        warehouseId: body.warehouseId,
        customerId: body.customerId,
        orderNumber: body.orderNumber,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        lines: {
          create: body.lines.map((l) => ({
            materialCode: l.materialCode,
            batchNumber: l.batchNumber ?? '',
            unitOfMeasure: l.unitOfMeasure ?? 'each',
            quantity: l.quantity,
          })),
        },
      },
      include: { lines: true },
    });
    await writeAudit(req, { action: 'outbound.create', entity: 'order', entityId: order.id, after: order });
    res.status(201).json(order);
  }),
);

outboundRouter.post(
  '/:id/pick',
  requirePermission('outbound:pick'),
  asyncHandler(async (req, res) => {
    const order = await prisma.outboundOrder.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      include: { lines: true },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    await prisma.$transaction([
      ...order.lines.map((l) => prisma.orderLine.update({ where: { id: l.id }, data: { picked: l.quantity } })),
      prisma.outboundOrder.update({ where: { id: order.id }, data: { status: 'picked' } }),
    ]);
    await writeAudit(req, { action: 'outbound.pick', entity: 'order', entityId: order.id, before: { status: order.status }, after: { status: 'picked' } });
    res.json({ ok: true, status: 'picked' });
  }),
);

outboundRouter.post(
  '/:id/ship',
  requirePermission('outbound:ship'),
  asyncHandler(async (req, res) => {
    const order = await prisma.outboundOrder.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!order) throw new ApiError(404, 'Order not found');
    const updated = await prisma.outboundOrder.update({ where: { id: order.id }, data: { status: 'shipped' } });
    await writeAudit(req, { action: 'outbound.ship', entity: 'order', entityId: order.id, before: { status: order.status }, after: { status: 'shipped' } });
    res.json(updated);
  }),
);
