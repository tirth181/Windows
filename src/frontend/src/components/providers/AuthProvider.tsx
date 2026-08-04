"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Manually rehydrate persisted auth after mount so SSR HTML matches the
 * first client render (avoids zustand persist hydration mismatches).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
