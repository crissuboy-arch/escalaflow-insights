import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake, in-memory stand-in for the REAL atomic Postgres primitive
// (try_acquire_rate_limit — see supabase/migrations/
// 20261023000000_api_rate_limits.sql). Mirrors the same fake-RPC approach
// already used in mining-bridge.test.ts: this proves rate-limit.ts calls
// the RPC correctly and acts correctly on its result. True cross-instance
// atomicity is guaranteed by Postgres's own locking in that SQL function,
// not by this application code.
interface Bucket {
  bucket: string;
  identity: string;
  windowStart: number;
  count: number;
}
let buckets: Bucket[] = [];
let fakeNow = 0;

interface RpcArgs {
  p_bucket: string;
  p_identity: string;
  p_window_seconds: number;
  p_max_calls: number;
}

const rpcMock = vi.fn(async (fnName: string, rawArgs: Record<string, unknown>) => {
  const args = rawArgs as unknown as RpcArgs;
  if (fnName !== "try_acquire_rate_limit") {
    return { data: null, error: { message: `unexpected rpc ${fnName}` } };
  }
  const existing = buckets.find((b) => b.bucket === args.p_bucket && b.identity === args.p_identity);
  const windowStartCutoff = fakeNow - args.p_window_seconds * 1000;

  if (!existing || existing.windowStart <= windowStartCutoff) {
    if (existing) {
      existing.windowStart = fakeNow;
      existing.count = 1;
    } else {
      buckets.push({ bucket: args.p_bucket, identity: args.p_identity, windowStart: fakeNow, count: 1 });
    }
    return { data: true, error: null };
  }

  if (existing.count >= args.p_max_calls) {
    return { data: false, error: null };
  }

  existing.count += 1;
  return { data: true, error: null };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: (...args: [string, Record<string, unknown>]) => rpcMock(...args) },
}));

const { tryAcquireRateLimit } = await import("./rate-limit");

beforeEach(() => {
  rpcMock.mockClear();
  buckets = [];
  fakeNow = 1_000_000_000;
});

describe("tryAcquireRateLimit", () => {
  it("permite as primeiras N chamadas dentro do limite", async () => {
    for (let i = 0; i < 5; i++) {
      const check = await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
      expect(check.allowed).toBe(true);
    }
  });

  it("bloqueia a chamada que excede o limite dentro da janela", async () => {
    for (let i = 0; i < 5; i++) {
      await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    }
    const sixth = await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    expect(sixth.allowed).toBe(false);
    expect(sixth.reason).toMatch(/limite|aguarde/i);
  });

  it("identidades diferentes têm contadores independentes", async () => {
    for (let i = 0; i < 5; i++) {
      await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    }
    const otherUser = await tryAcquireRateLimit("execute-skill", "user-2", 60, 5);
    expect(otherUser.allowed).toBe(true);
  });

  it("buckets diferentes para o mesmo usuário têm contadores independentes", async () => {
    for (let i = 0; i < 5; i++) {
      await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    }
    const otherBucket = await tryAcquireRateLimit("scrape-offer", "user-1", 60, 5);
    expect(otherBucket.allowed).toBe(true);
  });

  it("permite novamente após a janela expirar", async () => {
    for (let i = 0; i < 5; i++) {
      await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    }
    fakeNow += 61_000;
    const afterWindow = await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    expect(afterWindow.allowed).toBe(true);
  });

  it("falha fechada (bloqueia) quando a própria checagem RPC falha", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "function does not exist" } });
    const check = await tryAcquireRateLimit("execute-skill", "user-1", 60, 5);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/indisponível/i);
  });

  it("chama a RPC com os parâmetros corretos", async () => {
    await tryAcquireRateLimit("scrape-offer", "user-9", 120, 3);
    expect(rpcMock).toHaveBeenCalledWith("try_acquire_rate_limit", {
      p_bucket: "scrape-offer",
      p_identity: "user-9",
      p_window_seconds: 120,
      p_max_calls: 3,
    });
  });
});
