// Viral Remix Studio (Fases 3-4): avatares, vídeos próprios/licenciados,
// análise manual, roteiro e clipes/prompts para o Google Flow. Nada aqui
// chama uma API de IA externa — Fase 6 fica para depois, por decisão
// explícita do utilizador. Isolado por utilizador via RLS (context.supabase,
// nunca supabaseAdmin).
//
// O UPLOAD do ficheiro de vídeo em si NÃO passa por aqui: o browser envia os
// bytes diretamente para o Storage (bucket privado viral-media, RLS por
// prefixo de caminho = auth.uid()) usando a sessão do próprio utilizador.
// Isto evita o limite de tamanho de body das funções serverless da Vercel —
// só o caminho final e os metadados (duração/resolução, extraídos no
// browser) chegam aqui.
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { splitScriptIntoClips } from "@/lib/facebook-viral/clip-splitter";

// ── Avatares ─────────────────────────────────────────────────────────────

const SaveViralAvatarInput = z.object({
  name: z.string().min(1),
  imagePath: z.string().optional(),
  notes: z.string().optional(),
});

export interface ViralAvatarRow {
  id: string;
  name: string;
  image_path: string | null;
  notes: string | null;
  created_at: string;
}

export const saveViralAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveViralAvatarInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; avatar: ViralAvatarRow } | { ok: false; error: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const { data: row, error } = await sb
        .from("viral_avatars")
        .insert({
          user_id: context.userId,
          name: data.name.trim(),
          image_path: data.imagePath ?? null,
          notes: data.notes?.trim() || null,
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, avatar: row as ViralAvatarRow };
    },
  );

export const listViralAvatars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ViralAvatarRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("viral_avatars")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[viral-remix] listViralAvatars failed:", error);
      return [];
    }
    return (rows ?? []) as ViralAvatarRow[];
  });

// ── Vídeos ───────────────────────────────────────────────────────────────

const CreateViralVideoInput = z.object({
  storagePath: z.string().min(1),
  thumbnailPath: z.string().optional(),
  viralReelId: z.string().uuid().optional(),
  uploadSource: z.enum(["own", "licensed"]).default("own"),
  licenseNote: z.string().optional(),
  durationSeconds: z.number().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
});

export interface ViralVideoRow {
  id: string;
  viral_reel_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  upload_source: "own" | "licensed";
  license_note: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  status: "uploaded" | "analyzing" | "analyzed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const createViralVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateViralVideoInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; video: ViralVideoRow } | { ok: false; error: string }> => {
      if (data.uploadSource === "licensed" && !data.licenseNote?.trim()) {
        return { ok: false, error: "Vídeo licenciado precisa de uma nota de licença." };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const { data: row, error } = await sb
        .from("viral_videos")
        .insert({
          user_id: context.userId,
          viral_reel_id: data.viralReelId ?? null,
          storage_path: data.storagePath,
          thumbnail_path: data.thumbnailPath ?? null,
          upload_source: data.uploadSource,
          license_note: data.licenseNote?.trim() || null,
          duration_seconds: data.durationSeconds ?? null,
          width: data.width ?? null,
          height: data.height ?? null,
          status: "uploaded",
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, video: row as ViralVideoRow };
    },
  );

const ListViralVideosInput = z.object({ viralReelId: z.string().uuid().optional() });

export const listViralVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListViralVideosInput.parse(d))
  .handler(async ({ data, context }): Promise<ViralVideoRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let query = sb.from("viral_videos").select("*");
    if (data.viralReelId) query = query.eq("viral_reel_id", data.viralReelId);
    query = query.order("created_at", { ascending: false });
    const { data: rows, error } = await query;
    if (error) {
      console.error("[viral-remix] listViralVideos failed:", error);
      return [];
    }
    return (rows ?? []) as ViralVideoRow[];
  });

export const deleteViralVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("viral_videos").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ── Análise (manual nas Fases 1-5 — ver cabeçalho do ficheiro) ───────────

const SaveViralAnalysisInput = z.object({
  viralVideoId: z.string().uuid(),
  hookText: z.string().optional(),
  pacingNotes: z.string().optional(),
  ctaNotes: z.string().optional(),
  whyItWorks: z.string().optional(),
  sceneBreakdown: z.array(z.object({ timeRange: z.string(), description: z.string() })).default([]),
});

export interface ViralAnalysisRow {
  id: string;
  viral_video_id: string;
  hook_text: string | null;
  narrative_structure: Record<string, unknown>;
  scene_breakdown: Array<{ timeRange: string; description: string }>;
  pacing_notes: string | null;
  cta_notes: string | null;
  why_it_works: string | null;
  model_used: string;
  created_at: string;
  updated_at: string;
}

export const saveViralAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveViralAnalysisInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; analysis: ViralAnalysisRow } | { ok: false; error: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const { data: row, error } = await sb
        .from("viral_analyses")
        .upsert(
          {
            viral_video_id: data.viralVideoId,
            user_id: context.userId,
            hook_text: data.hookText?.trim() || null,
            pacing_notes: data.pacingNotes?.trim() || null,
            cta_notes: data.ctaNotes?.trim() || null,
            why_it_works: data.whyItWorks?.trim() || null,
            scene_breakdown: data.sceneBreakdown,
            model_used: "manual",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "viral_video_id" },
        )
        .select()
        .single();
      if (error) return { ok: false, error: error.message };

      await sb
        .from("viral_videos")
        .update({ status: "analyzed", updated_at: new Date().toISOString() })
        .eq("id", data.viralVideoId);

      return { ok: true, analysis: row as ViralAnalysisRow };
    },
  );

