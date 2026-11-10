// Aba "Criativos": cada anúncio, um a um. Toca o vídeo ali mesmo e mostra a
// copy / transcrição (quando já foi transcrita). Filtros por estado real,
// formato, nicho e idioma; ordenação por anúncios ativos.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, Megaphone, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OfferMedia } from "@/components/library/OfferMedia";
import { StatusBadge } from "@/components/library/LibraryOfferCard";
import { supabase } from "@/integrations/supabase/client";
import {
  LANGUAGE_LABELS,
  NICHES,
  NICHE_LABEL,
  STATUS_EXPLAIN,
  formatCount,
  hasMedia,
  realStatus,
  type LanguageCode,
  type LibraryOffer,
  type RealStatus,
} from "@/lib/library/offers";
import { cn } from "@/lib/utils";

const PAGE = 24;

function Chip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function CreativeCard({
  offer,
  onOpen,
}: {
  offer: LibraryOffer;
  onOpen: (o: LibraryOffer) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(offer)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/60 bg-muted text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]"
      data-testid="creative-card"
    >
      <OfferMedia offer={offer} active={hover} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
        <StatusBadge offer={offer} />
        <span className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
          {offer.video ? (
            <Play className="h-3.5 w-3.5 fill-white" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-12">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-white">
          {offer.headline || offer.advertiser}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-white/80">
          {offer.activeAdsCount !== null && (
            <>
              <Megaphone className="h-3 w-3" />
              <b className="text-white">{formatCount(offer.activeAdsCount)}</b>
              <span>·</span>
            </>
          )}
          <span className="truncate">{NICHE_LABEL[offer.nicheGroup]}</span>
          {offer.language && (
            <span className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
              {offer.language}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CreativeDialog({ offer, onClose }: { offer: LibraryOffer | null; onClose: () => void }) {
  const [transcript, setTranscript] = useState<{
    original: string | null;
    pt: string | null;
  } | null>(null);
  useEffect(() => {
    setTranscript(null);
    if (!offer) return;
    let alive = true;
    supabase
      .from("collected_ads")
      .select("transcript_original, transcript_translated_pt")
      .eq("id", offer.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const d = data as {
          transcript_original: string | null;
          transcript_translated_pt: string | null;
        } | null;
        setTranscript({
          original: d?.transcript_original ?? null,
          pt: d?.transcript_translated_pt ?? null,
        });
      });
    return () => {
      alive = false;
    };
  }, [offer]);

  return (
    <Dialog open={!!offer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
        {offer && (
          <div className="grid md:grid-cols-[minmax(0,360px)_1fr]">
            <div className="aspect-[3/4] w-full bg-black md:aspect-auto md:min-h-[480px]">
              <OfferMedia offer={offer} mode="full" />
            </div>
            <div className="space-y-4 p-5">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge offer={offer} />
                  {offer.activeAdsCount !== null && (
                    <span className="text-xs text-muted-foreground">
                      <b className="text-foreground">{formatCount(offer.activeAdsCount)}</b>{" "}
                      anúncios com este criativo
                    </span>
                  )}
                  {offer.daysRunning !== null && (
                    <span className="text-xs text-muted-foreground">
                      · {offer.daysRunning} dias no ar
                    </span>
                  )}
                </div>
                <DialogTitle className="text-left text-lg leading-snug">
                  {offer.headline || offer.advertiser}
                </DialogTitle>
                <p className="text-left text-sm text-primary">{offer.advertiser}</p>
              </DialogHeader>

              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Transcrição
                </h3>
                {transcript === null ? (
                  <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
                ) : transcript.pt || transcript.original ? (
                  <p className="max-h-48 overflow-y-auto whitespace-pre-line rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
                    {transcript.pt || transcript.original}
                  </p>
                ) : (
                  <p className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                    Este criativo ainda não foi transcrito.
                  </p>
                )}
              </div>

              {offer.copy && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Copy do anúncio
                  </h3>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {offer.copy}
                  </p>
                </div>
              )}

              <Button
                asChild
                className="w-full text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Link
                  to="/biblioteca/$id"
                  params={{ id: offer.id }}
                  data-testid="creative-open-offer"
                >
                  Abrir a oferta completa
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreativesGrid({ offers }: { offers: LibraryOffer[] }) {
  const [status, setStatus] = useState<RealStatus | "all">("all");
  const [format, setFormat] = useState<"all" | "video" | "image">("all");
  const [niche, setNiche] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [sort, setSort] = useState<"ads" | "recent" | "days">("ads");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<LibraryOffer | null>(null);

  const creatives = useMemo(() => offers.filter(hasMedia), [offers]);
  const languages = useMemo(() => {
    const s = new Set<LanguageCode>();
    creatives.forEach((o) => o.language && s.add(o.language));
    return [...s];
  }, [creatives]);

  const list = useMemo(() => {
    const out = creatives.filter((o) => {
      if (status !== "all" && realStatus(o) !== status) return false;
      if (format === "video" && !o.video) return false;
      if (format === "image" && (o.video || !o.image)) return false;
      if (niche !== "all" && o.nicheGroup !== niche) return false;
      if (language !== "all" && o.language !== language) return false;
      return true;
    });
    const t = (o: LibraryOffer) => new Date(o.first_seen_at ?? o.created_at).getTime();
    out.sort((a, b) =>
      sort === "ads"
        ? (b.activeAdsCount ?? -1) - (a.activeAdsCount ?? -1) || t(b) - t(a)
        : sort === "days"
          ? (b.daysRunning ?? -1) - (a.daysRunning ?? -1)
          : t(b) - t(a),
    );
    return out;
  }, [creatives, status, format, niche, language, sort]);

  useEffect(() => setLimit(PAGE), [status, format, niche, language, sort]);
  const videos = creatives.filter((o) => o.video).length;

  return (
    <section className="space-y-4" data-testid="creatives-grid">
      <div>
        <p className="text-sm text-muted-foreground">
          Os anúncios das ofertas, um a um. Clique para assistir e ler a transcrição.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {creatives.length} criativos ({videos} vídeos)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1" title={STATUS_EXPLAIN}>
          {(
            [
              ["all", "Todos"],
              ["escalando", "Escalando"],
              ["teste", "Em teste"],
              ["estavel", "Estável"],
            ] as const
          ).map(([v, l]) => (
            <Chip
              key={v}
              active={status === v}
              onClick={() => setStatus(v)}
              testId={`creative-status-${v}`}
            >
              {l}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "Todos os formatos"],
              ["video", "Vídeo"],
              ["image", "Imagem"],
            ] as const
          ).map(([v, l]) => (
            <Chip
              key={v}
              active={format === v}
              onClick={() => setFormat(v)}
              testId={`creative-format-${v}`}
            >
              {l}
            </Chip>
          ))}
        </div>
        <Select value={niche} onValueChange={setNiche}>
          <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Nicho">
            <SelectValue placeholder="Nicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os nichos</SelectItem>
            {NICHES.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.emoji} {n.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Idioma">
            <SelectValue placeholder="Idioma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os idiomas</SelectItem>
            {languages.map((l) => (
              <SelectItem key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ads">Mais anúncios ativos</SelectItem>
            <SelectItem value="days">Mais dias no ar</SelectItem>
            <SelectItem value="recent">Mais recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 py-14 text-center text-sm text-muted-foreground">
          Nenhum criativo com estes filtros.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.slice(0, limit).map((o) => (
              <CreativeCard key={o.id} offer={o} onOpen={setOpen} />
            ))}
          </div>
          {list.length > limit && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setLimit((n) => n + PAGE)}
                data-testid="creatives-more"
              >
                Carregar mais ({list.length - limit})
              </Button>
            </div>
          )}
        </>
      )}

      <CreativeDialog offer={open} onClose={() => setOpen(null)} />
    </section>
  );
}
