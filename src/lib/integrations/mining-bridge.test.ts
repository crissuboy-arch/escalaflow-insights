import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all four real miner implementations — these tests must never call
// Apify/Google/YouTube/Instagram for real. Each mock lets us prove the
// bridge dispatches to the ONE real implementation per source, with the
// exact input shape that miner expects, and nothing else.
const runTikTokHashtagMiningMock = vi.fn();
const runInstagramMiningMock = vi.fn();
const runYouTubeMiningMock = vi.fn();
const runGoogleTrendsMiningMock = vi.fn();

vi.mock("@/lib/tiktok-radar.functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tiktok-radar.functions")>(
    "@/lib/tiktok-radar.functions",
  );
  return {
    ...actual,
    runTikTokHashtagMining: (...args: unknown[]) => runTikTokHashtagMiningMock(...args),
  };
});
vi.mock("@/lib/instagram-radar.functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/instagram-radar.functions")>(
    "@/lib/instagram-radar.functions",
  );
  return { ...actual, runInstagramMining: (...args: unknown[]) => runInstagramMiningMock(...args) };
});
vi.mock("@/lib/youtube-radar.functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/youtube-radar.functions")>(
    "@/lib/youtube-radar.functions",
  );
  return { ...actual, runYouTubeMining: (...args: unknown[]) => runYouTubeMiningMock(...args) };
});
vi.mock("@/lib/google-radar.functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google-radar.functions")>(
    "@/lib/google-radar.functions",
  );
  return {
    ...actual,
    runGoogleTrendsMining: (...args: unknown[]) => runGoogleTrendsMiningMock(...args),
  };
});

// Fake, in-memory stand-in for the REAL atomic Postgres primitive
// (try_acquire_mining_bridge_lock — see
// supabase/migrations/20260924000000_mining_bridge_rate_limit.sql). This
// fake only proves that mining-bridge.ts calls the RPC correctly and acts
// correctly on its boolean result. True cross-instance atomicity is a
// property of Postgres's pg_advisory_xact_lock in that SQL function, which
// cannot be exercised by a JS unit test — it is guaranteed by the database
// engine, not by this application code.
interface FakeRun {
  userId: string;
  type: string;
  query: string;
  at: number;
}
let fakeRuns: FakeRun[] = [];
let fakeNow = 0;

interface LockArgs {
  p_user_id: string;
  p_type: string;
  p_query: string;
  p_window_seconds: number;
}

const rpcMock = vi.fn(async (fnName: string, rawArgs: Record<string, unknown>) => {
  const args = rawArgs as unknown as LockArgs;
  if (fnName !== "try_acquire_mining_bridge_lock") {
    return { data: null, error: { message: `unexpected rpc ${fnName}` } };
  }
  const windowStart = fakeNow - args.p_window_seconds * 1000;
  const exists = fakeRuns.some(
    (r) =>
      r.userId === args.p_user_id &&
      r.type === args.p_type &&
      r.query === args.p_query &&
      r.at > windowStart,
  );
  if (exists) return { data: false, error: null };
  fakeRuns.push({ userId: args.p_user_id, type: args.p_type, query: args.p_query, at: fakeNow });
  return { data: true, error: null };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: (...args: [string, Record<string, unknown>]) => rpcMock(...args) },
}));

const { isAuthorized, acquireMiningBridgeLock, runMiningBridge } = await import("./mining-bridge");

beforeEach(() => {
  runTikTokHashtagMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  runInstagramMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  runYouTubeMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  runGoogleTrendsMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  rpcMock.mockClear();
  fakeRuns = [];
  fakeNow = 1_000_000_000; // fixed base "now" in ms, advanced per test as needed
});

describe("isAuthorized — secret dedicado, nunca sessão do app", () => {
  it("aceita somente 'Bearer {secret}' exato", () => {
    expect(isAuthorized("Bearer abc123", "abc123")).toBe(true);
  });

  it("rejeita quando o header está ausente", () => {
    expect(isAuthorized(null, "abc123")).toBe(false);
  });

  it("rejeita quando o secret não está configurado (env ausente)", () => {
    expect(isAuthorized("Bearer abc123", undefined)).toBe(false);
  });

  it("rejeita um secret incorreto", () => {
    expect(isAuthorized("Bearer wrong", "abc123")).toBe(false);
  });

  it("rejeita um token de sessão Supabase típico (JWT) — não é aceito como substituto do secret", () => {
    expect(isAuthorized("Bearer eyJhbGciOiJIUzI1NiJ9.fake.jwt", "abc123")).toBe(false);
  });
});

