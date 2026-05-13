import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiAnalyzeScale, ScaleAnalysisSchema, type ScaleContext } from "./scale.server";
import { recordAi } from "./ai/history.server";

const InputSchema = z.object({
  projectId: z.string().uuid().optional(),
  productName: z.string().optional(),
  niche: z.string().optional(),
  ctr: z.string().optional(),
  cpc: z.string().optional(),
  cpm: z.string().optional(),
  roas: z.string().optional(),
  frequencia: z.string().optional(),
  spend: z.string().optional(),
  daysRunning: z.string().optional(),
  notes: z.string().optional(),
  imageDataUrl: z.string().optional(),
});

export const analyzeAdsPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof InputSchema>) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let ctx: ScaleContext = {
      productName: data.productName,
      niche: data.niche,
      ctr: data.ctr,
      cpc: data.cpc,
      cpm: data.cpm,
      roas: data.roas,
      frequencia: data.frequencia,
      spend: data.spend,
      daysRunning: data.daysRunning,
      notes: data.notes,
      imageDataUrl: data.imageDataUrl,
    };

    if (data.projectId) {
      const { data: row } = await supabase
        .from("projects")
        .select("id, title, niche, briefing, meta")
        .eq("id", data.projectId)
        .eq("user_id", userId)
        .single();
      if (row) {
        ctx.productName = ctx.productName || (row.title as string);
        ctx.niche = ctx.niche || ((row.niche as string) ?? "");
      }
    }

    const analysis = await aiAnalyzeScale(ctx);

    if (data.projectId) {
      const { data: row } = await supabase
        .from("projects")
        .select("meta")
        .eq("id", data.projectId)
        .eq("user_id", userId)
        .single();
      const meta = (row?.meta ?? {}) as Record<string, unknown>;
      const scale = (meta.scale ?? {}) as Record<string, unknown>;
      const prevAnalyses = Array.isArray(scale.analyses) ? (scale.analyses as unknown[]) : [];
      const nextMeta = {
        ...meta,
        scale: {
          ...scale,
          lastAnalysis: analysis,
          lastInput: { ...data, imageDataUrl: undefined },
          analyses: [
            { at: new Date().toISOString(), analysis, input: { ...data, imageDataUrl: undefined } },
            ...prevAnalyses,
          ].slice(0, 20),
        },
      };
      await supabase.from("projects").update({ meta: nextMeta as never }).eq("id", data.projectId);
      await recordAi(supabase, userId, {
        projectId: data.projectId,
        module: "escala",
        prompt: { ...data, imageDataUrl: data.imageDataUrl ? "[image]" : undefined },
        response: analysis,
      });
    } else {
      await recordAi(supabase, userId, {
        module: "escala",
        prompt: { ...data, imageDataUrl: data.imageDataUrl ? "[image]" : undefined },
        response: analysis,
      });
    }

    return { analysis: ScaleAnalysisSchema.parse(analysis) };
  });