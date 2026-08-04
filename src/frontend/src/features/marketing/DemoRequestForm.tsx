"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { demoRequestSchema } from "@/lib/demo-request-schema";
import { markAccessRequestCompleted } from "@/lib/demo-access";

type DemoRequestFormProps = {
  open: boolean;
  onClose: () => void;
};

const DEMO_REQUEST_TO = "tirthsoni1810@gmail.com";

const Field = forwardRef<
  HTMLInputElement,
  {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    required?: boolean;
  }
>(function Field(
  { label, name, value, onChange, type = "text", autoComplete, placeholder, required },
  ref,
) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--brand-ink)]">
        {label}
      </span>
      <input
        ref={ref}
        type={type}
        name={name}
        autoComplete={autoComplete}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--brand-steel)]/20 bg-white px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
      />
    </label>
  );
});

type RequestPayload = {
  name: string;
  email: string;
  company: string;
  position: string;
  useCase: string;
};

async function deliverViaFormSubmit(payload: RequestPayload): Promise<boolean> {
  try {
    const response = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(DEMO_REQUEST_TO)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          _replyto: payload.email,
          company: payload.company,
          position: payload.position,
          useCase: payload.useCase,
          _subject: `LogiForge demo request — ${payload.company}`,
          _template: "table",
          _captcha: "false",
        }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

function openMailto(payload: RequestPayload): void {
  const subject = encodeURIComponent(
    `LogiForge demo request — ${payload.company}`,
  );
  const body = encodeURIComponent(
    [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Company: ${payload.company}`,
      `Position: ${payload.position}`,
      "",
      "Use case:",
      payload.useCase,
    ].join("\n"),
  );
  const anchor = document.createElement("a");
  anchor.href = `mailto:${DEMO_REQUEST_TO}?subject=${subject}&body=${body}`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function DemoRequestForm({ open, onClose }: DemoRequestFormProps) {
  const router = useRouter();
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [useCase, setUseCase] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = demoRequestSchema.safeParse({
      name,
      email,
      company,
      position,
      useCase,
      website,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please complete the form");
      return;
    }

    const payload: RequestPayload = {
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      position: parsed.data.position,
      useCase: parsed.data.useCase,
    };

    setLoading(true);
    try {
      let serverDelivered = false;

      try {
        const response = await fetch("/api/demo-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            ok?: boolean;
            delivery?: string;
            error?: string;
          };
          if (data.ok && data.delivery === "server") {
            serverDelivered = true;
          } else if (!data.ok && data.error && response.status === 400) {
            setError(data.error);
            return;
          }
        } else if (response.status === 400) {
          const data = (await response.json()) as { error?: string };
          setError(data.error || "Please check the form and try again.");
          return;
        }
      } catch {
        // API unreachable — continue with client delivery
      }

      if (!serverDelivered) {
        const emailed = await deliverViaFormSubmit(payload);
        if (!emailed) {
          openMailto(payload);
        }
      }

      markAccessRequestCompleted({
        name: payload.name,
        company: payload.company,
        position: payload.position,
        submittedAt: new Date().toISOString(),
      });
      setDone(true);
    } catch {
      setError("Could not submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="lf-demo-modal fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--brand-ink)]/55 backdrop-blur-[2px]"
        aria-label="Close request form"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] shadow-xl">
        <div className="border-b border-[var(--brand-steel)]/10 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            Request access
          </p>
          <h2
            id={titleId}
            className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--brand-ink)]"
          >
            {done ? "Request received" : "Tell us about your operation"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--brand-steel)]">
            {done
              ? "Thanks — your details were sent. You can continue into LogiForge."
              : "Fill this out to request a demo. No product access is granted until you submit."}
          </p>
        </div>

        {done ? (
          <div className="flex flex-wrap gap-3 px-6 py-6">
            <button
              type="button"
              className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              onClick={() => router.push("/login")}
            >
              Continue to LogiForge
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--brand-steel)]/20 px-5 py-2.5 text-sm font-semibold text-[var(--brand-steel)]"
              onClick={onClose}
            >
              Stay on site
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
            <Field
              ref={firstFieldRef}
              label="Full name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={setName}
              required
            />
            <Field
              label="Work email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              required
            />
            <Field
              label="Company name"
              name="company"
              autoComplete="organization"
              value={company}
              onChange={setCompany}
              required
            />
            <Field
              label="Position"
              name="position"
              autoComplete="organization-title"
              value={position}
              onChange={setPosition}
              placeholder="e.g. Warehouse Operations Manager"
              required
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--brand-ink)]">
                Brief details about your use case
              </span>
              <textarea
                name="useCase"
                rows={4}
                required
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Sites, volumes, inbound/outbound pain points, integrations…"
                className="w-full resize-y rounded-md border border-[var(--brand-steel)]/20 bg-white px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
              />
            </label>

            <div className="absolute -left-[9999px] opacity-0" aria-hidden>
              <label>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            {error ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Submit request"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[var(--brand-steel)]/20 px-5 py-2.5 text-sm font-semibold text-[var(--brand-steel)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
