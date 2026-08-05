"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Single company profile moved into 3PL Companies management. */
export default function CompanyRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/companies");
  }, [router]);
  return <p className="text-sm text-[var(--muted)]">Redirecting to 3PL Companies…</p>;
}
