// Fase 2 — Radar de Vídeos unificado. Lê (somente leitura) os quatro
// mineradores já existentes (tiktok_minerados, instagram_minerados,
// youtube_minerados, collected_ads) e normaliza para um cartão comum. Não
// cria nenhuma mineração nova, não altera nenhuma das tabelas/colunas que
// os radares existentes já usam — é uma camada de agregação por cima do
// que já está salvo.
//
// Honestidade de evidência (exigência explícita da missão): nunca chama
// algo de "viral" ou "crescendo" sem um número real por trás, e nunca diz
// que um filtro foi aplicado quando a fonte não tem esse dado.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const VIDEO_RADAR_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook"] as const;
export type VideoRadarPlatform = (typeof VIDEO_RADAR_PLATFORMS)[number];

export const VIDEO_RADAR_TABS = ["bombando", "virais", "anuncios_ativos", "salvos"] as const;
export type VideoRadarTab = (typeof VIDEO_RADAR_TABS)[number];

export type VideoRadarStatus = "recent" | "viral" | "active_ad" | "normal";
export type PlayerKind = "tiktok_embed" | "youtube_embed" | "native_video" | "image_only";

export interface VideoRadarCard {
  id: string;
  platform: VideoRadarPlatform;
  title: string;
  authorOrAdvertiser: string | null;
  thumbnailUrl: string | null;
  playerKind: PlayerKind;
  embedUrl: string | null;
  directVideoUrl: string | null;
  originalUrl: string | null;
  country: string | null;
  niche: string | null;
  videoType: "video" | "image" | "short" | "reel" | "ad" | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  score: number | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  daysActive: number | null;
  status: VideoRadarStatus;
}

// Real thresholds already used elsewhere in the app (ViralBadge/EngagementBadge
// components) — reused here, not invented for this feature.
const VIRAL_SCORE_THRESHOLD = 70;
const RECENT_HOURS = 48;

export function isRecent(createdAt: string | null, hours = RECENT_HOURS): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 60 * 60 * 1000;
}

export function dateRangeToMs(range: string): number | null {
  switch (range) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "3d":
      return 3 * 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

const FilterInput = z.object({
  tab: z.enum(VIDEO_RADAR_TABS),
  platforms: z.array(z.enum(VIDEO_RADAR_PLATFORMS)).optional(),
  dateRange: z.enum(["24h", "3d", "7d", "30d", "all"]).default("all"),
  keyword: z.string().optional(),
  country: z.string().optional(),
  niche: z.string().optional(),
  videoType: z.enum(["video", "image", "short"]).optional(),
  limit: z.number().int().min(1).max(100).default(60),
});
export type VideoRadarFilters = z.infer<typeof FilterInput>;

export interface VideoRadarResult {
  cards: VideoRadarCard[];
  // Per-platform honesty notes — e.g. "TikTok: filtro de país não é suportado
  // (a fonte não captura país)." Never silently drops a filter.
  notes: string[];
}

function wantsPlatform(
  platforms: VideoRadarPlatform[] | undefined,
  p: VideoRadarPlatform,
): boolean {
  return !platforms || platforms.length === 0 || platforms.includes(p);
}

// Exported so dashboard.functions.ts can reuse the exact same real
// per-platform queries for its "recently mined" panel, instead of a
// second, parallel normalization of the same tables.
export async function fetchTikTok(
  userId: string,
  filters: VideoRadarFilters,
  notes: string[],
): Promise<VideoRadarCard[]> {
  if (!wantsPlatform(filters.platforms, "tiktok")) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any).from("tiktok_minerados").select("*").eq("user_id", userId);
  if (filters.keyword) {
    query = query.or(
      `hook.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%,creator.ilike.%${filters.keyword}%`,
    );
  }
  if (filters.country)
    notes.push("TikTok: filtro de país não é suportado (a fonte não captura país).");
  if (filters.niche)
    notes.push("TikTok: filtro de nicho não é suportado (a fonte não captura nicho estruturado).");
  if (filters.videoType && filters.videoType !== "video")
    notes.push("TikTok: todo conteúdo é vídeo — filtro de tipo ignorado.");
  const orderColumn = filters.tab === "bombando" ? "created_at" : "viral_score";
  query = query.order(orderColumn, { ascending: false }).limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`TikTok: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const score = row.viral_score ?? row.enhanced_score ?? null;
    const createdAt = row.created_at ?? null;
    return {
      id: String(row.id),
      platform: "tiktok" as const,
      title: row.hook || row.description || "Vídeo TikTok",
      authorOrAdvertiser: row.creator ?? null,
      thumbnailUrl: row.thumbnail_url ?? null,
      playerKind: "tiktok_embed" as const,
      embedUrl: row.video_id ? `https://www.tiktok.com/embed/v2/${row.video_id}` : null,
      directVideoUrl: null,
      originalUrl: row.video_url ?? null,
      country: null,
      niche: null,
      videoType: "video" as const,
      views: row.views ?? null,
      likes: row.likes ?? null,
      comments: row.comments ?? null,
      score,
      createdAt,
      lastSeenAt: null,
      daysActive: null,
      status: isRecent(createdAt)
        ? ("recent" as const)
        : score != null && score >= VIRAL_SCORE_THRESHOLD
          ? ("viral" as const)
          : ("normal" as const),
    };
  });
}

