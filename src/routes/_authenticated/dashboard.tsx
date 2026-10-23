import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Bookmark, Sparkles, Flame, Globe, Filter } from "lucide-react";
import { fetchSavedIds } from "@/lib/queries";
import { getDashboardStats, getRecentMinedItems, type RecentMinedItem } from "@/lib/dashboard.functions";
import { useAuth } from "@/providers/AuthProvider";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { SkeletonCard, SkeletonList, SkeletonChart } from "@/components/dashboard/SkeletonCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AIStatusBar } from "@/components/dashboard/AIStatusBar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const getStats = useServerFn(getDashboardStats);
  const getRecent = useServerFn(getRecentMinedItems);
  const [stats, setStats] = useState({ mined: 0, saved: 0, analyses: 0, hot: 0 });
  const [recent, setRecent] = useState<RecentMinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [serverStats, recentItems, saved] = await Promise.all([
        getStats(),
        getRecent(),
        user ? fetchSavedIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      setStats({ mined: serverStats.mined, saved: saved.size, analyses: serverStats.analyses, hot: serverStats.hot });
      setRecent(recentItems);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [user, getStats, getRecent]);

  useEffect(() => {
    loadData();
    pollingRef.current = setInterval(loadData, 15000);
    return () => clearInterval(pollingRef.current);
  }, [loadData]);

  const filteredRecent = recent.filter(
    (item) =>
      !filter ||
      item.title.toLowerCase().includes(filter.toLowerCase()) ||
      item.authorOrAdvertiser?.toLowerCase().includes(filter.toLowerCase()),
  );

  const trend = filteredRecent.map((item, i) => ({
    name: item.authorOrAdvertiser?.slice(0, 8) ?? `#${i + 1}`,
    score: item.score ?? 0,
    i,
  }));

  const cards = [
    { label: t("dashboard.totalMined"), value: stats.mined, icon: TrendingUp },
    { label: t("dashboard.totalSaved"), value: stats.saved, icon: Bookmark },
    { label: t("dashboard.totalAnalyses"), value: stats.analyses, icon: Sparkles },
    { label: t("dashboard.hotOffers"), value: stats.hot, icon: Flame },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">{t("dashboard.title")}</h1>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("dashboard.refresh", "Atualizar")}
          </Button>
        </div>
      </div>

      <AIStatusBar />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="card-premium overflow-hidden glow-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
                      <c.icon className="h-4 w-4 text-primary drop-shadow-[0_0_8px_var(--primary)]" />
                    </div>
                    <p className="mt-2 text-3xl font-bold tabular-nums">{c.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-premium lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("dashboard.scoreTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {error ? (
              <EmptyState icon="error" title={t("dashboard.errorTitle", "Erro de conexão")} description={error} actionLabel="Tentar novamente" onAction={loadData} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} style={{ filter: "drop-shadow(0 0 6px var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t("dashboard.recentScaled")}</CardTitle>
            <div className="relative w-32">
              <Filter className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.filterPlaceholder", "Filtrar")}
                className="h-7 pl-6 text-xs"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <SkeletonList count={5} />
            ) : filteredRecent.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {t(filter ? "dashboard.noFilterResults" : "dashboard.noOffers", filter ? "Nenhum resultado para o filtro" : "Nenhum item minerado ainda — use um dos Radares")}
              </div>
            ) : (
              filteredRecent.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-background/40 p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.authorOrAdvertiser ?? item.platform}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.score != null && <ScoreBadge type="scale" value={item.score} />}
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}