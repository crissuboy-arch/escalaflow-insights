import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  Trash2,
  Sparkles,
  BookOpen,
  Megaphone,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  X,
  Hash,
  ChevronRight,
  Flame,
  Camera,
  AtSign,
  Link2,
  Play,
  ExternalLink,
} from "lucide-react";
import {
  mineInstagramFn,
  listInstagramMinedFn,
  analyzeInstagramPostFn,
  deleteInstagramPostFn,
  clearInstagramSearchFn,
} from "@/lib/instagram-radar.functions";
import type { InstagramAiAnalysis } from "@/lib/instagram-radar.functions";

export const Route = createFileRoute("/_authenticated/instagram-radar")({
  component: InstagramRadarPage,
});

type InstagramRow = {
  id: string;
  search: string;
  search_type: string;
  results_type: string;
  short_code: string;
  post_url: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  comments_count: number;
  likes_count: number;
  owner_username: string;
  owner_full_name: string;
  display_url: string;
  video_url: string | null;
  is_video: boolean;
  engagement_score: number;
  ai_analysis: InstagramAiAnalysis | null;
  created_at: string;
};

type SearchType = "hashtag" | "user" | "url" | "place";
type ResultsType = "posts" | "reels";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const IG_ACCENT = "#E1306C";
const IG_GLOW = "rgba(225,48,108,0.4)";
const IG_BG = "rgba(225,48,108,0.08)";
const IG_BORDER = "rgba(225,48,108,0.25)";

