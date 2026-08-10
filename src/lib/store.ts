"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Budget,
  Client,
  Estimate,
  Expense,
  Invoice,
  Organization,
  PlanId,
  Product,
  User,
  WorkspaceType,
} from "./types";
import { addDaysISO, invoicesThisMonth, todayISO, uid } from "./format";
import { getPlan } from "./plans";

interface Actions {
  signup: (input: {
    name: string;
    email: string;
    password: string;
    businessName: string;
    workspaceType: WorkspaceType;
  }) => { ok: true } | { ok: false; error: string };
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  currentUser: () => User | null;
  currentOrg: () => Organization | null;
  updateOrg: (patch: Partial<Organization>) => void;
  setPlan: (plan: PlanId) => void;
  canCreateInvoice: () => { ok: true } | { ok: false; error: string };
  canCreateClient: () => { ok: true } | { ok: false; error: string };
  canCreateBudget: (workspaceType: WorkspaceType) => { ok: true } | { ok: false; error: string };
  addClient: (data: Omit<Client, "id" | "organizationId" | "createdAt">) => Client | null;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProduct: (data: Omit<Product, "id" | "organizationId" | "createdAt">) => Product | null;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addInvoice: (data: Omit<Invoice, "id" | "organizationId" | "number" | "createdAt" | "updatedAt">) => Invoice | null;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addEstimate: (data: Omit<Estimate, "id" | "organizationId" | "number" | "createdAt">) => Estimate | null;
  updateEstimate: (id: string, data: Partial<Estimate>) => void;
  deleteEstimate: (id: string) => void;
  convertEstimateToInvoice: (estimateId: string) => Invoice | null;
  addExpense: (data: Omit<Expense, "id" | "organizationId" | "createdAt">) => Expense | null;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addBudget: (data: Omit<Budget, "id" | "organizationId" | "createdAt">) => Budget | null;
  updateBudget: (id: string, data: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  seedDemo: () => void;
}

type Store = AppState & Actions;

const emptyState: AppState = {
  users: [],
  organizations: [],
  clients: [],
  products: [],
  invoices: [],
  estimates: [],
  expenses: [],
  budgets: [],
  sessionUserId: null,
};

export const useAppStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyState,

      currentUser: () => {
        const { sessionUserId, users } = get();
        return users.find((u) => u.id === sessionUserId) ?? null;
      },

      currentOrg: () => {
        const user = get().currentUser();
        if (!user) return null;
        return get().organizations.find((o) => o.id === user.organizationId) ?? null;
      },

