import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./flipbook.css";

export type FlipPage = {
  id?: string;
  title: string;
  text: string;
  image_url: string | null;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const cb = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  }, []);
  return isMobile;
}

export function FlipBook({
  title,
  pages,
  className = "",
}: {
  title?: string;
  pages: FlipPage[];
  className?: string;
}) {
  const allPages: FlipPage[] =
    pages.length === 0
      ? [{ title: title ?? "Playbook", text: "Sem páginas ainda.", image_url: null }]
      : title
        ? [{ title, text: "", image_url: null }, ...pages]
        : pages;

  const isMobile = useIsMobile();
  const [idx, setIdx] = useState(0);
  const total = allPages.length;
  const go = (n: number) => setIdx((p) => Math.max(0, Math.min(total - 1, p + n)));

  // touch swipe
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    startX.current = null;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return (
    <div className={`flex w-full flex-col items-center gap-4 ${className}`}>
      {isMobile ? (
        <div
          className="flipbook-mobile w-full max-w-[420px]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flipbook-mobile-track"
            style={{ transform: `translateX(-${idx * 100}%)` }}
          >
            {allPages.map((p, i) => (
              <div className="flipbook-mobile-slide" key={p.id ?? i}>
                <PageBody page={p} index={i} total={total} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="flipbook-stage"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {allPages.map((p, i) => {
            const flipped = i < idx;
            const z = total - i;
            // Only render the top few pages for performance
            if (i > idx + 2) return null;
            return (
              <div
                key={p.id ?? i}
                className={`flipbook-page ${flipped ? "is-flipped" : ""}`}
                style={{ zIndex: z }}
                onClick={() => (flipped ? go(-1) : go(1))}
              >
                <div className="flipbook-page-inner">
                  <PageBody page={p} index={i} total={total} />
                </div>
                <div className="flipbook-page-back" />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur disabled:opacity-30"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums">
          {idx + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={idx >= total - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur disabled:opacity-30"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PageBody({ page, index, total }: { page: FlipPage; index: number; total: number }) {
  return (
    <>
      {page.image_url && (
        <div className="w-full overflow-hidden rounded-md" style={{ maxHeight: "45%" }}>
          <img
            src={page.image_url}
            alt={page.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}
      <h3
        className="font-serif text-xl font-bold leading-tight"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {page.title}
      </h3>
      <p className="flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
        {page.text}
      </p>
      <span className="flipbook-page-num">
        {index + 1} / {total}
      </span>
    </>
  );
}