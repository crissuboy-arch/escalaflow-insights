// Single persistence path for collected_ads, shared by every source
// (extension /api/ingest, server-side Facebook collector, future collectors).
// Owns the longevity contract: first_seen_at is set once and never touched
// again; last_seen_at is bumped on every re-discovery of the same ad.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { detectOfferNetwork } from "@/lib/offer-network";

export interface PersistAdInput {
  advertiser?: string | null;
  headline?: string | null;
  copy?: string | null;
  cta?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  creativeType?: string | null;
  platform?: string | null;
  country?: string | null;
  niche?: string | null;
  keyword?: string | null;
  score?: number | null;
  adUrl?: string | null;
  adLibraryId?: string | null;
  landingPageUrl?: string | null;
  startDate?: string | null;
  source?: string;
  favorite?: boolean;
  raw?: Record<string, unknown> | null;
  /** Dono da oferta. Sem isto a linha fica com user_id NULL e as consultas
   *  filtradas por utilizador (API privada, Cris OS) nunca a encontram. */
  userId?: string | null;
}

export interface PersistResult {
  inserted: boolean;
  updated: boolean;
  error?: string;
}

export async function upsertCollectedAd(item: PersistAdInput): Promise<PersistResult> {
  const startDate = item.startDate ? new Date(item.startDate) : null;
  const landingPageUrl = item.landingPageUrl?.trim() || null;
  const { network, confidence } = detectOfferNetwork(landingPageUrl || item.adUrl);
  const now = new Date().toISOString();

  const base = {
    advertiser: item.advertiser?.trim() || "Anunciante",
    headline: item.headline?.trim() || item.advertiser?.trim() || "Anúncio",
    copy: item.copy?.trim() || "",
    cta: item.cta || null,
    image_url: item.imageUrl || null,
    video_url: item.videoUrl || null,
    creative_type: item.creativeType || (item.videoUrl ? "video" : item.imageUrl ? "image" : null),
    platform: item.platform || "Facebook",
    country: item.country || "—",
    niche: item.niche || "Geral",
    ad_url: item.adUrl || null,
    landing_page_url: landingPageUrl,
    offer_network: network,
    offer_network_confidence: confidence,
    start_date: startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString() : null,
    score: Math.max(0, Math.min(100, Math.round(item.score ?? 50))),
    source: item.source || "collector",
    last_seen_at: now,
    updated_at: now,
    ...(item.keyword ? { keyword: item.keyword } : {}),
    ...(item.raw ? { raw: item.raw } : {}),
    // Only ever set favorite=true here; a later re-scan must never silently
    // un-favorite something the user favorited through the app.
    ...(item.favorite ? { favorite: true } : {}),
    ...(item.userId ? { user_id: item.userId } : {}),
  };

  // Mídia durável (src/lib/collector/media-persist.ts) é feita por um cron
  // em segundo plano, nunca aqui — o coletor processa vários anúncios numa
  // única execução, e baixar+reenviar imagens/vídeos sincronamente para cada
  // um arriscaria o timeout da função serverless. Aqui só marcamos a
  // intenção para o cron processar.
  const existingQuery = item.adLibraryId
    ? supabaseAdmin
        .from("collected_ads")
        .select("id, media_status")
        .eq("ad_library_id", item.adLibraryId)
        .maybeSingle()
    : item.adUrl
      ? supabaseAdmin
          .from("collected_ads")
          .select("id, media_status")
          .eq("ad_url", item.adUrl)
          .maybeSingle()
      : null;

  const { data: existing } = existingQuery ? await existingQuery : { data: null };

  const hasMedia = Boolean(base.image_url || base.video_url);
  const alreadyCopied =
    existing?.media_status === "image_copied" || existing?.media_status === "both_copied";
  // Se já copiada com sucesso, preserva (idempotente). Senão: sem mídia
  // nenhuma = 'no_media'; com mídia (nova ou repetida) = 'not_attempted',
  // mesmo que um status anterior fosse 'expired' — um re-mine traz um URL
  // novo, que merece uma nova tentativa do cron.
  const mediaStatus = alreadyCopied ? null : !hasMedia ? "no_media" : "not_attempted";
  const mediaPatch = mediaStatus ? { media_status: mediaStatus } : {};

  if (existing) {
    const { error } = await supabaseAdmin
      .from("collected_ads")
      .update({ ...base, ...mediaPatch } as never)
      .eq("id", existing.id);
    if (error) return { inserted: false, updated: false, error: error.message };
    return { inserted: false, updated: true };
  }

  const { error } = await supabaseAdmin.from("collected_ads").insert({
    ...base,
    ...mediaPatch,
    ad_library_id: item.adLibraryId || null,
    first_seen_at: now,
  } as never);
  if (error) return { inserted: false, updated: false, error: error.message };
  return { inserted: true, updated: false };
}

/** Aggregates a batch of persist outcomes so callers can tell the user the
 *  truth when some ads were shown but not actually saved (e.g. a stale
 *  PostgREST schema cache rejecting a real, existing column). */
export function summarizePersistResults(results: PersistResult[]): {
  saved: number;
  failed: number;
  firstError: string | null;
} {
  let saved = 0;
  let failed = 0;
  let firstError: string | null = null;
  for (const r of results) {
    if (r.error) {
      failed++;
      if (!firstError) firstError = r.error;
    } else {
      saved++;
    }
  }
  return { saved, failed, firstError };
}
