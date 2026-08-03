import { Router } from 'express';
import { z } from 'zod';
import { authenticator } from 'otplib';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { verifyPassword } from '../auth/password';
import { signToken } from '../auth/tokens';
import { parsePermissions } from '../rbac/permissions';
import { authenticate } from '../middleware/auth';
import { writeAudit, writeLoginEvent } from '../audit';

const LOCK_THRESHOLD = 5;

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companySlug: z.string().optional(),
  otp: z.string().optional(),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        ...(body.companySlug ? { tenant: { slug: body.companySlug } } : {}),
      },
      include: { role: true, tenant: true, warehouseAccess: true },
    });

    if (!user) {
      await writeLoginEvent(req, { email: body.email, success: false, reason: 'unknown_user' });
      throw new ApiError(401, 'Invalid credentials');
    }

    if (user.status !== 'active' || user.tenant.status !== 'active') {
      await writeLoginEvent(req, { tenantId: user.tenantId, userId: user.id, email: body.email, success: false, reason: 'inactive' });
      throw new ApiError(403, 'Account is disabled');
    }

    if (user.failedLogins >= LOCK_THRESHOLD) {
      await writeLoginEvent(req, { tenantId: user.tenantId, userId: user.id, email: body.email, success: false, reason: 'locked' });
      throw new ApiError(423, 'Account locked due to too many failed attempts. Contact an administrator.');
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
      await writeLoginEvent(req, { tenantId: user.tenantId, userId: user.id, email: body.email, success: false, reason: 'bad_password' });
      throw new ApiError(401, 'Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!body.otp) {
        return res.status(401).json({ error: 'MFA required', mfaRequired: true });
      }
      const valid = user.mfaSecret ? authenticator.verify({ token: body.otp, secret: user.mfaSecret }) : false;
      if (!valid) {
        await writeLoginEvent(req, { tenantId: user.tenantId, userId: user.id, email: body.email, success: false, reason: 'bad_otp' });
        throw new ApiError(401, 'Invalid MFA code');
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lastLoginAt: new Date() },
    });
    await writeLoginEvent(req, { tenantId: user.tenantId, userId: user.id, email: body.email, success: true });

    const token = signToken({ sub: user.id, tenantId: user.tenantId, email: user.email });
    res.json({
      token,
      user: publicUser(user),
    });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
      include: { role: true, tenant: true, warehouseAccess: { include: { warehouse: true } } },
    });
    res.json({
      user: publicUser(user),
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      permissions: parsePermissions(user.role?.permissions),
      warehouses: user.warehouseAccess.map((w) => ({ id: w.warehouse.id, code: w.warehouse.code, name: w.warehouse.name })),
    });
  }),
);

// --- MFA (TOTP) enrollment ---
authRouter.post(
  '/mfa/setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: req.auth!.userId }, data: { mfaSecret: secret } });
    const otpauth = authenticator.keyuri(req.auth!.email, 'AetherWMS', secret);
    res.json({ secret, otpauth });
  }),
);

authRouter.post(
  '/mfa/enable',
  authenticate,
  asyncHandler(async (req, res) => {
    const { otp } = z.object({ otp: z.string().min(6) }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    if (!user.mfaSecret || !authenticator.verify({ token: otp, secret: user.mfaSecret })) {
      throw new ApiError(400, 'Invalid MFA code');
    }
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    await writeAudit(req, { action: 'auth.mfa_enabled', entity: 'user', entityId: user.id });
    res.json({ mfaEnabled: true });
  }),
);

function publicUser(user: {
  id: string; email: string; firstName: string; lastName: string; mfaEnabled: boolean;
  role?: { name: string } | null; tenantId: string;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mfaEnabled: user.mfaEnabled,
    role: user.role?.name ?? null,
    tenantId: user.tenantId,
  };
}
