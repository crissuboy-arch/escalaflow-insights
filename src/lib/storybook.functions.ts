import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  StoryPlanningSchema,
  CharacterSchema,
  StructureSchema,
  ChapterSchema,
  aiGenerateCharacters,
  aiGenerateStructure,
  aiGenerateChapter,
  aiGenerateCoverPrompts,
  aiGenerateShorts,
  aiGenerateAudiobookScript,
  type StoryPlanning,
  type Character,
  type StoryStructure,
  type StoryChapter,
  type ChapterAction,
} from "./storybook.server";

interface StoryMeta {
  planning?: StoryPlanning;
  characters?: Character[];
  structure?: StoryStructure;
  chapters?: StoryChapter[];
  cover?: {
    style?: string;
    prompts?: { dalle: string; midjourney: string; leonardo: string; gemini: string };
    badges?: string[];
    author?: string;
  };
  shorts?: Array<{ chapterId: string; data: object }>;
  audiobook?: {
    voice?: string;
    speed?: number;
    soundtrack?: string;
    scripts?: Record<string, string>;
  };
  step?: number;
}

function readStory(meta: unknown): StoryMeta {
  const m = (meta && typeof meta === "object" ? meta : {}) as Record<string, unknown>;
  const s = (m.story && typeof m.story === "object" ? m.story : {}) as StoryMeta;
  return s;
}

async function loadProject(supabase: any, userId: string, id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function saveStory(supabase: any, projectRow: any, story: StoryMeta) {
  const meta = {
    ...((projectRow.meta && typeof projectRow.meta === "object" ? projectRow.meta : {}) as Record<
      string,
      unknown
    >),
    story,
  };
  const patch: Record<string, unknown> = { meta };
  if (story.planning?.title) patch.title = story.planning.title;
  if (story.planning?.type) patch.niche = story.planning.type;
  const { error } = await supabase
    .from("projects")
    .update(patch as never)
    .eq("id", projectRow.id);
  if (error) throw new Error(error.message);
}

// ---------- Create ----------

export const createStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planning: StoryPlanning }) =>
    z.object({ planning: StoryPlanningSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const story: StoryMeta = { planning: data.planning, step: 1, chapters: [] };
    const row = {
      user_id: userId,
      title: data.planning.title,
      niche: data.planning.type,
      mode: "story",
      briefing: {} as never,
      outline: [] as never,
      meta: { story } as never,
      cover_url: data.planning.coverImageUrl || null,
      step: 1,
      status: "draft",
    };
    const { data: out, error } = await supabase
      .from("projects")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: out.id as string };
  });

// ---------- Update arbitrary patch ----------

export const updateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Partial<StoryMeta> }) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const current = readStory(project.meta);
    const next = { ...current, ...(data.patch as StoryMeta) } as StoryMeta;
    await saveStory(context.supabase, project, next);
    return { ok: true };
  });

// ---------- Characters ----------

export const generateCharacters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; count: number }) =>
    z.object({ id: z.string().uuid(), count: z.number().min(2).max(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.planning) throw new Error("Planejamento ausente.");
    const characters = await aiGenerateCharacters(story.planning, data.count);
    await saveStory(context.supabase, project, { ...story, characters, step: Math.max(2, story.step ?? 0) });
    return { characters };
  });

// ---------- Structure ----------

export const generateStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.planning) throw new Error("Planejamento ausente.");
    const structure = await aiGenerateStructure(story.planning, story.characters ?? []);
    const chapters: StoryChapter[] = structure.outline.map((o, i) =>
      ChapterSchema.parse({
        id: crypto.randomUUID(),
        index: i,
        title: o.title,
        body: "",
        words: 0,
        status: "empty",
      }),
    );
    await saveStory(context.supabase, project, {
      ...story,
      structure,
      chapters,
      step: Math.max(3, story.step ?? 0),
    });
    return { structure, chapters };
  });

// ---------- Chapter ----------

const ActionEnum = z.enum([
  "generate",
  "regenerate",
  "expand",
  "shorten",
  "more-emotion",
  "more-tension",
  "more-romance",
  "more-humor",
  "more-dialogue",
]);

