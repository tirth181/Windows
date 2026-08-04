import { apiFetch } from "@/lib/api";
import { DEMO_CUSTOMERS } from "@/lib/mock-data";
import { loadDemoCollection, upsertDemoItem } from "@/lib/demo-store";
import type { Customer } from "@/types";

/** Known customers: demo seeds + any previously typed/saved names. */
export function loadKnownCustomers(): Customer[] {
  return loadDemoCollection("customers", DEMO_CUSTOMERS);
}

function makeCode(name: string): string {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8) || "CUST";
  return `${base}-${Math.floor(Math.random() * 90 + 10)}`;
}

/**
 * Resolve a typed customer name to an existing record, or create and remember
 * a new one for future outbound suggestions.
 */
export async function resolveOrRememberCustomer(
  typedName: string,
): Promise<Customer> {
  const name = typedName.trim();
  if (!name) {
    throw new Error("Customer name is required.");
  }

  const known = loadKnownCustomers();
  const existing = known.find(
    (c) =>
      c.name.toLowerCase() === name.toLowerCase() ||
      c.code.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    if (!existing.isActive) {
      const reactivated = { ...existing, isActive: true };
      upsertDemoItem("customers", DEMO_CUSTOMERS, reactivated);
      return reactivated;
    }
    return existing;
  }

  const created: Customer = {
    id: crypto.randomUUID(),
    code: makeCode(name),
    name,
    isActive: true,
  };

  try {
    const saved = await apiFetch<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify({
        code: created.code,
        name: created.name,
        isActive: true,
      }),
    });
    const record: Customer = {
      id: String(saved.id || created.id),
      code: saved.code || created.code,
      name: saved.name || created.name,
      contactEmail: saved.contactEmail,
      contactPhone: saved.contactPhone,
      isActive: saved.isActive !== false,
    };
    upsertDemoItem("customers", DEMO_CUSTOMERS, record);
    return record;
  } catch {
    upsertDemoItem("customers", DEMO_CUSTOMERS, created);
    return created;
  }
}
