import { describe, it, expect } from "vitest";
import {
  buildHandoffFromTikTokEscalate,
  buildHandoffFromCollectedAd,
  computeHandoffId,
  UNKNOWN,
  type TikTokEscalateRow,
  type CollectedAdRow,
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

// NOTA: o contrato é FLAT (campos no nível raiz do handoff), não aninhado em
// opportunity/offer/signals/scoring. Essa é a correção real (PR "Integração
// inicial ScalaFlow ↔ Cris OS", commit 3ed7e16) para um bug de produção em
// que esses campos, antes aninhados, chegavam null ao Cris OS mesmo havendo
// dado real no ScalaFlow — ver a suite "regressão do bug real (Suitable...)"
// abaixo, que guarda exatamente essa garantia.
describe("buildHandoffFromTikTokEscalate", () => {
  it("envia evidence como lista de objetos (contrato real do Cris OS)", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(Array.isArray(h.evidence)).toBe(true);
    expect(h.evidence.length).toBeGreaterThan(0);
    h.evidence.forEach((item) => expect(typeof item).toBe("object"));
  });

  it("preserva evidence/provenance reais (plataforma, URL original, data, métrica)", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    const [ev] = h.evidence;
    expect(ev.source_type).toBe("TIKTOK");
    expect(ev.source_name).toBe("TikTok");
    expect(ev.source_url).toBe(BASE_ROW.video_url);
    expect(ev.captured_at).toBe(BASE_ROW.scaled_at);
    expect(ev.raw_reference).toBe(BASE_ROW.video_id);
    expect(ev.metric_name).toBe("views");
    expect(ev.metric_value).toBe(String(BASE_ROW.views));
  });

  it("nunca marca TikTok como outra plataforma", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.platform).toBe("TikTok");
    expect(h.evidence[0].source_name).toBe("TikTok");
  });

  it("usa UNKNOWN para campos categóricos que o TikTok collector não captura", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.market).toBe(UNKNOWN);
    expect(h.subniche).toBe(UNKNOWN);
    expect(h.country).toBe(UNKNOWN);
    expect(h.language).toBe(UNKNOWN);
  });

  it("usa null (não inventa) para preço/moeda/comissão/sales_page_url ausentes", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.price).toBeNull();
    expect(h.currency).toBeNull();
    expect(h.commission).toBeNull();
    expect(h.sales_page_url).toBeNull();
    expect(h.confidence_score).toBeNull();
  });

  it("usa {} para categorias de sinal que o ScalaFlow não produz, mas preserva social_signals reais", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.trend_signals).toEqual({});
    expect(h.demand_signals).toEqual({});
    expect(h.competition_signals).toEqual({});
    expect(h.ad_signals).toEqual({});
    expect(h.search_signals).toEqual({});
    expect(h.social_signals).toMatchObject({ views: 150000, likes: 12000 });
  });

  it("extrai niche/produto/formato do ai_analysis quando disponível, sem inventar quando ausente", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.niche).toBe("emagrecimento feminino 30+");
    expect(h.product_name).toBe("Chá termogênico");
    expect(h.offer_type).toBe("Gancho direto 15s");

    const rowSemAi = { ...BASE_ROW, ai_analysis: null };
    const h2 = buildHandoffFromTikTokEscalate(rowSemAi);
    expect(h2.niche).toBe(UNKNOWN);
    expect(h2.product_name).toBeNull();
    expect(h2.offer_type).toBeNull();
  });

  it("usa o mesmo handoff_id para a mesma linha em chamadas repetidas (retry-safe)", () => {
    const h1 = buildHandoffFromTikTokEscalate(BASE_ROW);
    const h2 = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h1.handoff_id).toBe(h2.handoff_id);
    expect(h1.opportunity_id).toBe(h2.opportunity_id);
  });

  it("preserva score real em score_components, sem inventar confidence", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.score_components).toMatchObject({ viral_score: 87, enhanced_score: 91 });
    expect(h.opportunity_score).toBe(91);
    expect(h.confidence_score).toBeNull();
  });

  it("payload nunca contém um token/segredo", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    const serialized = JSON.stringify(h).toLowerCase();
    expect(serialized).not.toMatch(/token|bearer|secret|service_role/);
  });

  it("título/plataforma/score ficam no nível RAIZ do payload (campos que o Cris OS lê ali, nunca aninhados)", () => {
    const h = buildHandoffFromTikTokEscalate(BASE_ROW);
    expect(h.title).toBe(BASE_ROW.hook);
    expect(h.platform).toBe("TikTok");
    expect(h.opportunity_score).toBe(91);
    expect(h.market).toBe(UNKNOWN);
    expect(h.price).toBeNull();
    expect(h.confidence_score).toBeNull();
  });
});

const COLLECTED_AD_ROW: CollectedAdRow = {
  id: "ad-uuid-1",
  ad_library_id: "123456789",
  ad_url: "https://www.facebook.com/ads/library/?id=123456789",
  advertiser: "Soldiers Nutrition",
  headline: "Ômega 3 para saúde cardiovascular",
  copy: "Descubra o poder do Ômega 3...",
  cta: "Shop now",
  image_url: "https://scontent.fna.fbcdn.net/img.jpg",
  video_url: null,
  platform: "Facebook",
  country: "BR",
  niche: "Saúde",
  score: 84,
  created_at: "2026-09-15T00:00:00.000Z",
  landing_page_url: "https://soldiersnutrition.com.br/produto",
  offer_network: "checkout-proprio",
  offer_network_confidence: "baixa",
  first_seen_at: "2026-09-10T00:00:00.000Z",
  last_seen_at: "2026-09-15T00:00:00.000Z",
  start_date: null,
};

