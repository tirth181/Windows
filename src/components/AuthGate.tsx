"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useHasHydrated } from "@/lib/hydrate";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionUserId) router.replace("/login");
  }, [hydrated, sessionUserId, router]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        Loading your workspace…
      </div>
    );
  }

  if (!sessionUserId) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
