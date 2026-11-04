// Facebook Viral — Biblioteca (Fase 2): páginas, reels e produtos de
// afiliado. CRUD simples, isolado por utilizador via RLS (viral_pages/
// viral_reels/affiliate_products: user_id = auth.uid()). Usa o cliente da
// sessão (context.supabase), nunca supabaseAdmin — a isolação depende da
// RLS, não de um filtro manual.
//
// viral_pages/viral_reels/affiliate_products ainda não estão no Database
// gerado (migration nova, types.ts não regenerado) — mesmo padrão já usado
// em dashboard.functions.ts e nos radares para tabelas nesta situação.
import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkFacebookUrl } from "@/lib/facebook-viral/link-detector";

// ── Páginas ──────────────────────────────────────────────────────────────

const SaveViralPageInput = z.object({
  pageUrl: z.string().min(1),
  pageName: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  niche: z.string().optional(),
  folder: z.string().optional(),
  followers: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  affiliateProductId: z.string().uuid().optional(),
});

export interface ViralPageRow {
  id: string;
  page_url: string;
  page_name: string | null;
  country: string | null;
  language: string | null;
  niche: string | null;
  folder: string | null;
  followers: number | null;
  notes: string | null;
  affiliate_product_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SaveViralPageResult =
  | { ok: true; page: ViralPageRow }
  | { ok: false; error: string; code: "INVALID_URL" | "DUPLICATE" | "DB_ERROR" };

export const saveViralPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveViralPageInput.parse(d))
  .handler(async ({ data, context }): Promise<SaveViralPageResult> => {
    const check = checkFacebookUrl(data.pageUrl);
    if (!check.valid || !check.normalizedUrl) {
      return { ok: false, error: check.error ?? "URL inválida", code: "INVALID_URL" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("viral_pages")
      .insert({
        user_id: context.userId,
        page_url: check.normalizedUrl,
        page_name: data.pageName?.trim() || null,
        country: data.country?.trim() || null,
        language: data.language?.trim() || null,
        niche: data.niche?.trim() || null,
        folder: data.folder?.trim() || null,
        followers: data.followers ?? null,
        notes: data.notes?.trim() || null,
        affiliate_product_id: data.affiliateProductId ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Esta página já está guardada.", code: "DUPLICATE" };
      }
      return { ok: false, error: error.message, code: "DB_ERROR" };
    }
    return { ok: true, page: row as ViralPageRow };
  });

const ListViralPagesInput = z.object({
  niche: z.string().optional(),
  folder: z.string().optional(),
  orderBy: z.enum(["created_at", "followers"]).default("created_at"),
});

export const listViralPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListViralPagesInput.parse(d))
  .handler(async ({ data, context }): Promise<ViralPageRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let query = sb.from("viral_pages").select("*");
    if (data.niche) query = query.eq("niche", data.niche);
    if (data.folder) query = query.eq("folder", data.folder);
    query = query.order(data.orderBy, { ascending: false, nullsFirst: false });
    const { data: rows, error } = await query;
    if (error) {
      console.error("[facebook-viral] listViralPages failed:", error);
      return [];
    }
    return (rows ?? []) as ViralPageRow[];
  });

/** Saves a page, or — when it's already saved (unique on page_url) — looks
 *  up and returns the existing row instead of surfacing DUPLICATE as an
 *  error. Lets the combined "Importar Página ou Reel" form link a reel to
 *  its page without the user having to check "did I already save this
 *  page?" first. */
export const findOrCreateViralPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveViralPageInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; page: ViralPageRow } | { ok: false; error: string }> => {
      const check = checkFacebookUrl(data.pageUrl);
      if (!check.valid || !check.normalizedUrl) {
        return { ok: false, error: check.error ?? "URL inválida" };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const created = await saveViralPage({ data, context } as never);
      if (created.ok) return created;
      if (created.code !== "DUPLICATE") return { ok: false, error: created.error };

      const { data: existing, error } = await sb
        .from("viral_pages")
        .select("*")
        .eq("page_url", check.normalizedUrl)
        .single();
      if (error || !existing)
        return { ok: false, error: error?.message ?? "Página não encontrada." };
      return { ok: true, page: existing as ViralPageRow };
    },
  );

export const deleteViralPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("viral_pages").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ── Reels ────────────────────────────────────────────────────────────────

