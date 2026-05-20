import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      console.log("[dashboard] fetching stats for user:", userId);
      const [offers, analyses, saved, trends] = await Promise.all([
        supabase.from("offers").select("id, status", { count: "exact", head: true }),
        supabase.from("analyses").select("id", { count: "exact", head: true }),
        supabase.from("saved_offers").select("offer_id").eq("user_id", userId),
        supabase.from("trends").select("id", { count: "exact", head: true }),
      ]);
      const stats = {
        mined: offers.count ?? 0,
        analyses: analyses.count ?? 0,
        saved: saved.data?.length ?? 0,
        hot: offers.count ?? 0,
        trends: trends.count ?? 0,
      };
      console.log("[dashboard] stats:", stats);
      return stats;
    } catch (err) {
      console.error("[dashboard] getDashboardStats error:", err);
      return { mined: 0, analyses: 0, saved: 0, hot: 0, trends: 0 };
    }
  });

export const getRecentOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    try {
      console.log("[dashboard] fetching recent offers...");
      const { data, error } = await supabase
        .from("offers")
        .select("id, advertiser, headline, platform, country, language, engagement, creative_type, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      console.log(`[dashboard] recent offers: ${data?.length ?? 0} rows`);
      return data ?? [];
    } catch (err) {
      console.error("[dashboard] getRecentOffers error:", err);
      return [];
    }
  });

export const getTrendingTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    try {
      console.log("[dashboard] fetching trending topics...");
      const { data, error } = await supabase
        .from("trends")
        .select("id, topic, country, data, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      console.log(`[dashboard] trending topics: ${data?.length ?? 0} rows`);
      return data ?? [];
    } catch (err) {
      console.error("[dashboard] getTrendingTopics error:", err);
      return [];
    }
  });
