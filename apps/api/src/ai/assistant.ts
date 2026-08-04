import { prisma } from '../prisma';
import { AuthContext } from '../types';
import { hasPermission } from '../rbac/permissions';
import { derivedStatus } from '../modules/inventory';
import { isDelayed } from '../modules/outbound';
import { classify, Classification, Entities, Intent } from './nlu';

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
  trace?: string[]; // transparency: what the assistant looked at
  intent?: string;
  source?: 'rules' | 'llm';
}

function deny(perm: string): AiResponse {
  return {
    answer: `I'm sorry, but you don't have permission to access that (requires "${perm}"). Please ask your administrator if you need it.`,
    denied: true,
  };
}

const warehouseFilter = (auth: AuthContext) =>
  auth.warehouseIds.length ? { warehouseId: { in: auth.warehouseIds } } : {};

function suggestionsFor(auth: AuthContext): string[] {
  const s: string[] = [];
  if (hasPermission(auth.permissions, 'inventory:view')) s.push('How much inventory do we have available?', 'Where is batch B240501?', 'Show me any partial pallets');
  if (hasPermission(auth.permissions, 'outbound:view')) s.push('Which orders are running late?', "What's the status of order SO-1001?");
  if (hasPermission(auth.permissions, 'inventory:move')) s.push('Move pallet PLT-1001 to location B-12');
  if (hasPermission(auth.permissions, 'reports:view')) s.push('Give me an operations summary');
  return s.slice(0, 5);
}

