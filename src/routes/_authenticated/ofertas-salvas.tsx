import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BookmarkCheck, Flame, Sparkles, ExternalLink, Image as ImageIcon, Megaphone, Globe, Search, Rocket } from "lucide-react";
import { fetchSavedAds, saveCollectedAd, rememberAdForAnalysis, subscribeChange, type PersistedAd } from "@/lib/queries";
import { toast } from "sonner";
import { openAdLink } from "@/lib/external";
import { useServerFn } from "@tanstack/react-start";
import { createProjectFromOffer } from "@/lib/project.functions";

export const Route = createFileRoute("/_authenticated/ofertas-salvas")({ component: SavedPage });

function SavedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ads, setAds] = useState<PersistedAd[]>([]);
  const createFromOffer = useServerFn(createProjectFromOffer);
  const [creating, setCreating] = useState<string | null>(null);

  const load = async () => setAds(await fetchSavedAds());
  useEffect(() => {
    load();
    const unsub = subscribeChange((s) => { if (s === "saved") load(); });
    return unsub;
  }, []);

  const onRemove = async (a: PersistedAd) => {
    await saveCollectedAd(a); // toggles off
    toast.success("Removido dos salvos");
  };
  const onAnalyze = async (a: PersistedAd) => {
    await rememberAdForAnalysis(a);
    navigate({ to: "/analise-ia", search: { ad: a.key } as never });
  };

  const onUseAsProject = async (a: PersistedAd) => {
    setCreating(a.key);
    try {
      const r = await createFromOffer({
        data: {
          title: `${a.advertiser} — ${a.niche}`,
          niche: a.niche,
          promise: a.headline,
          avatar: `Pessoas interessadas em ${a.niche}`,
          uniqueMechanism: "",
          pains: [],
          desires: [],
          source_ad_key: a.key,
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
      toast.error(e instanceof Error ? e.message : "Falha ao criar projeto");
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("saved_page.title")}</h1>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{ads.length}</span> {ads.length === 1 ? "anúncio salvo" : "anúncios salvos"}
        </p>
      </div>
      {ads.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed border-border/60 bg-card/50 px-6 py-16 text-center">
          <BookmarkCheck className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma oferta salva ainda.</p>
          <Button asChild className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Link to="/minerar"><Search className="mr-2 h-4 w-4" /> Minerar anúncios</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ads.map((a) => (
            <motion.div key={a.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden border-border/60 bg-card transition hover:border-primary/40">
                <div className="relative aspect-video bg-muted">
                  {a.video_url ? (
                    <video src={a.video_url} className="h-full w-full object-cover" muted loop playsInline controls />
                  ) : a.image_url ? (
                    <img src={a.image_url} alt={a.headline} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-bold backdrop-blur">
                    <Flame className="h-3 w-3 text-primary" /> {a.score}
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-1 text-sm font-semibold">{a.advertiser}</h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.headline}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs"><Megaphone className="mr-1 h-3 w-3" />{a.platform}</Badge>
                    <Badge variant="outline" className="text-xs"><Globe className="mr-1 h-3 w-3" />{a.country}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" onClick={() => onAnalyze(a)} className="text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> IA
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRemove(a)}>
                      <BookmarkCheck className="mr-1 h-3.5 w-3.5" /> Remover
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="col-span-2"
                      disabled={creating === a.key}
                      onClick={() => onUseAsProject(a)}
                    >
                      <Rocket className="mr-1 h-3.5 w-3.5" />
                      {creating === a.key ? "Modelando…" : "Modelar Estratégia"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="col-span-2"
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
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}