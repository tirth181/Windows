"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/types";

const schema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  companyCode: z
    .string()
    .min(2, "Code is required")
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  displayName: z.string().min(1, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({
    companyName: "",
    companyCode: "",
    displayName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check the form");
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{
        emailVerificationRequired: boolean;
        message: string;
        session?: {
          accessToken: string;
          refreshToken?: string;
          user: AuthUser;
        };
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...parsed.data,
          companyCode: parsed.data.companyCode.toUpperCase(),
        }),
      });

      if (result.session) {
        login(
          {
            ...result.session.user,
            id: String(result.session.user.id),
            companyId: result.session.user.companyId
              ? String(result.session.user.companyId)
              : "",
            companyName:
              result.session.user.companyName || parsed.data.companyName,
            roles: result.session.user.roles || ["CompanyAdmin"],
            permissions: result.session.user.permissions || [],
          },
          result.session.accessToken,
          result.session.refreshToken,
        );
        router.replace("/billing");
        return;
      }

      setMessage(result.message || "Check your email to verify your account.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="lf-atmosphere relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--brand-ink)]">
            LogiForge
          </p>
          <h1 className="mt-3 text-xl text-[var(--brand-steel)]">
            Start your 14-day free trial
          </h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 p-6 shadow-sm backdrop-blur"
        >
          <Input
            label="Company name"
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Harborline Logistics"
          />
          <Input
            label="Company code"
            value={form.companyCode}
            onChange={(e) => set("companyCode", e.target.value.toUpperCase())}
            placeholder="HARBOR"
          />
          <Input
            label="Your name"
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="Alex Admin"
          />
          <Input
            label="Work email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@company.com"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="At least 12 characters"
          />
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-[var(--success)]" role="status">
              {message}{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading || !!message}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-[var(--brand-steel)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--accent)] underline-offset-2 hover:underline">
              Sign in
            </Link>
            {" · "}
            <Link href="/pricing" className="underline-offset-2 hover:underline">
              Pricing
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
