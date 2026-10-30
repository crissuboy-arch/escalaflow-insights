// Private, authenticated intelligence query API — exposes ad intelligence
// ScalaFlow already collected (collected_ads + the four *_minerados
// tables) to external callers (e.g. an ad-creation platform), without
// touching any miner/collector. Read-only against already-stored data;
// never triggers a new Apify/paid query on its own.
//
// Six tools, matching the brief: searchAds, getAdDetails, getAdCreatives,
// getAdEvidence, getSavedOffers, createAdaptationBrief. Each is a plain,
// unit-testable function — the HTTP route
// (src/routes/api/integrations.intelligence.run.ts) is a thin adapter,
// mirroring the pattern already used for the mining bridge.
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildHandoffFromCollectedAd,
  type CollectedAdRow,
  type EvidenceItem,
} from "@/lib/cris-os/contract";

// ── Client identity & auth ──────────────────────────────────────────────
// A "client" here is an external caller (e.g. the ad-creation platform),
// NOT a ScalaFlow Supabase user. Identified purely by a server-validated
// secret — never by a client_id the browser/caller sends in the body.
export interface PrivateApiClient {
  id: string;
  clientKey: string;
  displayName: string;
  attributedUserId: string;
  costLimitCents: number | null;
  costUsedCents: number;
  status: "active" | "disabled";
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Resolves the caller's identity from the Authorization header alone —
 *  the secret IS the lookup key (via its hash), so there is no way for a
 *  caller to claim to be a different client than the secret they hold. */
export async function authenticatePrivateApiClient(
  authHeader: string | null,
): Promise<PrivateApiClient | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const secret = authHeader.slice("Bearer ".length).trim();
  if (!secret) return null;

  const secretHash = hashSecret(secret);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("private_api_clients")
    .select(
      "id, client_key, display_name, attributed_user_id, cost_limit_cents, cost_used_cents, status",
    )
    .eq("secret_hash", secretHash)
    .maybeSingle();
  if (error || !data || data.status !== "active") return null;

  return {
    id: data.id,
    clientKey: data.client_key,
    displayName: data.display_name,
    attributedUserId: data.attributed_user_id,
    costLimitCents: data.cost_limit_cents ?? null,
    costUsedCents: data.cost_used_cents ?? 0,
    status: data.status,
  };
}

// ── Cost gate ────────────────────────────────────────────────────────────
// Every tool here only reads already-stored data, so none of them spend
// money today. This primitive exists so a FUTURE "fresh paid query" path
// has a tested gate ready: no client may trigger one until a cost limit is
// explicitly configured for it, and never past that limit.
export interface CostCheck {
  allowed: boolean;
  reason?: string;
}

export function checkCostLimit(client: PrivateApiClient, estimatedCostCents: number): CostCheck {
  if (client.costLimitCents === null) {
    return {
      allowed: false,
      reason: `Consultas pagas desabilitadas para "${client.clientKey}": configure cost_limit_cents.`,
    };
  }
  if (client.costUsedCents + estimatedCostCents > client.costLimitCents) {
    return {
      allowed: false,
      reason: `Limite de custo de "${client.clientKey}" seria excedido (usado ${client.costUsedCents}c + ${estimatedCostCents}c > limite ${client.costLimitCents}c).`,
    };
  }
  return { allowed: true };
}

// ── Search ───────────────────────────────────────────────────────────────
export const SEARCH_SOURCES = [
  "facebook",
  "tiktok",
  "instagram",
  "youtube",
  "google_trends",
] as const;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

export interface SearchAdsParams {
  source: SearchSource;
  country?: string;
  niche?: string;
  keyword?: string;
  platform?: string;
  creativeType?: string;
  limit?: number;
}

export interface AdCard {
  id: string;
  source: SearchSource;
  advertiserOrAuthor: string | null;
  headlineOrTitle: string | null;
  platform: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  originalUrl: string | null;
  identifier: string | null;
  startDate: string | null;
  daysActive: number | null;
  landingPageUrl: string | null;
  observedMetrics: Record<string, unknown> | null;
  collectedAt: string | null;
}

