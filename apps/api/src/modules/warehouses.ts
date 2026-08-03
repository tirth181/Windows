import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { writeAudit } from '../audit';

export const warehousesRouter = Router();
warehousesRouter.use(authenticate);

warehousesRouter.get(
  '/',
  requirePermission('warehouses:view'),
  asyncHandler(async (req, res) => {
    const scoped = req.auth!.warehouseIds;
    const warehouses = await prisma.warehouse.findMany({
      where: {
        tenantId: req.auth!.tenantId,
        ...(scoped.length ? { id: { in: scoped } } : {}),
      },
      include: { _count: { select: { inventory: true, locations: true } } },
      orderBy: { code: 'asc' },
    });
    res.json(warehouses);
  }),
);

const createSchema = z.object({ code: z.string().min(1), name: z.string().min(1), address: z.string().optional() });
warehousesRouter.post(
  '/',
  requirePermission('warehouses:manage'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const existing = await prisma.warehouse.findFirst({ where: { tenantId: req.auth!.tenantId, code: body.code } });
    if (existing) throw new ApiError(409, 'Warehouse code already exists');
    const warehouse = await prisma.warehouse.create({
      data: { tenantId: req.auth!.tenantId, code: body.code, name: body.name, address: body.address ?? '' },
    });
    await writeAudit(req, { action: 'warehouse.create', entity: 'warehouse', entityId: warehouse.id, after: warehouse });
    res.status(201).json(warehouse);
  }),
);
