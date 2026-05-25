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

// ---------- Ebook cover (Gemini Imagen 3) ----------

export const generateEbookCoverFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string }) => z.object({ prompt: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: data.prompt }],
        parameters: { sampleCount: 1, aspectRatio: "9:16", safetyFilterLevel: "block_few" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini Imagen error ${res.status}: ${body}`);
    }
    const json = await res.json() as { predictions?: { bytesBase64Encoded?: string; mimeType?: string }[] };
    const b64 = json.predictions?.[0]?.bytesBase64Encoded;
    const mime = json.predictions?.[0]?.mimeType ?? "image/png";
    if (!b64) throw new Error("Imagem não gerada pela API Gemini.");
    return { url: `data:${mime};base64,${b64}` };
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