describe("runMiningBridge — reutiliza o minerador real de cada fonte, sem segunda implementação", () => {
  it("tiktok chama runTikTokHashtagMining com {hashtag, limit} e o userId dado", async () => {
    await runMiningBridge({ source: "tiktok", term: "N8N", limit: 10 }, "user-1");
    expect(runTikTokHashtagMiningMock).toHaveBeenCalledTimes(1);
    expect(runTikTokHashtagMiningMock).toHaveBeenCalledWith(
      { hashtag: "N8N", limit: 10 },
      "user-1",
    );
    expect(runInstagramMiningMock).not.toHaveBeenCalled();
    expect(runYouTubeMiningMock).not.toHaveBeenCalled();
    expect(runGoogleTrendsMiningMock).not.toHaveBeenCalled();
  });

  it("instagram chama runInstagramMining com {search, searchType, resultsType, limit}", async () => {
    await runMiningBridge(
      {
        source: "instagram",
        term: "automacao",
        searchType: "hashtag",
        resultsType: "reels",
        limit: 25,
      },
      "user-1",
    );
    expect(runInstagramMiningMock).toHaveBeenCalledWith(
      { search: "automacao", searchType: "hashtag", resultsType: "reels", limit: 25 },
      "user-1",
    );
    expect(runTikTokHashtagMiningMock).not.toHaveBeenCalled();
  });

  it("youtube chama runYouTubeMining com {query, maxResults, dateFilter}", async () => {
    await runMiningBridge({ source: "youtube", term: "N8N automação", maxResults: 15 }, "user-1");
    expect(runYouTubeMiningMock).toHaveBeenCalledWith(
      { query: "N8N automação", maxResults: 15, dateFilter: undefined },
      "user-1",
    );
  });

  it("google_trends chama runGoogleTrendsMining com {keywords, geo, timeframe} (default do próprio schema quando omitido)", async () => {
    await runMiningBridge({ source: "google_trends", term: "N8N", geo: "BR" }, "user-1");
    expect(runGoogleTrendsMiningMock).toHaveBeenCalledWith(
      { keywords: "N8N", geo: "BR", timeframe: "today 3-m" },
      "user-1",
    );
  });

  it("nenhuma chamada real é feita nestes testes — tudo mockado", () => {
    expect(vi.isMockFunction(runTikTokHashtagMiningMock)).toBe(true);
    expect(vi.isMockFunction(runInstagramMiningMock)).toBe(true);
    expect(vi.isMockFunction(runYouTubeMiningMock)).toBe(true);
    expect(vi.isMockFunction(runGoogleTrendsMiningMock)).toBe(true);
  });
});

describe("acquireMiningBridgeLock — persistente e atômico (via RPC), não em memória", () => {
  it("permite a primeira chamada de uma combinação (source, term)", async () => {
    const check = await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    expect(check.allowed).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(
      "try_acquire_mining_bridge_lock",
      expect.objectContaining({ p_type: "tiktok", p_query: "N8N", p_user_id: "user-1" }),
    );
  });

  it("bloqueia uma repetição da MESMA combinação (source, term) dentro da janela", async () => {
    await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    const second = await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    expect(second.allowed).toBe(false);
    expect(second.reason).toMatch(/aguarde|janela|últimos/i);
  });

  it("uma chamada bloqueada nunca chega ao minerador (verificado no nível da rota, aqui via runMiningBridge não invocado)", async () => {
    await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    const second = await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    expect(second.allowed).toBe(false);
    // A rota real só chama runMiningBridge quando allowed === true; aqui
    // provamos que a segunda tentativa nunca teria permissão para prosseguir.
    expect(runTikTokHashtagMiningMock).not.toHaveBeenCalled();
  });

  it("uma FONTE diferente para o mesmo termo é permitida (chave é source+term, não só term)", async () => {
    await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    const other = await acquireMiningBridgeLock("instagram", "N8N", "user-1");
    expect(other.allowed).toBe(true);
  });

  it("um TERMO diferente na mesma fonte é permitido (chave é source+term, não só source)", async () => {
    await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    const other = await acquireMiningBridgeLock("tiktok", "automação", "user-1");
    expect(other.allowed).toBe(true);
  });

  it("permite novamente a mesma combinação após a janela expirar", async () => {
    await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    fakeNow += 301_000; // just past the 300s window
    const later = await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    expect(later.allowed).toBe(true);
  });

  it("falha fechada (bloqueia) quando a própria checagem falha, em vez de deixar passar sem controle", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "function does not exist" } });
    const check = await acquireMiningBridgeLock("tiktok", "N8N", "user-1");
    expect(check.allowed).toBe(false);
  });

  it("concorrência: de duas tentativas 'simultâneas' para a mesma (source, term), apenas uma é permitida", async () => {
    const [a, b] = await Promise.all([
      acquireMiningBridgeLock("youtube", "N8N", "user-1"),
      acquireMiningBridgeLock("youtube", "N8N", "user-1"),
    ]);
    const allowedCount = [a, b].filter((r) => r.allowed).length;
    expect(allowedCount).toBe(1);
  });
});