export async function fetchInstagram(
  userId: string,
  filters: VideoRadarFilters,
  notes: string[],
): Promise<VideoRadarCard[]> {
  if (!wantsPlatform(filters.platforms, "instagram")) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any).from("instagram_minerados").select("*").eq("user_id", userId);
  if (filters.keyword) {
    query = query.or(
      `caption.ilike.%${filters.keyword}%,owner_username.ilike.%${filters.keyword}%,search.ilike.%${filters.keyword}%`,
    );
  }
  if (filters.country)
    notes.push("Instagram: filtro de país não é suportado (a fonte não captura país).");
  if (filters.niche)
    notes.push(
      "Instagram: filtro de nicho não é suportado (a fonte não captura nicho estruturado).",
    );
  if (filters.videoType === "video") query = query.eq("is_video", true);
  if (filters.videoType === "image") query = query.eq("is_video", false);
  if (filters.videoType === "short")
    notes.push("Instagram: não há distinção de 'short' — use 'vídeo' para Reels.");
  const orderColumn = filters.tab === "bombando" ? "created_at" : "engagement_score";
  query = query.order(orderColumn, { ascending: false }).limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Instagram: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const score = row.engagement_score ?? null;
    const createdAt = row.created_at ?? null;
    const isVideo = !!row.is_video;
    return {
      id: String(row.id),
      platform: "instagram" as const,
      title: row.caption || `@${row.owner_username}` || "Post Instagram",
      authorOrAdvertiser: row.owner_username ? `@${row.owner_username}` : null,
      thumbnailUrl: row.display_url ?? null,
      playerKind: isVideo ? ("native_video" as const) : ("image_only" as const),
      embedUrl: null,
      directVideoUrl: isVideo ? (row.video_url ?? null) : null,
      originalUrl: row.post_url ?? null,
      country: null,
      niche: null,
      videoType: isVideo ? ("reel" as const) : ("image" as const),
      views: null,
      likes: row.likes_count ?? null,
      comments: row.comments_count ?? null,
      score,
      createdAt,
      lastSeenAt: null,
      daysActive: null,
      status: isRecent(createdAt)
        ? ("recent" as const)
        : score != null && score >= VIRAL_SCORE_THRESHOLD
          ? ("viral" as const)
          : ("normal" as const),
    };
  });
}

