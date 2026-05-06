import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, Flame, Sparkles, Globe, Megaphone, Search } from "lucide-react";
import { toggleFavorite, fetchFavorites, subscribeChange, createAnalysisForOffer } from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/favoritos")({ component: FavoritesPage });

function FavoritesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setRows(await fetchFavorites(user.id));
  };
  useEffect(() => { load(); const unsub = subscribeChange((s) => { if (s === "fav") load(); }); return unsub; }, [user]);

  const onUnfav = async (offerId: string) => {
    if (!user) return;
    await toggleFavorite(user.id, offerId, false);
    toast.success("Removido dos favoritos");
  };

  const onAnalyze = async (offerId: string) => {
    await createAnalysisForOffer(offerId);
    toast.success("Análise gerada");
    navigate({ to: "/analise-ia", search: { offer: offerId } as never });
  };

  const offers = rows.map((r) => r.mined_offers).filter(Boolean);

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
              <span className="font-semibold text-foreground">{offers.length}</span> {offers.length === 1 ? "oferta favoritada" : "ofertas favoritadas"}
            </p>
          </div>
        </div>
      </div>

      {offers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed border-border/60 bg-card/50 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sua biblioteca está vazia</h2>
            <p className="mt-1 text-sm text-muted-foreground">Comece a favoritar ofertas para construir sua biblioteca premium.</p>
          </div>
          <Button asChild className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Link to="/minerar"><Search className="mr-2 h-4 w-4" /> Minerar ofertas</Link>
          </Button>
        </Card>
      ) : (
        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {offers.map((o) => (
            <motion.div key={o.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <Card className="card-glow group relative overflow-hidden border-border/60 bg-card transition-all hover:border-primary/40">
                <Link to="/oferta/$id" params={{ id: o.id }} className="relative block aspect-[16/10] overflow-hidden bg-muted">
                  {o.image_url && (
                    <img src={o.image_url} alt={o.advertiser_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <button
                    onClick={(e) => { e.preventDefault(); onUnfav(o.id); }}
                    className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur transition-transform hover:scale-110"
                    aria-label="Remover dos favoritos"
                  >
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                  </button>
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-primary-foreground shadow-lg" style={{ background: "var(--gradient-primary)" }}>
                    <Flame className="h-3.5 w-3.5" /> {o.scale_score}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg font-bold leading-tight text-foreground line-clamp-1">{o.advertiser_name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{o.summary}</p>
                  </div>
                </Link>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
                      <Megaphone className="mr-1 h-3 w-3" /> {o.platform}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      <Globe className="mr-1 h-3 w-3" /> {o.country}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">{o.niche}</Badge>
                  </div>
                  <Button onClick={() => onAnalyze(o.id)} className="w-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    <Sparkles className="mr-2 h-4 w-4" /> Analisar com IA
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