describe("buildHandoffFromCollectedAd", () => {
  it("envia evidence como lista de objetos, igual ao mapper do TikTok", () => {
    const h = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    expect(Array.isArray(h.evidence)).toBe(true);
    expect(h.evidence[0].source_name).toBe("Facebook");
  });

  it("usa handoff_id determinístico e reutiliza o mesmo computeHandoffId", () => {
    const h1 = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    const h2 = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    expect(h1.handoff_id).toBe(h2.handoff_id);
    expect(h1.handoff_id).toBe(
      computeHandoffId("collected_ad_transform", `facebook:${COLLECTED_AD_ROW.ad_library_id}`),
    );
  });

  it("preserva país/nicho reais quando existem, sem inventar quando ausentes", () => {
    const h = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    expect(h.country).toBe("BR");
    expect(h.niche).toBe("Saúde");

    const rowSemDados = { ...COLLECTED_AD_ROW, country: "—", niche: "Geral" };
    const h2 = buildHandoffFromCollectedAd(rowSemDados);
    expect(h2.country).toBe(UNKNOWN);
    expect(h2.niche).toBe(UNKNOWN);
  });

  it("preserva a landing page real em sales_page_url, sem inventar preço/moeda/comissão", () => {
    const h = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    expect(h.sales_page_url).toBe(COLLECTED_AD_ROW.landing_page_url);
    expect(h.price).toBeNull();
    expect(h.currency).toBeNull();
    expect(h.commission).toBeNull();
  });

  it("preserva evidence/provenance (URL do anúncio, referência original, first_seen_at)", () => {
    const h = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    const [ev] = h.evidence;
    expect(ev.source_url).toBe(COLLECTED_AD_ROW.ad_url);
    expect(ev.raw_reference).toBe(COLLECTED_AD_ROW.ad_library_id);
    expect(ev.captured_at).toBe(COLLECTED_AD_ROW.first_seen_at);
  });

  it("nunca contém token/segredo no payload", () => {
    const h = buildHandoffFromCollectedAd(COLLECTED_AD_ROW);
    const serialized = JSON.stringify(h).toLowerCase();
    expect(serialized).not.toMatch(/token|bearer|secret|service_role/);
  });
});

// Fixture real que reproduz o bug relatado: primeiro clique real em
// "Transformar em Projeto" (Suitable, Facebook, score 99) chegou no Cris OS
// com title/market/niche/platform/price/opportunity_score/confidence_score
// nulos, mesmo com dado real disponível no ScalaFlow — porque esses campos
// estavam aninhados em opportunity/offer/scoring e o Cris OS lê-os no nível
// raiz. evidence (lista) e a persistência/autenticação funcionaram; só esses
// campos não chegavam. O contrato atual é FLAT, exatamente por isto.
const SUITABLE_ROW: CollectedAdRow = {
  id: "suitable-ad-uuid",
  ad_library_id: "999888777",
  ad_url: "https://www.facebook.com/ads/library/?id=999888777",
  advertiser: "Suitable",
  headline: "Suitable — oferta real de alta pontuação",
  copy: "Copy real da oferta Suitable capturada pelo coletor.",
  cta: "Learn more",
  image_url: "https://scontent.fna.fbcdn.net/suitable.jpg",
  video_url: null,
  platform: "Facebook",
  country: "US",
  niche: "Fitness",
  score: 99,
  created_at: "2026-09-21T18:00:00.000Z",
  landing_page_url: "https://suitable.example.com/offer",
  offer_network: null,
  offer_network_confidence: null,
  first_seen_at: "2026-09-21T18:00:00.000Z",
  last_seen_at: "2026-09-21T19:20:00.000Z",
  start_date: null,
};

describe("buildHandoffFromCollectedAd — regressão do bug real (Suitable, Facebook, score 99)", () => {
  it("popula title/market/niche/platform/opportunity_score no NÍVEL RAIZ com dado real, não null", () => {
    const h = buildHandoffFromCollectedAd(SUITABLE_ROW);
    expect(h.title).toBe("Suitable — oferta real de alta pontuação");
    expect(h.title).not.toBeNull();
    expect(h.market).toBe("US");
    expect(h.niche).toBe("Fitness");
    expect(h.platform).toBe("Facebook");
    expect(h.opportunity_score).toBe(99);
  });

  it("mantém price e confidence_score null quando não há dado real (nunca inventa)", () => {
    const h = buildHandoffFromCollectedAd(SUITABLE_ROW);
    expect(h.price).toBeNull();
    expect(h.confidence_score).toBeNull();
  });

  it("mantém evidence como lista de objetos, consistente com os campos raiz", () => {
    const h = buildHandoffFromCollectedAd(SUITABLE_ROW);
    expect(Array.isArray(h.evidence)).toBe(true);
    expect(h.evidence[0].source_name).toBe("Facebook");
    expect(h.score_components).toMatchObject({ scalaflow_score: h.opportunity_score });
  });

  it("source_id/source_table corretos e idempotência preservada", () => {
    const h1 = buildHandoffFromCollectedAd(SUITABLE_ROW);
    const h2 = buildHandoffFromCollectedAd(SUITABLE_ROW);
    expect(h1.handoff_id).toBe(h2.handoff_id);
    expect(h1.opportunity_id).toBe(`facebook:${SUITABLE_ROW.ad_library_id}`);
  });

  it("nenhum segredo no payload da Suitable", () => {
    const h = buildHandoffFromCollectedAd(SUITABLE_ROW);
    const serialized = JSON.stringify(h).toLowerCase();
    expect(serialized).not.toMatch(/token|bearer|secret|service_role/);
  });
});
