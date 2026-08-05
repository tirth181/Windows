import { Info } from "lucide-react";

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--brand-steel)]/5 px-3 py-2 text-sm text-[var(--brand-steel)]">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        Showing demo data — API at{" "}
        <code className="font-[family-name:var(--font-mono)] text-xs">
          {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080/api/v1"}
        </code>{" "}
        is unavailable.
      </p>
    </div>
  );
}
