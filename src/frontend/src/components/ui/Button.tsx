"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[#b86305] focus-visible:ring-[var(--accent)] shadow-sm",
  secondary:
    "bg-[var(--brand-steel)] text-white hover:bg-[var(--brand-ink)] focus-visible:ring-[var(--brand-steel)]",
  ghost:
    "bg-transparent text-[var(--brand-ink)] hover:bg-[var(--brand-ink)]/5 focus-visible:ring-[var(--brand-steel)]",
  danger:
    "bg-[var(--danger)] text-white hover:bg-[#991b1b] focus-visible:ring-[var(--danger)]",
  outline:
    "border border-[var(--brand-steel)]/25 bg-[var(--surface-raised)] text-[var(--brand-ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:ring-[var(--accent)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium font-[family-name:var(--font-ui)]",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
