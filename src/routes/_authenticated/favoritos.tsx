import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, Flame, Sparkles, Globe, Megaphone, Search, Image as ImageIcon, ExternalLink } from "lucide-react";
import { fetchFavoriteAds, favoriteCollectedAd, rememberAdForAnalysis, subscribeChange, type PersistedAd } from "@/lib/queries";
import { toast } from "sonner";
import { openExternal } from "@/lib/external";

export const Route = createFileRoute("/_authenticated/favoritos")({ component: FavoritesPage });

function FavoritesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ads, setAds] = useState<PersistedAd[]>([]);

  const load = async () => setAds(await fetchFavoriteAds());
  useEffect(() => {
    load();
    const unsub = subscribeChange((s) => { if (s === "fav") load(); });
    return unsub;
  }, []);

  const onUnfav = async (ad: PersistedAd) => {
    await favoriteCollectedAd(ad, false);
    toast.success("Removido dos favoritos");
  };
  const onAnalyze = async (ad: PersistedAd) => {
    await rememberAdForAnalysis(ad);
    navigate({ to: "/analise-ia", search: { ad: ad.key } as never });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
            <Heart className="h-6 w-6 fill-white text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("favorites.title")}</h1>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{ads.length}</span> {ads.length === 1 ? "anúncio favoritado" : "anúncios favoritados"}
            </p>
          </div>
        </div>
      </div>

      {ads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed border-border/60 bg-card/50 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sua biblioteca está vazia</h2>
            <p className="mt-1 text-sm text-muted-foreground">Comece a favoritar anúncios reais para construir sua biblioteca.</p>
          </div>
          <Button asChild className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Link to="/minerar"><Search className="mr-2 h-4 w-4" /> Minerar anúncios</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((a) => (
            <motion.div key={a.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="group relative overflow-hidden border-border/60 bg-card transition-all hover:border-primary/40">
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {a.video_url ? (
                    <video src={a.video_url} className="h-full w-full object-cover" muted loop playsInline controls />
                  ) : a.image_url ? (
                    <img src={a.image_url} alt={a.headline} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                  <button
                    onClick={() => onUnfav(a)}
                    className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur transition hover:scale-110"
                    aria-label="Remover dos favoritos"
                  >
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </button>
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    <Flame className="h-3 w-3" /> {a.score}
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 font-semibold">{a.advertiser}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{a.headline}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{a.copy || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
                      <Megaphone className="mr-1 h-3 w-3" /> {a.platform}
                    </Badge>
                    <Badge variant="outline" className="rounded-full"><Globe className="mr-1 h-3 w-3" /> {a.country}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => onAnalyze(a)} className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                      <Sparkles className="mr-1 h-4 w-4" /> Analisar IA
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openExternal(
                        a.ad_url,
                        a.ad_library_id ? `https://www.facebook.com/ads/library/?id=${a.ad_library_id}` : null,
                      )}
                    >
                      <ExternalLink className="mr-1 h-4 w-4" /> Abrir
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
