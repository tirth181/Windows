import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { hasPermission } from '../rbac/permissions';
import { writeAudit } from '../audit';

export const customersRouter = Router();
customersRouter.use(authenticate);

// Pricing fields are only returned when the caller holds customers:pricing.
customersRouter.get(
  '/',
  requirePermission('customers:view'),
  asyncHandler(async (req, res) => {
    const canSeePricing = hasPermission(req.auth!.permissions, 'customers:pricing');
    const customers = await prisma.customer.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { name: 'asc' },
    });
    res.json(
      customers.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        contactEmail: c.contactEmail,
        ...(canSeePricing ? { pricingTier: c.pricingTier, ratePerPallet: c.ratePerPallet } : {}),
        pricingVisible: canSeePricing,
      })),
    );
  }),
);

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contactEmail: z.string().email().optional(),
});
customersRouter.post(
  '/',
  requirePermission('customers:manage'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const existing = await prisma.customer.findFirst({ where: { tenantId: req.auth!.tenantId, code: body.code } });
    if (existing) throw new ApiError(409, 'Customer code already exists');
    const customer = await prisma.customer.create({
      data: { tenantId: req.auth!.tenantId, code: body.code, name: body.name, contactEmail: body.contactEmail ?? '' },
    });
    await writeAudit(req, { action: 'customer.create', entity: 'customer', entityId: customer.id, after: customer });
    res.status(201).json(customer);
  }),
);