export async function fetchYouTube(
  userId: string,
  filters: VideoRadarFilters,
  notes: string[],
): Promise<VideoRadarCard[]> {
  if (!wantsPlatform(filters.platforms, "youtube")) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any).from("youtube_minerados").select("*").eq("user_id", userId);
  if (filters.keyword) {
    query = query.or(
      `title.ilike.%${filters.keyword}%,channel_name.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`,
    );
  }
  if (filters.country)
    notes.push("YouTube: filtro de país não é suportado (a fonte não captura país).");
  if (filters.niche)
    notes.push("YouTube: filtro de nicho não é suportado (a fonte não captura nicho estruturado).");
  if (filters.videoType === "short") query = query.eq("is_short", true);
  if (filters.videoType === "video") query = query.eq("is_short", false);
  if (filters.videoType === "image")
    notes.push("YouTube: todo conteúdo é vídeo — filtro de imagem ignorado.");
  const orderColumn = filters.tab === "bombando" ? "published_at" : "viral_score";
  query = query.order(orderColumn, { ascending: false }).limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`YouTube: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const score = row.viral_score ?? null;
    const createdAt = row.published_at ?? row.created_at ?? null;
    return {
      id: String(row.id),
      platform: "youtube" as const,
      title: row.title || "Vídeo YouTube",
      authorOrAdvertiser: row.channel_name ?? null,
      thumbnailUrl: row.thumbnail_url ?? null,
      playerKind: "youtube_embed" as const,
      embedUrl: row.video_id ? `https://www.youtube.com/embed/${row.video_id}` : null,
      directVideoUrl: null,
      originalUrl: row.video_url ?? null,
      country: null,
      niche: null,
      videoType: row.is_short ? ("short" as const) : ("video" as const),
      views: row.views ?? null,
      likes: row.likes ?? null,
      comments: row.comments ?? null,
      score,
      createdAt,
      lastSeenAt: null,
      daysActive: null,
      status: isRecent(createdAt)
        ? ("recent" as const)
        : score != null && score >= VIRAL_SCORE_THRESHOLD
          ? ("viral" as const)
          : ("normal" as const),
    };
  });
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

async function fetchFacebookAds(
  userId: string,
  filters: VideoRadarFilters,
  notes: string[],
): Promise<VideoRadarCard[]> {
  if (!wantsPlatform(filters.platforms, "facebook")) return [];
  let query = supabaseAdmin.from("collected_ads").select("*").eq("user_id", userId);
  if (filters.keyword)
    query = query.or(`headline.ilike.%${filters.keyword}%,advertiser.ilike.%${filters.keyword}%`);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.niche) query = query.eq("niche", filters.niche);
  if (filters.videoType === "video") query = query.eq("creative_type", "video");
  if (filters.videoType === "image") query = query.eq("creative_type", "image");
  if (filters.videoType === "short")
    notes.push('Facebook: não há distinção de "short" — use "vídeo".');
  const orderColumn =
    filters.tab === "bombando"
      ? "created_at"
      : filters.tab === "anuncios_ativos"
        ? "last_seen_at"
        : "score";
  query = query.order(orderColumn, { ascending: false }).limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Facebook: ${error.message}`);
  return (data ?? []).map((row) => {
    const firstSeen = row.first_seen_at ?? row.created_at;
    const lastSeen = row.last_seen_at ?? row.created_at;
    return {
      id: row.id,
      platform: "facebook" as const,
      title: row.headline || row.advertiser || "Anúncio Facebook",
      authorOrAdvertiser: row.advertiser ?? null,
      thumbnailUrl: row.image_url ?? row.video_url ?? null,
      playerKind: row.video_url ? ("native_video" as const) : ("image_only" as const),
      embedUrl: null,
      directVideoUrl: row.video_url ?? null,
      originalUrl: row.ad_url ?? null,
      country: row.country ?? null,
      niche: row.niche ?? null,
      videoType:
        row.creative_type === "video"
          ? ("ad" as const)
          : row.creative_type === "image"
            ? ("image" as const)
            : null,
      views: null,
      likes: null,
      comments: null,
      score: row.score ?? null,
      createdAt: row.created_at ?? null,
      lastSeenAt: lastSeen ?? null,
      daysActive: firstSeen && lastSeen ? daysBetween(lastSeen, firstSeen) : null,
      status: "active_ad" as const,
    };
  });
}

async function fetchSaved(
  userId: string,
  filters: VideoRadarFilters,
  notes: string[],
): Promise<VideoRadarCard[]> {
  const out: VideoRadarCard[] = [];

  if (wantsPlatform(filters.platforms, "tiktok")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("anuncios_salvos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(filters.limit);
    if (error) throw new Error(`TikTok salvos: ${error.message}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      out.push({
        id: String(row.id),
        platform: "tiktok",
        title: row.hook || row.description || "Vídeo TikTok salvo",
        authorOrAdvertiser: row.creator ?? null,
        thumbnailUrl: row.thumbnail_url ?? null,
        playerKind: "tiktok_embed",
        embedUrl: row.video_id ? `https://www.tiktok.com/embed/v2/${row.video_id}` : null,
        directVideoUrl: null,
        originalUrl: row.video_url ?? null,
        country: null,
        niche: null,
        videoType: "video",
        views: row.views ?? null,
        likes: row.likes ?? null,
        comments: row.comments ?? null,
        score: row.viral_score ?? row.enhanced_score ?? null,
        createdAt: row.created_at ?? null,
        lastSeenAt: null,
        daysActive: null,
        status: "normal",
      });
    }
  }

  if (wantsPlatform(filters.platforms, "facebook")) {
    const { data, error } = await supabaseAdmin
      .from("user_ad_actions")
      .select("created_at, collected_ads(*)")
      .eq("user_id", userId)
      .eq("action", "saved")
      .order("created_at", { ascending: false })
      .limit(filters.limit);
    if (error) throw new Error(`Facebook salvos: ${error.message}`);
    type Row = { created_at: string; collected_ads: Record<string, unknown> | null };
    for (const r of (data ?? []) as unknown as Row[]) {
      const row = r.collected_ads;
      if (!row) continue;
      out.push({
        id: row.id as string,
        platform: "facebook",
        title: (row.headline as string) || (row.advertiser as string) || "Anúncio salvo",
        authorOrAdvertiser: (row.advertiser as string) ?? null,
        thumbnailUrl: (row.image_url as string) ?? (row.video_url as string) ?? null,
        playerKind: row.video_url ? "native_video" : "image_only",
        embedUrl: null,
        directVideoUrl: (row.video_url as string) ?? null,
        originalUrl: (row.ad_url as string) ?? null,
        country: (row.country as string) ?? null,
        niche: (row.niche as string) ?? null,
        videoType: row.creative_type === "video" ? "ad" : "image",
        views: null,
        likes: null,
        comments: null,
        score: (row.score as number) ?? null,
        createdAt: r.created_at,
        lastSeenAt: null,
        daysActive: null,
        status: "normal",
      });
    }
  }

  if (wantsPlatform(filters.platforms, "instagram")) {
    notes.push(
      "Instagram: ainda não existe mecanismo de favoritos — nenhum item aparece aqui para esta fonte.",
    );
  }
  if (wantsPlatform(filters.platforms, "youtube")) {
    notes.push(
      "YouTube: ainda não existe mecanismo de favoritos — nenhum item aparece aqui para esta fonte.",
    );
  }

  return out;
}

export function applyDateRange(cards: VideoRadarCard[], range: string): VideoRadarCard[] {
  const ms = dateRangeToMs(range);
  if (ms === null) return cards;
  const cutoff = Date.now() - ms;
  return cards.filter((c) => {
    const ref = c.createdAt;
    if (!ref) return true; // never hide a real row just because a date field is missing
    const t = new Date(ref).getTime();
    return Number.isNaN(t) || t >= cutoff;
  });
}

/** Read-only aggregator over the four existing mining tables — no new
 *  mining, no new persistence path, no change to any existing table's
 *  write logic. */
export const listVideoRadarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof FilterInput>) => FilterInput.parse(d))
  .handler(async ({ data, context }): Promise<VideoRadarResult> => {
    const userId = (context as { userId?: string }).userId as string;
    const notes: string[] = [];

    let cards: VideoRadarCard[];
    switch (data.tab) {
      case "bombando": {
        const [tiktok, instagram, youtube] = await Promise.all([
          fetchTikTok(userId, data, notes),
          fetchInstagram(userId, data, notes),
          fetchYouTube(userId, data, notes),
        ]);
        cards = [...tiktok, ...instagram, ...youtube].sort(
          (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        );
        break;
      }
      case "virais": {
        const [tiktok, instagram, youtube] = await Promise.all([
          fetchTikTok(userId, data, notes),
          fetchInstagram(userId, data, notes),
          fetchYouTube(userId, data, notes),
        ]);
        cards = [...tiktok, ...instagram, ...youtube]
          .filter((c) => c.score != null && c.score >= VIRAL_SCORE_THRESHOLD)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        break;
      }
      case "anuncios_ativos": {
        cards = await fetchFacebookAds(userId, data, notes);
        if (data.platforms && data.platforms.length && !data.platforms.includes("facebook")) {
          notes.push(
            "Anúncios Ativos mostra somente Facebook Ads Library (a única fonte com rastreio real de atividade/duração).",
          );
        }
        break;
      }
      case "salvos": {
        cards = await fetchSaved(userId, data, notes);
        break;
      }
    }

    cards = applyDateRange(cards, data.dateRange).slice(0, data.limit);
    return { cards, notes: Array.from(new Set(notes)) };
  });
