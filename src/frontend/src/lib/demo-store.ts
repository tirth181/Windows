/** Local persistence for demo-mode create/edit when API is unavailable. */

function key(name: string) {
  return `logiforge.demo.${name}`;
}

export function loadDemoCollection<T>(name: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveDemoCollection<T>(name: string, rows: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(name), JSON.stringify(rows));
}

export function upsertDemoItem<T extends { id: string }>(
  name: string,
  fallback: T[],
  item: T,
): T[] {
  const rows = loadDemoCollection(name, fallback);
  const idx = rows.findIndex((r) => r.id === item.id);
  const next = idx >= 0 ? rows.map((r, i) => (i === idx ? item : r)) : [item, ...rows];
  saveDemoCollection(name, next);
  return next;
}

export function getDemoItem<T extends { id: string }>(
  name: string,
  fallback: T[],
  id: string,
): T | undefined {
  return loadDemoCollection(name, fallback).find((r) => r.id === id);
}
