"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Locations module replaced by 3PL Companies. */
export default function LocationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/companies");
  }, [router]);
  return <p className="text-sm text-[var(--muted)]">Redirecting to 3PL Companies…</p>;
}
