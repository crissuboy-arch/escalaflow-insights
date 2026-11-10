// Facebook Viral — mineração real via Apify (Fase 3). Server functions
// finas sobre src/lib/miners/facebook-viral.ts: nenhuma lógica de
// normalização/custo mora aqui, só orquestração + persistência.
//
// runFacebookMining é a ÚNICA função deste módulo que gasta créditos Apify.
// A UI (facebook-viral.tsx) só a chama depois do utilizador ver o custo
// estimado (estimateMiningCostFn, sem rede) e confirmar explicitamente —
// nunca é chamada automaticamente por nenhum teste ou efeito.
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkFacebookUrl } from "@/lib/facebook-viral/link-detector";
import {
  estimateFacebookMiningCost,
  mineFacebookPage,
  mineFacebookReels,
  type MiningCostEstimate,
} from "@/lib/miners/facebook-viral";

const PeriodDays = z.union([z.literal(7), z.literal(30), z.literal(90)]);
const ResultsLimit = z.union([z.literal(10), z.literal(20), z.literal(30)]);

export const estimateMiningCostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: ResultsLimit }).parse(d))
  .handler(async ({ data }): Promise<MiningCostEstimate> => {
    return estimateFacebookMiningCost({ limit: data.limit });
  });

const RunMiningInput = z.object({
  pageUrl: z.string().min(1),
  periodDays: PeriodDays,
  limit: ResultsLimit,
});

export type RunMiningResult =
  | {
      ok: true;
      pageId: string;
      verifiedName: string | null;
      insertedReels: number;
      skippedDuplicates: number;
      // true quando o fornecedor devolveu 0 Reels (não confundir com
      // sucesso silencioso — a UI deve mostrar isto como um aviso distinto,
      // nunca como "pesquisa concluída" sem mais nada).
      zeroResults: boolean;
    }
  | { ok: false; error: string };

export const runFacebookMining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunMiningInput.parse(d))
  .handler(async ({ data, context }): Promise<RunMiningResult> => {
    const check = checkFacebookUrl(data.pageUrl);
    if (!check.valid || !check.normalizedUrl) {
      return { ok: false, error: check.error ?? "URL inválida" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;

    console.log(`[facebook-viral-miner] ▶ página=${check.normalizedUrl}`);
    let minedPage;
    try {
      minedPage = await mineFacebookPage(check.normalizedUrl);
      console.log(
        `[facebook-viral-miner] ✓ página — nome_verificado=${minedPage?.verifiedName ?? "—"} seguidores=${minedPage?.followers ?? "—"}`,
      );
    } catch (e) {
      console.error(`[facebook-viral-miner] ✗ falha ao minerar página:`, e);
      return { ok: false, error: e instanceof Error ? e.message : "Falha ao minerar a página." };
    }

    const pagePatch: Record<string, unknown> = { last_mined_at: new Date().toISOString() };
    if (minedPage?.verifiedName) {
      pagePatch.verified_name = minedPage.verifiedName;
      pagePatch.name_source = "apify";
    }
    if (typeof minedPage?.followers === "number") pagePatch.followers = minedPage.followers;

    const { data: existingPage, error: findError } = await sb
      .from("viral_pages")
      .select("*")
      .eq("page_url", check.normalizedUrl)
      .maybeSingle();
    if (findError) return { ok: false, error: findError.message };

    let pageRow: { id: string };
    if (existingPage) {
      const { data: updated, error } = await sb
        .from("viral_pages")
        .update(pagePatch)
        .eq("id", existingPage.id)
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      pageRow = updated;
    } else {
      const { data: created, error } = await sb
        .from("viral_pages")
        .insert({ user_id: context.userId, page_url: check.normalizedUrl, ...pagePatch })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      pageRow = created;
    }

    let minedReels;
    try {
      minedReels = await mineFacebookReels(check.normalizedUrl, {
        periodDays: data.periodDays,
        limit: data.limit,
      });
      console.log(
        `[facebook-viral-miner] ✓ reels — brutos=${minedReels.length} período=${data.periodDays}d limite=${data.limit}`,
      );
    } catch (e) {
      // A página já foi confirmada/gravada — só a parte de Reels falhou.
      console.error(`[facebook-viral-miner] ✗ falha ao minerar reels:`, e);
      return {
        ok: false,
        error:
          e instanceof Error
            ? `Página confirmada, mas a mineração de Reels falhou: ${e.message}`
            : "Falha ao minerar os Reels.",
      };
    }
    const zeroResults = minedReels.length === 0;

    const candidates = minedReels
      .map((r) => {
        const rc = checkFacebookUrl(r.reelUrl);
        if (!rc.valid || !rc.normalizedUrl) return null;
        const publishedAt = r.publishedAt ? new Date(r.publishedAt) : null;
        return {
          user_id: context.userId,
          viral_page_id: pageRow.id,
          reel_url: rc.normalizedUrl,
          link_type: rc.linkType,
          views: r.views ?? null,
          caption: r.caption ?? null,
          comments_count: r.commentsCount ?? null,
          shares_count: r.sharesCount ?? null,
          thumbnail_url: r.thumbnailUrl ?? null,
          duration_seconds: r.durationSeconds ?? null,
          published_at:
            publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
          data_source: "apify",
          collected_at: new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (candidates.length === 0) {
      return {
        ok: true,
        pageId: pageRow.id,
        verifiedName: minedPage?.verifiedName ?? null,
        insertedReels: 0,
        skippedDuplicates: 0,
        zeroResults,
      };
    }

    // Nunca sobrescreve um Reel já guardado (manual ou de uma mineração
    // anterior) — só insere os que ainda não existem para este utilizador.
    const urls = candidates.map((c) => c.reel_url);
    const { data: existingReels, error: existingError } = await sb
      .from("viral_reels")
      .select("reel_url")
      .in("reel_url", urls);
    if (existingError) return { ok: false, error: existingError.message };

    const existingUrlSet = new Set(
      (existingReels ?? []).map((r: { reel_url: string }) => r.reel_url),
    );
    const newRows = candidates.filter((c) => !existingUrlSet.has(c.reel_url));

    if (newRows.length > 0) {
      const { error: insertError } = await sb.from("viral_reels").insert(newRows);
      if (insertError) return { ok: false, error: insertError.message };
    }

    return {
      ok: true,
      pageId: pageRow.id,
      verifiedName: minedPage?.verifiedName ?? null,
      insertedReels: newRows.length,
      skippedDuplicates: candidates.length - newRows.length,
      zeroResults,
    };
  });
