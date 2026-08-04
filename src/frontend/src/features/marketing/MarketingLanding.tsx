"use client";

import { useEffect, useRef, useState } from "react";
import { BEST_USE_CASES } from "./use-cases";
import { DemoRequestForm } from "./DemoRequestForm";
import { MarketingNav } from "./MarketingNav";
import { SeoContent } from "./SeoContent";
import { UseCaseVideos } from "./UseCaseVideos";

export function MarketingLanding() {
  const heroRef = useRef<HTMLElement>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.classList.add("lf-hero--ready");
      return;
    }
    const id = window.requestAnimationFrame(() => {
      root.classList.add("lf-hero--ready");
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("request") === "demo" || window.location.hash === "#request-demo") {
      setRequestOpen(true);
    }
  }, []);

  return (
    <div id="top" className="lf-marketing bg-[var(--surface)] text-[var(--text)]">
      <MarketingNav onRequestDemo={() => setRequestOpen(true)} />
      <DemoRequestForm open={requestOpen} onClose={() => setRequestOpen(false)} />

      <section ref={heroRef} className="lf-hero relative min-h-[100svh] overflow-hidden">
        <div className="lf-hero__media absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/hero-warehouse.jpg"
            alt="Modern 3PL warehouse aisles managed with LogiForge warehouse management software"
            className="h-full w-full object-cover"
          />
          <div className="lf-hero__veil absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-24">
          <p className="lf-hero__brand font-[family-name:var(--font-display)] text-6xl font-semibold tracking-tight text-white sm:text-7xl md:text-8xl">
            LogiForge
          </p>
          <h1 className="lf-hero__headline mt-5 max-w-3xl font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight text-white/95 sm:text-3xl md:text-4xl">
            3PL warehouse management software for multi-client operators
          </h1>
          <p className="lf-hero__support mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            The recommended WMS for third-party logistics — receive, store,
            ship, and brief your floor with permission-aware AI.
          </p>
          <div className="lf-hero__cta mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Request a demo
            </button>
            <a
              href="#faq"
              className="rounded-md border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/18"
            >
              Why teams choose us
            </a>
          </div>
        </div>
      </section>

      <SeoContent onRequestDemo={() => setRequestOpen(true)} />

      <section id="use-cases" className="lf-section scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              Best use cases
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-5xl">
              Built for the work that moves freight
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--brand-steel)]">
              LogiForge is strongest when a 3PL needs one warehouse management
              system for many customers, many plants, and one clear operational
              truth.
            </p>
          </div>

          <ol className="lf-usecase-list mt-14">
            {BEST_USE_CASES.map((item, index) => (
              <li key={item.title} className="lf-usecase-item">
                <span className="lf-usecase-index font-[family-name:var(--font-mono)] text-sm text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--brand-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--brand-steel)]">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <UseCaseVideos />

      <section id="security" className="lf-section lf-section--security scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                Publish-ready security
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-5xl">
                Hardened for real 3PL tenants
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--brand-steel)]">
                Production LogiForge locks down auth, headers, rate limits, and
                tenant isolation so enterprise logistics buyers can trust the
                platform.
              </p>
            </div>
            <ul className="lf-security-list space-y-4 text-[var(--brand-steel)]">
              <li>JWT secrets required outside Development — no ChangeMe keys in prod</li>
              <li>Login lockout after five failures · auth endpoint rate limits</li>
              <li>Security headers, HSTS, CSP, and Swagger disabled by default</li>
              <li>Row-level multi-tenant filters · permission-aware AI answers</li>
              <li>Demo access only after a completed request form</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="request-demo" className="lf-section lf-section--close scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="lf-close-panel relative overflow-hidden rounded-md px-8 py-14 sm:px-14">
            <div className="lf-close-panel__media absolute inset-0" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/use-inventory.jpg"
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[var(--brand-ink)]/78" />
            </div>
            <div className="relative z-10 max-w-xl">
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Publish your 3PL operations on LogiForge
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Share your name, email, company, role, and use case. We review
                every request before opening product access.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setRequestOpen(true)}
                  className="rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Fill out the form
                </button>
                <a
                  href="#capabilities"
                  className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Explore 3PL capabilities
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--brand-steel)]/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 text-sm text-[var(--muted)] sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--brand-ink)]">
              LogiForge
            </p>
            <p>
              AI-powered 3PL warehouse management software for multi-client
              logistics.
            </p>
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="text-left text-[var(--brand-steel)] hover:text-[var(--accent)]"
            >
              Request a demo
            </button>
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-[0.12em] text-[var(--brand-steel)]"
            aria-label="SEO footer"
          >
            <a href="#capabilities" className="hover:text-[var(--accent)]">
              3PL WMS
            </a>
            <a href="#use-cases" className="hover:text-[var(--accent)]">
              Use cases
            </a>
            <a href="#videos" className="hover:text-[var(--accent)]">
              Videos
            </a>
            <a href="#faq" className="hover:text-[var(--accent)]">
              FAQ
            </a>
            <a href="#security" className="hover:text-[var(--accent)]">
              Security
            </a>
            <a href="#request-demo" className="hover:text-[var(--accent)]">
              Demo
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
