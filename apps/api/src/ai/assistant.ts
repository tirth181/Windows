import { prisma } from '../prisma';
import { AuthContext } from '../types';
import { hasPermission } from '../rbac/permissions';
import { derivedStatus } from '../modules/inventory';
import { isDelayed } from '../modules/outbound';

// A pending action the AI proposes but requires explicit user approval to run.
export interface PendingAction {
  type: 'inventory.move';
  label: string;
  payload: Record<string, unknown>;
  requiredPermission: string;
}

export interface AiResponse {
  answer: string;
  denied?: boolean;
  data?: unknown;
  action?: PendingAction;
  suggestions?: string[];
}

function deny(perm: string): AiResponse {
  return {
    answer: `You do not have permission to access this information (requires "${perm}"). Please contact your administrator if you need access.`,
    denied: true,
  };
}

const warehouseFilter = (auth: AuthContext) =>
  auth.warehouseIds.length ? { warehouseId: { in: auth.warehouseIds } } : {};

// Rule-based natural-language router. Every branch is permission-gated using the
// caller's live permission set, so the assistant can never leak data the user
// isn't authorized to see. Swap this for an LLM tool-router without changing the
// permission contract.
export async function askAssistant(auth: AuthContext, rawQuestion: string): Promise<AiResponse> {
  const q = rawQuestion.trim();
  const lower = q.toLowerCase();
  const tenantId = auth.tenantId;

  // 1. Customer pricing — sensitive, gated by customers:pricing.
  if (/pricing|price|rate|billing rate/.test(lower)) {
    if (!hasPermission(auth.permissions, 'customers:pricing')) return deny('customers:pricing');
    const customers = await prisma.customer.findMany({ where: { tenantId } });
    return {
      answer: `Here is customer pricing for ${customers.length} customer(s).`,
      data: customers.map((c) => ({ customer: c.name, tier: c.pricingTier, ratePerPallet: c.ratePerPallet })),
    };
  }

  // 2. Move pallet X to location Y — action requiring approval.
  const moveMatch = q.match(/move\s+(?:pallet\s+)?([a-z0-9-]+)\s+to\s+(?:location\s+)?([a-z0-9-]+)/i);
  if (moveMatch) {
    if (!hasPermission(auth.permissions, 'inventory:move')) return deny('inventory:move');
    const palletId = moveMatch[1];
    const locationCode = moveMatch[2];
    const item = await prisma.inventoryItem.findFirst({
      where: { tenantId, ...warehouseFilter(auth), palletId: { equals: palletId } },
    });
    const location = await prisma.location.findFirst({ where: { tenantId, code: { equals: locationCode } } });
    if (!item) return { answer: `I couldn't find pallet "${palletId}" in inventory you can access.` };
    if (!location) return { answer: `I couldn't find location "${locationCode}" in this warehouse.` };
    return {
      answer: `I can move pallet ${palletId} (${item.materialCode}) to location ${locationCode}. This action needs your approval before I run it.`,
      action: {
        type: 'inventory.move',
        label: `Move pallet ${palletId} → ${locationCode}`,
        payload: { itemId: item.id, locationId: location.id, palletId, locationCode },
        requiredPermission: 'inventory:move',
      },
    };
  }

  // 3. Locate a batch / pallet / material. Extract the identifier token (the one
  // containing a digit, e.g. B240501, PLT-1001) rather than the trigger word.
  const codeMatch = q.match(/\b([A-Za-z0-9][A-Za-z0-9-]*\d[A-Za-z0-9-]*)\b/);
  if (/where|locate|find|batch|pallet/.test(lower) && codeMatch) {
    if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
    const term = codeMatch[1];
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        ...warehouseFilter(auth),
        OR: [{ batchNumber: { contains: term } }, { palletId: { contains: term } }, { materialCode: { contains: term } }],
      },
      include: { location: true, warehouse: true },
      take: 25,
    });
    if (!items.length) return { answer: `I couldn't find "${term}" in inventory you can access.` };
    return {
      answer: `Found ${items.length} record(s) matching "${term}".`,
      data: items.map((i) => ({
        materialCode: i.materialCode,
        batch: i.batchNumber,
        pallet: i.palletId,
        warehouse: i.warehouse.code,
        location: i.location?.code ?? 'unassigned',
        remaining: `${i.remainingQty} ${i.unitOfMeasure}`,
        status: derivedStatus(i),
      })),
    };
  }

  // 4. Partial inventory.
  if (/partial/.test(lower)) {
    if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
    const items = await prisma.inventoryItem.findMany({ where: { tenantId, ...warehouseFilter(auth) }, include: { location: true } });
    const partials = items.filter((i) => derivedStatus(i) === 'partial');
    return {
      answer: `There are ${partials.length} partial item(s) that need attention.`,
      data: partials.map((i) => ({
        materialCode: i.materialCode,
        batch: i.batchNumber,
        remaining: `${i.remainingQty} of ${i.receivedQty} ${i.unitOfMeasure}`,
        location: i.location?.code ?? 'unassigned',
      })),
    };
  }

  // 5. Inventory availability.
  if (/(how much|available|on hand|inventory|stock|quantity|weight)/.test(lower)) {
    if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
    const items = await prisma.inventoryItem.findMany({ where: { tenantId, ...warehouseFilter(auth) } });
    const available = items.filter((i) => ['available', 'partial'].includes(derivedStatus(i)));
    const totalWeight = available.filter((i) => i.unitOfMeasure !== 'each').reduce((s, i) => s + i.remainingQty, 0);
    const totalEach = available.filter((i) => i.unitOfMeasure === 'each').reduce((s, i) => s + i.remainingQty, 0);
    return {
      answer: `You have ${available.length} available lot(s): ${Math.round(totalWeight)} lbs of weight-based stock and ${Math.round(totalEach)} units on hand.`,
      data: { availableLots: available.length, totalRemainingWeight: Math.round(totalWeight), totalUnits: Math.round(totalEach) },
    };
  }

  // 6. Delayed / late orders.
  if (/(delayed|late|overdue|behind)/.test(lower)) {
    if (!hasPermission(auth.permissions, 'outbound:view')) return deny('outbound:view');
    const orders = await prisma.outboundOrder.findMany({ where: { tenantId, ...warehouseFilter(auth) }, include: { customer: true } });
    const delayed = orders.filter((o) => isDelayed(o));
    return {
      answer: delayed.length ? `${delayed.length} order(s) are delayed.` : 'No orders are currently delayed. Nice work!',
      data: delayed.map((o) => ({ orderNumber: o.orderNumber, customer: o.customer?.name ?? '—', due: o.dueDate, status: o.status })),
    };
  }

  // 7. Reports.
  if (/report|summary|analytics/.test(lower)) {
    if (!hasPermission(auth.permissions, 'reports:view')) return deny('reports:view');
    const [orders, items] = await Promise.all([
      prisma.outboundOrder.findMany({ where: { tenantId, ...warehouseFilter(auth) } }),
      prisma.inventoryItem.findMany({ where: { tenantId, ...warehouseFilter(auth) } }),
    ]);
    return {
      answer: 'Here is a quick operational summary.',
      data: {
        shipped: orders.filter((o) => o.status === 'shipped').length,
        open: orders.filter((o) => ['open', 'picking'].includes(o.status)).length,
        inventoryLots: items.length,
        partialLots: items.filter((i) => derivedStatus(i) === 'partial').length,
      },
    };
  }

  // Fallback: capability help, filtered to what the user is allowed to do.
  const suggestions: string[] = [];
  if (hasPermission(auth.permissions, 'inventory:view')) {
    suggestions.push('Where is batch B240501?', 'How much inventory is available?', 'Show partial pallets');
  }
  if (hasPermission(auth.permissions, 'outbound:view')) suggestions.push('Which orders are delayed?');
  if (hasPermission(auth.permissions, 'inventory:move')) suggestions.push('Move pallet PLT-1001 to location B-12');
  if (hasPermission(auth.permissions, 'reports:view')) suggestions.push('Generate a shipping report');
  return {
    answer: "I'm your AetherWMS assistant. I can answer operational questions and take approved actions — always within your permissions. Try one of the suggestions below.",
    suggestions,
  };
}

export async function executeAction(auth: AuthContext, action: PendingAction): Promise<{ ok: boolean; message: string }> {
  if (!hasPermission(auth.permissions, action.requiredPermission)) {
    return { ok: false, message: `You do not have permission (${action.requiredPermission}) to perform this action.` };
  }
  if (action.type === 'inventory.move') {
    const itemId = String(action.payload.itemId);
    const locationId = String(action.payload.locationId);
    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, tenantId: auth.tenantId } });
    if (!item) return { ok: false, message: 'Inventory item no longer exists.' };
    await prisma.inventoryItem.update({ where: { id: itemId }, data: { locationId } });
    return { ok: true, message: `Moved pallet ${action.payload.palletId} to ${action.payload.locationCode}.` };
  }
  return { ok: false, message: 'Unsupported action.' };
}
