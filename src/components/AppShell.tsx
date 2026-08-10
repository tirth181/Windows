"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  ClipboardList,
  Wallet,
  Receipt,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { getPlan } from "@/lib/plans";
import { cn } from "./ui";

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/invoices", label: "Invoices", icon: FileText },
  { href: "/app/estimates", label: "Estimates", icon: ClipboardList },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/products", label: "Products", icon: Package },
  { href: "/app/budgets", label: "Budgets", icon: Wallet },
  { href: "/app/expenses", label: "Expenses", icon: Receipt },
  { href: "/app/billing", label: "Subscription", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAppStore((s) => s.logout);
  const org = useAppStore((s) => s.currentOrg());
  const user = useAppStore((s) => s.currentUser());
  const [open, setOpen] = useState(false);
  const plan = org ? getPlan(org.plan) : null;

  return (
    <div className="app-shell mx-auto grid min-h-screen max-w-7xl gap-4 p-3 md:grid-cols-[240px_1fr] md:gap-6 md:p-5">
      <aside className="app-nav surface grain h-fit p-4 md:sticky md:top-5 md:min-h-[calc(100vh-2.5rem)]">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/app" className="display text-2xl font-800 text-teal">
            Fynvo
          </Link>
          <button className="btn btn-ghost md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <div className={cn("space-y-1", !open && "hidden md:block")}>
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-650 transition",
                  active ? "bg-teal text-white" : "text-ink hover:bg-paper-2",
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
          <button
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-650 text-danger hover:bg-red-50"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
        <div className="mt-6 hidden rounded-2xl bg-paper-2 p-3 md:block">
          <p className="text-xs font-700 uppercase tracking-wide text-muted">Workspace</p>
          <p className="mt-1 font-700">{org?.name}</p>
          <p className="text-sm text-muted">{user?.email}</p>
          <p className="mt-2 text-sm font-700 text-teal">{plan?.name} plan</p>
        </div>
      </aside>
      <main className="min-w-0 pb-10">{children}</main>
    </div>
  );
}
