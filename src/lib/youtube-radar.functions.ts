import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runYouTubeRadarSkill } from "@/skills/youtube-radar.skill";
import { generateAIJson } from "@/lib/aiService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ytTable = () => (supabaseAdmin as any).from("youtube_minerados");

function detectShort(duration: string, videoUrl: string): boolean {
  if (videoUrl.toLowerCase().includes("/shorts/")) return true;
  const m = duration.match(/^(\d+):(\d+)$/);
  if (m) return parseInt(m[1]) === 0 && parseInt(m[2]) <= 60;
  return false;
}

// ── input schemas ─────────────────────────────────────────────────────────────

export const MineInput = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(100).default(30),
  dateFilter: z
    .enum(["today", "week", "month", "year"])
    .optional(),
});

const ListInput = z.object({
  query: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
  // Default unchanged (score) — "recent" surfaces freshly mined videos
  // that haven't accumulated views/likes yet, instead of them being
  // invisible below the fixed row cap once a query has >200 total rows.
  sortBy: z.enum(["score", "recent"]).default("score"),
});

const IdInput = z.object({ id: z.string().uuid() });
const QueryInput = z.object({ query: z.string() });

// ── server functions ──────────────────────────────────────────────────────────

// Core mining logic, extracted so it has exactly one implementation shared
// by the normal (session-authenticated) server function below AND the
// server-to-server bridge in src/routes/api/integrations/mining.run.ts —
// no behavior change, just a name for what was already the handler body.
export async function runYouTubeMining(
  data: z.infer<typeof MineInput>,
  userId: string,
): Promise<{ inserted: number; skipped: number; warning?: string }> {
  const result = await runYouTubeRadarSkill({
      query: data.query,
      maxResults: data.maxResults,
      dateFilter: data.dateFilter as any,
    });

    if (!result.ok) {
      // Return warning instead of throwing so the frontend keeps showing saved videos.
      const actor = process.env.APIFY_YOUTUBE_ACTOR?.trim() ?? "streamers~youtube-scraper";
      const raw = result.error ?? "YouTube skill failed";
      const friendly = raw.includes("403")
        ? `YouTube Radar: actor "${actor}" desativado ou sem permissão (403). Troque APIFY_YOUTUBE_ACTOR no .env.`
        : raw.includes("404")
        ? `YouTube Radar: actor "${actor}" não encontrado (404). Verifique APIFY_YOUTUBE_ACTOR no .env.`
        : raw.includes("401")
        ? `YouTube Radar: token inválido (401). Verifique APIFY_TOKEN no .env. Actor: ${actor}`
        : raw;
      console.warn("[youtube-radar] mine failed:", friendly);
      return { inserted: 0, skipped: 0, warning: friendly };
    }
    if (!result.data.length) return { inserted: 0, skipped: 0 };

    const safe = (v: unknown, fallback = "") =>
      v == null ? fallback : typeof v === "object" ? JSON.stringify(v) : String(v);

    const rows = result.data
      .filter((v) => v.videoId)
      .map((v) => ({
        user_id: userId,
        query: data.query.trim(),
        video_id: safe(v.videoId),
        title: safe(v.title),
        channel_name: safe(v.channelName),
        channel_id: safe(v.channelId),
        video_url: safe(v.videoUrl),
        description: safe(v.description).slice(0, 500),
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map(String) : [],
        views: v.views ?? 0,
        likes: v.likes ?? 0,
        comments: v.comments ?? 0,
        duration: safe(v.duration),
        is_short: detectShort(safe(v.duration), safe(v.videoUrl)),
        published_at: v.publishedAt != null ? safe(v.publishedAt) : null,
        thumbnail_url: safe(v.thumbnailUrl),
        viral_score: v.viralScore ?? 0,
      }));

    const sanitized = rows.map(r => ({
      ...r,
      hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
      thumbnail_url: typeof r.thumbnail_url === 'string' ? r.thumbnail_url : '',
      description: typeof r.description === 'string' ? r.description : '',
      published_at: typeof r.published_at === 'string' ? r.published_at : null,
      views: Number(r.views ?? 0) || 0,
      likes: Number(r.likes ?? 0) || 0,
      comments: Number(r.comments ?? 0) || 0,
      viral_score: Math.round(Number(r.viral_score ?? 0)) || 0,
    }));

    const { data: inserted, error } = await ytTable()
      .upsert(sanitized, { onConflict: "user_id,video_id", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(`Supabase error: ${error.message}`);
  return {
    inserted: inserted?.length ?? 0,
    skipped: rows.length - (inserted?.length ?? 0),
  };
}

export const mineYouTubeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data, context }) => runYouTubeMining(data, (context as any).userId as string));

export const listYouTubeMinedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const orderColumn = data.sortBy === "recent" ? "created_at" : "viral_score";
    let query = ytTable()
      .select("*")
      .eq("user_id", userId)
      .order(orderColumn, { ascending: false })
      .limit(data.limit);

    if (data.query) query = query.eq("query", data.query);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type YouTubeAiAnalysis = {
  niche: string;
  hook_formula: string;
  content_formula: string;
  promise: string;
  offer_angle: string;
  ebook_title: string;
  vsl_hook: string;
  virality_reason: string;
};

export const analyzeYouTubeVideoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;

    const { data: row, error } = await ytTable()
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();

    if (error || !row) throw new Error("Vídeo não encontrado");

    const systemPrompt = `Você é um estrategista de marketing digital especializado em YouTube e produtos digitais.
Analise o vídeo e retorne um JSON com:
- niche: nicho de mercado
- hook_formula: fórmula do hook do título
- content_formula: estrutura do conteúdo (ex: Problema + Agitação + Solução)
- promise: promessa principal do vídeo
- offer_angle: ângulo de oferta recomendado
- ebook_title: título de ebook sugerido para esse nicho
- vsl_hook: primeiros 15 segundos de VSL baseado nesse hook
- virality_reason: por que esse vídeo viralizou em uma frase
Responda APENAS com o JSON.`;

    const userPrompt = `Vídeo YouTube:
Título: ${row.title}
Canal: ${row.channel_name}
Descrição: ${row.description}
Hashtags: ${(row.hashtags as string[])?.join(", ")}
Views: ${Number(row.views).toLocaleString("pt-BR")}
Likes: ${Number(row.likes).toLocaleString("pt-BR")}
Duração: ${row.duration}
Short: ${row.is_short ? "Sim" : "Não"}
Viral Score: ${row.viral_score}/100`;

    const analysis = await generateAIJson<YouTubeAiAnalysis>(userPrompt, { systemPrompt });

    await ytTable()
      .update({ ai_analysis: analysis })
      .eq("id", data.id)
      .eq("user_id", userId);

    return analysis;
  });

export const deleteYouTubeVideoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await ytTable()
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearYouTubeQueryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof QueryInput>) => QueryInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await ytTable()
      .delete()
      .eq("user_id", userId)
      .eq("query", data.query);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
