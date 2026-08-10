"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { WorkspaceType } from "@/lib/types";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAppStore((s) => s.signup);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    workspaceType: "individual" as WorkspaceType,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = signup(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/app");
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-lg content-center px-5 py-10">
      <Link href="/" className="display mb-6 text-3xl font-800 text-teal">
        Fynvo
      </Link>
      <h1 className="display text-3xl font-800">Create your workspace</h1>
      <p className="mt-2 text-muted">Start on Starter free. Upgrade when you need unlimited invoices or family/company budgets.</p>
      <form onSubmit={onSubmit} className="surface mt-6 space-y-4 p-6">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Your name">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Business / workspace name">
          <Input
            required
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
        </Field>
        <Field label="Workspace type">
          <Select
            value={form.workspaceType}
            onChange={(e) => setForm({ ...form, workspaceType: e.target.value as WorkspaceType })}
          >
            <option value="individual">Individual</option>
            <option value="family">Family</option>
            <option value="company">Company</option>
          </Select>
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Button type="submit" className="w-full">
          Create free account
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-700 text-teal">
          Sign in
        </Link>
      </p>
    </div>
  );
}
