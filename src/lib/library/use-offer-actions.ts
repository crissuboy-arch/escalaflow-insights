// Favoritos e salvos da Biblioteca — persistidos em user_ad_actions (Supabase)
// pelo mesmo caminho que Ofertas Salvas / Favoritos já usam, então o que é
// marcado aqui aparece nesses módulos e sobrevive a refresh / nova sessão.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  favoriteCollectedAd,
  fetchFavIds,
  fetchSavedIds,
  saveCollectedAd,
  subscribeChange,
  type PersistedAd,
} from "@/lib/queries";
import type { LibraryOffer } from "@/lib/library/offers";

export function offerToPersisted(o: LibraryOffer): PersistedAd {
  return {
    key: o.key,
    ad_library_id: o.ad_library_id,
    ad_url: o.ad_url,
    advertiser: o.advertiser,
    headline: o.headline,
    copy: o.copy,
    cta: o.cta,
    image_url: o.image_url,
    video_url: o.video_url,
    image_storage_path: o.image_storage_path,
    video_storage_path: o.video_storage_path,
    platform: o.platform,
    country: o.country,
    niche: o.niche,
    score: o.score,
    created_at: o.created_at,
    saved_at: new Date().toISOString(),
  };
}

export function useOfferActions() {
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchFavIds()
        .then((s) => alive && setFavIds(s))
        .catch(() => {});
      fetchSavedIds()
        .then((s) => alive && setSavedIds(s))
        .catch(() => {});
    };
    load();
    const unsub = subscribeChange((scope) => {
      if (scope === "fav") fetchFavIds().then((s) => alive && setFavIds(s));
      if (scope === "saved") fetchSavedIds().then((s) => alive && setSavedIds(s));
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const toggleFavorite = useCallback(
    async (o: LibraryOffer) => {
      const next = !favIds.has(o.key);
      setFavIds((s) => {
        const n = new Set(s);
        if (next) n.add(o.key);
        else n.delete(o.key);
        return n;
      });
      try {
        await favoriteCollectedAd(offerToPersisted(o), next);
        toast.success(next ? "Adicionada aos favoritos" : "Removida dos favoritos");
      } catch (e) {
        setFavIds((s) => {
          const n = new Set(s);
          if (next) n.delete(o.key);
          else n.add(o.key);
          return n;
        });
        toast.error(e instanceof Error ? e.message : "Não foi possível favoritar");
      }
    },
    [favIds],
  );

  const toggleSaved = useCallback(async (o: LibraryOffer) => {
    setBusy(o.key);
    try {
      const isSaved = await saveCollectedAd(offerToPersisted(o));
      setSavedIds((s) => {
        const n = new Set(s);
        if (isSaved) n.add(o.key);
        else n.delete(o.key);
        return n;
      });
      toast.success(isSaved ? "Guardada em Ofertas Salvas" : "Removida de Ofertas Salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setBusy(null);
    }
  }, []);

  return {
    isFavorite: (o: LibraryOffer) => favIds.has(o.key),
    isSaved: (o: LibraryOffer) => savedIds.has(o.key),
    toggleFavorite,
    toggleSaved,
    busy,
    favCount: favIds.size,
  };
}
