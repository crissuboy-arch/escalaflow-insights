import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LibraryOfferCard } from "@/components/library/LibraryOfferCard";
import type { LibraryOffer } from "@/lib/library/offers";
import { cn } from "@/lib/utils";

/** Carrossel horizontal com snap (toque/trackpad no mobile, setas no desktop). */
export function OfferRow({
  title,
  subtitle,
  icon,
  offers,
  isFavorite,
  onToggleFavorite,
  ranked,
  action,
  testId,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  offers: LibraryOffer[];
  isFavorite: (o: LibraryOffer) => boolean;
  onToggleFavorite: (o: LibraryOffer) => void;
  ranked?: boolean;
  action?: ReactNode;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, offers.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!offers.length) return null;

  return (
    <section className="space-y-3" data-testid={testId}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
            {icon}
            {title}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {offers.length}
            </span>
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollBy(-1)}
            disabled={!canPrev}
            className="hidden h-8 w-8 place-items-center rounded-full border border-border/60 bg-card transition hover:border-primary/50 disabled:opacity-30 sm:grid"
            data-testid="row-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => scrollBy(1)}
            disabled={!canNext}
            className="hidden h-8 w-8 place-items-center rounded-full border border-border/60 bg-card transition hover:border-primary/50 disabled:opacity-30 sm:grid"
            data-testid="row-next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        data-testid="row-track"
      >
        {offers.map((o, i) => (
          <LibraryOfferCard
            key={o.id}
            offer={o}
            rank={ranked ? i + 1 : undefined}
            isFavorite={isFavorite(o)}
            onToggleFavorite={onToggleFavorite}
            className={cn(
              "snap-start",
              ranked ? "w-[200px] sm:w-[260px]" : "w-[160px] sm:w-[210px]",
            )}
          />
        ))}
      </div>
    </section>
  );
}
