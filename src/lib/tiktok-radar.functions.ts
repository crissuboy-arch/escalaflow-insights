import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { generateAIJson } from "@/lib/aiService";
import { buildHandoffFromTikTokEscalate } from "@/lib/cris-os/contract";
import { handoffToCrisOs } from "@/lib/cris-os/service";

// .env: APIFY_TIKTOK_ACTOR=clockworks~tiktok-scraper
function getTikTokActorId(): string {
  const id = process.env.APIFY_TIKTOK_ACTOR?.trim();
  if (id) return id;
  return "clockworks~tiktok-scraper";
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

// videoMeta.coverUrl (and any "covers" entry from shouldDownloadCovers) points to a
// PRIVATE Apify key-value-store record (https://api.apify.com/v2/key-value-stores/...)
// that returns 403 without the Apify token — unusable as a public <img src>. Confirmed
// 2026-09-15 against a live dataset. Always prefer the direct TikTok CDN URL instead.
function isPrivateApifyUrl(url: string): boolean {
  return url.includes("api.apify.com/v2/key-value-stores/");
}

function firstValidUrl(candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates) {
    if (c && c.startsWith("http") && !isPrivateApifyUrl(c)) return c;
  }
  return undefined;
}

// Extracts the best available thumbnail URL from any Apify TikTok actor output shape.
// Priority: videoMeta.originalCoverUrl (public TikTok CDN) > dynamicCoverUrl > covers[0] > flat fields > avatar fallback
function extractThumbnailUrl(item: Record<string, unknown>): string {
  // 1. videoMeta object (clockworks~tiktok-scraper primary shape)
  const vm = getPath(item, "videoMeta");
  if (vm && typeof vm === "object") {
    const v = vm as Record<string, unknown>;
    const found = firstValidUrl(
      ["originalCoverUrl", "dynamicCoverUrl", "coverUrl", "cover", "thumbnail"].map((k) =>
        typeof v[k] === "string" ? (v[k] as string) : undefined,
      ),
    );
    if (found) return found;
  }

  // 2. covers array — can be strings or objects
  const coversRaw = getPath(item, "covers");
  if (Array.isArray(coversRaw) && coversRaw.length > 0) {
    const first = coversRaw[0];
    if (typeof first === "string") {
      const found = firstValidUrl([first]);
      if (found) return found;
    }
    if (first && typeof first === "object") {
      const c = first as Record<string, unknown>;
      const found = firstValidUrl(
        ["url", "coverUrl", "cover", "urlList"].map((k) => (typeof c[k] === "string" ? (c[k] as string) : undefined)),
      );
      if (found) return found;
      // urlList is sometimes an array
      if (Array.isArray(c["urlList"]) && typeof c["urlList"][0] === "string") {
        const found2 = firstValidUrl([c["urlList"][0] as string]);
        if (found2) return found2;
      }
    }
  }

  // 3. shareCover — array of cover URLs used for sharing
  const shareCover = getPath(item, "shareCover");
  if (Array.isArray(shareCover) && shareCover.length > 0 && typeof shareCover[0] === "string") {
    const found = firstValidUrl([shareCover[0] as string]);
    if (found) return found;
  }

  // 4. Flat-field fallbacks (various actor versions)
  const flat = firstValidUrl([
    pickStr(item, [
      "originalCoverUrl",
      "dynamicCover",
      "dynamicCoverUrl",
      "originCover",
      "cover",
      "coverUrl",
      "coverImageUrl",
      "thumbnail",
      "thumbnailUrl",
      "coverMediumUrl",
      "image",
      "imageUrl",
    ]),
  ]);
  if (flat) return flat;

  // 5. Last resort: author avatar (always present, shows something)
  return pickStr(item, ["authorMeta.avatar", "author.avatarMedium", "authorAvatar"]) ?? "";
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
  // Prefer uniqueId (username) over display name so video_url can be reconstructed as @username/video/id
  const creator =
    pickStr(item, ["authorMeta.uniqueId", "author.uniqueId", "authorMeta.name", "author", "author_name", "creator"]) ??
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

  // Extract thumbnail — try every field the clockworks~tiktok-scraper actor can return
  const thumbnailUrl = extractThumbnailUrl(item);

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
    thumbnail_url: thumbnailUrl,
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

const tiktokTable = () => supabaseAdmin.from("tiktok_minerados");

// ── input schemas ─────────────────────────────────────────────────────────────

export const MineInput = z.object({
  hashtag: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
});

const ListInput = z.object({
  hashtag: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  // Default unchanged (score) — "recent" surfaces freshly mined videos
  // that haven't accumulated views/likes yet, instead of them being
  // invisible below the fixed row cap once a hashtag has >200 total rows.
  sortBy: z.enum(["score", "recent"]).default("score"),
});

const IdInput = z.object({ id: z.string().uuid() });

const HashtagInput = z.object({ hashtag: z.string() });

// ── server functions ──────────────────────────────────────────────────────────

// Core mining logic, extracted so it has exactly one implementation shared
// by the normal (session-authenticated) server function below AND the
// server-to-server bridge in src/routes/api/integrations/mining.run.ts —
// no behavior change, just a name for what was already the handler body.
export async function runTikTokHashtagMining(
  data: z.infer<typeof MineInput>,
  userId: string,
): Promise<{ inserted: number; skipped: number }> {
  const { hashtag, limit } = data;

  const cleanHashtag = hashtag.replace(/^#+/, "").trim();
    const actorId = getTikTokActorId();

    const payload = {
      hashtags: [cleanHashtag],
      resultsPerPage: limit,
      proxyCountryCode: "None",
      excludePinnedPosts: false,
      scrapeRelatedVideos: false,
      shouldDownloadCovers: true,
      shouldDownloadSlideshowImages: false,
      shouldDownloadVideos: false,
    };

    console.log("[tiktok-radar] actor=", actorId);
    console.log("[tiktok-radar] mining hashtag:", cleanHashtag, "limit:", limit);

    let raw: Record<string, unknown>[];
    try {
      raw = await runSyncGetDatasetItems<Record<string, unknown>>(actorId, payload);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      console.error("[tiktok-radar] Apify error:", msg);
      if (msg.includes("403")) throw new Error(`TikTok Radar: actor "${actorId}" desativado ou sem permissão (403). Troque APIFY_TIKTOK_ACTOR no .env.`);
      if (msg.includes("404")) throw new Error(`TikTok Radar: actor "${actorId}" não encontrado (404). Verifique APIFY_TIKTOK_ACTOR no .env.`);
      if (msg.includes("401")) throw new Error(`TikTok Radar: token inválido (401). Verifique APIFY_TOKEN no .env. Actor: ${actorId}`);
      throw new Error(`TikTok Radar: ${msg}`);
    }

    if (!raw.length) return { inserted: 0, skipped: 0 };

    // DEBUG: log full structure of first item so we can see real field names
    if (raw[0]) {
      console.log("[tiktok-radar] FIRST RAW ITEM KEYS:", Object.keys(raw[0]).join(", "));
      const vm = raw[0]["videoMeta"];
      const covers = raw[0]["covers"];
      console.log("[tiktok-radar] videoMeta:", JSON.stringify(vm ?? null));
      console.log("[tiktok-radar] covers sample:", JSON.stringify(Array.isArray(covers) ? covers[0] : covers ?? null));
      console.log("[tiktok-radar] thumbnail_extracted:", extractThumbnailUrl(raw[0]));
      // log ALL fields that look like image URLs
      const imgFields: Record<string, unknown> = {};
      for (const k of Object.keys(raw[0])) {
        const v = raw[0][k];
        if (typeof v === "string" && (v.includes("tiktok") || v.includes("cdn") || v.includes("image") || v.includes("cover") || v.includes("thumb"))) {
          imgFields[k] = v;
        }
      }
      if (Object.keys(imgFields).length) console.log("[tiktok-radar] flat image-like fields:", JSON.stringify(imgFields));
    }

    const rows = raw
      .map((item) => normalizeItem(item, cleanHashtag))
      .filter((r) => r.video_id)
      .map((r) => ({ ...r, user_id: userId }));

    const videoIds = rows.map(r => r.video_id).filter(Boolean);

    // Fetch which video_ids already exist for this user (and whether they have a thumbnail)
    const { data: existing } = await tiktokTable()
      .select("id,video_id,thumbnail_url")
      .eq("user_id", userId)
      .in("video_id", videoIds);

    const existingMap = new Map((existing ?? []).map(e => [e.video_id as string, e as { id: string; video_id: string; thumbnail_url: string }]));

    const newRows = rows.filter(r => !existingMap.has(r.video_id));
    // Rows where video already exists but had an empty thumbnail — update just that field
    const thumbUpdates = rows.filter(r => {
      const ex = existingMap.get(r.video_id);
      return ex && !ex.thumbnail_url && r.thumbnail_url;
    });

    // Insert truly new videos
    let insertedCount = 0;
    if (newRows.length > 0) {
      const { data: ins, error } = await tiktokTable().insert(newRows).select("id");
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
      insertedCount = ins?.length ?? 0;
    }

    // Patch thumbnail_url only — never touch ai_analysis or other fields
    for (const r of thumbUpdates) {
      await tiktokTable()
        .update({ thumbnail_url: r.thumbnail_url })
        .eq("user_id", userId)
        .eq("video_id", r.video_id);
    }

    console.log("[tiktok-radar] inserted:", insertedCount, "thumb_patches:", thumbUpdates.length, "skipped:", rows.length - insertedCount - thumbUpdates.length);
  return { inserted: insertedCount, skipped: rows.length - insertedCount };
}

export const mineTikTokHashtagFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data, context }) => runTikTokHashtagMining(data, (context as any).userId as string));

export const listTikTokMinedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const orderColumn = data.sortBy === "recent" ? "created_at" : "viral_score";
    let query = tiktokTable()
      .select("*")
      .eq("user_id", userId)
      .order(orderColumn, { ascending: false })
      .limit(data.limit);

    if (data.hashtag) query = query.eq("hashtag", data.hashtag);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ── oEmbed thumbnail repair ───────────────────────────────────────────────────

export const fetchThumbnailsOembedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string;

    // 1. Find rows missing a thumbnail OR stuck with a private (unrenderable)
    //    Apify key-value-store URL saved before the extractor priority fix.
    const { data: rows, error } = await tiktokTable()
      .select("id, video_id, creator, video_url, thumbnail_url")
      .eq("user_id", userId)
      .or("thumbnail_url.is.null,thumbnail_url.eq.,thumbnail_url.ilike.%api.apify.com%");

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { updated: 0 };

    let updated = 0;
    for (const row of rows) {
      const videoId = row.video_id as string | null;
      const storedUrl = (row.video_url as string | null) ?? "";
      if (!videoId) continue;

      // Prefer stored video_url (already has @creator/video/id format) over constructing one
      const targetUrl = storedUrl.includes("tiktok.com")
        ? storedUrl
        : `https://www.tiktok.com/video/${videoId}`;

      try {
        const res = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`,
          { headers: { "User-Agent": "Mozilla/5.0 (compatible; TikTokCrawler)" } }
        );
        if (!res.ok) continue;
        const json = (await res.json()) as Record<string, unknown>;
        const thumb = typeof json.thumbnail_url === "string" ? json.thumbnail_url : "";
        if (!thumb) continue;

        await tiktokTable()
          .update({ thumbnail_url: thumb })
          .eq("id", row.id as string)
          .eq("user_id", userId);

        updated++;
      } catch {
        // skip individual failures silently
      }
    }

    return { updated };
  });

export type TikTokAiAnalysis = {
  // Conteúdo e estratégia
  niche: string;
  promise: string;
  emotion: string;
  mechanism: string;
  // Hook
  hook_analysis: string;
  hook_formula: string;
  // CTA e narrativa
  cta: string;
  narrative: string;
  // Retenção e edição
  retention: string;
  visual_pattern: string;
  editing_speed: string;
  editing_style: string;
  // Ofertas e conversão
  offer_angle: string;
  virality_reason: string;
  // Produtos digitais
  ebook_title: string;
  vsl_hook: string;
  // Mining Engine v2
  produto_detectado: string;
  formato_vsl: string;
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

    const systemPrompt = `Você é um estrategista sênior de marketing digital especializado em TikTok, VSL e produtos digitais.
Analise o vídeo do TikTok com profundidade e retorne um JSON com EXATAMENTE estes campos:
- niche: nicho de mercado específico (ex: "emagrecimento feminino 30+", "dropshipping de gadgets")
- promise: promessa principal entregue ao espectador em 1 frase direta
- emotion: emoção dominante ativada — escolha entre: medo, desejo, urgência, inveja, esperança, curiosidade, raiva, alívio
- mechanism: mecanismo único ou solução apresentada no vídeo (o "como" da promessa)
- hook_analysis: análise detalhada dos primeiros 3 segundos — o que prende a atenção e por quê
- hook_formula: fórmula estrutural do hook (ex: "Choque + Identificação + Promessa", "Pergunta + Problema + Solução")
- cta: call-to-action usado ou implícito no vídeo (ex: "Clica no link da bio", "Compra agora", "Salva esse vídeo")
- narrative: estrutura narrativa completa (ex: "Problema → Agitação → Solução → Prova → CTA")
- retention: técnicas de retenção identificadas (ex: "loop aberto, cortes rápidos, text on screen, suspense, humor")
- visual_pattern: padrão visual predominante (ex: "UGC estilo selfie", "B-roll com legenda", "Talking head + produto", "Antes e depois")
- editing_speed: velocidade de edição — exatamente uma de: "rápida", "média", "lenta"
- editing_style: estilo de edição (ex: "jump cuts estilo vlog", "transições suaves", "texto animado + música trending", "POV estático")
- offer_angle: ângulo de oferta ideal para vender produto/serviço para essa audiência
- virality_reason: por que esse vídeo viralizou — em 1 frase objetiva
- ebook_title: título de ebook premium para esse nicho (use números e promessa forte)
- vsl_hook: abertura de VSL de 15 segundos inspirada nesse hook (comece com impacto)
- produto_detectado: produto ou serviço específico detectado no vídeo (ex: "Suplemento para emagrecimento", "Curso de tráfego pago", "Gadget de cozinha") — se não identificar produto direto, descreva o conteúdo monetizável
- formato_vsl: classifique o formato para VSL (ex: "Gancho direto 15s + CTA", "Problema-solução 30s", "VSL completa 90s com prova social", "Tutorial + upsell", "Depoimento + produto")
Responda APENAS com o JSON válido, sem texto extra, sem markdown.`;

    const userPrompt = `Vídeo TikTok para análise:
Criador: @${row.creator}
Descrição/Hook: ${row.description}
Hashtags: ${(row.hashtags as string[])?.join(", ") ?? ""}
Views: ${Number(row.views).toLocaleString("pt-BR")}
Likes: ${Number(row.likes).toLocaleString("pt-BR")}
Compartilhamentos: ${Number(row.shares).toLocaleString("pt-BR")}
Comentários: ${Number(row.comments).toLocaleString("pt-BR")}
Áudio/Música: ${row.audio_title || "não identificado"}
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

// ── Playbook type ─────────────────────────────────────────────────────────────

export type TikTokPlaybook = {
  headline: string;
  promise: string;
  mechanism: string;
  target_audience: string;
  offer_structure: string;
  angle: string;
  cta: string;
  creatives: string[];
  funnel: string;
  strategy: string;
  vsl_script: string;
};

// ── Save / Escalate schemas ───────────────────────────────────────────────────

const AdPayloadInput = z.object({
  video_id:      z.string().default(""),
  creator:       z.string().default(""),
  hook:          z.string().default(""),
  description:   z.string().default(""),
  thumbnail_url: z.string().default(""),
  video_url:     z.string().default(""),
  views:         z.number().default(0),
  likes:         z.number().default(0),
  comments:      z.number().default(0),
  shares:        z.number().default(0),
  viral_score:   z.number().default(0),
  enhanced_score: z.number().default(0),
  hashtags:      z.array(z.string()).default([]),
  ai_analysis:   z.record(z.unknown()).nullable().default(null),
  source:        z.string().default("tiktok"),
});

const EscalateInput = AdPayloadInput.extend({
  playbook: z.record(z.unknown()).nullable().default(null),
});

const SaveCreatorInput = z.object({
  creator:         z.string(),
  source:          z.string().default("tiktok"),
  profile_url:     z.string().default(""),
  total_videos:    z.number().default(0),
  avg_views:       z.number().default(0),
  avg_viral_score: z.number().default(0),
  top_hashtags:    z.array(z.string()).default([]),
  notes:           z.string().optional(),
});

// ── save to anuncios_salvos ───────────────────────────────────────────────────

export const saveAnuncioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof AdPayloadInput>) => AdPayloadInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const row = { ...data, user_id: userId, ai_analysis: data.ai_analysis as Json | null };
    const { error } = await supabaseAdmin
      .from("anuncios_salvos")
      .insert(row);
    // Ignore unique-constraint duplicates silently
    if (error && !error.message.toLowerCase().includes("duplicate") && !error.code?.includes("23505"))
      throw new Error(error.message);
    return { ok: true };
  });