export interface SearchAdsResult {
  source: SearchSource;
  results: AdCard[];
  // Honest reporting of which requested filters this source can't apply —
  // never silently ignored, never presented as if they had been applied.
  unsupportedFilters: string[];
}

function daysActiveSince(startDate: string | null): number | null {
  if (!startDate) return null;
  const started = new Date(startDate).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((Date.now() - started) / (24 * 60 * 60 * 1000)));
}

function mapCollectedAdToCard(row: {
  id: string;
  advertiser?: string | null;
  headline?: string | null;
  platform?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  ad_url?: string | null;
  ad_library_id?: string | null;
  start_date?: string | null;
  first_seen_at?: string | null;
  created_at?: string | null;
  landing_page_url?: string | null;
}): AdCard {
  return {
    id: row.id,
    source: "facebook",
    advertiserOrAuthor: row.advertiser ?? null,
    headlineOrTitle: row.headline ?? null,
    platform: row.platform ?? null,
    imageUrl: row.image_url ?? null,
    videoUrl: row.video_url ?? null,
    originalUrl: row.ad_url ?? null,
    identifier: row.ad_library_id ?? row.id,
    startDate: row.start_date ?? null,
    daysActive: daysActiveSince(row.start_date ?? row.first_seen_at ?? null),
    landingPageUrl: row.landing_page_url ?? null,
    observedMetrics: null,
    collectedAt: row.first_seen_at ?? row.created_at ?? null,
  };
}

