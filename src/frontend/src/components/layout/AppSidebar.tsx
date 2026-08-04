"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackagePlus,
  Boxes,
  Truck,
  FileBarChart2,
  Users,
  MapPin,
  UserCog,
  Building2,
  Bot,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface NavItem {
  href: string;
  label: string;
  permission: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard.view", icon: LayoutDashboard },
  { href: "/inbound", label: "Inbound", permission: "inbound.view", icon: PackagePlus },
  { href: "/inventory", label: "Inventory", permission: "inventory.view", icon: Boxes },
  { href: "/outbound", label: "Outbound", permission: "outbound.view", icon: Truck },
  { href: "/reports", label: "Reports", permission: "reports.view", icon: FileBarChart2 },
  { href: "/customers", label: "Customers", permission: "customers.view", icon: Users },
  { href: "/locations", label: "Locations", permission: "locations.view", icon: MapPin },
  { href: "/users", label: "Users", permission: "users.view", icon: UserCog },
  { href: "/company", label: "Company", permission: "company.view", icon: Building2 },
  { href: "/ai", label: "AI Assistant", permission: "ai.use", icon: Bot },
  { href: "/integrations", label: "Integrations", permission: "integrations.manage", icon: Plug },
  { href: "/settings", label: "Settings", permission: "settings.manage", icon: Settings },
];

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/10 bg-[var(--brand-ink)] text-white",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-white"
          aria-hidden
        >
          LF
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight tracking-tight">
              LogiForge
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">
              WMS
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4" aria-label="Main">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                "transition-colors duration-200",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
                collapsed && "justify-center px-2",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r bg-[var(--accent)]",
                  "transition-all duration-300 ease-out",
                  active ? "h-6 opacity-100" : "opacity-0 group-hover:h-3 group-hover:opacity-40",
                )}
                aria-hidden
              />
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
