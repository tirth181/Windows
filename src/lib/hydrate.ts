"use client";

import { useSyncExternalStore } from "react";
import { useAppStore } from "./store";

/** True after zustand persist has finished loading from localStorage. */
export function useHasHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const unsubFinish = useAppStore.persist.onFinishHydration(onStoreChange);
      const unsubStart = useAppStore.persist.onHydrate(onStoreChange);
      if (useAppStore.persist.hasHydrated()) {
        queueMicrotask(onStoreChange);
      }
      return () => {
        unsubFinish();
        unsubStart();
      };
    },
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}
