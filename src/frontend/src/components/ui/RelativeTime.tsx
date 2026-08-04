"use client";

import { formatDistanceToNow } from "date-fns";
import { useMounted } from "@/hooks/use-mounted";

/** Relative time that only formats after mount to avoid SSR hydration mismatches. */
export function RelativeTime({
  date,
  placeholder = "…",
}: {
  date: string | Date;
  placeholder?: string;
}) {
  const mounted = useMounted();
  if (!mounted) {
    return <span suppressHydrationWarning>{placeholder}</span>;
  }
  return (
    <span>
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  );
}
