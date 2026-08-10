"use client";

import { useSyncExternalStore } from "react";
import { useAppStore } from "./store";

/**
 * Stays false during SSR and the hydration render, then becomes true after a
 * microtask once the client is mounted and zustand persist has loaded.
 * This keeps server HTML and the first client render identical.
 */
let clientReady = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!clientReady) {
    queueMicrotask(() => {
      clientReady = true;
      emit();
    });
  }
  const unsubPersist = useAppStore.persist.onFinishHydration(() => emit());
  return () => {
    listeners.delete(onChange);
    unsubPersist();
  };
}

function getSnapshot() {
  return clientReady && useAppStore.persist.hasHydrated();
}

function getServerSnapshot() {
  return false;
}

export function useHasHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
