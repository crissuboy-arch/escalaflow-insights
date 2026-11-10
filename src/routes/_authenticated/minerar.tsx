// Minerar Ofertas → Biblioteca de Ofertas.
//
// Experiência de biblioteca visual (banner em destaque, carrosséis, Top 10
// por nicho, novas da semana, prateleiras por nicho) sobre as ofertas REAIS
// já coletadas em collected_ads. Abre com ofertas imediatamente — não é
// preciso iniciar uma pesquisa. A coleta nova (Apify) continua disponível
// pelo botão "Minerar novas" e pela Coleta avançada (página antiga).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  CloudUpload,
  Flame,
  Heart,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LibraryHero } from "@/components/library/LibraryHero";
import { OfferRow } from "@/components/library/OfferRow";
import { LibraryOfferCard } from "@/components/library/LibraryOfferCard";
import { authedFetch } from "@/lib/auth/authed-fetch";
import { supabase } from "@/integrations/supabase/client";
import { useOfferActions } from "@/lib/library/use-offer-actions";
import {
  COUNTRY_LABELS,
  EMPTY_FILTERS,
  LANGUAGE_LABELS,
  NICHES,
  NICHE_LABEL,
  applyFilters,
  countryFlag,
  fetchLibraryOffers,
  hasMedia,
  isFiltering,
  isNewThisWeek,
  isScaling,
  scaleRank,
  type LanguageCode,
  type LibraryFilters,
  type LibraryOffer,
  type NicheId,
} from "@/lib/library/offers";
import { cn } from "@/lib/utils";

const librarySearch = z.object({
  q: z.string().optional().catch(undefined),
  // compatibilidade com links antigos (?keyword=)
  keyword: z.string().optional().catch(undefined),
  country: z.string().optional().catch(undefined),
  language: z.string().optional().catch(undefined),
  platform: z.string().optional().catch(undefined),
  niche: z.string().optional().catch(undefined),
  media: z.coerce.boolean().optional().catch(undefined),
  /** lista completa (inclui ofertas sem criativo) em vez das prateleiras */
  all: z.coerce.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/minerar")({
  validateSearch: librarySearch,
  component: OfferLibraryPage,
});

const PLATFORMS = ["Facebook", "Instagram", "Messenger", "Audience_network", "TikTok", "YouTube"];
const GRID_PAGE = 24;
const MEDIA_SYNC_MAX_ROUNDS = 12;

function OfferLibraryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const actions = useOfferActions();

  const filters: LibraryFilters = {
    q: search.q ?? search.keyword ?? "",
    country: search.country ?? "all",
    language: search.language ?? "all",
    platform: search.platform ?? "all",
    niche: search.niche ?? "all",
    onlyMedia: search.media ?? false,
  };
  const setFilters = (patch: Partial<LibraryFilters>) => {
    const next = { ...filters, ...patch };
    navigate({
      to: "/minerar",
      search: {
        q: next.q || undefined,
        country: next.country !== "all" ? next.country : undefined,
        language: next.language !== "all" ? next.language : undefined,
        platform: next.platform !== "all" ? next.platform : undefined,
        niche: next.niche !== "all" ? next.niche : undefined,
        media: next.onlyMedia || undefined,
        all: search.all || undefined,
      },
      replace: true,
    });
  };

  const [offers, setOffers] = useState<LibraryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [gridLimit, setGridLimit] = useState(GRID_PAGE);
  const [top10Niche, setTop10Niche] = useState<NicheId | "all">("all");
  const [mineOpen, setMineOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await fetchLibraryOffers();
      setOffers(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar a biblioteca");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Novas ofertas (coleta, extensão) aparecem sem refresh.
    let t: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase
      .channel("collected_ads_biblioteca")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "collected_ads" }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => load(true), 1500);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [load]);

  // Debounce da pesquisa → URL
  useEffect(() => {
    if (queryDraft === filters.q) return;
    const t = setTimeout(() => setFilters({ q: queryDraft }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryDraft]);
  useEffect(() => setGridLimit(GRID_PAGE), [search]);

  // ── Guardar mídia pendente no Supabase Storage em segundo plano ──
  const media = useMediaSync(offers, () => load(true));

  const filtering = isFiltering(filters) || Boolean(search.all);
  const filtered = useMemo(() => applyFilters(offers, filters), [offers, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(() => {
    const withMedia = offers.filter(hasMedia);
    const byStrength = [...withMedia].sort((a, b) => scaleRank(b) - scaleRank(a));
    const hero = byStrength.slice(0, 5);
    const scaling = byStrength.filter(isScaling).slice(0, 20);
    const fresh = withMedia
      .filter(isNewThisWeek)
      .sort(
        (a, b) =>
          new Date(b.first_seen_at ?? b.created_at).getTime() -
          new Date(a.first_seen_at ?? a.created_at).getTime(),
      )
      .slice(0, 24);
    const nicheCounts = new Map<NicheId, number>();
    for (const o of withMedia)
      nicheCounts.set(o.nicheGroup, (nicheCounts.get(o.nicheGroup) ?? 0) + 1);
    const nicheShelves = [...nicheCounts.entries()]
      .filter(([id, n]) => id !== "outros" && n >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ({
        id,
        offers: byStrength.filter((o) => o.nicheGroup === id).slice(0, 20),
      }));
    return { hero, scaling, fresh, nicheShelves, nicheCounts, withMediaCount: withMedia.length };
  }, [offers]);

  const top10 = useMemo(() => {
    const pool = offers
      .filter(hasMedia)
      .filter((o) => top10Niche === "all" || o.nicheGroup === top10Niche);
    return [...pool].sort((a, b) => scaleRank(b) - scaleRank(a)).slice(0, 10);
  }, [offers, top10Niche]);

  const countries = useMemo(() => {
    const m = new Map<string, number>();
    offers.forEach(
      (o) => o.country && o.country !== "—" && m.set(o.country, (m.get(o.country) ?? 0) + 1),
    );
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [offers]);
  const languages = useMemo(() => {
    const m = new Map<LanguageCode, number>();
    offers.forEach((o) => o.language && m.set(o.language, (m.get(o.language) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [offers]);
  const platforms = useMemo(() => {
    const m = new Map<string, number>();
    offers.forEach((o) => {
      const all = new Set([
        o.platform,
        ...o.publisherPlatforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()),
      ]);
      all.forEach((p) => m.set(p, (m.get(p) ?? 0) + 1));
    });
    return PLATFORMS.filter((p) => m.has(p)).map((p) => [p, m.get(p)!] as const);
  }, [offers]);

  const stats = useMemo(
    () => ({
      total: offers.length,
      durable: offers.filter((o) => o.mediaDurable).length,
      advertisers: new Set(offers.map((o) => o.advertiser)).size,
      fresh: offers.filter(isNewThisWeek).length,
    }),
    [offers],
  );

  const activeFilterCount =
    (filters.country !== "all" ? 1 : 0) +
    (filters.language !== "all" ? 1 : 0) +
    (filters.platform !== "all" ? 1 : 0) +
    (filters.onlyMedia ? 1 : 0);

  return (
    <div className="space-y-6" data-testid="offer-library">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Biblioteca de Ofertas</h1>
          <p className="text-sm text-muted-foreground">
            Ofertas reais coletadas da Biblioteca de Anúncios, organizadas por escala e nicho.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/minerar-avancado">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Coleta avançada
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => setMineOpen(true)}
            className="text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
            data-testid="open-mine-dialog"
          >
            <Radar className="mr-1.5 h-4 w-4" /> Minerar novas
          </Button>
        </div>
      </div>

      {/* Indicadores reais */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="library-stats">
        {[
          { label: "Ofertas na biblioteca", value: stats.total },
          { label: "Com mídia guardada", value: stats.durable },
          { label: "Anunciantes", value: stats.advertisers },
          { label: "Novas nesta semana", value: stats.fresh },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold tabular-nums">{loading ? "…" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Pesquisa + filtros */}
      <div className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-border/40 bg-background/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              placeholder='Pesquisar anunciante, promessa, copy, palavra-chave… (use "aspas" para frase exata)'
              className="h-10 pl-9 pr-9"
              data-testid="library-search"
            />
            {queryDraft && (
              <button
                type="button"
                aria-label="Limpar pesquisa"
                onClick={() => {
                  setQueryDraft("");
                  setFilters({ q: "" });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            className="h-10 md:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="ml-1 text-xs font-bold">{activeFilterCount}</span>
            )}
          </Button>
        </div>
        <div
          className={cn(
            "grid gap-2 sm:grid-cols-2 md:grid md:grid-cols-[repeat(4,minmax(0,1fr))_auto]",
            !filtersOpen && "hidden md:grid",
          )}
        >
          <FilterSelect
            label="País"
            value={filters.country}
            onChange={(v) => setFilters({ country: v })}
            options={countries.map(([c, n]) => ({
              value: c,
              label: `${countryFlag(c)} ${COUNTRY_LABELS[c] ?? c} (${n})`,
            }))}
            testId="filter-country"
          />
          <FilterSelect
            label="Idioma"
            value={filters.language}
            onChange={(v) => setFilters({ language: v })}
            options={languages.map(([l, n]) => ({
              value: l,
              label: `${LANGUAGE_LABELS[l]} (${n})`,
            }))}
            testId="filter-language"
          />
          <FilterSelect
            label="Plataforma"
            value={filters.platform}
            onChange={(v) => setFilters({ platform: v })}
            options={platforms.map(([p, n]) => ({
              value: p,
              label: `${p.replace("_", " ")} (${n})`,
            }))}
            testId="filter-platform"
          />
          <FilterSelect
            label="Nicho"
            value={filters.niche}
            onChange={(v) => setFilters({ niche: v })}
            options={NICHES.map((n) => ({
              value: n.id,
              label: `${n.emoji} ${n.label} (${sections.nicheCounts.get(n.id) ?? 0})`,
            }))}
            testId="filter-niche"
          />
          <label className="flex h-9 items-center gap-2 rounded-md border border-border/60 px-3 text-xs">
            <Switch
              checked={filters.onlyMedia}
              onCheckedChange={(v) => setFilters({ onlyMedia: v })}
              data-testid="filter-media"
            />
            Só com mídia
          </label>
        </div>
        {/* Chips de nicho */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <NicheChip active={filters.niche === "all"} onClick={() => setFilters({ niche: "all" })}>
            ✨ Todos
          </NicheChip>
          {NICHES.filter((n) => (sections.nicheCounts.get(n.id) ?? 0) > 0).map((n) => (
            <NicheChip
              key={n.id}
              active={filters.niche === n.id}
              onClick={() => setFilters({ niche: filters.niche === n.id ? "all" : n.id })}
            >
              {n.emoji} {n.label}
            </NicheChip>
          ))}
        </div>
      </div>

      <MediaSyncBanner state={media} />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span>Não foi possível carregar a biblioteca: {error}</span>
          <Button size="sm" variant="outline" onClick={() => load()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar de novo
          </Button>
        </div>
      )}

      {loading ? (
        <LibrarySkeleton />
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <Radar className="h-10 w-10 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            A biblioteca ainda não tem ofertas coletadas. Faça a primeira mineração para começar.
          </p>
          <Button onClick={() => setMineOpen(true)}>Minerar ofertas</Button>
        </div>
      ) : filtering ? (
        <section className="space-y-4" data-testid="library-results">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> ofertas
              encontradas
              {filters.niche !== "all" && <> em {NICHE_LABEL[filters.niche as NicheId]}</>}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQueryDraft("");
                navigate({ to: "/minerar", search: {}, replace: true });
              }}
            >
              Limpar filtros
            </Button>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma oferta da biblioteca corresponde a estes filtros.
              </p>
              {filters.q && (
                <Button size="sm" onClick={() => setMineOpen(true)}>
                  <Radar className="mr-1.5 h-4 w-4" /> Minerar “{filters.q}” na Biblioteca de
                  Anúncios
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.slice(0, gridLimit).map((o) => (
                  <LibraryOfferCard
                    key={o.id}
                    offer={o}
                    isFavorite={actions.isFavorite(o)}
                    onToggleFavorite={actions.toggleFavorite}
                  />
                ))}
              </div>
              {filtered.length > gridLimit && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setGridLimit((n) => n + GRID_PAGE)}
                    data-testid="load-more"
                  >
                    Carregar mais ({filtered.length - gridLimit} restantes)
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <div className="space-y-8">
          <LibraryHero
            offers={sections.hero}
            isFavorite={actions.isFavorite}
            onToggleFavorite={actions.toggleFavorite}
          />

          <OfferRow
            testId="row-scaling"
            title="Escalando agora"
            subtitle="Score ≥ 70, nível quente/escalada ou ≥ 5 anúncios com o mesmo criativo"
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            offers={sections.scaling}
            isFavorite={actions.isFavorite}
            onToggleFavorite={actions.toggleFavorite}
          />

          <section className="space-y-3" data-testid="row-top10">
            <OfferRow
              title={
                top10Niche === "all"
                  ? "Top 10 da biblioteca"
                  : `Top 10 · ${NICHE_LABEL[top10Niche]}`
              }
              subtitle="Ranking por força de escala (score, anúncios ativos e tempo no ar)"
              icon={<Trophy className="h-5 w-5 text-amber-500" />}
              offers={top10}
              ranked
              isFavorite={actions.isFavorite}
              onToggleFavorite={actions.toggleFavorite}
              action={
                <Select
                  value={top10Niche}
                  onValueChange={(v) => setTop10Niche(v as NicheId | "all")}
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs" data-testid="top10-niche">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os nichos</SelectItem>
                    {NICHES.filter((n) => (sections.nicheCounts.get(n.id) ?? 0) > 0).map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.emoji} {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </section>

          {sections.fresh.length > 0 ? (
            <OfferRow
              testId="row-fresh"
              title="Novas desta semana"
              subtitle="Descobertas pela primeira vez nos últimos 7 dias"
              icon={<CalendarPlus className="h-5 w-5 text-sky-500" />}
              offers={sections.fresh}
              isFavorite={actions.isFavorite}
              onToggleFavorite={actions.toggleFavorite}
            />
          ) : (
            <section className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              <CalendarPlus className="mr-1.5 inline h-4 w-4 text-sky-500" />
              Nenhuma oferta nova descoberta nos últimos 7 dias.{" "}
              <button
                className="font-semibold text-primary underline-offset-2 hover:underline"
                onClick={() => setMineOpen(true)}
              >
                Minerar agora
              </button>
            </section>
          )}

          {actions.favCount > 0 && (
            <OfferRow
              testId="row-favorites"
              title="Os seus favoritos"
              icon={<Heart className="h-5 w-5 text-rose-500" />}
              offers={offers.filter((o) => actions.isFavorite(o))}
              isFavorite={actions.isFavorite}
              onToggleFavorite={actions.toggleFavorite}
              action={
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/favoritos">Ver todos</Link>
                </Button>
              }
            />
          )}

          {sections.nicheShelves.map((shelf) => {
            const meta = NICHES.find((n) => n.id === shelf.id)!;
            return (
              <OfferRow
                key={shelf.id}
                testId={`row-niche-${shelf.id}`}
                title={`${meta.emoji} ${meta.label}`}
                offers={shelf.offers}
                isFavorite={actions.isFavorite}
                onToggleFavorite={actions.toggleFavorite}
                action={
                  <Button size="sm" variant="ghost" onClick={() => setFilters({ niche: shelf.id })}>
                    Ver todas
                  </Button>
                }
              />
            );
          })}

          {offers.length > sections.withMediaCount && (
            <p className="text-center text-xs text-muted-foreground">
              {offers.length - sections.withMediaCount} ofertas sem criativo capturado não aparecem
              nas prateleiras —{" "}
              <button
                className="font-semibold text-primary hover:underline"
                onClick={() =>
                  navigate({ to: "/minerar", search: { ...search, all: true }, replace: true })
                }
              >
                ver todas na lista
              </button>
              .
            </p>
          )}
        </div>
      )}

      <MineDialog
        open={mineOpen}
        onOpenChange={setMineOpen}
        defaultKeyword={filters.q.trim()}
        defaultCountry={filters.country !== "all" ? filters.country : "BR"}
        onDone={async (keyword) => {
          await load(true);
          setQueryDraft(keyword);
          setFilters({ q: keyword });
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs" aria-label={label} data-testid={testId}>
        <span className="mr-1 text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NicheChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-transparent text-primary-foreground shadow"
          : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5",
      )}
      style={active ? { background: "var(--gradient-primary)" } : undefined}
      data-testid="niche-chip"
    >
      {children}
    </button>
  );
}

function LibrarySkeleton() {
  return (
    <div className="space-y-8" data-testid="library-skeleton">
      <Skeleton className="h-[320px] w-full rounded-2xl" />
      {[0, 1].map((r) => (
        <div key={r} className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-[4/5] w-[160px] shrink-0 rounded-xl sm:w-[200px]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Sincronização de mídia ─────────────────────────

interface MediaSyncState {
  running: boolean;
  pending: number;
  copied: number;
  lastError: string | null;
}

/** Enquanto houver ofertas com mídia ainda não guardada, pede ao servidor
 *  para copiá-las (lotes curtos). Sem custo de Apify: usa os URLs já
 *  coletados. Para por si quando a fila esvazia ou após N rondas. */
function useMediaSync(offers: LibraryOffer[], onProgress: () => void): MediaSyncState {
  const [state, setState] = useState<MediaSyncState>({
    running: false,
    pending: 0,
    copied: 0,
    lastError: null,
  });
  const started = useRef(false);
  const pendingLocal = offers.filter(
    (o) => o.media_status === "not_attempted" || o.media_status === "pending_video",
  ).length;

  useEffect(() => {
    if (started.current || pendingLocal === 0) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, running: true, pending: pendingLocal }));
      let copiedTotal = 0;
      for (let round = 0; round < MEDIA_SYNC_MAX_ROUNDS && !cancelled; round++) {
        try {
          const res = await authedFetch("/api/media/persist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          });
          const data = (await res.json()) as {
            ok: boolean;
            error?: string;
            processed?: number;
            imagesCopied?: number;
            videosCopied?: number;
            remaining?: number | null;
          };
          if (!data.ok) throw new Error(data.error || `HTTP ${res.status}`);
          copiedTotal += (data.imagesCopied ?? 0) + (data.videosCopied ?? 0);
          setState({
            running: true,
            pending: data.remaining ?? 0,
            copied: copiedTotal,
            lastError: null,
          });
          if ((data.imagesCopied ?? 0) + (data.videosCopied ?? 0) > 0) onProgress();
          if (!data.processed || !data.remaining) break;
        } catch (e) {
          setState((s) => ({ ...s, lastError: e instanceof Error ? e.message : String(e) }));
          break;
        }
      }
      if (!cancelled) setState((s) => ({ ...s, running: false }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLocal > 0]);

  return state;
}

function MediaSyncBanner({ state }: { state: MediaSyncState }) {
  if (!state.running && !state.copied && !state.lastError) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        state.lastError ? "border-amber-500/40 bg-amber-500/5" : "border-primary/30 bg-primary/5",
      )}
      data-testid="media-sync"
    >
      {state.running ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <CloudUpload className="h-3.5 w-3.5 text-primary" />
      )}
      <span>
        {state.running
          ? `Guardando mídias no armazenamento permanente… ${state.copied} guardadas${state.pending ? `, ${state.pending} na fila` : ""}`
          : state.lastError
            ? `Sincronização de mídia interrompida: ${state.lastError}`
            : `${state.copied} mídias guardadas permanentemente nesta sessão.`}
      </span>
    </div>
  );
}

// ───────────────────────── Minerar novas (Apify) ─────────────────────────

function MineDialog({
  open,
  onOpenChange,
  defaultKeyword,
  defaultCountry,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultKeyword: string;
  defaultCountry: string;
  onDone: (keyword: string) => Promise<void> | void;
}) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [country, setCountry] = useState(defaultCountry);
  const [limit, setLimit] = useState(20);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (open) {
      setKeyword(defaultKeyword);
      setCountry(defaultCountry);
    }
  }, [open, defaultKeyword, defaultCountry]);

  const run = async () => {
    const kw = keyword.trim();
    if (!kw) {
      toast.error("Digite uma palavra-chave.");
      return;
    }
    setRunning(true);
    try {
      const res = await authedFetch("/api/collector/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword: kw, country, limit, platform: "Facebook" }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        ads?: unknown[];
        saved?: number;
        media?: { imagesCopied?: number } | { error: string } | null;
      };
      if (!data.ok) throw new Error(data.error || "Falha no Motor de Coleta");
      const copied =
        data.media && "imagesCopied" in data.media ? (data.media.imagesCopied ?? 0) : 0;
      toast.success(
        `${data.ads?.length ?? 0} ofertas coletadas · ${data.saved ?? 0} guardadas · ${copied} imagens já no armazenamento permanente`,
      );
      onOpenChange(false);
      await onDone(kw);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na mineração");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Minerar novas ofertas
          </DialogTitle>
          <DialogDescription>
            Busca anúncios reais na Biblioteca de Anúncios da Meta (consome créditos da Apify). As
            ofertas e as imagens ficam guardadas — não é preciso minerar de novo para as rever.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="mine-kw">Palavra-chave</Label>
            <Input
              id="mine-kw"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ex: emagrecer, renda extra, colágeno"
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>País</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COUNTRY_LABELS).map(([c, l]) => (
                    <SelectItem key={c} value={c}>
                      {countryFlag(c)} {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 40, 60].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} anúncios
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Cancelar
          </Button>
          <Button onClick={run} disabled={running} data-testid="run-mine">
            {running ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Radar className="mr-1.5 h-4 w-4" />
            )}
            {running ? "Minerando…" : "Minerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
