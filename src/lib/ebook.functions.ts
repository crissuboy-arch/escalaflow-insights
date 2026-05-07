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

const ChapterSchema = z.object({ title: z.string(), markdown: z.string() });
const DraftPayloadSchema = z.object({
  source_ad_key: z.string().nullable().optional(),
  title: z.string().min(1).max(300),
  subtitle: z.string().max(500).nullable().optional(),
  niche: z.string().max(200).nullable().optional(),
  briefing: z.record(z.string(), z.unknown()).default({}),
  outline: z.array(OutlineChapterSchema).default([]),
  chapters: z.array(ChapterSchema).default([]),
  layout: z.enum(["classico", "moderno", "minimalista"]).default("classico"),
  cover_url: z.string().nullable().optional(),
  status: z.enum(["draft", "ready"]).default("draft"),
  step: z.number().min(0).max(10).default(0),
  chapter_count: z.number().min(3).max(15).default(6),
});

export const saveEbookDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id?: string; payload: z.infer<typeof DraftPayloadSchema> }) =>
      z
        .object({ id: z.string().uuid().optional(), payload: DraftPayloadSchema })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = { ...data.payload, user_id: userId } as never;
    if (data.id) {
      const { data: out, error } = await supabase
        .from("ebooks")
        .update(row)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: out.id };
    }
    const { data: out, error } = await supabase
      .from("ebooks")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: out.id };
  });

export const listEbookDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("ebooks")
      .select("id, title, niche, status, step, chapter_count, cover_url, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const loadEbookDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("ebooks")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEbookDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("ebooks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });