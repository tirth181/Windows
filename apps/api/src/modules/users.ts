import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, ApiError } from '../http';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { hashPassword } from '../auth/password';
import { PERMISSIONS, PERMISSION_GROUPS, parsePermissions } from '../rbac/permissions';
import { writeAudit } from '../audit';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  '/',
  requirePermission('users:view'),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { role: true, warehouseAccess: { include: { warehouse: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        status: u.status,
        mfaEnabled: u.mfaEnabled,
        role: u.role?.name ?? null,
        lastLoginAt: u.lastLoginAt,
        warehouses: u.warehouseAccess.map((w) => w.warehouse.code),
      })),
    );
  }),
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roleId: z.string().optional(),
});
usersRouter.post(
  '/',
  requirePermission('users:manage'),
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { tenantId: req.auth!.tenantId, email: body.email } });
    if (existing) throw new ApiError(409, 'A user with that email already exists');
    const user = await prisma.user.create({
      data: {
        tenantId: req.auth!.tenantId,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
        roleId: body.roleId,
      },
    });
    await writeAudit(req, { action: 'user.create', entity: 'user', entityId: user.id, after: { email: user.email, roleId: user.roleId } });
    res.status(201).json({ id: user.id, email: user.email });
  }),
);

// --- Roles ---
export const rolesRouter = Router();
rolesRouter.use(authenticate);

rolesRouter.get(
  '/',
  requirePermission('users:view'),
  asyncHandler(async (req, res) => {
    const roles = await prisma.role.findMany({
      where: { tenantId: req.auth!.tenantId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(roles.map((r) => ({ ...r, permissions: parsePermissions(r.permissions) })));
  }),
);

rolesRouter.get('/catalog', asyncHandler(async (_req, res) => {
  res.json({ permissions: PERMISSIONS, groups: PERMISSION_GROUPS });
}));

const updateRoleSchema = z.object({ permissions: z.array(z.string()) });
rolesRouter.put(
  '/:id',
  requirePermission('roles:manage'),
  asyncHandler(async (req, res) => {
    const body = updateRoleSchema.parse(req.body);
    const role = await prisma.role.findFirst({ where: { id: req.params.id, tenantId: req.auth!.tenantId } });
    if (!role) throw new ApiError(404, 'Role not found');
    const updated = await prisma.role.update({ where: { id: role.id }, data: { permissions: JSON.stringify(body.permissions) } });
    await writeAudit(req, {
      action: 'role.permissions_changed',
      entity: 'role',
      entityId: role.id,
      before: { permissions: parsePermissions(role.permissions) },
      after: { permissions: body.permissions },
    });
    res.json({ ...updated, permissions: parsePermissions(updated.permissions) });
  }),
);
