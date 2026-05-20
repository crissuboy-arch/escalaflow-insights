import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [offers, analyses, saved] = await Promise.all([
      supabase.from("offers").select("id, status", { count: "exact", head: true }),
      supabase.from("analyses").select("id", { count: "exact", head: true }),
      supabase.from("saved_offers").select("offer_id").eq("user_id", userId),
    ]);
    return {
      mined: offers.count ?? 0,
      analyses: analyses.count ?? 0,
      saved: saved.data?.length ?? 0,
      hot: offers.count ?? 0,
    };
  });
