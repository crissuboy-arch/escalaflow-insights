import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mineMetaAds } from "../miners/meta";
import { mineTikTok } from "../miners/tiktok";
import { mineInstagram } from "../miners/instagram";
import { getGoogleTrends } from "../trends/google";

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
    
    let results: any = [];
    
    if (data.type === "meta") {
      results = await mineMetaAds(data.query, data.country, data.language);
    } else if (data.type === "tiktok") {
      results = await mineTikTok(data.query);
    } else if (data.type === "instagram") {
      results = await mineInstagram(data.query);
    } else if (data.type === "trends") {
      results = await getGoogleTrends(data.query, data.country);
    }
    
    // In production, we'd save to DB here
    // await supabase.from("offers").insert(results);

    return results;
  });
