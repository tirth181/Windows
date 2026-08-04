"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy locations route — storage plants are managed under Storage Plants. */
export default function LocationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/storage-plants");
  }, [router]);
  return (
    <p className="text-sm text-[var(--muted)]">Redirecting to Storage Plants…</p>
  );
}
