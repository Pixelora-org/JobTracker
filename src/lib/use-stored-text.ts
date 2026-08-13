"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Same-tab writes don't fire the storage event, so we notify subscribers ourselves. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * A string kept in localStorage. Server-renders as empty so the markup matches
 * the first client render, then fills in once hydrated.
 */
export function useStoredText(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? "",
    () => ""
  );

  const setValue = useCallback(
    (next: string) => {
      localStorage.setItem(key, next);
      for (const listener of listeners) listener();
    },
    [key]
  );

  return [value, setValue] as const;
}
