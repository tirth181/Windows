import type { PlanId } from "./types";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  tagline: string;
  features: string[];
  limits: {
    invoicesPerMonth: number;
    clients: number;
    budgets: number;
    estimatesPerMonth: number;
    removeWatermark: boolean;
    familyBudgets: boolean;
    companyBudgets: boolean;
    advancedReports: boolean;
  };
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter",
    priceMonthly: 0,
    priceYearly: 0,
    tagline: "Try Fynvo with essential invoicing.",
    features: [
      "5 invoices per month",
      "Up to 10 clients",
      "1 personal budget",
      "PDF export with Fynvo mark",
      "Web access",
    ],
    limits: {
      invoicesPerMonth: 5,
      clients: 10,
      budgets: 1,
      estimatesPerMonth: 5,
      removeWatermark: false,
      familyBudgets: false,
      companyBudgets: false,
      advancedReports: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 9.99,
    priceYearly: 99,
    tagline: "For freelancers and growing solo businesses.",
    features: [
      "Unlimited invoices & estimates",
      "Unlimited clients & products",
      "Personal + family budgets",
      "Clean branded PDFs",
      "Expense tracking",
      "Priority email support",
    ],
    limits: {
      invoicesPerMonth: Infinity,
      clients: Infinity,
      budgets: 10,
      estimatesPerMonth: Infinity,
      removeWatermark: true,
      familyBudgets: true,
      companyBudgets: false,
      advancedReports: true,
    },
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 24.99,
    priceYearly: 249,
    tagline: "For teams, households, and companies.",
    features: [
      "Everything in Pro",
      "Company & multi-budget workspaces",
      "Advanced cashflow reports",
      "Custom invoice prefix & tax fields",
      "Store & web sync ready",
      "Best for App Store / Play billing",
    ],
    limits: {
      invoicesPerMonth: Infinity,
      clients: Infinity,
      budgets: Infinity,
      estimatesPerMonth: Infinity,
      removeWatermark: true,
      familyBudgets: true,
      companyBudgets: true,
      advancedReports: true,
    },
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