export const generateStoryChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; chapterId: string; action: ChapterAction }) =>
    z
      .object({
        id: z.string().uuid(),
        chapterId: z.string(),
        action: ActionEnum,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.planning || !story.structure || !story.chapters)
      throw new Error("Estrutura ausente. Gere a estrutura antes.");
    const idx = story.chapters.findIndex((c) => c.id === data.chapterId);
    if (idx < 0) throw new Error("Capítulo não encontrado.");
    const ch = story.chapters[idx];
    const outlineItem = story.structure.outline[idx] ?? {
      title: ch.title,
      summary: "",
    };
    const recap = idx > 0 ? story.chapters[idx - 1]?.body ?? "" : "";
    const body = await aiGenerateChapter(
      story.planning,
      story.characters ?? [],
      outlineItem,
      idx,
      story.chapters.length,
      data.action,
      ch.body,
      recap,
    );
    const words = body.split(/\s+/).filter(Boolean).length;
    const updated = [...story.chapters];
    updated[idx] = { ...ch, body, words, status: "ready" as const };
    await saveStory(context.supabase, project, {
      ...story,
      chapters: updated,
      step: Math.max(4, story.step ?? 0),
    });
    return { chapter: updated[idx] };
  });

export const updateStoryChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; chapterId: string; body: string }) =>
    z
      .object({
        id: z.string().uuid(),
        chapterId: z.string(),
        body: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.chapters) throw new Error("Capítulos ausentes.");
    const idx = story.chapters.findIndex((c) => c.id === data.chapterId);
    if (idx < 0) throw new Error("Capítulo não encontrado.");
    const updated = [...story.chapters];
    const words = data.body.split(/\s+/).filter(Boolean).length;
    updated[idx] = { ...updated[idx], body: data.body, words, status: "ready" };
    await saveStory(context.supabase, project, { ...story, chapters: updated });
    return { ok: true };
  });

// ---------- Cover ----------

export const generateCoverPrompts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; styleHint: string; badges: string[] }) =>
    z
      .object({
        id: z.string().uuid(),
        styleHint: z.string(),
        badges: z.array(z.string()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.planning) throw new Error("Planejamento ausente.");
    const prompts = await aiGenerateCoverPrompts(story.planning, data.styleHint, data.badges);
    const cover = {
      ...(story.cover ?? {}),
      style: data.styleHint,
      prompts,
      badges: data.badges,
    };
    await saveStory(context.supabase, project, {
      ...story,
      cover,
      step: Math.max(5, story.step ?? 0),
    });
    return { prompts };
  });

// ---------- Shorts ----------

export const generateShorts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; chapterId: string }) =>
    z.object({ id: z.string().uuid(), chapterId: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.planning || !story.chapters) throw new Error("Capítulo ausente.");
    const ch = story.chapters.find((c) => c.id === data.chapterId);
    if (!ch || !ch.body) throw new Error("Capítulo sem texto. Gere o capítulo primeiro.");
    const shorts = await aiGenerateShorts(story.planning, { title: ch.title, body: ch.body });
    const next = [
      ...(story.shorts ?? []).filter((s) => s.chapterId !== data.chapterId),
      { chapterId: data.chapterId, data: shorts },
    ];
    await saveStory(context.supabase, project, {
      ...story,
      shorts: next,
      step: Math.max(6, story.step ?? 0),
    });
    return { shorts };
  });

// ---------- Audiobook ----------

export const generateAudiobookScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; chapterId: string; voice: string; speed: number; soundtrack: string }) =>
      z
        .object({
          id: z.string().uuid(),
          chapterId: z.string(),
          voice: z.string(),
          speed: z.number().min(0.5).max(2),
          soundtrack: z.string(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    if (!story.planning || !story.chapters) throw new Error("Capítulo ausente.");
    const ch = story.chapters.find((c) => c.id === data.chapterId);
    if (!ch || !ch.body) throw new Error("Capítulo sem texto.");
    const script = await aiGenerateAudiobookScript(
      story.planning,
      { title: ch.title, body: ch.body },
      data.voice,
    );
    const audiobook = {
      ...(story.audiobook ?? {}),
      voice: data.voice,
      speed: data.speed,
      soundtrack: data.soundtrack,
      scripts: { ...(story.audiobook?.scripts ?? {}), [data.chapterId]: script },
    };
    await saveStory(context.supabase, project, {
      ...story,
      audiobook,
      step: Math.max(7, story.step ?? 0),
    });
    return { script };
  });

// ---------- Load ----------

export const loadStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    return { project, story: readStory(project.meta) };
  });

