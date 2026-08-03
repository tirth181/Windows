import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission, warehouseScopeFilter } from '../middleware/rbac';
import { writeAudit } from '../audit';

export const inboundRouter = Router();
inboundRouter.use(authenticate);

inboundRouter.get(
  '/',
  requirePermission('inbound:view'),
  asyncHandler(async (req, res) => {
    const receipts = await prisma.inboundReceipt.findMany({
      where: { tenantId: req.auth!.tenantId, ...warehouseScopeFilter(req) },
      include: { lines: true, warehouse: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(receipts.map((r) => ({ ...r, warehouseCode: r.warehouse.code, customerName: r.customer?.name ?? null })));
  }),
);

const createSchema = z.object({
  warehouseId: z.string(),
  customerId: z.string().optional(),
  reference: z.string().min(1),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        materialCode: z.string().min(1),
        description: z.string().optional(),
        batchNumber: z.string().optional(),
        unitOfMeasure: z.string().optional(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

inboundRouter.post(
  '/',
  requirePermission('inbound:create'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const warehouse = await prisma.warehouse.findFirst({ where: { id: body.warehouseId, tenantId: req.auth!.tenantId } });
    if (!warehouse) throw new ApiError(400, 'Warehouse not found in this tenant');

    const receipt = await prisma.inboundReceipt.create({
      data: {
        tenantId: req.auth!.tenantId,
        warehouseId: body.warehouseId,
        customerId: body.customerId,
        reference: body.reference,
        notes: body.notes ?? '',
        createdBy: req.auth!.email,
        status: 'received',
        lines: {
          create: body.lines.map((l) => ({
            materialCode: l.materialCode,
            description: l.description ?? '',
            batchNumber: l.batchNumber ?? '',
            unitOfMeasure: l.unitOfMeasure ?? 'each',
            quantity: l.quantity,
          })),
        },
      },
      include: { lines: true },
    });
    await writeAudit(req, { action: 'inbound.create', entity: 'receipt', entityId: receipt.id, after: receipt });
    res.status(201).json(receipt);
  }),
);

// Putaway converts received lines into on-hand inventory items.
inboundRouter.post(
  '/:id/putaway',
  requirePermission('inbound:edit'),
  asyncHandler(async (req, res) => {
    const receipt = await prisma.inboundReceipt.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      include: { lines: true },
    });
    if (!receipt) throw new ApiError(404, 'Receipt not found');
    if (receipt.status === 'closed') throw new ApiError(400, 'Receipt already closed');

    await prisma.$transaction([
      ...receipt.lines.map((l) =>
        prisma.inventoryItem.create({
          data: {
            tenantId: receipt.tenantId,
            warehouseId: receipt.warehouseId,
            customerId: receipt.customerId,
            materialCode: l.materialCode,
            description: l.description,
            batchNumber: l.batchNumber,
            unitOfMeasure: l.unitOfMeasure,
            receivedQty: l.quantity,
            remainingQty: l.quantity,
            status: 'available',
          },
        }),
      ),
      prisma.inboundReceipt.update({ where: { id: receipt.id }, data: { status: 'closed' } }),
    ]);
    await writeAudit(req, { action: 'inbound.putaway', entity: 'receipt', entityId: receipt.id });
    res.json({ ok: true, itemsCreated: receipt.lines.length });
  }),
);
