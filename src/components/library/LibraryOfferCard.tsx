import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Heart, Layers, Timer } from "lucide-react";
import { OfferMedia } from "@/components/library/OfferMedia";
import { NICHE_LABEL, countryFlag, formatCount, type LibraryOffer } from "@/lib/library/offers";
import { cn } from "@/lib/utils";

export function ScaleChip({ offer, className }: { offer: LibraryOffer; className?: string }) {
  if (!offer.scaleLevel || offer.scaleLevel === "cold") return null;
  const map = {
    warming: { label: "Aquecendo", cls: "bg-sky-500/90 text-white" },
    hot: { label: "Quente", cls: "bg-orange-500/95 text-white" },
    scaled: { label: "Escalada", cls: "text-white" },
  } as const;
  const info = map[offer.scaleLevel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow",
        info.cls,
        className,
      )}
      style={offer.scaleLevel === "scaled" ? { background: "var(--gradient-primary)" } : undefined}
    >
      <Flame className="h-3 w-3" />
      {info.label}
    </span>
  );
}

export function LibraryOfferCard({
  offer,
  isFavorite,
  onToggleFavorite,
  rank,
  className,
}: {
  offer: LibraryOffer;
  isFavorite: boolean;
  onToggleFavorite: (o: LibraryOffer) => void;
  rank?: number;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={cn("group relative flex shrink-0 flex-col", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid="library-card"
    >
      {rank !== undefined && (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-3 bottom-16 z-10 select-none text-[88px] font-black leading-none text-transparent sm:text-[104px]"
          style={{ WebkitTextStroke: "2px var(--primary)" }}
        >
          {rank}
        </span>
      )}
      <Link
        to="/biblioteca/$id"
        params={{ id: offer.id }}
        className={cn(
          "relative block overflow-hidden rounded-xl border border-border/60 bg-card transition duration-300",
          "hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          rank !== undefined && "ml-10",
        )}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
          <OfferMedia
            offer={offer}
            active={hover}
            className="transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
              <Flame className="h-3 w-3 text-orange-400" /> {offer.score}
            </span>
            <ScaleChip offer={offer} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-8">
            {offer.activeAdsCount !== null && offer.activeAdsCount > 1 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white"
                title="Anúncios com este criativo segundo a Biblioteca de Anúncios"
              >
                <Layers className="h-3 w-3" /> {formatCount(offer.activeAdsCount)} anúncios
              </span>
            )}
            {offer.daysRunning !== null && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur"
                title="Dias desde o início da veiculação (Ad Library)"
              >
                <Timer className="h-3 w-3" /> {offer.daysRunning}d no ar
              </span>
            )}
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              {offer.platform}
            </span>
          </div>
        </div>
        <div className="space-y-1 p-3">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{countryFlag(offer.country)}</span>
            <span className="truncate">{NICHE_LABEL[offer.nicheGroup]}</span>
          </p>
          <p className="line-clamp-1 text-sm font-semibold">{offer.advertiser}</p>
          <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-muted-foreground">
            {offer.headline || offer.copy || "Sem texto capturado"}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onToggleFavorite(offer)}
        aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={isFavorite}
        className={cn(
          "absolute right-2 top-10 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:scale-110",
          isFavorite && "bg-rose-500/90",
        )}
        data-testid="favorite-button"
      >
        <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
      </button>
    </div>
  );
}