async function searchFacebookAds(
  params: SearchAdsParams,
  userId: string,
): Promise<SearchAdsResult> {
  const unsupportedFilters: string[] = [];
  let query = supabaseAdmin.from("collected_ads").select("*").eq("user_id", userId);
  if (params.country) query = query.eq("country", params.country);
  if (params.niche) query = query.eq("niche", params.niche);
  if (params.keyword) query = query.ilike("headline", `%${params.keyword}%`);
  if (params.platform) query = query.eq("platform", params.platform);
  if (params.creativeType) query = query.eq("creative_type", params.creativeType);
  query = query.order("created_at", { ascending: false }).limit(params.limit ?? 20);

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao consultar collected_ads: ${error.message}`);

  const results: AdCard[] = (data ?? []).map(mapCollectedAdToCard);

  return { source: "facebook", results, unsupportedFilters };
}

interface MinedTableConfig {
  table: string;
  // Column used for the free-text keyword filter, if any.
  keywordColumn: string | null;
  mapRow: (row: Record<string, unknown>) => AdCard;
}

const MINED_TABLE_CONFIG: Record<
  "tiktok" | "instagram" | "youtube" | "google_trends",
  MinedTableConfig
> = {
  tiktok: {
    table: "tiktok_minerados",
    keywordColumn: "hashtag",
    mapRow: (row) => ({
      id: String(row.id),
      source: "tiktok",
      advertiserOrAuthor: (row.creator as string) ?? null,
      headlineOrTitle: (row.hook as string) ?? (row.description as string) ?? null,
      platform: "TikTok",
      imageUrl: (row.thumbnail_url as string) ?? null,
      videoUrl: (row.video_url as string) ?? null,
      originalUrl: (row.video_url as string) ?? null,
      identifier: (row.video_id as string) ?? String(row.id),
      startDate: null,
      daysActive: null,
      landingPageUrl: null,
      observedMetrics: {
        views: row.views ?? 0,
        likes: row.likes ?? 0,
        comments: row.comments ?? 0,
        shares: row.shares ?? 0,
        viral_score: row.viral_score ?? null,
      },
      collectedAt: (row.create_time as string) ?? (row.created_at as string) ?? null,
    }),
  },
  instagram: {
    table: "instagram_minerados",
    keywordColumn: "search",
    mapRow: (row) => ({
      id: String(row.id),
      source: "instagram",
      advertiserOrAuthor: (row.owner_username as string) ?? (row.owner_full_name as string) ?? null,
      headlineOrTitle: (row.caption as string) ?? null,
      platform: "Instagram",
      imageUrl: (row.display_url as string) ?? null,
      videoUrl: null,
      originalUrl: (row.post_url as string) ?? null,
      identifier: (row.short_code as string) ?? String(row.id),
      startDate: null,
      daysActive: null,
      landingPageUrl: null,
      observedMetrics: {
        likes: row.likes_count ?? 0,
        comments: row.comments_count ?? 0,
        engagement_score: row.engagement_score ?? null,
      },
      collectedAt: (row.created_at as string) ?? null,
    }),
  },
  youtube: {
    table: "youtube_minerados",
    keywordColumn: "query",
    mapRow: (row) => ({
      id: String(row.id),
      source: "youtube",
      advertiserOrAuthor: (row.channel_name as string) ?? null,
      headlineOrTitle: (row.title as string) ?? null,
      platform: "YouTube",
      imageUrl: (row.thumbnail_url as string) ?? null,
      videoUrl: (row.video_url as string) ?? null,
      originalUrl: (row.video_url as string) ?? null,
      identifier: (row.video_id as string) ?? String(row.id),
      startDate: null,
      daysActive: null,
      landingPageUrl: null,
      observedMetrics: {
        views: row.views ?? 0,
        likes: row.likes ?? 0,
        comments: row.comments ?? 0,
        viral_score: row.viral_score ?? null,
      },
      collectedAt: (row.published_at as string) ?? (row.created_at as string) ?? null,
    }),
  },
  google_trends: {
    table: "google_trends_minerados",
    keywordColumn: "keyword",
    mapRow: (row) => ({
      id: String(row.id),
      source: "google_trends",
      advertiserOrAuthor: null,
      headlineOrTitle: (row.keyword as string) ?? null,
      platform: "Google Trends",
      imageUrl: null,
      videoUrl: null,
      originalUrl: null,
      identifier: (row.keyword as string) ?? String(row.id),
      startDate: null,
      daysActive: null,
      landingPageUrl: null,
      observedMetrics: {
        avg_interest: row.avg_interest ?? null,
        peak_interest: row.peak_interest ?? null,
        trend: row.trend ?? null,
      },
      collectedAt: (row.created_at as string) ?? null,
    }),
  },
};

// Filters the Facebook/collected_ads path supports that these sources do
// not — never silently dropped, always reported back.
const MINED_SOURCE_UNSUPPORTED = [
  "startDate(exact)",
  "landingPageUrl",
  "creativeType",
  "daysActive",
];

async function searchMinedSource(
  source: "tiktok" | "instagram" | "youtube" | "google_trends",
  params: SearchAdsParams,
  userId: string,
): Promise<SearchAdsResult> {
  const config = MINED_TABLE_CONFIG[source];
  const unsupportedFilters: string[] = [...MINED_SOURCE_UNSUPPORTED];
  if (params.country) unsupportedFilters.push("country");
  if (params.platform && params.platform.toLowerCase() !== source)
    unsupportedFilters.push("platform");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any).from(config.table).select("*").eq("user_id", userId);
  if (params.keyword && config.keywordColumn) {
    query = query.ilike(config.keywordColumn, `%${params.keyword}%`);
  } else if (params.keyword) {
    unsupportedFilters.push("keyword");
  }
  if (params.niche) unsupportedFilters.push("niche");

  query = query.order("created_at", { ascending: false }).limit(params.limit ?? 20);
  const { data, error } = await query;
  if (error) throw new Error(`Falha ao consultar ${config.table}: ${error.message}`);

  const results = ((data ?? []) as Record<string, unknown>[]).map(config.mapRow);
  return { source, results, unsupportedFilters: Array.from(new Set(unsupportedFilters)) };
}

// ── Search result cache (best-effort, per-client) ──────────────────────
// Caching here is a pure optimization, never a correctness guarantee — a
// cache miss just costs an extra read of already-stored data (no money, no
// miner call), unlike the mining bridge's rate limiter. An in-memory Map
// is therefore an acceptable, minimal choice (no new table), as long as
// the key always includes the client's own id so two clients can never
// read each other's cached results even for identical query params.
const SEARCH_CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { expiresAt: number; result: SearchAdsResult }>();

function searchCacheKey(client: PrivateApiClient, params: SearchAdsParams): string {
  const sortedKeys = Object.keys(params).sort();
  return `${client.id}:${JSON.stringify(params, sortedKeys)}`;
}

export function getCachedSearch(
  client: PrivateApiClient,
  params: SearchAdsParams,
  now: number = Date.now(),
): SearchAdsResult | null {
  const entry = searchCache.get(searchCacheKey(client, params));
  if (!entry || entry.expiresAt < now) return null;
  return entry.result;
}

export function setCachedSearch(
  client: PrivateApiClient,
  params: SearchAdsParams,
  result: SearchAdsResult,
  now: number = Date.now(),
): void {
  searchCache.set(searchCacheKey(client, params), { expiresAt: now + SEARCH_CACHE_TTL_MS, result });
}

/** Test-only: clears the in-memory search cache between test cases. */
export function __clearIntelligenceSearchCacheForTests(): void {
  searchCache.clear();
}

/** Searches already-stored intelligence only — never triggers a fresh
 *  Apify/paid query. Scoped to the authenticated client's attributed
 *  ScalaFlow account; never reads another account's data, and never
 *  returns another client's cached results even for identical params. */
export async function searchAds(
  params: SearchAdsParams,
  client: PrivateApiClient,
): Promise<SearchAdsResult> {
  const cached = getCachedSearch(client, params);
  if (cached) return cached;

  const result =
    params.source === "facebook"
      ? await searchFacebookAds(params, client.attributedUserId)
      : await searchMinedSource(params.source, params, client.attributedUserId);

  setCachedSearch(client, params, result);
  return result;
}

// ── Detail / creatives / evidence ───────────────────────────────────────
async function fetchCollectedAdRow(id: string, userId: string): Promise<CollectedAdRow | null> {
  const { data } = await supabaseAdmin
    .from("collected_ads")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as CollectedAdRow) ?? null;
}

export async function getAdDetails(
  id: string,
  source: SearchSource,
  client: PrivateApiClient,
): Promise<AdCard | null> {
  if (source === "facebook") {
    const row = await fetchCollectedAdRow(id, client.attributedUserId);
    if (!row) return null;
    return mapCollectedAdToCard(row);
  }
  const config = MINED_TABLE_CONFIG[source];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from(config.table)
    .select("*")
    .eq("id", id)
    .eq("user_id", client.attributedUserId)
    .maybeSingle();
  if (!data) return null;
  return config.mapRow(data);
}

export async function getAdCreatives(
  id: string,
  source: SearchSource,
  client: PrivateApiClient,
): Promise<{ imageUrl: string | null; videoUrl: string | null } | null> {
  const details = await getAdDetails(id, source, client);
  if (!details) return null;
  return { imageUrl: details.imageUrl, videoUrl: details.videoUrl };
}

/** Evidence shape reused directly from the Cris OS contract (EvidenceItem)
 *  — same vocabulary the handoff already uses, so nothing new is invented
 *  for "what counts as evidence". Only ever includes metrics ScalaFlow
 *  actually observed; never revenue/ROAS/sales. */
export async function getAdEvidence(
  id: string,
  source: SearchSource,
  client: PrivateApiClient,
): Promise<EvidenceItem | null> {
  if (source === "facebook") {
    const row = await fetchCollectedAdRow(id, client.attributedUserId);
    if (!row) return null;
    return buildHandoffFromCollectedAd(row).evidence[0];
  }
  const details = await getAdDetails(id, source, client);
  if (!details) return null;
  const metrics = details.observedMetrics ?? {};
  const metricName = "views" in metrics ? "views" : Object.keys(metrics)[0] ?? null;
  const metricValue = metricName !== null ? metrics[metricName] : null;
  return {
    source_type: source.toUpperCase(),
    source_name: details.platform ?? source,
    source_url: details.originalUrl,
    captured_at: details.collectedAt ?? new Date().toISOString(),
    raw_reference: details.identifier,
    metric_name: metricName,
    metric_value: metricValue !== null && metricValue !== undefined ? String(metricValue) : null,
    metric_unit: metricName ? "count" : null,
    evidence_type: "OBSERVED",
    confidence_level: "UNKNOWN",
  };
}

// ── Saved offers ─────────────────────────────────────────────────────────
/** Reuses the exact existing "saved" mechanism (user_ad_actions, same
 *  table the /ofertas-salvas page reads) — no new favorites/saves table. */
export async function getSavedOffers(client: PrivateApiClient): Promise<AdCard[]> {
  const { data, error } = await supabaseAdmin
    .from("user_ad_actions")
    .select("created_at, collected_ads(*)")
    .eq("user_id", client.attributedUserId)
    .eq("action", "saved")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao consultar ofertas salvas: ${error.message}`);

  type Row = { created_at: string; collected_ads: Record<string, unknown> | null };
  const rows = (data ?? []) as unknown as Row[];
  const out: AdCard[] = [];
  for (const r of rows) {
    const row = r.collected_ads;
    if (!row) continue;
    const card = mapCollectedAdToCard(row as Parameters<typeof mapCollectedAdToCard>[0]);
    out.push({ ...card, collectedAt: r.created_at });
  }
  return out;
}

