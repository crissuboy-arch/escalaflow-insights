import { describe, it, expect } from "vitest";
import {
  buildHandoffFromTikTokEscalate,
  computeHandoffId,
  UNKNOWN,
  type TikTokEscalateRow,
} from "./contract";

const BASE_ROW: TikTokEscalateRow = {
  id: "row-uuid-1",
  video_id: "7123456789",
  creator: "criador_x",
  hook: "Você não vai acreditar nisso",
  description: "Descrição completa do vídeo",
  video_url: "https://www.tiktok.com/@criador_x/video/7123456789",
  thumbnail_url: "https://p16.tiktokcdn.com/thumb.jpg",
  views: 150000,
  likes: 12000,
  comments: 340,
  shares: 900,
  viral_score: 87,
  enhanced_score: 91,
  hashtags: ["#emagrecimento", "#dieta"],
  tags: ["Nutra"],
  notes: null,
  ai_analysis: {
    niche: "emagrecimento feminino 30+",
    produto_detectado: "Chá termogênico",
    formato_vsl: "Gancho direto 15s",
  },
  playbook: { headline: "Emagreça sem dieta" },
  scaled_at: "2026-09-20T10:00:00.000Z",
};

describe("computeHandoffId", () => {
  it("é determinístico para a mesma origem", () => {
    const a = computeHandoffId("tiktok_escalate", "tiktok:123");
    const b = computeHandoffId("tiktok_escalate", "tiktok:123");
    expect(a).toBe(b);
  });

  it("muda quando o opportunity_id muda", () => {
    const a = computeHandoffId("tiktok_escalate", "tiktok:123");
    const b = computeHandoffId("tiktok_escalate", "tiktok:456");
    expect(a).not.toBe(b);
  });

  it("gera o mesmo id em múltiplos retries do mesmo evento (idempotência)", () => {
    const ids = Array.from({ length: 5 }, () => computeHandoffId("tiktok_escalate", "tiktok:123"));
    expect(new Set(ids).size).toBe(1);
  });
});

describe("buildHandoffFromTikTokEscalate", () => {
  it("envia evidence como lista de objetos (contrato real do Cris OS)", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(Array.isArray(h.evidence)).toBe(true);
    expect(h.evidence.length).toBeGreaterThan(0);
    h.evidence.forEach((item) => expect(typeof item).toBe("object"));
  });

  it("preserva evidence/provenance reais (plataforma, módulo, URL original, data, métrica)", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    const [ev] = h.evidence;
    expect(ev.platform).toBe("TikTok");
    expect(ev.module).toBe("tiktok_escalate");
    expect(ev.original_url).toBe(BASE_ROW.video_url);
    expect(ev.collected_at).toBe(BASE_ROW.scaled_at);
    expect(ev.original_reference).toBe(BASE_ROW.video_id);
    expect(ev.observed_metric).toMatchObject({
      views: 150000,
      likes: 12000,
      comments: 340,
      shares: 900,
    });
  });

  it("nunca marca TikTok como outra plataforma", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.offer.platform).toBe("TikTok");
    expect(h.evidence[0].platform).toBe("TikTok");
  });

  it("usa UNKNOWN para campos categóricos que o TikTok collector não captura", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.opportunity.market).toBe(UNKNOWN);
    expect(h.opportunity.subniche).toBe(UNKNOWN);
    expect(h.opportunity.country).toBe(UNKNOWN);
    expect(h.opportunity.language).toBe(UNKNOWN);
  });

  it("usa null (não inventa) para preço/moeda/comissão/sales_page_url ausentes", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.offer.price).toBeNull();
    expect(h.offer.currency).toBeNull();
    expect(h.offer.commission).toBeNull();
    expect(h.offer.sales_page_url).toBeNull();
    expect(h.confidence).toBeNull();
  });

  it("usa null para categorias de sinal que o ScalaFlow não produz, mas preserva social_signals reais", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.signals.trend_signals).toBeNull();
    expect(h.signals.demand_signals).toBeNull();
    expect(h.signals.competition_signals).toBeNull();
    expect(h.signals.ad_signals).toBeNull();
    expect(h.signals.search_signals).toBeNull();
    expect(h.signals.social_signals).toMatchObject({ views: 150000, likes: 12000 });
  });

  it("extrai niche/produto/formato do ai_analysis quando disponível, sem inventar quando ausente", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.opportunity.niche).toBe("emagrecimento feminino 30+");
    expect(h.offer.product_name).toBe("Chá termogênico");
    expect(h.offer.offer_type).toBe("Gancho direto 15s");

    const rowSemAi = { ...BASE_ROW, ai_analysis: null };
    const h2 = buildHandoffFromTikTokEscalate(rowSemAi);
    expect(h2.opportunity.niche).toBe(UNKNOWN);
    expect(h2.offer.product_name).toBeNull();
    expect(h2.offer.offer_type).toBeNull();
  });

  it("usa o mesmo handoff_id para a mesma linha em chamadas repetidas (retry-safe)", () => {
    const h1 = buildHandoffFromTikTokEscalate(BASE_ROW);
    const h2 = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h1.handoff_id).toBe(h2.handoff_id);
    expect(h1.opportunity.opportunity_id).toBe(h2.opportunity.opportunity_id);
  });

  it("preserva score real em scoring.escalaflow_score, sem inventar confidence", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.scoring.escalaflow_score).toBe(91);
  });

  it("payload nunca contém um token/segredo", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    const serialized = JSON.stringify(h).toLowerCase();
    expect(serialized).not.toMatch(/token|bearer|secret|service_role/);
  });
});
