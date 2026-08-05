"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";

function AccessForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/login";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/preview-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error || "Invalid access code.");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/login");
    } catch {
      setError("Could not verify access code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
      <Input
        label="Access code"
        type="password"
        autoComplete="off"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter preview access code"
      />
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
        {loading ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

export default function AccessGatePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d9e6f2_0%,_#f4f7fb_45%,_#e8eef5_100%)]"
      />
      <div className="relative w-full max-w-md rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 p-6 shadow-sm backdrop-blur">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--brand-ink)]">
          LogiForge
        </p>
        <h1 className="mt-2 text-lg font-semibold text-[var(--brand-ink)]">
          Private preview access
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          This environment is gated for employee feedback. Enter the shared
          preview access code before signing in.
        </p>
        <Suspense fallback={<p className="mt-5 text-sm text-[var(--muted)]">Loading…</p>}>
          <AccessForm />
        </Suspense>
      </div>
    </main>
  );
}
