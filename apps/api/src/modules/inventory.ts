import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission, warehouseScopeFilter } from '../middleware/rbac';
import { writeAudit } from '../audit';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

// Derive a partial/empty status from remaining vs received for weight-based stock.
export function derivedStatus(item: { status: string; receivedQty: number; remainingQty: number }): string {
  if (['damaged', 'blocked', 'quality_hold', 'reserved'].includes(item.status)) return item.status;
  if (item.remainingQty <= 0) return 'empty';
  if (item.remainingQty < item.receivedQty) return 'partial';
  return 'available';
}

inventoryRouter.get(
  '/',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const { q, status, warehouseId } = req.query as Record<string, string | undefined>;
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: req.auth!.tenantId,
        ...warehouseScopeFilter(req),
        ...(warehouseId ? { warehouseId } : {}),
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { materialCode: { contains: q } },
                { batchNumber: { contains: q } },
                { palletId: { contains: q } },
                { boxId: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
      include: { warehouse: true, customer: true, location: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    res.json(
      items.map((i) => ({
        ...i,
        status: derivedStatus(i),
        customerName: i.customer?.name ?? null,
        warehouseCode: i.warehouse.code,
        locationCode: i.location?.code ?? null,
      })),
    );
  }),
);

inventoryRouter.get(
  '/:id',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
      include: { warehouse: true, customer: true, location: true },
    });
    if (!item) throw new ApiError(404, 'Inventory item not found');
    res.json({ ...item, status: derivedStatus(item) });
  }),
);

const moveSchema = z.object({ locationId: z.string() });
inventoryRouter.post(
  '/:id/move',
  requirePermission('inventory:move'),
  asyncHandler(async (req, res) => {
    const { locationId } = moveSchema.parse(req.body);
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!item) throw new ApiError(404, 'Inventory item not found');
    const location = await prisma.location.findFirst({ where: { id: locationId, tenantId: req.auth!.tenantId } });
    if (!location) throw new ApiError(400, 'Target location not found in this tenant');

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { locationId },
    });
    await writeAudit(req, {
      action: 'inventory.move',
      entity: 'inventory',
      entityId: item.id,
      before: { locationId: item.locationId },
      after: { locationId },
    });
    res.json({ ...updated, status: derivedStatus(updated) });
  }),
);

const adjustSchema = z.object({
  remainingQty: z.number().nonnegative().optional(),
  status: z.enum(['available', 'reserved', 'damaged', 'blocked', 'quality_hold']).optional(),
});
inventoryRouter.post(
  '/:id/adjust',
  requirePermission('inventory:adjust'),
  asyncHandler(async (req, res) => {
    const body = adjustSchema.parse(req.body);
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!item) throw new ApiError(404, 'Inventory item not found');

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        ...(body.remainingQty !== undefined ? { remainingQty: body.remainingQty } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    await writeAudit(req, {
      action: 'inventory.adjust',
      entity: 'inventory',
      entityId: item.id,
      before: { remainingQty: item.remainingQty, status: item.status },
      after: { remainingQty: updated.remainingQty, status: updated.status },
    });
    res.json({ ...updated, status: derivedStatus(updated) });
  }),
);

export const locationsRouter = Router();
locationsRouter.use(authenticate);
locationsRouter.get(
  '/',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const { warehouseId } = req.query as Record<string, string | undefined>;
    const locations = await prisma.location.findMany({
      where: { tenantId: req.auth!.tenantId, ...(warehouseId ? { warehouseId } : {}) },
      orderBy: { code: 'asc' },
    });
    res.json(locations);
  }),
);
