"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

/**
 * Custom listbox select rendered via portal so the menu is never clipped by
 * overflow:auto parents (app shell, modals) — a common native <select> failure.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      label,
      options,
      placeholder,
      error,
      id,
      value,
      disabled,
      onChange,
      name,
    },
    ref,
  ) => {
    const autoId = useId();
    const selectId = id || name || autoId;
    const listId = `${selectId}-listbox`;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    const selected = options.find((o) => o.value === String(value ?? ""));
    const display =
      selected?.label ||
      (placeholder && !value ? placeholder : null) ||
      placeholder ||
      "Select…";

    useEffect(() => {
      setMounted(true);
    }, []);

    useLayoutEffect(() => {
      if (!open || !triggerRef.current) return;
      const update = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < 240 && rect.top > spaceBelow;
        setMenuStyle({
          position: "fixed",
          left: rect.left,
          width: Math.max(rect.width, 180),
          zIndex: 1000,
          ...(openUp
            ? { bottom: window.innerHeight - rect.top + 4 }
            : { top: rect.bottom + 4 }),
        });
      };
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t)) return;
        if (menuRef.current?.contains(t)) return;
        setOpen(false);
      };
      const onKey = (e: globalThis.KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    function choose(next: string) {
      onChange?.({ target: { value: next } });
      setOpen(false);
    }

    function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
      if (disabled) return;
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
    }

    const setRefs = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const menu =
      open && !disabled && mounted
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-labelledby={selectId}
              style={menuStyle}
              className={cn(
                "max-h-60 overflow-auto rounded-md border border-[var(--brand-steel)]/20",
                "bg-[var(--surface-raised)] py-1 shadow-lg",
              )}
            >
              {placeholder ? (
                <li
                  role="option"
                  aria-selected={!value}
                  aria-disabled
                  className="cursor-default px-3 py-2 text-sm text-[var(--muted)]"
                >
                  {placeholder}
                </li>
              ) : null}
              {options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--muted)]">
                  No options
                </li>
              ) : (
                options.map((opt) => {
                  const isSelected = String(value ?? "") === opt.value;
                  return (
                    <li key={opt.value} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={cn(
                          "flex w-full px-3 py-2.5 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-[var(--accent)]/10 font-medium text-[var(--brand-ink)]"
                            : "text-[var(--brand-ink)] hover:bg-[var(--surface)]",
                        )}
                        onClick={() => choose(opt.value)}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>,
            document.body,
          )
        : null;

    return (
      <div className="flex flex-col gap-1.5 text-sm">
        {label ? (
          <label
            htmlFor={selectId}
            className="font-medium text-[var(--brand-ink)]"
          >
            {label}
          </label>
        ) : null}
        <button
          ref={setRefs}
          type="button"
          id={selectId}
          name={name}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (!disabled) setOpen((v) => !v);
          }}
          onKeyDown={onTriggerKey}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] px-3 text-left",
            "text-[var(--text)] transition-colors duration-150",
            "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
            !selected && "text-[var(--muted)]",
            disabled && "cursor-not-allowed opacity-60",
            error && "border-[var(--danger)]",
            className,
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {menu}
        {error ? (
          <span className="text-xs text-[var(--danger)]">{error}</span>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";
