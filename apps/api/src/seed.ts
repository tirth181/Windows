import { randomBytes } from 'crypto';
import { prisma } from './prisma';
import { hashPassword } from './auth/password';
import { ROLE_TEMPLATES } from './rbac/permissions';

const DEMO_PASSWORD = 'Password123!';

async function createTenant(opts: {
  name: string;
  slug: string;
  warehouseCode: string;
  warehouseName: string;
  includeExampleUsers: boolean;
}) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const tenant = await prisma.tenant.create({
    data: { name: opts.name, slug: opts.slug, encryptionKey: randomBytes(32).toString('hex') },
  });

  // Roles from templates.
  const roleByName: Record<string, string> = {};
  for (const [name, tmpl] of Object.entries(ROLE_TEMPLATES)) {
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name,
        description: tmpl.description,
        isSystem: true,
        permissions: JSON.stringify(tmpl.permissions),
      },
    });
    roleByName[name] = role.id;
  }

  const warehouse = await prisma.warehouse.create({
    data: { tenantId: tenant.id, code: opts.warehouseCode, name: opts.warehouseName, address: '100 Distribution Way' },
  });

  const locations = await Promise.all(
    ['A-01', 'A-02', 'B-11', 'B-12', 'STAGE-1', 'DOCK-1'].map((code, i) =>
      prisma.location.create({
        data: { tenantId: tenant.id, warehouseId: warehouse.id, code, zone: code[0], type: i >= 4 ? 'staging' : 'rack' },
      }),
    ),
  );
  const loc = (code: string) => locations.find((l) => l.code === code)!;

  // Users
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id, email: `admin@${opts.slug}.com`, passwordHash,
      firstName: 'Ada', lastName: 'Admin', roleId: roleByName['Administrator'],
    },
  });

  if (opts.includeExampleUsers) {
    await prisma.user.create({
      data: {
        tenantId: tenant.id, email: `manager@${opts.slug}.com`, passwordHash,
        firstName: 'Maria', lastName: 'Manager', roleId: roleByName['Warehouse Manager'],
        warehouseAccess: { create: [{ warehouseId: warehouse.id }] },
      },
    });
    // John Smith — the Warehouse Associate from the product spec.
    await prisma.user.create({
      data: {
        tenantId: tenant.id, email: `john@${opts.slug}.com`, passwordHash,
        firstName: 'John', lastName: 'Smith', roleId: roleByName['Warehouse Associate'],
        warehouseAccess: { create: [{ warehouseId: warehouse.id }] },
      },
    });
    await prisma.user.create({
      data: {
        tenantId: tenant.id, email: `exec@${opts.slug}.com`, passwordHash,
        firstName: 'Erin', lastName: 'Executive', roleId: roleByName['Executive'],
      },
    });
  }

  // Customers (with pricing)
  const acme = await prisma.customer.create({
    data: { tenantId: tenant.id, code: 'CUST-ACME', name: 'Acme Foods', contactEmail: 'ops@acme.example', pricingTier: 'premium', ratePerPallet: 24.5 },
  });
  const nova = await prisma.customer.create({
    data: { tenantId: tenant.id, code: 'CUST-NOVA', name: 'Nova Retail', contactEmail: 'wh@nova.example', pricingTier: 'standard', ratePerPallet: 18 },
  });

  // Inventory — weight-based & partial examples straight from the spec.
  await prisma.inventoryItem.createMany({
    data: [
      // Weight-based partial: ABC100 / B240501 received 1000 lb, 350 remaining.
      { tenantId: tenant.id, warehouseId: warehouse.id, customerId: acme.id, locationId: loc('A-01').id, materialCode: 'ABC100', description: 'Bulk cocoa powder', batchNumber: 'B240501', palletId: 'PLT-1001', unitOfMeasure: 'lb', receivedQty: 1000, remainingQty: 350, status: 'available' },
      // Full pallet available.
      { tenantId: tenant.id, warehouseId: warehouse.id, customerId: acme.id, locationId: loc('A-02').id, materialCode: 'ABC100', description: 'Bulk cocoa powder', batchNumber: 'B240502', palletId: 'PLT-1002', unitOfMeasure: 'lb', receivedQty: 1000, remainingQty: 1000, status: 'available' },
      // Partial box, 18 lbs remaining.
      { tenantId: tenant.id, warehouseId: warehouse.id, customerId: nova.id, locationId: loc('B-11').id, materialCode: 'XYZ55', description: 'Spice blend', batchNumber: 'B991', palletId: 'PLT-2001', boxId: 'BOX-9', unitOfMeasure: 'lb', receivedQty: 40, remainingQty: 18, status: 'available' },
      // Empty.
      { tenantId: tenant.id, warehouseId: warehouse.id, customerId: nova.id, locationId: loc('B-12').id, materialCode: 'XYZ55', description: 'Spice blend', batchNumber: 'B990', palletId: 'PLT-2000', unitOfMeasure: 'lb', receivedQty: 40, remainingQty: 0, status: 'available' },
      // Each-based available.
      { tenantId: tenant.id, warehouseId: warehouse.id, customerId: nova.id, locationId: loc('A-01').id, materialCode: 'WIDGET-9', description: 'Widget cases', batchNumber: 'B12345', palletId: 'PLT-3001', unitOfMeasure: 'each', receivedQty: 480, remainingQty: 480, status: 'available' },
      // Quality hold.
      { tenantId: tenant.id, warehouseId: warehouse.id, customerId: acme.id, locationId: loc('B-11').id, materialCode: 'ABC100', description: 'Bulk cocoa powder', batchNumber: 'B240333', palletId: 'PLT-1003', unitOfMeasure: 'lb', receivedQty: 1000, remainingQty: 1000, status: 'quality_hold' },
    ],
  });

  // Outbound orders (one delayed).
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await prisma.outboundOrder.create({
    data: {
      tenantId: tenant.id, warehouseId: warehouse.id, customerId: acme.id, orderNumber: 'SO-1001', status: 'open', dueDate: yesterday,
      lines: { create: [{ materialCode: 'ABC100', batchNumber: 'B240502', unitOfMeasure: 'lb', quantity: 500 }] },
    },
  });
  await prisma.outboundOrder.create({
    data: {
      tenantId: tenant.id, warehouseId: warehouse.id, customerId: nova.id, orderNumber: 'SO-1002', status: 'open', dueDate: nextWeek,
      lines: { create: [{ materialCode: 'WIDGET-9', unitOfMeasure: 'each', quantity: 120 }] },
    },
  });

  // Inbound receipt (draft).
  await prisma.inboundReceipt.create({
    data: {
      tenantId: tenant.id, warehouseId: warehouse.id, customerId: acme.id, reference: 'ASN-77001', status: 'received', createdBy: admin.email,
      lines: { create: [{ materialCode: 'ABC100', description: 'Bulk cocoa powder', batchNumber: 'B240601', unitOfMeasure: 'lb', quantity: 1000 }] },
    },
  });

  // Sample integration (SAP field mapping from the spec).
  await prisma.integrationConnection.create({
    data: {
      tenantId: tenant.id, name: 'SAP Material Master', type: 'database', system: 'SAP', schedule: 'hourly', status: 'inactive',
      config: JSON.stringify({ dialect: 'mssql', host: 'sap-db.internal', database: 'PRD' }),
      mappings: {
        create: [
          { sourceField: 'MATNR', targetField: 'materialCode' },
          { sourceField: 'LABST', targetField: 'remainingQty' },
          { sourceField: 'CHARG', targetField: 'batchNumber' },
        ],
      },
    },
  });

  return tenant;
}

export async function seed() {
  console.log('Seeding demo data...');
  await createTenant({ name: 'ABC Logistics', slug: 'abc', warehouseCode: 'ABC-DC1', warehouseName: 'Dallas DC', includeExampleUsers: true });
  // Second tenant proves isolation — completely separate data.
  await createTenant({ name: 'Globex 3PL', slug: 'globex', warehouseCode: 'GLX-DC1', warehouseName: 'Newark DC', includeExampleUsers: false });
  console.log('Seed complete.');
  console.log(`Demo logins (password: ${DEMO_PASSWORD}):`);
  console.log('  admin@abc.com   (Administrator)');
  console.log('  manager@abc.com (Warehouse Manager)');
  console.log('  john@abc.com    (Warehouse Associate)');
  console.log('  exec@abc.com    (Executive)');
  console.log('  admin@globex.com (Administrator, separate tenant)');
}

// Only seeds when the database is empty. Safe to call on every server boot.
export async function ensureSeeded() {
  const count = await prisma.tenant.count();
  if (count === 0) {
    await seed();
  }
}

// Allow running directly: `tsx src/seed.ts`.
if (require.main === module) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
