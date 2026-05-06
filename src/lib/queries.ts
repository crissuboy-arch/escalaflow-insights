import { supabase } from "@/integrations/supabase/client";

export async function fetchOffers(filters?: {
  keyword?: string; niche?: string; country?: string; platform?: string; limit?: number;
}) {
  let q = supabase.from("mined_offers").select("*").order("scale_score", { ascending: false });
  if (filters?.keyword) q = q.or(`advertiser_name.ilike.%${filters.keyword}%,summary.ilike.%${filters.keyword}%,keyword.ilike.%${filters.keyword}%`);
  if (filters?.niche && filters.niche !== "all") q = q.eq("niche", filters.niche);
  if (filters?.country && filters.country !== "all") q = q.eq("country", filters.country);
  if (filters?.platform && filters.platform !== "all") q = q.eq("platform", filters.platform);
  if (filters?.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchSaved(userId: string) {
  const { data, error } = await supabase
    .from("saved_offers").select("*, mined_offers(*)").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function toggleSaveOffer(userId: string, offerId: string) {
  const { data: existing } = await supabase
    .from("saved_offers").select("id").eq("user_id", userId).eq("offer_id", offerId).maybeSingle();
  if (existing) { await supabase.from("saved_offers").delete().eq("id", existing.id); return false; }
  await supabase.from("saved_offers").insert({ user_id: userId, offer_id: offerId });
  return true;
}

export async function toggleFavorite(userId: string, offerId: string, value: boolean) {
  const { data: existing } = await supabase
    .from("saved_offers").select("id").eq("user_id", userId).eq("offer_id", offerId).maybeSingle();
  if (existing) await supabase.from("saved_offers").update({ is_favorite: value }).eq("id", existing.id);
  else await supabase.from("saved_offers").insert({ user_id: userId, offer_id: offerId, is_favorite: value });
}