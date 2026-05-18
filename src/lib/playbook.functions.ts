import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  aiExtractPlaybookBriefing,
  aiGenerateSceneOutline,
  aiGenerateSceneContent,
  aiGenerateSceneImage,
  aiGenerateVideoScript,
  aiGeneratePlaybookStrategy,
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
  id: z.string().min(1).optional(),
  order: z.number().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  text: z.string().optional(),
  image_url: z.string().nullable().optional(),
  balloons: z.array(z.string()).optional(),
  exercise: z.string().optional(),
  practical_action: z.string().optional(),
});
export type PlaybookScene = z.infer<typeof SceneSchema>;

function normalizeScenes(input: unknown): Array<{
  id: string;
  order: number;
  title: string;
  summary: string;
  text: string;
  image_url: string | null;
  balloons: string[];
  exercise: string;
  practical_action: string;
}> {
  const arr = Array.isArray(input) ? input : [];
  const mapped = arr.map((raw, i) => {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const balloons = Array.isArray(s.balloons)
      ? (s.balloons as unknown[]).map((b) => String(b ?? "").trim()).filter(Boolean)
      : [];
    const imageUrl =
      typeof s.image_url === "string" && s.image_url.trim().length > 0 ? s.image_url.trim() : null;
    const order = typeof s.order === "number" && Number.isFinite(s.order) ? s.order : i;
    return {
      id: typeof s.id === "string" && s.id.length > 0 ? s.id : crypto.randomUUID(),
      order,
      title: String(s.title ?? `Cena ${i + 1}`).trim() || `Cena ${i + 1}`,
      summary: String(s.summary ?? "").trim(),
      text: String(s.text ?? "").trim(),
      image_url: imageUrl,
      balloons,
      exercise: String(s.exercise ?? "").trim(),
      practical_action: String(s.practical_action ?? "").trim(),
    };
  });
  // Sort by order then reassign sequential indices
  mapped.sort((a, b) => a.order - b.order);
  return mapped.map((s, i) => ({ ...s, order: i }));
}

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
    const scenes = normalizeScenes(data.payload.scenes);
    const cover_url =
      data.payload.cover_url ?? scenes.find((s) => s.image_url)?.image_url ?? null;
    const row = {
      ...data.payload,
      scenes,
      cover_url,
      user_id: userId,
      updated_at: new Date().toISOString(),
    } as never;
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
    const scenes = normalizeScenes(row.scenes);
    return {
      ...row,
      scenes,
      briefing: row.briefing ?? {},
    };
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

export const uploadPlaybookImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataUrl: string; filename?: string }) =>
    z.object({ dataUrl: z.string().min(20), filename: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = data.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) return { url: null as string | null };
    const mime = m[1];
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("playbook-images")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabase.storage.from("playbook-images").getPublicUrl(path);
    return { url: pub.publicUrl as string | null };
  });

export const generatePlaybookStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("playbooks")
      .select("briefing")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    const existing = (row?.briefing ?? {}) as Record<string, unknown>;
    const briefing = PlaybookBriefingSchema.parse({
      title: typeof existing.title === "string" ? existing.title : "Playbook",
      niche: typeof existing.niche === "string" ? existing.niche : "geral",
      promise: typeof existing.promise === "string" ? existing.promise : "",
      avatar: typeof existing.avatar === "string" ? existing.avatar : "",
      uniqueMechanism:
        typeof existing.uniqueMechanism === "string" ? existing.uniqueMechanism : "",
      pains: Array.isArray(existing.pains) ? (existing.pains as string[]) : [],
      desires: Array.isArray(existing.desires) ? (existing.desires as string[]) : [],
    });
    const strategy = await aiGeneratePlaybookStrategy(briefing);
    const merged = { ...existing, strategy };
    const { error: upErr } = await supabase
      .from("playbooks")
      .update({ briefing: merged as never, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);
    return { strategy };
  });