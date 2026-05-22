import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runEcommerceRadarSkill } from "@/skills/ecommerce-radar.skill";
import type { EcommercePlatform } from "@/skills/ecommerce-radar.skill";
import { generateAIJson } from "@/lib/aiService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prodTable = () => (supabaseAdmin as any).from("produtos_minerados");

// ── input schemas ─────────────────────────────────────────────────────────────

const MineInput = z.object({
  query: z.string().min(1),
  platform: z.enum(["amazon", "shopee", "mercadolivre"]),
  country: z.string().default("BR"),
  maxResults: z.number().int().min(1).max(100).default(50),
  sortBy: z
    .enum(["relevance", "sales", "price_asc", "price_desc", "rating"])
    .default("sales"),
});

const ListInput = z.object({
  query: z.string().optional(),
  platform: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

const IdInput = z.object({ id: z.string().uuid() });
const QueryInput = z.object({ query: z.string() });

// ── server functions ──────────────────────────────────────────────────────────

export const mineEcommerceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;

    const result = await runEcommerceRadarSkill({
      query: data.query,
      platform: data.platform as EcommercePlatform,
      country: data.country,
      maxResults: data.maxResults,
      sortBy: data.sortBy as any,
    });

    if (!result.ok) throw new Error(result.error ?? "Ecommerce skill failed");
    if (!result.data.length) return { inserted: 0, skipped: 0 };

    const rows = result.data
      .filter((p) => p.productId)
      .map((p) => ({
        user_id: userId,
        query: data.query.trim(),
        platform: p.platform,
        product_id: p.productId,
        title: p.title,
        price: p.price,
        currency: p.currency,
        original_price: p.originalPrice,
        discount: p.discount,
        rating: p.rating,
        review_count: p.reviewCount,
        sold_count: p.soldCount,
        seller: p.seller,
        product_url: p.productUrl,
        image_url: p.imageUrl,
        category: p.category,
        opportunity_score: p.opportunityScore,
      }));

    const { data: inserted, error } = await prodTable()
      .upsert(rows, { onConflict: "user_id,platform,product_id", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return {
      inserted: inserted?.length ?? 0,
      skipped: rows.length - (inserted?.length ?? 0),
    };
  });

export const listEcommerceMinedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    let query = prodTable()
      .select("*")
      .eq("user_id", userId)
      .order("opportunity_score", { ascending: false })
      .limit(data.limit);

    if (data.query) query = query.eq("query", data.query);
    if (data.platform) query = query.eq("platform", data.platform);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type ProdutoAiAnalysis = {
  niche: string;
  digital_opportunity: string;
  ebook_title: string;
  offer_angle: string;
  target_audience: string;
  pain_point: string;
  positioning: string;
};

export const analyzeProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;

    const { data: row, error } = await prodTable()
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();

    if (error || !row) throw new Error("Produto não encontrado");

    const systemPrompt = `Você é um especialista em produtos digitais e oportunidades de mercado.
Analise o produto físico/digital e retorne um JSON com:
- niche: nicho de mercado
- digital_opportunity: como transformar esse mercado em produto digital
- ebook_title: título de ebook ideal para esse nicho
- offer_angle: ângulo de oferta para público que compra esse produto
- target_audience: descrição detalhada do público
- pain_point: dor principal que motiva a compra
- positioning: como posicionar um produto digital nesse mercado
Responda APENAS com o JSON.`;

    const userPrompt = `Produto: ${row.title}
Plataforma: ${row.platform}
Preço: R$ ${Number(row.price).toFixed(2)}
Preço original: R$ ${Number(row.original_price).toFixed(2)}
Desconto: ${row.discount}%
Avaliação: ${Number(row.rating).toFixed(1)}/5
Reviews: ${Number(row.review_count).toLocaleString("pt-BR")}
Vendidos: ${Number(row.sold_count).toLocaleString("pt-BR")}
Categoria: ${row.category}
Opportunity Score: ${row.opportunity_score}/100`;

    const analysis = await generateAIJson<ProdutoAiAnalysis>(userPrompt, { systemPrompt });

    await prodTable()
      .update({ ai_analysis: analysis })
      .eq("id", data.id)
      .eq("user_id", userId);

    return analysis;
  });

export const deleteProdutoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdInput>) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await prodTable()
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearEcommerceQueryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof QueryInput>) => QueryInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    const { error } = await prodTable()
      .delete()
      .eq("user_id", userId)
      .eq("query", data.query);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
