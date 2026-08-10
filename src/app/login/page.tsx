"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Alert, Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);
  const seedDemo = useAppStore((s) => s.seedDemo);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/app");
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-md content-center px-5 py-10">
      <Link href="/" className="display mb-6 text-3xl font-800 text-teal">
        Fynvo
      </Link>
      <h1 className="display text-3xl font-800">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to your invoicing and budget workspace.</p>
      <form onSubmit={onSubmit} className="surface mt-6 space-y-4 p-6">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            seedDemo();
            router.push("/app");
          }}
        >
          Open demo (demo@fynvo.app)
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-700 text-teal">
          Create an account
        </Link>
      </p>
    </div>
  );
}
