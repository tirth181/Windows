"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`lf-mkt-nav fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled ? "lf-mkt-nav--solid" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent)] font-[family-name:var(--font-display)] text-sm font-bold text-white"
            aria-hidden
          >
            LF
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-white">
            LogiForge
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-white/85 sm:flex">
          <a href="#use-cases" className="transition hover:text-white">
            Use cases
          </a>
          <a href="#videos" className="transition hover:text-white">
            Videos
          </a>
          <a href="#security" className="transition hover:text-white">
            Security
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-white/90 transition hover:text-white sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Open demo
          </Link>
        </div>
      </div>
    </header>
  );
}
