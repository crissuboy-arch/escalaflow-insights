import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiExtractBriefing,
  aiGenerateOutline,
  aiGenerateChapter,
  aiGenerateChapterImage,
  BriefingSchema,
  OutlineChapterSchema,
  type Briefing,
} from "./ebook.server";
import {
  aiExtractPlaybookBriefing,
  aiGenerateSceneOutline,
  aiGenerateSceneContent,
} from "./playbook.server";

const AdInputSchema = z.object({
  headline: z.string().optional(),
  copy: z.string().optional(),
  cta: z.string().optional(),
  niche: z.string().optional(),
  country: z.string().optional(),
  platform: z.string().optional(),
  advertiser: z.string().optional(),
  score: z.number().optional(),
});

const KickstartSchema = z.object({
  niche: z.string().min(1),
  promise: z.string().min(1),
  audience: z.string().optional(),
  language: z.string().default("Português"),
  chapterCount: z.number().min(3).max(15).default(6),
});

const ModeSchema = z.enum(["pdf", "premium", "kdp", "playbook", "combo", "story"]);
export type ProjectMode = z.infer<typeof ModeSchema>;

const CreateInputSchema = z.object({
  source: z.enum(["ad", "scratch", "ai"]),
  mode: ModeSchema.default("combo"),
  ad: AdInputSchema.optional(),
  category: z.string().optional(),
  kickstart: KickstartSchema.optional(),
  title: z.string().optional(),
  niche: z.string().optional(),
  source_ad_key: z.string().optional(),
});

function adToKickstartPrompt(ad: z.infer<typeof AdInputSchema>) {
  return {
    headline: ad.headline,
    copy: ad.copy,
    cta: ad.cta,
    niche: ad.niche,
    country: ad.country,
    platform: ad.platform,
    advertiser: ad.advertiser,
    score: ad.score,
  };
}

