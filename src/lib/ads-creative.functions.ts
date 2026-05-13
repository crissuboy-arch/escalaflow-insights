import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiGenerateCreative,
  aiGenerateCreativeVariations,
  type Creative,
  type CreativeBriefing,
} from "./ads.server";
import { StandaloneBriefingSchema } from "./standalone/briefing";
import { ADS_FORMATS, DIMENSIONS, OBJECTIVES, PLATFORMS } from "./ads/catalog";
import { seedFromModule } from "./project/seeding.server";
import { recordAi } from "./ai/history.server";

const PlatformEnum = z.enum(PLATFORMS.map((p) => p.id) as [string, ...string[]]);
const ObjectiveEnum = z.enum(OBJECTIVES.map((o) => o.id) as [string, ...string[]]);
const FormatEnum = z.enum(ADS_FORMATS.map((f) => f.id) as [string, ...string[]]);
const DimensionEnum = z.enum(DIMENSIONS as unknown as [string, ...string[]]);

const SourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("project"), projectId: z.string().uuid() }),
  z.object({ kind: z.literal("standalone"), briefing: StandaloneBriefingSchema }),
]);

const InputSchema = z.object({
  source: SourceSchema,
  platform: PlatformEnum,
  objective: ObjectiveEnum,
  formatId: FormatEnum,
  dimension: DimensionEnum,
});

const VariationsInputSchema = InputSchema.extend({
  count: z.number().min(2).max(5).default(3),
});

const MultiFormatInputSchema = z.object({
  source: SourceSchema,
  platform: PlatformEnum,
  objective: ObjectiveEnum,
  formatIds: z.array(FormatEnum).min(1).max(3),
  dimension: DimensionEnum,
});

async function resolveBriefing(
  supabase: any,
  userId: string,
  source: z.infer<typeof SourceSchema>,
): Promise<{ briefing: CreativeBriefing; projectId: string | null; meta: Record<string, unknown> | null }> {
  if (source.kind === "standalone") {
    return { briefing: { ...source.briefing }, projectId: null, meta: null };
  }
  const { data: row, error } = await supabase
    .from("projects")
    .select("id, title, niche, briefing, meta")
    .eq("id", source.projectId)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  const b = (row.briefing ?? {}) as Record<string, unknown>;
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  const copy = (meta.copy ?? {}) as Record<string, unknown>;
  const briefing: CreativeBriefing = {
    productName: (b.title as string) || (row.title as string) || "Produto",
    productType: (b.type as string) || "infoproduto",
    description: (b.subtitle as string) || "",
    niche: (row.niche as string) || (b.niche as string) || "",
    audience: (b.avatar as string) || "",
    promise: (copy.promise as string) || (b.promise as string) || "",
    bigIdea: (copy.bigIdea as string) || "",
    uniqueMechanism: (copy.uniqueMechanism as string) || (b.uniqueMechanism as string) || "",
    pains: Array.isArray(b.pains) ? (b.pains as string[]) : [],
    desires: Array.isArray(b.desires) ? (b.desires as string[]) : [],
  };
  return { briefing, projectId: row.id as string, meta };
}

async function appendCreatives(
  supabase: any,
  projectId: string,
  meta: Record<string, unknown> | null,
  added: Array<Record<string, unknown>>,
) {
  const prev = Array.isArray(meta?.creatives) ? (meta!.creatives as unknown[]) : [];
  const next = [...prev, ...added];
  const m = { ...(meta ?? {}), creatives: next };
  await supabase.from("projects").update({ meta: m as never }).eq("id", projectId);
}

export const generateCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof InputSchema>) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { briefing, projectId, meta } = await resolveBriefing(supabase, userId, data.source);
    const creative = await aiGenerateCreative({
      briefing,
      platform: data.platform as never,
      objective: data.objective as never,
      formatId: data.formatId as never,
      dimension: data.dimension as never,
    });
    if (projectId) {
      await appendCreatives(supabase, projectId, meta, [
        {
          ...creative,
          platform: data.platform,
          objective: data.objective,
          formatId: data.formatId,
          dimension: data.dimension,
          createdAt: new Date().toISOString(),
        },
      ]);
      await seedFromModule(supabase, userId, projectId, "creative", { creative });
      await recordAi(supabase, userId, {
        projectId,
        module: "creative",
        prompt: { platform: data.platform, objective: data.objective, formatId: data.formatId },
        response: creative,
      });
    } else {
      await recordAi(supabase, userId, {
        module: "creative",
        prompt: { platform: data.platform, objective: data.objective, formatId: data.formatId },
        response: creative,
      });
    }
    return { creative };
  });

export const generateCreativeVariations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof VariationsInputSchema>) =>
    VariationsInputSchema.parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { briefing, projectId, meta } = await resolveBriefing(supabase, userId, data.source);
    const creatives: Creative[] = await aiGenerateCreativeVariations({
      briefing,
      platform: data.platform as never,
      objective: data.objective as never,
      formatId: data.formatId as never,
      dimension: data.dimension as never,
      count: data.count,
    });
    if (projectId) {
      await appendCreatives(
        supabase,
        projectId,
        meta,
        creatives.map((c) => ({
          ...c,
          platform: data.platform,
          objective: data.objective,
          formatId: data.formatId,
          dimension: data.dimension,
          createdAt: new Date().toISOString(),
        })),
      );
      await recordAi(supabase, userId, {
        projectId,
        module: "creative",
        prompt: { platform: data.platform, count: data.count },
        response: { creatives },
      });
    }
    return { creatives };
  });

export const generateMultiFormatCreatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MultiFormatInputSchema>) =>
    MultiFormatInputSchema.parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { briefing, projectId, meta } = await resolveBriefing(supabase, userId, data.source);
    const results = await Promise.all(
      data.formatIds.map(async (formatId) => {
        const creative = await aiGenerateCreative({
          briefing,
          platform: data.platform as never,
          objective: data.objective as never,
          formatId: formatId as never,
          dimension: data.dimension as never,
        });
        return { formatId, creative };
      }),
    );
    if (projectId) {
      await appendCreatives(
        supabase,
        projectId,
        meta,
        results.map(({ formatId, creative }) => ({
          ...creative,
          platform: data.platform,
          objective: data.objective,
          formatId,
          dimension: data.dimension,
          createdAt: new Date().toISOString(),
        })),
      );
      await recordAi(supabase, userId, {
        projectId,
        module: "creative",
        prompt: { platform: data.platform, formatIds: data.formatIds },
        response: { results },
      });
    } else {
      await recordAi(supabase, userId, {
        module: "creative",
        prompt: { platform: data.platform, formatIds: data.formatIds },
        response: { results },
      });
    }
    return { results };
  });