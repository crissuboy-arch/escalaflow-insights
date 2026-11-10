import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferMedia } from "@/components/library/OfferMedia";
import { offerStatus } from "@/components/library/LibraryOfferCard";
import { NICHE_LABEL, formatCount, type LibraryOffer } from "@/lib/library/offers";
import { cn } from "@/lib/utils";

/** "Destaque da semana": banner largo com o criativo de fundo, setas e pontos. */
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
  const n = offers.length;
  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 7000);
    return () => clearInterval(t);
  }, [paused, n]);
  useEffect(() => {
    if (idx >= n) setIdx(0);
  }, [idx, n]);

  const o = offers[idx];
  if (!o) return null;
  const fav = isFavorite(o);
  const status = offerStatus(o);
  const go = (d: 1 | -1) => setIdx((i) => (i + d + n) % n);

  return (
    <section
      className="relative h-[340px] overflow-hidden rounded-2xl border border-border/60 bg-black sm:h-[380px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="library-hero"
    >
      <div className="absolute inset-y-0 right-0 w-full sm:w-[62%]">
        <OfferMedia key={o.id} offer={o} mode="hero" active />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent sm:hidden" />

      <div className="relative flex h-full flex-col justify-end gap-3 p-5 pb-10 sm:max-w-[60%] sm:p-10 sm:pb-12">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          <span className="h-px w-6 bg-primary" /> Destaque da semana
        </p>
        <Link to="/biblioteca/$id" params={{ id: o.id }} className="block">
          <h2 className="line-clamp-2 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {o.headline ? `${o.headline} - ${o.advertiser}` : o.advertiser}
          </h2>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/75">
          {status && (
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> {status.label}
            </span>
          )}
          {o.activeAdsCount !== null && (
            <span>
              <b className="text-white">{formatCount(o.activeAdsCount)}</b> anúncios ativos
            </span>
          )}
          <span>
            {NICHE_LABEL[o.nicheGroup]}
            {o.language ? ` · ${o.language.toUpperCase()}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            asChild
            className="text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Link to="/biblioteca/$id" params={{ id: o.id }} data-testid="hero-open">
              Abrir a oferta
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => onToggleFavorite(o)}
            aria-pressed={fav}
            className="border-white/30 bg-black/30 text-white hover:bg-white/10 hover:text-white"
          >
            <Heart className={cn("mr-1.5 h-4 w-4", fav && "fill-rose-500 text-rose-500")} />
            Minha Lista
          </Button>
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Destaque anterior"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
            data-testid="hero-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Próximo destaque"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
            data-testid="hero-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist">
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
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