function kickstartToAd(k: z.infer<typeof KickstartSchema>) {
  return {
    headline: k.promise,
    copy: `${k.promise}\n\nPúblico: ${k.audience ?? "—"}\nIdioma: ${k.language}`,
    cta: "Saiba mais",
    niche: k.niche,
  };
}

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CreateInputSchema>) => CreateInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let briefing: Briefing | null = null;
    let outline: Array<z.infer<typeof OutlineChapterSchema>> = [];
    let title = data.title ?? "Novo Projeto";
    let niche = data.niche ?? data.category ?? data.kickstart?.niche ?? data.ad?.niche ?? null;

    if (data.source === "ad" && data.ad) {
      try {
        briefing = await aiExtractBriefing(adToKickstartPrompt(data.ad));
        outline = await aiGenerateOutline(briefing, 6);
        title = briefing.title;
        niche = briefing.niche;
      } catch (e) {
        // tolerate AI failure: keep empty briefing/outline
        console.error("[createProject] ad briefing failed", e);
      }
    } else if (data.source === "ai" && data.kickstart) {
      try {
        briefing = await aiExtractBriefing(kickstartToAd(data.kickstart));
        outline = await aiGenerateOutline(briefing, data.kickstart.chapterCount);
        title = briefing.title;
        niche = briefing.niche;
      } catch (e) {
        console.error("[createProject] ai briefing failed", e);
      }
    } else if (data.source === "scratch") {
      title = data.title || data.category || "Novo Projeto";
    }

    const row = {
      user_id: userId,
      title,
      niche,
      source_ad_key: data.source_ad_key ?? null,
      briefing: (briefing ?? {}) as never,
      outline: outline as never,
      mode: data.mode,
      meta: { category: data.category ?? null } as never,
      step: briefing ? 2 : 0,
    };
    const { data: out, error } = await supabase
      .from("projects")
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: out.id as string };
  });

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, title, niche, mode, status, step, cover_url, ebook_id, playbook_id, updated_at, meta")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const loadProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const PatchSchema = z.object({
  title: z.string().optional(),
  niche: z.string().nullable().optional(),
  briefing: z.record(z.string(), z.unknown()).optional(),
  outline: z.array(z.unknown()).optional(),
  mode: ModeSchema.optional(),
  cover_url: z.string().nullable().optional(),
  status: z.enum(["draft", "ready", "published"]).optional(),
  step: z.number().min(0).max(10).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: z.infer<typeof PatchSchema> }) =>
    z.object({ id: z.string().uuid(), patch: PatchSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = { ...data.patch } as Record<string, unknown>;
    // Merge meta in-place to avoid overwriting fields written by other modules
    // (copy, sales-page, creatives all persist into projects.meta).
    if (patch.meta && typeof patch.meta === "object") {
      const { data: row } = await supabase
        .from("projects")
        .select("meta")
        .eq("id", data.id)
        .eq("user_id", userId)
        .single();
      const existing = (row?.meta ?? {}) as Record<string, unknown>;
      patch.meta = { ...existing, ...(patch.meta as Record<string, unknown>) };
    }
    const { error } = await supabase
      .from("projects")
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function ensureBriefing(supabase: any, userId: string, id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  let briefing = (data.briefing ?? {}) as Partial<Briefing>;
  let outline = Array.isArray(data.outline) ? data.outline : [];
  if (!briefing.title || outline.length === 0) {
    const seedAd = {
      headline: data.title,
      copy: data.niche ? `Nicho: ${data.niche}` : "",
      niche: data.niche ?? "",
    };
    briefing = await aiExtractBriefing(seedAd);
    outline = await aiGenerateOutline(briefing as Briefing, 6);
    await supabase
      .from("projects")
      .update({ briefing: briefing as never, outline: outline as never } as never)
      .eq("id", id);
  }
  return { project: data, briefing: briefing as Briefing, outline };
}

export const generateProjectEbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; mode?: "kdp" | "premium" }) =>
    z
      .object({
        id: z.string().uuid(),
        mode: z.enum(["kdp", "premium"]).default("kdp"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { project, briefing, outline } = await ensureBriefing(supabase, userId, data.id);
    const total = outline.length;
    const chapters: Array<{ title: string; markdown: string; imageUrl: string | null }> = [];
    for (let i = 0; i < total; i++) {
      const ch = OutlineChapterSchema.parse(outline[i]);
      const md = await aiGenerateChapter(briefing, ch, i, total);
      let imageUrl: string | null = null;
      if (data.mode === "premium") {
        try {
          imageUrl = await aiGenerateChapterImage(briefing, ch, "moderno");
        } catch (e) {
          console.error("[ebook] image failed", e);
        }
      }
      chapters.push({ title: ch.title, markdown: md, imageUrl });
    }
    const ebookRow = {
      user_id: userId,
      project_id: data.id,
      title: briefing.title,
      subtitle: briefing.subtitle,
      niche: briefing.niche,
      briefing: briefing as never,
      outline: outline as never,
      chapters: chapters as never,
      layout: "moderno",
      mode: data.mode,
      step: 4,
      chapter_count: total,
      status: "ready",
      cover_url: project.cover_url ?? null,
    };
    let ebookId = project.ebook_id as string | null;
    if (ebookId) {
      const { error } = await supabase.from("ebooks").update(ebookRow as never).eq("id", ebookId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await supabase
        .from("ebooks")
        .insert(ebookRow as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      ebookId = ins.id as string;
      await supabase.from("projects").update({ ebook_id: ebookId } as never).eq("id", data.id);
    }
    return { ebookId };
  });

export const generateProjectPlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { project, briefing, outline } = await ensureBriefing(supabase, userId, data.id);

    // Map ebook briefing → playbook briefing
    const pbBriefing = {
      title: briefing.title,
      niche: briefing.niche,
      promise: briefing.promise,
      avatar: briefing.avatar,
      uniqueMechanism: briefing.uniqueMechanism,
      pains: briefing.pains,
      desires: briefing.desires,
    };
    const sceneCount = Math.min(Math.max(outline.length || 6, 3), 12);
    const sceneOutline = await aiGenerateSceneOutline(pbBriefing, sceneCount);
    const scenes: Array<Record<string, unknown>> = [];
    for (let i = 0; i < sceneOutline.length; i++) {
      const sc = sceneOutline[i];
      const content = await aiGenerateSceneContent(pbBriefing, sc, i, sceneOutline.length);
      scenes.push({
        id: crypto.randomUUID(),
        order: i,
        title: sc.title,
        summary: sc.summary,
        text: content.text,
        balloons: content.balloons,
        exercise: sc.exercise,
        practical_action: sc.practicalAction,
        image_url: null,
      });
    }
    const theme =
      ((project.meta as Record<string, unknown> | null)?.palette as string) === "dourado"
        ? "dourado-editorial"
        : ((project.meta as Record<string, unknown> | null)?.palette as string) === "neon"
        ? "neon-roxo"
        : "minimal-dark";
    const pbRow = {
      user_id: userId,
      project_id: data.id,
      title: pbBriefing.title,
      niche: pbBriefing.niche,
      avatar: pbBriefing.avatar,
      promise: pbBriefing.promise,
      unique_mechanism: pbBriefing.uniqueMechanism,
      briefing: pbBriefing as never,
      scenes: scenes as never,
      theme,
      step: 3,
      status: "draft",
    };
    let playbookId = project.playbook_id as string | null;
    if (playbookId) {
      const { error } = await supabase
        .from("playbooks")
        .update(pbRow as never)
        .eq("id", playbookId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await supabase
        .from("playbooks")
        .insert(pbRow as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      playbookId = ins.id as string;
      await supabase
        .from("projects")
        .update({ playbook_id: playbookId } as never)
        .eq("id", data.id);
    }
    return { playbookId };
  });