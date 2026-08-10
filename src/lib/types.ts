export type PlanId = "free" | "pro" | "business";
export type WorkspaceType = "individual" | "family" | "company";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
export type EstimateStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  taxId?: string;
  currency: string;
  logoDataUrl?: string;
  workspaceType: WorkspaceType;
  plan: PlanId;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  organizationId: string;
  createdAt: string;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  unitPrice: number;
  unit?: string;
  taxRate: number;
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  number: string;
  clientId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  notes?: string;
  terms?: string;
  discountPercent: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Estimate {
  id: string;
  organizationId: string;
  number: string;
  clientId: string;
  status: EstimateStatus;
  issueDate: string;
  validUntil: string;
  items: LineItem[];
  notes?: string;
  discountPercent: number;
  currency: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  organizationId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  budgetId?: string;
  createdAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  color: string;
}

export interface Budget {
  id: string;
  organizationId: string;
  name: string;
  workspaceType: WorkspaceType;
  period: BudgetPeriod;
  startDate: string;
  incomeTarget: number;
  categories: BudgetCategory[];
  createdAt: string;
}

export interface AppState {
  users: User[];
  organizations: Organization[];
  clients: Client[];
  products: Product[];
  invoices: Invoice[];
  estimates: Estimate[];
  expenses: Expense[];
  budgets: Budget[];
  sessionUserId: string | null;
}
