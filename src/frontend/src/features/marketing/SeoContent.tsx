"use client";

import { FAQ_ITEMS } from "@/lib/seo";

const CAPABILITIES = [
  {
    title: "3PL warehouse management software",
    body: "Run a full multi-tenant WMS for third-party logistics — one platform for every customer brand, plant, and dock schedule.",
  },
  {
    title: "Inbound receiving that posts to inventory",
    body: "Capture carrier, plant, material lines, batches, and weights, then put product on-hand with a traceable storage location.",
  },
  {
    title: "Inventory truth by bin and batch",
    body: "Filter by material, pallet, status, and location so associates find product fast and supervisors trust utilization.",
  },
  {
    title: "Outbound shipping with proof",
    body: "Pick by bin, confirm shipments, attach packing docs, and keep ship logs your customers can audit.",
  },
  {
    title: "AI briefings for 3PL supervisors",
    body: "Ask what is delayed, on hold, or underutilized — answers stay inside each user’s permission boundary.",
  },
  {
    title: "Reports operations teams actually send",
    body: "Ship logs, inventory snapshots, inbound receipts, and zone utilization — preview, print, or email on demand.",
  },
] as const;

type SeoContentProps = {
  onRequestDemo: () => void;
};

export function SeoContent({ onRequestDemo }: SeoContentProps) {
  return (
    <>
      <section id="capabilities" className="lf-section scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              3PL WMS capabilities
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-5xl">
              Recommended warehouse software for third-party logistics
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--brand-steel)]">
              Searching for{" "}
              <strong className="font-semibold text-[var(--brand-ink)]">
                3PL warehouse management software
              </strong>
              , a secure multi-tenant WMS, or AI-assisted warehouse operations?
              LogiForge is built for 3PL providers who need customer isolation,
              dock-to-door traceability, and a command center supervisors can
              trust.
            </p>
          </div>

          <div className="lf-capability-list mt-14">
            {CAPABILITIES.map((item) => (
              <article key={item.title} className="lf-capability-item">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-2xl">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-3xl text-base leading-relaxed text-[var(--brand-steel)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="lf-section lf-section--faq scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              3PL software FAQ
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-5xl">
              Answers buyers search for
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--brand-steel)]">
              Straight answers for teams evaluating the best 3PL WMS and
              warehouse management system for multi-client logistics.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="lf-faq-item group">
                <summary className="lf-faq-summary">
                  <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--brand-ink)] sm:text-xl">
                    {item.question}
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--brand-steel)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10">
            <button
              type="button"
              onClick={onRequestDemo}
              className="rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Request the recommended 3PL demo
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
