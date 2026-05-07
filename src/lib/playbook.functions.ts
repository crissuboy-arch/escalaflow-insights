import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiExtractPlaybookBriefing,
  aiGenerateSceneOutline,
  aiGenerateSceneContent,
  aiGenerateSceneImage,
  aiGenerateVideoScript,
  PlaybookBriefingSchema,
  SceneOutlineSchema,
  type PlaybookBriefing,
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

const SceneSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  summary: z.string().default(""),
  text: z.string().default(""),
  image_url: z.string().nullable().optional(),
  balloons: z.array(z.string()).default([]),
  exercise: z.string().default(""),
  practical_action: z.string().default(""),
});
export type PlaybookScene = z.infer<typeof SceneSchema>;

const PlaybookPayloadSchema = z.object({
  title: z.string().min(1).max(300),
  niche: z.string().nullable().optional(),
  source_ad_key: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  promise: z.string().nullable().optional(),
  unique_mechanism: z.string().nullable().optional(),
  briefing: z.record(z.string(), z.unknown()).default({}),
  scenes: z.array(SceneSchema).default([]),
  theme: z.enum(["neon-roxo", "dourado-editorial", "minimal-dark"]).default("neon-roxo"),
  cover_url: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  step: z.number().min(0).max(10).default(0),
});

export const extractPlaybookBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ad: z.infer<typeof AdInputSchema> }) => z.object({ ad: AdInputSchema }).parse(d))
  .handler(async ({ data }) => aiExtractPlaybookBriefing(data.ad));

export const generatePlaybookOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { briefing: PlaybookBriefing; sceneCount: number }) =>
    z.object({ briefing: PlaybookBriefingSchema, sceneCount: z.number().min(3).max(15) }).parse(d),
  )
  .handler(async ({ data }) => aiGenerateSceneOutline(data.briefing, data.sceneCount));

export const generatePlaybookSceneContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { briefing: PlaybookBriefing; scene: z.infer<typeof SceneOutlineSchema>; index: number; total: number }) =>
      z
        .object({
          briefing: PlaybookBriefingSchema,
          scene: SceneOutlineSchema,
          index: z.number().min(0),
          total: z.number().min(1),
        })
        .parse(d),
  )
  .handler(async ({ data }) => aiGenerateSceneContent(data.briefing, data.scene, data.index, data.total));

export const generatePlaybookSceneImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { briefing: PlaybookBriefing; scene: { title: string; summary: string }; theme: string }) =>
      z
        .object({
          briefing: PlaybookBriefingSchema,
          scene: z.object({ title: z.string(), summary: z.string() }),
          theme: z.string(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => ({ dataUrl: await aiGenerateSceneImage(data.briefing, data.scene, data.theme) }));

export const generatePlaybookScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { briefing: PlaybookBriefing; scenes: { title: string; text: string }[] }) =>
      z
        .object({
          briefing: PlaybookBriefingSchema,
          scenes: z.array(z.object({ title: z.string(), text: z.string() })),
        })
        .parse(d),
  )
  .handler(async ({ data }) => ({ markdown: await aiGenerateVideoScript(data.briefing, data.scenes) }));

export const savePlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; payload: z.infer<typeof PlaybookPayloadSchema> }) =>
    z.object({ id: z.string().uuid().optional(), payload: PlaybookPayloadSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = { ...data.payload, user_id: userId } as never;
    if (data.id) {
      const { data: out, error } = await supabase
        .from("playbooks")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: out.id };
    }
    const { data: out, error } = await supabase.from("playbooks").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: out.id };
  });

export const listPlaybooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("playbooks")
      .select("id, title, niche, status, step, cover_url, scenes, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      niche: r.niche,
      status: r.status,
      step: r.step,
      cover_url: r.cover_url,
      scene_count: Array.isArray(r.scenes) ? r.scenes.length : 0,
      updated_at: r.updated_at,
    }));
  });

export const loadPlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("playbooks").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("playbooks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPlaybookStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "draft" | "published" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "published"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("playbooks")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });