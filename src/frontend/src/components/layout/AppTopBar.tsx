"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, LogOut, Menu } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function AppTopBar({ onToggleNav }: { onToggleNav?: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const warehouses = useAuthStore((s) => s.warehouses);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const setSelectedWarehouse = useAuthStore((s) => s.setSelectedWarehouse);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-[var(--brand-steel)]/10 bg-[var(--surface-raised)]/90 px-3 backdrop-blur md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleNav}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--brand-ink)] transition-colors hover:bg-[var(--surface)] md:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="hidden h-4 w-4 text-[var(--muted)] sm:block" aria-hidden />
          <label className="sr-only" htmlFor="company-select">
            3PL company
          </label>
          <select
            id="company-select"
            value={selectedWarehouseId ?? ""}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className={cn(
              "h-10 max-w-[260px] truncate rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface)] px-3 text-sm font-medium text-[var(--brand-ink)]",
              "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25",
            )}
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.code} — {wh.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-md px-2 transition-colors hover:bg-[var(--surface)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-steel)] text-xs font-semibold text-white">
            {(user?.displayName || "U")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-[var(--brand-ink)]">
              {user?.displayName || "Operator"}
            </span>
            <span className="block text-xs text-[var(--muted)]">
              {user?.roles?.[0] || "User"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--muted)]" aria-hidden />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] shadow-lg"
          >
            <div className="border-b border-[var(--brand-steel)]/10 px-3 py-2">
              <p className="truncate text-sm font-medium text-[var(--brand-ink)]">
                {user?.email}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {user?.companyName}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/5"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
