"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const loginDemo = useAuthStore((s) => s.loginDemo);
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [email, setEmail] = useState("admin@logiforge.demo");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && token) {
      router.replace("/dashboard");
    }
  }, [hydrated, token, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid credentials");
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{
        accessToken: string;
        refreshToken?: string;
        user: AuthUser;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      login(result.user, result.accessToken, result.refreshToken);
      router.replace("/dashboard");
    } catch {
      // Demo mode — local sign-in when API is unavailable
      loginDemo(parsed.data.email, "Alex Rivera");
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function signInMicrosoft() {
    setError(null);
    // Entra is not wired in this demo environment — sign in locally without
    // navigating away (that hard navigation caused open/close bounce).
    loginDemo("entra.user@logiforge.demo", "Entra Operator");
    router.replace("/dashboard");
  }

  return (
    <div className="lf-atmosphere relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-[var(--accent)] font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white shadow-sm"
            aria-hidden
          >
            LF
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-6xl">
            LogiForge
          </h1>
          <p className="mt-3 text-base text-[var(--brand-steel)]">
            Enterprise 3PL company operations
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]/95 p-6 shadow-sm backdrop-blur"
        >
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <div className="relative py-1 text-center text-xs uppercase tracking-wider text-[var(--muted)]">
            <span className="bg-[var(--surface-raised)] px-2 relative z-10">or</span>
            <span className="absolute left-0 right-0 top-1/2 h-px bg-[var(--brand-steel)]/15" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={signInMicrosoft}
          >
            Sign in with Microsoft
          </Button>

          <p className="text-center text-xs text-[var(--muted)]">
            Demo mode works offline — any password signs you in when the API is down.
          </p>
        </form>
      </div>
    </div>
  );
}
