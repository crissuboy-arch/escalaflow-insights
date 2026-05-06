import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bookmark, BookmarkCheck, Flame, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import { createAnalysisForOffer, toggleFavorite } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

interface Offer {
  id: string; advertiser_name: string; image_url: string | null;
  summary: string | null; scale_score: number; platform: string; niche: string;
}

export function OfferCard({ offer, saved, favorited, onToggleSave }: { offer: Offer; saved?: boolean; favorited?: boolean; onToggleSave?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const onAnalyze = async () => {
    await createAnalysisForOffer(offer.id);
    toast.success("Análise gerada");
    navigate({ to: "/analise-ia", search: { offer: offer.id } as never });
  };
  const onFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await toggleFavorite(user.id, offer.id, !favorited);
    toast.success(!favorited ? "Adicionado aos favoritos" : "Removido dos favoritos");
  };
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="card-glow overflow-hidden border-border/60 bg-card transition-shadow hover:shadow-[var(--shadow-elegant)]">
        <Link to="/oferta/$id" params={{ id: offer.id }} className="relative block aspect-video overflow-hidden bg-muted">
          {offer.image_url && <img src={offer.image_url} alt={offer.advertiser_name} className="h-full w-full object-cover" loading="lazy" />}
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-semibold backdrop-blur">
            <Flame className="h-3 w-3 text-primary" /> {offer.scale_score}
          </div>
          <button
            onClick={onFav}
            className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background"
            aria-label="Favoritar"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={favorited ? "on" : "off"}
                initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Star className={`h-4 w-4 ${favorited ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" : "text-muted-foreground"}`} />
              </motion.span>
            </AnimatePresence>
          </button>
        </Link>
        <CardContent className="space-y-3 p-4">
          <div>
            <h3 className="font-semibold line-clamp-1">{offer.advertiser_name}</h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{offer.summary}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{offer.platform}</Badge>
            <Badge variant="outline" className="text-xs">{offer.niche}</Badge>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="default" className="flex-1" onClick={onAnalyze}>
              <Sparkles className="mr-1 h-3.5 w-3.5" /> {t("mine.analyze")}
            </Button>
            <Button size="sm" variant="outline" onClick={onToggleSave}>
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}