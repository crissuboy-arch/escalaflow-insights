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
      console.log(`[mining] starting ${data.type} mining: query="${data.query}", country=${data.country}, lang=${data.language}`);

      if (data.type === "meta") {
        const results = await mineMetaAds(data.query, data.country, data.language);
        console.log(`[mining] meta mined ${results.length} ads, persisting to Supabase...`);
        if (results.length > 0) {
          const rows = results.map(offerRowFromAd);
          const { error } = await supabase.from("offers").insert(rows);
          if (error) console.error("[mining] meta supabase insert error:", error);
          else console.log(`[mining] persisted ${rows.length} meta ads to Supabase`);
        }
        return { type: "meta" as const, items: results };
      }

      if (data.type === "tiktok") {
        const results = await mineTikTok(data.query);
        console.log(`[mining] tiktok mined ${results.length} videos, persisting to Supabase...`);
        if (results.length > 0) {
          const rows = results.map(offerRowFromTikTok);
          const { error } = await supabase.from("offers").insert(rows);
          if (error) console.error("[mining] tiktok supabase insert error:", error);
          else console.log(`[mining] persisted ${rows.length} tiktok results to Supabase`);
        }
        return { type: "tiktok" as const, items: results };
      }

      if (data.type === "instagram") {
        const results = await mineInstagram(data.query);
        console.log(`[mining] instagram mined ${results.length} posts, persisting to Supabase...`);
        if (results.length > 0) {
          const rows = results.map(offerRowFromInstagram);
          const { error } = await supabase.from("offers").insert(rows);
          if (error) console.error("[mining] instagram supabase insert error:", error);
          else console.log(`[mining] persisted ${rows.length} instagram results to Supabase`);
        }
        return { type: "instagram" as const, items: results };
      }

      if (data.type === "trends") {
        const results = await getGoogleTrends(data.query, data.country);
        console.log(`[mining] trends mined ${results.length} keywords, persisting to Supabase...`);
        if (results.length > 0) {
          const rows = results.map((t) => ({
            topic: t.keyword,
            country: data.country,
            language: data.language,
            data: t,
          }));
          const { error } = await supabase.from("trends").insert(rows);
          if (error) console.error("[mining] trends supabase insert error:", error);
          else console.log(`[mining] persisted ${rows.length} trends to Supabase`);
        }
        return { type: "trends" as const, items: results };
      }

      throw new Error("Tipo de mineração desconhecido");
    } catch (err) {
      console.error(`[mining] performMining(${data.type}) FAILED:`, err);
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
