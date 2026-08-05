"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import { allowDemoFallback } from "@/lib/demo-mode";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type ApiUser = AuthUser & {
  companyStatus?: string;
  planCode?: string;
  trialEndsAt?: string | null;
  emailVerified?: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const loginDemo = useAuthStore((s) => s.loginDemo);
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const demoOk = allowDemoFallback();

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
        user: ApiUser & {
          warehouses?: { id: string; code: string; name: string }[];
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      login(
        {
          ...result.user,
          id: String(result.user.id),
          companyId: result.user.companyId ? String(result.user.companyId) : "",
          companyName: result.user.companyName || "",
          roles: result.user.roles || ["CompanyAdmin"],
          permissions: result.user.permissions || [],
        },
        result.accessToken,
        result.refreshToken,
        (result.user.warehouses || []).map((w) => ({
          id: String(w.id),
          code: w.code,
          name: w.name,
        })),
      );
      const status = result.user.companyStatus;
      router.replace(status === "Suspended" ? "/billing" : "/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.message);
        if (!demoOk) {
          setLoading(false);
          return;
        }
      }
      if (demoOk) {
        loginDemo(parsed.data.email, "Alex Rivera");
        router.replace("/dashboard");
      } else {
        setError(
          err instanceof ApiError
            ? err.detail || err.message
            : "Unable to sign in. Check your connection and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function signInMicrosoft() {
    setError(null);
    if (!demoOk) {
      setError("Microsoft sign-in is not configured for this environment yet.");
      return;
    }
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
            Sign in to your 3PL operations workspace
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
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--brand-steel)] underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          {demoOk ? (
            <>
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
                Dev mode: offline demo sign-in is enabled when the API is down.
              </p>
            </>
          ) : null}

          <p className="text-center text-sm text-[var(--brand-steel)]">
            New to LogiForge?{" "}
            <Link href="/signup" className="font-medium text-[var(--accent)] underline-offset-2 hover:underline">
              Start a free trial
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
