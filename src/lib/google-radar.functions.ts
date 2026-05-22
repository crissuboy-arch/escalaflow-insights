import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runGoogleTrendsSkill } from "@/skills/google-trends.skill";
import {
  runSkillsInParallel,
  makeSkillTask,
} from "@/core/agent-orchestrator";
import type { GoogleTrendsInput } from "@/skills/google-trends.skill";
import { generateAIJson } from "@/lib/aiService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trendsTable = () => (supabaseAdmin as any).from("google_trends_minerados");

// ── input schemas ─────────────────────────────────────────────────────────────

const MineInput = z.object({
  keywords: z.string().min(1),
  geo: z.string().default("BR"),
  timeframe: z
    .enum(["now 1-d", "now 7-d", "today 1-m", "today 3-m", "today 12-m"])
    .default("today 3-m"),
});

const ListInput = z.object({
  keyword: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

const IdInput = z.object({ id: z.string().uuid() });
const KeywordInput = z.object({ keyword: z.string() });

// ── server functions ──────────────────────────────────────────────────────────

export const mineGoogleTrendsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { geo, timeframe } = data;

    // Parse comma-separated keywords into individual search tasks
    const keywords = data.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    // Use orchestrator to run one skill task per keyword in parallel
    const tasks = keywords.map((kw, i) =>
      makeSkillTask(
        `trends-${i}-${kw}`,
        "google-trends",
        (inp: GoogleTrendsInput) => runGoogleTrendsSkill(inp),
        { keywords: [kw], geo, timeframe },
      ),
    );

    const orchestratorResults = await runSkillsInParallel(tasks);

    // Collect errors
    const errors = orchestratorResults.filter((r) => !r.ok).map((r) => r.error);
    if (errors.length === keywords.length) {
      throw new Error(errors[0] ?? "Skill failed");
    }

    // Flatten trend data from all tasks
    const allTrends = orchestratorResults.flatMap((r) => r.data);

    if (!allTrends.length) return { inserted: 0, skipped: 0 };

    const rows = allTrends.map((t) => ({
      user_id: userId,
      keyword: t.keyword,
      geo: t.geo,
      timeframe,
      avg_interest: t.avgInterest,
      peak_interest: t.peakInterest,
      trend: t.trend,
      related_queries: t.relatedQueries,
      related_topics: t.relatedTopics,
      points: t.points,
      updated_at: new Date().toISOString(),
    }));

    const { data: inserted, error } = await trendsTable()
      .upsert(rows, { onConflict: "user_id,keyword,geo" })
      .select("id");

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return { inserted: inserted?.length ?? 0, skipped: 0 };
  });

export const listGoogleTrendsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    let query = trendsTable()
      .select("*")
      .eq("user_id", userId)
      .order("avg_interest", { ascending: false })
      .limit(data.limit);

    if (data.keyword) query = query.eq("keyword", data.keyword);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type GoogleTrendsAiAnalysis = {
  opportunity_level: "alta" | "media" | "baixa";
  niche_summary: string;
  ebook_ideas: string[];
  copy_hooks: string[];
  target_audience: string;
  best_format: string;
  urgency_reason: string;
};

export const analyzeGoogleTrendFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;

    const { data: row, error } = await trendsTable()
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();

    if (error || !row) throw new Error("Tendência não encontrada");

    const systemPrompt = `Você é um especialista em marketing digital e tendências de busca no Google.
Analise a tendência e retorne um JSON com:
- opportunity_level: "alta" | "media" | "baixa"
- niche_summary: resumo do nicho em 1 frase
- ebook_ideas: array com 3 títulos de ebooks para esse nicho
- copy_hooks: array com 3 ganchos de copy baseados na tendência
- target_audience: descrição do público-alvo ideal
- best_format: melhor formato de produto digital (ebook, curso, mentoria, etc.)
- urgency_reason: por que esse nicho precisa de solução agora
Responda APENAS com o JSON.`;

    const userPrompt = `Keyword: ${row.keyword}
País: ${row.geo}
Interesse médio: ${row.avg_interest}/100
Interesse pico: ${row.peak_interest}/100
Tendência: ${row.trend}
Queries relacionadas: ${(row.related_queries as string[])?.slice(0, 5).join(", ")}
Tópicos relacionados: ${(row.related_topics as string[])?.slice(0, 5).join(", ")}`;

    const analysis = await generateAIJson<GoogleTrendsAiAnalysis>(userPrompt, { systemPrompt });

    await trendsTable()
      .update({ ai_analysis: analysis })
      .eq("id", data.id)
      .eq("user_id", userId);

    return analysis;
  });

export const deleteGoogleTrendFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await trendsTable()
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearGoogleTrendsKeywordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof KeywordInput>) => KeywordInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await trendsTable()
      .delete()
      .eq("user_id", userId)
      .eq("keyword", data.keyword);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
