"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

function useHasHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useAppStore.persist.onFinishHydration(onStoreChange),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sessionUserId = useAppStore((s) => s.sessionUserId);
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionUserId) router.replace("/login");
  }, [hydrated, sessionUserId, router]);

  if (!hydrated || !sessionUserId) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        Loading your workspace…
      </div>
    );
  }

  return <>{children}</>;
}
