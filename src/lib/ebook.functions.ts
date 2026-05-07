import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiExtractBriefing,
  aiGenerateChapter,
  aiGenerateCover,
  aiGenerateOutline,
  BriefingSchema,
  OutlineChapterSchema,
  type Briefing,
} from "./ebook.server";

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

export const extractEbookBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ad: z.infer<typeof AdInputSchema> }) =>
    z.object({ ad: AdInputSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      return await aiExtractBriefing(data.ad);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Falha ao gerar briefing");
    }
  });

export const generateEbookOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { briefing: Briefing; chapterCount: number }) =>
    z
      .object({
        briefing: BriefingSchema,
        chapterCount: z.number().min(3).max(15),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      return await aiGenerateOutline(data.briefing, data.chapterCount);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Falha ao gerar estrutura");
    }
  });

export const generateEbookChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      briefing: Briefing;
      chapter: { title: string; bullets: string[] };
      index: number;
      total: number;
    }) =>
      z
        .object({
          briefing: BriefingSchema,
          chapter: OutlineChapterSchema,
          index: z.number().min(0),
          total: z.number().min(1),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const markdown = await aiGenerateChapter(
        data.briefing,
        data.chapter,
        data.index,
        data.total,
      );
      return { markdown };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Falha ao gerar capítulo");
    }
  });

export const generateEbookCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { briefing: Briefing; layout: string; customPrompt?: string }) =>
      z
        .object({
          briefing: BriefingSchema,
          layout: z.enum(["classico", "moderno", "minimalista"]),
          customPrompt: z.string().max(2000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const dataUrl = await aiGenerateCover(
        data.briefing,
        data.layout,
        data.customPrompt,
      );
      return { dataUrl };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Falha ao gerar capa");
    }
  });