import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callWithFallback } from "./aiService";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeJson<T>(raw: string, fallback: T): T {
  try {
    const m = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as T) : fallback;
  } catch {
    return fallback;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

async function loadProject(supabase: ReturnType<typeof supabaseAdmin.from> extends never ? never : any, userId: string, id: string) {
  const { data, error } = await (supabase as any)
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data as any;
}

function readStory(meta: unknown) {
  const m = (meta && typeof meta === "object" ? meta : {}) as Record<string, unknown>;
  return (m.story && typeof m.story === "object" ? m.story : {}) as Record<string, unknown>;
}

async function patchStory(supabase: any, project: any, patch: Record<string, unknown>) {
  const story = readStory(project.meta);
  const updated = { ...story, ...patch };
  const meta = { ...(project.meta ?? {}), story: updated };
  const { error } = await supabase.from("projects").update({ meta } as never).eq("id", project.id);
  if (error) throw new Error(error.message);
}

// ─── Import Playbook ──────────────────────────────────────────────────────────

export const importPlaybookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; text: string; format: string }) =>
    z.object({ id: z.string().uuid(), text: z.string().min(10), format: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    const planning = (story.planning ?? {}) as Record<string, unknown>;

    const prompt = `Você é um especialista em estruturação de conteúdo. Analise o seguinte texto e divida-o em capítulos/seções lógicas.

TEXTO:
${data.text.slice(0, 12000)}

INSTRUÇÕES:
- Identifique divisões naturais de capítulos, seções ou partes
- Crie títulos descritivos e concisos se não existirem
- Preserve o texto original de cada seção sem alterações
- Retorne APENAS um array JSON válido, sem markdown, sem explicações
- Formato: [{"title": "Título do Capítulo", "body": "Conteúdo completo..."}]
- Mínimo 2 capítulos, máximo 30
- Se o texto for curto, crie pelo menos 2 seções

Idioma do conteúdo detectado: ${planning.language ?? "Português"}`;

    const raw = await callWithFallback(prompt, { json: true, maxTokens: 8192, temp: 0.3 });
    const parsed = safeJson<Array<{ title: string; body: string }>>(raw, []);

    if (!parsed.length) throw new Error("Não foi possível identificar capítulos no texto. Tente formatar com títulos.");

    const chapters = parsed.map((ch, i) => ({
      id: crypto.randomUUID(),
      index: i,
      title: ch.title || `Capítulo ${i + 1}`,
      body: ch.body || "",
      words: (ch.body || "").split(/\s+/).filter(Boolean).length,
      status: "ready" as const,
    }));

    await patchStory(context.supabase, project, { chapters, step: Math.max(4, Number(story.step ?? 0)) });
    return { chapters, count: chapters.length };
  });

// ─── Generate Page Image Prompt ───────────────────────────────────────────────

export const generatePageImagePromptFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; chapterId: string }) =>
    z.object({ id: z.string().uuid(), chapterId: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    const chapters = (story.chapters ?? []) as Array<{ id: string; title: string; body: string }>;
    const ch = chapters.find((c) => c.id === data.chapterId);
    if (!ch) throw new Error("Capítulo não encontrado.");

    const planning = (story.planning ?? {}) as Record<string, unknown>;
    const prompt = `Você é um diretor de arte especialista em editorial premium. Crie um prompt de imagem cinematográfico para o seguinte capítulo.

TÍTULO DO CAPÍTULO: ${ch.title}
CONTEÚDO:
${(ch.body || "").slice(0, 1500)}

CONTEXTO DO LIVRO: ${planning.title ?? ""} — ${planning.type ?? "Playbook"}

REGRAS ABSOLUTAS DO PROMPT:
- Escreva APENAS em inglês
- NO text, NO logo, NO watermark, NO UI elements, NO human faces showing text
- Estilo: cinematic, premium editorial, soft bokeh, professional photography
- Iluminação: dramatic cinematic lighting, golden hour or studio light
- Composição: rule of thirds, depth of field
- Emoção visual consistente com o conteúdo do capítulo
- Máximo 120 palavras
- Retorne APENAS o prompt de imagem, sem explicações, sem aspas`;

    const imagePrompt = await callWithFallback(prompt, { temp: 0.8, maxTokens: 200 });

    const animationPrompt = await callWithFallback(
      `Para uma imagem editorial premium com este contexto: "${ch.title}", crie um prompt de animação sutil em português.
Inclua: movimento de câmera, efeito de luz, transição sugerida.
Máximo 2 frases. Retorne APENAS o prompt de animação.`,
      { temp: 0.7, maxTokens: 100 },
    );

    // Save prompts back to the chapter
    const updatedChapters = chapters.map((c) =>
      c.id === data.chapterId
        ? { ...c, imagePrompt: imagePrompt.trim(), animationPrompt: animationPrompt.trim() }
        : c,
    );
    await patchStory(context.supabase, project, { chapters: updatedChapters });

    return { imagePrompt: imagePrompt.trim(), animationPrompt: animationPrompt.trim() };
  });

