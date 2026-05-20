import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Bookmark, Sparkles, Flame } from "lucide-react";
import { fetchOffers, fetchSavedIds, fetchAnalyses } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ mined: 0, saved: 0, analyses: 0, hot: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const offers = await fetchOffers();
      const hot = offers.filter((o) => o.status === "quente").length;
      const analyses = (await fetchAnalyses()).length;
      const saved = user ? (await fetchSavedIds(user.id)).size : 0;
      setStats({ mined: offers.length, saved, analyses, hot });
      setRecent(offers.filter((o) => o.status === "escalando" || o.status === "quente").slice(0, 5));
    })();
  }, [user]);

  const trend = recent.map((o, i) => ({ name: o.advertiser_name.slice(0, 8), score: o.scale_score, i }));

  const cards = [
    { label: t("dashboard.totalMined"), value: stats.mined, icon: TrendingUp },
    { label: t("dashboard.totalSaved"), value: stats.saved, icon: Bookmark },
    { label: t("dashboard.totalAnalyses"), value: stats.analyses, icon: Sparkles },
    { label: t("dashboard.hotOffers"), value: stats.hot, icon: Flame },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">{t("dashboard.title")}</h1>
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="card-premium overflow-hidden">
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
          <CardHeader>
            <CardTitle>{t("dashboard.scoreTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} style={{ filter: "drop-shadow(0 0 6px var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle>{t("dashboard.recentScaled")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-background/40 p-3 transition-colors hover:border-primary/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.advertiser_name}</p>
                  <p className="text-xs text-muted-foreground">{o.niche}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}