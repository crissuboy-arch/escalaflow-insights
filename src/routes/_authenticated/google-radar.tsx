import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Loader2, Trash2, Sparkles, BookOpen, TrendingUp, X,
  ChevronRight, TrendingDown, Minus, BarChart2, Globe,
} from "lucide-react";
import {
  mineGoogleTrendsFn,
  listGoogleTrendsFn,
  analyzeGoogleTrendFn,
  deleteGoogleTrendFn,
  clearGoogleTrendsKeywordFn,
} from "@/lib/google-radar.functions";
import type { GoogleTrendsAiAnalysis } from "@/lib/google-radar.functions";

export const Route = createFileRoute("/_authenticated/google-radar")({
  component: GoogleRadarPage,
});

type TrendPoint = { keyword: string; value: number; date: string };
type TrendRow = {
  id: string;
  keyword: string;
  geo: string;
  timeframe: string;
  avg_interest: number;
  peak_interest: number;
  trend: "rising" | "stable" | "falling";
  related_queries: string[];
  related_topics: string[];
  points: TrendPoint[] | null;
  ai_analysis: GoogleTrendsAiAnalysis | null;
  updated_at: string;
};

const G = {
  rising: { color: "#22C55E", icon: TrendingUp, label: "Crescendo" },
  stable: { color: "#94A3B8", icon: Minus, label: "Estável" },
  falling: { color: "#EF4444", icon: TrendingDown, label: "Caindo" },
} as const;

const ACCENT = "#34A853";
const ACCENT_BG = "rgba(52,168,83,0.08)";
const ACCENT_BORDER = "rgba(52,168,83,0.25)";

const GEO_OPTIONS = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "EUA" },
  { value: "PT", label: "Portugal" },
  { value: "MX", label: "México" },
  { value: "AR", label: "Argentina" },
];

const TIME_OPTIONS = [
  { value: "now 1-d", label: "24 horas" },
  { value: "now 7-d", label: "7 dias" },
  { value: "today 1-m", label: "1 mês" },
  { value: "today 3-m", label: "3 meses" },
  { value: "today 12-m", label: "12 meses" },
];

function Sparkline({ points, trend }: { points: TrendPoint[]; trend: string }) {
  const last = points.slice(-24);
  if (!last.length) return null;
  const max = Math.max(...last.map((p) => p.value), 1);
  const color = G[trend as keyof typeof G]?.color ?? ACCENT;
  return (
    <div className="flex items-end gap-0.5 h-8 mt-1">
      {last.map((p, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm min-h-[2px] transition-all"
          style={{
            height: `${Math.max(4, (p.value / max) * 32)}px`,
            background: `${color}${i === last.length - 1 ? "ff" : "88"}`,
          }}
        />
      ))}
    </div>
  );
}

