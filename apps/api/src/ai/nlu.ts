import { env } from '../env';

// Supported conversational intents. The same enum is used by the rules engine
// and the optional LLM classifier, so downstream permission-gated executors are
// identical regardless of which understood the message.
export type Intent =
  | 'greeting'
  | 'thanks'
  | 'help'
  | 'pricing'
  | 'move'
  | 'locate'
  | 'partial'
  | 'availability'
  | 'delayed'
  | 'order_status'
  | 'low_stock'
  | 'report'
  | 'attach_help'
  | 'create_order_help'
  | 'unknown';

export interface Entities {
  code?: string;
  orderNumber?: string;
  palletId?: string;
  locationCode?: string;
}

export interface Classification {
  intent: Intent;
  entities: Entities;
  source: 'rules' | 'llm';
  confidence: number;
}

const KEYWORDS: Record<Exclude<Intent, 'unknown'>, string[]> = {
  greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'yo', 'howdy'],
  thanks: ['thanks', 'thank you', 'thx', 'appreciate', 'cheers'],
  help: ['help', 'what can you do', 'capabilities', 'how do you work', 'commands', 'options'],
  pricing: ['pricing', 'price', 'rate', 'rates', 'billing rate', 'cost to store', 'rate card'],
  move: ['move', 'relocate', 'putaway to', 'transfer'],
  locate: ['where', 'locate', 'find', 'which location', 'which bin', 'batch', 'pallet', 'lot number'],
  partial: ['partial', 'partially', 'half empty', 'opened', 'broken pallet'],
  availability: ['how much', 'available', 'on hand', 'in stock', 'inventory', 'quantity', 'stock level'],
  delayed: ['delayed', 'late', 'overdue', 'behind', 'past due', 'missed', 'behind schedule', 'running late', 'running behind'],
  order_status: ['order status', 'status of', 'status for', 'where is order', 'what happened to order', 'track order'],
  low_stock: ['low stock', 'running low', 'reorder', 'almost out', 'low on', 'replenish', 'running out'],
  report: ['report', 'summary', 'analytics', 'overview', 'how are we doing', 'kpi', 'dashboard', 'performance'],
  attach_help: ['attach', 'upload', 'document', 'file', 'bol', 'packing list', 'po ', 'purchase order', 'paperwork'],
  create_order_help: ['create order', 'new order', 'enter order', 'place order', 'add order', 'create shipment', 'new shipment'],
};

// Priority for tie-breaking (more specific intents win over general ones).
const PRIORITY: Intent[] = [
  'move', 'order_status', 'low_stock', 'partial', 'delayed', 'pricing',
  'attach_help', 'create_order_help', 'locate', 'availability', 'report',
  'help', 'greeting', 'thanks', 'unknown',
];

export function extractEntities(raw: string): Entities {
  const entities: Entities = {};
  const move = raw.match(/move\s+(?:pallet\s+)?([a-z0-9-]+)\s+to\s+(?:location\s+|bin\s+)?([a-z0-9-]+)/i);
  if (move) {
    entities.palletId = move[1];
    entities.locationCode = move[2];
  }
  const order = raw.match(/\b(so[-\s]?\d+)\b/i);
  if (order) entities.orderNumber = order[1].toUpperCase().replace(/\s/g, '-');
  // A code-like token containing at least one digit (batch/pallet/material).
  const codes = raw.match(/\b([a-z]*\d[a-z0-9-]*)\b/gi) ?? [];
  const code = codes.find((c) => c.toUpperCase() !== entities.orderNumber);
  if (code) entities.code = code;
  return entities;
}

export function classifyWithRules(raw: string): Classification {
  const lower = ` ${raw.toLowerCase()} `;
  const scores = new Map<Intent, number>();
  for (const [intent, words] of Object.entries(KEYWORDS) as [Exclude<Intent, 'unknown'>, string[]][]) {
    let score = 0;
    for (const w of words) if (lower.includes(` ${w}`) || lower.includes(`${w} `) || lower.includes(w)) score += w.includes(' ') ? 2 : 1;
    if (score > 0) scores.set(intent, score);
  }

  const entities = extractEntities(raw);
  // Boosts from extracted entities.
  if (entities.palletId && entities.locationCode) scores.set('move', (scores.get('move') ?? 0) + 3);
  if (entities.orderNumber) scores.set('order_status', (scores.get('order_status') ?? 0) + 2);

  let best: Intent = 'unknown';
  let bestScore = 0;
  for (const intent of PRIORITY) {
    const s = scores.get(intent) ?? 0;
    if (s > bestScore) {
      best = intent;
      bestScore = s;
    }
  }

  return { intent: best, entities, source: 'rules', confidence: bestScore === 0 ? 0 : Math.min(1, bestScore / 4) };
}

// Optional LLM classifier. Only used when OPENAI_API_KEY is configured; on any
// error it returns null so the caller falls back to the rules engine. The LLM
// only classifies intent + entities — all data access and permission checks
// happen server-side afterwards, so the guardrails are identical either way.
export async function classifyWithLLM(raw: string): Promise<Classification | null> {
  if (!env.OPENAI_API_KEY) return null;
  try {
    const system = `You classify a warehouse operator's message into one intent and extract entities.
Return strict JSON: {"intent": one of [greeting,thanks,help,pricing,move,locate,partial,availability,delayed,order_status,low_stock,report,attach_help,create_order_help,unknown], "entities": {"code"?: string, "orderNumber"?: string, "palletId"?: string, "locationCode"?: string}}.
"move" = relocate a pallet to a location (fill palletId and locationCode). "locate" = find where a batch/pallet/material is (fill code). "order_status" = status of a specific order (fill orderNumber). Only output JSON.`;
    const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: raw },
        ],
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      intent: (parsed.intent as Intent) ?? 'unknown',
      entities: { ...extractEntities(raw), ...(parsed.entities ?? {}) },
      source: 'llm',
      confidence: 0.9,
    };
  } catch {
    return null;
  }
}

export async function classify(raw: string): Promise<Classification> {
  const llm = await classifyWithLLM(raw);
  if (llm && llm.intent !== 'unknown') return llm;
  return classifyWithRules(raw);
}
