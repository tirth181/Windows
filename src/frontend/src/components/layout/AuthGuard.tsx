"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { getAccessToken, setTokens } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    // Ensure rehydrate runs even if AuthProvider mount order differs
    if (!useAuthStore.persist.hasHydrated()) {
      void useAuthStore.persist.rehydrate();
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state = useAuthStore.getState();
    if (state.token && !getAccessToken()) {
      setTokens(state.token);
    }
    if (!state.token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  // Same placeholder on server and first client paint (hydrated starts false)
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] text-[var(--muted)]">
        Loading LogiForge…
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
