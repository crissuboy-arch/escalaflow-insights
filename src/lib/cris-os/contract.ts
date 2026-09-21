// MarketIntelligenceHandoff — contract shared with Cris OS (Fase 9).
// ScalaFlow only ever fills fields it actually has evidence for. Anything
// not captured by the source mining pipeline is explicitly "UNKNOWN" (for
// enum-like/categorical fields) or `null` (for typed/optional values) —
// never fabricated, never inferred as fact.
import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "1.0";
export const SOURCE_SYSTEM = "scalaflow";

export const UNKNOWN = "UNKNOWN" as const;

export interface EvidenceItem {
  platform: string;
  module: string;
  original_url: string | null;
  collected_at: string;
  observed_metric: Record<string, unknown> | null;
  original_reference: string | null;
}

export interface MarketIntelligenceHandoff {
  handoff_id: string;
  schema_version: string;
  source_system: string;
  source_module: string;
  created_at: string;

  // Root-level mirrors of opportunity.title/market/niche, offer.platform/price
  // and scoring/confidence — added 2026-09-21 after the first real handoff
  // (Suitable, Facebook, score 99) arrived at Cris OS with these seven
  // fields null. `evidence` (root-level, strictly validated) came through
  // correctly; everything nested under opportunity/offer/scoring did not.
  // Cris OS's receiver reads these as flat root properties with these exact
  // names, not the nested ones — confirmed by which fields failed vs. which
  // (evidence) didn't. Purely additive: nothing nested is removed, so any
  // other Cris OS consumer relying on the nested shape is unaffected.
  title: string;
  market: string;
  niche: string;
  platform: string;
  price: number | null;
  opportunity_score: number | null;
  confidence_score: number | null;

  opportunity: {
    opportunity_id: string;
    title: string;
    market: string;
    niche: string;
    subniche: string;
    country: string;
    language: string;
    description: string | null;
  };

  signals: {
    trend_signals: Record<string, unknown> | null;
    demand_signals: Record<string, unknown> | null;
    competition_signals: Record<string, unknown> | null;
    ad_signals: Record<string, unknown> | null;
    social_signals: Record<string, unknown> | null;
    search_signals: Record<string, unknown> | null;
  };

  offer: {
    product_name: string | null;
    offer_type: string | null;
    price: number | null;
    currency: string | null;
    commission: number | null;
    platform: string;
    sales_page_url: string | null;
  };

  competition: Record<string, unknown> | null;

  // Cris OS's real receiver validates this as a LIST of evidence objects
  // (confirmed 2026-09-21: a synthetic handoff sent with `evidence` as a
  // single object was REJECTED with "evidence[0..N] deve ser um objeto/dict"
  // for each top-level key — i.e. it iterated our object as if it were a
  // list). ScalaFlow has exactly one piece of evidence per handoff today, so
  // this is a one-item list — never invented, never split arbitrarily.
  evidence: EvidenceItem[];

  confidence: number | null;
  scoring: { escalaflow_score: number | null };
  meta: Record<string, unknown> | null;
}

/** Deterministic handoff_id — same (source_system, source_module, opportunity_id)
 *  always produces the same id, so a retry of the same event never creates a
 *  duplicate opportunity on the Cris OS side. */
export function computeHandoffId(sourceModule: string, opportunityId: string): string {
  const hash = createHash("sha256")
    .update(`${SOURCE_SYSTEM}:${sourceModule}:${opportunityId}`)
    .digest("hex")
    .slice(0, 24);
  return `ho_${hash}`;
}

export interface TikTokEscalateRow {
  id: string;
  video_id: string;
  creator: string;
  hook: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  viral_score: number;
  enhanced_score: number;
  hashtags: string[] | null;
  tags: string[] | null;
  notes: string | null;
  ai_analysis: Record<string, unknown> | null;
  playbook: Record<string, unknown> | null;
  scaled_at: string;
}

/** Maps a row from anuncios_escalados (TikTok "Escalar" action) into the
 *  Cris OS contract. This is the ONLY mapper wired to a real trigger today —
 *  see extension/README.md-style notes in cris-os/README.md for how to add
 *  the other platforms without touching their mining logic. */