// ── save to anuncios_escalados ────────────────────────────────────────────────

export const escalateAnuncioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof EscalateInput>) => EscalateInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const row = { ...data, user_id: userId, ai_analysis: data.ai_analysis as Json | null, playbook: data.playbook as Json | null };
    const { data: saved, error } = await supabaseAdmin
      .from("anuncios_escalados")
      .upsert(row, { onConflict: "user_id,video_id", ignoreDuplicates: false })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Cris OS handoff — best-effort, never blocks or fails the escalate
    // action itself. Config is opt-in (CRIS_OS_API_URL/CRIS_OS_INTEGRATION_TOKEN);
    // when absent this just records NOT_SENT and returns immediately.
    if (saved) {
      const handoff = buildHandoffFromTikTokEscalate(saved as never);
      handoffToCrisOs(handoff, "anuncios_escalados", saved.id as string, userId).catch((e) =>
        console.error("[cris-os] handoff failed:", e),
      );
    }

    return { ok: true };
  });

// ── save creator ──────────────────────────────────────────────────────────────

export const saveCreatorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SaveCreatorInput>) => SaveCreatorInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await supabaseAdmin
      .from("creators_salvos")
      .upsert({ ...data, user_id: userId }, { onConflict: "user_id,creator,source", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── generate full playbook via AI ─────────────────────────────────────────────

export const generatePlaybookFn = createServerFn({ method: "POST" })
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

    const ai = row.ai_analysis as TikTokAiAnalysis | null;
    const aiCtx = ai
      ? `\nAnálise IA disponível:\n- Nicho: ${ai.niche}\n- Promessa: ${ai.promise}\n- Mecanismo: ${ai.mechanism ?? ""}\n- Emoção: ${ai.emotion}\n- Narrativa: ${ai.narrative ?? ""}\n- Ângulo: ${ai.offer_angle}\n- CTA: ${ai.cta ?? ""}\n- Retenção: ${ai.retention ?? ""}`
      : "";

    const systemPrompt = `Você é um estrategista de marketing digital de elite. Com base nos dados do vídeo TikTok viral, crie um playbook completo e acionável para escalar esse produto/oferta.
Retorne APENAS um JSON válido (sem markdown) com:
- headline: headline irresistível com promessa específica e número (máx 12 palavras)
- promise: promessa central em 1 frase impactante e crível
- mechanism: mecanismo único que torna a promessa possível (o "segredo" ou método proprietário)
- target_audience: avatar detalhado — demográfico, dores principais e desejos específicos
- offer_structure: estrutura da oferta (produto principal + 2 bônus + garantia + elemento de urgência)
- angle: ângulo de marketing mais potente para essa audiência (ex: "Mãe que quer renda extra sem sair de casa")
- cta: call-to-action irresistível para o criativo (máx 10 palavras, verbo de ação no início)
- creatives: array com EXATAMENTE 3 ideias de criativos virais distintos para TikTok/Reels (cada ideia em 1-2 frases concretas)
- funnel: funil de vendas completo (ex: "TikTok Orgânico → Bio Link → VSL 3min → Checkout → Upsell OTO 1 → Downsell")
- strategy: estratégia de escala para 30 dias — escreva 6 passos concretos separados por \\n (numerados)
- vsl_script: roteiro VSL de 90 segundos com marcações [GANCHO 0-5s] [PROBLEMA 5-20s] [AGITAÇÃO 20-35s] [SOLUÇÃO 35-55s] [PROVA 55-70s] [CTA 70-90s]`;

    const userPrompt = `Vídeo TikTok Viral:
Criador: @${row.creator}
Hook/Descrição: ${row.description}
Hashtags: ${(row.hashtags as string[])?.join(", ") ?? ""}
Views: ${Number(row.views).toLocaleString("pt-BR")} | Likes: ${Number(row.likes).toLocaleString("pt-BR")} | Shares: ${Number(row.shares).toLocaleString("pt-BR")} | Comentários: ${Number(row.comments).toLocaleString("pt-BR")}
Viral Score: ${row.viral_score}/100
Áudio: ${row.audio_title || "não identificado"}${aiCtx}

Gere um playbook completo para escalar esse produto/oferta.`;

    return await generateAIJson<TikTokPlaybook>(userPrompt, { systemPrompt });
  });

