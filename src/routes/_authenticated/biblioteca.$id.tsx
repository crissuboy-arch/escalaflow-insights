// Página individual de uma oferta real da Biblioteca (collected_ads).
// Tudo o que aparece vem da linha coletada; indicadores sem dado na Ad
// Library simplesmente não são mostrados.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Info,
  RefreshCw,
  Share2,
  BookmarkCheck,
  Bookmark,
  CalendarClock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Flame,
  Globe2,
  Heart,
  Languages,
  Layers,
  Link2,
  Loader2,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Tag,
  Timer,
  Users,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferMedia } from "@/components/library/OfferMedia";
import { OfferRow } from "@/components/library/OfferRow";
import { ActivityChart } from "@/components/library/ActivityChart";
import { ScaleChip, offerStatus } from "@/components/library/LibraryOfferCard";
import { GenerateOfferModal } from "@/components/minerar/GenerateOfferModal";
import { TransformToProjectButton } from "@/components/TransformToProjectButton";
import { useOfferActions, offerToPersisted } from "@/lib/library/use-offer-actions";
import {
  COUNTRY_LABELS,
  LANGUAGE_LABELS,
  NICHE_LABEL,
  countryFlag,
  fetchAdvertiserOffers,
  fetchLibraryOffer,
  formatCount,
  type LibraryOffer,
} from "@/lib/library/offers";
import { rememberAdForAnalysis } from "@/lib/queries";
import { miningRepo } from "@/lib/mining/repository";
import { createProjectFromOffer } from "@/lib/project.functions";
import { copyToClipboard, openExternal } from "@/lib/external";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/biblioteca/$id")({
  component: OfferDetail,
});

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function OfferDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const actions = useOfferActions();
  const createFromOffer = useServerFn(createProjectFromOffer);
  const [offer, setOffer] = useState<LibraryOffer | null>(null);
  const [related, setRelated] = useState<LibraryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [modeling, setModeling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    fetchLibraryOffer(id)
      .then((o) => {
        if (!alive) return;
        if (!o) setNotFound(true);
        setOffer(o);
        if (o)
          fetchAdvertiserOffers(o.advertiser, o.id)
            .then((r) => alive && setRelated(r))
            .catch(() => {});
      })
      .catch((e) => {
        if (alive) {
          toast.error(e instanceof Error ? e.message : "Falha ao carregar a oferta");
          setNotFound(true);
        }
      })
      .finally(() => alive && setLoading(false));
    window.scrollTo({ top: 0 });
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !offer) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h2 className="text-2xl font-bold">Oferta não encontrada</h2>
        <p className="text-sm text-muted-foreground">Ela pode ter sido removida da biblioteca.</p>
        <Button asChild>
          <Link to="/minerar">Voltar para a Biblioteca</Link>
        </Button>
      </div>
    );
  }

  const o = offer;
  const fav = actions.isFavorite(o);
  const saved = actions.isSaved(o);
  const adLibraryUrl = o.ad_library_id
    ? `https://www.facebook.com/ads/library/?id=${encodeURIComponent(o.ad_library_id)}`
    : null;

  const onAnalyze = async () => {
    const persisted = offerToPersisted(o);
    await rememberAdForAnalysis(persisted).catch(() => {});
    try {
      await miningRepo.ingestMany(
        [
          {
            headline: o.headline || o.advertiser,
            copy: o.copy,
            platform: o.platform,
            country: o.country,
            niche: o.niche,
            score: o.score,
            adUrl: o.ad_url ?? undefined,
            adLibraryId: o.ad_library_id ?? undefined,
            analysisType: "manual",
            creativeUrl: o.image || o.video || undefined,
            creativeType: o.video ? "video" : o.image ? "image" : undefined,
            advertiser: o.advertiser,
            cta: o.cta ?? undefined,
            createdAt: o.created_at,
          },
        ],
        "extension",
      );
    } catch {
      /* a análise abre mesmo assim com o anúncio em memória */
    }
    navigate({ to: "/analise-ia", search: { ad: persisted.key } as never });
  };

  const onModel = async () => {
    setModeling(true);
    try {
      const r = await createFromOffer({
        data: {
          title: `${o.advertiser} — ${NICHE_LABEL[o.nicheGroup]}`,
          niche: o.niche,
          promise: o.headline,
          avatar: `Pessoas interessadas em ${NICHE_LABEL[o.nicheGroup]}`,
          uniqueMechanism: o.promise ?? "",
          pains: [],
          desires: [],
          source_ad_key: o.key,
          cover_url: o.image ?? null,
          advertiser: o.advertiser,
          platform: o.platform,
          country: o.country,
          headline: o.headline,
          copy: o.copy || undefined,
          cta: o.cta ?? undefined,
          imageUrl: o.image ?? null,
          videoUrl: o.video ?? null,
        },
      });
      toast.success("Estratégia modelada");
      navigate({ to: "/projetos/$id", params: { id: r.id }, search: { tab: "escala" } as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao modelar");
    } finally {
      setModeling(false);
    }
  };

  const onDownload = async () => {
    const url = o.video ?? o.image;
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${o.advertiser.replace(/[^\w-]+/g, "_").slice(0, 40)}-${o.id.slice(0, 8)}.${o.video ? "mp4" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      openExternal(url);
    }
  };

  const typeLabel: Record<string, string> = {
    anuncio: "Anúncio",
    "pagina-venda": "Página de vendas",
    vsl: "VSL",
    checkout: "Checkout",
    ecommerce: "E-commerce",
    conteudo: "Conteúdo",
  };
  const informacoes: { label: string; value: string | null }[] = [
    { label: "Tipo", value: o.offerType ? (typeLabel[o.offerType] ?? o.offerType) : null },
    { label: "Nicho", value: NICHE_LABEL[o.nicheGroup] },
    { label: "Idioma", value: o.language ? LANGUAGE_LABELS[o.language] : null },
    {
      label: "Plataforma",
      value: o.publisherPlatforms.length
        ? o.publisherPlatforms
            .map((p) => p.charAt(0) + p.slice(1).toLowerCase().replace("_", " "))
            .join(", ")
        : o.platform,
    },
    { label: "País", value: `${countryFlag(o.country)} ${COUNTRY_LABELS[o.country] ?? o.country}` },
    { label: "Ads", value: o.activeAdsCount !== null ? formatCount(o.activeAdsCount) : null },
    {
      label: "Rede",
      value: o.offer_network && o.offer_network !== "desconhecido" ? o.offer_network : null,
    },
  ];
  const status = offerStatus(o);
  const estatisticas: { label: string; value: string | null }[] = [
    { label: "Dias ativos", value: o.daysRunning !== null ? `${o.daysRunning} dias` : null },
    {
      label: "Status",
      value: status?.label ?? (o.isActive === null ? null : o.isActive ? "Ativo" : "Inativo"),
    },
    { label: "Início da veiculação", value: fmtDate(o.start_date) },
    { label: "Subiu no ScalaFlow em", value: fmtDate(o.first_seen_at ?? o.created_at) },
    { label: "Vista pela última vez", value: fmtDate(o.last_seen_at) },
    {
      label: "Seguidores da página",
      value: o.pageLikes !== null ? formatCount(o.pageLikes) : null,
    },
  ];
  const title = o.headline ? `${o.headline} - ${o.advertiser}` : o.advertiser;

  const onShare = async () => {
    const url = window.location.href;
    const ok = await copyToClipboard(url);
    toast[ok ? "success" : "error"](ok ? "Link da oferta copiado" : "Não foi possível copiar");
  };

  return (
    <div className="space-y-6" data-testid="offer-detail">
      {/* Cabeçalho: Voltar · título · Atualizar / Favoritar / Compartilhar */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() =>
            window.history.length > 1 ? window.history.back() : navigate({ to: "/minerar" })
          }
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ScaleChip offer={o} />
              <Badge variant="outline" className="rounded-full">
                <Flame className="mr-1 h-3 w-3 text-orange-500" /> Score {o.score}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h1>
            {o.promise && <p className="text-sm text-muted-foreground">Promessa: {o.promise}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              data-testid="detail-refresh"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Atualizar
            </Button>
            <Button
              variant={fav ? "default" : "outline"}
              size="sm"
              onClick={() => actions.toggleFavorite(o)}
              aria-pressed={fav}
              className={cn(fav && "bg-rose-500 text-white hover:bg-rose-600")}
              data-testid="detail-favorite"
            >
              <Heart className={cn("mr-1.5 h-4 w-4", fav && "fill-white")} />
              {fav ? "Na Minha Lista" : "Favoritar"}
            </Button>
            <Button variant="outline" size="sm" onClick={onShare} data-testid="detail-share">
              <Share2 className="mr-1.5 h-4 w-4" /> Compartilhar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.toggleSaved(o)}
              disabled={actions.busy === o.key}
              data-testid="detail-save"
            >
              {saved ? (
                <BookmarkCheck className="mr-1.5 h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="mr-1.5 h-4 w-4" />
              )}
              {saved ? "Salva" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,380px)_1fr]">
            <div className="space-y-2">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-black">
                <div className="aspect-[4/5] w-full">
                  <OfferMedia offer={o} mode="full" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {o.mediaDurable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> Mídia guardada permanentemente
                  </span>
                ) : o.image || o.video ? (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600">
                    Mídia ainda no link original (temporário)
                  </span>
                ) : null}
                {(o.image || o.video) && (
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={onDownload}
                  >
                    <Download className="h-3 w-3" /> Baixar criativo
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              {o.copy && (
                <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Copy do anúncio</h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const ok = await copyToClipboard(o.copy);
                        toast[ok ? "success" : "error"](
                          ok ? "Copy copiada" : "Não foi possível copiar",
                        );
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                  <p className="max-h-[320px] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {o.copy}
                  </p>
                  {o.cta && (
                    <p className="text-xs">
                      CTA: <span className="font-semibold">{o.cta}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
                <h2 className="text-sm font-semibold">Links importantes</h2>
                <div className="flex flex-wrap gap-2">
                  {adLibraryUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openExternal(adLibraryUrl)}
                      data-testid="open-ad-library"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Biblioteca de Anúncios
                    </Button>
                  )}
                  {o.landing_page_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openExternal(o.landing_page_url)}
                    >
                      <Globe2 className="mr-1.5 h-3.5 w-3.5" /> Landing Page
                    </Button>
                  )}
                  {o.ad_url && o.ad_url !== adLibraryUrl && (
                    <Button size="sm" variant="outline" onClick={() => openExternal(o.ad_url)}>
                      <Link2 className="mr-1.5 h-3.5 w-3.5" /> Link do anúncio
                    </Button>
                  )}
                  {!adLibraryUrl && !o.landing_page_url && !o.ad_url && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum link foi capturado nesta coleta.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4">
                <h2 className="text-sm font-semibold">Usar esta oferta</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    onClick={() => setGenerateOpen(true)}
                    className="text-white"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                  >
                    <Wand2 className="mr-1.5 h-4 w-4" /> Gerar oferta parecida
                  </Button>
                  <Button variant="secondary" onClick={onModel} disabled={modeling}>
                    {modeling ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="mr-1.5 h-4 w-4" />
                    )}
                    {modeling ? "Modelando…" : "Modelar estratégia"}
                  </Button>
                  <div className="sm:col-span-2">
                    <TransformToProjectButton adLibraryId={o.ad_library_id} adUrl={o.ad_url} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ActivityChart adId={o.id} />
        </div>

        {/* Coluna lateral: Informações · Tags · Estatísticas · IA */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-4" data-testid="detail-info">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" /> Informações
            </h2>
            <dl className="space-y-2 text-sm">
              {informacoes
                .filter((i) => i.value)
                .map((i) => (
                  <div key={i.label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{i.label}:</dt>
                    <dd className="text-right font-semibold capitalize">{i.value}</dd>
                  </div>
                ))}
            </dl>
          </div>

          {o.tags.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4" /> Tags
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {o.tags.map((t) => (
                  <Link
                    key={t}
                    to="/minerar"
                    search={{ q: t, tab: "explorar" }}
                    className="rounded-md border border-border/60 px-2 py-0.5 text-xs hover:border-primary/50 hover:text-primary"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div
            className="rounded-xl border border-border/60 bg-card p-4"
            data-testid="detail-stats"
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4" /> Estatísticas
            </h2>
            <dl className="space-y-2 text-sm">
              {estatisticas
                .filter((i) => i.value)
                .map((i) => (
                  <div key={i.label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{i.label}:</dt>
                    <dd className="text-right font-semibold">{i.value}</dd>
                  </div>
                ))}
            </dl>
          </div>

          <Button
            onClick={onAnalyze}
            className="w-full text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
            data-testid="detail-ask-ai"
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Perguntar à IA
          </Button>
        </aside>
      </div>

      {related.length > 0 && (
        <OfferRow
          title={`Mais criativos de ${o.advertiser}`}
          subtitle={`${related.length} outras ofertas deste anunciante na biblioteca`}
          offers={related}
          isFavorite={actions.isFavorite}
          onToggleFavorite={actions.toggleFavorite}
          testId="row-related"
        />
      )}

      {generateOpen && (
        <GenerateOfferModal
          ad={{
            id: o.id,
            headline: o.headline,
            copy: o.copy,
            ad_url: o.ad_url,
            niche: o.niche,
            advertiser: o.advertiser,
            platform: o.platform,
            country: o.country,
            image_url: o.image_url,
            image_storage_path: o.image_storage_path,
            score: o.score,
          }}
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
        />
      )}
    </div>
  );
}