      signup: ({ name, email, password, businessName, workspaceType }) => {
        const normalized = email.trim().toLowerCase();
        if (get().users.some((u) => u.email === normalized)) {
          return { ok: false, error: "An account with this email already exists." };
        }
        if (password.length < 6) {
          return { ok: false, error: "Password must be at least 6 characters." };
        }
        const orgId = uid("org");
        const userId = uid("user");
        const org: Organization = {
          id: orgId,
          name: businessName.trim() || `${name}'s Workspace`,
          email: normalized,
          currency: "USD",
          workspaceType,
          plan: "free",
          invoicePrefix: "INV",
          nextInvoiceNumber: 1001,
          createdAt: new Date().toISOString(),
        };
        const user: User = {
          id: userId,
          name: name.trim(),
          email: normalized,
          password,
          organizationId: orgId,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          users: [...s.users, user],
          organizations: [...s.organizations, org],
          sessionUserId: userId,
        }));
        return { ok: true };
      },

      login: (email, password) => {
        const normalized = email.trim().toLowerCase();
        const user = get().users.find((u) => u.email === normalized && u.password === password);
        if (!user) return { ok: false, error: "Invalid email or password." };
        set({ sessionUserId: user.id });
        return { ok: true };
      },

      logout: () => set({ sessionUserId: null }),

      updateOrg: (patch) => {
        const org = get().currentOrg();
        if (!org) return;
        set((s) => ({
          organizations: s.organizations.map((o) => (o.id === org.id ? { ...o, ...patch } : o)),
        }));
      },

      setPlan: (plan) => {
        get().updateOrg({ plan });
      },

      canCreateInvoice: () => {
        const org = get().currentOrg();
        if (!org) return { ok: false, error: "Not signed in." };
        const plan = getPlan(org.plan);
        const count = invoicesThisMonth(get().invoices, org.id).length;
        if (count >= plan.limits.invoicesPerMonth) {
          return {
            ok: false,
            error: `Starter plan allows ${plan.limits.invoicesPerMonth} invoices/month. Upgrade to Pro for unlimited.`,
          };
        }
        return { ok: true };
      },

      canCreateClient: () => {
        const org = get().currentOrg();
        if (!org) return { ok: false, error: "Not signed in." };
        const plan = getPlan(org.plan);
        const count = get().clients.filter((c) => c.organizationId === org.id).length;
        if (count >= plan.limits.clients) {
          return { ok: false, error: `Client limit reached on ${plan.name}. Upgrade to add more.` };
        }
        return { ok: true };
      },

      canCreateBudget: (workspaceType) => {
        const org = get().currentOrg();
        if (!org) return { ok: false, error: "Not signed in." };
        const plan = getPlan(org.plan);
        if (workspaceType === "family" && !plan.limits.familyBudgets) {
          return { ok: false, error: "Family budgets require Pro or Business." };
        }
        if (workspaceType === "company" && !plan.limits.companyBudgets) {
          return { ok: false, error: "Company budgets require Business plan." };
        }
        const count = get().budgets.filter((b) => b.organizationId === org.id).length;
        if (count >= plan.limits.budgets) {
          return { ok: false, error: `Budget limit reached on ${plan.name}. Upgrade for more.` };
        }
        return { ok: true };
      },

      addClient: (data) => {
        const org = get().currentOrg();
        const gate = get().canCreateClient();
        if (!org || !gate.ok) return null;
        const client: Client = {
          ...data,
          id: uid("cli"),
          organizationId: org.id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ clients: [...s.clients, client] }));
        return client;
      },

      updateClient: (id, data) => {
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
      },

      deleteClient: (id) => {
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
      },

      addProduct: (data) => {
        const org = get().currentOrg();
        if (!org) return null;
        const product: Product = {
          ...data,
          id: uid("prd"),
          organizationId: org.id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ products: [...s.products, product] }));
        return product;
      },

      updateProduct: (id, data) => {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
      },

      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
      },

      addInvoice: (data) => {
        const org = get().currentOrg();
        const gate = get().canCreateInvoice();
        if (!org || !gate.ok) return null;
        const number = `${org.invoicePrefix}-${org.nextInvoiceNumber}`;
        const invoice: Invoice = {
          ...data,
          id: uid("inv"),
          organizationId: org.id,
          number,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          invoices: [...s.invoices, invoice],
          organizations: s.organizations.map((o) =>
            o.id === org.id ? { ...o, nextInvoiceNumber: o.nextInvoiceNumber + 1 } : o,
          ),
        }));
        return invoice;
      },

      updateInvoice: (id, data) => {
        set((s) => ({
          invoices: s.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...data, updatedAt: new Date().toISOString() } : inv,
          ),
        }));
      },

      deleteInvoice: (id) => {
        set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
      },

      addEstimate: (data) => {
        const org = get().currentOrg();
        if (!org) return null;
        const count = get().estimates.filter((e) => e.organizationId === org.id).length;
        const number = `EST-${1001 + count}`;
        const estimate: Estimate = {
          ...data,
          id: uid("est"),
          organizationId: org.id,
          number,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ estimates: [...s.estimates, estimate] }));
        return estimate;
      },

      updateEstimate: (id, data) => {
        set((s) => ({
          estimates: s.estimates.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
      },

      deleteEstimate: (id) => {
        set((s) => ({ estimates: s.estimates.filter((e) => e.id !== id) }));
      },

      convertEstimateToInvoice: (estimateId) => {
        const estimate = get().estimates.find((e) => e.id === estimateId);
        if (!estimate) return null;
        const invoice = get().addInvoice({
          clientId: estimate.clientId,
          status: "draft",
          issueDate: todayISO(),
          dueDate: addDaysISO(14),
          items: estimate.items,
          notes: estimate.notes,
          terms: "Payment due within 14 days.",
          discountPercent: estimate.discountPercent,
          currency: estimate.currency,
        });
        if (invoice) get().updateEstimate(estimateId, { status: "accepted" });
        return invoice;
      },

      addExpense: (data) => {
        const org = get().currentOrg();
        if (!org) return null;
        const expense: Expense = {
          ...data,
          id: uid("exp"),
          organizationId: org.id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ expenses: [...s.expenses, expense] }));
        return expense;
      },

      updateExpense: (id, data) => {
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...data } : e)) }));
      },

      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      },

      addBudget: (data) => {
        const org = get().currentOrg();
        const gate = get().canCreateBudget(data.workspaceType);
        if (!org || !gate.ok) return null;
        const budget: Budget = {
          ...data,
          id: uid("bud"),
          organizationId: org.id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ budgets: [...s.budgets, budget] }));
        return budget;
      },

      updateBudget: (id, data) => {
        set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...data } : b)) }));
      },

      deleteBudget: (id) => {
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
      },

      seedDemo: () => {
        const existing = get().users.find((u) => u.email === "demo@fynvo.app");
        if (existing) {
          // Keep demo credentials predictable even if older local data drifted.
          set((s) => ({
            sessionUserId: existing.id,
            users: s.users.map((u) =>
              u.id === existing.id ? { ...u, password: "demo123", email: "demo@fynvo.app" } : u,
            ),
          }));
          return;
        }
        const orgId = uid("org");
        const userId = uid("user");
        const clientId = uid("cli");
        const productId = uid("prd");
        const org: Organization = {
          id: orgId,
          name: "Northwind Studio",
          email: "demo@fynvo.app",
          phone: "+1 (555) 014-2200",
          address: "120 Market Street, Austin, TX",
          currency: "USD",
          workspaceType: "company",
          plan: "pro",
          invoicePrefix: "NV",
          nextInvoiceNumber: 1003,
          createdAt: new Date().toISOString(),
        };
        const user: User = {
          id: userId,
          name: "Alex Rivera",
          email: "demo@fynvo.app",
          password: "demo123",
          organizationId: orgId,
          createdAt: new Date().toISOString(),
        };
        const client: Client = {
          id: clientId,
          organizationId: orgId,
          name: "Jordan Lee",
          email: "jordan@brightco.io",
          company: "Brightco",
          phone: "+1 (555) 019-8831",
          address: "88 Harbor Ave, Seattle, WA",
          createdAt: new Date().toISOString(),
        };
        const product: Product = {
          id: productId,
          organizationId: orgId,
          name: "Brand Identity Package",
          description: "Logo system, typography, and brand guide",
          unitPrice: 2400,
          unit: "project",
          taxRate: 0,
          createdAt: new Date().toISOString(),
        };
        const invoice: Invoice = {
          id: uid("inv"),
          organizationId: orgId,
          number: "NV-1001",
          clientId,
          status: "sent",
          issueDate: todayISO(),
          dueDate: addDaysISO(14),
          items: [
            {
              id: uid("li"),
              description: "Brand Identity Package",
              quantity: 1,
              unitPrice: 2400,
              taxRate: 0,
            },
            {
              id: uid("li"),
              description: "Website landing page design",
              quantity: 1,
              unitPrice: 1800,
              taxRate: 0,
            },
          ],
          notes: "Thank you for partnering with Northwind Studio.",
          terms: "Net 14. Late payments may incur a 1.5% monthly fee.",
          discountPercent: 0,
          currency: "USD",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const paidInvoice: Invoice = {
          id: uid("inv"),
          organizationId: orgId,
          number: "NV-1002",
          clientId,
          status: "paid",
          issueDate: addDaysISO(-20),
          dueDate: addDaysISO(-6),
          items: [
            {
              id: uid("li"),
              description: "Monthly retainer — design support",
              quantity: 1,
              unitPrice: 1200,
              taxRate: 0,
            },
          ],
          discountPercent: 0,
          currency: "USD",
          createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const budget: Budget = {
          id: uid("bud"),
          organizationId: orgId,
          name: "Household Monthly",
          workspaceType: "family",
          period: "monthly",
          startDate: todayISO().slice(0, 8) + "01",
          incomeTarget: 6500,
          categories: [
            { id: uid("cat"), name: "Housing", allocated: 2200, color: "#0F6E56" },
            { id: uid("cat"), name: "Groceries", allocated: 700, color: "#C26401" },
            { id: uid("cat"), name: "Transport", allocated: 400, color: "#185FA5" },
            { id: uid("cat"), name: "Savings", allocated: 1000, color: "#534AB7" },
            { id: uid("cat"), name: "Lifestyle", allocated: 500, color: "#993C1D" },
          ],
          createdAt: new Date().toISOString(),
        };
        const expenses: Expense[] = [
          {
            id: uid("exp"),
            organizationId: orgId,
            title: "Rent",
            amount: 2200,
            category: "Housing",
            date: todayISO(),
            budgetId: budget.id,
            createdAt: new Date().toISOString(),
          },
          {
            id: uid("exp"),
            organizationId: orgId,
            title: "Weekly groceries",
            amount: 186.4,
            category: "Groceries",
            date: todayISO(),
            budgetId: budget.id,
            createdAt: new Date().toISOString(),
          },
          {
            id: uid("exp"),
            organizationId: orgId,
            title: "Fuel",
            amount: 64,
            category: "Transport",
            date: addDaysISO(-2),
            budgetId: budget.id,
            createdAt: new Date().toISOString(),
          },
        ];
        set((s) => ({
          users: [...s.users, user],
          organizations: [...s.organizations, org],
          clients: [...s.clients, client],
          products: [...s.products, product],
          invoices: [...s.invoices, invoice, paidInvoice],
          budgets: [...s.budgets, budget],
          expenses: [...s.expenses, ...expenses],
          sessionUserId: userId,
        }));
      },
    }),
    {
      name: "fynvo-store-v1",
    },
  ),
);
