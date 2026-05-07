import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAnalyzedAdByKey, fetchSavedAds, fetchFavoriteAds, subscribeChange, type PersistedAd } from "@/lib/queries";
import { ArrowLeft, Sparkles, Target, Heart, Lightbulb, Users, Brain, Layers, Image as ImageIcon, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/analise-ia")({
  component: AIPage,
  validateSearch: (s: Record<string, unknown>) => ({
    ad: typeof s.ad === "string" ? s.ad : undefined,
    offer: typeof s.offer === "string" ? s.offer : undefined,
  }),
});

function buildAnalysis(ad: PersistedAd) {
  const niche = ad.niche || "este nicho";
  return {
    promise: ad.headline || `${ad.advertiser} promete resultados em ${niche.toLowerCase()}.`,
    mechanism: ad.copy?.slice(0, 220) || `Mecanismo do anúncio de ${ad.advertiser}.`,
    pains: ["Falta de tempo", "Resultados inconsistentes", "Sobrecarga de informação"],
    desires: ["Liberdade", "Resultados rápidos", "Reconhecimento"],
    audience: `Público interessado em ${niche.toLowerCase()} no(a) ${ad.country}.`,
    triggers: ["Prova social", "Autoridade", "Urgência", "Escassez"],
    structure: `Headline: ${ad.headline}\nCopy: ${ad.copy ?? "—"}\nCTA: ${ad.cta ?? "—"}`,
    creatives: [
      ad.video_url ? "Criativo em vídeo capturado" : ad.image_url ? "Criativo em imagem capturado" : "Sem criativo capturado",
      "Variação com prova social",
      "Headline alternativa com gancho de 3s",
    ],
  };
}

function AIPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/_authenticated/analise-ia" }) as { ad?: string; offer?: string };
  const [items, setItems] = useState<PersistedAd[]>([]);
  const [selected, setSelected] = useState<PersistedAd | null>(null);

  const load = async () => {
    const [saved, favs] = await Promise.all([fetchSavedAds(), fetchFavoriteAds()]);
    const map = new Map<string, PersistedAd>();
    [...saved, ...favs].forEach((a) => { if (!map.has(a.key)) map.set(a.key, a); });
    const list = Array.from(map.values());
    setItems(list);
    const targetKey = search.ad ?? search.offer;
    const target = targetKey ? (getAnalyzedAdByKey(targetKey) ?? list.find((a) => a.key === targetKey)) : null;
    setSelected(target ?? list[0] ?? null);
  };
  useEffect(() => { load(); const unsub = subscribeChange(() => load()); return unsub; }, [search.ad, search.offer]);

  const analysis = useMemo(() => (selected ? buildAnalysis(selected) : null), [selected]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("ai.title")}</h1>
          <p className="text-muted-foreground">{t("ai.subtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/minerar"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para mineração</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum anúncio enviado para análise. Vá em Minerar e clique em <span className="font-semibold text-foreground">Analisar com IA</span>.</p>
          <Button asChild className="mt-4 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Link to="/minerar">Ir para mineração</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {items.map((it) => (
              <button
                key={it.key}
                onClick={() => setSelected(it)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selected?.key === it.key ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                }`}
              >
                <p className="truncate text-sm font-medium">{it.advertiser}</p>
                <p className="truncate text-xs text-muted-foreground">{it.headline}</p>
              </button>
            ))}
          </div>

          {selected && analysis && (
            <motion.div key={selected.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="overflow-hidden border-border/60">
                <div className="grid gap-4 p-6 md:grid-cols-[200px_1fr]" style={{ background: "var(--gradient-primary)" }}>
                  <div className="aspect-video overflow-hidden rounded-lg bg-background/20">
                    {selected.video_url ? (
                      <video src={selected.video_url} className="h-full w-full object-cover" muted loop playsInline controls />
                    ) : selected.image_url ? (
                      <img src={selected.image_url} alt={selected.headline} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary-foreground/70">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">{selected.niche}</p>
                    <h2 className="mt-1 text-2xl font-bold text-primary-foreground">{selected.advertiser}</h2>
                    <p className="mt-2 text-sm text-primary-foreground/90">{selected.headline}</p>
                    <p className="mt-2 line-clamp-3 text-xs text-primary-foreground/80">{selected.copy}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{selected.platform}</Badge>
                      <Badge variant="secondary">{selected.country}</Badge>
                      <Badge variant="secondary">Score {selected.score}</Badge>
                      {selected.ad_url && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={selected.ad_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" /> Abrir anúncio
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard icon={Target} title={t("ai.promise")}><p>{analysis.promise}</p></InfoCard>
                <InfoCard icon={Sparkles} title={t("ai.mechanism")}><p>{analysis.mechanism}</p></InfoCard>
                <InfoCard icon={Heart} title={t("ai.pains")}><ListBadges items={analysis.pains} variant="destructive" /></InfoCard>
                <InfoCard icon={Lightbulb} title={t("ai.desires")}><ListBadges items={analysis.desires} variant="secondary" /></InfoCard>
                <InfoCard icon={Users} title={t("ai.audience")}><p>{analysis.audience}</p></InfoCard>
                <InfoCard icon={Brain} title={t("ai.triggers")}><ListBadges items={analysis.triggers} variant="default" /></InfoCard>
                <InfoCard icon={Layers} title={t("ai.structure")} className="md:col-span-2">
                  <p className="whitespace-pre-line">{analysis.structure}</p>
                </InfoCard>
                <InfoCard icon={ImageIcon} title={t("ai.creatives")} className="md:col-span-2">
                  <ul className="space-y-2 text-sm">
                    {analysis.creatives.map((c, i) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span>{c}</li>
                    ))}
                  </ul>
                </InfoCard>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, title, children, className }: any) {
  return (
    <Card className={`border-border/60 ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function ListBadges({ items, variant }: { items: any; variant: "default" | "secondary" | "destructive" }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div className="flex flex-wrap gap-1.5">
      {arr.map((x, i) => <Badge key={i} variant={variant} className="text-xs">{x}</Badge>)}
    </div>
  );
}