const SaveViralReelInput = z.object({
  reelUrl: z.string().min(1),
  viralPageId: z.string().uuid().optional(),
  views: z.number().int().min(0).optional(),
  publishedAt: z.string().optional(), // ISO date, manual
  productPromoted: z.string().optional(),
  affiliateLink: z.string().optional(),
  affiliateProductId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export interface ViralReelRow {
  id: string;
  viral_page_id: string | null;
  reel_url: string;
  link_type: "page" | "post" | "reel";
  views: number | null;
  published_at: string | null;
  product_promoted: string | null;
  affiliate_link: string | null;
  affiliate_product_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SaveViralReelResult =
  | { ok: true; reel: ViralReelRow }
  | { ok: false; error: string; code: "INVALID_URL" | "DUPLICATE" | "DB_ERROR" };

export const saveViralReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveViralReelInput.parse(d))
  .handler(async ({ data, context }): Promise<SaveViralReelResult> => {
    const check = checkFacebookUrl(data.reelUrl);
    if (!check.valid || !check.normalizedUrl) {
      return { ok: false, error: check.error ?? "URL inválida", code: "INVALID_URL" };
    }

    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("viral_reels")
      .insert({
        user_id: context.userId,
        viral_page_id: data.viralPageId ?? null,
        reel_url: check.normalizedUrl,
        link_type: check.linkType,
        views: data.views ?? null,
        published_at:
          publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
        product_promoted: data.productPromoted?.trim() || null,
        affiliate_link: data.affiliateLink?.trim() || null,
        affiliate_product_id: data.affiliateProductId ?? null,
        notes: data.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Este link já está guardado.", code: "DUPLICATE" };
      }
      return { ok: false, error: error.message, code: "DB_ERROR" };
    }
    return { ok: true, reel: row as ViralReelRow };
  });

const ListViralReelsInput = z.object({
  viralPageId: z.string().uuid().optional(),
  orderBy: z.enum(["created_at", "views", "published_at"]).default("views"),
});

export const listViralReels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListViralReelsInput.parse(d))
  .handler(async ({ data, context }): Promise<ViralReelRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let query = sb.from("viral_reels").select("*");
    if (data.viralPageId) query = query.eq("viral_page_id", data.viralPageId);
    query = query.order(data.orderBy, { ascending: false, nullsFirst: false });
    const { data: rows, error } = await query;
    if (error) {
      console.error("[facebook-viral] listViralReels failed:", error);
      return [];
    }
    return (rows ?? []) as ViralReelRow[];
  });

export const getViralReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<ViralReelRow | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row } = await sb.from("viral_reels").select("*").eq("id", data.id).maybeSingle();
    return (row as ViralReelRow) ?? null;
  });

export const deleteViralReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("viral_reels").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ── Produtos de afiliado ─────────────────────────────────────────────────

const SaveAffiliateProductInput = z.object({
  network: z.enum(["clickbank", "digistore24", "other"]).default("other"),
  productName: z.string().min(1),
  commission: z.string().optional(),
  affiliateLink: z.string().min(1),
  salesPageUrl: z.string().optional(),
  niche: z.string().optional(),
  targetAudience: z.string().optional(),
});

export interface AffiliateProductRow {
  id: string;
  network: "clickbank" | "digistore24" | "other";
  product_name: string;
  commission: string | null;
  affiliate_link: string;
  sales_page_url: string | null;
  niche: string | null;
  target_audience: string | null;
  created_at: string;
  updated_at: string;
}

export const saveAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveAffiliateProductInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; product: AffiliateProductRow } | { ok: false; error: string }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = context.supabase as any;
      const { data: row, error } = await sb
        .from("affiliate_products")
        .insert({
          user_id: context.userId,
          network: data.network,
          product_name: data.productName.trim(),
          commission: data.commission?.trim() || null,
          affiliate_link: data.affiliateLink.trim(),
          sales_page_url: data.salesPageUrl?.trim() || null,
          niche: data.niche?.trim() || null,
          target_audience: data.targetAudience?.trim() || null,
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, product: row as AffiliateProductRow };
    },
  );

export const listAffiliateProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AffiliateProductRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("affiliate_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[facebook-viral] listAffiliateProducts failed:", error);
      return [];
    }
    return (rows ?? []) as AffiliateProductRow[];
  });

export const deleteAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("affiliate_products").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
