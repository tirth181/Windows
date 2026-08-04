import { DEMO_COMPANY, DEMO_WAREHOUSES } from "@/lib/mock-data";
import type { AuthUser, Warehouse } from "@/types";

/** Map a signed-in user to the single 3PL company context they operate in. */
export function resolveUserCompany(user: AuthUser | null | undefined): {
  companyId: string;
  companyName: string;
  companyCode: string;
  warehouse: Warehouse;
} {
  const email = (user?.email || "").toLowerCase();
  const nameHint = (user?.companyName || "").toLowerCase();

  if (email.includes("harborline") || nameHint.includes("harborline")) {
    const warehouse =
      DEMO_WAREHOUSES.find((w) => w.code === "HARBOR") || DEMO_WAREHOUSES[1]!;
    return {
      companyId: "co-2",
      companyName: "Harborline Logistics",
      companyCode: "HARBOR",
      warehouse,
    };
  }

  if (email.includes("summit") || nameHint.includes("summit")) {
    const warehouse =
      DEMO_WAREHOUSES.find((w) => w.code === "SUMMIT") || DEMO_WAREHOUSES[2]!;
    return {
      companyId: "co-3",
      companyName: "Summit Freight Partners",
      companyCode: "SUMMIT",
      warehouse,
    };
  }

  // Default tenant / LogiForge demo
  const warehouse =
    DEMO_WAREHOUSES.find((w) => w.code === "LOGIFORGE") || DEMO_WAREHOUSES[0]!;
  return {
    companyId: user?.companyId || DEMO_COMPANY.id,
    companyName: user?.companyName || DEMO_COMPANY.name,
    companyCode: warehouse.code,
    warehouse,
  };
}

/** Only the caller's 3PL company — used for receiving/shipping selectors. */
export function companiesForUser(user: AuthUser | null | undefined): Warehouse[] {
  return [resolveUserCompany(user).warehouse];
}
