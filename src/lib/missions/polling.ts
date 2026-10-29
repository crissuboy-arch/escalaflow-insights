// Authenticated polling helper (Fase 3) — the loop every status adapter
// uses. No tool-specific knowledge here: callers pass a fetchStatus
// function and a terminal predicate. Never throws: fetch errors count as
// non-terminal attempts (the loop keeps going until timeout), so a
// transient outage never crashes the caller — it just times out honestly.
export interface PollOutcome<T> {
  outcome: "terminal" | "timeout";
  /** Last snapshot seen (null when no fetch ever succeeded). */
  last: T | null;
  attempts: number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function pollUntil<T>(
  fetchStatus: () => Promise<T>,
  opts: {
    isTerminal: (snapshot: T) => boolean;
    intervalMs?: number;
    timeoutMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<PollOutcome<T>> {
  const intervalMs = opts.intervalMs ?? 5000;
  const timeoutMs = opts.timeoutMs ?? 60000;
  const sleep = opts.sleep ?? defaultSleep;
  const startedAt = Date.now();
  let attempts = 0;
  let last: T | null = null;

  for (;;) {
    attempts += 1;
    try {
      const snapshot = await fetchStatus();
      last = snapshot;
      if (opts.isTerminal(snapshot)) {
        return { outcome: "terminal", last, attempts };
      }
    } catch {
      // Non-terminal attempt: keep polling until the timeout says stop.
    }
    if (Date.now() - startedAt >= timeoutMs) {
      return { outcome: "timeout", last, attempts };
    }
    await sleep(intervalMs);
  }
}
