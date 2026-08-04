"use client";

import { useState } from "react";
import { Button, Input, PageHeader, Select } from "@/components/ui";

export default function SettingsPage() {
  const [density, setDensity] = useState("comfortable");
  const [locale, setLocale] = useState("en-US");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [scannerBeep, setScannerBeep] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Company preferences for warehouse floor UX and notifications."
        actions={
          <Button
            onClick={async () => {
              setSaved(false);
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
          Settings saved (demo).
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
    </div>
  );
}