export const listStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, title, niche, mode, status, step, updated_at, meta")
      .eq("mode", "story")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Cover image (DALL-E 3) ----------

export const generateStoryCoverFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string }) => z.object({ prompt: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada. Adicione a chave no .env.");
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "dall-e-3", prompt: data.prompt, n: 1, size: "1024x1024", quality: "standard" }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`OpenAI error ${res.status}: ${body}`);
    }
    const json = await res.json() as { data?: { url?: string }[] };
    const url = json.data?.[0]?.url;
    if (!url) throw new Error("Imagem não gerada pela API.");
    return { url };
  });

// ---------- Ebook cover (Gemini — multi-model fallback) ----------

async function tryImagenPredict(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<{ url: string; status: number }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "9:16", safetyFilterLevel: "block_few" },
      }),
    });
    if (!res.ok) return { url: "", status: res.status };
    const json = await res.json() as { predictions?: { bytesBase64Encoded?: string; mimeType?: string }[] };
    const b64 = json.predictions?.[0]?.bytesBase64Encoded;
    const mime = json.predictions?.[0]?.mimeType ?? "image/png";
    if (!b64) return { url: "", status: 0 };
    return { url: `data:${mime};base64,${b64}`, status: 200 };
  } catch { return { url: "", status: 0 }; }
}

async function tryGeminiFlashImageGen(
  prompt: string,
  apiKey: string,
): Promise<{ url: string; status: number }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (!res.ok) return { url: "", status: res.status };
    const json = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
      }>;
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) return { url: "", status: 0 };
    const mime = part.inlineData.mimeType ?? "image/png";
    return { url: `data:${mime};base64,${part.inlineData.data}`, status: 200 };
  } catch { return { url: "", status: 0 }; }
}

export const generateEbookCoverFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string }) => z.object({ prompt: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

    // 1. Imagen 3 (best quality)
    const r1 = await tryImagenPredict("imagen-3.0-generate-001", data.prompt, apiKey);
    if (r1.url) return { url: r1.url };
    if (r1.status === 429) throw new Error("QUOTA_EXCEEDED");

    // 2. Imagen 3 Fast (fallback)
    const r2 = await tryImagenPredict("imagen-3.0-fast-generate-001", data.prompt, apiKey);
    if (r2.url) return { url: r2.url };
    if (r2.status === 429) throw new Error("QUOTA_EXCEEDED");

    // 3. Gemini 2.0 Flash native image generation (last resort)
    const r3 = await tryGeminiFlashImageGen(data.prompt, apiKey);
    if (r3.url) return { url: r3.url };
    if (r3.status === 429) throw new Error("QUOTA_EXCEEDED");

    throw new Error("MODEL_UNAVAILABLE");
  });

// ---------- Multi-language ebook generation ----------

