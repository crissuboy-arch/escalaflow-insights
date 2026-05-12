import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, Loader2, ExternalLink, Flame, TrendingUp, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  hotNiches,
  repeatedCreatives,
  scalingCreatives,
  dominantPromises,
} from "@/lib/mining/radar";
import type { CollectorAd } from "@/lib/collector/collector.types";
import { openExternal } from "@/lib/external";

export const Route = createFileRoute("/_authenticated/radar")({
  component: RadarPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-muted-foreground">Falha ao carregar Radar: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">Página não encontrada</div>,
});

type Row = {
  id: string;
  ad_library_id: string | null;
  ad_url: string | null;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  image_url: string | null;
  video_url: string | null;
  platform: string;
  country: string;
  niche: string;
  score: number;
  created_at: string;
  raw: { enriched?: Partial<Pick<CollectorAd, "tags" | "subniche" | "promise" | "mechanism" | "emotion" | "scaleLevel">> } | null;
};

function rowToCollectorAd(r: Row): CollectorAd {
  const e = r.raw?.enriched ?? {};
  return {
    advertiser: r.advertiser,
    headline: r.headline,
    copy: r.copy ?? "",
    cta: r.cta ?? undefined,
    imageUrl: r.image_url ?? undefined,
    videoUrl: r.video_url ?? undefined,
    adLibraryId: r.ad_library_id ?? undefined,
    adUrl: r.ad_url ?? undefined,
    platform: r.platform,
    country: r.country,
    niche: r.niche,
    score: r.score,
    source: "collector",
    createdAt: r.created_at,
    tags: e.tags,
    subniche: e.subniche ?? undefined,
    promise: e.promise ?? undefined,
    mechanism: e.mechanism ?? undefined,
    emotion: e.emotion ?? undefined,
    scaleLevel: e.scaleLevel ?? undefined,
  };
}

function RadarPage() {
  const [ads, setAds] = useState<CollectorAd[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("collected_ads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setAds(((data ?? []) as unknown as Row[]).map(rowToCollectorAd));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const niches = useMemo(() => hotNiches(ads, 7), [ads]);
  const repeats = useMemo(() => repeatedCreatives(ads), [ads]);
  const scaling = useMemo(() => scalingCreatives(ads), [ads]);
  const promises = useMemo(() => dominantPromises(ads), [ads]);

  const maxNiche = niches[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Radar de Oportunidade</h1>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{ads.length}</span> anúncios analisados
          </p>
        </div>
        <Button onClick={fetchAll} disabled={loading} variant="outline">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {loading && ads.length === 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Radar className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado suficiente. Minere mais anúncios primeiro.
            </p>
            <Button asChild>
              <Link to="/minerar">Ir para o Minerador</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Nichos quentes */}
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Nichos quentes (7d)</h2>
                <Badge variant="outline" className="ml-auto rounded-full">{niches.length}</Badge>
              </div>
              {niches.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem dados nos últimos 7 dias.</p>
              ) : (
                <ul className="space-y-2">
                  {niches.slice(0, 12).map((n) => (
                    <li key={n.niche} className="flex items-center gap-3">
                      <span className="w-40 truncate text-sm font-medium">{n.niche}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(n.count / maxNiche) * 100}%`,
                            background: "var(--gradient-primary)",
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-foreground">{n.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Criativos repetidos */}
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Criativos repetidos</h2>
                <Badge variant="outline" className="ml-auto rounded-full">{repeats.length}</Badge>
              </div>
              {repeats.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma repetição detectada.</p>
              ) : (
                <ul className="space-y-3">
                  {repeats.slice(0, 8).map((g) => (
                    <li
                      key={g.key}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-2"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {g.sample.imageUrl || g.sample.videoThumbnail ? (
                          <img
                            src={g.sample.imageUrl || g.sample.videoThumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{g.sample.advertiser}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{g.sample.headline}</p>
                      </div>
                      <Badge className="shrink-0 bg-primary/15 text-primary hover:bg-primary/20">
                        x{g.count}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() =>
                          openExternal(
                            g.sample.adUrl,
                            g.sample.adLibraryId
                              ? `https://www.facebook.com/ads/library/?id=${g.sample.adLibraryId}`
                              : null,
                          )
                        }
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Promessas dominantes */}
          {promises.length > 0 && (
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Promessas dominantes</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {promises.slice(0, 16).map((p) => (
                    <Badge key={p.promise} variant="outline" className="rounded-full">
                      {p.promise} <span className="ml-1 text-primary">×{p.count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Criativos escalando */}
          {scaling.length > 0 && (
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Criativos escalando</h2>
                </div>
                <ul className="space-y-2">
                  {scaling.slice(0, 10).map((a, i) => (
                    <li
                      key={`${a.adLibraryId ?? a.adUrl ?? a.headline}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-border/60 p-2"
                    >
                      <span className="line-clamp-1 flex-1 text-sm">
                        <span className="font-semibold">{a.advertiser}</span>{" "}
                        <span className="text-muted-foreground">— {a.headline}</span>
                      </span>
                      <Badge className="shrink-0 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                        <Flame className="mr-1 h-3 w-3" /> {a.score}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}