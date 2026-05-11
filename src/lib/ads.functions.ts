import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ActionEnum = z.enum(["saved", "favorite", "scaled"]);

const AdSchema = z.object({
  db_id: z.string().uuid().nullable().optional(),
  ad_library_id: z.string().nullable().optional(),
  ad_url: z.string().nullable().optional(),
  advertiser: z.string().default("Anunciante"),
  headline: z.string().default(""),
  copy: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  platform: z.string().default("Facebook"),
  country: z.string().default("—"),
  niche: z.string().default("Geral"),
  score: z.number().default(0),
});

type AdInput = z.infer<typeof AdSchema>;

async function ensureCollectedAd(ad: AdInput): Promise<string> {
  if (ad.db_id) return ad.db_id;
  if (ad.ad_library_id) {
    const { data } = await supabaseAdmin
      .from("collected_ads")
      .select("id")
      .eq("ad_library_id", ad.ad_library_id)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  if (ad.ad_url) {
    const { data } = await supabaseAdmin
      .from("collected_ads")
      .select("id")
      .eq("ad_url", ad.ad_url)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  const { data, error } = await supabaseAdmin
    .from("collected_ads")
    .insert({
      ad_library_id: ad.ad_library_id ?? null,
      ad_url: ad.ad_url ?? null,
      advertiser: ad.advertiser || "Anunciante",
      headline: ad.headline || "",
      copy: ad.copy ?? null,
      cta: ad.cta ?? null,
      image_url: ad.image_url ?? null,
      video_url: ad.video_url ?? null,
      creative_type: ad.video_url ? "video" : ad.image_url ? "image" : null,
      platform: ad.platform || "Facebook",
      country: ad.country || "—",
      niche: ad.niche || "Geral",
      score: ad.score ?? 0,
      source: "user",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export const setAdAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { ad: AdInput; action: z.infer<typeof ActionEnum>; value: boolean }) =>
      z.object({ ad: AdSchema, action: ActionEnum, value: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const adId = await ensureCollectedAd(data.ad);
    if (data.value) {
      const { error } = await supabaseAdmin
        .from("user_ad_actions")
        .upsert(
          { user_id: userId, ad_id: adId, action: data.action },
          { onConflict: "user_id,ad_id,action" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_ad_actions")
        .delete()
        .eq("user_id", userId)
        .eq("ad_id", adId)
        .eq("action", data.action);
      if (error) throw new Error(error.message);
    }
    return { ok: true, db_id: adId };
  });

export const listAdActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: z.infer<typeof ActionEnum> }) =>
    z.object({ action: ActionEnum }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: rows, error } = await supabaseAdmin
      .from("user_ad_actions")
      .select("created_at, ad_id, action, collected_ads(*)")
      .eq("user_id", userId)
      .eq("action", data.action)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Row = { created_at: string; ad_id: string; action: string; collected_ads: Record<string, any> | null };
    let extras: Row[] = [];
    if (data.action === "scaled") {
      // Heuristic: also surface collected_ads with score >= 80
      const { data: hot } = await supabaseAdmin
        .from("collected_ads")
        .select("*")
        .gte("score", 80)
        .order("score", { ascending: false })
        .limit(50);
      extras = (hot ?? []).map((c) => ({
        created_at: c.created_at,
        ad_id: c.id,
        action: "scaled",
        collected_ads: c as unknown as Record<string, unknown>,
      }));
    }

    const seen = new Set<string>();
    const out: Row[] = [];
    const merged = [...((rows ?? []) as unknown as Row[]), ...extras];
    for (const r of merged) {
      if (!r.ad_id || seen.has(r.ad_id)) continue;
      seen.add(r.ad_id);
      out.push(r);
    }
    return out;
  });

export const listAdActionKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("user_ad_actions")
      .select("ad_id, action, collected_ads(ad_library_id, ad_url)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const out: Record<"saved" | "favorite" | "scaled", string[]> = {
      saved: [],
      favorite: [],
      scaled: [],
    };
    for (const r of (data ?? []) as Array<{
      ad_id: string;
      action: "saved" | "favorite" | "scaled";
      collected_ads: { ad_library_id: string | null; ad_url: string | null } | null;
    }>) {
      const c = r.collected_ads;
      const key = c?.ad_library_id || c?.ad_url || r.ad_id;
      out[r.action].push(key);
    }
    return out;
  });