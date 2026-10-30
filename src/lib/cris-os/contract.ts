// Contract aligned with Cris OS memory/project_brain.py:MarketIntelligenceHandoff.
// Only send fields Cris OS actually accepts; keep source evidence explicit.
import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "1.0";
export const SOURCE_SYSTEM = "SCALAFLOW";
export const UNKNOWN = "UNKNOWN" as const;

export interface EvidenceItem {
  evidence_id?: string;
  source_type: string | null;
  source_name: string | null;
  source_url: string | null;
  captured_at: string | null;
  raw_reference: string | null;
  metric_name: string | null;
  metric_value: string | null;
  metric_unit: string | null;
  evidence_type: "OBSERVED" | "DERIVED" | "INFERRED" | "UNKNOWN";
  confidence_level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
}

export interface MarketIntelligenceHandoff {
  handoff_id: string;
  schema_version: string;
  source_system: string;
  source_module: string;
  created_at: string;
  project_id?: string | null;
  external_project_ref?: string | null;
  opportunity_id: string;
  title: string;
  market: string | null;
  niche: string | null;
  subniche: string | null;
  country: string | null;
  language: string | null;
  description: string | null;
  trend_signals: Record<string, unknown>;
  demand_signals: Record<string, unknown>;
  competition_signals: Record<string, unknown>;
  ad_signals: Record<string, unknown>;
  social_signals: Record<string, unknown>;
  search_signals: Record<string, unknown>;
  product_name: string | null;
  offer_type: string | null;
  price: string | null;
  currency: string | null;
  commission: string | null;
  platform: string | null;
  sales_page_url: string | null;
  competitors: string[];
  competitor_urls: string[];
  observed_offers: string[];
  evidence: EvidenceItem[];
  confidence_score: number | null;
  confidence_level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  confidence_reason: string | null;
  opportunity_score: number | null;
  score_components: Record<string, unknown>;
  scoring_version: string | null;
  tags: string[];
  notes: string[];
  warnings: string[];
}

export function computeHandoffId(sourceModule: string, opportunityId: string): string {
  const hash = createHash("sha256")
    .update(`${SOURCE_SYSTEM.toLowerCase()}:${sourceModule}:${opportunityId}`)
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

function safeScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function evidence(
  sourceType: string,
  sourceName: string,
  sourceUrl: string | null,
  capturedAt: string | null,
  rawReference: string | null,
  metricName: string | null,
  metricValue: string | null,
  metricUnit: string | null,
): EvidenceItem {
  return {
    source_type: sourceType,
    source_name: sourceName,
    source_url: sourceUrl,
    captured_at: capturedAt,
    raw_reference: rawReference,
    metric_name: metricName,
    metric_value: metricValue,
    metric_unit: metricUnit,
    evidence_type: "OBSERVED",
    confidence_level: "UNKNOWN",
  };
}

export function buildHandoffFromTikTokEscalate(row: TikTokEscalateRow): MarketIntelligenceHandoff {
  const ai = row.ai_analysis ?? {};
  const opportunityId = `tiktok:${row.video_id || row.id}`;
  const title = (row.hook || row.description || "Anúncio TikTok").slice(0, 200);
  const score = safeScore(row.enhanced_score || row.viral_score);
  const niche = typeof ai.niche === "string" ? ai.niche : UNKNOWN;

  return {
    handoff_id: computeHandoffId("tiktok_escalate", opportunityId),
    schema_version: SCHEMA_VERSION,
    source_system: SOURCE_SYSTEM,
    source_module: "tiktok_escalate",
    created_at: new Date().toISOString(),
    external_project_ref: row.id,
    opportunity_id: opportunityId,
    title,
    market: UNKNOWN,
    niche,
    subniche: UNKNOWN,
    country: UNKNOWN,
    language: UNKNOWN,
    description: row.description || null,
    trend_signals: {},
    demand_signals: {},
    competition_signals: {},
    ad_signals: {},
    social_signals: {
      views: row.views ?? 0,
      likes: row.likes ?? 0,
      comments: row.comments ?? 0,
      shares: row.shares ?? 0,
      viral_score: row.viral_score ?? null,
      enhanced_score: row.enhanced_score ?? null,
    },
    search_signals: {},
    product_name: typeof ai.produto_detectado === "string" ? ai.produto_detectado : null,
    offer_type: typeof ai.formato_vsl === "string" ? ai.formato_vsl : null,
    price: null,
    currency: null,
    commission: null,
    platform: "TikTok",
    sales_page_url: null,
    competitors: [],
    competitor_urls: [],
    observed_offers: [],
    evidence: [
      evidence("TIKTOK", "TikTok", row.video_url || null, row.scaled_at, row.video_id || row.id,
        "views", String(row.views ?? 0), "count"),
    ],
    confidence_score: null,
    confidence_level: "UNKNOWN",
    confidence_reason: null,
    opportunity_score: score,
    score_components: {
      viral_score: row.viral_score ?? null,
      enhanced_score: row.enhanced_score ?? null,
    },
    scoring_version: null,
    tags: [...(row.hashtags ?? []), ...(row.tags ?? [])],
    notes: [row.notes].filter((value): value is string => Boolean(value)),
    warnings: [],
  };
}

export function buildHandoffFromCollectedAd(row: CollectedAdRow): MarketIntelligenceHandoff {
  const identity = row.ad_library_id || row.ad_url || row.id;
  const platform = row.platform || "Unknown";
  const opportunityId = `${platform.toLowerCase()}:${identity}`;
  const title = (row.headline || row.advertiser || "Oportunidade").slice(0, 200);
  const hasCountry = Boolean(row.country && row.country !== "—");
  const hasNiche = Boolean(row.niche && row.niche !== "Geral");

  return {
    handoff_id: computeHandoffId("collected_ad_transform", opportunityId),
    schema_version: SCHEMA_VERSION,
    source_system: SOURCE_SYSTEM,
    source_module: "collected_ad_transform",
    created_at: new Date().toISOString(),
    external_project_ref: row.id,
    opportunity_id: opportunityId,
    title,
    market: hasCountry ? row.country : UNKNOWN,
    niche: hasNiche ? row.niche : UNKNOWN,
    subniche: UNKNOWN,
    country: hasCountry ? row.country : UNKNOWN,
    language: UNKNOWN,
    description: row.copy || null,
    trend_signals: {},
    demand_signals: {},
    competition_signals: {},
    ad_signals: {
      advertiser: row.advertiser || null,
      cta: row.cta || null,
      image_url: row.image_url || null,
      video_url: row.video_url || null,
    },
    social_signals: {},
    search_signals: {},
    product_name: null,
    offer_type: null,
    price: null,
    currency: null,
    commission: null,
    platform,
    sales_page_url: row.landing_page_url || null,
    competitors: [],
    competitor_urls: [],
    observed_offers: [],
    evidence: [
      evidence("AD_LIBRARY", platform, row.ad_url || null,
        row.first_seen_at || row.created_at, row.ad_library_id || row.id,
        "headline", title, null),
    ],
    confidence_score: null,
    confidence_level: "UNKNOWN",
    confidence_reason: null,
    opportunity_score: safeScore(row.score),
    score_components: { scalaflow_score: safeScore(row.score) },
    scoring_version: null,
    tags: [row.offer_network, row.offer_network_confidence].filter(
      (value): value is string => Boolean(value),
    ),
    notes: [],
    warnings: [],
  };
}
