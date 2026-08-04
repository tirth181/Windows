"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bot,
  PackagePlus,
  Truck,
  Boxes,
} from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import {
  DEMO_ACTIVITY,
  DEMO_AI_INSIGHTS,
  DEMO_DASHBOARD,
} from "@/lib/mock-data";
import type { ActivityItem, AiInsight, DashboardSummary } from "@/types";
import { DemoBanner, KpiTile, PageHeader, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const [summary, setSummary] = useState<DashboardSummary>(DEMO_DASHBOARD);
  const [activity, setActivity] = useState<ActivityItem[]>(DEMO_ACTIVITY);
  const [insights, setInsights] = useState<AiInsight[]>(DEMO_AI_INSIGHTS);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, a, i] = await Promise.all([
        apiFetchOrDemo<DashboardSummary>("/dashboard/summary", DEMO_DASHBOARD),
        apiFetchOrDemo<ActivityItem[]>("/dashboard/activity", DEMO_ACTIVITY),
        apiFetchOrDemo<AiInsight[]>("/dashboard/ai-insights", DEMO_AI_INSIGHTS),
      ]);
      if (cancelled) return;
      setSummary(s.data);
      setActivity(a.data);
      setInsights(i.data);
      setDemo(s.demo || a.demo || i.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${weekday} operations`}
        description="Live warehouse pulse — inbound, on-hand, and outbound readiness."
      />
      <DemoBanner show={demo} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Today inbound" value={summary.todayInbound} delayMs={0} />
        <KpiTile label="Today shipments" value={summary.todayShipments} delayMs={80} />
        <KpiTile label="On hand" value={summary.onHand} delayMs={160} />
        <KpiTile
          label="Utilization"
          value={summary.utilizationPct}
          suffix="%"
          delayMs={240}
          tone="success"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Partial" value={summary.partial} tone="warning" delayMs={300} />
        <KpiTile label="On hold" value={summary.onHold} tone="danger" delayMs={360} />
        <KpiTile label="Delayed" value={summary.delayed} tone="warning" delayMs={420} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-ink)]">
              AI insights
            </h2>
          </div>
          <ul className="space-y-3">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="border-l-4 border-[var(--brand-steel)]/20 pl-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--brand-ink)]">
                    {insight.title}
                  </p>
                  <Badge
                    tone={
                      insight.severity === "warning"
                        ? "warning"
                        : insight.severity === "success"
                          ? "success"
                          : "steel"
                    }
                  >
                    {insight.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{insight.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-ink)]">
            Quick actions
          </h2>
          <div className="grid gap-2">
            {[
              { href: "/inbound/new", label: "Receive inbound", icon: PackagePlus },
              { href: "/outbound/new", label: "Create shipment", icon: Truck },
              { href: "/inventory", label: "Search inventory", icon: Boxes },
              { href: "/ai", label: "Ask AI assistant", icon: Bot },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "group flex items-center justify-between rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] px-4 py-3",
                    "transition-all duration-200 hover:border-[var(--accent)]/50 hover:shadow-sm",
                  )}
                >
                  <span className="inline-flex items-center gap-3 text-sm font-medium text-[var(--brand-ink)]">
                    <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-ink)]">
          Recent activity
        </h2>
        <ul className="divide-y divide-[var(--brand-steel)]/10 border-y border-[var(--brand-steel)]/10">
          {activity.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[var(--brand-ink)]">
                  {item.action}{" "}
                  <span className="font-[family-name:var(--font-mono)] text-[var(--brand-steel)]">
                    {item.entityRef}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {item.actor} · {item.entityType}
                </p>
              </div>
              <time className="text-xs text-[var(--muted)] tabular-nums">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
