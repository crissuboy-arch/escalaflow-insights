import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

function stableHash(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return Math.random().toString();
  }
}

export function useAutosave<T>(opts: {
  /** Stable key used for localStorage cache. */
  key: string;
  data: T;
  save: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  /** Skip the very first run (avoid saving on initial hydrate). */
  skipInitial?: boolean;
}): { status: AutosaveStatus; flush: () => Promise<void> } {
  const { key, data, save, debounceMs = 1500, enabled = true, skipInitial = true } = opts;
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastHash = useRef<string>(stableHash(data));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  async function doSave(payload: T) {
    setStatus("saving");
    try {
      // local cache first (so we can recover even if server fails)
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`autosave:${key}`, JSON.stringify({ data: payload, ts: Date.now() }));
        }
      } catch {
        /* ignore */
      }
      await save(payload);
      setStatus("saved");
    } catch (e) {
      console.error("[autosave]", key, e);
      setStatus("error");
    }
  }

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await doSave(data);
  }

  useEffect(() => {
    if (!enabled) return;
    if (skipInitial && firstRun.current) {
      firstRun.current = false;
      lastHash.current = stableHash(data);
      return;
    }
    const h = stableHash(data);
    if (h === lastHash.current) return;
    lastHash.current = h;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void doSave(data);
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableHash(data), enabled]);

  return { status, flush };
}

export function readDraft<T>(key: string): { data: T; ts: number } | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`autosave:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; ts: number };
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(`autosave:${key}`);
  } catch {
    /* ignore */
  }
}