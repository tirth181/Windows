"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[var(--surface)]">
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0",
            navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          <div className="hidden h-full md:block">
            <AppSidebar collapsed={collapsed} />
          </div>
          <div className="h-full md:hidden">
            <AppSidebar collapsed={false} />
          </div>
        </div>

        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-[var(--brand-ink)]/40 md:hidden"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            onToggleNav={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 768) {
                setCollapsed((v) => !v);
              } else {
                setNavOpen((v) => !v);
              }
            }}
          />
          <main className="lf-app-shell flex-1 overflow-auto px-4 py-5 md:px-6 md:py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
