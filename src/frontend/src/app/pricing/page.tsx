"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

const PLANS = [
  {
    code: "starter",
    name: "Starter",
    price: "$299",
    blurb: "Core WMS for a focused 3PL operation.",
    points: ["Up to 2 warehouses", "Inbound · inventory · outbound", "Email support"],
  },
  {
    code: "growth",
    name: "Growth",
    price: "$799",
    blurb: "Multi-site ops with reporting and integrations.",
    points: ["Multi-warehouse", "Ship log & exports", "Integrations · priority support"],
    featured: true,
  },
  {
    code: "scale",
    name: "Scale",
    price: "Custom",
    blurb: "High volume, SSO, and dedicated success.",
    points: ["Custom volume", "SSO / Entra", "Dedicated success"],
  },
];

export default function PricingPage() {
  return (
    <div className="lf-atmosphere relative min-h-screen px-4 py-14">
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-12 text-center">
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--brand-ink)]">
            LogiForge
          </p>
          <h1 className="mt-4 text-2xl text-[var(--brand-steel)]">
            Simple plans for serious 3PL warehouses
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)]">
            Every plan starts with a 14-day free trial. No card required to explore.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.code}
              className={
                plan.featured
                  ? "border border-[var(--accent)]/40 bg-[var(--surface-raised)]/95 p-6 shadow-sm"
                  : "border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/90 p-6"
              }
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand-ink)]">
                {plan.name}
              </h2>
              <p className="mt-2 text-3xl font-semibold text-[var(--brand-ink)]">
                {plan.price}
                {plan.price.startsWith("$") ? (
                  <span className="text-sm font-normal text-[var(--muted)]"> / mo</span>
                ) : null}
              </p>
              <p className="mt-3 text-sm text-[var(--brand-steel)]">{plan.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--brand-ink)]">
                {plan.points.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button className="w-full" variant={plan.featured ? "primary" : "outline"}>
                  {plan.code === "scale" ? "Start trial · talk later" : "Start free trial"}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-[var(--brand-steel)]">
          Already subscribed?{" "}
          <Link href="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
