"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";

const schema = z.object({ email: z.string().email() });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lf-atmosphere relative flex min-h-screen items-center justify-center px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md space-y-4 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 p-6 shadow-sm"
      >
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand-ink)]">
          Reset password
        </h1>
        <p className="text-sm text-[var(--brand-steel)]">
          We&apos;ll email a link if an account exists for that address.
        </p>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading || !!message}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
        <Link href="/login" className="block text-center text-sm text-[var(--accent)]">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
