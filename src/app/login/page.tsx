"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHasHydrated } from "@/lib/hydrate";
import { Alert, Button, Field, Input } from "@/components/ui";

const DEMO_EMAIL = "demo@fynvo.app";
const DEMO_PASSWORD = "demo123";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const login = useAppStore((s) => s.login);
  const seedDemo = useAppStore((s) => s.seedDemo);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  function enterApp() {
    router.replace("/app");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hydrated) {
      setError("Still loading saved data — try again in a moment.");
      return;
    }
    setBusy(true);
    setError("");
    if (email.trim().toLowerCase() === DEMO_EMAIL) {
      seedDemo();
    }
    const result = login(email, password);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    enterApp();
  }

  function openDemo() {
    if (!hydrated) {
      setError("Still loading saved data — try again in a moment.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      seedDemo();
      const result = login(DEMO_EMAIL, DEMO_PASSWORD);
      if (!result.ok) {
        setBusy(false);
        setError(result.error || "Could not open demo.");
        return;
      }
      enterApp();
    } catch {
      setBusy(false);
      setError("Could not open demo. Use the prefilled email/password and Sign in.");
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-md content-center px-5 py-10">
      <Link href="/" className="display mb-6 text-3xl font-800 text-teal">
        Fynvo
      </Link>
      <h1 className="display text-3xl font-800">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to your invoicing and budget workspace.</p>

      {!hydrated ? (
        <div className="mt-4">
          <Alert>Preparing workspace…</Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="surface mt-6 space-y-4 p-6">
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={!hydrated || busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-3 space-y-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={!hydrated || busy}
          onClick={openDemo}
        >
          Open demo (demo@fynvo.app)
        </Button>
        <p className="text-center text-sm text-muted">
          Demo password: <span className="font-700 text-ink">{DEMO_PASSWORD}</span>
          {" · "}
          <Link href="/demo" className="font-700 text-teal">
            /demo shortcut
          </Link>
        </p>
      </div>

      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-700 text-teal">
          Create an account
        </Link>
      </p>
    </div>
  );
}
