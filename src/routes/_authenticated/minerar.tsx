import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Sparkles, Flame, TrendingUp, TrendingDown, Minus, Loader2, Wand2, Radar } from "lucide-react";
import { toggleSaveOffer, subscribeChange, fetchSavedIds, fetchFavIds, getAITrends, toggleFavorite, type AITrends } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { miningRepo } from "@/lib/mining/repository";
import type { CollectorRunResult } from "@/lib/collector/collector.types";
import { supabase } from "@/integrations/supabase/client";
import { Badge as UIBadge } from "@/components/ui/badge";
import { ExternalLink, Flame as FlameIcon, Image as ImageIcon, Globe2, BookmarkCheck, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
};

type CollectorDebug = {
  total: number;
  firstItem: unknown | null;
  fields: string[];
};

export const Route = createFileRoute("/_authenticated/minerar")({ component: MinePage });

const QUICK_TAGS = [
  "Infoproduto", "Produto físico", "Emagrecimento", "Beleza", "Marketing", "IA",
  "Saúde", "Finanças", "Dropshipping", "SaaS", "Relacionamento", "Nutra",
];
const TAG_TO_NICHE: Record<string, string> = {
  "Beleza": "Beleza", "Marketing": "Marketing", "Saúde": "Saúde", "Finanças": "Finanças",
};

function MinePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [niche, setNiche] = useState("all");
  const [country, setCountry] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [quantity, setQuantity] = useState(20);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [trends, setTrends] = useState<AITrends | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [collectorProgress, setCollectorProgress] = useState(0);
  const [collectorFound, setCollectorFound] = useState<number | null>(null);
  const [collectorDebug, setCollectorDebug] = useState<CollectorDebug | null>(null);
  const signals = getAITrends().signals;

  // Real ads from collected_ads (Supabase)
  const [collected, setCollected] = useState<CollectedAd[]>([]);
  const [latestRunAds, setLatestRunAds] = useState<CollectedAd[]>([]);
  const [collectedLoading, setCollectedLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const visibleCollected = latestRunAds.length > 0 ? latestRunAds : collected;

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
      setCollected((data ?? []) as CollectedAd[]);
    } catch (e) {
      console.error("[minerar] collected_ads fetch failed", e);
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
    navigate({ to: "/analise-ia", search: { offer: ingested.id } as never });
  };

  const onSaveCollected = async (ad: CollectedAd) => {
    if (!user) return;
    const key = ad.ad_library_id || ad.ad_url || ad.id;
    await miningRepo.ingestMany([
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
    const isSaved = await toggleSaveOffer(user.id, key);
    setSavedIds((s) => {
      const n = new Set(s);
      isSaved ? n.add(key) : n.delete(key);
      return n;
    });
    toast.success(isSaved ? "Salvo na Central" : "Removido dos salvos");
  };

  const onFavoriteCollected = async (ad: CollectedAd) => {
    if (!user) return;
    const key = ad.ad_library_id || ad.ad_url || ad.id;
    const next = !favIds.has(key);
    await toggleFavorite(user.id, key, next);
    setFavIds((s) => {
      const n = new Set(s);
      next ? n.add(key) : n.delete(key);
      return n;
    });
    toast.success(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
  };

  const onTagClick = (tag: string) => {
    const newActive = activeTag === tag ? null : tag;
    setActiveTag(newActive);
    const newKeyword = newActive ?? "";
    const newNiche = newActive && TAG_TO_NICHE[newActive] ? TAG_TO_NICHE[newActive] : "all";
    setKeyword(newKeyword);
    setNiche(newNiche);
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
        }),
      });
      const data = (await res.json()) as CollectorRunResult;
      if (!data.ok) throw new Error(data.error || "Falha no Motor de Coleta");
      console.log("collector results:", data.ads?.length ?? 0, data.ads);
      setCollectorDebug({
        total: data.ads?.length ?? 0,
        firstItem: data.ads?.[0] ?? null,
        fields: data.ads?.[0] ? Object.keys(data.ads[0] as unknown as Record<string, unknown>) : [],
      });
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
        platform: a.platform,
        country: a.country,
        niche: a.niche,
        keyword: keyword,
        score: a.score,
        created_at: a.createdAt || new Date().toISOString(),
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
      setPage(0);
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

      {/* Tendências detectadas pela IA */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Tendências detectadas pela IA</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {signals.map((sig, i) => {
              const TrendIcon = sig.direction === "up" ? TrendingUp : sig.direction === "down" ? TrendingDown : Minus;
              const trendColor = sig.direction === "up" ? "text-emerald-500" : sig.direction === "down" ? "text-red-500" : "text-muted-foreground";
              return (
                <motion.div
                  key={sig.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="card-glow rounded-xl border border-border/60 bg-background/50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">{sig.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{sig.title}</p>
                        <p className="text-xs text-muted-foreground">{sig.subtitle}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full text-xs">{sig.country}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Score</span>
                        <span className="font-bold text-foreground">{sig.score}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sig.score}%` }}
                          transition={{ duration: 0.9, delay: i * 0.08 }}
                          className="h-full rounded-full"
                          style={{ background: "var(--gradient-primary)" }}
                        />
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
                      <TrendIcon className="h-3.5 w-3.5" /> {sig.direction === "down" ? "-" : "+"}{sig.growth}%
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">{sig.time}</div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        {QUICK_TAGS.map((tag) => {
          const active = activeTag === tag;
          return (
            <motion.button
              key={tag}
              whileTap={{ scale: 0.94 }}
              onClick={() => onTagClick(tag)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-transparent text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5"
              }`}
              style={active ? { background: "var(--gradient-primary)" } : undefined}
            >
              {tag}
            </motion.button>
          );
        })}
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
                {["BR","US","ES","PT","FR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
          <div className="flex items-center justify-between gap-3 md:col-span-2 lg:col-span-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{visibleCollected.length}</span> anúncios coletados
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
              <Badge variant="outline" className="rounded-full">{visibleCollected.length}</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={fetchCollected}>
              <Loader2 className={`mr-1 h-3.5 w-3.5 ${collectedLoading ? "animate-spin" : "hidden"}`} />
              Atualizar
            </Button>
          </div>

          {collectorDebug && (
            <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-xs">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">Debug temporário</Badge>
                <span className="font-semibold">Total recebido: {collectorDebug.total}</span>
                <span className="text-muted-foreground">Campos: {collectorDebug.fields.join(", ") || "nenhum"}</span>
              </div>
              <pre className="max-h-48 overflow-auto rounded-md bg-background/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(collectorDebug.firstItem, null, 2)}
              </pre>
            </div>
          )}

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
                Nenhum anúncio coletado ainda. Digite uma palavra-chave e clique em
                <span className="mx-1 font-semibold text-foreground">Minerar com Motor de Coleta</span>.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleCollected.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((a) => {
                  const key = a.ad_library_id || a.ad_url || a.id;
                  const hasMedia = Boolean(a.video_url || a.image_url);
                  return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {a.video_url ? (
                        <video src={a.video_url} className="h-full w-full object-cover" muted loop playsInline controls />
                      ) : a.image_url ? (
                        <img src={a.image_url} alt={a.headline} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-8 w-8 opacity-40" />
                          <span className="text-sm font-medium">sem mídia capturada</span>
                        </div>
                      )}
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
                      {!hasMedia && (
                        <div className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                          sem mídia capturada
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <p className="line-clamp-1 text-base font-semibold">{a.advertiser || "Anunciante não informado"}</p>
                        <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{a.headline || "Sem headline capturada"}</p>
                        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{a.copy || "Sem copy capturada"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full">{a.platform || "Plataforma não informada"}</Badge>
                        <Badge variant="outline" className="rounded-full"><Globe2 className="mr-1 h-3 w-3" />{a.country || "—"}</Badge>
                        {a.cta && <Badge variant="outline" className="rounded-full">{a.cta}</Badge>}
                      </div>
                      <div className="mt-auto grid gap-2 pt-2 sm:grid-cols-2">
                        <Button size="sm" onClick={() => onAnalyzeCollected(a)} className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                          <Sparkles className="mr-1 h-3.5 w-3.5" /> Analisar com IA
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onSaveCollected(a)}>
                          <BookmarkCheck className="mr-1 h-3.5 w-3.5" /> {savedIds.has(key) ? "Salvo" : "Salvar"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onFavoriteCollected(a)}>
                          <Star className={`mr-1 h-3.5 w-3.5 ${favIds.has(key) ? "fill-yellow-400 text-yellow-400" : ""}`} /> Favoritar
                        </Button>
                        <Button size="sm" variant="ghost" asChild disabled={!a.ad_url}>
                          <a href={a.ad_url || "#"} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir anúncio
                          </a>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
              </div>
              {visibleCollected.length > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Página {page + 1} de {Math.ceil(visibleCollected.length / PAGE_SIZE)}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(page + 1) * PAGE_SIZE >= visibleCollected.length}
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
          <AnimatePresence mode="wait">
            {aiLoading || !trends ? (
              <motion.div key="l" exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-5 py-14">
                <div className="relative h-20 w-20">
                  <div className="ai-glow absolute inset-0 rounded-full opacity-50 blur-xl" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40"
                  />
                  <Wand2 className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                </div>
                <div className="relative h-1.5 w-64 overflow-hidden rounded-full bg-muted">
                  <div className="scan-line" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Analisando padrões<motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>…</motion.span></p>
                  <p className="mt-1 text-xs text-muted-foreground">A IA está varrendo milhares de anúncios em tempo real</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 py-2">
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
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
