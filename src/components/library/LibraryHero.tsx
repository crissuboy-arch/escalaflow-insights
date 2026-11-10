import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Heart, Layers, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferMedia } from "@/components/library/OfferMedia";
import { ScaleChip } from "@/components/library/LibraryOfferCard";
import { NICHE_LABEL, countryFlag, formatCount, type LibraryOffer } from "@/lib/library/offers";
import { cn } from "@/lib/utils";

/** Banner principal: as ofertas mais fortes (com mídia real) em rotação. */
export function LibraryHero({
  offers,
  isFavorite,
  onToggleFavorite,
}: {
  offers: LibraryOffer[];
  isFavorite: (o: LibraryOffer) => boolean;
  onToggleFavorite: (o: LibraryOffer) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || offers.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % offers.length), 7000);
    return () => clearInterval(t);
  }, [paused, offers.length]);
  useEffect(() => {
    if (idx >= offers.length) setIdx(0);
  }, [idx, offers.length]);

  const o = offers[idx];
  if (!o) return null;
  const fav = isFavorite(o);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="library-hero"
    >
      <div className="absolute inset-0 opacity-40 blur-2xl">
        <OfferMedia key={`bg-${o.id}`} offer={{ ...o, video: null }} className="scale-110" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
      <div className="relative grid gap-5 p-5 sm:p-7 md:grid-cols-[1fr_auto] md:items-center">
        <div className="order-2 min-w-0 space-y-3 md:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Oferta em destaque
            </span>
            <ScaleChip offer={o} />
            <span className="text-xs text-muted-foreground">
              {countryFlag(o.country)} {o.country} · {NICHE_LABEL[o.nicheGroup]} · {o.platform}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">{o.advertiser}</p>
            <h2 className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {o.headline || o.advertiser}
            </h2>
            {o.copy && (
              <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-muted-foreground">{o.copy}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1 font-semibold">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> Score {o.score}
            </span>
            {o.activeAdsCount !== null && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Layers className="h-3.5 w-3.5" /> {formatCount(o.activeAdsCount)} anúncios com este
                criativo
              </span>
            )}
            {o.daysRunning !== null && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1 font-semibold">
                <Timer className="h-3.5 w-3.5" /> {o.daysRunning} dias no ar
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              asChild
              className="text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Link to="/biblioteca/$id" params={{ id: o.id }} data-testid="hero-open">
                Ver oferta completa <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => onToggleFavorite(o)} aria-pressed={fav}>
              <Heart className={cn("mr-1.5 h-4 w-4", fav && "fill-rose-500 text-rose-500")} />
              {fav ? "Favoritada" : "Favoritar"}
            </Button>
          </div>
          {offers.length > 1 && (
            <div className="flex gap-1.5 pt-2" role="tablist" aria-label="Ofertas em destaque">
              {offers.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={`Destaque ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === idx
                      ? "w-8 bg-primary"
                      : "w-3 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                  )}
                />
              ))}
            </div>
          )}
        </div>
        <Link
          to="/biblioteca/$id"
          params={{ id: o.id }}
          className="order-1 mx-auto block aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-xl border border-border/60 bg-muted shadow-2xl md:order-2 md:w-[260px]"
        >
          <OfferMedia key={o.id} offer={o} mode="hero" active />
        </Link>
      </div>
    </section>
  );
}
