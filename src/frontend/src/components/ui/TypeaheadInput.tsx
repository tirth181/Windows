"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TypeaheadInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "list" | "onChange"> {
  label?: string;
  hint?: string;
  error?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

/** Free-text input with suggestion list — type a new value or pick a prior one. */
export function TypeaheadInput({
  className,
  label,
  hint,
  error,
  id,
  options,
  value,
  onChange,
  ...props
}: TypeaheadInputProps) {
  const autoId = useId();
  const inputId = id || props.name || autoId;
  const listId = `${inputId}-list`;
  const unique = Array.from(
    new Set(options.map((o) => o.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-[var(--brand-ink)]">{label}</span>
      ) : null}
      <input
        id={inputId}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] px-3",
          "text-[var(--text)] placeholder:text-[var(--muted)]",
          "transition-colors duration-150",
          "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
          error && "border-[var(--danger)] focus:ring-[var(--danger)]/30",
          className,
        )}
        {...props}
      />
      <datalist id={listId}>
        {unique.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      {error ? (
        <span className="text-xs text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