export const getViralAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ viralVideoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ViralAnalysisRow | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row } = await sb
      .from("viral_analyses")
      .select("*")
      .eq("viral_video_id", data.viralVideoId)
      .maybeSingle();
    return (row as ViralAnalysisRow) ?? null;
  });

// ── Roteiros + clipes ────────────────────────────────────────────────────

const SaveViralScriptInput = z.object({
  id: z.string().uuid().optional(), // presente = atualizar
  title: z.string().optional(),
  viralAnalysisId: z.string().uuid().optional(),
  viralAvatarId: z.string().uuid().optional(),
  affiliateProductId: z.string().uuid().optional(),
  language: z.enum(["en-US", "es"]).default("en-US"),
  scriptText: z.string().default(""),
});

export interface ViralScriptRow {
  id: string;
  title: string | null;
  viral_analysis_id: string | null;
  viral_avatar_id: string | null;
  affiliate_product_id: string | null;
  language: "en-US" | "es";
  script_text: string;
  status: "draft" | "clips_ready" | "exported";
  created_at: string;
  updated_at: string;
}

export const saveViralScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveViralScriptInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; script: ViralScriptRow } | { ok: false; error: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const payload = {
        user_id: context.userId,
        title: data.title?.trim() || null,
        viral_analysis_id: data.viralAnalysisId ?? null,
        viral_avatar_id: data.viralAvatarId ?? null,
        affiliate_product_id: data.affiliateProductId ?? null,
        language: data.language,
        script_text: data.scriptText,
        updated_at: new Date().toISOString(),
      };

      const query = data.id
        ? sb.from("viral_scripts").update(payload).eq("id", data.id).select().single()
        : sb.from("viral_scripts").insert(payload).select().single();

      const { data: row, error } = await query;
      if (error) return { ok: false, error: error.message };
      return { ok: true, script: row as ViralScriptRow };
    },
  );

export const listViralScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ViralScriptRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("viral_scripts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[viral-remix] listViralScripts failed:", error);
      return [];
    }
    return (rows ?? []) as ViralScriptRow[];
  });

export interface ViralScriptClipRow {
  id: string;
  viral_script_id: string;
  clip_index: number;
  duration_seconds: number;
  clip_text: string;
  prompt_text: string;
  aspect_ratio: "9:16";
  flow_video_url: string | null;
  status: "draft" | "copied" | "imported";
  created_at: string;
  updated_at: string;
}

/** Splits the script's current text into clips and persists them,
 *  replacing any previous clip breakdown for this script (regenerating is
 *  explicit and intentional — e.g. after editing the script text). Never
 *  calls an external API; see src/lib/facebook-viral/clip-splitter.ts. */
export const generateClipsForScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ viralScriptId: z.string().uuid() }).parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; clips: ViralScriptClipRow[] } | { ok: false; error: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const { data: script, error: scriptError } = await sb
        .from("viral_scripts")
        .select("script_text")
        .eq("id", data.viralScriptId)
        .single();
      if (scriptError || !script)
        return { ok: false, error: scriptError?.message ?? "Roteiro não encontrado." };

      const drafts = splitScriptIntoClips(script.script_text ?? "");
      if (drafts.length === 0)
        return { ok: false, error: "Roteiro vazio — escreve o texto antes de dividir em clipes." };

      await sb.from("viral_script_clips").delete().eq("viral_script_id", data.viralScriptId);

      const rows = drafts.map((d) => ({
        viral_script_id: data.viralScriptId,
        user_id: context.userId,
        clip_index: d.clipIndex,
        duration_seconds: d.durationSeconds,
        clip_text: d.clipText,
        prompt_text: d.promptText,
        aspect_ratio: d.aspectRatio,
      }));
      const { data: inserted, error } = await sb.from("viral_script_clips").insert(rows).select();
      if (error) return { ok: false, error: error.message };

      await sb
        .from("viral_scripts")
        .update({ status: "clips_ready", updated_at: new Date().toISOString() })
        .eq("id", data.viralScriptId);

      return { ok: true, clips: (inserted ?? []) as ViralScriptClipRow[] };
    },
  );

export const listScriptClips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ viralScriptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ViralScriptClipRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("viral_script_clips")
      .select("*")
      .eq("viral_script_id", data.viralScriptId)
      .order("clip_index", { ascending: true });
    if (error) {
      console.error("[viral-remix] listScriptClips failed:", error);
      return [];
    }
    return (rows ?? []) as ViralScriptClipRow[];
  });

const UpdateScriptClipInput = z.object({
  id: z.string().uuid(),
  clipText: z.string().optional(),
  promptText: z.string().optional(),
  flowVideoUrl: z.string().optional(),
  status: z.enum(["draft", "copied", "imported"]).optional(),
});

/** Manual edit of one clip — prompt text, the Flow-produced video URL once
 *  the user generates and imports it, or marking it copied/imported. */
export const updateScriptClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateScriptClipInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; clip: ViralScriptClipRow } | { ok: false; error: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.clipText !== undefined) patch.clip_text = data.clipText;
      if (data.promptText !== undefined) patch.prompt_text = data.promptText;
      if (data.flowVideoUrl !== undefined) patch.flow_video_url = data.flowVideoUrl.trim() || null;
      if (data.status !== undefined) patch.status = data.status;

      const { data: row, error } = await sb
        .from("viral_script_clips")
        .update(patch)
        .eq("id", data.id)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, clip: row as ViralScriptClipRow };
    },
  );
