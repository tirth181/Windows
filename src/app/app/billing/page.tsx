"use client";

import { Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PLANS, getPlan } from "@/lib/plans";
import type { PlanId } from "@/lib/types";
import { money } from "@/lib/format";
import { Alert, Button, PageHeader } from "@/components/ui";
import { useState } from "react";

export default function BillingPage() {
  const org = useAppStore((s) => s.currentOrg());
  const setPlan = useAppStore((s) => s.setPlan);
  const [message, setMessage] = useState("");
  const current = org ? getPlan(org.plan) : null;

  function upgrade(planId: PlanId) {
    setPlan(planId);
    setMessage(
      planId === "free"
        ? "Switched to Starter. Limits now apply."
        : `Subscribed to ${getPlan(planId).name}. In production, charge via Stripe / App Store / Play Billing here.`,
    );
  }

  return (
    <div>
      <PageHeader
        title="Subscription"
        subtitle="This is your monetization surface. Wire Stripe Checkout (web) and native IAP (stores) to these plan IDs."
      />
      {message ? (
        <div className="mb-4">
          <Alert>{message}</Alert>
        </div>
      ) : null}
      <div className="mb-6 surface p-5">
        <p className="text-sm font-700 uppercase tracking-wide text-muted">Current plan</p>
        <p className="display mt-1 text-3xl font-800">{current?.name}</p>
        <p className="text-muted">{current?.tagline}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const active = org?.plan === plan.id;
          return (
            <div key={plan.id} className={`surface p-6 ${active ? "ring-2 ring-teal" : ""}`}>
              <p className="text-sm font-700 uppercase tracking-wide text-muted">{plan.name}</p>
              <p className="display mt-2 text-4xl font-800">
                {plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}
                {plan.priceMonthly > 0 ? <span className="text-base text-muted">/mo</span> : null}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-teal" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={active ? "secondary" : plan.id === "business" ? "amber" : "primary"}
                disabled={active}
                onClick={() => upgrade(plan.id)}
              >
                {active ? "Current plan" : plan.priceMonthly === 0 ? "Downgrade" : "Subscribe"}
              </Button>
            </div>
          );
        })}
      </div>
      <div className="surface mt-6 p-5 text-sm text-muted">
        <p className="font-700 text-ink">Production billing checklist</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Web: Stripe Checkout + Customer Portal for plan `{`free|pro|business`}`</li>
          <li>iOS: StoreKit 2 subscriptions with the same entitlement names</li>
          <li>Android: Google Play Billing subscriptions mirrored to your backend</li>
          <li>Keep server as source of truth for plan entitlements before store launch</li>
        </ul>
      </div>
    </div>
  );
}
