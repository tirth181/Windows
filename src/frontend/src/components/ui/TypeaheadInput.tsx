"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
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

/** Free-text input with a click/focus suggestion menu (not native datalist). */
export function TypeaheadInput({
  className,
  label,
  hint,
  error,
  id,
  options,
  value,
  onChange,
  disabled,
  ...props
}: TypeaheadInputProps) {
  const autoId = useId();
  const inputId = id || props.name || autoId;
  const listId = `${inputId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const unique = useMemo(
    () =>
      Array.from(new Set(options.map((o) => o.trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [options],
  );

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return unique;
    return unique.filter((o) => o.toLowerCase().includes(q));
  }, [unique, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const update = () => {
      const rect = inputRef.current!.getBoundingClientRect();
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
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown") setOpen(true);
    props.onKeyDown?.(e);
  }

  const menu =
    open && !disabled && mounted && filtered.length > 0
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            style={menuStyle}
            className="max-h-60 overflow-auto rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] py-1 shadow-lg"
          >
            {filtered.map((option) => (
              <li key={option} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="flex w-full px-3 py-2.5 text-left text-sm text-[var(--brand-ink)] transition-colors hover:bg-[var(--surface)]"
                  onMouseDown={(e) => {
                    // prevent input blur before click applies
                    e.preventDefault();
                  }}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-[var(--brand-ink)]">{label}</span>
      ) : null}
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          props.onFocus?.(e);
        }}
        onClick={(e) => {
          setOpen(true);
          props.onClick?.(e);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "h-11 w-full rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] px-3",
          "text-[var(--text)] placeholder:text-[var(--muted)]",
          "transition-colors duration-150",
          "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
          error && "border-[var(--danger)] focus:ring-[var(--danger)]/30",
          className,
        )}
      />
      {menu}
      {error ? (
        <span className="text-xs text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
