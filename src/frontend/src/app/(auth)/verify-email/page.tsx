"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [message, setMessage] = useState("Verifying…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage("Missing verification token.");
      return;
    }
    void (async () => {
      try {
        const result = await apiFetch<{ message: string }>("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setMessage(result.message);
        setOk(true);
      } catch (err) {
        setMessage(err instanceof ApiError ? err.detail || err.message : "Verification failed");
      }
    })();
  }, [token]);

  return (
    <div className="relative z-10 w-full max-w-md space-y-4 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 p-6 text-center shadow-sm">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand-ink)]">
        Email verification
      </h1>
      <p className={ok ? "text-[var(--success)]" : "text-[var(--brand-steel)]"}>{message}</p>
      <Link href="/login" className="inline-block text-[var(--accent)] underline-offset-2 hover:underline">
        Continue to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="lf-atmosphere relative flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<p className="relative z-10 text-[var(--muted)]">Loading…</p>}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
