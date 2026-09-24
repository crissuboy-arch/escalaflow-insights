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
  return { ...actual, runTikTokHashtagMining: (...args: unknown[]) => runTikTokHashtagMiningMock(...args) };
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
  return { ...actual, runGoogleTrendsMining: (...args: unknown[]) => runGoogleTrendsMiningMock(...args) };
});

const {
  isAuthorized,
  checkRateLimit,
  recordCall,
  runMiningBridge,
  __resetMiningBridgeRateLimitForTests,
} = await import("./mining-bridge");

beforeEach(() => {
  runTikTokHashtagMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  runInstagramMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  runYouTubeMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  runGoogleTrendsMiningMock.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 });
  __resetMiningBridgeRateLimitForTests();
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
    expect(runTikTokHashtagMiningMock).toHaveBeenCalledWith({ hashtag: "N8N", limit: 10 }, "user-1");
    expect(runInstagramMiningMock).not.toHaveBeenCalled();
    expect(runYouTubeMiningMock).not.toHaveBeenCalled();
    expect(runGoogleTrendsMiningMock).not.toHaveBeenCalled();
  });

  it("instagram chama runInstagramMining com {search, searchType, resultsType, limit}", async () => {
    await runMiningBridge(
      { source: "instagram", term: "automacao", searchType: "hashtag", resultsType: "reels", limit: 25 },
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
    expect(runTikTokHashtagMiningMock.getMockName()).toBeTruthy();
    // Confirms these are vi.fn() mocks, not the real network-calling implementations.
    expect(vi.isMockFunction(runTikTokHashtagMiningMock)).toBe(true);
    expect(vi.isMockFunction(runInstagramMiningMock)).toBe(true);
    expect(vi.isMockFunction(runYouTubeMiningMock)).toBe(true);
    expect(vi.isMockFunction(runGoogleTrendsMiningMock)).toBe(true);
  });
});

describe("checkRateLimit / recordCall — proteção contra disparos abusivos/repetidos", () => {
  it("permite a primeira chamada de uma fonte", () => {
    expect(checkRateLimit("tiktok", 1_000_000).allowed).toBe(true);
  });

  it("bloqueia uma segunda chamada da MESMA fonte dentro do intervalo mínimo", () => {
    const t0 = 1_000_000;
    recordCall("tiktok", t0);
    const check = checkRateLimit("tiktok", t0 + 5_000); // 5s depois
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/aguarde/i);
  });

  it("permite novamente após o intervalo mínimo passar", () => {
    const t0 = 1_000_000;
    recordCall("tiktok", t0);
    const check = checkRateLimit("tiktok", t0 + 61_000); // 61s depois
    expect(check.allowed).toBe(true);
  });

  it("uma fonte diferente não é afetada pelo limite de outra (rate limit é por fonte)", () => {
    recordCall("tiktok", 1_000_000);
    expect(checkRateLimit("instagram", 1_000_001).allowed).toBe(true);
  });

  it("bloqueia após atingir o limite de chamadas por hora, mesmo respeitando o intervalo mínimo", () => {
    const base = 1_000_000;
    for (let i = 0; i < 10; i++) {
      const t = base + i * 61_000; // respects the 60s min interval each time
      expect(checkRateLimit("youtube", t).allowed).toBe(true);
      recordCall("youtube", t);
    }
    const eleventh = base + 10 * 61_000;
    const check = checkRateLimit("youtube", eleventh);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/limite/i);
  });
});