function TrendCard({
  row, onAnalyze, onDelete, analyzing,
}: {
  row: TrendRow;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  analyzing: boolean;
}) {
  const navigate = useNavigate();
  const [showAi, setShowAi] = useState(!!row.ai_analysis);
  const meta = G[row.trend] ?? G.stable;
  const TrendIcon = meta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-md p-4 space-y-3"
      style={{ boxShadow: "0 2px 24px 0 rgba(52,168,83,0.06)" }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
            >
              <TrendIcon className="h-3 w-3" />
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />{row.geo}
            </span>
            <span className="text-[10px] text-muted-foreground/60">{row.timeframe}</span>
          </div>
          <h3 className="text-base font-semibold text-foreground">{row.keyword}</h3>
        </div>
        <button onClick={() => onDelete(row.id)} className="text-muted-foreground/50 hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* interest bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-20 shrink-0">Interesse médio</span>
          <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${row.avg_interest}%`, background: meta.color }}
            />
          </div>
          <span className="text-foreground font-mono w-8 text-right">{row.avg_interest}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground w-20 shrink-0">Pico</span>
          <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all opacity-60"
              style={{ width: `${row.peak_interest}%`, background: meta.color }}
            />
          </div>
          <span className="text-foreground font-mono w-8 text-right">{row.peak_interest}</span>
        </div>
      </div>

      {/* sparkline */}
      {row.points && row.points.length > 0 && (
        <Sparkline points={row.points} trend={row.trend} />
      )}

      {/* related queries */}
      {row.related_queries?.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Queries relacionadas
          </span>
          <div className="flex flex-wrap gap-1">
            {row.related_queries.slice(0, 6).map((q) => (
              <span
                key={q}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* related topics */}
      {row.related_topics?.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tópicos relacionados
          </span>
          <div className="flex flex-wrap gap-1">
            {row.related_topics.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 text-[10px] bg-white/5 text-muted-foreground border border-white/8">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ai panel */}
      <AnimatePresence>
        {showAi && row.ai_analysis && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="rounded-xl border p-4 space-y-3 text-sm"
            style={{ borderColor: ACCENT_BORDER, background: ACCENT_BG }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2" style={{ color: ACCENT }}>
                <Sparkles className="h-4 w-4" /> Análise IA
              </span>
              <button onClick={() => setShowAi(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {([
                ["Oportunidade", row.ai_analysis.opportunity_level.toUpperCase()],
                ["Nicho", row.ai_analysis.niche_summary],
                ["Público", row.ai_analysis.target_audience],
                ["Melhor formato", row.ai_analysis.best_format],
                ["Por que agora", row.ai_analysis.urgency_reason],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t space-y-2" style={{ borderColor: ACCENT_BORDER }}>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Ideias de Ebook</span>
                <ul className="space-y-0.5">
                  {row.ai_analysis.ebook_ideas.map((idea, i) => (
                    <li key={i} className="text-sm" style={{ color: ACCENT }}>• {idea}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Ganchos de Copy</span>
                <ul className="space-y-0.5">
                  {row.ai_analysis.copy_hooks.map((hook, i) => (
                    <li key={i} className="text-sm italic text-foreground">"{hook}"</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs"
          style={{ borderColor: ACCENT_BORDER, color: ACCENT }}
          disabled={analyzing}
          onClick={() => row.ai_analysis ? setShowAi((v) => !v) : onAnalyze(row.id)}
        >
          {analyzing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          {row.ai_analysis ? (showAi ? "Ocultar IA" : "Ver Análise") : "Analisar com IA"}
        </Button>
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() => navigate({ to: "/produtos/ebook", search: { niche: row.keyword, prompt: row.ai_analysis?.ebook_ideas?.[0] ?? row.keyword } as any })}
        >
          <BookOpen className="h-3 w-3 mr-1" />Criar Ebook
        </Button>
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() => navigate({ to: "/copy", search: { prompt: row.ai_analysis?.copy_hooks?.[0] ?? row.keyword } as any })}
        >
          <TrendingUp className="h-3 w-3 mr-1" />Criar Copy
        </Button>
      </div>
    </motion.div>
  );
}

export default function GoogleRadarPage() {
  const [keywords, setKeywords] = useState("");
  const [geo, setGeo] = useState("BR");
  const [timeframe, setTimeframe] = useState("today 3-m");
  const [mining, setMining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [filterKw, setFilterKw] = useState<string | null>(null);
  const [mineResult, setMineResult] = useState<{ inserted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mineTrends = useServerFn(mineGoogleTrendsFn);
  const listTrends = useServerFn(listGoogleTrendsFn);
  const analyzeTrend = useServerFn(analyzeGoogleTrendFn);
  const deleteTrend = useServerFn(deleteGoogleTrendFn);
  const clearKeyword = useServerFn(clearGoogleTrendsKeywordFn);

  const loadTrends = useCallback(async (kw?: string) => {
    setLoading(true); setError(null);
    try {
      const rows = await listTrends({ data: { keyword: kw, limit: 200 } });
      setTrends(rows as TrendRow[]);
    } catch (e: any) { setError(e.message ?? "Erro ao carregar"); }
    finally { setLoading(false); }
  }, [listTrends]);

  const handleMine = async () => {
    if (!keywords.trim()) return;
    setMining(true); setError(null); setMineResult(null);
    try {
      const r = await mineTrends({ data: { keywords: keywords.trim(), geo, timeframe } });
      setMineResult(r);
      await loadTrends(filterKw ?? undefined);
    } catch (e: any) { setError(e.message ?? "Erro ao minerar"); }
    finally { setMining(false); }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds((p) => new Set(p).add(id));
    try {
      const analysis = await analyzeTrend({ data: { id } });
      setTrends((p) => p.map((t) => t.id === id ? { ...t, ai_analysis: analysis as GoogleTrendsAiAnalysis } : t));
    } catch (e: any) { setError(e.message ?? "Erro ao analisar"); }
    finally { setAnalyzingIds((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrend({ data: { id } });
      setTrends((p) => p.filter((t) => t.id !== id));
    } catch (e: any) { setError(e.message ?? "Erro ao deletar"); }
  };

  const handleClear = async (kw: string) => {
    try {
      await clearKeyword({ data: { keyword: kw } });
      setTrends((p) => p.filter((t) => t.keyword !== kw));
      if (filterKw === kw) setFilterKw(null);
    } catch (e: any) { setError(e.message ?? "Erro ao limpar"); }
  };

  const uniqueKws = [...new Set(trends.map((t) => t.keyword))];
  const displayed = filterKw ? trends.filter((t) => t.keyword === filterKw) : trends;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: ACCENT, textShadow: "0 0 24px rgba(52,168,83,0.5)" }}>
          Radar Google Trends
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitore tendências de busca, descubra nichos em crescimento e crie produtos na hora certa.
        </p>
      </div>

      {/* search panel */}
      <div className="rounded-2xl border bg-white/2 backdrop-blur-md p-4 space-y-3" style={{ borderColor: ACCENT_BORDER, boxShadow: "0 0 40px -10px rgba(52,168,83,0.15)" }}>
        <div className="flex gap-2 flex-wrap">
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleMine()}
            placeholder="palavra-chave (separe por vírgula para múltiplas)"
            className="flex-1 min-w-48 bg-transparent border-white/10 focus:border-[#34A853]/50"
          />
          <select value={geo} onChange={(e) => setGeo(e.target.value)} className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground">
            {GEO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground">
            {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button onClick={handleMine} disabled={mining || !keywords.trim()} className="gap-2 text-white"
            style={{ background: ACCENT, boxShadow: mining ? "none" : "0 0 20px rgba(52,168,83,0.4)" }}>
            {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
            {mining ? "Buscando..." : "Analisar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs" style={{ color: ACCENT }}>
            {mineResult.inserted} tendência(s) salva(s) / atualizada(s).
          </p>
        )}

        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" disabled={loading} onClick={() => loadTrends(filterKw ?? undefined)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Carregar salvos
          </Button>
          {uniqueKws.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                style={filterKw === null ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                onClick={() => setFilterKw(null)}
              >Todos ({trends.length})</button>
              {uniqueKws.map((kw) => (
                <div key={kw} className="flex items-center gap-0.5">
                  <button
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                    style={filterKw === kw ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                    onClick={() => setFilterKw(filterKw === kw ? null : kw)}
                  >{kw} ({trends.filter((t) => t.keyword === kw).length})</button>
                  <button className="text-muted-foreground/40 hover:text-red-400" onClick={() => handleClear(kw)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {!loading && trends.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Digite palavras-chave e clique em Analisar.</p>
          <p className="text-xs mt-1 opacity-60">Separe múltiplas palavras por vírgula: fitness, emagrecimento</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
          <span className="text-sm">Carregando tendências...</span>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayed.map((row) => (
            <TrendCard key={row.id} row={row} onAnalyze={handleAnalyze} onDelete={handleDelete} analyzing={analyzingIds.has(row.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
