import { Request } from 'express';
import { prisma } from './prisma';

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip ?? '';
}

export async function writeAudit(
  req: Request,
  params: {
    action: string;
    entity?: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  const auth = req.auth;
  if (!auth) return;
  await prisma.auditLog.create({
    data: {
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: params.action,
      entity: params.entity ?? '',
      entityId: params.entityId ?? '',
      before: params.before === undefined ? null : JSON.stringify(params.before),
      after: params.after === undefined ? null : JSON.stringify(params.after),
      ip: clientIp(req),
      userAgent: String(req.headers['user-agent'] ?? ''),
    },
  });
}

export async function writeLoginEvent(
  req: Request,
  params: { tenantId?: string; userId?: string; email: string; success: boolean; reason?: string },
): Promise<void> {
  await prisma.loginEvent.create({
    data: {
      tenantId: params.tenantId ?? null,
      userId: params.userId ?? null,
      email: params.email,
      success: params.success,
      reason: params.reason ?? '',
      ip: clientIp(req),
      userAgent: String(req.headers['user-agent'] ?? ''),
    },
  });
}
