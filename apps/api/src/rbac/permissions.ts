// Central permission catalog. Permissions are module:function keys enforced at the
// API layer. Roles hold a JSON array of these keys (or ["*"] for full access).

export const PERMISSIONS = {
  'dashboard:view': 'View dashboards',
  'inbound:view': 'View inbound receiving',
  'inbound:create': 'Create receipts',
  'inbound:edit': 'Edit receipts',
  'inventory:view': 'View inventory',
  'inventory:move': 'Move inventory between locations',
  'inventory:adjust': 'Adjust inventory quantities',
  'outbound:view': 'View outbound orders',
  'outbound:pick': 'Pick orders',
  'outbound:ship': 'Ship orders',
  'warehouses:view': 'View warehouses',
  'warehouses:manage': 'Manage warehouses & locations',
  'customers:view': 'View customers',
  'customers:manage': 'Manage customers',
  'customers:pricing': 'View & manage customer pricing',
  'reports:view': 'View reports',
  'billing:view': 'View billing',
  'billing:manage': 'Manage billing',
  'users:view': 'View users',
  'users:manage': 'Manage users',
  'roles:manage': 'Manage roles & permissions',
  'integrations:view': 'View integrations',
  'integrations:manage': 'Manage integrations',
  'apikeys:manage': 'Manage API keys',
  'audit:view': 'View audit & security logs',
  'ai:use': 'Use the AI assistant',
  'ai:actions': 'Let the AI perform actions (with approval)',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_GROUPS: Record<string, PermissionKey[]> = {
  Dashboard: ['dashboard:view'],
  Inbound: ['inbound:view', 'inbound:create', 'inbound:edit'],
  Inventory: ['inventory:view', 'inventory:move', 'inventory:adjust'],
  Outbound: ['outbound:view', 'outbound:pick', 'outbound:ship'],
  Warehouses: ['warehouses:view', 'warehouses:manage'],
  Customers: ['customers:view', 'customers:manage', 'customers:pricing'],
  Reports: ['reports:view'],
  Billing: ['billing:view', 'billing:manage'],
  Administration: ['users:view', 'users:manage', 'roles:manage'],
  Integrations: ['integrations:view', 'integrations:manage', 'apikeys:manage'],
  Security: ['audit:view'],
  AI: ['ai:use', 'ai:actions'],
};

// Built-in role templates seeded per tenant.
export const ROLE_TEMPLATES: Record<string, { description: string; permissions: PermissionKey[] | ['*'] }> = {
  Administrator: {
    description: 'Full access to all modules and configuration',
    permissions: ['*'],
  },
  'Warehouse Manager': {
    description: 'Runs day-to-day warehouse operations',
    permissions: [
      'dashboard:view',
      'inbound:view', 'inbound:create', 'inbound:edit',
      'inventory:view', 'inventory:move', 'inventory:adjust',
      'outbound:view', 'outbound:pick', 'outbound:ship',
      'warehouses:view',
      'customers:view',
      'reports:view',
      'audit:view',
      'ai:use', 'ai:actions',
    ],
  },
  'Warehouse Associate': {
    description: 'Floor associate — receiving, putaway, picking',
    permissions: [
      'dashboard:view',
      'inbound:view', 'inbound:create', 'inbound:edit',
      'inventory:view', 'inventory:move',
      'outbound:view', 'outbound:pick',
      'reports:view',
      'ai:use',
    ],
  },
  Executive: {
    description: 'Read-only analytics & financials across the company',
    permissions: [
      'dashboard:view',
      'inventory:view',
      'outbound:view',
      'customers:view', 'customers:pricing',
      'reports:view',
      'billing:view',
      'audit:view',
      'ai:use',
    ],
  },
};

export function hasPermission(perms: string[], key: PermissionKey | string): boolean {
  return perms.includes('*') || perms.includes(key);
}

export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