// Executors: one per intent. Each re-checks permissions server-side, so the LLM
// (when enabled) can never widen access — it only decides intent + entities.
async function execute(auth: AuthContext, intent: Intent, entities: Entities): Promise<AiResponse> {
  const tenantId = auth.tenantId;
  const trace: string[] = [];

  switch (intent) {
    case 'greeting':
      return { answer: `Hi! I'm your AetherWMS assistant. I can look things up and take approved actions — always within your permissions. What do you need?`, suggestions: suggestionsFor(auth) };

    case 'thanks':
      return { answer: "You're welcome! Anything else I can help with?", suggestions: suggestionsFor(auth) };

    case 'help':
      return {
        answer:
          "I understand plain English. You can ask me things like:\n• “How much of ABC100 do we have?”\n• “Where is batch B240501?”\n• “Any partial pallets I should know about?”\n• “Which orders are late?”\n• “What's the status of SO-1001?”\nI can also move a pallet (with your approval).",
        suggestions: suggestionsFor(auth),
      };

    case 'pricing': {
      if (!hasPermission(auth.permissions, 'customers:pricing')) return deny('customers:pricing');
      const customers = await prisma.customer.findMany({ where: { tenantId } });
      trace.push(`Read rate cards for ${customers.length} customer(s)`);
      return {
        answer: `Here's the customer pricing I found for ${customers.length} customer(s).`,
        data: customers.map((c) => ({ customer: c.name, tier: c.pricingTier, storagePerPallet: c.ratePerPallet, receivingRate: c.receivingRate, pickRate: c.pickRate })),
        trace,
      };
    }

    case 'move': {
      if (!hasPermission(auth.permissions, 'inventory:move')) return deny('inventory:move');
      const palletId = entities.palletId;
      const locationCode = entities.locationCode;
      if (!palletId || !locationCode) return { answer: 'Sure — tell me which pallet to move and the destination, e.g. “move pallet PLT-1001 to location B-12”.' };
      const item = await prisma.inventoryItem.findFirst({ where: { tenantId, ...warehouseFilter(auth), palletId } });
      const location = await prisma.location.findFirst({ where: { tenantId, code: locationCode } });
      trace.push(`Looked up pallet ${palletId} and location ${locationCode}`);
      if (!item) return { answer: `I couldn't find pallet “${palletId}” in the inventory you can access.`, trace };
      if (!location) return { answer: `I couldn't find location “${locationCode}” in this warehouse.`, trace };
      return {
        answer: `I can move pallet ${palletId} (${item.materialCode}) to ${locationCode}. This changes stock, so I need your approval first.`,
        action: { type: 'inventory.move', label: `Move pallet ${palletId} → ${locationCode}`, payload: { itemId: item.id, locationId: location.id, palletId, locationCode }, requiredPermission: 'inventory:move' },
        trace,
      };
    }

    case 'locate': {
      if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
      const term = entities.code;
      if (!term) return { answer: 'Which batch, pallet, or material should I locate? For example “where is batch B240501?”.' };
      const items = await prisma.inventoryItem.findMany({
        where: { tenantId, ...warehouseFilter(auth), OR: [{ batchNumber: { contains: term } }, { palletId: { contains: term } }, { materialCode: { contains: term } }] },
        include: { location: true, warehouse: true },
        take: 25,
      });
      trace.push(`Searched inventory for “${term}” — ${items.length} match(es)`);
      if (!items.length) return { answer: `I couldn't find “${term}” in the inventory you can access.`, trace };
      return {
        answer: `I found ${items.length} record(s) for “${term}”. Here's where they are:`,
        data: items.map((i) => ({ materialCode: i.materialCode, batch: i.batchNumber, pallet: i.palletId, warehouse: i.warehouse.code, location: i.location?.code ?? 'unassigned', remaining: `${i.remainingQty} ${i.unitOfMeasure}`, status: derivedStatus(i) })),
        trace,
      };
    }

    case 'partial': {
      if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
      const items = await prisma.inventoryItem.findMany({ where: { tenantId, ...warehouseFilter(auth) }, include: { location: true } });
      const partials = items.filter((i) => derivedStatus(i) === 'partial');
      trace.push(`Scanned ${items.length} lots, ${partials.length} are partial`);
      return {
        answer: partials.length ? `There are ${partials.length} partial lot(s) that may need attention:` : 'Good news — no partial lots right now.',
        data: partials.map((i) => ({ materialCode: i.materialCode, batch: i.batchNumber, remaining: `${i.remainingQty} of ${i.receivedQty} ${i.unitOfMeasure}`, location: i.location?.code ?? 'unassigned' })),
        trace,
      };
    }

    case 'availability': {
      if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
      const term = entities.code;
      const items = await prisma.inventoryItem.findMany({
        where: { tenantId, ...warehouseFilter(auth), ...(term ? { materialCode: { contains: term } } : {}) },
      });
      const available = items.filter((i) => ['available', 'partial'].includes(derivedStatus(i)));
      const totalWeight = available.filter((i) => i.unitOfMeasure !== 'each').reduce((s, i) => s + i.remainingQty, 0);
      const totalEach = available.filter((i) => i.unitOfMeasure === 'each').reduce((s, i) => s + i.remainingQty, 0);
      trace.push(`Summed available stock across ${available.length} lot(s)${term ? ` for material “${term}”` : ''}`);
      return {
        answer: `${term ? `For ${term}, you` : 'You'} have ${available.length} available lot(s): about ${Math.round(totalWeight)} lbs of weight-based stock and ${Math.round(totalEach)} units on hand.`,
        data: { availableLots: available.length, totalRemainingWeight: Math.round(totalWeight), totalUnits: Math.round(totalEach) },
        trace,
      };
    }

    case 'delayed': {
      if (!hasPermission(auth.permissions, 'outbound:view')) return deny('outbound:view');
      const orders = await prisma.outboundOrder.findMany({ where: { tenantId, ...warehouseFilter(auth) }, include: { customer: true } });
      const delayed = orders.filter((o) => isDelayed(o));
      trace.push(`Checked ${orders.length} order(s) against due dates`);
      return {
        answer: delayed.length ? `${delayed.length} order(s) are past due:` : 'Nothing is late right now — every order is on schedule.',
        data: delayed.map((o) => ({ orderNumber: o.orderNumber, customer: o.customer?.name ?? '—', due: o.dueDate, status: o.status })),
        trace,
      };
    }

    case 'order_status': {
      if (!hasPermission(auth.permissions, 'outbound:view')) return deny('outbound:view');
      const num = entities.orderNumber ?? entities.code;
      if (!num) return { answer: 'Which order? Give me the number, e.g. “status of SO-1001”.' };
      const order = await prisma.outboundOrder.findFirst({ where: { tenantId, ...warehouseFilter(auth), orderNumber: { contains: num } }, include: { customer: true, lines: true } });
      trace.push(`Looked up order ${num}`);
      if (!order) return { answer: `I couldn't find order “${num}”.`, trace };
      return {
        answer: `Order ${order.orderNumber} for ${order.customer?.name ?? 'unknown customer'} is currently “${order.status}”${isDelayed(order) ? ' and is past its due date' : ''}.`,
        data: { orderNumber: order.orderNumber, status: order.status, due: order.dueDate, delayed: isDelayed(order), lines: order.lines.map((l) => `${l.materialCode} ×${l.quantity}`) },
        trace,
      };
    }

    case 'low_stock': {
      if (!hasPermission(auth.permissions, 'inventory:view')) return deny('inventory:view');
      const items = await prisma.inventoryItem.findMany({ where: { tenantId, ...warehouseFilter(auth) } });
      const low = items.filter((i) => { const s = derivedStatus(i); return s === 'partial' || s === 'empty'; });
      trace.push(`Flagged ${low.length} low/empty lot(s) of ${items.length}`);
      return {
        answer: low.length ? `${low.length} lot(s) are low or empty and may need replenishment:` : 'No lots are low right now.',
        data: low.map((i) => ({ materialCode: i.materialCode, batch: i.batchNumber, remaining: `${i.remainingQty} ${i.unitOfMeasure}`, status: derivedStatus(i) })),
        trace,
      };
    }

    case 'report': {
      if (!hasPermission(auth.permissions, 'reports:view')) return deny('reports:view');
      const [orders, items] = await Promise.all([
        prisma.outboundOrder.findMany({ where: { tenantId, ...warehouseFilter(auth) } }),
        prisma.inventoryItem.findMany({ where: { tenantId, ...warehouseFilter(auth) } }),
      ]);
      trace.push('Aggregated orders and inventory for a summary');
      return {
        answer: "Here's a quick operations summary:",
        data: {
          shipped: orders.filter((o) => o.status === 'shipped').length,
          open: orders.filter((o) => ['open', 'picking'].includes(o.status)).length,
          delayed: orders.filter((o) => isDelayed(o)).length,
          inventoryLots: items.length,
          partialLots: items.filter((i) => derivedStatus(i) === 'partial').length,
        },
        trace,
      };
    }

    case 'attach_help':
      return { answer: 'You can attach documents (POs, BOLs, packing lists, photos) right on an order or receipt. Open Shipping → a new or existing order → “Attach document”, or Receiving → a receipt. I keep every upload in the audit trail.' };

    case 'create_order_help':
      if (!hasPermission(auth.permissions, 'outbound:view')) return deny('outbound:view');
      return { answer: 'To enter an order, go to Shipping → “New order”. Pick the customer and warehouse, add line items, set a due date, and attach any documents. I can then help you track its status.' };

    default:
      return {
        answer: "I'm not totally sure what you're after, but I can help with inventory, orders, partial stock, and more. Try one of these:",
        suggestions: suggestionsFor(auth),
      };
  }
}

export async function askAssistant(auth: AuthContext, rawQuestion: string): Promise<AiResponse> {
  const classification: Classification = await classify(rawQuestion.trim());
  const response = await execute(auth, classification.intent, classification.entities);
  return { ...response, intent: classification.intent, source: classification.source };
}

export async function executeAction(auth: AuthContext, action: PendingAction): Promise<{ ok: boolean; message: string }> {
  if (!hasPermission(auth.permissions, action.requiredPermission)) {
    return { ok: false, message: `You do not have permission (${action.requiredPermission}) to perform this action.` };
  }
  if (action.type === 'inventory.move') {
    const itemId = String(action.payload.itemId);
    const locationId = String(action.payload.locationId);
    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, tenantId: auth.tenantId } });
    if (!item) return { ok: false, message: 'That inventory item no longer exists.' };
    await prisma.inventoryItem.update({ where: { id: itemId }, data: { locationId } });
    return { ok: true, message: `Moved pallet ${action.payload.palletId} to ${action.payload.locationCode}.` };
  }
  return { ok: false, message: 'Unsupported action.' };
}
