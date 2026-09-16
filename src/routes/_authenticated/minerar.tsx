import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Sparkles, Flame, TrendingUp, TrendingDown, Minus, Loader2, Wand2, Radar, Rocket } from "lucide-react";
import { toggleSaveOffer, subscribeChange, fetchSavedIds, fetchFavIds, getAITrends, toggleFavorite, saveCollectedAd, favoriteCollectedAd, rememberAdForAnalysis, type AITrends, type PersistedAd } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { miningRepo } from "@/lib/mining/repository";
import type { CollectorRunResult } from "@/lib/collector/collector.types";
import { supabase } from "@/integrations/supabase/client";
import { Badge as UIBadge } from "@/components/ui/badge";
import { ExternalLink, Flame as FlameIcon, Image as ImageIcon, Globe2, BookmarkCheck, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { openAdLink } from "@/lib/external";
import { CATEGORY_LIST, KEYWORD_CATEGORIES, type CategoryId } from "@/lib/mining/keywords";
import { useServerFn } from "@tanstack/react-start";
import { createProjectFromOffer } from "@/lib/project.functions";
import { SkillButton } from "@/components/module-skills/SkillButton";
import { GenerateOfferModal } from "@/components/minerar/GenerateOfferModal";

type CollectedAd = {
  id: string;
  ad_library_id: string | null;
  ad_url: string | null;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  image_url: string | null;
  video_url: string | null;
  creative_type: string | null;
  platform: string;
  country: string;
  niche: string;
  keyword: string | null;
  score: number;
  created_at: string;
  media_source?: string;
  tags?: string[];
  subniche?: string | null;
  scale_level?: "cold" | "warming" | "hot" | "scaled" | null;
  promise?: string | null;
  emotion?: string | null;
  isVsl?: boolean;
  vslScaling?: boolean;
  hookRepeated?: boolean;
  viralStructure?: boolean;
  copyPattern?: boolean;
  offerType?: "anuncio" | "pagina-venda" | "vsl" | "checkout" | "ecommerce" | "conteudo" | null;
  source_engine?: string | null;
  offer_network?: string | null;
  offer_network_confidence?: string | null;
  landing_page_url?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
};

const mineSearch = z.object({
  keyword: z.string().optional().catch(undefined),
  niche: z.string().optional().catch(undefined),
  country: z.string().optional().catch(undefined),
  platform: z.string().optional().catch(undefined),
  scale: z.string().optional().catch(undefined),
  page: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/minerar")({
  validateSearch: mineSearch,
  component: MinePage,
});

function AdMedia({ imageUrl, videoUrl, headline }: { imageUrl: string | null; videoUrl: string | null; headline: string }) {
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // Facebook's CDN media URLs are signed with a short expiry (days/weeks) — once
  // expired they 403, which otherwise renders as a blank "0:00" video player.
  // Confirmed 2026-09-15: an older ad's video_url returned "URL signature expired".
  if (videoUrl && !videoError) {
    return (
      <video
        src={videoUrl}
        poster={imageUrl ?? undefined}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        controls
        onError={() => setVideoError(true)}
      />
    );
  }
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={headline}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <ImageIcon className="h-8 w-8 opacity-40" />
      <span className="text-sm font-medium">
        {videoError || imgError ? "mídia expirada — minere novamente" : "sem mídia capturada"}
      </span>
    </div>
  );
}

function MinePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const createFromOffer = useServerFn(createProjectFromOffer);
  const [modeling, setModeling] = useState<string | null>(null);
  const [generateTarget, setGenerateTarget] = useState<CollectedAd | null>(null);

  // Filter state persisted in URL so navigating back restores it
  const keyword = search.keyword ?? "";
  const niche = search.niche ?? "all";
  const country = search.country ?? "all";
  const platform = search.platform ?? "all";
  const scaleFilter = (search.scale ?? "all") as "all" | "cold" | "warming" | "hot" | "scaled";
  const page = search.page ?? 0;

  const updateSearch = (updates: Partial<z.infer<typeof mineSearch>>) =>
    navigate({ to: "/minerar", search: { ...search, ...updates }, replace: true });

  const setKeyword = (k: string) => updateSearch({ keyword: k, page: 0 });
  const setNiche = (n: string) => updateSearch({ niche: n, page: 0 });
  const setCountry = (c: string) => updateSearch({ country: c, page: 0 });
  const setPlatform = (p: string) => updateSearch({ platform: p, page: 0 });
  const setScaleFilter = (s: string) => updateSearch({ scale: s, page: 0 });
  const setPage = (fn: ((p: number) => number) | number) =>
    updateSearch({ page: typeof fn === "function" ? fn(page) : fn });

  const [quantity, setQuantity] = useState(20);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [trends, setTrends] = useState<AITrends | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [collectorProgress, setCollectorProgress] = useState(0);
  const [collectorFound, setCollectorFound] = useState<number | null>(null);
  const signals = getAITrends().signals;

  // Real ads from collected_ads (Supabase)
  const [collected, setCollected] = useState<CollectedAd[]>([]);
  const [latestRunAds, setLatestRunAds] = useState<CollectedAd[]>([]);
  const [collectedLoading, setCollectedLoading] = useState(true);
  const PAGE_SIZE = 12;
  const visibleCollected = latestRunAds.length > 0 ? latestRunAds : collected;

  const categoryKeywordsLower = activeCategory
    ? KEYWORD_CATEGORIES[activeCategory].keywords.map((k) => k.toLowerCase())
    : null;

  const filtered = visibleCollected.filter((a) => {
    if (scaleFilter !== "all" && a.scale_level !== scaleFilter) return false;
    if (networkFilter !== "all" && (a.offer_network ?? "desconhecido") !== networkFilter) return false;
    if (countryFilter !== "all" && a.country !== countryFilter) return false;
    if (tagFilters.size && !(a.tags ?? []).some((t) => tagFilters.has(t))) return false;
    if (categoryKeywordsLower) {
      const tagsLower = (a.tags ?? []).map((t) => t.toLowerCase());
      const hay = `${a.headline} ${a.copy ?? ""}`.toLowerCase();
      const hit = tagsLower.some((t) => categoryKeywordsLower.includes(t)) ||
        categoryKeywordsLower.some((kw) => hay.includes(kw));
      if (!hit) return false;
    }
    return true;
  });

  const availableTags = (() => {
    const counts = new Map<string, number>();
    for (const a of visibleCollected) {
      for (const t of a.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((x, y) => y[1] - x[1])
      .slice(0, 20)
      .map(([t]) => t);
  })();

  const toggleTagFilter = (t: string) => {
    setTagFilters((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
    updateSearch({ page: 0 });
  };

  const fetchCollected = async () => {
    setCollectedLoading(true);
    try {
      const { data, error } = await supabase
        .from("collected_ads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      console.log("[minerar] collected_ads fetched:", data?.length ?? 0);
      console.log("[minerar] collected_ads rows:", data ?? []);
      const enriched = (data ?? []).map((row) => {
        const r = row as unknown as { raw?: { enriched?: Record<string, unknown> } };
        const e = r.raw?.enriched ?? {};
        return {
          ...(row as object),
          tags: Array.isArray(e.tags) ? (e.tags as string[]) : undefined,
          subniche: (e.subniche as string | null | undefined) ?? null,
          scale_level: (e.scaleLevel as CollectedAd["scale_level"]) ?? null,
          promise: (e.promise as string | null | undefined) ?? null,
          emotion: (e.emotion as string | null | undefined) ?? null,
          isVsl: !!e.isVsl,
          vslScaling: !!e.vslScaling,
          hookRepeated: !!e.hookRepeated,
          viralStructure: !!e.viralStructure,
          copyPattern: !!e.copyPattern,
          offerType: (e.offerType as CollectedAd["offerType"]) ?? null,
          source_engine: (e.sourceEngine as string | null | undefined) ?? null,
        } as CollectedAd;
      });
      setCollected(enriched);
    } catch (e) {
      console.error("[minerar] collected_ads fetch failed", e);
      toast.error("Falha ao carregar ofertas coletadas — os cards podem ficar desatualizados.");
    } finally {
      setCollectedLoading(false);
    }
  };

  useEffect(() => {
    fetchCollected();
    const ch = supabase
      .channel("collected_ads_minerar")
      .on("postgres_changes", { event: "*", schema: "public", table: "collected_ads" }, () => fetchCollected())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSavedIds(user.id).then(setSavedIds);
    fetchFavIds(user.id).then(setFavIds);
    const unsub = subscribeChange((s) => {
      if (s === "saved") fetchSavedIds(user.id).then(setSavedIds);
      if (s === "fav") fetchFavIds(user.id).then(setFavIds);
    });
    return unsub;
  }, [user]);

  const onSave = async (id: string) => {
    if (!user) return;
    const isSaved = await toggleSaveOffer(user.id, id);
    setSavedIds((s) => { const n = new Set(s); isSaved ? n.add(id) : n.delete(id); return n; });
    toast.success(isSaved ? t("mine.saved") : "OK");
  };

  const onAnalyzeCollected = async (ad: CollectedAd) => {
    console.log("analysis payload", ad);
    const persisted = toPersisted(ad);
    await rememberAdForAnalysis(persisted).catch(() => {});
    const [ingested] = await miningRepo.ingestMany([
      {
        headline: ad.headline || ad.advertiser,
        copy: ad.copy ?? "",
        platform: ad.platform,
        country: ad.country,
        niche: ad.niche,
        score: ad.score,
        adUrl: ad.ad_url ?? undefined,
        adLibraryId: ad.ad_library_id ?? undefined,
        analysisType: "manual",
        creativeUrl: ad.image_url || ad.video_url || undefined,
        creativeType: ad.video_url ? "video" : ad.image_url ? "image" : undefined,
        advertiser: ad.advertiser,
        cta: ad.cta ?? undefined,
        createdAt: ad.created_at,
      },
    ], "extension");
    toast.success("Anúncio enviado para Análise IA");
    navigate({ to: "/analise-ia", search: { ad: persisted.key } as never });
  };

  const toPersisted = (ad: CollectedAd): PersistedAd => {
    const key = ad.ad_library_id || ad.ad_url || ad.id;
    return {
      key,
      ad_library_id: ad.ad_library_id,
      ad_url: ad.ad_url,
      advertiser: ad.advertiser,
      headline: ad.headline,
      copy: ad.copy,
      cta: ad.cta,
      image_url: ad.image_url,
      video_url: ad.video_url,
      platform: ad.platform,
      country: ad.country,
      niche: ad.niche,
      score: ad.score,
      created_at: ad.created_at,
      saved_at: new Date().toISOString(),
    };
  };

  const onSaveCollected = async (ad: CollectedAd) => {
    const persisted = toPersisted(ad);
    try {
      const isSaved = await saveCollectedAd(persisted);
      setSavedIds((s) => {
        const n = new Set(s);
        isSaved ? n.add(persisted.key) : n.delete(persisted.key);
        return n;
      });
      toast.success(isSaved ? "Salvo em Ofertas Salvas" : "Removido dos salvos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar anúncio");
    }
  };

  const onFavoriteCollected = async (ad: CollectedAd) => {
    const persisted = toPersisted(ad);
    const next = !favIds.has(persisted.key);
    // Optimistic update
    setFavIds((s) => {
      const n = new Set(s);
      next ? n.add(persisted.key) : n.delete(persisted.key);
      return n;
    });
    try {
      await favoriteCollectedAd(persisted, next);
      toast.success(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
    } catch (e) {
      // Revert optimistic update
      setFavIds((s) => {
        const n = new Set(s);
        next ? n.delete(persisted.key) : n.add(persisted.key);
        return n;
      });
      toast.error(e instanceof Error ? e.message : "Erro ao favoritar anúncio");
    }
  };

  const onCategoryClick = (id: CategoryId) => {
    setActiveCategory((cur) => (cur === id ? null : id));
  };
  const onKeywordChip = (kw: string) => {
    setKeyword(kw);
  };

  const onAIMine = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setTrends(null);
    setTimeout(() => { setTrends(getAITrends()); setAiLoading(false); }, 1200);
  };

  const onCollectorMine = async () => {
    if (!keyword.trim()) {
      toast.error("Digite uma palavra-chave para minerar.");
      return;
    }
    setCollecting(true);
    setCollectorProgress(8);
    setCollectorFound(null);
    // A stale scale/tag/category filter from a previous session can hide every
    // ad from a brand-new search, making a successful mine look like it
    // returned nothing. Clear filters so this run's results are always visible.
    setTagFilters(new Set());
    setActiveCategory(null);
    setNetworkFilter("all");
    setCountryFilter("all");
    updateSearch({ scale: "all", page: 0 });
    const tick = setInterval(() => {
      setCollectorProgress((p) => (p < 88 ? p + Math.max(1, Math.round((90 - p) / 12)) : p));
    }, 350);
    try {
      const res = await fetch("/api/collector/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keyword,
          country: country === "all" ? undefined : country,
          niche: niche === "all" ? undefined : niche,
          limit: quantity,
          platform: platform === "all" ? undefined : platform,
        }),
      });
      const data = (await res.json()) as CollectorRunResult;
      if (!data.ok) throw new Error(data.error || "Falha no Motor de Coleta");
      console.log("collector results:", data.ads?.length ?? 0, data.ads);
      const adsArr = data.ads ?? [];
      console.log("[minerar] collector adsArr:", adsArr);
      // Optimistically merge returned ads into local state so UI updates instantly
      const optimistic: CollectedAd[] = (data.ads ?? []).map((a, idx) => ({
        id: a.adLibraryId || `${Date.now()}-${idx}`,
        ad_library_id: a.adLibraryId ?? null,
        ad_url: a.adUrl ?? null,
        advertiser: a.advertiser,
        headline: a.headline,
        copy: a.copy ?? null,
        cta: a.cta ?? null,
        image_url: a.imageUrl ?? null,
        video_url: a.videoUrl ?? null,
        creative_type: a.videoUrl ? "video" : a.imageUrl ? "image" : null,
        media_source: (a as unknown as { mediaSource?: string }).mediaSource,
        platform: a.platform,
        country: a.country,
        niche: a.niche,
        keyword: keyword,
        score: a.score,
        created_at: a.createdAt || new Date().toISOString(),
        tags: a.tags,
        subniche: a.subniche ?? null,
        scale_level: a.scaleLevel ?? null,
        promise: a.promise ?? null,
        emotion: a.emotion ?? null,
        offerType: a.offerType ?? null,
        source_engine: a.sourceEngine ?? null,
      }));
      setLatestRunAds(optimistic);
      setCollected((prev) => {
        const map = new Map<string, CollectedAd>();
        [...optimistic, ...prev].forEach((x) => {
          const key = x.ad_library_id || x.ad_url || x.id;
          if (!map.has(key)) map.set(key, x);
        });
        return Array.from(map.values());
      });
      const ingested = await miningRepo.ingestMany(
        data.ads.map((a) => ({
          headline: a.headline,
          copy: a.copy,
          platform: a.platform,
          country: a.country,
          niche: a.niche,
          score: a.score,
          adUrl: a.adUrl,
          adLibraryId: a.adLibraryId,
          analysisType: "manual",
          creativeUrl: a.imageUrl || a.videoUrl,
          creativeType: a.videoUrl ? "video" : "image",
          advertiser: a.advertiser,
          cta: a.cta,
          createdAt: a.createdAt,
        })),
        "extension",
      );
      setCollectorProgress(100);
      setCollectorFound(optimistic.length || ingested.length);
      toast.success(`Mineração concluída: ${optimistic.length || ingested.length} anúncios`);
      await fetchCollected();
      updateSearch({ page: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na mineração");
    } finally {
      clearInterval(tick);
      setTimeout(() => {
        setCollecting(false);
        setCollectorProgress(0);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("mine.title")}</h1>
          <p className="text-muted-foreground">{t("mine.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
        <SkillButton moduleKey="meta_ads_radar" />
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative">
          <Button onClick={onAIMine} className="ai-pulse ai-glow relative overflow-hidden text-white hover:opacity-95">
            <motion.span animate={{ rotate: [0, 12, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="mr-2 inline-flex">
              <Wand2 className="h-4 w-4" />
            </motion.span>
            Minerar com IA
            <Sparkles className="ml-2 h-3.5 w-3.5 animate-pulse" />
          </Button>
        </motion.div>
        </div>
      </div>

      {/* Estatísticas reais do motor de coleta */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-5">
          {collected.length === 0 ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Radar className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm">
                Motor de coleta pronto. Digite uma palavra-chave e clique em{" "}
                <span className="font-semibold text-foreground">Minerar com Motor de Coleta</span>{" "}
                para encontrar ofertas comerciais reais.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Ofertas coletadas</span>
                <span className="text-lg font-bold text-foreground">{collected.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Plataformas</span>
                <span className="text-lg font-bold text-foreground">
                  {new Set(collected.map(a => a.platform)).size}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FlameIcon className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-muted-foreground">Score médio</span>
                <span className="text-lg font-bold text-foreground">
                  {Math.round(collected.reduce((s, a) => s + a.score, 0) / collected.length)}
                </span>
              </div>
              {(latestRunAds[0]?.created_at ?? collected[0]?.created_at) && (
                <div className="ml-auto text-[11px] text-muted-foreground">
                  Última coleta: {new Date(latestRunAds[0]?.created_at ?? collected[0].created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorias de inteligência */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_LIST.map((c) => {
            const active = activeCategory === c.id;
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => onCategoryClick(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-transparent text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5"
                }`}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                <span className="mr-1">{c.emoji}</span>{c.label}
              </motion.button>
            );
          })}
        </div>
        {activeCategory && (
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/60 p-3">
            {(CATEGORY_LIST.find((c) => c.id === activeCategory)?.keywords ?? []).map((kw) => (
              <button
                key={kw}
                onClick={() => onKeywordChip(kw)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  keyword === kw
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtros principais */}
      <Card className="border-border/60">
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><Label>{t("mine.keyword")}</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ex: emagrecer" /></div>
          <div><Label>{t("mine.niche")}</Label>
            <Select value={niche} onValueChange={setNiche}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("common.all")}</SelectItem>
                {["Saúde","Finanças","Marketing","Educação","Beleza","Tecnologia","Produtividade","E-commerce","Carreira"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent></Select></div>
          <div><Label>{t("mine.country")}</Label>
            <Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("common.all")}</SelectItem>
                {[
                  { code: "BR", label: "Brasil" },
                  { code: "US", label: "Estados Unidos" },
                  { code: "GB", label: "Reino Unido" },
                  { code: "ES", label: "Espanha" },
                  { code: "PT", label: "Portugal" },
                  { code: "FR", label: "França" },
                ].map((c) => <SelectItem key={c.code} value={c.code}>{c.label} ({c.code})</SelectItem>)}
              </SelectContent></Select></div>
          <div><Label>{t("mine.platform")}</Label>
            <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("common.all")}</SelectItem>
                {["Facebook","Instagram","TikTok","YouTube","LinkedIn","Pinterest"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent></Select></div>
          <div>
            <Label className="flex items-center justify-between">
              <span>{t("mine.quantity")}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{quantity}</span>
            </Label>
            <Slider value={[quantity]} min={4} max={100} step={1} onValueChange={(v) => setQuantity(v[0])} className="mt-3" />
          </div>
          <div>
            <Label>Nível de escala</Label>
            <Select value={scaleFilter} onValueChange={(v) => setScaleFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warming">Warming</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="scaled">Scaled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rede da oferta</Label>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="hotmart">Hotmart</SelectItem>
                <SelectItem value="kiwify">Kiwify</SelectItem>
                <SelectItem value="clickbank">ClickBank</SelectItem>
                <SelectItem value="digistore24">Digistore24</SelectItem>
                <SelectItem value="shopify">Shopify</SelectItem>
                <SelectItem value="braip">Braip</SelectItem>
                <SelectItem value="checkout-proprio">Checkout próprio</SelectItem>
                <SelectItem value="desconhecido">Não identificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mercado</Label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="US">Estados Unidos</SelectItem>
                <SelectItem value="BR">Brasil</SelectItem>
                <SelectItem value="PT">Portugal</SelectItem>
                <SelectItem value="ES">Espanha</SelectItem>
                <SelectItem value="GB">Reino Unido</SelectItem>
                <SelectItem value="CA">Canadá</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {availableTags.length > 0 && (
            <div className="md:col-span-2 lg:col-span-6">
              <Label>Tags detectadas</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {availableTags.map((t) => {
                  const active = tagFilters.has(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTagFilter(t)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                        active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
                {tagFilters.size > 0 && (
                  <button
                    onClick={() => { setTagFilters(new Set()); updateSearch({ page: 0 }); }}
                    className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  >
                    limpar
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 md:col-span-2 lg:col-span-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              {latestRunAds.length > 0
                ? `de ${latestRunAds.length} ofertas desta busca`
                : `de ${visibleCollected.length} ofertas salvas`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onCollectorMine}
                disabled={collecting}
                variant="outline"
                className="border-primary/40"
              >
                {collecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                Minerar com Motor de Coleta
              </Button>
              <Button onClick={fetchCollected} disabled={collectedLoading} className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                {collectedLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Atualizar coleta
              </Button>
            </div>
          </div>
          {collecting || collectorFound !== null ? (
            <div className="md:col-span-2 lg:col-span-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{collecting ? "Coletando anúncios em tempo real…" : "Coleta concluída"}</span>
                <span>
                  {collectorFound !== null ? `${collectorFound} salvos na Central` : `${collectorProgress}%`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${collectorProgress}%`, background: "var(--gradient-primary)" }}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Anúncios coletados (Motor de Coleta) */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Anúncios coletados</h2>
              <Badge variant="outline" className="rounded-full">{filtered.length}</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={fetchCollected}>
              <Loader2 className={`mr-1 h-3.5 w-3.5 ${collectedLoading ? "animate-spin" : "hidden"}`} />
              Atualizar
            </Button>
          </div>

          {/* Debug visual removido — logs continuam no console do navegador */}

          {collectedLoading && visibleCollected.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border/60 p-3">
                  <Skeleton className="aspect-video w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : visibleCollected.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Radar className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma oferta real encontrada ainda. Digite uma palavra-chave e clique em
                <span className="mx-1 font-semibold text-foreground">Minerar com Motor de Coleta</span>.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Radar className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma oferta com os filtros atuais.</p>
              <Button size="sm" variant="outline" onClick={() => { setScaleFilter("all"); setTagFilters(new Set()); setActiveCategory(null); setNetworkFilter("all"); setCountryFilter("all"); updateSearch({ scale: "all", page: 0 }); }}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((a) => {
                  const key = a.ad_library_id || a.ad_url || a.id;
                  const scaleStyles: Record<NonNullable<CollectedAd["scale_level"]>, { label: string; cls: string; gradient?: boolean }> = {
                    cold:    { label: "Cold",    cls: "bg-muted text-muted-foreground" },
                    warming: { label: "Warming", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
                    hot:     { label: "Hot",     cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
                    scaled:  { label: "Scaled",  cls: "text-primary-foreground border-transparent", gradient: true },
                  };
                  const scale = a.scale_level ? scaleStyles[a.scale_level] : null;
                  const tags = a.tags ?? [];
                  return (
                  <div
                    key={key}
                    className="group flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      <AdMedia imageUrl={a.image_url} videoUrl={a.video_url} headline={a.headline} />
                      <div className="absolute left-2 top-2 flex gap-1">
                        <UIBadge className="rounded-full bg-background/80 text-foreground backdrop-blur">
                          <FlameIcon className="mr-1 h-3 w-3 text-primary" />{a.score}
                        </UIBadge>
                      </div>
                      <div className="absolute right-2 top-2">
                        <UIBadge variant="outline" className="rounded-full bg-background/80 backdrop-blur">
                          {a.platform}
                        </UIBadge>
                      </div>
                      {/* badge de mídia removido — AdMedia exibe fallback automaticamente */}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="line-clamp-1 text-base font-semibold flex-1">{a.advertiser || a.platform}</p>
                          {/* Nomenclatura correta: só "Anúncio" se veio de Ads Library/Apify */}
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {a.ad_library_id ? "Anúncio" : "Oferta encontrada"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{a.headline || "Sem headline capturada"}</p>
                        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{a.copy || "Sem descrição capturada"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full">{a.platform || "Web"}</Badge>
                        <Badge variant="outline" className="rounded-full"><Globe2 className="mr-1 h-3 w-3" />{a.country || "—"}</Badge>
                        {a.offerType && (() => {
                          const offerTypeMap: Record<string, { label: string; cls: string }> = {
                            "anuncio":     { label: "Anúncio",    cls: "border-purple-500/40 bg-purple-500/10 text-purple-400" },
                            "pagina-venda":{ label: "Pág. Venda", cls: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
                            "vsl":         { label: "VSL",        cls: "border-red-500/40 bg-red-500/10 text-red-400" },
                            "checkout":    { label: "Checkout",   cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
                            "ecommerce":   { label: "E-commerce", cls: "border-orange-500/40 bg-orange-500/10 text-orange-400" },
                            "conteudo":    { label: "Conteúdo",   cls: "border-slate-500/40 bg-slate-500/10 text-slate-400" },
                          };
                          const info = offerTypeMap[a.offerType];
                          return info ? (
                            <Badge variant="outline" className={`rounded-full text-[10px] ${info.cls}`}>{info.label}</Badge>
                          ) : null;
                        })()}
                        {/* Source engine — mostra de qual query veio */}
                        {a.source_engine && (
                          <Badge variant="outline" className="rounded-full text-[10px] border-slate-600/40 text-slate-500">
                            {a.source_engine.replace("bing:", "Bing/").replace("yahoo", "Yahoo")}
                          </Badge>
                        )}
                      </div>
                      {(a.subniche || scale || tags.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {a.subniche && (
                            <Badge variant="secondary" className="rounded-full text-[10px]">{a.subniche}</Badge>
                          )}
                          {scale && (
                            <Badge
                              variant="outline"
                              className={`rounded-full text-[10px] ${scale.cls}`}
                              style={scale.gradient ? { background: "var(--gradient-primary)" } : undefined}
                            >
                              {scale.label}
                            </Badge>
                          )}
                          {tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="rounded-full text-[10px]">{t}</Badge>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      <div className="mt-auto grid gap-2 pt-2 sm:grid-cols-2">
                        <Button size="sm" onClick={() => onAnalyzeCollected(a)} className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                          <Sparkles className="mr-1 h-3.5 w-3.5" /> Analisar com IA
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onSaveCollected(a)}>
                          <BookmarkCheck className="mr-1 h-3.5 w-3.5" /> {savedIds.has(key) ? "Salvo" : "Salvar"}
                        </Button>
                        <Button
                          size="sm"
                          className="sm:col-span-2 text-white font-semibold"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                          onClick={() => setGenerateTarget(a)}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Gerar Oferta Parecida
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="sm:col-span-2"
                          disabled={modeling === key}
                          onClick={async () => {
                            setModeling(key);
                            try {
                              const r = await createFromOffer({
                                data: {
                                  title: `${a.advertiser} — ${a.niche}`,
                                  niche: a.niche,
                                  promise: a.headline,
                                  avatar: `Pessoas interessadas em ${a.niche}`,
                                  uniqueMechanism: a.promise ?? "",
                                  pains: [],
                                  desires: [],
                                  source_ad_key: key,
                                  cover_url: a.image_url ?? null,
                                  advertiser: a.advertiser,
                                  platform: a.platform,
                                  country: a.country,
                                  headline: a.headline,
                                  copy: a.copy ?? undefined,
                                  cta: a.cta ?? undefined,
                                  imageUrl: a.image_url ?? null,
                                  videoUrl: a.video_url ?? null,
                                },
                              });
                              toast.success("Estratégia modelada");
                              navigate({ to: "/projetos/$id", params: { id: r.id }, search: { tab: "escala" } as never });
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Falha ao modelar");
                            } finally {
                              setModeling(null);
                            }
                          }}
                        >
                          <Rocket className="mr-1 h-3.5 w-3.5" /> {modeling === key ? "Modelando…" : "Modelar Estratégia"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onFavoriteCollected(a)}>
                          <Star className={`mr-1 h-3.5 w-3.5 ${favIds.has(key) ? "fill-yellow-400 text-yellow-400" : ""}`} /> Favoritar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openAdLink({
                            adUrl: a.ad_url,
                            adLibraryId: a.ad_library_id,
                            advertiser: a.advertiser,
                            headline: a.headline,
                          })}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir anúncio
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              {filtered.length > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Página {page + 1} de {Math.ceil(filtered.length / PAGE_SIZE)}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(page + 1) * PAGE_SIZE >= filtered.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Minerar com IA */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" /> Mineração inteligente
            </DialogTitle>
          </DialogHeader>
          {aiLoading || !trends ? (
            <div className="flex flex-col items-center justify-center gap-5 py-14">
              <div className="relative h-20 w-20">
                <div className="ai-glow absolute inset-0 rounded-full opacity-50 blur-xl" />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-primary/40"
                  style={{ animationDuration: "4s" }}
                />
                <Wand2 className="absolute inset-0 m-auto h-8 w-8 text-primary" />
              </div>
              <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-muted">
                <div className="scan-line" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Analisando padrões…</p>
                <p className="mt-1 text-xs text-muted-foreground">A IA está varrendo milhares de anúncios em tempo real</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-primary" /> Nichos aquecendo</h3>
                <div className="flex flex-wrap gap-2">
                  {trends.hotNiches.map((n) => (
                    <Badge key={n.name} className="bg-primary/15 text-primary hover:bg-primary/20">{n.name} {n.growth}</Badge>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Ofertas emergentes</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {trends.emergingOffers.map((o) => (
                    <div key={o.id} className="card-glow rounded-lg border border-border/60 bg-card p-3">
                      <p className="text-sm font-semibold line-clamp-1">{o.advertiser_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{o.niche} · {o.country}</p>
                      <p className="mt-2 text-xs font-bold text-primary">Score {o.scale_score}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Criativos escalando</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {trends.scalingCreatives.map((c) => <li key={c}>• {c}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Países em tendência</h3>
                <div className="flex flex-wrap gap-2">
                  {trends.trendingCountries.map((c) => (
                    <Badge key={c.code} variant="outline" className="border-primary/30">
                      {c.label} <span className="ml-1 text-primary">{c.growth}</span>
                    </Badge>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Scores altos detectados</h3>
                <div className="space-y-2">
                  {trends.topScores.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2">
                      <span className="text-sm">{o.advertiser_name}</span>
                      <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                        <Flame className="mr-1 h-3 w-3" /> {o.scale_score}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Oferta Parecida */}
      {generateTarget && (
        <GenerateOfferModal
          ad={generateTarget}
          keyword={keyword || undefined}
          open={!!generateTarget}
          onClose={() => setGenerateTarget(null)}
        />
      )}
    </div>
  );
}
