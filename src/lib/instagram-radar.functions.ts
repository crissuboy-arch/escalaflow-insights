import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { generateAIJson } from "@/lib/aiService";

// .env: APIFY_INSTAGRAM_ACTOR=apify~instagram-scraper
function getInstagramActorId(): string {
  const id = process.env.APIFY_INSTAGRAM_ACTOR?.trim();
  if (id) return id;
  return "apify~instagram-scraper";
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
    return (raw as unknown[])
      .map((h) => (typeof h === "string" ? h : (h as Record<string, unknown>)?.name ?? String(h)))
      .filter(Boolean) as string[];
  }
  const caption = pickStr(obj, ["caption", "text"]) ?? "";
  return [...caption.matchAll(/#(\w+)/g)].map((m) => m[1]);
}

function extractMentions(obj: Record<string, unknown>): string[] {
  const raw = getPath(obj, "mentions") ?? [];
  if (Array.isArray(raw)) {
    return (raw as unknown[]).map((m) => (typeof m === "string" ? m : String(m))).filter(Boolean);
  }
  const caption = pickStr(obj, ["caption", "text"]) ?? "";
  return [...caption.matchAll(/@(\w+)/g)].map((m) => m[1]);
}

function normalizeItem(
  item: Record<string, unknown>,
  search: string,
  searchType: string,
  resultsType: string,
) {
  const shortCode =
    pickStr(item, ["shortCode", "shortcode", "short_code"]) ?? "";
  const postUrl =
    pickStr(item, ["url", "link", "post_url", "permalink"]) ??
    (shortCode ? `https://www.instagram.com/p/${shortCode}/` : "");
  const caption = pickStr(item, ["caption", "text", "description"]) ?? "";
  const hashtags = extractHashtags(item);
  const mentions = extractMentions(item);
  const commentsCount = pickNum(item, [
    "commentsCount",
    "comments_count",
    "numberOfComments",
  ]);
  const likesCount = pickNum(item, ["likesCount", "likes_count", "likes"]);
  const videoViewCount = pickNum(item, [
    "videoViewCount",
    "video_view_count",
    "videoPlayCount",
  ]);
  const ownerUsername =
    pickStr(item, ["ownerUsername", "owner.username", "owner_username", "username"]) ?? "";
  const ownerFullName =
    pickStr(item, ["ownerFullName", "owner.fullName", "owner_full_name", "fullName"]) ?? "";
  const displayUrl =
    pickStr(item, ["displayUrl", "display_url", "imageUrl", "thumbnailUrl", "thumbnail_url"]) ??
    "";

  const engagementScore = Math.min(
    100,
    Math.round(
      (likesCount > 0 ? Math.log10(likesCount) * 12 : 0) +
        (commentsCount > 0 ? Math.log10(commentsCount) * 8 : 0) +
        (videoViewCount > 0 ? Math.log10(videoViewCount) * 5 : 0),
    ),
  );

  return {
    search,
    search_type: searchType,
    results_type: resultsType,
    short_code: shortCode,
    post_url: postUrl,
    caption,
    hashtags,
    mentions,
    comments_count: commentsCount,
    likes_count: likesCount,
    owner_username: ownerUsername,
    owner_full_name: ownerFullName,
    display_url: displayUrl,
    engagement_score: engagementScore,
    raw: item,
  };
}

// Supabase types don't include instagram_minerados yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const instagramTable = () => (supabaseAdmin as any).from("instagram_minerados");

// ── input schemas ─────────────────────────────────────────────────────────────

const MineInput = z.object({
  search: z.string().min(1),
  searchType: z.enum(["hashtag", "user", "url", "place"]).default("hashtag"),
  resultsType: z.enum(["posts", "reels"]).default("posts"),
  limit: z.number().int().min(1).max(100).default(50),
});

const ListInput = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

const IdInput = z.object({ id: z.string().uuid() });

const SearchInput = z.object({ search: z.string() });

// ── server functions ──────────────────────────────────────────────────────────

export const mineInstagramFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data, context }) => {
    const { search, searchType, resultsType, limit } = data;
    const userId = (context as any).userId as string;

    const actor = getInstagramActorId();
    const cleanSearch = search.replace(/^[#@]+/, "").trim();

    let payload: Record<string, unknown>;
    if (searchType === "url") {
      payload = {
        directUrls: [search.trim()],
        resultsType,
        resultsLimit: limit,
      };
    } else {
      payload = {
        search: cleanSearch,
        searchType,
        searchLimit: 10,
        resultsType,
        resultsLimit: limit,
      };
    }

    console.log("[instagram-radar] actor=", actor);
    console.log(
      "[instagram-radar] url=",
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=***&timeout=120`,
    );
    console.log("[instagram-radar] payload=", payload);

    const raw = await runSyncGetDatasetItems<Record<string, unknown>>(actor, payload);

    if (!raw.length) return { inserted: 0, skipped: 0 };

    const rows = raw
      .map((item) => normalizeItem(item, cleanSearch, searchType, resultsType))
      .filter((r) => r.short_code)
      .map((r) => ({ ...r, user_id: userId }));

    const { data: inserted, error } = await instagramTable()
      .upsert(rows, { onConflict: "user_id,short_code", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return {
      inserted: inserted?.length ?? 0,
      skipped: rows.length - (inserted?.length ?? 0),
    };
  });

export const listInstagramMinedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    let query = instagramTable()
      .select("*")
      .eq("user_id", userId)
      .order("engagement_score", { ascending: false })
      .limit(data.limit);

    if (data.search) query = query.eq("search", data.search);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type InstagramAiAnalysis = {
  niche: string;
  promise: string;
  emotion: string;
  hook_formula: string;
  offer_angle: string;
  ebook_title: string;
  caption_hook: string;
  virality_reason: string;
};

export const analyzeInstagramPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;

    const { data: row, error } = await instagramTable()
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();

    if (error || !row) throw new Error("Post não encontrado");

    const systemPrompt = `Você é um estrategista de marketing digital especializado em Instagram e produtos digitais.
Analise o post do Instagram e retorne um JSON com:
- niche: nicho de mercado do post
- promise: promessa principal que o post entrega
- emotion: emoção dominante ativada (medo, desejo, urgência, inveja, esperança)
- hook_formula: fórmula do hook da legenda
- offer_angle: ângulo de oferta recomendado para vender para essa audiência
- ebook_title: sugestão de título de ebook para esse nicho
- caption_hook: primeiras 2 linhas de legenda de alta conversão baseada nesse conteúdo
- virality_reason: por que esse post engajou em uma frase
Responda APENAS com o JSON, sem texto extra.`;

    const userPrompt = `Post Instagram:
Criador: @${row.owner_username} (${row.owner_full_name})
Legenda: ${row.caption}
Hashtags: ${(row.hashtags as string[])?.join(", ") ?? ""}
Menções: ${(row.mentions as string[])?.join(", ") ?? ""}
Likes: ${Number(row.likes_count).toLocaleString("pt-BR")}
Comentários: ${Number(row.comments_count).toLocaleString("pt-BR")}
Engagement Score: ${row.engagement_score}/100`;

    const analysis = await generateAIJson<InstagramAiAnalysis>(userPrompt, { systemPrompt });

    await instagramTable()
      .update({ ai_analysis: analysis })
      .eq("id", data.id)
      .eq("user_id", userId);

    return analysis;
  });

export const deleteInstagramPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await instagramTable()
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearInstagramSearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SearchInput>) => SearchInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await instagramTable()
      .delete()
      .eq("user_id", userId)
      .eq("search", data.search);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
