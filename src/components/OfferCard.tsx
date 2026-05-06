import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bookmark, BookmarkCheck, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

interface Offer {
  id: string; advertiser_name: string; image_url: string | null;
  summary: string | null; scale_score: number; platform: string; niche: string;
}

export function OfferCard({ offer, saved, onToggleSave }: { offer: Offer; saved?: boolean; onToggleSave?: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden border-border/60 bg-card transition-shadow hover:shadow-[var(--shadow-elegant)]">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {offer.image_url && <img src={offer.image_url} alt={offer.advertiser_name} className="h-full w-full object-cover" loading="lazy" />}
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-semibold backdrop-blur">
            <Flame className="h-3 w-3 text-primary" /> {offer.scale_score}
          </div>
        </div>
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
            <Button asChild size="sm" variant="default" className="flex-1">
              <Link to="/oferta/$id" params={{ id: offer.id }}>
                <Sparkles className="mr-1 h-3.5 w-3.5" /> {t("mine.analyze")}
              </Link>
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