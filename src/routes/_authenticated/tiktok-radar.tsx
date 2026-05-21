import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  Trash2,
  Sparkles,
  BookOpen,
  Megaphone,
  Video,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Music2,
  TrendingUp,
  X,
  Hash,
  ChevronRight,
  Flame,
} from "lucide-react";
import {
  mineTikTokHashtagFn,
  listTikTokMinedFn,
  analyzeTikTokVideoFn,
  deleteTikTokVideoFn,
  clearTikTokHashtagFn,
} from "@/lib/tiktok-radar.functions";
import type { TikTokAiAnalysis } from "@/lib/tiktok-radar.functions";

export const Route = createFileRoute("/_authenticated/tiktok-radar")({
  component: TikTokRadarPage,
});

type TikTokRow = {
  id: string;
  hashtag: string;
  video_id: string;
  creator: string;
  video_url: string;
  hook: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  audio_title: string;
  viral_score: number;
  description: string;
  create_time: string | null;
  ai_analysis: TikTokAiAnalysis | null;
  created_at: string;
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ViralScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "#ff4d4d" : score >= 45 ? "#ff9500" : "#3BA3FF";
  const label = score >= 70 ? "Viral" : score >= 45 ? "Quente" : "Normal";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <Flame className="h-3 w-3" />
      {score} · {label}
    </span>
  );
}

function AiAnalysisPanel({
  analysis,
  onClose,
}: {
  analysis: TikTokAiAnalysis;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-3 rounded-xl border border-[#0A6CFF]/30 bg-[#0A6CFF]/5 p-4 space-y-3 text-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-[#3BA3FF] font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Análise IA
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {[
          ["Nicho", analysis.niche],
          ["Promessa", analysis.promise],
          ["Emoção dominante", analysis.emotion],
          ["Fórmula do Hook", analysis.hook_formula],
          ["Ângulo de Oferta", analysis.offer_angle],
          ["Por que viralizou", analysis.virality_reason],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="text-foreground">{value}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-[#0A6CFF]/20 space-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sugestão de Título Ebook
          </span>
          <span className="text-[#3BA3FF] font-medium">{analysis.ebook_title}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook VSL (15s)</span>
          <span className="text-foreground italic">"{analysis.vsl_hook}"</span>
        </div>
      </div>
    </motion.div>
  );
}

function VideoCard({
  row,
  onAnalyze,
  onDelete,
  analyzing,
}: {
  row: TikTokRow;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  analyzing: boolean;
}) {
  const navigate = useNavigate();
  const [showAnalysis, setShowAnalysis] = useState(!!row.ai_analysis);

  const toUrl = (url: string) => (url ? url : undefined);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-md p-4 space-y-3 hover:border-[#0A6CFF]/40 transition-colors duration-300"
      style={{ boxShadow: "0 2px 24px 0 rgba(10,108,255,0.06)" }}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <ViralScoreBadge score={row.viral_score} />
            <span className="text-xs text-muted-foreground">@{row.creator}</span>
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-snug">{row.hook}</p>
        </div>
        <button
          onClick={() => onDelete(row.id)}
          className="shrink-0 text-muted-foreground/50 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* stats */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {[
          { icon: Eye, val: row.views },
          { icon: Heart, val: row.likes },
          { icon: MessageCircle, val: row.comments },
          { icon: Share2, val: row.shares },
        ].map(({ icon: Icon, val }) => (
          <span key={Icon.displayName} className="flex items-center gap-1">
            <Icon className="h-3.5 w-3.5" /> {fmtNum(val)}
          </span>
        ))}
        {row.audio_title && (
          <span className="flex items-center gap-1 truncate max-w-[140px]">
            <Music2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{row.audio_title}</span>
          </span>
        )}
      </div>

      {/* hashtags */}
      {row.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.hashtags.slice(0, 6).map((h) => (
            <span
              key={h}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#0A6CFF]/10 text-[#3BA3FF]"
            >
              #{h}
            </span>
          ))}
          {row.hashtags.length > 6 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{row.hashtags.length - 6}
            </span>
          )}
        </div>
      )}

      {/* ai analysis */}
      <AnimatePresence>
        {showAnalysis && row.ai_analysis && (
          <AiAnalysisPanel
            analysis={row.ai_analysis}
            onClose={() => setShowAnalysis(false)}
          />
        )}
      </AnimatePresence>

      {/* actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs border-[#0A6CFF]/30 text-[#3BA3FF] hover:bg-[#0A6CFF]/10 hover:border-[#0A6CFF]/60"
          disabled={analyzing}
          onClick={() => {
            if (row.ai_analysis) {
              setShowAnalysis((v) => !v);
            } else {
              onAnalyze(row.id);
            }
          }}
        >
          {analyzing ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1" />
          )}
          {row.ai_analysis ? (showAnalysis ? "Ocultar IA" : "Ver Análise") : "Analisar com IA"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() =>
            navigate({
              to: "/produtos/ebook",
              search: {
                niche: row.ai_analysis?.niche ?? row.hashtags[0] ?? "",
                prompt: row.ai_analysis?.ebook_title ?? row.hook,
              } as any,
            })
          }
        >
          <BookOpen className="h-3 w-3 mr-1" />
          Criar Ebook
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() =>
            navigate({
              to: "/copy",
              search: {
                prompt: row.ai_analysis?.offer_angle ?? row.hook,
              } as any,
            })
          }
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          Criar Oferta
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs border-white/10 hover:bg-white/5"
          onClick={() =>
            navigate({
              to: "/criativos",
              search: {
                hook: row.ai_analysis?.vsl_hook ?? row.hook,
              } as any,
            })
          }
        >
          <Video className="h-3 w-3 mr-1" />
          Criar VSL
        </Button>

        {toUrl(row.video_url) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground ml-auto"
            asChild
          >
            <a href={row.video_url} target="_blank" rel="noopener noreferrer">
              Ver no TikTok
              <ChevronRight className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function TikTokRadarPage() {
  const [hashtag, setHashtag] = useState("");
  const [limit, setLimit] = useState(20);
  const [mining, setMining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<TikTokRow[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [filterHashtag, setFilterHashtag] = useState<string | null>(null);
  const [mineResult, setMineResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mineHashtag = useServerFn(mineTikTokHashtagFn);
  const listMined = useServerFn(listTikTokMinedFn);
  const analyzeVideo = useServerFn(analyzeTikTokVideoFn);
  const deleteVideo = useServerFn(deleteTikTokVideoFn);
  const clearHashtag = useServerFn(clearTikTokHashtagFn);

  const loadVideos = useCallback(
    async (htag?: string) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listMined({ data: { hashtag: htag, limit: 200 } });
        setVideos(rows as TikTokRow[]);
      } catch (e: any) {
        setError(e.message ?? "Erro ao carregar vídeos");
      } finally {
        setLoading(false);
      }
    },
    [listMined],
  );

  const handleMine = async () => {
    if (!hashtag.trim()) return;
    setMining(true);
    setError(null);
    setMineResult(null);
    try {
      const result = await mineHashtag({
        data: { hashtag: hashtag.trim().replace(/^#/, ""), limit },
      });
      setMineResult(result);
      await loadVideos(filterHashtag ?? undefined);
    } catch (e: any) {
      setError(e.message ?? "Erro ao minerar");
    } finally {
      setMining(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(id));
    try {
      const analysis = await analyzeVideo({ data: { id } });
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ai_analysis: analysis as TikTokAiAnalysis } : v)),
      );
    } catch (e: any) {
      setError(e.message ?? "Erro ao analisar");
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo({ data: { id } });
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e: any) {
      setError(e.message ?? "Erro ao deletar");
    }
  };

  const handleClearHashtag = async (htag: string) => {
    try {
      await clearHashtag({ data: { hashtag: htag } });
      setVideos((prev) => prev.filter((v) => v.hashtag !== htag));
      if (filterHashtag === htag) setFilterHashtag(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao limpar");
    }
  };

  const uniqueHashtags = [...new Set(videos.map((v) => v.hashtag))];
  const displayed = filterHashtag ? videos.filter((v) => v.hashtag === filterHashtag) : videos;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* header */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "#3BA3FF", textShadow: "0 0 24px rgba(10,108,255,0.5)" }}
        >
          Radar TikTok
        </h1>
        <p className="text-sm text-muted-foreground">
          Minere vídeos virais por hashtag, analise com IA e crie produtos digitais em segundos.
        </p>
      </div>

      {/* search bar */}
      <div
        className="rounded-2xl border border-[#0A6CFF]/20 bg-white/2 backdrop-blur-md p-4 space-y-3"
        style={{ boxShadow: "0 0 40px -10px rgba(10,108,255,0.12)" }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMine()}
              placeholder="hashtag (ex: dropshipping, emagrecimento, tiktokshop)"
              className="pl-9 bg-transparent border-white/10 focus:border-[#0A6CFF]/50"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} vídeos
              </option>
            ))}
          </select>
          <Button
            onClick={handleMine}
            disabled={mining || !hashtag.trim()}
            className="gap-2 bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white"
            style={{ boxShadow: mining ? "none" : "0 0 20px rgba(10,108,255,0.4)" }}
          >
            {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {mining ? "Minerando..." : "Minerar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs text-[#3BA3FF]">
            Mineração concluída: {mineResult.inserted} novos vídeos salvos
            {mineResult.skipped > 0 ? `, ${mineResult.skipped} duplicados ignorados` : ""}.
          </p>
        )}

        <div className="flex gap-2 items-center flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-white/10"
            disabled={loading}
            onClick={() => loadVideos(filterHashtag ?? undefined)}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Carregar salvos
          </Button>

          {uniqueHashtags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                  filterHashtag === null
                    ? "bg-[#0A6CFF]/20 border-[#0A6CFF]/50 text-[#3BA3FF]"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
                onClick={() => setFilterHashtag(null)}
              >
                Todos ({videos.length})
              </button>
              {uniqueHashtags.map((h) => (
                <div key={h} className="flex items-center gap-0.5">
                  <button
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                      filterHashtag === h
                        ? "bg-[#0A6CFF]/20 border-[#0A6CFF]/50 text-[#3BA3FF]"
                        : "border-white/10 text-muted-foreground hover:border-white/20"
                    }`}
                    onClick={() => setFilterHashtag(filterHashtag === h ? null : h)}
                  >
                    #{h} ({videos.filter((v) => v.hashtag === h).length})
                  </button>
                  <button
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                    title={`Limpar #${h}`}
                    onClick={() => handleClearHashtag(h)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* empty state */}
      {!loading && videos.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <Hash className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Digite uma hashtag e clique em Minerar para começar.</p>
          <p className="text-xs mt-1 opacity-60">
            Ou clique em "Carregar salvos" para ver vídeos já minerados.
          </p>
        </div>
      )}

      {/* loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#3BA3FF]" />
          <span className="text-sm">Carregando vídeos...</span>
        </div>
      )}

      {/* cards */}
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
