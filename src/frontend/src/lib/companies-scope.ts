import { DEMO_COMPANIES, DEMO_COMPANY, DEMO_WAREHOUSES } from "@/lib/mock-data";
import { loadDemoCollection } from "@/lib/demo-store";
import type { AuthUser, Company, Warehouse } from "@/types";

/** Stable warehouse ids used by inbound/outbound/inventory demo rows. */
const COMPANY_TO_WAREHOUSE: Record<string, string> = {
  "co-1": "wh-1",
  "co-2": "wh-2",
  "co-3": "wh-3",
};

function loadCompanies(): Company[] {
  return loadDemoCollection("companies", DEMO_COMPANIES);
}

function warehouseForCompany(company: Company): Warehouse {
  const warehouseId =
    COMPANY_TO_WAREHOUSE[company.id] || `wh-${company.id}`;
  const base = DEMO_WAREHOUSES.find((w) => w.id === warehouseId);
  return {
    id: warehouseId,
    code: (company.code || base?.code || "3PL").toUpperCase(),
    name: company.name,
    timezone: company.timezone || base?.timezone || "UTC",
  };
}

function findCompanyForUser(user: AuthUser | null | undefined): Company {
  const companies = loadCompanies();
  const email = (user?.email || "").toLowerCase();
  const domain = email.includes("@") ? email.split("@")[1] || "" : "";

  if (user?.companyId) {
    const byId = companies.find((c) => c.id === user.companyId);
    if (byId) return byId;
  }

  if (email) {
    const byContact = companies.find(
      (c) => (c.primaryContactEmail || "").toLowerCase() === email,
    );
    if (byContact) return byContact;

    if (domain) {
      const byDomain = companies.find((c) =>
        (c.primaryContactEmail || "").toLowerCase().endsWith(`@${domain}`),
      );
      if (byDomain) return byDomain;
    }
  }

  // Seed-tenant email heuristics (still prefer renamed records from the store)
  if (email.includes("harborline") || domain.includes("harborline")) {
    const harbor = companies.find((c) => c.id === "co-2");
    if (harbor) return harbor;
  }
  if (email.includes("summit") || domain.includes("summit")) {
    const summit = companies.find((c) => c.id === "co-3");
    if (summit) return summit;
  }

  if (user?.companyName) {
    const byName = companies.find(
      (c) => c.name.toLowerCase() === user.companyName.toLowerCase(),
    );
    if (byName) return byName;
  }

  return (
    companies.find((c) => c.id === DEMO_COMPANY.id) ||
    companies[0] ||
    DEMO_COMPANY
  );
}

/** Map a signed-in user to the single 3PL company context they operate in. */
export function resolveUserCompany(user: AuthUser | null | undefined): {
  companyId: string;
  companyName: string;
  companyCode: string;
  warehouse: Warehouse;
} {
  const company = findCompanyForUser(user);
  const warehouse = warehouseForCompany(company);
  return {
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code || warehouse.code,
    warehouse,
  };
}

/** Only the caller's 3PL company — used for receiving/shipping selectors. */
export function companiesForUser(user: AuthUser | null | undefined): Warehouse[] {
  return [resolveUserCompany(user).warehouse];
}
