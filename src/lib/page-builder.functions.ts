import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateAIResponse } from "@/lib/aiService";
import { getSkillById } from "@/page-builder/skills";
import { getDesignSystemById } from "@/page-builder/design-systems";
import { buildPagePrompt } from "@/page-builder/prompt-engine/buildPagePrompt";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pageTable = () => (supabaseAdmin as any).from("page_builder_projects");

const PageBuilderInputSchema = z.object({
  skillId: z.string().min(1),
  designSystemId: z.string().min(1),
  productName: z.string().min(1),
  niche: z.string().default(""),
  targetAudience: z.string().default(""),
  country: z.string().default("BR"),
  language: z.string().default("pt-BR"),
  offerType: z.string().default(""),
  pricePoint: z.string().default(""),
  mainPromise: z.string().default(""),
  painPoints: z.string().default(""),
  benefits: z.string().default(""),
  bonuses: z.string().default(""),
  guarantee: z.string().default(""),
  callToAction: z.string().default("Quero Agora"),
  brandName: z.string().default(""),
  toneOfVoice: z.string().default("persuasivo e direto"),
  trafficSource: z.string().default(""),
  pageGoal: z.string().default(""),
  mineracaoContext: z.string().default(""),
});

const SavePageSchema = z.object({
  title: z.string().min(1),
  html: z.string().min(1),
  skillId: z.string(),
  designSystemId: z.string(),
  formData: z.record(z.unknown()),
});

const IdSchema = z.object({ id: z.string().uuid() });

export const generatePageHtmlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof PageBuilderInputSchema>) => PageBuilderInputSchema.parse(d))
  .handler(async ({ data }) => {
    const skill = getSkillById(data.skillId);
    const ds = getDesignSystemById(data.designSystemId);

    if (!skill) throw new Error(`Skill "${data.skillId}" não encontrada`);
    if (!ds) throw new Error(`Design system "${data.designSystemId}" não encontrado`);

    const { systemPrompt, userPrompt } = buildPagePrompt(data, skill, ds);

    const html = await generateAIResponse(userPrompt, {
      systemPrompt,
      maxTokens: 8000,
    });

    if (!html || (!html.includes("<!DOCTYPE") && !html.includes("<!doctype") && !html.includes("<html"))) {
      throw new Error("A IA não gerou uma página válida. Verifique os dados e tente novamente.");
    }

    return { html: html.trim() };
  });

export const savePageProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SavePageSchema>) => SavePageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { data: row, error } = await pageTable()
      .insert({
        user_id: userId,
        title: data.title,
        html: data.html,
        skill_id: data.skillId,
        design_system_id: data.designSystemId,
        form_data: data.formData,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id as string };
  });

export const updatePageProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SavePageSchema> & { id: string }) =>
    z.object({ ...SavePageSchema.shape, id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await pageTable()
      .update({
        title: data.title,
        html: data.html,
        skill_id: data.skillId,
        design_system_id: data.designSystemId,
        form_data: data.formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPageProjectsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string;
    const { data, error } = await pageTable()
      .select("id, title, skill_id, design_system_id, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      title: string;
      skill_id: string;
      design_system_id: string;
      created_at: string;
      updated_at: string;
    }>;
  });

export const loadPageProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdSchema>) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { data: row, error } = await pageTable()
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Error("Projeto não encontrado");
    return row as {
      id: string;
      title: string;
      html: string;
      skill_id: string;
      design_system_id: string;
      form_data: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    };
  });

export const deletePageProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdSchema>) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await pageTable()
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
