import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Loader2, Trash2, Sparkles, BookOpen, X,
  Eye, ThumbsUp, MessageSquare, Clock, Youtube, Zap,
} from "lucide-react";
import {
  mineYouTubeFn,
  listYouTubeMinedFn,
  analyzeYouTubeVideoFn,
  deleteYouTubeVideoFn,
  clearYouTubeQueryFn,
} from "@/lib/youtube-radar.functions";
import type { YouTubeAiAnalysis } from "@/lib/youtube-radar.functions";

export const Route = createFileRoute("/_authenticated/youtube-radar")({
  component: YouTubeRadarPage,
});

type VideoRow = {
  id: string;
  query: string;
  video_id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  video_url: string;
  description: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  duration: string;
  is_short: boolean;
  published_at: string;
  thumbnail_url: string;
  viral_score: number;
  ai_analysis: YouTubeAiAnalysis | null;
};

const ACCENT = "#FF4040";
const ACCENT_BG = "rgba(255,64,64,0.08)";
const ACCENT_BORDER = "rgba(255,64,64,0.25)";

const DATE_OPTIONS = [
  { value: "", label: "Qualquer data" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "year", label: "Este ano" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ViralBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#FF4040" : score >= 50 ? "#F97316" : "#94A3B8";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <Zap className="h-3 w-3" />
      {score}/100
    </span>
  );
}

function VideoCard({
  row, onAnalyze, onDelete, analyzing,
}: {
  row: VideoRow;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  analyzing: boolean;
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [showAi, setShowAi] = useState(!!row.ai_analysis);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 2px 24px 0 rgba(255,64,64,0.06)" }}
    >
      <div className="flex gap-3 p-4">
        {/* thumbnail */}
        <a href={row.video_url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative">
          {!imgError && row.thumbnail_url ? (
            <img
              src={row.thumbnail_url}
              alt=""
              onError={() => setImgError(true)}
              className="w-28 h-16 object-cover rounded-lg"
            />
          ) : (
            <div
              className="w-28 h-16 rounded-lg flex items-center justify-center"
              style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
            >
              <Youtube className="h-6 w-6" style={{ color: ACCENT }} />
            </div>
          )}
          {row.is_short && (
            <span
              className="absolute -top-1.5 -right-1.5 text-[9px] font-black rounded-full px-1.5 py-0.5"
              style={{ background: ACCENT, color: "#fff" }}
            >
              SHORT
            </span>
          )}
        </a>

        {/* content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <ViralBadge score={row.viral_score} />
                <span className="text-xs text-muted-foreground truncate">{row.channel_name}</span>
              </div>
              <a
                href={row.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-foreground hover:underline line-clamp-2"
              >
                {row.title}
              </a>
            </div>
            <button onClick={() => onDelete(row.id)} className="text-muted-foreground/50 hover:text-red-400 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* stats */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(row.views)}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{fmt(row.likes)}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{fmt(row.comments)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{row.duration}</span>
            {row.published_at && (
              <span className="text-muted-foreground/50">
                {new Date(row.published_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>

          {/* hashtags */}
          {row.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.hashtags.slice(0, 5).map((h) => (
                <span
                  key={h}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                >
                  {h.startsWith("#") ? h : `#${h}`}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ai panel */}
      <AnimatePresence>
        {showAi && row.ai_analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mx-4 mb-4 rounded-xl border p-4 space-y-3 text-sm"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ["Nicho", row.ai_analysis.niche],
                  ["Fórmula do Hook", row.ai_analysis.hook_formula],
                  ["Estrutura do Conteúdo", row.ai_analysis.content_formula],
                  ["Promessa Principal", row.ai_analysis.promise],
                  ["Por que viralizou", row.ai_analysis.virality_reason],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    <span className="text-foreground text-xs">{value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t space-y-2" style={{ borderColor: ACCENT_BORDER }}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Ângulo de Oferta</span>
                  <p className="text-xs text-foreground">{row.ai_analysis.offer_angle}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Sugestão de Ebook</span>
                  <p className="text-xs font-semibold" style={{ color: ACCENT }}>{row.ai_analysis.ebook_title}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Hook VSL (15s)</span>
                  <p className="text-xs italic text-foreground/80">"{row.ai_analysis.vsl_hook}"</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* actions */}
      <div className="flex flex-wrap gap-2 px-4 pb-4">
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
          onClick={() => navigate({ to: "/produtos/ebook", search: { niche: row.ai_analysis?.ebook_title ?? row.title, prompt: row.ai_analysis?.vsl_hook ?? row.title } as any })}
        >
          <BookOpen className="h-3 w-3 mr-1" />Criar Ebook
        </Button>
        <Button
          size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() => navigate({ to: "/copy", search: { prompt: row.ai_analysis?.vsl_hook ?? row.title } as any })}
        >
          <Zap className="h-3 w-3 mr-1" />Criar VSL
        </Button>
      </div>
    </motion.div>
  );
}

export default function YouTubeRadarPage() {
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(30);
  const [dateFilter, setDateFilter] = useState("");
  const [mining, setMining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [mineResult, setMineResult] = useState<{ inserted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mineVideos = useServerFn(mineYouTubeFn);
  const listVideos = useServerFn(listYouTubeMinedFn);
  const analyzeVideo = useServerFn(analyzeYouTubeVideoFn);
  const deleteVideo = useServerFn(deleteYouTubeVideoFn);
  const clearQuery = useServerFn(clearYouTubeQueryFn);

  const loadVideos = useCallback(async (q?: string) => {
    setLoading(true); setError(null);
    try {
      const rows = await listVideos({ data: { query: q, limit: 200 } });
      setVideos(rows as VideoRow[]);
    } catch (e: any) { setError(e.message ?? "Erro ao carregar"); }
    finally { setLoading(false); }
  }, [listVideos]);

  const handleMine = async () => {
    if (!query.trim()) return;
    setMining(true); setError(null); setMineResult(null);
    try {
      const r = await mineVideos({
        data: {
          query: query.trim(),
          maxResults,
          dateFilter: (dateFilter || undefined) as any,
        },
      });
      setMineResult(r);
      await loadVideos(filterQuery ?? undefined);
    } catch (e: any) { setError(e.message ?? "Erro ao minerar"); }
    finally { setMining(false); }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds((p) => new Set(p).add(id));
    try {
      const analysis = await analyzeVideo({ data: { id } });
      setVideos((p) => p.map((v) => v.id === id ? { ...v, ai_analysis: analysis as YouTubeAiAnalysis } : v));
    } catch (e: any) { setError(e.message ?? "Erro ao analisar"); }
    finally { setAnalyzingIds((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo({ data: { id } });
      setVideos((p) => p.filter((v) => v.id !== id));
    } catch (e: any) { setError(e.message ?? "Erro ao deletar"); }
  };

  const handleClear = async (q: string) => {
    try {
      await clearQuery({ data: { query: q } });
      setVideos((p) => p.filter((v) => v.query !== q));
      if (filterQuery === q) setFilterQuery(null);
    } catch (e: any) { setError(e.message ?? "Erro ao limpar"); }
  };

  const uniqueQueries = [...new Set(videos.map((v) => v.query))];
  const displayed = filterQuery ? videos.filter((v) => v.query === filterQuery) : videos;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: ACCENT, textShadow: "0 0 24px rgba(255,64,64,0.5)" }}>
          Radar YouTube
        </h1>
        <p className="text-sm text-muted-foreground">
          Encontre vídeos virais, analise hooks e transforme tendências em produtos digitais.
        </p>
      </div>

      {/* search panel */}
      <div className="rounded-2xl border bg-white/2 backdrop-blur-md p-4 space-y-3" style={{ borderColor: ACCENT_BORDER, boxShadow: "0 0 40px -10px rgba(255,64,64,0.15)" }}>
        <div className="flex gap-2 flex-wrap">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleMine()}
            placeholder="buscar vídeos no YouTube..."
            className="flex-1 min-w-48 bg-transparent border-white/10 focus:border-[#FF4040]/50"
          />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} vídeos</option>)}
          </select>
          <Button
            onClick={handleMine}
            disabled={mining || !query.trim()}
            className="gap-2 text-white"
            style={{ background: ACCENT, boxShadow: mining ? "none" : "0 0 20px rgba(255,64,64,0.4)" }}
          >
            {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {mining ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs" style={{ color: ACCENT }}>
            {mineResult.inserted} vídeo(s) salvo(s). {mineResult.skipped > 0 ? `${mineResult.skipped} já existiam.` : ""}
          </p>
        )}

        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" disabled={loading} onClick={() => loadVideos(filterQuery ?? undefined)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Carregar salvos
          </Button>
          {uniqueQueries.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                style={filterQuery === null ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                onClick={() => setFilterQuery(null)}
              >Todos ({videos.length})</button>
              {uniqueQueries.map((q) => (
                <div key={q} className="flex items-center gap-0.5">
                  <button
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                    style={filterQuery === q ? { background: ACCENT_BG, borderColor: ACCENT, color: ACCENT } : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }}
                    onClick={() => setFilterQuery(filterQuery === q ? null : q)}
                  >{q} ({videos.filter((v) => v.query === q).length})</button>
                  <button className="text-muted-foreground/40 hover:text-red-400" onClick={() => handleClear(q)}>
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

      {!loading && videos.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <Youtube className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: ACCENT }} />
          <p className="text-sm">Digite uma busca para encontrar vídeos virais.</p>
          <p className="text-xs mt-1 opacity-60">Ex: "emagrecimento rápido", "como ganhar dinheiro online"</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
          <span className="text-sm">Buscando vídeos virais...</span>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayed.map((row) => (
            <VideoCard
              key={row.id}
              row={row}
              onAnalyze={handleAnalyze}
              onDelete={handleDelete}
              analyzing={analyzingIds.has(row.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
