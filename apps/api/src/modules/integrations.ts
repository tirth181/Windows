import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { writeAudit } from '../audit';

export const integrationsRouter = Router();
integrationsRouter.use(authenticate);

const CONNECTION_TYPES = ['rest', 'soap', 'graphql', 'webhook', 'database', 'file', 'edi'] as const;
const SCHEDULES = ['manual', 'realtime', '5min', 'hourly', 'daily'] as const;

integrationsRouter.get(
  '/',
  requirePermission('integrations:view'),
  asyncHandler(async (req, res) => {
    const connections = await prisma.integrationConnection.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { mappings: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(connections);
  }),
);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(CONNECTION_TYPES),
  system: z.string().optional(),
  schedule: z.enum(SCHEDULES).optional(),
  config: z.record(z.any()).optional(),
  mappings: z.array(z.object({ sourceField: z.string(), targetField: z.string(), transform: z.string().optional() })).optional(),
});

integrationsRouter.post(
  '/',
  requirePermission('integrations:manage'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const connection = await prisma.integrationConnection.create({
      data: {
        tenantId: req.auth!.tenantId,
        name: body.name,
        type: body.type,
        system: body.system ?? '',
        schedule: body.schedule ?? 'manual',
        config: JSON.stringify(body.config ?? {}),
        mappings: {
          create: (body.mappings ?? []).map((m) => ({ sourceField: m.sourceField, targetField: m.targetField, transform: m.transform ?? '' })),
        },
      },
      include: { mappings: true },
    });
    await writeAudit(req, { action: 'integration.create', entity: 'integration', entityId: connection.id, after: { name: connection.name, type: connection.type } });
    res.status(201).json(connection);
  }),
);

// Simulate a sync run (records status + timestamp). Real connectors would run here.
integrationsRouter.post(
  '/:id/sync',
  requirePermission('integrations:manage'),
  asyncHandler(async (req, res) => {
    const conn = await prisma.integrationConnection.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!conn) throw new ApiError(404, 'Integration not found');
    const updated = await prisma.integrationConnection.update({
      where: { id: conn.id },
      data: { status: 'active', lastSyncAt: new Date(), lastStatus: 'Sync completed (simulated)' },
    });
    await writeAudit(req, { action: 'integration.sync', entity: 'integration', entityId: conn.id });
    res.json(updated);
  }),
);
