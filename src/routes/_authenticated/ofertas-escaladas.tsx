import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, Info, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import { fetchScaledAds, rememberAdForAnalysis, subscribeChange, type PersistedAd } from "@/lib/queries";
import { openExternal } from "@/lib/external";

type Row = {
  id: string;
  key: string;
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
  ad_library_id: string | null;
  ad_url: string | null;
  scaled?: boolean;
  repeatedCreativeCount?: number;
};

type Scaled = {
  key: string;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  image_url: string | null;
  video_url: string | null;
  platform: string;
  platforms: string[];
  country: string;
  niche: string;
  score: number;
  count: number;
  created_at: string;
  ad_library_id: string | null;
  ad_url: string | null;
  scaled?: boolean;
  repeatedCreativeCount?: number;
};

export const Route = createFileRoute("/_authenticated/ofertas-escaladas")({ component: ScaledPage });

function ScaledPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const persisted = await fetchScaledAds();
      const { data } = await supabase
        .from("collected_ads")
        .select("id,advertiser,headline,copy,cta,image_url,video_url,platform,country,niche,score,created_at,ad_library_id,ad_url")
        .order("created_at", { ascending: false })
        .limit(500);
      const dbRows = (data ?? []).map((r) => ({ ...r, key: r.ad_library_id || r.ad_url || r.id })) as Row[];
      const persistedRows: Row[] = persisted.map((a: PersistedAd) => ({
        id: a.key,
        key: a.key,
        advertiser: a.advertiser,
        headline: a.headline,
        copy: a.copy,
        cta: a.cta,
        image_url: a.image_url,
        video_url: a.video_url,
        platform: a.platform,
        country: a.country,
        niche: a.niche,
        score: a.score,
        created_at: a.created_at,
        ad_library_id: a.ad_library_id,
        ad_url: a.ad_url,
        scaled: a.scaled,
        repeatedCreativeCount: a.repeatedCreativeCount,
      }));
      const map = new Map<string, Row>();
      [...persistedRows, ...dbRows].forEach((r) => { if (!map.has(r.key)) map.set(r.key, r); });
      setRows(Array.from(map.values()));
      setLoading(false);
    };
    load();
    const unsub = subscribeChange((s) => { if (s === "scaled") load(); });
    return unsub;
  }, []);

  const scaled: Scaled[] = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const k = (r.advertiser || "—") + "|" + (r.headline || "—");
      const arr = groups.get(k) ?? [];
      arr.push(r);
      groups.set(k, arr);
    }
    const out: Scaled[] = [];
    for (const arr of groups.values()) {
      const top = arr.reduce((a, b) => (b.score > a.score ? b : a));
      const platforms = Array.from(new Set(arr.map((x) => x.platform).filter(Boolean)));
      const item: Scaled = {
        key: top.key,
        advertiser: top.advertiser,
        headline: top.headline,
        copy: top.copy,
        cta: top.cta,
        image_url: top.image_url,
        video_url: top.video_url,
        platform: top.platform,
        platforms,
        country: top.country,
        niche: top.niche,
        score: top.score,
        count: arr.length,
        created_at: top.created_at,
        ad_library_id: top.ad_library_id,
        ad_url: top.ad_url,
        scaled: arr.some((x) => x.scaled),
        repeatedCreativeCount: Math.max(arr.length, ...arr.map((x) => x.repeatedCreativeCount ?? 0)),
      };
      if (item.scaled || item.score >= 80 || (item.repeatedCreativeCount ?? 0) > 1 || item.platforms.length > 1) out.push(item);
    }
    return out.sort((a, b) => b.score - a.score || b.count - a.count);
  }, [rows]);

  const filtered = useMemo(
    () => scaled.filter((r) => r.advertiser.toLowerCase().includes(q.toLowerCase()) || r.headline.toLowerCase().includes(q.toLowerCase())),
    [scaled, q],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const onAnalyze = (r: Scaled) => {
    const row = rows.find((x) => x.key === r.key || (x.advertiser === r.advertiser && x.headline === r.headline));
    if (!row) return;
    const key = row.key;
    rememberAdForAnalysis({
      key,
      ad_library_id: row.ad_library_id,
      ad_url: row.ad_url,
      advertiser: row.advertiser,
      headline: row.headline,
      copy: row.copy,
      cta: row.cta,
      image_url: row.image_url,
      video_url: row.video_url,
      platform: row.platform,
      country: row.country,
      niche: row.niche,
      score: row.score,
      created_at: row.created_at,
      saved_at: new Date().toISOString(),
      scaled: true,
      platforms: r.platforms,
      repeatedCreativeCount: r.count,
    });
    navigate({ to: "/analise-ia", search: { ad: key } as never });
  };

  const onOpen = (r: Scaled) => {
    openExternal(
      r.ad_url,
      r.ad_library_id ? `https://www.facebook.com/ads/library/?id=${r.ad_library_id}` : null,
    );
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("scaled.title")}</h1>
        <p className="text-muted-foreground">
          Anúncios reais com sinais de escala (score ≥ 80, criativo repetido ou multi-plataforma).
        </p>
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="border-b border-border/60 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar anunciante ou headline" className="pl-9" />
            </div>
          </div>
          {loading ? (
            <p className="p-12 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ainda não há ofertas escaladas detectadas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anunciante</TableHead>
                  <TableHead>Headline</TableHead>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Score <Info className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Score representa potencial de escala com base em mídia, copy, repetição, plataforma e sinais de anúncio ativo.
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">Anúncios</TableHead>
                  <TableHead>Plataformas</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Detectado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.advertiser}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">{r.headline}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.score}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="space-x-1">
                      {r.platforms.map((p) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.country}</TableCell>
                    <TableCell className="text-muted-foreground">{r.niche}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onOpen(r)} title="Ver detalhes">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onAnalyze(r)} title="Analisar com IA">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Página {page + 1} de {pageCount}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}