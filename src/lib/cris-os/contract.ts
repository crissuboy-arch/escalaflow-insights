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

  return {
    handoff_id: computeHandoffId("tiktok_escalate", opportunityId),
    schema_version: SCHEMA_VERSION,
    source_system: SOURCE_SYSTEM,
    source_module: "tiktok_escalate",
    created_at: new Date().toISOString(),

    opportunity: {
      opportunity_id: opportunityId,
      title: (row.hook || row.description || "Anúncio TikTok").slice(0, 200),
      market: UNKNOWN,
      niche: typeof ai.niche === "string" ? ai.niche : UNKNOWN,
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
    scoring: { escalaflow_score: row.enhanced_score || row.viral_score || null },
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
