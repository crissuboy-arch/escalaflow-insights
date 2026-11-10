import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { OfferMedia } from "@/components/library/OfferMedia";
import { NICHE_LABEL, formatCount, type LibraryOffer } from "@/lib/library/offers";
import { cn } from "@/lib/utils";

/** Selo de estado, só a partir de sinais reais (nível de escala do coletor
 *  e tempo no ar da Ad Library). Sem sinal suficiente, não há selo. */
export function offerStatus(
  o: LibraryOffer,
): { label: string; tone: "hot" | "warm" | "steady" } | null {
  if (o.scaleLevel === "scaled" || o.scaleLevel === "hot")
    return { label: "Escalando", tone: "hot" };
  if (o.scaleLevel === "warming") return { label: "Aquecendo", tone: "warm" };
  if (o.daysRunning !== null && o.daysRunning >= 30) return { label: "Estável", tone: "steady" };
  return null;
}

export function StatusBadge({ offer, className }: { offer: LibraryOffer; className?: string }) {
  const s = offerStatus(offer);
  if (!s) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur",
        className,
      )}
      data-testid="status-badge"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          s.tone === "hot" && "bg-orange-500",
          s.tone === "warm" && "bg-sky-400",
          s.tone === "steady" && "bg-zinc-300",
        )}
      />
      {s.label}
    </span>
  );
}

/** Mantido para a página de detalhe. */
export const ScaleChip = StatusBadge;

function FavButton({
  offer,
  isFavorite,
  onToggleFavorite,
  className,
}: {
  offer: LibraryOffer;
  isFavorite: boolean;
  onToggleFavorite: (o: LibraryOffer) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFavorite(offer);
      }}
      aria-label={isFavorite ? "Remover da Minha Lista" : "Adicionar à Minha Lista"}
      aria-pressed={isFavorite}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:scale-110",
        isFavorite && "bg-rose-500/90",
        className,
      )}
      data-testid="favorite-button"
    >
      <Heart className={cn("h-4 w-4", isFavorite && "fill-white")} />
    </button>
  );
}

/**
 * Cartão de prateleira (Início): criativo com o título por cima, selo de
 * estado no topo e, por baixo, "N ads · Nicho" — como numa biblioteca de
 * swipes. Variante "grid" (Explorar): título, data e tags por baixo.
 */
export function LibraryOfferCard({
  offer,
  isFavorite,
  onToggleFavorite,
  rank,
  variant = "shelf",
  className,
}: {
  offer: LibraryOffer;
  isFavorite: boolean;
  onToggleFavorite: (o: LibraryOffer) => void;
  rank?: number;
  variant?: "shelf" | "grid";
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const title = offer.headline ? `${offer.headline} - ${offer.advertiser}` : offer.advertiser;

  if (variant === "grid") {
    return (
      <Link
        to="/biblioteca/$id"
        params={{ id: offer.id }}
        className={cn(
          "group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]",
          className,
        )}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        data-testid="library-card"
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
          <OfferMedia offer={offer} active={hover} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <StatusBadge offer={offer} />
          </div>
          <FavButton
            offer={offer}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            className="absolute right-2 top-2"
          />
          {offer.activeAdsCount !== null && (
            <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
              {formatCount(offer.activeAdsCount)}{" "}
              <span className="font-medium opacity-80">ADS</span>
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {new Date(offer.first_seen_at ?? offer.created_at).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-auto flex flex-wrap gap-1">
            <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px]">
              {NICHE_LABEL[offer.nicheGroup]}
            </span>
            <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px]">
              {offer.platform}
            </span>
            {offer.tags.slice(0, 1).map((t) => (
              <span
                key={t}
                className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Link>
    );
  }

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
          className="pointer-events-none absolute -left-1 bottom-6 z-10 select-none text-[96px] font-black leading-none text-transparent sm:text-[120px]"
          style={{
            WebkitTextStroke: "2px color-mix(in oklab, var(--muted-foreground) 60%, transparent)",
          }}
        >
          {rank}
        </span>
      )}
      <Link
        to="/biblioteca/$id"
        params={{ id: offer.id }}
        className={cn("block focus-visible:outline-none", rank !== undefined && "ml-12 sm:ml-16")}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-muted transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-[var(--shadow-elegant)]">
          <OfferMedia
            offer={offer}
            active={hover}
            className="transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute left-2 top-2">
            <StatusBadge offer={offer} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-sm font-bold leading-snug text-white">{title}</p>
          </div>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {offer.activeAdsCount !== null && (
            <>
              <span className="font-semibold text-foreground">
                {formatCount(offer.activeAdsCount)}
              </span>
              <span>ads</span>
              <span>·</span>
            </>
          )}
          <span className="truncate">{NICHE_LABEL[offer.nicheGroup]}</span>
        </p>
      </Link>
      <FavButton
        offer={offer}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        className={cn(
          "absolute right-2 top-2 z-10 transition",
          !isFavorite && "opacity-0 group-hover:opacity-100 max-sm:opacity-100",
        )}
      />
    </div>
  );
}
