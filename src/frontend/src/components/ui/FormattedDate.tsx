"use client";

import { format } from "date-fns";
import { useMounted } from "@/hooks/use-mounted";

/** Locale/timezone-safe date display — formats only after mount. */
export function FormattedDate({
  date,
  pattern = "MMM d, HH:mm",
  placeholder = "—",
}: {
  date: string | Date;
  pattern?: string;
  placeholder?: string;
}) {
  const mounted = useMounted();
  if (!mounted) {
    return <span suppressHydrationWarning>{placeholder}</span>;
  }
  return <span>{format(new Date(date), pattern)}</span>;
}