// ─── Update Chapter Extras ────────────────────────────────────────────────────

export const updateChapterExtrasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    chapterId: string;
    imageUrl?: string;
    imagePrompt?: string;
    animationPrompt?: string;
    highlight?: string;
    title?: string;
  }) =>
    z.object({
      id: z.string().uuid(),
      chapterId: z.string(),
      imageUrl: z.string().optional(),
      imagePrompt: z.string().optional(),
      animationPrompt: z.string().optional(),
      highlight: z.string().optional(),
      title: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    const chapters = (story.chapters ?? []) as Array<Record<string, unknown>>;
    const updated = chapters.map((c) => {
      if (c.id !== data.chapterId) return c;
      const patch: Record<string, unknown> = {};
      if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
      if (data.imagePrompt !== undefined) patch.imagePrompt = data.imagePrompt;
      if (data.animationPrompt !== undefined) patch.animationPrompt = data.animationPrompt;
      if (data.highlight !== undefined) patch.highlight = data.highlight;
      if (data.title !== undefined) {
        patch.title = data.title;
        const words = String(c.body ?? "").split(/\s+/).filter(Boolean).length;
        patch.words = words;
      }
      return { ...c, ...patch };
    });
    await patchStory(context.supabase, project, { chapters: updated });
    return { ok: true };
  });

// ─── Publish with Slug ────────────────────────────────────────────────────────

export const publishStorybookFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; customSlug?: string }) =>
    z.object({ id: z.string().uuid(), customSlug: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const project = await loadProject(context.supabase, context.userId, data.id);
    const story = readStory(project.meta);
    const planning = (story.planning ?? {}) as Record<string, unknown>;
    const title = String(planning.title ?? project.title ?? "animabook");

    let slug = data.customSlug ? slugify(data.customSlug) : slugify(title);
    if (!slug) slug = "animabook";
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("projects")
      .update({ slug: uniqueSlug, status: "published" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { slug: uniqueSlug };
  });

// ─── Image Gallery ────────────────────────────────────────────────────────────

export const saveStoryImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; url: string; tag: string; chapterId?: string; label?: string }) =>
    z.object({
      projectId: z.string().uuid(),
      url: z.string().url(),
      tag: z.string(),
      chapterId: z.string().optional(),
      label: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: proj, error: pe } = await context.supabase
      .from("projects").select("id").eq("id", data.projectId).eq("user_id", context.userId).single();
    if (pe || !proj) throw new Error("Projeto não encontrado.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: img, error } = await sb
      .from("storybook_images")
      .insert({ project_id: data.projectId, url: data.url, tag: data.tag, chapter_id: data.chapterId ?? null, label: data.label ?? null })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return img as { id: string; url: string; tag: string; chapter_id: string | null; label: string | null };
  });

export const listStoryImagesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: imgs } = await (context.supabase as any)
      .from("storybook_images")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    return (imgs ?? []) as Array<{ id: string; url: string; tag: string; chapter_id: string | null; label: string | null }>;
  });

export const deleteStoryImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { imageId: string; projectId: string }) =>
    z.object({ imageId: z.string().uuid(), projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("storybook_images")
      .delete()
      .eq("id", data.imageId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Load by Slug (public) ────────────────────────────────────────────────────

export const loadStoryBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: project, error } = await (supabaseAdmin as any)
      .from("projects")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !project) return null;
    return { project };
  });
