import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchTikTok, fetchInstagram, fetchYouTube, type VideoRadarFilters } from "@/lib/video-radar.functions";

// Real per-user counts across the tables the Radares actually populate
// today (tiktok_minerados, instagram_minerados, youtube_minerados,
// google_trends_minerados, produtos_minerados). The previous version of
// this function counted the "offers"/"saved_offers"/"trends" tables,
// which are schema-correct but have no live writer in the app (the only
// code path that ever inserted into "offers", mining.functions.ts, is
// never called from any route) — so those counts were honest but always
// near-zero. These five tables are the ones that grow every time someone
// actually uses a Radar.
const RADAR_TABLES = [
  "tiktok_minerados",
  "instagram_minerados",
  "youtube_minerados",
  "google_trends_minerados",
  "produtos_minerados",
] as const;

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // These tables aren't in the generated Supabase types yet (same gap
    // already documented in each radar's own *.functions.ts file).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    try {
      console.log("[dashboard] fetching real stats for user:", userId);
      const [radarCounts, analyses, scaled] = await Promise.all([
        Promise.all(
          RADAR_TABLES.map((table) =>
            sb.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId),
          ),
        ),
        supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", userId),
        // "Quentes" = itens que o próprio usuário já marcou como escalando,
        // mesma semântica real já usada em /ofertas-escaladas (user_ad_actions,
        // action="scaled") — não um score fictício.
        supabase
          .from("user_ad_actions")
          .select("id", { count: "exact", head: true })
          .eq("action", "scaled"),
      ]);
      const mined = radarCounts.reduce((sum, r) => sum + (r.count ?? 0), 0);
      const stats = {
        mined,
        analyses: analyses.count ?? 0,
        hot: scaled.count ?? 0,
      };
      console.log("[dashboard] stats:", stats);
      return stats;
    } catch (err) {
      console.error("[dashboard] getDashboardStats error:", err);
      return { mined: 0, analyses: 0, hot: 0 };
    }
  });

export interface RecentMinedItem {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  title: string;
  authorOrAdvertiser: string | null;
  score: number | null;
  createdAt: string | null;
}

/** Reuses the exact same per-platform fetchers the Radar de Vídeos page
 *  calls (src/lib/video-radar.functions.ts) — no second normalization of
 *  the same tables. */
export const getRecentMinedItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecentMinedItem[]> => {
    const { userId } = context;
    const filters: VideoRadarFilters = { tab: "bombando", dateRange: "all", limit: 20 };
    const notes: string[] = [];
    try {
      const [tiktok, instagram, youtube] = await Promise.all([
        fetchTikTok(userId, filters, notes),
        fetchInstagram(userId, filters, notes),
        fetchYouTube(userId, filters, notes),
      ]);
      return [...tiktok, ...instagram, ...youtube]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 8)
        .map((card) => ({
          id: card.id,
          platform: card.platform as "tiktok" | "instagram" | "youtube",
          title: card.title,
          authorOrAdvertiser: card.authorOrAdvertiser,
          score: card.score,
          createdAt: card.createdAt,
        }));
    } catch (err) {
      console.error("[dashboard] getRecentMinedItems error:", err);
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
