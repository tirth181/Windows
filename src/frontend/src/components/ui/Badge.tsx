import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "steel";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--surface)] text-[var(--brand-ink)] border-[var(--brand-steel)]/15",
  accent: "bg-[var(--accent)]/12 text-[#92400e] border-[var(--accent)]/30",
  success: "bg-[var(--success)]/12 text-[var(--success)] border-[var(--success)]/30",
  warning: "bg-[var(--warning)]/12 text-[var(--warning)] border-[var(--warning)]/30",
  danger: "bg-[var(--danger)]/12 text-[var(--danger)] border-[var(--danger)]/30",
  steel: "bg-[var(--brand-steel)]/10 text-[var(--brand-steel)] border-[var(--brand-steel)]/25",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