// ── Adaptation brief ────────────────────────────────────────────────────
export interface AdaptationBriefInput {
  sourceAdId: string;
  source: SearchSource;
  clientProduct: {
    name: string;
    niche?: string;
    description?: string;
  };
}

export interface AdaptationBrief {
  briefId: string;
  createdAt: string;
  reference: AdCard;
  observedData: {
    platform: string | null;
    daysActive: number | null;
    observedMetrics: Record<string, unknown> | null;
    collectedAt: string | null;
  };
  clientProduct: AdaptationBriefInput["clientProduct"];
  // Carries the SAME handoff_id the existing Cris OS contract would use for
  // this exact source row, so a future step can hand this off without
  // recomputing identity — but this function never calls handoffToCrisOs.
  crisOsHandoffId: string | null;
  notice: string;
}

/** Prepares a briefing only. Never generates creatives, never publishes,
 *  never calls Cris OS/Athena — exactly per spec. */
export async function createAdaptationBrief(
  input: AdaptationBriefInput,
  client: PrivateApiClient,
): Promise<AdaptationBrief | null> {
  const reference = await getAdDetails(input.sourceAdId, input.source, client);
  if (!reference) return null;

  let crisOsHandoffId: string | null = null;
  if (input.source === "facebook") {
    const row = await fetchCollectedAdRow(input.sourceAdId, client.attributedUserId);
    if (row) crisOsHandoffId = buildHandoffFromCollectedAd(row).handoff_id;
  }

  return {
    briefId: `brief_${createHash("sha256").update(`${client.id}:${input.source}:${input.sourceAdId}:${input.clientProduct.name}`).digest("hex").slice(0, 24)}`,
    createdAt: new Date().toISOString(),
    reference,
    observedData: {
      platform: reference.platform,
      daysActive: reference.daysActive,
      observedMetrics: reference.observedMetrics,
      collectedAt: reference.collectedAt,
    },
    clientProduct: input.clientProduct,
    crisOsHandoffId,
    notice:
      "Briefing apenas preparado. Nenhum criativo foi gerado, nenhum anúncio foi publicado e nenhuma missão foi enviada ao Cris OS/Athena.",
  };
}
