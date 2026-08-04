"use client";

import { useEffect, useState } from "react";
import { cn, formatNumber } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  suffix,
  hint,
  tone = "default",
  delayMs = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const show = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(show);
  }, [delayMs]);

  useEffect(() => {
    if (!visible) return;
    const duration = 600;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, value]);

  const toneBorder =
    tone === "warning"
      ? "border-l-[var(--warning)]"
      : tone === "danger"
        ? "border-l-[var(--danger)]"
        : tone === "success"
          ? "border-l-[var(--success)]"
          : "border-l-[var(--accent)]";

  return (
    <div
      className={cn(
        "rounded-md border border-[var(--brand-steel)]/10 bg-[var(--surface-raised)] px-4 py-3 border-l-4",
        "transition-all duration-500 ease-out",
        toneBorder,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand-ink)] tabular-nums">
        {formatNumber(display)}
        {suffix ? (
          <span className="ml-1 text-base font-medium text-[var(--muted)]">
            {suffix}
          </span>
        ) : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}
