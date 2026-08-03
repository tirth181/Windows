import { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma';
import { verifyToken } from '../auth/tokens';
import { parsePermissions } from '../rbac/permissions';
import { ApiError } from '../http';

// Authenticates the request from a Bearer JWT, then loads the user's tenant,
// role permissions and warehouse scope into req.auth. Tenant isolation starts here:
// every downstream query is scoped to req.auth.tenantId.
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, status: 'active' },
      include: { role: true, warehouseAccess: true, tenant: true },
    });
    if (!user || user.tenant.status !== 'active') {
      throw new ApiError(401, 'Account not found or inactive');
    }

    req.auth = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleName: user.role?.name ?? null,
      permissions: parsePermissions(user.role?.permissions),
      warehouseIds: user.warehouseAccess.map((w) => w.warehouseId),
    };
    next();
  } catch (err) {
    next(err);
  }
}
