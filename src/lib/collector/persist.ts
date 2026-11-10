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
  /** id da linha em collected_ads (para o pipeline de mídia). */
  id?: string;
  inserted: boolean;
  updated: boolean;
  error?: string;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Guarda a contagem real do dia (collation_count/is_active da Ad Library).
 *  Nunca lança: se a tabela ainda não existir (migration por aplicar), ignora. */
async function recordActivitySnapshot(
  adId: string,
  raw: Record<string, unknown> | null | undefined,
) {
  if (!raw) return;
  const activeAds = num(raw.collation_count);
  const isActive = typeof raw.is_active === "boolean" ? raw.is_active : null;
  if (activeAds === null && isActive === null) return;
  try {
    const { error } = await supabaseAdmin.from("ad_activity_snapshots" as never).upsert(
      {
        ad_id: adId,
        snapshot_date: new Date().toISOString().slice(0, 10),
        active_ads: activeAds,
        is_active: isActive,
        captured_at: new Date().toISOString(),
      } as never,
      { onConflict: "ad_id,snapshot_date" },
    );
    if (error) console.warn("[persist] snapshot de atividade não gravado:", error.message);
  } catch (e) {
    console.warn("[persist] snapshot de atividade falhou:", e);
  }
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
        .select("id, media_status, image_url, video_url, image_storage_path, video_storage_path")
        .eq("ad_library_id", item.adLibraryId)
        .maybeSingle()
    : item.adUrl
      ? supabaseAdmin
          .from("collected_ads")
          .select("id, media_status, image_url, video_url, image_storage_path, video_storage_path")
          .eq("ad_url", item.adUrl)
          .maybeSingle()
      : null;

  const { data: existing } = existingQuery ? await existingQuery : { data: null };

  const prev = existing as unknown as {
    id: string;
    media_status: string | null;
    image_url: string | null;
    video_url: string | null;
    image_storage_path: string | null;
    video_storage_path: string | null;
  } | null;
  // Uma nova coleta NUNCA apaga mídia: se o item novo não trouxe URL, o URL
  // anterior fica; cópias duráveis já gravadas no Storage nunca são tocadas.
  const imageUrl = item.imageUrl || null;
  const videoUrl = item.videoUrl || null;
  const mediaUrls = {
    ...(imageUrl ? { image_url: imageUrl } : prev ? {} : { image_url: null }),
    ...(videoUrl ? { video_url: videoUrl } : prev ? {} : { video_url: null }),
  };
  const finalImageUrl = imageUrl ?? prev?.image_url ?? null;
  const finalVideoUrl = videoUrl ?? prev?.video_url ?? null;
  const imageDone = !finalImageUrl || Boolean(prev?.image_storage_path);
  const videoDone = !finalVideoUrl || Boolean(prev?.video_storage_path);
  const hasAnyMedia = Boolean(
    finalImageUrl || finalVideoUrl || prev?.image_storage_path || prev?.video_storage_path,
  );
  // Tudo já copiado → preserva o status (idempotente, sem novo download).
  // Falta algo → volta para a fila: um re-mine traz URLs frescos, que
  // merecem nova tentativa mesmo que a anterior tenha expirado.
  const mediaStatus = !hasAnyMedia
    ? "no_media"
    : imageDone && videoDone
      ? null
      : prev?.image_storage_path && !videoDone
        ? "pending_video"
        : "not_attempted";
  const mediaPatch = {
    ...mediaUrls,
    ...(mediaStatus ? { media_status: mediaStatus } : {}),
  };

  if (prev) {
    const { error } = await supabaseAdmin
      .from("collected_ads")
      .update({ ...base, ...mediaPatch } as never)
      .eq("id", prev.id);
    if (error) return { id: prev.id, inserted: false, updated: false, error: error.message };
    await recordActivitySnapshot(prev.id, item.raw);
    return { id: prev.id, inserted: false, updated: true };
  }

  const { data: created, error } = await supabaseAdmin
    .from("collected_ads")
    .insert({
      ...base,
      ...mediaPatch,
      ad_library_id: item.adLibraryId || null,
      first_seen_at: now,
    } as never)
    .select("id")
    .single();
  if (error) return { inserted: false, updated: false, error: error.message };
  const newId = (created as { id: string } | null)?.id;
  if (newId) await recordActivitySnapshot(newId, item.raw);
  return { id: newId, inserted: true, updated: false };
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
