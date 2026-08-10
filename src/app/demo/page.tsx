"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useHasHydrated } from "@/lib/hydrate";
import { Alert, Button } from "@/components/ui";

export default function DemoPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const seedDemo = useAppStore((s) => s.seedDemo);
  const login = useAppStore((s) => s.login);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current || error) return;
    started.current = true;
    seedDemo();
    const result = login("demo@fynvo.app", "demo123");
    if (!result.ok) {
      started.current = false;
      queueMicrotask(() => setError(result.error));
      return;
    }
    router.replace("/app");
  }, [hydrated, seedDemo, login, router, error]);

  function retry() {
    setError("");
    started.current = false;
    seedDemo();
    const result = login("demo@fynvo.app", "demo123");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace("/app");
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-md content-center px-5 py-10 text-center">
      <p className="display text-3xl font-800 text-teal">Fynvo</p>
      <p className="mt-4 text-muted">
        {error ? "Demo login failed." : "Opening demo workspace…"}
      </p>
      {error ? (
        <div className="mt-4 text-left">
          <Alert tone="error">{error}</Alert>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/login" className="btn btn-primary">
              Go to sign in
            </Link>
            <Button variant="secondary" onClick={retry}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
