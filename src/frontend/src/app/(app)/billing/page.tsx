"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, PageHeader } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface Plan {
  code: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  available: boolean;
}

interface BillingStatus {
  companyStatus: string;
  planCode: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  billingEmail?: string | null;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  plans: Plan[];
}

function formatMoney(cents: number) {
  if (!cents) return "Custom";
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function BillingInner() {
  const params = useSearchParams();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const checkoutFlag = params.get("checkout");

  async function load() {
    try {
      const data = await apiFetch<BillingStatus>("/billing/status");
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Unable to load billing");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startCheckout(planCode: string) {
    setBusy(planCode);
    setError(null);
    try {
      const result = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planCode }),
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Checkout failed");
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    try {
      const result = await apiFetch<{ url: string }>("/billing/portal", {
        method: "POST",
        body: JSON.stringify({}),
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Portal failed");
      setBusy(null);
    }
  }

  const canManage = hasPermission("settings.manage") || hasPermission("admin.full");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Trial status, subscription plan, and Stripe customer portal."
      />

      {checkoutFlag === "success" ? (
        <p className="text-sm text-[var(--success)]" role="status">
          Checkout completed. Subscription status updates when Stripe confirms the webhook.
        </p>
      ) : null}
      {checkoutFlag === "cancel" ? (
        <p className="text-sm text-[var(--muted)]">Checkout canceled — you can try again anytime.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {!status ? (
        <p className="text-sm text-[var(--muted)]">Loading billing…</p>
      ) : (
        <>
          <section className="max-w-2xl space-y-2 text-sm">
            <p>
              <span className="text-[var(--muted)]">Status:</span>{" "}
              <strong>{status.companyStatus}</strong>
            </p>
            <p>
              <span className="text-[var(--muted)]">Plan:</span> {status.planCode}
            </p>
            {status.trialEndsAt ? (
              <p>
                <span className="text-[var(--muted)]">Trial ends:</span>{" "}
                {new Date(status.trialEndsAt).toLocaleString()}
              </p>
            ) : null}
            {status.currentPeriodEnd ? (
              <p>
                <span className="text-[var(--muted)]">Current period ends:</span>{" "}
                {new Date(status.currentPeriodEnd).toLocaleString()}
              </p>
            ) : null}
            {status.billingEmail ? (
              <p>
                <span className="text-[var(--muted)]">Billing email:</span> {status.billingEmail}
              </p>
            ) : null}
            {!status.stripeConfigured ? (
              <p className="text-[var(--muted)]">
                Stripe keys are not configured on this environment. Trial access still works; paid
                checkout will activate once <code>Stripe__SecretKey</code> and price IDs are set.
              </p>
            ) : null}
          </section>

          {canManage ? (
            <section className="grid max-w-3xl gap-4 md:grid-cols-3">
              {status.plans.map((plan) => (
                <div
                  key={plan.code}
                  className="border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] p-4"
                >
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-lg">{formatMoney(plan.priceMonthlyCents)}</p>
                  <p className="mt-2 text-sm text-[var(--brand-steel)]">{plan.description}</p>
                  {plan.available ? (
                    <Button
                      className="mt-4 w-full"
                      disabled={!!busy}
                      onClick={() => void startCheckout(plan.code)}
                    >
                      {busy === plan.code ? "Redirecting…" : "Subscribe"}
                    </Button>
                  ) : (
                    <p className="mt-4 text-xs text-[var(--muted)]">
                      {plan.code === "scale"
                        ? "Contact sales for Scale."
                        : "Plan price not configured."}
                    </p>
                  )}
                </div>
              ))}
            </section>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Ask a company administrator to manage billing.
            </p>
          )}

          {canManage && status.hasStripeCustomer ? (
            <Button variant="outline" disabled={!!busy} onClick={() => void openPortal()}>
              {busy === "portal" ? "Opening…" : "Open Stripe customer portal"}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading billing…</p>}>
      <BillingInner />
    </Suspense>
  );
}
