import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../http';
import { hasPermission, PermissionKey } from '../rbac/permissions';

// Guards a route by a required permission key. Assumes authenticate() ran first.
export function requirePermission(key: PermissionKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(new ApiError(401, 'Authentication required'));
    if (!hasPermission(req.auth.permissions, key)) {
      return next(new ApiError(403, `Missing required permission: ${key}`));
    }
    next();
  };
}

// Restricts data to the warehouses a user can access. Returns a Prisma filter
// fragment; an empty warehouseIds list means unrestricted within the tenant.
export function warehouseScopeFilter(req: Request): Record<string, unknown> {
  const ids = req.auth?.warehouseIds ?? [];
  if (ids.length === 0) return {};
  return { warehouseId: { in: ids } };
}
