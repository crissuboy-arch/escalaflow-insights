// Polling tests — the loop must terminate honestly in both directions:
// terminal snapshot wins, and a failing fetch never crashes the caller.
import { describe, it, expect } from "vitest";
import { pollUntil } from "./polling";

const noSleep = () => Promise.resolve();

describe("pollUntil", () => {
  it("termina quando o snapshot é terminal e conta as tentativas", async () => {
    let calls = 0;
    const outcome = await pollUntil(
      async () => {
        calls += 1;
        return calls >= 3 ? "COMPLETED" : "RUNNING";
      },
      { isTerminal: (s) => s === "COMPLETED", intervalMs: 1, timeoutMs: 1000, sleep: noSleep },
    );
    expect(outcome).toEqual({ outcome: "terminal", last: "COMPLETED", attempts: 3 });
  });

  it("timeout com fetch sempre a falhar — nunca lança, devolve timeout", async () => {
    const outcome = await pollUntil(
      async () => {
        throw new Error("rede em baixo");
      },
      { isTerminal: () => false, intervalMs: 1, timeoutMs: 5, sleep: noSleep },
    );
    expect(outcome.outcome).toBe("timeout");
    expect(outcome.last).toBeNull();
    expect(outcome.attempts).toBeGreaterThanOrEqual(1);
  });

  it("snapshot não-terminal até ao fim devolve o último visto", async () => {
    const outcome = await pollUntil(
      async () => "RUNNING",
      { isTerminal: (s) => s === "COMPLETED", intervalMs: 1, timeoutMs: 5, sleep: noSleep },
    );
    expect(outcome).toEqual({ outcome: "timeout", last: "RUNNING", attempts: expect.any(Number) });
  });
});
