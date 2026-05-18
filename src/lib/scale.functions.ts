import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiAnalyzeScale,
  aiCreateCampaignPlan,
  aiExtractCreativeContext,
  aiNextTests,
  aiScalePlan,
  CampaignPlanSchema,
  CreativeContextSchema,
  NextTestsSchema,
  ScaleAnalysisSchema,
  ScalePlanSchema,
  type CampaignPlan,
  type CreativeContext,
  type ScaleAnalysis,
  type ScaleContext,
} from "./scale.server";
import { recordAi } from "./ai/history.server";
import { dlog } from "./debug/log.server";

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
      dlog("persist", "scale.save", { projectId: data.projectId, metaKey: "scale" });
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

// ============= Campaign Plan =============

const PlanInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  productName: z.string().optional(),
  pageUrl: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  countries: z.array(z.string()).optional(),
  countryCodes: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  dailyBudget: z.string().optional(),
  offerText: z.string().optional(),
  imageDataUrls: z.array(z.string()).max(6).optional(),
  extractedContext: z.unknown().optional(),
});

const ExtractInputSchema = z.object({
  imageDataUrls: z.array(z.string()).max(6),
  pageUrl: z.string().optional(),
  price: z.string().optional(),
  offerText: z.string().optional(),
});

export const extractCreativeContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ExtractInputSchema>) => ExtractInputSchema.parse(d))
  .handler(async ({ data }) => {
    dlog("hydrate", "scale.extract.start", { images: data.imageDataUrls.length });
    const t0 = Date.now();
    const context = await aiExtractCreativeContext({
      imageDataUrls: data.imageDataUrls,
      pageUrl: data.pageUrl,
      price: data.price,
      offerText: data.offerText,
    });
    dlog("hydrate", "scale.extract.done", { ms: Date.now() - t0 });
    return { context: CreativeContextSchema.parse(context) };
  });

async function loadScaleMeta(supabase: any, projectId: string, userId: string) {
  const { data: row } = await supabase
    .from("projects")
    .select("meta")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  const meta = (row?.meta ?? {}) as Record<string, unknown>;
  const scale = (meta.scale ?? {}) as Record<string, unknown>;
  return { meta, scale };
}

async function saveScaleMeta(
  supabase: any,
  projectId: string,
  userId: string,
  patch: Record<string, unknown>,
) {
  const { meta, scale } = await loadScaleMeta(supabase, projectId, userId);
  const nextMeta = { ...meta, scale: { ...scale, ...patch } };
  await supabase.from("projects").update({ meta: nextMeta as never }).eq("id", projectId);
}

export const createCampaignPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof PlanInputSchema>) => PlanInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const t0 = Date.now();
    dlog("hydrate", "scale.plan.start", {
      images: data.imageDataUrls?.length ?? 0,
      hasContext: !!data.extractedContext,
    });
    // If client passed images without pre-extracted context, do stage A inline.
    let extracted = data.extractedContext as CreativeContext | undefined;
    if (!extracted && data.imageDataUrls?.length) {
      extracted = await aiExtractCreativeContext({
        imageDataUrls: data.imageDataUrls,
        pageUrl: data.pageUrl,
        price: data.price,
        offerText: data.offerText,
      });
    }
    const plan = await aiCreateCampaignPlan({
      productName: data.productName,
      pageUrl: data.pageUrl,
      price: data.price,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      countries: data.countries,
      countryCodes: data.countryCodes,
      platforms: data.platforms,
      dailyBudget: data.dailyBudget,
      offerText: data.offerText,
      imageDataUrls: extracted ? undefined : data.imageDataUrls,
      extractedContext: extracted,
    });
    dlog("hydrate", "scale.plan.done", { totalMs: Date.now() - t0 });

    if (data.projectId) {
      const { scale } = await loadScaleMeta(supabase, data.projectId, userId);
      const prevPlans = Array.isArray(scale.plans) ? (scale.plans as unknown[]) : [];
      await saveScaleMeta(supabase, data.projectId, userId, {
        plan,
        lastPlanInput: { ...data, imageDataUrls: undefined, extractedContext: undefined },
        plans: [
          { at: new Date().toISOString(), plan, input: { ...data, imageDataUrls: undefined, extractedContext: undefined } },
          ...prevPlans,
        ].slice(0, 10),
      });
      dlog("persist", "scale.plan.save", { projectId: data.projectId });
    }
    await recordAi(supabase, userId, {
      projectId: data.projectId ?? null,
      module: "escala",
      prompt: { kind: "plan", ...data, imageDataUrls: (data.imageDataUrls?.length ?? 0) > 0 ? `[${data.imageDataUrls?.length} images]` : undefined, extractedContext: extracted ? "[extracted]" : undefined },
      response: plan,
    });
    return { plan: CampaignPlanSchema.parse(plan) };
  });

const NextTestsInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  plan: z.unknown().optional(),
  analysis: z.unknown().optional(),
  notes: z.string().optional(),
});

export const generateNextTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof NextTestsInputSchema>) => NextTestsInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let plan = data.plan as CampaignPlan | null | undefined;
    let analysis = data.analysis as ScaleAnalysis | null | undefined;
    if (data.projectId && (!plan || !analysis)) {
      const { scale } = await loadScaleMeta(supabase, data.projectId, userId);
      plan = plan ?? (scale.plan as CampaignPlan | undefined);
      analysis = analysis ?? (scale.lastAnalysis as ScaleAnalysis | undefined);
    }
    const result = await aiNextTests({ plan: plan ?? null, analysis: analysis ?? null, notes: data.notes });
    if (data.projectId) {
      await saveScaleMeta(supabase, data.projectId, userId, { nextTests: result });
    }
    await recordAi(supabase, userId, {
      projectId: data.projectId ?? null,
      module: "escala",
      prompt: { kind: "nextTests", notes: data.notes },
      response: result,
    });
    return { nextTests: NextTestsSchema.parse(result) };
  });

export const generateScalePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof NextTestsInputSchema>) => NextTestsInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let plan = data.plan as CampaignPlan | null | undefined;
    let analysis = data.analysis as ScaleAnalysis | null | undefined;
    if (data.projectId && (!plan || !analysis)) {
      const { scale } = await loadScaleMeta(supabase, data.projectId, userId);
      plan = plan ?? (scale.plan as CampaignPlan | undefined);
      analysis = analysis ?? (scale.lastAnalysis as ScaleAnalysis | undefined);
    }
    const result = await aiScalePlan({ plan: plan ?? null, analysis: analysis ?? null, notes: data.notes });
    if (data.projectId) {
      await saveScaleMeta(supabase, data.projectId, userId, { scalePlan: result });
    }
    await recordAi(supabase, userId, {
      projectId: data.projectId ?? null,
      module: "escala",
      prompt: { kind: "scalePlan", notes: data.notes },
      response: result,
    });
    return { scalePlan: ScalePlanSchema.parse(result) };
  });