// Real, direct video file URL extracted from Apify's instagram-scraper
// response (previously discarded) — plays it in place with a native
// <video> element, since it's a direct media file, not a page to embed.
function InstagramVideoModal({ row, onClose }: { row: InstagramRow; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-background overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10">
          <span className="text-sm font-medium truncate">@{row.owner_username}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-black">
          {row.video_url ? (
            <video src={row.video_url} controls autoPlay className="w-full max-h-[70vh]" />
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Vídeo não disponível para reprodução — abra o original.
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-3 text-xs text-muted-foreground">
          <a
            href={row.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Abrir no Instagram
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EngagementBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#ff4d4d" : score >= 40 ? "#ff9500" : IG_ACCENT;
  const label = score >= 70 ? "Viral" : score >= 40 ? "Quente" : "Normal";
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
  analysis: InstagramAiAnalysis;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-3 rounded-xl border p-4 space-y-3 text-sm"
      style={{ borderColor: IG_BORDER, background: IG_BG }}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold flex items-center gap-2" style={{ color: IG_ACCENT }}>
          <Sparkles className="h-4 w-4" /> Análise IA
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {(
          [
            ["Nicho", analysis.niche],
            ["Promessa", analysis.promise],
            ["Emoção dominante", analysis.emotion],
            ["Fórmula do Hook", analysis.hook_formula],
            ["Ângulo de Oferta", analysis.offer_angle],
            ["Por que engajou", analysis.virality_reason],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className="text-foreground">{value}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t space-y-2" style={{ borderColor: IG_BORDER }}>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sugestão de Título Ebook
          </span>
          <span className="font-medium" style={{ color: IG_ACCENT }}>
            {analysis.ebook_title}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Caption Hook (alta conversão)
          </span>
          <span className="text-foreground italic">"{analysis.caption_hook}"</span>
        </div>
      </div>
    </motion.div>
  );
}

function PostCard({
  row,
  onAnalyze,
  onDelete,
  analyzing,
}: {
  row: InstagramRow;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  analyzing: boolean;
}) {
  const navigate = useNavigate();
  const [showAnalysis, setShowAnalysis] = useState(!!row.ai_analysis);
  const [imgError, setImgError] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-md p-4 space-y-3 transition-colors duration-300"
      style={{ boxShadow: "0 2px 24px 0 rgba(225,48,108,0.06)" }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = IG_BORDER)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)")
      }
    >
      <AnimatePresence>
        {showPlayer && <InstagramVideoModal row={row} onClose={() => setShowPlayer(false)} />}
      </AnimatePresence>
      <div className="flex items-start gap-3">
        {/* thumbnail — click plays the real video when the post is a video */}
        {row.display_url && !imgError ? (
          <button
            type="button"
            onClick={() => row.is_video && setShowPlayer(true)}
            className="relative h-16 w-16 rounded-xl shrink-0 overflow-hidden group"
          >
            <img
              src={row.display_url}
              alt=""
              onError={() => setImgError(true)}
              className="h-16 w-16 rounded-xl object-cover bg-white/5"
            />
            {row.is_video && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                <Play className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="currentColor" />
              </span>
            )}
          </button>
        ) : (
          <div
            className="h-16 w-16 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: IG_BG, border: `1px solid ${IG_BORDER}` }}
          >
            <Camera className="h-6 w-6 opacity-30" style={{ color: IG_ACCENT }} />
          </div>
        )}

        {/* header */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <EngagementBadge score={row.engagement_score} />
            <span className="text-xs text-muted-foreground">@{row.owner_username}</span>
            {row.owner_full_name && (
              <span className="text-[10px] text-muted-foreground/60 truncate max-w-[100px]">
                {row.owner_full_name}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-snug">{row.caption}</p>
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
        {row.likes_count > 0 && (
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {fmtNum(row.likes_count)}
          </span>
        )}
        {row.comments_count > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {fmtNum(row.comments_count)}
          </span>
        )}
        <span className="flex items-center gap-1 capitalize text-muted-foreground/60">
          {row.results_type}
        </span>
      </div>

      {/* hashtags */}
      {row.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.hashtags.slice(0, 7).map((h) => (
            <span
              key={h}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: IG_BG, color: IG_ACCENT, border: `1px solid ${IG_BORDER}` }}
            >
              #{h}
            </span>
          ))}
          {row.hashtags.length > 7 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{row.hashtags.length - 7}
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
          className="h-7 px-3 text-xs"
          style={{
            borderColor: IG_BORDER,
            color: IG_ACCENT,
          }}
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
                prompt: row.ai_analysis?.ebook_title ?? row.caption,
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
                prompt: row.ai_analysis?.offer_angle ?? row.caption,
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
                hook: row.ai_analysis?.caption_hook ?? row.caption,
              } as any,
            })
          }
        >
          <Megaphone className="h-3 w-3 mr-1" />
          Criar Criativo
        </Button>

        {row.post_url && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground ml-auto"
            asChild
          >
            <a href={row.post_url} target="_blank" rel="noopener noreferrer">
              Ver no Instagram
              <ChevronRight className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

const SEARCH_TYPE_OPTS: { value: SearchType; label: string; icon: typeof Hash }[] = [
  { value: "hashtag", label: "Hashtag", icon: Hash },
  { value: "user", label: "Perfil", icon: AtSign },
  { value: "url", label: "URL", icon: Link2 },
];

const RESULTS_TYPE_OPTS: { value: ResultsType; label: string }[] = [
  { value: "posts", label: "Posts" },
  { value: "reels", label: "Reels" },
];

function placeholderFor(type: SearchType): string {
  if (type === "hashtag") return "hashtag (ex: fitness, emagrecimento)";
  if (type === "user") return "@username (ex: natgeo)";
  if (type === "url") return "URL do post ou reel";
  return "local (ex: São Paulo)";
}

function InstagramRadarPage() {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("hashtag");
  const [resultsType, setResultsType] = useState<ResultsType>("posts");
  const [limit, setLimit] = useState(50);
  const [mining, setMining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<InstagramRow[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [filterSearch, setFilterSearch] = useState<string | null>(null);
  const [mineResult, setMineResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mineInstagram = useServerFn(mineInstagramFn);
  const listMined = useServerFn(listInstagramMinedFn);
  const analyzePost = useServerFn(analyzeInstagramPostFn);
  const deletePost = useServerFn(deleteInstagramPostFn);
  const clearSearch = useServerFn(clearInstagramSearchFn);

  const loadPosts = useCallback(
    async (searchFilter?: string) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listMined({ data: { search: searchFilter, limit: 200, sortBy: "score" } });
        setPosts(rows as InstagramRow[]);
      } catch (e: any) {
        setError(e.message ?? "Erro ao carregar posts");
      } finally {
        setLoading(false);
      }
    },
    [listMined],
  );

  const handleMine = async () => {
    if (!search.trim()) return;
    setMining(true);
    setError(null);
    setMineResult(null);
    try {
      const result = await mineInstagram({
        data: { search: search.trim(), searchType, resultsType, limit },
      });
      setMineResult(result);
      await loadPosts(filterSearch ?? undefined);
    } catch (e: any) {
      setError(e.message ?? "Erro ao minerar");
    } finally {
      setMining(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(id));
    try {
      const analysis = await analyzePost({ data: { id } });
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ai_analysis: analysis as InstagramAiAnalysis } : p)),
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
      await deletePost({ data: { id } });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setError(e.message ?? "Erro ao deletar");
    }
  };

  const handleClearSearch = async (s: string) => {
    try {
      await clearSearch({ data: { search: s } });
      setPosts((prev) => prev.filter((p) => p.search !== s));
      if (filterSearch === s) setFilterSearch(null);
    } catch (e: any) {
      setError(e.message ?? "Erro ao limpar");
    }
  };

  const uniqueSearches = [...new Set(posts.map((p) => p.search))];
  const displayed = filterSearch ? posts.filter((p) => p.search === filterSearch) : posts;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* header */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: IG_ACCENT, textShadow: `0 0 24px ${IG_GLOW}` }}
        >
          Radar Instagram
        </h1>
        <p className="text-sm text-muted-foreground">
          Minere posts e reels virais por hashtag, perfil ou URL. Analise com IA e crie produtos em segundos.
        </p>
      </div>

      {/* search bar */}
      <div
        className="rounded-2xl border bg-white/2 backdrop-blur-md p-4 space-y-3"
        style={{ borderColor: IG_BORDER, boxShadow: `0 0 40px -10px ${IG_GLOW}` }}
      >
        {/* type selector */}
        <div className="flex gap-1">
          {SEARCH_TYPE_OPTS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSearchType(value)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                searchType === value
                  ? { background: IG_BG, color: IG_ACCENT, border: `1px solid ${IG_BORDER}` }
                  : { color: "var(--muted-foreground)", border: "1px solid transparent" }
              }
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
          <div className="flex-1" />
          {RESULTS_TYPE_OPTS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setResultsType(value)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                resultsType === value
                  ? { background: IG_BG, color: IG_ACCENT, border: `1px solid ${IG_BORDER}` }
                  : { color: "var(--muted-foreground)", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* search input row */}
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleMine()}
            placeholder={placeholderFor(searchType)}
            className="flex-1 bg-transparent border-white/10 focus:border-[#E1306C]/50"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} posts
              </option>
            ))}
          </select>
          <Button
            onClick={handleMine}
            disabled={mining || !search.trim()}
            className="gap-2 text-white"
            style={{
              background: IG_ACCENT,
              boxShadow: mining ? "none" : `0 0 20px ${IG_GLOW}`,
            }}
          >
            {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {mining ? "Minerando..." : "Minerar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs" style={{ color: IG_ACCENT }}>
            Mineração concluída: {mineResult.inserted} novos posts salvos
            {mineResult.skipped > 0 ? `, ${mineResult.skipped} duplicados ignorados` : ""}.
          </p>
        )}

        {/* filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-white/10"
            disabled={loading}
            onClick={() => loadPosts(filterSearch ?? undefined)}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Carregar salvos
          </Button>

          {uniqueSearches.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                style={
                  filterSearch === null
                    ? { background: IG_BG, borderColor: IG_ACCENT, color: IG_ACCENT }
                    : { borderColor: "rgba(255,255,255,0.1)", color: "var(--muted-foreground)" }
                }
                onClick={() => setFilterSearch(null)}
              >
                Todos ({posts.length})
              </button>
              {uniqueSearches.map((s) => (
                <div key={s} className="flex items-center gap-0.5">
                  <button
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                    style={
                      filterSearch === s
                        ? { background: IG_BG, borderColor: IG_ACCENT, color: IG_ACCENT }
                        : {
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "var(--muted-foreground)",
                          }
                    }
                    onClick={() => setFilterSearch(filterSearch === s ? null : s)}
                  >
                    {s} ({posts.filter((p) => p.search === s).length})
                  </button>
                  <button
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                    title={`Limpar "${s}"`}
                    onClick={() => handleClearSearch(s)}
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
      {!loading && posts.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            Digite uma hashtag, perfil ou URL e clique em Minerar para começar.
          </p>
          <p className="text-xs mt-1 opacity-60">
            Ou clique em "Carregar salvos" para ver posts já minerados.
          </p>
        </div>
      )}

      {/* loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: IG_ACCENT }} />
          <span className="text-sm">Carregando posts...</span>
        </div>
      )}

      {/* cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayed.map((row) => (
            <PostCard
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
