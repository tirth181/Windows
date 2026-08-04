"use client";

import { useEffect, useState } from "react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_COMPANY, DEMO_WAREHOUSES } from "@/lib/mock-data";
import type { Company } from "@/types";
import {
  Button,
  DemoBanner,
  Input,
  PageHeader,
  StatusBadge,
} from "@/components/ui";

export default function CompanyPage() {
  const [company, setCompany] = useState<Company>(DEMO_COMPANY);
  const [demo, setDemo] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<Company>(
        `/companies/${DEMO_COMPANY.id}`,
        DEMO_COMPANY,
      );
      if (cancelled) return;
      setCompany(result.data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company"
        description="Tenant profile, legal identity, and warehouse footprint."
        actions={
          <Button
            onClick={async () => {
              setSaved(false);
              await new Promise((r) => setTimeout(r, 400));
              setSaved(true);
            }}
          >
            Save changes
          </Button>
        }
      />
      <DemoBanner show={demo} />
      {saved ? (
        <p className="text-sm text-[var(--success)]" role="status">
          Company profile saved (demo).
        </p>
      ) : null}

      <div className="grid max-w-2xl gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={company.status} />
          <span className="text-sm text-[var(--muted)]">Tenant status</span>
        </div>
        <Input
          label="Display name"
          value={company.name}
          onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
        />
        <Input
          label="Legal name"
          value={company.legalName || ""}
          onChange={(e) =>
            setCompany((c) => ({ ...c, legalName: e.target.value }))
          }
        />
        <Input
          label="Primary contact email"
          type="email"
          value={company.primaryContactEmail || ""}
          onChange={(e) =>
            setCompany((c) => ({ ...c, primaryContactEmail: e.target.value }))
          }
        />
        <Input
          label="Timezone"
          value={company.timezone}
          onChange={(e) =>
            setCompany((c) => ({ ...c, timezone: e.target.value }))
          }
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-ink)]">
          Warehouses
        </h2>
        <ul className="divide-y divide-[var(--brand-steel)]/10 border-y border-[var(--brand-steel)]/10">
          {DEMO_WAREHOUSES.map((wh) => (
            <li
              key={wh.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--brand-ink)]">
                  <span className="font-[family-name:var(--font-mono)] text-[var(--brand-steel)]">
                    {wh.code}
                  </span>{" "}
                  — {wh.name}
                </p>
                <p className="text-xs text-[var(--muted)]">{wh.timezone}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
