export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
  roleName: string | null;
  permissions: string[];
  warehouseIds: string[]; // empty array = access to all warehouses in the tenant
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
