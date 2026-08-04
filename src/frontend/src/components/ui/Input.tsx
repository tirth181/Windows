"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        {label ? (
          <span className="font-medium text-[var(--brand-ink)]">{label}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
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
        {error ? (
          <span className="text-xs text-[var(--danger)]">{error}</span>
        ) : hint ? (
          <span className="text-xs text-[var(--muted)]">{hint}</span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = "Input";
