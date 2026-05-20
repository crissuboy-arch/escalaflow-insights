import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mineMetaAds } from "../miners/meta";
import type { AdResult } from "../miners/meta";
import { mineTikTok } from "../miners/tiktok";
import type { TikTokResult } from "../miners/tiktok";
import { mineInstagram } from "../miners/instagram";
import type { InstagramResult } from "../miners/instagram";
import { getGoogleTrends } from "../trends/google";
import type { TrendResult } from "../trends/google";
import { calculateCompositeScore } from "./scoring/engine";

function offerRowFromAd(ad: AdResult) {
  return {
    advertiser: ad.advertiser,
    headline: ad.headline,
    copy: ad.copy,
    cta: ad.cta,
    creative_type: ad.creativeType,
    platform: ad.platforms?.[0] ?? "Facebook",
    country: ad.country,
    engagement: ad.engagement,
    landing_page: ad.landingPage,
    language: ad.language,
  };
}

function offerRowFromTikTok(t: TikTokResult) {
  return {
    advertiser: t.creator,
    headline: t.hook,
    copy: t.description ?? "",
    cta: "",
    creative_type: "video",
    platform: "TikTok",
    country: "",
    engagement: { likes: t.likes, shares: t.shares, comments: t.comments, views: t.views },
    landing_page: t.videoUrl,
    language: "",
  };
}

function offerRowFromInstagram(ig: InstagramResult) {
  return {
    advertiser: ig.creator,
    headline: ig.caption.slice(0, 120),
    copy: ig.caption,
    cta: "",
    creative_type: ig.videoUrl ? "video" : "image",
    platform: "Instagram",
    country: "",
    engagement: { likes: ig.engagement.likes, comments: ig.engagement.comments, followers: ig.followers },
    landing_page: ig.reelsUrl,
    language: "",
  };
}

export type MiningResult =
  | { type: "meta"; items: AdResult[] }
  | { type: "tiktok"; items: TikTokResult[] }
  | { type: "instagram"; items: InstagramResult[] }
  | { type: "trends"; items: TrendResult[] };

export const performMining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    query: z.string(),
    country: z.string(),
    language: z.string(),
    type: z.enum(["meta", "tiktok", "instagram", "trends"])
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    try {
      if (data.type === "meta") {
        const results = await mineMetaAds(data.query, data.country, data.language);
        const rows = results.map(offerRowFromAd);
        if (rows.length > 0) {
          const { error } = await supabase.from("offers").insert(rows);
          if (error) console.error("[mining] meta insert error:", error);
        }
        return { type: "meta" as const, items: results };
      }

      if (data.type === "tiktok") {
        const results = await mineTikTok(data.query);
        const rows = results.map(offerRowFromTikTok);
        if (rows.length > 0) {
          const { error } = await supabase.from("offers").insert(rows);
          if (error) console.error("[mining] tiktok insert error:", error);
        }
        return { type: "tiktok" as const, items: results };
      }

      if (data.type === "instagram") {
        const results = await mineInstagram(data.query);
        const rows = results.map(offerRowFromInstagram);
        if (rows.length > 0) {
          const { error } = await supabase.from("offers").insert(rows);
          if (error) console.error("[mining] instagram insert error:", error);
        }
        return { type: "instagram" as const, items: results };
      }

      if (data.type === "trends") {
        const results = await getGoogleTrends(data.query, data.country);
        const rows = results.map((t) => ({
          topic: t.keyword,
          country: data.country,
          language: data.language,
          data: t,
        }));
        if (rows.length > 0) {
          const { error } = await supabase.from("trends").insert(rows);
          if (error) console.error("[mining] trends insert error:", error);
        }
        return { type: "trends" as const, items: results };
      }

      throw new Error("Tipo de mineração desconhecido");
    } catch (err) {
      console.error("[mining] performMining error:", err);
      throw err;
    }
  });

export const performMiningWithScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    query: z.string(),
    country: z.string(),
    language: z.string(),
    type: z.enum(["meta", "tiktok", "instagram", "trends"])
  }).parse(d))
  .handler(async ({ data, context }) => {
    const result = await performMining({ data });
    if (result.type === "trends") return result;
    const scored = result.items.map((item: any) => ({
      ...item,
      compositeScore: calculateCompositeScore(item),
    }));
    return { ...result, items: scored };
  });