export const generateMultiLanguageBookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    language: string;
    title: string;
    subtitle: string;
    chapters: Array<{ id: string; title: string; body: string }>;
  }) =>
    z.object({
      language: z.string().min(2),
      title: z.string(),
      subtitle: z.string(),
      chapters: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).max(20),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

    const langMap: Record<string, string> = {
      "pt-BR": "Brazilian Portuguese",
      "pt-PT": "European Portuguese (Portugal)",
      "en-US": "American English",
      "es": "Spanish",
      "fr": "French",
      "it": "Italian",
      "de": "German",
    };
    const langName = langMap[data.language] ?? data.language;

    const chaptersJson = JSON.stringify(
      data.chapters.map(c => ({ id: c.id, title: c.title, body: c.body.slice(0, 600) }))
    );

    const prompt = `Translate this ebook content to ${langName}. Keep the same tone, style, and paragraph structure. Return ONLY valid JSON with no extra text.

INPUT:
Title: "${data.title}"
Subtitle: "${data.subtitle}"
Chapters: ${chaptersJson}

Return this exact JSON structure:
{
  "title": "translated title",
  "subtitle": "translated subtitle",
  "chapters": [{"id": "same-id", "title": "translated chapter title", "body": "translated body text preserving paragraph breaks with double newlines"}]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed: { title?: string; subtitle?: string; chapters?: Array<{ id: string; title: string; body: string }> };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) as typeof parsed : {};
    }

    if (!parsed.chapters?.length) throw new Error("Tradução não retornou capítulos válidos.");

    return {
      title: parsed.title ?? data.title,
      subtitle: parsed.subtitle ?? data.subtitle,
      chapters: parsed.chapters,
    };
  });

// ---------- Share token ----------

export const generateShareTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const token = crypto.randomUUID();
    const { error } = await context.supabase
      .from("projects")
      .update({ share_token: token } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { token };
  });

// ---------- Load shared story (public — no auth) ----------

export const loadSharedStoryFn = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, niche, status, meta, cover_url")
      .eq("share_token" as never, data.token)
      .single();
    if (error || !project) throw new Error("História não encontrada ou link inválido.");
    return { project };
  });

// ---------- Ebook pipeline (mkbook) ----------

async function geminiJson<T>(apiKey: string, prompt: string, temp = 0.7): Promise<T> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: temp, responseMimeType: "application/json", maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try { return JSON.parse(text) as T; } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return (m ? JSON.parse(m[0]) : {}) as T;
  }
}

async function geminiText(apiKey: string, prompt: string, temp = 0.8): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: temp, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export const generateOutlineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string; subtitle: string; promise: string; audience: string;
    tone: string; goal: string; keywords: string; redLines: string; targetChapters: number;
  }) => z.object({
    title: z.string().min(1), subtitle: z.string(), promise: z.string(),
    audience: z.string(), tone: z.string(), goal: z.string(),
    keywords: z.string(), redLines: z.string(), targetChapters: z.number().min(3).max(30),
  }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    const prompt = `You are a professional ebook architect. Create a detailed chapter outline.

EBOOK BIBLE:
Title: "${data.title}" / Subtitle: "${data.subtitle}"
Central Promise: "${data.promise}"
Target Audience: "${data.audience}"
Tone: "${data.tone}" / Goal: "${data.goal}"
Keywords: "${data.keywords}"
Red Lines (avoid): "${data.redLines}"
Target: ${data.targetChapters} chapters

Return ONLY valid JSON:
{
  "intro": "2-3 sentence preface description",
  "chapters": [
    { "number": 1, "title": "Chapter title", "promise": "What reader gains", "transformation": "Before/after", "wordTarget": 800, "notes": "Key points" }
  ],
  "conclusion": "2-3 sentence conclusion description"
}`;
    type OutlineResult = {
      intro?: string;
      chapters?: Array<{ number: number; title: string; promise: string; transformation: string; wordTarget: number; notes: string }>;
      conclusion?: string;
    };
    const parsed = await geminiJson<OutlineResult>(apiKey, prompt, 0.7);
    if (!parsed.chapters?.length) throw new Error("Outline sem capítulos válidos.");
    return { intro: parsed.intro ?? "", chapters: parsed.chapters, conclusion: parsed.conclusion ?? "", generatedAt: new Date().toISOString() };
  });

export const generateChapterDraftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    chapterNumber: number; chapterTitle: string; chapterPromise: string;
    chapterNotes: string; bookTitle: string; tone: string; audience: string;
    keywords: string; wordTarget: number;
  }) => z.object({
    chapterNumber: z.number(), chapterTitle: z.string().min(1), chapterPromise: z.string(),
    chapterNotes: z.string(), bookTitle: z.string(), tone: z.string(),
    audience: z.string(), keywords: z.string(), wordTarget: z.number().min(200).max(4000),
  }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    const prompt = `Write a complete chapter draft for an ebook.

Book: "${data.bookTitle}"
Chapter ${data.chapterNumber}: "${data.chapterTitle}"
Promise: "${data.chapterPromise}"
Key points: "${data.chapterNotes}"
Tone: "${data.tone}" / Audience: "${data.audience}"
Keywords: "${data.keywords}" / Target: ~${data.wordTarget} words

Write in Brazilian Portuguese. Use ${data.tone} tone. Use clear paragraphs separated by double newlines.
Do NOT include a chapter title heading — start directly with content.`;
    const draft = await geminiText(apiKey, prompt, 0.8);
    if (!draft.trim()) throw new Error("IA não gerou conteúdo.");
    return { draft };
  });

export const editChapterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    draft: string; bookTitle: string; chapterTitle: string; promise: string; tone: string; audience: string;
  }) => z.object({
    draft: z.string().min(50), bookTitle: z.string(), chapterTitle: z.string(),
    promise: z.string(), tone: z.string(), audience: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    const prompt = `You are a professional ebook editor. Edit and improve this chapter draft.

Book: "${data.bookTitle}" / Chapter: "${data.chapterTitle}"
Promise: "${data.promise}" / Tone: ${data.tone} / Audience: ${data.audience}

ORIGINAL DRAFT:
${data.draft.slice(0, 3000)}

Score the draft (0-100), edit for clarity/flow/impact, then score the result.
Return ONLY valid JSON:
{
  "scoreBefore": 65,
  "edited": "The complete edited chapter text...",
  "scoreAfter": 82,
  "changes": ["Improved opening hook", "Strengthened transitions"]
}`;
    type EditResult = { scoreBefore?: number; edited?: string; scoreAfter?: number; changes?: string[] };
    const parsed = await geminiJson<EditResult>(apiKey, prompt, 0.4);
    if (!parsed.edited) throw new Error("Edição não retornou conteúdo.");
    return { scoreBefore: parsed.scoreBefore ?? 60, edited: parsed.edited, scoreAfter: parsed.scoreAfter ?? 80, changes: parsed.changes ?? [] };
  });

export const consistencyCheckFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    bookTitle: string; promise: string; tone: string; audience: string;
    chapters: Array<{ id: string; title: string; body: string }>;
  }) => z.object({
    bookTitle: z.string(), promise: z.string(), tone: z.string(), audience: z.string(),
    chapters: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })).max(30),
  }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    const chaptersText = data.chapters
      .map((c) => `Chapter: "${c.title}"\nPreview: ${c.body.slice(0, 300)}`)
      .join("\n\n---\n\n");
    const prompt = `Analyze this ebook for consistency issues.

Book: "${data.bookTitle}" / Promise: "${data.promise}"
Tone: ${data.tone} / Audience: ${data.audience}

CHAPTERS:
${chaptersText}

Check for: tone inconsistency, chapters not delivering on promise, repetitive content, empty chapters, missing CTA, weak titles, disconnection from central promise.

Return ONLY valid JSON:
{
  "isClean": false,
  "issues": [
    { "type": "tone|promise|repetition|empty|cta|title|consistency", "chapter": "chapter title or global", "problem": "Specific problem", "fix": "Suggested fix" }
  ]
}
If no issues: { "isClean": true, "issues": [] }`;
    type CheckResult = { isClean?: boolean; issues?: Array<{ type: string; chapter: string; problem: string; fix: string }> };
    const parsed = await geminiJson<CheckResult>(apiKey, prompt, 0.3);
    return { isClean: parsed.isClean ?? false, issues: parsed.issues ?? [], generatedAt: new Date().toISOString() };
  });

// ---------- Extract PDF/DOCX briefing ----------

export const extractPdfBriefingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    mode: "text" | "base64";
    content: string;
    mimeType?: string;
    action: string;
    language: string;
  }) =>
    z.object({
      mode: z.enum(["text", "base64"]),
      content: z.string().min(1),
      mimeType: z.string().optional(),
      action: z.string(),
      language: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

    const instruction = `Analyze this document and extract briefing information for creating an ebook.
Action requested: "${data.action}"
Output language: "${data.language}"

Extract:
1. A suitable title for the resulting ebook
2. Main sections or chapter titles found (up to 20)
3. The source document language (return as one of: Português, Inglês, Espanhol, Francês, Alemão, Italiano)

Return ONLY valid JSON:
{"title":"Ebook title","chapters":["Section 1","Section 2"],"language":"Português","chapterCount":5}`;

    type Parts = Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    const parts: Parts = data.mode === "text"
      ? [{ text: `${instruction}\n\nDOCUMENT TEXT:\n${data.content.slice(0, 25000)}` }]
      : [{ text: instruction }, { inlineData: { mimeType: data.mimeType ?? "application/pdf", data: data.content } }];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    type R = { title?: string; chapters?: string[]; language?: string; chapterCount?: number };
    let parsed: R;
    try { parsed = JSON.parse(rawText) as R; }
    catch { const m = rawText.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) as R : {}; }
    return {
      title: parsed.title ?? "Projeto PDF",
      chapters: parsed.chapters ?? [],
      language: parsed.language ?? data.language,
      chapterCount: parsed.chapterCount ?? (parsed.chapters?.length ?? 10),
    };
  });