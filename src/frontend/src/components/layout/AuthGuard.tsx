"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { getAccessToken, setTokens } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const finish = () => {
      const state = useAuthStore.getState();
      // Re-sync access token from persisted session so API calls stay authorized
      if (state.token && !getAccessToken()) {
        setTokens(state.token);
      }
      if (!state.hydrated) state.setHydrated(true);
      setReady(true);
    };

    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return;
    }

    const unsub = useAuthStore.persist.onFinishHydration(() => {
      finish();
    });

    // Slow-path safety net only — do not race ahead of persist (that caused login↔app bounce)
    const t = window.setTimeout(() => {
      if (!useAuthStore.getState().hydrated) setHydrated(true);
      setReady(true);
    }, 1500);

    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [setHydrated]);

  useEffect(() => {
    if ((ready || hydrated) && !token) {
      router.replace("/login");
    }
  }, [ready, hydrated, token, router]);

  if (!ready && !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] text-[var(--muted)]">
        Loading LogiForge…
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
