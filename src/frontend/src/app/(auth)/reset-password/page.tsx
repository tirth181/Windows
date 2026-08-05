"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }
    if (!token) {
      setError("Missing reset token");
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 w-full max-w-md space-y-4 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 p-6 shadow-sm"
    >
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand-ink)]">
        Choose a new password
      </h1>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? (
        <p className="text-sm text-[var(--success)]">
          {message}{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading || !!message}>
        {loading ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="lf-atmosphere relative flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<p className="relative z-10 text-[var(--muted)]">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