// ── EscalatePack type ─────────────────────────────────────────────────────────

export type EscalatePack = {
  hooks: string[];
  creatives: string[];
  meta_campaign: {
    objective: string;
    audience: string;
    primary_text: string;
    headline: string;
    cta: string;
  };
  tiktok_campaign: {
    format: string;
    hook_script: string;
    caption: string;
    cta: string;
    hashtags: string[];
  };
  google_ads: {
    headline1: string;
    headline2: string;
    headline3: string;
    description1: string;
    description2: string;
    keywords: string[];
  };
};

// ── generate escalate pack (hooks + creatives + Meta + TikTok + Google) ───────

export const generateEscalatePackFn = createServerFn({ method: "POST" })
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

    const ai = row.ai_analysis as TikTokAiAnalysis | null;
    const aiCtx = ai
      ? `Nicho: ${ai.niche} | Produto: ${ai.produto_detectado ?? ""} | Promessa: ${ai.promise} | Mecanismo: ${ai.mechanism ?? ""} | Ângulo: ${ai.offer_angle} | CTA: ${ai.cta ?? ""}`
      : "";

    const systemPrompt = `Você é um expert em tráfego pago e performance marketing para TikTok, Meta e Google.
Com base nos dados do vídeo TikTok viral, gere um pacote completo de escala.
Retorne APENAS JSON válido sem markdown com exatamente esta estrutura:
{
  "hooks": ["hook1","hook2","hook3","hook4","hook5"],
  "creatives": ["criativo1","criativo2","criativo3"],
  "meta_campaign": {
    "objective": "objetivo da campanha Meta (ex: Conversões, Tráfego, Alcance)",
    "audience": "avatar detalhado: idade, gênero, interesses, comportamentos",
    "primary_text": "copy principal do anúncio (máx 125 caracteres, inclua emoji)",
    "headline": "headline do anúncio (máx 27 caracteres)",
    "cta": "botão CTA Meta (ex: Saiba Mais, Comprar Agora, Inscrever-se)"
  },
  "tiktok_campaign": {
    "format": "formato do ad TikTok (Spark Ad, In-Feed, TopView)",
    "hook_script": "roteiro do gancho 0-3s (exatamente o que falar/mostrar)",
    "caption": "legenda do TikTok com emojis (máx 150 chars)",
    "cta": "botão CTA TikTok (ex: Saiba Mais, Comprar Agora)",
    "hashtags": ["hashtag1","hashtag2","hashtag3","hashtag4","hashtag5"]
  },
  "google_ads": {
    "headline1": "título 1 (máx 30 chars)",
    "headline2": "título 2 (máx 30 chars)",
    "headline3": "título 3 (máx 30 chars)",
    "description1": "descrição 1 (máx 90 chars)",
    "description2": "descrição 2 (máx 90 chars)",
    "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"]
  }
}
hooks: 5 hooks de alta conversão — cada um em 1 frase impactante, variando o ângulo (choque, curiosidade, dor, desejo, identidade)
creatives: 3 briefings completos de criativos: formato + roteiro 3 etapas + chamada final`;

    const userPrompt = `Vídeo TikTok Viral:
Criador: @${row.creator}
Hook: ${row.description}
Views: ${Number(row.views).toLocaleString("pt-BR")} | Shares: ${Number(row.shares).toLocaleString("pt-BR")} | Likes: ${Number(row.likes).toLocaleString("pt-BR")}
Viral Score: ${row.viral_score}/100
Hashtags: ${(row.hashtags as string[])?.join(", ") ?? ""}
${aiCtx}

Gere o pacote completo para escalar esse anúncio.`;

    return await generateAIJson<EscalatePack>(userPrompt, { systemPrompt });
  });
