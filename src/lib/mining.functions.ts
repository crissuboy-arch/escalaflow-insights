import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mineMetaAds } from "../miners/meta";

export const performMining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    query: z.string(),
    country: z.string(),
    language: z.string(),
    type: z.enum(["meta", "tiktok", "instagram"])
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    
    let results: any = [];
    
    if (data.type === "meta") {
      results = await mineMetaAds(data.query, data.country, data.language);
    }
    // TODO: Implement tiktok/instagram logic
    
    // Save to Supabase (assuming results has appropriate structure)
    // await supabase.from("offers").insert(results);

    return results;
  });
