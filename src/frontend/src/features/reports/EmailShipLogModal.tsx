"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, X } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { DEMO_USERS } from "@/lib/mock-data";
import { loadDemoCollection } from "@/lib/demo-store";
import {
  isValidEmail,
  loadDefaultReceiptEmails,
  normalizeEmailList,
  parseEmailsInput,
} from "@/lib/receipt-email";
import { companyLabel, sendShipLogEmail } from "@/lib/ship-log";
import type { AppUser, OutboundOrder, Warehouse } from "@/types";

export function EmailShipLogModal({
  open,
  orders,
  dayKey,
  company,
  onClose,
  onSent,
}: {
  open: boolean;
  orders: OutboundOrder[];
  dayKey: string;
  company?: Pick<Warehouse, "code" | "name"> | null;
  onClose: () => void;
  onSent?: (to: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [openMailClient, setOpenMailClient] = useState(true);

  const knownUsers = useMemo(() => {
    const users = loadDemoCollection<AppUser>("users", DEMO_USERS);
    return users.filter((u) => u.isActive && isValidEmail(u.email));
  }, [open]);

  const defaults = useMemo(() => loadDefaultReceiptEmails(), [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setExtra("");
    setSending(false);
    setSelected(defaults.length ? defaults : []);
  }, [open, defaults]);

  if (!open) return null;

  const allRecipients = normalizeEmailList([
    ...selected,
    ...parseEmailsInput(extra),
  ]);

  function toggle(email: string) {
    const key = email.toLowerCase();
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key],
    );
  }

  function handleSend() {
    setError(null);
    if (!allRecipients.length) {
      setError("Select or enter at least one email address.");
      return;
    }
    setSending(true);
    try {
      const result = sendShipLogEmail(
        orders,
        dayKey,
        allRecipients,
        company,
        { openMailClient },
      );
      onSent?.(result.to);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  const suggestionEmails = normalizeEmailList([
    ...defaults,
    ...knownUsers.map((u) => u.email),
  ]);

  const label = companyLabel(company);

  return (
    <Modal
      open={open}
      title={`Email Ship Log · ${dayKey}`}
      description={`Send the Ship Log for ${label} to one or more email addresses. Defaults come from Settings.`}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={sending || !allRecipients.length}
            onClick={handleSend}
          >
            <Mail className="h-4 w-4" />
            {sending ? "Sending…" : `Send to ${allRecipients.length || 0}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-sm text-[var(--muted)]">
          Includes {orders.length} shipment
          {orders.length === 1 ? "" : "s"} shipped on {dayKey}.
        </p>

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--brand-ink)]">
            Recipients
          </p>
          {suggestionEmails.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No default emails yet. Add addresses below, or set defaults under{" "}
              <strong>Settings → Receipt email</strong>.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {suggestionEmails.map((email) => {
                const isDefault = defaults.includes(email);
                const user = knownUsers.find(
                  (u) => u.email.toLowerCase() === email,
                );
                const checked = selected.includes(email);
                return (
                  <li key={email}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--brand-steel)]/15 px-3 py-2.5 hover:bg-[var(--surface)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(email)}
                        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--brand-ink)]">
                          {user?.displayName || email}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {email}
                          {isDefault ? " · default" : ""}
                        </span>
                      </span>
                      {checked ? (
                        <button
                          type="button"
                          className="text-[var(--muted)] hover:text-[var(--danger)]"
                          aria-label={`Remove ${email}`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggle(email);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <Input
            label="Additional emails"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="name@company.com, other@company.com"
            hint="Separate multiple addresses with commas"
          />
          {extra.trim() && parseEmailsInput(extra).length === 0 ? (
            <p className="mt-1 text-xs text-[var(--danger)]">
              Enter valid email addresses.
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--brand-ink)]">
          <input
            type="checkbox"
            checked={openMailClient}
            onChange={(e) => setOpenMailClient(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Also open mail client (mailto)
        </label>

        {allRecipients.length > 0 ? (
          <p className="flex items-start gap-2 rounded-md bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
            <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Will send to: {allRecipients.join(", ")}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
