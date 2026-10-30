import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendIntelligence, validateBeforeSend, isCrisOsConfigured, healthCheck } from "./client";
import type { MarketIntelligenceHandoff } from "./contract";

const VALID_HANDOFF: MarketIntelligenceHandoff = {
  handoff_id: "ho_abc123",
  schema_version: "1.0",
  source_system: "scalaflow",
  source_module: "tiktok_escalate",
  created_at: "2026-01-01T00:00:00.000Z",
  opportunity_id: "tiktok:vid1",
  title: "Ad title",
  market: "UNKNOWN",
  niche: "UNKNOWN",
  subniche: "UNKNOWN",
  country: "UNKNOWN",
  language: "UNKNOWN",
  description: null,
  trend_signals: {},
  demand_signals: {},
  competition_signals: {},
  ad_signals: {},
  social_signals: { views: 100 },
  search_signals: {},
  product_name: null,
  offer_type: null,
  price: null,
  currency: null,
  commission: null,
  platform: "TikTok",
  sales_page_url: null,
  competitors: [],
  competitor_urls: [],
  observed_offers: [],
  evidence: [
    {
      source_type: "TIKTOK",
      source_name: "TikTok",
      source_url: "https://tiktok.com/@x/video/1",
      captured_at: "2026-01-01T00:00:00.000Z",
      raw_reference: "vid1",
      metric_name: "views",
      metric_value: "100",
      metric_unit: "count",
      evidence_type: "OBSERVED",
      confidence_level: "UNKNOWN",
    },
  ],
  confidence_score: null,
  confidence_level: "UNKNOWN",
  confidence_reason: null,
  opportunity_score: 88,
  score_components: { viral_score: 88 },
  scoring_version: null,
  tags: [],
  notes: [],
  warnings: [],
};

const REAL_FETCH = global.fetch;

beforeEach(() => {
  vi.stubEnv("CRIS_OS_API_URL", "https://cris-os.example.com/api/intelligence/handoff");
  vi.stubEnv("CRIS_OS_INTEGRATION_TOKEN", "test-token-do-not-log");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  global.fetch = REAL_FETCH;
});

describe("validateBeforeSend", () => {
  it("aceita um payload válido", () => {
    expect(validateBeforeSend(VALID_HANDOFF)).toBeNull();
  });

  it("rejeita payload sem handoff_id", () => {
    expect(validateBeforeSend({ ...VALID_HANDOFF, handoff_id: "" })).toMatch(/handoff_id/);
  });

  it("rejeita payload sem opportunity_id", () => {
    const bad = { ...VALID_HANDOFF, opportunity_id: "" };
    expect(validateBeforeSend(bad)).toMatch(/opportunity_id/);
  });
});

describe("isCrisOsConfigured", () => {
  it("true quando URL e token existem", () => {
    expect(isCrisOsConfigured()).toBe(true);
  });

  it("false quando falta CRIS_OS_API_URL", () => {
    vi.stubEnv("CRIS_OS_API_URL", "");
    expect(isCrisOsConfigured()).toBe(false);
  });

  it("false quando falta CRIS_OS_INTEGRATION_TOKEN", () => {
    vi.stubEnv("CRIS_OS_INTEGRATION_TOKEN", "");
    expect(isCrisOsConfigured()).toBe(false);
  });
});

describe("sendIntelligence — configuração ausente falha de forma segura", () => {
  it("falha sem lançar quando CRIS_OS_API_URL ausente", async () => {
    vi.stubEnv("CRIS_OS_API_URL", "");
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.retryable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falha sem lançar quando CRIS_OS_INTEGRATION_TOKEN ausente", async () => {
    vi.stubEnv("CRIS_OS_INTEGRATION_TOKEN", "");
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("sendIntelligence — sucesso e autenticação", () => {
  it("envia com Authorization Bearer correto e nenhuma chamada real", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendIntelligence(VALID_HANDOFF);

    expect(result).toMatchObject({
      ok: true,
      status: "SENT",
      httpStatus: 200,
      retryable: false,
      attempts: 1,
    });
    // Fase 1: o corpo de sucesso é lido (antes era descartado). Corpo "ok"
    // não é JSON → sem referências remotas, mas o campo existe sempre.
    expect(result.remote).toMatchObject({
      mission_id: null,
      execution_id: null,
      remote_status: null,
      review_url: null,
      result_files: [],
    });
    expect(typeof result.remote?.received_at).toBe("string");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://cris-os.example.com/api/intelligence/handoff");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer test-token-do-not-log",
    );

    // Token must never leak into the payload body itself.
    const sentBody = JSON.parse(init.body as string);
    expect(JSON.stringify(sentBody)).not.toContain("test-token-do-not-log");
  });
});

describe("sendIntelligence — erros não-transitórios (sem retry)", () => {
  it("401 falha imediatamente, sem retry", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(401);
    expect(result.retryable).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("400 (payload/schema inválido) falha imediatamente, sem retry", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(400);
    expect(result.retryable).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("500 não está na lista de transitórios do contrato — sem retry", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.retryable).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("sendIntelligence — erros transitórios (retry limitado)", () => {
  it("429 tenta novamente e eventualmente falha com limite (sem loop infinito)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(429);
    expect(result.retryable).toBe(true);
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(3);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  }, 10000);

  it("503 tenta novamente com limite e depois retorna sucesso se um retry funcionar", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF);
    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  }, 10000);

  it("timeout (AbortError) é tratado como transitório e não escala", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
      );
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await sendIntelligence(VALID_HANDOFF, { timeoutMs: 50 });
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(true);
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(3);
  }, 10000);
});

describe("healthCheck", () => {
  it("false sem configuração, sem chamada de rede", async () => {
    vi.stubEnv("CRIS_OS_API_URL", "");
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    expect(await healthCheck()).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("true quando o endpoint responde (mesmo com status não-2xx)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
    expect(await healthCheck()).toBe(true);
  });

  it("false em erro de rede", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    global.fetch = fetchSpy as unknown as typeof fetch;
    expect(await healthCheck()).toBe(false);
  });
});
