export type InventoryStatus =
  | "Available"
  | "Reserved"
  | "Partial"
  | "Hold"
  | "Damaged"
  | "Shipped";

export type InboundStatus = "Draft" | "Received" | "Cancelled";
export type OutboundStatus = "Draft" | "Picking" | "Shipped" | "Cancelled";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  companyId: string;
  companyName: string;
  roles: string[];
  permissions: string[];
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  timezone?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
}

export interface StorageLocation {
  id: string;
  warehouseId: string;
  code: string;
  zone: string;
  aisle?: string;
  rack?: string;
  bin?: string;
  isActive: boolean;
}

/** Facility / plant configured by a 3PL admin for receiving & shipping. */
export interface StoragePlant {
  id: string;
  /** Scoped to the 3PL company warehouse id (`wh-*`). */
  warehouseId: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
}

export interface InboundLine {
  id: string;
  materialCode: string;
  materialDescription: string;
  batchNumber: string;
  palletId?: string;
  locationCode?: string;
  weight: number;
  quantity: number;
  boxCount: number;
}

export interface InboundLoad {
  id: string;
  loadNumber: string;
  warehouseId: string;
  warehouseName?: string;
  /** Optional — kept for API compatibility; not shown on inbound UI. */
  customerId?: string;
  customerName?: string;
  storageLocationId?: string;
  storageLocationCode?: string;
  /** Display name for storage plant when available. */
  storagePlantName?: string;
  supplierName?: string;
  arrivalDate: string;
  carrier?: string;
  trailerNumber?: string;
  notes?: string;
  status: InboundStatus;
  receivedAt?: string;
  lineCount?: number;
  totalWeight?: number;
  attachment?: DocumentAttachment;
  lines?: InboundLine[];
}

export interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  customerId: string;
  customerName?: string;
  materialCode: string;
  materialDescription: string;
  batchNumber: string;
  palletId?: string;
  locationCode?: string;
  originalWeight: number;
  remainingWeight: number;
  quantity: number;
  boxCount: number;
  status: InventoryStatus;
  lastUpdatedAt: string;
}

export interface OutboundLine {
  id: string;
  inventoryItemId?: string;
  materialCode: string;
  materialDescription: string;
  batchNumber: string;
  palletId?: string;
  /** Storage location / bin used to pick the inventory item. */
  locationCode?: string;
  weight: number;
  quantity: number;
  boxCount: number;
}

/** Document attached to inbound/outbound receipts (demo stores dataUrl locally). */
export interface DocumentAttachment {
  name: string;
  size: number;
  type: string;
  /** Optional base64 data URL for demo/local persistence of smaller files. */
  dataUrl?: string;
}

/** @deprecated Prefer DocumentAttachment — kept for existing outbound imports. */
export type OutboundAttachment = DocumentAttachment;

export interface OutboundOrder {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouseName?: string;
  customerId: string;
  customerName?: string;
  shipDate: string;
  carrier?: string;
  trackingNumber?: string;
  address?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  /** Legacy / display summary of ship-to. */
  destination?: string;
  attachment?: DocumentAttachment;
  status: OutboundStatus;
  shippedAt?: string;
  lineCount?: number;
  totalWeight?: number;
  totalPallets?: number;
  lines?: OutboundLine[];
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  roles: string[];
  lastLoginAt?: string;
}

export interface Company {
  id: string;
  name: string;
  code?: string;
  legalName?: string;
  status: "Trial" | "Active" | "Suspended";
  primaryContactEmail?: string;
  timezone: string;
}

export interface IntegrationConnection {
  id: string;
  name: string;
  type: "Rest" | "Soap" | "GraphQl" | "Webhook" | "Database" | "Csv" | "Excel";
  status: "Connected" | "Disconnected" | "Error" | "Pending";
  lastSyncAt?: string;
  endpoint?: string;
}

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface DashboardSummary {
  todayInbound: number;
  todayShipments: number;
  onHand: number;
  utilizationPct: number;
  partial: number;
  onHold: number;
  delayed: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityRef: string;
}

export interface AiInsight {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "success";
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  actions?: { label: string; href: string }[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  lastRunAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
