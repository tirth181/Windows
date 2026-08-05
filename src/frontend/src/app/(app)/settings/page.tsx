"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, PageHeader, Select } from "@/components/ui";
import {
  isValidEmail,
  loadDefaultReceiptEmails,
  saveDefaultReceiptEmails,
} from "@/lib/receipt-email";

export default function SettingsPage() {
  const [density, setDensity] = useState("comfortable");
  const [locale, setLocale] = useState("en-US");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [scannerBeep, setScannerBeep] = useState(true);
  const [defaultEmails, setDefaultEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDefaultEmails(loadDefaultReceiptEmails());
  }, []);

  function addDefaultEmail() {
    setEmailError(null);
    const email = newEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (defaultEmails.includes(email)) {
      setEmailError("That email is already in the default list.");
      return;
    }
    const next = saveDefaultReceiptEmails([...defaultEmails, email]);
    setDefaultEmails(next);
    setNewEmail("");
    setSaved(true);
  }

  function removeDefaultEmail(email: string) {
    const next = saveDefaultReceiptEmails(
      defaultEmails.filter((e) => e !== email),
    );
    setDefaultEmails(next);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences for 3PL company floor UX, notifications, and receipt email defaults."
        actions={
          <Button
            onClick={async () => {
              setSaved(false);
              saveDefaultReceiptEmails(defaultEmails);
              await new Promise((r) => setTimeout(r, 350));
              setSaved(true);
            }}
          >
            Save settings
          </Button>
        }
      />
      {saved ? (
        <p className="text-sm text-[var(--success)]" role="status">
          Settings saved.
        </p>
      ) : null}

      <section className="grid max-w-xl gap-4">
        <Select
          label="UI density"
          value={density}
          onChange={(e) => setDensity(e.target.value)}
          options={[
            { value: "comfortable", label: "Comfortable (tablet)" },
            { value: "compact", label: "Compact (desktop)" },
          ]}
        />
        <Select
          label="Locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          options={[
            { value: "en-US", label: "English (US)" },
            { value: "en-GB", label: "English (UK)" },
            { value: "es-MX", label: "Español (MX)" },
          ]}
        />
        <Input
          label="Default receiving dock"
          defaultValue="Dock 2"
          hint="Used when creating new inbound loads"
        />

        <label className="flex items-center gap-3 text-sm text-[var(--brand-ink)]">
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Email alerts for delayed outbound
        </label>
        <label className="flex items-center gap-3 text-sm text-[var(--brand-ink)]">
          <input
            type="checkbox"
            checked={scannerBeep}
            onChange={(e) => setScannerBeep(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Scanner success beep
        </label>
      </section>

      <section className="max-w-xl space-y-3 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] p-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--brand-ink)]">
            Receipt email defaults
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            These addresses are pre-selected when emailing an inbound receipt.
            You can still add more recipients at send time.
          </p>
        </div>

        {defaultEmails.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No default recipients yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {defaultEmails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between gap-3 rounded-md border border-[var(--brand-steel)]/10 px-3 py-2"
              >
                <span className="truncate text-sm font-medium text-[var(--brand-ink)]">
                  {email}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[var(--danger)]"
                  onClick={() => removeDefaultEmail(email)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Add default email"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDefaultEmail();
                }
              }}
              placeholder="ops@yourcompany.com"
              error={emailError || undefined}
            />
          </div>
          <Button type="button" onClick={addDefaultEmail}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </section>
    </div>
  );
}
