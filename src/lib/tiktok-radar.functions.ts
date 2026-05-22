import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { generateAIJson } from "@/lib/aiService";

// Actor ID used for TikTok scraping.
// Apify supports both username~actorName and username/actorName formats.
// clockworks/tiktok-scraper is the confirmed working actor (also used in src/lib/miners/tiktok.ts).
// Override via APIFY_TIKTOK_ACTOR in .env if needed.
function getTikTokActorId(): string {
  // .trim() handles Windows \r\n line endings in .env values
  const id = process.env.APIFY_TIKTOK_ACTOR?.trim();
  if (id) return id;
  return "clockworks/tiktok-scraper";
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function pickStr(obj: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, paths: string[]): number {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

function extractHashtags(obj: Record<string, unknown>): string[] {
  const raw = getPath(obj, "hashtags") ?? [];
  if (Array.isArray(raw)) {
    return raw
      .map((h: unknown) => (typeof h === "string" ? h : (h as any)?.name ?? String(h)))
      .filter(Boolean);
  }
  const desc = pickStr(obj, ["text", "description", "desc"]) ?? "";
  return [...desc.matchAll(/#(\w+)/g)].map((m) => m[1]);
}

function normalizeItem(item: Record<string, unknown>, hashtag: string) {
  const videoId = pickStr(item, ["id", "video_id", "videoId"]) ?? "";
  const creator =
    pickStr(item, ["authorMeta.name", "author.uniqueId", "author", "author_name", "creator"]) ??
    "Desconhecido";
  const videoUrl =
    pickStr(item, ["webVideoUrl", "video_url", "downloadUrl", "videoUrl", "shareUrl"]) ?? "";
  const description = pickStr(item, ["text", "description", "desc", "caption"]) ?? "";
  const hook = description.slice(0, 140);
  const hashtags = extractHashtags(item);
  const views = pickNum(item, ["playCount", "stats.playCount", "views", "play_count"]);
  const likes = pickNum(item, ["diggCount", "stats.diggCount", "likes", "like_count"]);
  const comments = pickNum(item, [
    "commentCount",
    "stats.commentCount",
    "comments",
    "comment_count",
  ]);
  const shares = pickNum(item, ["shareCount", "stats.shareCount", "shares", "share_count"]);
  const audioTitle =
    pickStr(item, ["musicMeta.musicName", "music", "audioTitle", "sound_name"]) ?? "";
  const createTime = pickStr(item, ["createTimeISO", "createTime", "created_at", "timestamp"]);

  const viralScore = Math.min(
    100,
    Math.round(
      (views > 0 ? Math.log10(views) * 10 : 0) +
        (likes > 0 ? Math.log10(likes) * 5 : 0) +
        (shares > 0 ? Math.log10(shares) * 5 : 0),
    ),
  );

  return {
    hashtag,
    video_id: videoId,
    creator,
    video_url: videoUrl,
    hook,
    hashtags,
    views,
    likes,
    comments,
    shares,
    audio_title: audioTitle,
    viral_score: viralScore,
    description,
    create_time: createTime ?? null,
  };
}

// Supabase types don't include tiktok_minerados yet (migration pending on remote).
// Using typed helper to avoid casting throughout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tiktokTable = () => (supabaseAdmin as any).from("tiktok_minerados");

// ── input schemas ─────────────────────────────────────────────────────────────

const MineInput = z.object({
  hashtag: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
});

const ListInput = z.object({
  hashtag: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

const IdInput = z.object({ id: z.string().uuid() });

const HashtagInput = z.object({ hashtag: z.string() });

// ── server functions ──────────────────────────────────────────────────────────

export const mineTikTokHashtagFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data, context }) => {
    const { hashtag, limit } = data;
    const userId = (context as any).userId as string;

    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
    const actorId = getTikTokActorId();

    console.log(`[tiktok-radar] actor=${actorId} hashtag="${cleanHashtag}" limit=${limit}`);

    // clockworks/tiktok-scraper accepts searchQueries (with # prefix) and resultsLimit.
    // Confirmed by src/lib/miners/tiktok.ts which uses the same actor.
    const payload = {
      searchQueries: [`#${cleanHashtag}`],
      resultsLimit: limit,
    };

    const raw = await runSyncGetDatasetItems<Record<string, unknown>>(actorId, payload);

    if (!raw.length) return { inserted: 0, skipped: 0 };

    const rows = raw
      .map((item) => normalizeItem(item, cleanHashtag))
      .filter((r) => r.video_id)
      .map((r) => ({ ...r, user_id: userId }));

    const { data: inserted, error } = await tiktokTable()
      .upsert(rows, { onConflict: "user_id,video_id", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return { inserted: inserted?.length ?? 0, skipped: rows.length - (inserted?.length ?? 0) };
  });

export const listTikTokMinedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    let query = tiktokTable()
      .select("*")
      .eq("user_id", userId)
      .order("viral_score", { ascending: false })
      .limit(data.limit);

    if (data.hashtag) query = query.eq("hashtag", data.hashtag);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type TikTokAiAnalysis = {
  niche: string;
  promise: string;
  emotion: string;
  hook_formula: string;
  offer_angle: string;
  ebook_title: string;
  vsl_hook: string;
  virality_reason: string;
};

export const analyzeTikTokVideoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;

    const { data: row, error } = await tiktokTable()
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();

    if (error || !row) throw new Error("Vídeo não encontrado");

    const systemPrompt = `Você é um estrategista de marketing digital especializado em TikTok Shop e produtos digitais.
Analise o vídeo do TikTok e retorne um JSON com:
- niche: nicho de mercado do vídeo
- promise: promessa principal que o vídeo entrega
- emotion: emoção dominante ativada (medo, desejo, urgência, inveja, esperança)
- hook_formula: fórmula do hook (ex: "Problema + Agitação + Solução")
- offer_angle: ângulo de oferta recomendado para vender para essa audiência
- ebook_title: sugestão de título de ebook para esse nicho
- vsl_hook: primeiros 15 segundos de VSL baseado nesse hook
- virality_reason: por que esse vídeo viralizou em uma frase
Responda APENAS com o JSON, sem texto extra.`;

    const userPrompt = `Vídeo TikTok:
Criador: ${row.creator}
Hook/Descrição: ${row.description}
Hashtags: ${(row.hashtags as string[])?.join(", ") ?? ""}
Views: ${Number(row.views).toLocaleString("pt-BR")}
Likes: ${Number(row.likes).toLocaleString("pt-BR")}
Compartilhamentos: ${Number(row.shares).toLocaleString("pt-BR")}
Áudio: ${row.audio_title}
Viral Score: ${row.viral_score}/100`;

    const analysis = await generateAIJson<TikTokAiAnalysis>(userPrompt, { systemPrompt });

    await tiktokTable()
      .update({ ai_analysis: analysis })
      .eq("id", data.id)
      .eq("user_id", userId);

    return analysis;
  });

export const deleteTikTokVideoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await tiktokTable()
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearTikTokHashtagFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof HashtagInput>) => HashtagInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await tiktokTable()
      .delete()
      .eq("user_id", userId)
      .eq("hashtag", data.hashtag);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
