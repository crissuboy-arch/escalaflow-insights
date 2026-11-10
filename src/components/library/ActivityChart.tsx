import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { fetchActivitySnapshots, type ActivitySnapshot } from "@/lib/library/offers";

function fmt(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

/** "Evolução de anúncios": só pontos reais guardados a cada coleta. */
export function ActivityChart({ adId }: { adId: string }) {
  const [points, setPoints] = useState<ActivitySnapshot[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchActivitySnapshots(adId).then((p) => alive && setPoints(p));
    return () => {
      alive = false;
    };
  }, [adId]);

  const data = (points ?? [])
    .filter((p) => p.activeAds !== null)
    .map((p) => ({ dia: fmt(p.date), anuncios: p.activeAds }));

  return (
    <div
      className="space-y-2 rounded-xl border border-border/60 bg-card p-4"
      data-testid="activity-chart"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TrendingUp className="h-4 w-4" /> Evolução de anúncios
      </h2>
      <p className="text-xs text-muted-foreground">
        Anúncios ativos com este criativo em cada dia em que a oferta foi coletada.
      </p>
      {points === null ? (
        <div className="h-[160px] animate-pulse rounded-lg bg-muted/40" />
      ) : data.length < 2 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
          {data.length === 1
            ? `Por agora só há 1 registo (${data[0].anuncios} anúncios em ${data[0].dia}). O gráfico aparece quando a oferta for coletada noutro dia.`
            : "Ainda não há histórico. Ele começa a ser registado a partir da próxima coleta desta oferta."}
        </p>
      ) : (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="adsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [`${v} anúncios`, "Ativos"]}
              />
              <Area
                type="monotone"
                dataKey="anuncios"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#adsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
