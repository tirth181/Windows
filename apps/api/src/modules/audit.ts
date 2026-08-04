import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

export const auditRouter = Router();
auditRouter.use(authenticate);

auditRouter.get(
  '/logs',
  requirePermission('audit:view'),
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(
      logs.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        before: l.before ? JSON.parse(l.before) : null,
        after: l.after ? JSON.parse(l.after) : null,
        ip: l.ip,
        user: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'system',
        createdAt: l.createdAt,
      })),
    );
  }),
);

auditRouter.get(
  '/logins',
  requirePermission('audit:view'),
  asyncHandler(async (req, res) => {
    const events = await prisma.loginEvent.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(events);
  }),
);
