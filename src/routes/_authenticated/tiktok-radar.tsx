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
  Play,
  ShoppingBag,
  Zap,
  Users,
  Trophy,
  Clapperboard,
  Bookmark,
  Copy,
  FileText,
  Star,
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

// ── Tab definitions ──────────────────────────────────────────────────────────

type RadarTab =
  | "trending"
  | "viral-hooks"
  | "tiktok-shop"
  | "ads-spy"
  | "creators"
  | "winning-products"
  | "vsls";

const TABS: {
  id: RadarTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultHashtag: string;
  description: string;
}[] = [
  {
    id: "trending",
    label: "Trending",
    icon: TrendingUp,
    defaultHashtag: "viral",
    description: "Vídeos em alta agora — ordenados pelo viral score",
  },
  {
    id: "viral-hooks",
    label: "Viral Hooks",
    icon: Zap,
    defaultHashtag: "hook",
    description: "Os melhores hooks virais (score 60+)",
  },
  {
    id: "tiktok-shop",
    label: "TikTok Shop",
    icon: ShoppingBag,
    defaultHashtag: "tiktokshop",
    description: "Produtos virais na TikTok Shop",
  },
  {
    id: "ads-spy",
    label: "Ads Spy",
    icon: Megaphone,
    defaultHashtag: "adsnotsponsored",
    description: "Criativos e anúncios em evidência",
  },
  {
    id: "creators",
    label: "Creators",
    icon: Users,
    defaultHashtag: "contentcreator",
    description: "Top criadores por nicho",
  },
  {
    id: "winning-products",
    label: "Winning Products",
    icon: Trophy,
    defaultHashtag: "dropshipping",
    description: "Produtos ganhadores validados pelo mercado",
  },
  {
    id: "vsls",
    label: "VSLs",
    icon: Clapperboard,
    defaultHashtag: "vsl",
    description: "Video Sales Letters de alta conversão",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type TikTokRow = {
  id: string;
  hashtag: string;
  video_id: string;
  creator: string;
  video_url: string;
  thumbnail_url: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function creatorInitial(name: string): string {
  return (name?.[0] ?? "?").toUpperCase();
}

// ── ViralBadge ────────────────────────────────────────────────────────────────

function ViralBadge({ score }: { score: number }) {
  const [color, label, icon] =
    score >= 70
      ? ["#ff4d4d", "Viral", "🔥"]
      : score >= 45
        ? ["#ff9500", "Quente", "⚡"]
        : ["#3BA3FF", "Normal", ""];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {icon} {score} · {label}
    </span>
  );
}

// ── VideoModal ────────────────────────────────────────────────────────────────

function VideoModal({
  row,
  onClose,
  onAnalyze,
  analyzing,
  onAction,
}: {
  row: TikTokRow;
  onClose: () => void;
  onAnalyze: (id: string) => void;
  analyzing: boolean;
  onAction: (action: string, row: TikTokRow) => void;
}) {
  const embedUrl = row.video_id
    ? `https://www.tiktok.com/embed/v2/${row.video_id}`
    : null;

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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: "#0a0a12",
          boxShadow: "0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
          maxHeight: "92vh",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-white/8 hover:bg-white/15 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col lg:flex-row overflow-auto" style={{ maxHeight: "92vh" }}>
          {/* ── Video panel ── */}
          <div
            className="lg:w-[300px] xl:w-[320px] shrink-0 flex-col bg-black overflow-hidden"
            style={{ minHeight: 400 }}
          >
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full"
                style={{ height: 560, border: 0 }}
                allowFullScreen
                allow="encrypted-media"
                title="TikTok Video"
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center text-muted-foreground"
                style={{ height: 560 }}
              >
                <Play className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Vídeo indisponível</p>
                {row.video_url && (
                  <a
                    href={row.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-xs text-[#3BA3FF] hover:underline"
                  >
                    Abrir no TikTok
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Details panel ── */}
          <div className="flex-1 p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 560 }}>
            {/* Creator & badge */}
            <div className="flex items-start gap-3 pr-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{
                  background: "linear-gradient(135deg, #ff0050, #00f2ea)",
                }}
              >
                {creatorInitial(row.creator)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-foreground">@{row.creator}</span>
                  <ViralBadge score={row.viral_score} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {row.description || row.hook}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Eye, label: "Views", val: row.views, color: "#3BA3FF" },
                { icon: Heart, label: "Likes", val: row.likes, color: "#ff4d4d" },
                { icon: MessageCircle, label: "Coment.", val: row.comments, color: "#ff9500" },
                { icon: Share2, label: "Shares", val: row.shares, color: "#00c896" },
              ].map(({ icon: Icon, label, val, color }) => (
                <div
                  key={label}
                  className="text-center rounded-xl border border-white/8 bg-white/3 py-2 px-1"
                >
                  <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color }} />
                  <div className="text-sm font-bold text-foreground">{fmtNum(val)}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Hashtags */}
            {row.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.hashtags.map((h) => (
                  <span
                    key={h}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#0A6CFF]/10 text-[#3BA3FF]"
                  >
                    #{h}
                  </span>
                ))}
              </div>
            )}

            {/* Audio */}
            {row.audio_title && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music2 className="h-3.5 w-3.5 shrink-0 text-[#00f2ea]" />
                <span className="truncate">{row.audio_title}</span>
              </div>
            )}

            {/* AI Analysis */}
            {row.ai_analysis ? (
              <div className="rounded-xl border border-[#0A6CFF]/25 bg-[#0A6CFF]/6 p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#3BA3FF] font-semibold text-sm">
                  <Sparkles className="h-4 w-4" />
                  Análise IA
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Nicho", row.ai_analysis.niche],
                    ["Promessa", row.ai_analysis.promise],
                    ["Emoção dominante", row.ai_analysis.emotion],
                    ["Fórmula do Hook", row.ai_analysis.hook_formula],
                    ["Ângulo de Oferta", row.ai_analysis.offer_angle],
                    ["Por que viralizou", row.ai_analysis.virality_reason],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label} className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {label}
                        </div>
                        <div className="text-foreground text-xs leading-snug">{value}</div>
                      </div>
                    ))}
                </div>
                {(row.ai_analysis.ebook_title || row.ai_analysis.vsl_hook) && (
                  <div className="border-t border-[#0A6CFF]/20 pt-3 space-y-2">
                    {row.ai_analysis.ebook_title && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Título Ebook sugerido
                        </div>
                        <div className="text-xs text-[#3BA3FF] font-medium">
                          {row.ai_analysis.ebook_title}
                        </div>
                      </div>
                    )}
                    {row.ai_analysis.vsl_hook && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Hook VSL (15s)
                        </div>
                        <div className="text-xs text-foreground italic">
                          "{row.ai_analysis.vsl_hook}"
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => onAnalyze(row.id)}
                disabled={analyzing}
                className="w-full bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white"
                style={
                  analyzing ? {} : { boxShadow: "0 0 20px rgba(10,108,255,0.35)" }
                }
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {analyzing ? "Analisando com IA..." : "Analisar com IA"}
              </Button>
            )}

            {/* Action grid */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { icon: Bookmark, label: "Salvar Anúncio", action: "save" },
                  { icon: Megaphone, label: "Gerar Criativo", action: "creative" },
                  { icon: BookOpen, label: "Gerar Ebook", action: "ebook" },
                  { icon: FileText, label: "Gerar Playbook", action: "playbook" },
                  { icon: Video, label: "Gerar VSL", action: "vsl" },
                  { icon: Copy, label: "Clonar Estrutura", action: "clone" },
                ] as const
              ).map(({ icon: Icon, label, action }) => (
                <Button
                  key={action}
                  size="sm"
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3 border-white/10 hover:bg-white/5 hover:border-[#0A6CFF]/40 text-[11px] leading-tight"
                  onClick={() => onAction(action, row)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-center">{label}</span>
                </Button>
              ))}
            </div>

            {/* External link */}
            {row.video_url && (
              <a
                href={row.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver original no TikTok <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── VideoCard ─────────────────────────────────────────────────────────────────

function VideoCard({
  row,
  onClick,
  onDelete,
}: {
  row: TikTokRow;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative rounded-2xl border border-white/8 bg-[#0d0d16] overflow-hidden cursor-pointer"
      style={{
        boxShadow: hovered
          ? "0 8px 40px rgba(10,108,255,0.18), 0 0 0 1px rgba(10,108,255,0.3)"
          : "0 2px 12px rgba(0,0,0,0.4)",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
        borderColor: hovered ? "rgba(10,108,255,0.35)" : "rgba(255,255,255,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
        {row.thumbnail_url ? (
          <img
            src={row.thumbnail_url}
            alt={row.hook}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,0,80,0.12) 0%, rgba(0,242,234,0.08) 100%)",
            }}
          >
            <Play className="h-10 w-10 text-white/15" />
          </div>
        )}

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-250"
          style={{
            background: "rgba(0,0,0,0.3)",
            opacity: hovered ? 1 : 0,
          }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 bg-white/15">
            <Play className="h-5 w-5 text-white ml-0.5" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2">
          <ViralBadge score={row.viral_score} />
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/40 hover:text-red-400 hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>

        {/* AI analysis indicator */}
        {row.ai_analysis && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 bg-[#0A6CFF]/80 backdrop-blur-sm">
            <Sparkles className="h-2.5 w-2.5 text-white" />
            <span className="text-[9px] text-white font-medium">IA</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Creator */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}
          >
            {creatorInitial(row.creator)}
          </div>
          <span className="text-xs text-muted-foreground truncate">@{row.creator}</span>
        </div>

        {/* Hook */}
        <p className="text-xs text-foreground/90 line-clamp-2 leading-snug">{row.hook}</p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {fmtNum(row.views)}
          </span>
          <span className="flex items-center gap-0.5">
            <Heart className="h-3 w-3" />
            {fmtNum(row.likes)}
          </span>
          <span className="flex items-center gap-0.5">
            <Share2 className="h-3 w-3" />
            {fmtNum(row.shares)}
          </span>
        </div>

        {/* Top hashtags */}
        {row.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {row.hashtags.slice(0, 3).map((h) => (
              <span
                key={h}
                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-[#0A6CFF]/10 text-[#3BA3FF]"
              >
                #{h}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── CreatorsView ──────────────────────────────────────────────────────────────

function CreatorsView({
  videos,
  onSelect,
  onDelete,
}: {
  videos: TikTokRow[];
  onSelect: (row: TikTokRow) => void;
  onDelete: (id: string) => void;
}) {
  const byCreator = videos.reduce<Record<string, TikTokRow[]>>((acc, v) => {
    (acc[v.creator] = acc[v.creator] ?? []).push(v);
    return acc;
  }, {});

  const sorted = Object.entries(byCreator).sort(
    ([, a], [, b]) =>
      b.reduce((s, v) => s + v.views, 0) - a.reduce((s, v) => s + v.views, 0),
  );

  return (
    <div className="space-y-6">
      {sorted.map(([creator, vids]) => {
        const totalViews = vids.reduce((s, v) => s + v.views, 0);
        const avgScore = Math.round(vids.reduce((s, v) => s + v.viral_score, 0) / vids.length);
        return (
          <div key={creator}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}
              >
                {creatorInitial(creator)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">@{creator}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{vids.length} vídeos</span>
                  <span>{fmtNum(totalViews)} views</span>
                  <span>Score médio: {avgScore}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {vids.slice(0, 5).map((row) => (
                <VideoCard
                  key={row.id}
                  row={row}
                  onClick={() => onSelect(row)}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function TikTokRadarPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<RadarTab>("trending");
  const [hashtag, setHashtag] = useState("");
  const [limit, setLimit] = useState(20);
  const [mining, setMining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<TikTokRow[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<TikTokRow | null>(null);
  const [filterHashtag, setFilterHashtag] = useState<string | null>(null);
  const [mineResult, setMineResult] = useState<{ inserted: number; skipped: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const mineHashtag = useServerFn(mineTikTokHashtagFn);
  const listMined = useServerFn(listTikTokMinedFn);
  const analyzeVideo = useServerFn(analyzeTikTokVideoFn);
  const deleteVideo = useServerFn(deleteTikTokVideoFn);
  const clearHashtag = useServerFn(clearTikTokHashtagFn);

  const activeTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const loadVideos = useCallback(
    async (htag?: string) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listMined({ data: { hashtag: htag, limit: 200 } });
        setVideos(rows as TikTokRow[]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar vídeos");
      } finally {
        setLoading(false);
      }
    },
    [listMined],
  );

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMine = async () => {
    const query = (hashtag.trim() || activeTabDef.defaultHashtag).replace(/^#/, "");
    setMining(true);
    setError(null);
    setMineResult(null);
    try {
      const result = await mineHashtag({ data: { hashtag: query, limit } });
      setMineResult(result);
      await loadVideos(filterHashtag ?? undefined);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao minerar");
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
      setSelectedVideo((prev) =>
        prev?.id === id ? { ...prev, ai_analysis: analysis as TikTokAiAnalysis } : prev,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao analisar");
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
      if (selectedVideo?.id === id) setSelectedVideo(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao deletar");
    }
  };

  const handleClearHashtag = async (htag: string) => {
    try {
      await clearHashtag({ data: { hashtag: htag } });
      setVideos((prev) => prev.filter((v) => v.hashtag !== htag));
      if (filterHashtag === htag) setFilterHashtag(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao limpar");
    }
  };

  const handleAction = (action: string, row: TikTokRow) => {
    const ctx = [
      `Hook TikTok: ${row.hook}`,
      row.ai_analysis?.niche ? `Nicho: ${row.ai_analysis.niche}` : "",
      row.ai_analysis?.promise ? `Promessa: ${row.ai_analysis.promise}` : "",
      row.ai_analysis?.offer_angle ? `Ângulo de oferta: ${row.ai_analysis.offer_angle}` : "",
      row.ai_analysis?.vsl_hook ? `Hook VSL sugerido: ${row.ai_analysis.vsl_hook}` : "",
      `Criador: @${row.creator}`,
      `Views: ${fmtNum(row.views)} · Likes: ${fmtNum(row.likes)}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      sessionStorage.setItem("tiktok_radar_context", ctx);
    } catch {
      // ignore
    }

    switch (action) {
      case "ebook":
        navigate({ to: "/produtos/ebook" });
        break;
      case "playbook":
        navigate({ to: "/copy" });
        break;
      case "vsl":
        navigate({ to: "/pagina-venda" });
        break;
      case "creative":
        navigate({ to: "/criativos" });
        break;
      case "clone":
        navigate({ to: "/copy" });
        break;
      case "save":
        navigate({ to: "/ofertas-salvas" });
        break;
    }
  };

  // ── Tab-specific filtering ──────────────────────────────────────────────────

  const base = filterHashtag ? videos.filter((v) => v.hashtag === filterHashtag) : videos;

  const tabFiltered: TikTokRow[] =
    activeTab === "viral-hooks"
      ? base.filter((v) => v.viral_score >= 60)
      : activeTab === "tiktok-shop"
        ? base.filter((v) =>
            v.hashtags?.some((h) =>
              ["tiktokshop", "shop", "tiktokmademebuyit", "produto", "shopnow"].includes(
                h.toLowerCase(),
              ),
            ),
          )
        : activeTab === "ads-spy"
          ? base.filter((v) =>
              v.hashtags?.some((h) =>
                ["ads", "adsnotsponsored", "ugcads", "ugc", "sponsored", "ad"].includes(
                  h.toLowerCase(),
                ),
              ),
            )
          : activeTab === "winning-products"
            ? base.filter((v) =>
                v.hashtags?.some((h) =>
                  [
                    "dropshipping",
                    "produto",
                    "winningproduct",
                    "product",
                    "ecommerce",
                    "shopify",
                  ].includes(h.toLowerCase()),
                ),
              )
            : activeTab === "vsls"
              ? base.filter(
                  (v) =>
                    v.hashtags?.some((h) =>
                      ["vsl", "videovendas", "salesletter"].includes(h.toLowerCase()),
                    ) || v.viral_score >= 55,
                )
              : base; // trending and creators use base

  const uniqueHashtags = [...new Set(videos.map((v) => v.hashtag))];

  const viralCount = videos.filter((v) => v.viral_score >= 70).length;
  const hotCount = videos.filter((v) => v.viral_score >= 45 && v.viral_score < 70).length;
  const aiCount = videos.filter((v) => v.ai_analysis).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-16">
      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #060610 0%, #0a0820 40%, #120010 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 15% 60%, rgba(255,0,80,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 40%, rgba(0,242,234,0.12) 0%, transparent 55%)",
          }}
        />
        <div className="relative px-6 py-7 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}
              >
                <Play className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">TikTok Radar</h1>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,0,80,0.15)",
                  color: "#ff6680",
                  border: "1px solid rgba(255,0,80,0.25)",
                }}
              >
                BETA
              </span>
            </div>
            <p className="text-sm text-white/55 max-w-md">
              Espione vídeos virais, analise hooks com IA e crie produtos digitais em segundos.
            </p>
            <div className="flex gap-5 mt-4 text-xs text-white/45">
              <span>
                <span className="font-bold text-white/70 mr-1">{viralCount}</span>virais
              </span>
              <span>
                <span className="font-bold text-white/70 mr-1">{hotCount}</span>quentes
              </span>
              <span>
                <span className="font-bold text-white/70 mr-1">{aiCount}</span>com análise IA
              </span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-3xl font-bold text-white/80">{videos.length}</div>
            <div className="text-xs text-white/40">vídeos</div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0"
              style={
                isActive
                  ? {
                      background: "#0A6CFF",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(10,108,255,0.4)",
                    }
                  : {
                      color: "hsl(var(--muted-foreground))",
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <p className="text-xs text-muted-foreground -mt-2">{activeTabDef.description}</p>

      {/* ── Search & Controls ── */}
      <div
        className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3"
        style={{ boxShadow: "0 0 40px -10px rgba(10,108,255,0.07)" }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMine()}
              placeholder={`hashtag (padrão: ${activeTabDef.defaultHashtag})`}
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
            disabled={mining}
            className="gap-2 bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white shrink-0"
            style={mining ? {} : { boxShadow: "0 0 20px rgba(10,108,255,0.35)" }}
          >
            {mining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {mining ? "Minerando..." : "Minerar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs text-[#3BA3FF]">
            ✓ {mineResult.inserted} novos vídeos salvos
            {mineResult.skipped > 0 ? ` · ${mineResult.skipped} duplicados ignorados` : ""}
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
                className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                style={
                  filterHashtag === null
                    ? {
                        background: "rgba(10,108,255,0.15)",
                        borderColor: "rgba(10,108,255,0.5)",
                        color: "#3BA3FF",
                      }
                    : { borderColor: "rgba(255,255,255,0.1)", color: "hsl(var(--muted-foreground))" }
                }
                onClick={() => setFilterHashtag(null)}
              >
                Todos ({videos.length})
              </button>
              {uniqueHashtags.map((h) => (
                <div key={h} className="flex items-center gap-0.5">
                  <button
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors"
                    style={
                      filterHashtag === h
                        ? {
                            background: "rgba(10,108,255,0.15)",
                            borderColor: "rgba(10,108,255,0.5)",
                            color: "#3BA3FF",
                          }
                        : {
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "hsl(var(--muted-foreground))",
                          }
                    }
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

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && tabFiltered.length === 0 && !error && (
        <div className="text-center py-20 text-muted-foreground">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,0,80,0.08), rgba(0,242,234,0.08))",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Play className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-sm">Nenhum vídeo para esta aba.</p>
          <p className="text-xs mt-1 opacity-55">
            Minere #{activeTabDef.defaultHashtag} para começar
          </p>
          <Button
            className="mt-4 bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white text-xs h-8"
            onClick={handleMine}
            disabled={mining}
          >
            {mining ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <Search className="h-3 w-3 mr-1.5" />
            )}
            Minerar #{activeTabDef.defaultHashtag}
          </Button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-[#3BA3FF]" />
          <span className="text-sm">Carregando vídeos...</span>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && tabFiltered.length > 0 && (
        <>
          {activeTab === "creators" ? (
            <CreatorsView
              videos={tabFiltered}
              onSelect={setSelectedVideo}
              onDelete={handleDelete}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {tabFiltered.map((row) => (
                  <VideoCard
                    key={row.id}
                    row={row}
                    onClick={() => setSelectedVideo(row)}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ── Video Modal ── */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            row={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onAnalyze={handleAnalyze}
            analyzing={analyzingIds.has(selectedVideo.id)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
