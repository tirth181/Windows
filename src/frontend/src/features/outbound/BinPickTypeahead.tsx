"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn, formatWeight } from "@/lib/utils";
import type { InventoryItem } from "@/types";

export type BinPickOption = {
  inventoryId: string;
  locationCode: string;
  label: string;
  item: InventoryItem;
};

export function buildBinPickOptions(items: InventoryItem[]): BinPickOption[] {
  return items
    .filter(
      (i) =>
        i.locationCode &&
        (i.status === "Available" || i.status === "Partial") &&
        (i.remainingWeight > 0 || i.quantity > 0),
    )
    .map((item) => {
      const locationCode = item.locationCode || "";
      return {
        inventoryId: item.id,
        locationCode,
        label: `${locationCode} · ${item.materialCode} · ${item.batchNumber} · ${formatWeight(item.remainingWeight)} avail`,
        item,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Type-to-search storage location / bin and pick a matching inventory row. */
export function BinPickTypeahead({
  label = "Storage Location",
  value,
  options,
  disabled,
  placeholder = "Type bin / storage location…",
  hint,
  onPick,
  onQueryChange,
}: {
  label?: string;
  value: string;
  options: BinPickOption[];
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  onPick: (option: BinPickOption) => void;
  onQueryChange: (query: string) => void;
}) {
  const autoId = useId();
  const inputId = `${autoId}-bin`;
  const listId = `${inputId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => {
        const hay = [
          o.locationCode,
          o.item.materialCode,
          o.item.materialDescription,
          o.item.batchNumber,
          o.item.palletId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [options, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const update = () => {
      const rect = inputRef.current!.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 260 && rect.top > spaceBelow;
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: Math.max(rect.width, 280),
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

  const menu =
    open && !disabled && mounted && filtered.length > 0
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            style={menuStyle}
            className="max-h-64 overflow-auto rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] py-1 shadow-lg"
          >
            {filtered.map((option) => (
              <li key={option.inventoryId} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface)]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(option);
                    setOpen(false);
                  }}
                >
                  <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--brand-ink)]">
                    {option.locationCode}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {option.item.materialCode} · {option.item.batchNumber}
                    {option.item.palletId ? ` · ${option.item.palletId}` : ""} ·{" "}
                    {formatWeight(option.item.remainingWeight)} avail · Qty{" "}
                    {option.item.quantity}
                  </span>
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
        ref={inputRef}
        id={inputId}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") setOpen(true);
          if (e.key === "Enter" && filtered[0]) {
            e.preventDefault();
            onPick(filtered[0]);
            setOpen(false);
          }
        }}
        className={cn(
          "h-11 w-full rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] px-3",
          "font-[family-name:var(--font-mono)] text-[var(--text)] placeholder:font-[family-name:var(--font-ui)] placeholder:text-[var(--muted)]",
          "transition-colors duration-150",
          "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
          disabled && "cursor-not-allowed opacity-60",
        )}
      />
      {menu}
      {hint ? (
        <span className="text-xs text-[var(--muted)]">{hint}</span>
      ) : open && !disabled && filtered.length === 0 ? (
        <span className="text-xs text-[var(--muted)]">
          No matching bins for your company.
        </span>
      ) : null}
    </label>
  );
}
