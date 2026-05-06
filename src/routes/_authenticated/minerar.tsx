import { createFileRoute } from "@tanstack/react-router";
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
import { Search, Sparkles, Flame, TrendingUp, TrendingDown, Minus, Loader2, Wand2 } from "lucide-react";
import { fetchOffers, toggleSaveOffer, subscribeChange, fetchSavedIds, fetchFavIds, getAITrends, type AITrends } from "@/lib/queries";
import { OfferCard } from "@/components/OfferCard";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

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
  const [keyword, setKeyword] = useState("");
  const [niche, setNiche] = useState("all");
  const [country, setCountry] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [quantity, setQuantity] = useState(20);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [trends, setTrends] = useState<AITrends | null>(null);
  const signals = getAITrends().signals;

  const load = async (opts?: { keyword?: string; niche?: string }) => {
    setLoading(true);
    try {
      setOffers(await fetchOffers({
        keyword: opts?.keyword ?? keyword,
        niche: opts?.niche ?? niche,
        country, platform, limit: quantity,
      }));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
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

  const onTagClick = (tag: string) => {
    const newActive = activeTag === tag ? null : tag;
    setActiveTag(newActive);
    const newKeyword = newActive ?? "";
    const newNiche = newActive && TAG_TO_NICHE[newActive] ? TAG_TO_NICHE[newActive] : "all";
    setKeyword(newKeyword);
    setNiche(newNiche);
    load({ keyword: newKeyword, niche: newNiche });
  };

  const onAIMine = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setTrends(null);
    setTimeout(() => { setTrends(getAITrends()); setAiLoading(false); }, 1200);
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
              <span className="font-semibold text-foreground">{offers.length}</span> anúncios encontrados
            </p>
            <Button onClick={() => load()} disabled={loading} className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {t("mine.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border/60 bg-card">
              <div className="aspect-video shimmer bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 shimmer rounded bg-muted" />
                <div className="h-3 w-full shimmer rounded bg-muted" />
                <div className="h-8 w-full shimmer rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("mine.noResults")}</p>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {offers.map((o) => (
            <motion.div key={o.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <OfferCard offer={o} saved={savedIds.has(o.id)} favorited={favIds.has(o.id)} onToggleSave={() => onSave(o.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

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
              <motion.div key="l" exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="ai-glow h-16 w-16 rounded-full opacity-40 blur-xl" />
                  <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">A IA está varrendo milhares de anúncios...</p>
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
