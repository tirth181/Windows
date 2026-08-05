"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { getAccessToken, setTokens } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const companyStatus = useAuthStore((s) => s.user?.companyStatus);

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
      return;
    }
    if (
      state.user?.companyStatus === "Suspended" &&
      pathname &&
      !pathname.startsWith("/billing") &&
      !pathname.startsWith("/settings")
    ) {
      router.replace("/billing");
    }
  }, [hydrated, token, router, pathname, companyStatus]);

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
