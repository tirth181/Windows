import { Router } from 'express';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { writeAudit } from '../audit';

export const apiKeysRouter = Router();
apiKeysRouter.use(authenticate);

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

apiKeysRouter.get(
  '/',
  requirePermission('apikeys:manage'),
  asyncHandler(async (req, res) => {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        maskedKey: `${k.prefix}••••••••`,
        scopes: JSON.parse(k.scopes),
        rateLimitPerMin: k.rateLimitPerMin,
        revoked: k.revoked,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    );
  }),
);

const createSchema = z.object({ name: z.string().min(1), scopes: z.array(z.string()).optional(), rateLimitPerMin: z.number().int().positive().optional() });
apiKeysRouter.post(
  '/',
  requirePermission('apikeys:manage'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const prefix = `awms_${randomBytes(4).toString('hex')}`;
    const secret = randomBytes(24).toString('hex');
    const fullKey = `${prefix}.${secret}`;
    const key = await prisma.apiKey.create({
      data: {
        tenantId: req.auth!.tenantId,
        name: body.name,
        prefix,
        keyHash: hashKey(fullKey),
        scopes: JSON.stringify(body.scopes ?? []),
        rateLimitPerMin: body.rateLimitPerMin ?? 120,
      },
    });
    await writeAudit(req, { action: 'apikey.create', entity: 'apikey', entityId: key.id, after: { name: key.name, prefix } });
    // The full secret is only ever returned once, at creation time.
    res.status(201).json({ id: key.id, name: key.name, key: fullKey, scopes: JSON.parse(key.scopes) });
  }),
);

apiKeysRouter.post(
  '/:id/revoke',
  requirePermission('apikeys:manage'),
  asyncHandler(async (req, res) => {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!key) throw new ApiError(404, 'API key not found');
    await prisma.apiKey.update({ where: { id: key.id }, data: { revoked: true } });
    await writeAudit(req, { action: 'apikey.revoke', entity: 'apikey', entityId: key.id });
    res.json({ ok: true });
  }),
);
