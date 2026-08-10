import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { money } from "@/lib/format";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="display text-2xl font-800 text-teal">
          Fynvo
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Start free
        </Link>
      </header>
      <h1 className="display text-4xl font-800 md:text-5xl">Subscription pricing</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Charge customers monthly or yearly. Hook these tiers to Stripe on web and StoreKit / Google Play Billing on mobile.
      </p>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`surface p-7 ${plan.id === "pro" ? "ring-2 ring-teal" : ""}`}>
            <p className="text-sm font-700 uppercase tracking-wide text-muted">{plan.name}</p>
            <p className="display mt-3 text-4xl font-800">
              {plan.priceMonthly === 0 ? "$0" : money(plan.priceMonthly)}
              <span className="text-base font-600 text-muted"> / month</span>
            </p>
            {plan.priceYearly > 0 ? (
              <p className="mt-1 text-sm text-muted">or {money(plan.priceYearly)} / year</p>
            ) : null}
            <p className="mt-3 text-muted">{plan.tagline}</p>
            <ul className="mt-6 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-teal" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={`btn mt-7 w-full ${plan.id === "business" ? "btn-amber" : plan.id === "pro" ? "btn-primary" : "btn-secondary"}`}
            >
              Get {plan.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