export function buildHandoffFromTikTokEscalate(row: TikTokEscalateRow): MarketIntelligenceHandoff {
  const opportunityId = `tiktok:${row.video_id || row.id}`;
  const ai = row.ai_analysis ?? {};
  const tiktokTitle = (row.hook || row.description || "Anúncio TikTok").slice(0, 200);
  const tiktokNiche = typeof ai.niche === "string" ? ai.niche : UNKNOWN;
  const tiktokScore = row.enhanced_score || row.viral_score || null;

  return {
    handoff_id: computeHandoffId("tiktok_escalate", opportunityId),
    schema_version: SCHEMA_VERSION,
    source_system: SOURCE_SYSTEM,
    source_module: "tiktok_escalate",
    created_at: new Date().toISOString(),

    title: tiktokTitle,
    market: UNKNOWN,
    niche: tiktokNiche,
    platform: "TikTok",
    price: null,
    opportunity_score: tiktokScore,
    confidence_score: null,

    opportunity: {
      opportunity_id: opportunityId,
      title: tiktokTitle,
      market: UNKNOWN,
      niche: tiktokNiche,
      subniche: UNKNOWN,
      country: UNKNOWN,
      language: UNKNOWN,
      description: row.description || null,
    },

    signals: {
      trend_signals: null,
      demand_signals: null,
      competition_signals: null,
      ad_signals: null,
      social_signals: {
        views: row.views ?? 0,
        likes: row.likes ?? 0,
        comments: row.comments ?? 0,
        shares: row.shares ?? 0,
        viral_score: row.viral_score ?? null,
        enhanced_score: row.enhanced_score ?? null,
      },
      search_signals: null,
    },

    offer: {
      product_name: typeof ai.produto_detectado === "string" ? ai.produto_detectado : null,
      offer_type: typeof ai.formato_vsl === "string" ? ai.formato_vsl : null,
      price: null,
      currency: null,
      commission: null,
      platform: "TikTok",
      sales_page_url: null,
    },

    competition: null,

    evidence: [
      {
        platform: "TikTok",
        module: "tiktok_escalate",
        original_url: row.video_url || null,
        collected_at: row.scaled_at,
        observed_metric: {
          views: row.views ?? 0,
          likes: row.likes ?? 0,
          comments: row.comments ?? 0,
          shares: row.shares ?? 0,
        },
        original_reference: row.video_id || null,
      },
    ],

    confidence: null,
    scoring: { escalaflow_score: tiktokScore },
    meta: {
      creator: row.creator || null,
      hashtags: row.hashtags ?? [],
      tags: row.tags ?? [],
      notes: row.notes || null,
      ai_analysis: row.ai_analysis ?? null,
      playbook: row.playbook ?? null,
    },
  };
}

export interface CollectedAdRow {
  id: string;
  ad_library_id: string | null;
  ad_url: string | null;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  image_url: string | null;
  video_url: string | null;
  platform: string;
  country: string;
  niche: string;
  score: number;
  created_at: string;
  landing_page_url?: string | null;
  offer_network?: string | null;
  offer_network_confidence?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  start_date?: string | null;
}

/** Maps a row from collected_ads (Facebook/collector pipeline — the data
 *  behind "Análise IA" and "Ofertas Escaladas") into the same Cris OS
 *  contract used by TikTok. Second producer, same transport/contract —
 *  nothing in client.ts/service.ts/the schema changes for this. */
export function buildHandoffFromCollectedAd(row: CollectedAdRow): MarketIntelligenceHandoff {
  const identity = row.ad_library_id || row.ad_url || row.id;
  const platform = row.platform || "Unknown";
  const opportunityId = `${platform.toLowerCase()}:${identity}`;
  const hasCountry = !!row.country && row.country !== "—";
  const hasNiche = !!row.niche && row.niche !== "Geral";
  const title = (row.headline || row.advertiser || "Oportunidade").slice(0, 200);
  const market = hasCountry ? row.country : UNKNOWN;
  const niche = hasNiche ? row.niche : UNKNOWN;
  const opportunityScore = row.score ?? null;

  return {
    handoff_id: computeHandoffId("collected_ad_transform", opportunityId),
    schema_version: SCHEMA_VERSION,
    source_system: SOURCE_SYSTEM,
    source_module: "collected_ad_transform",
    created_at: new Date().toISOString(),

    title,
    market,
    niche,
    platform,
    price: null,
    opportunity_score: opportunityScore,
    confidence_score: null,

    opportunity: {
      opportunity_id: opportunityId,
      title,
      market,
      niche,
      subniche: UNKNOWN,
      country: market,
      language: UNKNOWN,
      description: row.copy || null,
    },

    signals: {
      trend_signals: null,
      demand_signals: null,
      competition_signals: null,
      ad_signals: null,
      social_signals: null,
      search_signals: null,
    },

    offer: {
      product_name: null,
      offer_type: null,
      price: null,
      currency: null,
      commission: null,
      platform,
      sales_page_url: row.landing_page_url || null,
    },

    competition: null,

    evidence: [
      {
        platform,
        module: "collected_ad_transform",
        original_url: row.ad_url || null,
        collected_at: row.first_seen_at || row.created_at,
        observed_metric: null,
        original_reference: row.ad_library_id || row.id,
      },
    ],

    confidence: null,
    scoring: { escalaflow_score: opportunityScore },
    meta: {
      advertiser: row.advertiser || null,
      cta: row.cta || null,
      image_url: row.image_url || null,
      video_url: row.video_url || null,
      offer_network: row.offer_network ?? null,
      offer_network_confidence: row.offer_network_confidence ?? null,
      first_seen_at: row.first_seen_at ?? null,
      last_seen_at: row.last_seen_at ?? null,
      start_date: row.start_date ?? null,
    },
  };
}
