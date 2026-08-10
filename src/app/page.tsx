import Link from "next/link";
import { ArrowRight, Check, Smartphone, Globe2, ShieldCheck } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { money } from "@/lib/format";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="display text-2xl font-800 text-teal">Fynvo</div>
        <nav className="flex items-center gap-2 md:gap-3">
          <Link href="/pricing" className="btn btn-ghost hidden sm:inline-flex">
            Pricing
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Start free
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="fade-up relative z-10">
          <p className="display mb-3 text-5xl font-800 leading-none text-teal md:text-7xl">Fynvo</p>
          <h1 className="display max-w-xl text-3xl font-700 leading-tight md:text-5xl">
            Invoices that get paid. Budgets that keep you honest.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted">
            An original invoicing and budgeting workspace for individuals, families, and companies —
            on web today, App Store and Play Store ready.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link href="/demo" className="btn btn-secondary">
              Try demo workspace
            </Link>
          </div>
        </div>

        <div className="fade-up-delay relative">
          <div className="surface float-soft grain relative overflow-hidden p-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(145deg, rgba(15,110,86,0.92) 0%, rgba(10,79,61,0.88) 45%, rgba(194,100,1,0.55) 100%), url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22%3E%3Crect fill=%22%230f6e56%22 width=%22800%22 height=%22600%22/%3E%3Ccircle cx=%22620%22 cy=%22120%22 r=%22180%22 fill=%22%23c26401%22 opacity=%220.35%22/%3E%3Ccircle cx=%22120%22 cy=%22480%22 r=%22220%22 fill=%22%23ffffff%22 opacity=%220.08%22/%3E%3C/svg%3E') center/cover",
              }}
            />
            <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-7 text-white md:min-h-[520px] md:p-9">
              <div>
                <p className="text-sm font-700 uppercase tracking-[0.18em] text-white/70">Live preview</p>
                <p className="display mt-3 text-4xl font-800">NV-1001</p>
                <p className="mt-1 text-white/80">Brightco · Due in 14 days</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                  <p className="text-sm text-white/70">Outstanding</p>
                  <p className="display text-3xl font-800">$4,200</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                  <p className="text-sm text-white/70">Budget left</p>
                  <p className="display text-3xl font-800">$1,350</p>
                </div>
              </div>
              <p className="max-w-sm text-sm text-white/75">
                Bill clients, track spending, and run personal, family, or company budgets in one
                subscription.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="display text-3xl font-800 md:text-4xl">One job: get paid and stay on budget</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Built from scratch — original brand, original UI, original code. No Zoho trademarks, assets,
          or copied interface.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Professional invoices",
              body: "Clients, line items, tax, discounts, status tracking, and clean PDF export.",
            },
            {
              title: "Personal to company budgets",
              body: "Plan income and categories for yourself, your household, or your business.",
            },
            {
              title: "Subscription revenue ready",
              body: "Starter, Pro, and Business tiers with feature gates designed for Stripe & store billing.",
            },
          ].map((item) => (
            <div key={item.title} className="surface p-6">
              <h3 className="display text-xl font-700">{item.title}</h3>
              <p className="mt-2 text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="surface grain grid gap-6 p-8 md:grid-cols-3">
          {[
            { icon: Globe2, title: "Web app", body: "Works in any modern browser. PWA installable." },
            { icon: Smartphone, title: "Stores next", body: "Capacitor/Expo packaging path for iOS & Android." },
            { icon: ShieldCheck, title: "Your brand", body: "Fynvo is an independent product name and design." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <item.icon className="mt-1 text-teal" size={22} />
              <div>
                <h3 className="font-750">{item.title}</h3>
                <p className="text-sm text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="display text-3xl font-800">Simple paid plans</h2>
            <p className="mt-2 text-muted">People pay to use Fynvo. You keep the subscription revenue.</p>
          </div>
          <Link href="/pricing" className="btn btn-secondary">
            Compare plans
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`surface p-6 ${plan.id === "pro" ? "ring-2 ring-teal" : ""}`}
            >
              <p className="text-sm font-700 uppercase tracking-wide text-muted">{plan.name}</p>
              <p className="display mt-2 text-4xl font-800">
                {plan.priceMonthly === 0 ? "Free" : money(plan.priceMonthly)}
                {plan.priceMonthly > 0 ? <span className="text-base font-600 text-muted">/mo</span> : null}
              </p>
              <p className="mt-2 text-sm text-muted">{plan.tagline}</p>
              <ul className="mt-5 space-y-2">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-teal" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`btn mt-6 w-full ${plan.id === "pro" ? "btn-primary" : "btn-secondary"}`}>
                {plan.priceMonthly === 0 ? "Start free" : "Choose plan"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p className="display text-lg font-800 text-ink">Fynvo</p>
        <p>© {new Date().getFullYear()} Fynvo. Independent product. Not affiliated with Zoho or any third-party invoice brand.</p>
      </footer>
    </div>
  );
}
