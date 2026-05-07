import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  advertiser: string;
  headline: string;
  platform: string;
  country: string;
  niche: string;
  score: number;
  created_at: string;
  ad_library_id: string | null;
  ad_url: string | null;
};

type Scaled = {
  advertiser: string;
  headline: string;
  platform: string;
  platforms: string[];
  country: string;
  niche: string;
  score: number;
  count: number;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/ofertas-escaladas")({ component: ScaledPage });

function ScaledPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("collected_ads")
        .select("id,advertiser,headline,platform,country,niche,score,created_at,ad_library_id,ad_url")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
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
        advertiser: top.advertiser,
        headline: top.headline,
        platform: top.platform,
        platforms,
        country: top.country,
        niche: top.niche,
        score: top.score,
        count: arr.length,
        created_at: top.created_at,
      };
      if (item.score >= 80 || item.count > 1 || item.platforms.length > 1) out.push(item);
    }
    return out.sort((a, b) => b.score - a.score || b.count - a.count);
  }, [rows]);

  const filtered = useMemo(
    () => scaled.filter((r) => r.advertiser.toLowerCase().includes(q.toLowerCase()) || r.headline.toLowerCase().includes(q.toLowerCase())),
    [scaled, q],
  );

  return (
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
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Anúncios</TableHead>
                  <TableHead>Plataformas</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Detectado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}