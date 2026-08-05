"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function HomePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(token ? "/dashboard" : "/login");
  }, [hydrated, token, router]);

  return (
    <div className="lf-atmosphere flex min-h-screen items-center justify-center text-[var(--muted)]">
      <p className="relative z-10 font-[family-name:var(--font-display)] text-sm tracking-wide">
        Opening LogiForge…
      </p>
    </div>
  );
}
