import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback, useEffect, useMemo } from "react";
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
  Play,
  ShoppingBag,
  Zap,
  Users,
  Trophy,
  Clapperboard,
  Bookmark,
  Copy,
  FileText,
  CheckCircle2,
  Flame,
  Library,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Rocket,
  Target,
  Layers,
  BarChart3,
  Globe,
  ListPlus,
  Tag,
  Loader,
} from "lucide-react";
import {
  mineTikTokHashtagFn,
  listTikTokMinedFn,
  analyzeTikTokVideoFn,
  deleteTikTokVideoFn,
  clearTikTokHashtagFn,
  saveAnuncioFn,
  escalateAnuncioFn,
  saveCreatorFn,
  generatePlaybookFn,
  generateEscalatePackFn,
  fetchThumbnailsOembedFn,
} from "@/lib/tiktok-radar.functions";
import type { TikTokAiAnalysis, TikTokPlaybook, EscalatePack } from "@/lib/tiktok-radar.functions";

export const Route = createFileRoute("/_authenticated/tiktok-radar")({
  component: TikTokRadarPage,
});

// ── Tab definitions ───────────────────────────────────────────────────────────

type RadarTab =
  | "trending"
  | "viral-hooks"
  | "tiktok-shop"
  | "ads-spy"
  | "creators"
  | "winning-products"
  | "vsls"
  | "hooks-library"
  | "shop-radar";

const TABS: {
  id: RadarTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultHashtag: string;
  description: string;
}[] = [
  { id: "trending",         label: "Trending",         icon: TrendingUp,  defaultHashtag: "viral",           description: "Vídeos em alta agora — ordenados pelo viral score" },
  { id: "viral-hooks",      label: "Viral Hooks",       icon: Zap,         defaultHashtag: "hook",            description: "Os melhores hooks virais (score 60+)" },
  { id: "tiktok-shop",      label: "TikTok Shop",       icon: ShoppingBag, defaultHashtag: "tiktokshop",      description: "Produtos virais na TikTok Shop" },
  { id: "ads-spy",          label: "Ads Spy",           icon: Megaphone,   defaultHashtag: "adsnotsponsored", description: "Criativos e anúncios em evidência" },
  { id: "creators",         label: "Creators",          icon: Users,       defaultHashtag: "contentcreator",  description: "Top criadores por nicho" },
  { id: "winning-products", label: "Winning Products",  icon: Trophy,      defaultHashtag: "dropshipping",    description: "Produtos ganhadores validados pelo mercado" },
  { id: "vsls",             label: "VSLs",              icon: Clapperboard,defaultHashtag: "vsl",             description: "Video Sales Letters de alta conversão" },
  { id: "hooks-library",    label: "Hooks Library",     icon: Library,     defaultHashtag: "hook",            description: "Biblioteca de hooks virais catalogados por fórmula" },
  { id: "shop-radar",       label: "Shop Radar",        icon: ShoppingCart,defaultHashtag: "tiktokshop",      description: "Radar TikTok Shop — produtos, creators, UGC, anúncios e VSLs" },
];

type ShopSubTab = "produtos" | "creators" | "ugc" | "anuncios" | "vsls";
const SHOP_SUBTABS: { id: ShopSubTab; label: string; hashtags: string[]; keywords: string[] }[] = [
  { id: "produtos",  label: "Produtos Virais", hashtags: ["tiktokshop","shopnow","produto","compre","tiktokmademebuyit"], keywords: [] },
  { id: "creators",  label: "Creators",        hashtags: ["ugccreator","contentcreator","creatortiktok"],                keywords: [] },
  { id: "ugc",       label: "UGC",             hashtags: ["unboxing","review","testei","comprei","ugc"],                keywords: ["unboxing","review","testei","comprei"] },
  { id: "anuncios",  label: "Anúncios",        hashtags: ["ugcads","ads","sponsored","ad","publi"],                     keywords: [] },
  { id: "vsls",      label: "VSLs",            hashtags: ["vsl","videovendas","salesletter"],                           keywords: ["vsl","video de vendas"] },
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

type EnhancedScore = {
  score: number;
  tier: "Escalando" | "Quente" | "Médio" | "Fraco";
  icon: string;
  color: string;
  breakdown: { label: string; pts: number }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function creatorInitial(name: string): string {
  return (name?.[0] ?? "?").toUpperCase();
}

function calcEnhancedScore(row: TikTokRow): EnhancedScore {
  const breakdown: { label: string; pts: number }[] = [];

  // Base from engagement (max 55)
  const baseViews  = row.views   > 0 ? Math.round(Math.log10(Math.max(1, row.views))  * 7) : 0;
  const baseLikes  = row.likes   > 0 ? Math.round(Math.log10(Math.max(1, row.likes))  * 3) : 0;
  const baseShares = row.shares  > 0 ? Math.round(Math.log10(Math.max(1, row.shares)) * 3) : 0;
  const base = Math.min(55, baseViews + baseLikes + baseShares);
  if (base > 0) breakdown.push({ label: "Engajamento base", pts: base });

  let bonus = 0;

  // Comment ratio — qualidade do engajamento
  if (row.views > 0 && row.comments > 0) {
    const r = row.comments / row.views;
    const pts = r > 0.02 ? 8 : r > 0.01 ? 4 : 0;
    if (pts) { bonus += pts; breakdown.push({ label: "Taxa de comentários", pts }); }
  }

  // Share ratio — viralidade
  if (row.views > 0 && row.shares > 0) {
    const r = row.shares / row.views;
    const pts = r > 0.01 ? 10 : r > 0.005 ? 5 : 0;
    if (pts) { bonus += pts; breakdown.push({ label: "Taxa de compartilhamento", pts }); }
  }

  // AI bonuses
  if (row.ai_analysis) {
    const ai = row.ai_analysis;
    const speed = ai.editing_speed?.toLowerCase() ?? "";
    const speedPts = speed === "rápida" ? 8 : (speed === "média" || speed === "media") ? 4 : 0;
    if (speedPts) { bonus += speedPts; breakdown.push({ label: `Edição ${ai.editing_speed}`, pts: speedPts }); }

    const retention = ai.retention?.toLowerCase() ?? "";
    const retPts = retention.includes("loop") || retention.includes("suspense") ? 8 : retention.length > 10 ? 4 : 0;
    if (retPts) { bonus += retPts; breakdown.push({ label: "Técnicas de retenção", pts: retPts }); }

    if (ai.hook_formula && ai.hook_formula.length > 5) { bonus += 6; breakdown.push({ label: "Fórmula do hook", pts: 6 }); }
    if (ai.hook_analysis && ai.hook_analysis.length > 20) { bonus += 4; breakdown.push({ label: "Análise do hook", pts: 4 }); }
  }

  const score = Math.min(100, base + bonus);
  const [tier, icon, color] =
    score >= 85 ? ["Escalando", "🔥", "#ff4d4d"] as const :
    score >= 65 ? ["Quente",    "⚡", "#ff9500"] as const :
    score >= 40 ? ["Médio",     "🟡", "#f5c400"] as const :
                  ["Fraco",     "⚪", "#6b7280"] as const;

  return { score, tier, icon, color, breakdown };
}

function rowToAdPayload(row: TikTokRow, enhanced: EnhancedScore) {
  return {
    video_id:      row.video_id,
    creator:       row.creator,
    hook:          row.hook,
    description:   row.description,
    thumbnail_url: row.thumbnail_url,
    video_url:     row.video_url,
    views:         row.views,
    likes:         row.likes,
    comments:      row.comments,
    shares:        row.shares,
    viral_score:   row.viral_score,
    enhanced_score: enhanced.score,
    hashtags:      row.hashtags,
    ai_analysis:   row.ai_analysis as Record<string, unknown> | null,
    source:        "tiktok",
  };
}

// ── ViralBadge ────────────────────────────────────────────────────────────────

function ViralBadge({ score }: { score: number }) {
  const [color, label] =
    score >= 70 ? ["#ff4d4d", "🔥 Viral"] :
    score >= 45 ? ["#ff9500", "⚡ Quente"] :
                  ["#3BA3FF", "Normal"];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

// ── EnhancedScoreDisplay ──────────────────────────────────────────────────────

function EnhancedScoreDisplay({ es }: { es: EnhancedScore }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Score Profissional</span>
        </div>
        <button onClick={() => setOpen(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-2xl font-black" style={{ color: es.color }}>{es.icon} {es.score}</div>
        <div>
          <div className="text-sm font-bold" style={{ color: es.color }}>{es.tier}</div>
          <div className="w-28 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${es.score}%`, background: es.color }} />
          </div>
        </div>
      </div>
      {open && (
        <div className="space-y-1 pt-1 border-t border-white/8">
          {es.breakdown.map(({ label, pts }) => (
            <div key={label} className="flex justify-between text-[10px] text-muted-foreground">
              <span>{label}</span>
              <span className="font-mono text-foreground/70">+{pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function ShimmerBar({ w = "100%", h = 12, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div className="relative overflow-hidden" style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.05)" }}>
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)" }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: "#0d0d16" }}>
      <div className="relative overflow-hidden" style={{ height: 200, background: "rgba(255,255,255,0.04)" }}>
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)" }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
        />
      </div>
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.07)" }} />
          <ShimmerBar w="80px" h={10} />
        </div>
        <ShimmerBar w="100%" h={10} />
        <ShimmerBar w="65%" h={10} />
        <div className="flex gap-3 pt-0.5">
          <ShimmerBar w="36px" h={9} r={12} />
          <ShimmerBar w="36px" h={9} r={12} />
          <ShimmerBar w="36px" h={9} r={12} />
        </div>
      </div>
    </div>
  );
}

// ── Auto-categorization (rule-based, instant, no AI needed) ───────────────────

const CATEGORY_RULES: { label: string; color: string; bg: string; keywords: string[] }[] = [
  { label: "E-commerce",   color: "#ff9500", bg: "rgba(255,149,0,0.12)",   keywords: ["tiktokshop","shopnow","tiktokmademebuyit","dropshipping","ecommerce","shopify","produto","loja"] },
  { label: "Info-produto", color: "#0A6CFF", bg: "rgba(10,108,255,0.12)",  keywords: ["curso","mentoria","coaching","ebook","infoproduto","treinamento","masterclass","aula"] },
  { label: "Saúde",        color: "#00c896", bg: "rgba(0,200,150,0.12)",   keywords: ["emagrecimento","saude","fitness","academia","dieta","nutrição","treino","emagrecer","saúde"] },
  { label: "VSL / Ads",    color: "#ff4d4d", bg: "rgba(255,77,77,0.12)",   keywords: ["vsl","videovendas","salesletter","ugcads","ads","adsnotsponsored","sponsored","publi"] },
  { label: "UGC / Review", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", keywords: ["unboxing","review","testei","comprei","ugc","avaliação","usandoo"] },
  { label: "Renda Extra",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  keywords: ["rendaextra","trabalharremoto","freelancer","ganhandodinheiro","homeoffice","renda"] },
  { label: "Beleza",       color: "#ec4899", bg: "rgba(236,72,153,0.12)",  keywords: ["makeup","beleza","skincare","maquiagem","cabelo","pele","glow"] },
  { label: "Creator",      color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   keywords: ["contentcreator","creatortiktok","ugccreator","influencer","tiktoker"] },
];

function detectCategory(row: TikTokRow): { label: string; color: string; bg: string } | null {
  const text = [row.hook, row.description, ...(row.hashtags ?? [])].join(" ").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule;
  }
  return null;
}

function CategoryBadge({ row }: { row: TikTokRow }) {
  const cat = detectCategory(row);
  if (!cat) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap"
      style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.color}30` }}>
      <Tag className="h-2.5 w-2.5" />{cat.label}
    </span>
  );
}

// ── AiSection helper ──────────────────────────────────────────────────────────

function AiSection({ label, value, accent, italic }: { label: string; value?: string; accent?: boolean; italic?: boolean }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs leading-snug ${italic ? "italic" : ""}`}
        style={accent ? { color: "#3BA3FF", fontWeight: 600 } : { color: "hsl(var(--foreground))" }}>
        {italic ? `"${value}"` : value}
      </div>
    </div>
  );
}

function EditingSpeedBadge({ speed }: { speed?: string }) {
  if (!speed) return null;
  const map: Record<string, { color: string; label: string }> = {
    rápida: { color: "#ff4d4d", label: "⚡ Rápida" },
    media:  { color: "#ff9500", label: "➡ Média"  },
    média:  { color: "#ff9500", label: "➡ Média"  },
    lenta:  { color: "#00c896", label: "🐢 Lenta"  },
  };
  const e = map[speed.toLowerCase()] ?? { color: "#3BA3FF", label: speed };
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: `${e.color}20`, color: e.color, border: `1px solid ${e.color}40` }}>
      {e.label}
    </span>
  );
}

// ── AiAnalysisDisplay ─────────────────────────────────────────────────────────

function AiAnalysisDisplay({ analysis }: { analysis: TikTokAiAnalysis }) {
  const [tab, setTab] = useState<"hook" | "narrativa" | "edicao" | "oferta">("hook");
  const tabs = [
    { id: "hook" as const,     label: "Hook"     },
    { id: "narrativa" as const, label: "Narrativa" },
    { id: "edicao" as const,   label: "Edição"   },
    { id: "oferta" as const,   label: "Oferta"   },
  ];
  return (
    <div className="rounded-xl border border-[#0A6CFF]/25 bg-[#0A6CFF]/6 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#3BA3FF] font-semibold text-sm">
          <Sparkles className="h-4 w-4" /> Análise IA
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">{analysis.niche}</span>
          {" · "}
          <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,149,0,0.15)", color: "#ff9500" }}>
            {analysis.emotion}
          </span>
        </div>
      </div>
      <div className="flex gap-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
            style={tab === t.id ? { background: "rgba(10,108,255,0.25)", color: "#3BA3FF" } : { color: "hsl(var(--muted-foreground))" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {tab === "hook" && <>
          <AiSection label="Análise do Hook"  value={analysis.hook_analysis} />
          <AiSection label="Fórmula do Hook"  value={analysis.hook_formula} />
          <AiSection label="Por que viralizou" value={analysis.virality_reason} />
        </>}
        {tab === "narrativa" && <>
          <AiSection label="Promessa principal"   value={analysis.promise} />
          <AiSection label="Mecanismo único"      value={analysis.mechanism} />
          <AiSection label="Estrutura narrativa"  value={analysis.narrative} />
          <AiSection label="CTA identificado"     value={analysis.cta} />
          <AiSection label="Técnicas de retenção" value={analysis.retention} />
        </>}
        {tab === "edicao" && <>
          <AiSection label="Padrão visual"   value={analysis.visual_pattern} />
          <AiSection label="Estilo de edição" value={analysis.editing_style} />
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Velocidade</div>
            <EditingSpeedBadge speed={analysis.editing_speed} />
          </div>
        </>}
        {tab === "oferta" && <>
          <AiSection label="Produto Detectado"      value={analysis.produto_detectado} accent />
          <AiSection label="Formato VSL"            value={analysis.formato_vsl} />
          <AiSection label="Ângulo de oferta"       value={analysis.offer_angle} />
          <AiSection label="Título Ebook sugerido"  value={analysis.ebook_title} />
          <AiSection label="Hook VSL (15s)"         value={analysis.vsl_hook} italic />
        </>}
      </div>
    </div>
  );
}

// ── PlaybookModal ─────────────────────────────────────────────────────────────

function PlaybookModal({
  playbook,
  row,
  loading,
  onClose,
  onEscalate,
  escalating,
  escalated,
}: {
  playbook: TikTokPlaybook | null;
  row: TikTokRow;
  loading: boolean;
  onClose: () => void;
  onEscalate: () => void;
  escalating: boolean;
  escalated: boolean;
}) {
  const [vslOpen, setVslOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copyAll = () => {
    if (!playbook) return;
    const text = [
      `HEADLINE: ${playbook.headline}`,
      `PROMESSA: ${playbook.promise}`,
      `MECANISMO: ${playbook.mechanism}`,
      `PÚBLICO: ${playbook.target_audience}`,
      `OFERTA: ${playbook.offer_structure}`,
      `ÂNGULO: ${playbook.angle}`,
      `CTA: ${playbook.cta}`,
      `\nCRIATIVOS:\n${playbook.creatives?.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
      `\nFUNIL: ${playbook.funnel}`,
      `\nESTRATÉGIA:\n${playbook.strategy}`,
      `\nROTEIRO VSL:\n${playbook.vsl_script}`,
    ].join("\n\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "#080812", boxShadow: "0 30px 90px rgba(0,0,0,0.8)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8"
          style={{ background: "linear-gradient(135deg, rgba(10,108,255,0.12), rgba(255,0,80,0.06))" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0A6CFF, #ff0050)" }}>
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Playbook Automático</div>
              <div className="text-[10px] text-muted-foreground">@{row.creator}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#0A6CFF]/30" />
                <div className="absolute inset-0 rounded-full border-2 border-[#0A6CFF] border-t-transparent animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-[#3BA3FF]" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">Gerando Playbook...</div>
                <div className="text-xs text-muted-foreground mt-1">A IA está analisando o vídeo e montando a estratégia</div>
              </div>
            </div>
          ) : playbook ? (
            <div className="p-5 space-y-5">
              {/* Headline */}
              <div className="rounded-xl border border-[#0A6CFF]/30 p-4"
                style={{ background: "linear-gradient(135deg, rgba(10,108,255,0.08), rgba(0,0,0,0))" }}>
                <div className="text-[10px] uppercase tracking-wider text-[#3BA3FF] mb-2">Headline Principal</div>
                <div className="text-lg font-bold text-foreground leading-tight">{playbook.headline}</div>
              </div>

              {/* Promise + Mechanism */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Promessa</div>
                  <div className="text-xs text-foreground leading-snug">{playbook.promise}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mecanismo Único</div>
                  <div className="text-xs text-foreground leading-snug">{playbook.mechanism}</div>
                </div>
              </div>

              {/* Audience + Angle */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Público-Alvo</div>
                  <div className="text-xs text-foreground leading-snug">{playbook.target_audience}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ângulo de Marketing</div>
                  <div className="text-xs text-foreground leading-snug">{playbook.angle}</div>
                </div>
              </div>

              {/* Offer + CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estrutura da Oferta</div>
                  <div className="text-xs text-foreground leading-snug">{playbook.offer_structure}</div>
                </div>
                <div className="rounded-xl border border-[#00c896]/30 bg-[#00c896]/5 p-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-[#00c896]">CTA</div>
                  <div className="text-sm font-bold text-foreground">"{playbook.cta}"</div>
                </div>
              </div>

              {/* Creatives */}
              {playbook.creatives?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">3 Ideias de Criativos</div>
                  <div className="grid grid-cols-1 gap-2">
                    {playbook.creatives.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: i === 0 ? "#ff0050" : i === 1 ? "#0A6CFF" : "#ff9500", color: "#fff" }}>
                          {i + 1}
                        </div>
                        <div className="text-xs text-foreground leading-snug">{c}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Funnel */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Funil de Vendas</div>
                <div className="text-xs text-foreground leading-snug font-mono">{playbook.funnel}</div>
              </div>

              {/* Strategy */}
              {playbook.strategy && (
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estratégia 30 Dias</div>
                  <div className="space-y-1">
                    {playbook.strategy.split("\n").filter(Boolean).map((step, i) => (
                      <div key={i} className="text-xs text-foreground leading-snug">{step}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* VSL Script (collapsible) */}
              <div className="rounded-xl border border-[#ff9500]/20 bg-[#ff9500]/5 overflow-hidden">
                <button
                  onClick={() => setVslOpen(v => !v)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-white/3 transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-[#ff9500] flex items-center gap-2">
                    <Video className="h-3.5 w-3.5" /> Roteiro VSL (90s)
                  </div>
                  {vslOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {vslOpen && (
                  <div className="px-3 pb-3 text-xs text-foreground leading-relaxed whitespace-pre-line border-t border-[#ff9500]/15">
                    {playbook.vsl_script}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {playbook && !loading && (
          <div className="flex gap-2 p-4 border-t border-white/8">
            <Button onClick={onEscalate} disabled={escalating || escalated}
              className="flex-1 gap-2"
              style={{ background: escalated ? "#00c896" : "linear-gradient(135deg, #0A6CFF, #ff0050)", color: "#fff" }}>
              {escalating ? <Loader2 className="h-4 w-4 animate-spin" /> :
               escalated   ? <CheckCircle2 className="h-4 w-4" /> :
                             <Rocket className="h-4 w-4" />}
              {escalated ? "Salvo em Escalados!" : "Salvar em Ofertas Escaladas"}
            </Button>
            <Button variant="outline" onClick={copyAll} className="gap-2 border-white/10 hover:bg-white/5">
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── EscalateHubModal ──────────────────────────────────────────────────────────

type EscalateHubTab = "hooks" | "creatives" | "meta" | "tiktok" | "google";

function EscalateHubModal({
  row,
  onClose,
  onSave,
  onEscalate,
  savedIds,
  escalatedIds,
  genPack,
}: {
  row: TikTokRow;
  onClose: () => void;
  onSave: (row: TikTokRow) => void;
  onEscalate: (row: TikTokRow) => void;
  savedIds: Set<string>;
  escalatedIds: Set<string>;
  genPack: (id: string) => Promise<EscalatePack>;
}) {
  const [tab, setTab] = useState<EscalateHubTab>("hooks");
  const [pack, setPack] = useState<EscalatePack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const isSaved     = savedIds.has(row.id);
  const isEscalated = escalatedIds.has(row.id);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const result = await genPack(row.id);
      setPack(result as EscalatePack);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao gerar pacote");
    } finally { setLoading(false); }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };

  const HUB_TABS: { id: EscalateHubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "hooks",     label: "Hooks",      icon: Zap },
    { id: "creatives", label: "Criativos",  icon: Layers },
    { id: "meta",      label: "Meta Ads",   icon: Target },
    { id: "tiktok",    label: "TikTok Ads", icon: Play },
    { id: "google",    label: "Google Ads", icon: Globe },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "#080812", boxShadow: "0 30px 90px rgba(0,0,0,0.8)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8"
          style={{ background: "linear-gradient(135deg, rgba(255,77,77,0.10), rgba(10,108,255,0.08))" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #ff4d4d, #0A6CFF)" }}>
              <Flame className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Escalar Anúncio</div>
              <div className="text-[10px] text-muted-foreground">@{row.creator} · {fmtNum(row.views)} views</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-white/10 hover:bg-white/5"
              style={isSaved ? { borderColor: "#00c896", color: "#00c896" } : {}}
              onClick={() => onSave(row)}>
              {isSaved ? <CheckCircle2 className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
              {isSaved ? "Salvo" : "Salvar"}
            </Button>
            <Button size="sm"
              className="h-7 text-xs gap-1"
              style={isEscalated
                ? { background: "#00c896", color: "#fff" }
                : { background: "linear-gradient(135deg, #ff4d4d, #0A6CFF)", color: "#fff" }}
              onClick={() => onEscalate(row)}>
              {isEscalated ? <CheckCircle2 className="h-3 w-3" /> : <Rocket className="h-3 w-3" />}
              {isEscalated ? "Escalado!" : "Escalar"}
            </Button>
            <button onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 68px)" }}>
          {!pack && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(255,77,77,0.15), rgba(10,108,255,0.15))", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Rocket className="h-8 w-8 text-white/40" />
              </div>
              <div className="text-center">
                <div className="text-base font-semibold text-foreground">Gerar Pacote Completo de Escala</div>
                <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                  5 hooks virais · 3 criativos · Meta Ads · TikTok Ads · Google Ads
                </div>
              </div>
              {error && <p className="text-xs text-red-400 text-center max-w-sm">{error}</p>}
              <Button onClick={generate}
                className="gap-2 text-white"
                style={{ background: "linear-gradient(135deg, #ff4d4d, #0A6CFF)", boxShadow: "0 0 30px rgba(255,77,77,0.3)" }}>
                <Sparkles className="h-4 w-4" /> Gerar Pacote com IA
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-[#ff4d4d]/20" />
                <div className="absolute inset-0 rounded-full border-2 border-[#ff4d4d] border-t-transparent animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-[#ff4d4d]" />
              </div>
              <div className="text-sm font-medium text-foreground">Gerando pacote de escala...</div>
              <div className="text-xs text-muted-foreground">Hooks, criativos, Meta, TikTok e Google Ads</div>
            </div>
          )}

          {pack && !loading && (
            <div className="p-5 space-y-4">
              {/* Tab nav */}
              <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {HUB_TABS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all"
                      style={tab === t.id
                        ? { background: "rgba(255,77,77,0.15)", color: "#ff6680", border: "1px solid rgba(255,77,77,0.3)" }
                        : { color: "hsl(var(--muted-foreground))", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Icon className="h-3.5 w-3.5" />{t.label}
                    </button>
                  );
                })}
              </div>

              {/* Hooks tab */}
              {tab === "hooks" && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">5 Hooks Virais</div>
                  {pack.hooks?.map((hook, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: ["#ff4d4d","#ff9500","#0A6CFF","#00c896","#a78bfa"][i % 5], color: "#fff" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 text-sm text-foreground leading-snug">{hook}</div>
                      <button onClick={() => copy(hook, `hook-${i}`)}
                        className="shrink-0 p-1.5 rounded-lg border border-white/10 hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
                        {copied === `hook-${i}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Creatives tab */}
              {tab === "creatives" && (
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">3 Briefings de Criativos</div>
                  {pack.creatives?.map((c, i) => (
                    <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: i === 0 ? "#ff4d4d" : i === 1 ? "#0A6CFF" : "#ff9500", color: "#fff" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-foreground leading-relaxed">{c}</div>
                        </div>
                        <button onClick={() => copy(c, `creative-${i}`)}
                          className="shrink-0 p-1.5 rounded-lg border border-white/10 hover:bg-white/8 text-muted-foreground transition-colors">
                          {copied === `creative-${i}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta tab */}
              {tab === "meta" && pack.meta_campaign && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Ads</div>
                    <button onClick={() => copy(
                      `OBJETIVO: ${pack.meta_campaign.objective}\nAUDIÊNCIA: ${pack.meta_campaign.audience}\nCOPY: ${pack.meta_campaign.primary_text}\nHEADLINE: ${pack.meta_campaign.headline}\nCTA: ${pack.meta_campaign.cta}`,
                      "meta-all"
                    )} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                      {copied === "meta-all" ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      Copiar tudo
                    </button>
                  </div>
                  {[
                    { label: "Objetivo",      value: pack.meta_campaign.objective },
                    { label: "Audiência",     value: pack.meta_campaign.audience },
                    { label: "Copy principal",value: pack.meta_campaign.primary_text },
                    { label: "Headline",      value: pack.meta_campaign.headline },
                    { label: "Botão CTA",     value: pack.meta_campaign.cta },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
                        <div className="text-xs text-foreground leading-snug">{value}</div>
                      </div>
                      <button onClick={() => copy(value, `meta-${label}`)}
                        className="shrink-0 p-1.5 rounded-lg border border-white/10 hover:bg-white/8 text-muted-foreground transition-colors">
                        {copied === `meta-${label}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* TikTok tab */}
              {tab === "tiktok" && pack.tiktok_campaign && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">TikTok Ads</div>
                    <button onClick={() => copy(
                      `FORMATO: ${pack.tiktok_campaign.format}\nHOOK SCRIPT: ${pack.tiktok_campaign.hook_script}\nLEGENDA: ${pack.tiktok_campaign.caption}\nCTA: ${pack.tiktok_campaign.cta}\nHASHTAGS: ${pack.tiktok_campaign.hashtags?.join(" ")}`,
                      "tiktok-all"
                    )} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                      {copied === "tiktok-all" ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      Copiar tudo
                    </button>
                  </div>
                  {[
                    { label: "Formato",      value: pack.tiktok_campaign.format },
                    { label: "Hook Script",  value: pack.tiktok_campaign.hook_script },
                    { label: "Legenda",      value: pack.tiktok_campaign.caption },
                    { label: "Botão CTA",    value: pack.tiktok_campaign.cta },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
                        <div className="text-xs text-foreground leading-snug">{value}</div>
                      </div>
                      <button onClick={() => copy(value, `tiktok-${label}`)}
                        className="shrink-0 p-1.5 rounded-lg border border-white/10 hover:bg-white/8 text-muted-foreground transition-colors">
                        {copied === `tiktok-${label}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  {pack.tiktok_campaign.hashtags?.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Hashtags</div>
                      <div className="flex flex-wrap gap-1">
                        {pack.tiktok_campaign.hashtags.map(h => (
                          <span key={h} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#ff0050]/10 text-[#ff6680]">#{h}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Google tab */}
              {tab === "google" && pack.google_ads && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Google Ads</div>
                    <button onClick={() => copy(
                      `H1: ${pack.google_ads.headline1} | H2: ${pack.google_ads.headline2} | H3: ${pack.google_ads.headline3}\nD1: ${pack.google_ads.description1}\nD2: ${pack.google_ads.description2}\nKWs: ${pack.google_ads.keywords?.join(", ")}`,
                      "google-all"
                    )} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                      {copied === "google-all" ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      Copiar tudo
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[pack.google_ads.headline1, pack.google_ads.headline2, pack.google_ads.headline3].map((h, i) => (
                      <div key={i} className="rounded-xl border border-[#4285f4]/20 bg-[#4285f4]/5 p-3">
                        <div className="text-[9px] uppercase tracking-wider text-[#4285f4] mb-1">Headline {i + 1}</div>
                        <div className="text-xs text-foreground font-medium">{h}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[pack.google_ads.description1, pack.google_ads.description2].map((d, i) => (
                      <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-3">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Descrição {i + 1}</div>
                        <div className="text-xs text-foreground leading-snug">{d}</div>
                      </div>
                    ))}
                  </div>
                  {pack.google_ads.keywords?.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Palavras-chave</div>
                      <div className="flex flex-wrap gap-1">
                        {pack.google_ads.keywords.map(k => (
                          <span key={k} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#4285f4]/10 text-[#4285f4]">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Regenerate */}
              <div className="pt-2 border-t border-white/8">
                <Button variant="outline" size="sm" onClick={generate}
                  className="w-full text-xs gap-2 border-white/10 hover:bg-white/5 text-muted-foreground">
                  <Loader className="h-3 w-3" /> Regenerar pacote
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── VideoModal ────────────────────────────────────────────────────────────────

function VideoModal({
  row,
  onClose,
  onAnalyze,
  analyzing,
  onAction,
  savedIds,
  escalatedIds,
}: {
  row: TikTokRow;
  onClose: () => void;
  onAnalyze: (id: string) => void;
  analyzing: boolean;
  onAction: (action: string, row: TikTokRow) => void;
  savedIds: Set<string>;
  escalatedIds: Set<string>;
}) {
  const embedUrl = row.video_id ? `https://www.tiktok.com/embed/v2/${row.video_id}` : null;
  const es = useMemo(() => calcEnhancedScore(row), [row]);
  const isSaved     = savedIds.has(row.id);
  const isEscalated = escalatedIds.has(row.id);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "#0a0a12", boxShadow: "0 25px 80px rgba(0,0,0,0.8)", maxHeight: "92vh" }}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-white/8 hover:bg-white/15 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col lg:flex-row overflow-auto" style={{ maxHeight: "92vh" }}>
          {/* Video panel */}
          <div className="lg:w-[300px] xl:w-[320px] shrink-0 bg-black overflow-hidden flex flex-col" style={{ minHeight: 280 }}>
            {embedUrl ? (
              <div className="relative flex-1" style={{ height: "clamp(280px, 60vh, 560px)" }}>
                {/* Skeleton while iframe loads */}
                {!iframeLoaded && (
                  <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3"
                    style={{ background: "#080810" }}>
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-[#ff0050]/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-[#ff0050] border-t-transparent animate-spin" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Carregando vídeo...</span>
                  </div>
                )}
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  style={{ border: 0, opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.4s ease" }}
                  allowFullScreen
                  allow="encrypted-media"
                  title="TikTok Video"
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground flex-1"
                style={{ height: "clamp(280px, 60vh, 560px)", background: "#080810" }}>
                <Play className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Sem embed disponível</p>
              </div>
            )}
            {/* Abrir no TikTok — sempre visível */}
            {(row.video_url || row.video_id) && (
              <a
                href={row.video_url || `https://www.tiktok.com/@${row.creator}/video/${row.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                style={{ background: "rgba(255,0,80,0.08)", color: "#ff6680", borderTop: "1px solid rgba(255,0,80,0.15)" }}
                onClick={e => e.stopPropagation()}
              >
                <Play className="h-3 w-3" />
                Abrir no TikTok
              </a>
            )}
          </div>

          {/* Details panel */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "clamp(280px, 60vh, 560px)" }}>
            {/* Creator */}
            <div className="flex items-start gap-3 pr-8">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}>
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

            {/* Enhanced Score */}
            <EnhancedScoreDisplay es={es} />

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Eye,           label: "Views",    val: row.views,    color: "#3BA3FF" },
                { icon: Heart,         label: "Likes",    val: row.likes,    color: "#ff4d4d" },
                { icon: MessageCircle, label: "Coment.",  val: row.comments, color: "#ff9500" },
                { icon: Share2,        label: "Shares",   val: row.shares,   color: "#00c896" },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} className="text-center rounded-xl border border-white/8 bg-white/3 py-2 px-1">
                  <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color }} />
                  <div className="text-sm font-bold text-foreground">{fmtNum(val)}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Hashtags */}
            {row.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.hashtags.map(h => (
                  <span key={h} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#0A6CFF]/10 text-[#3BA3FF]">#{h}</span>
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
              <AiAnalysisDisplay analysis={row.ai_analysis} />
            ) : (
              <Button onClick={() => onAnalyze(row.id)} disabled={analyzing}
                className="w-full bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white"
                style={analyzing ? {} : { boxShadow: "0 0 20px rgba(10,108,255,0.35)" }}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {analyzing ? "Analisando com IA..." : "Analisar com IA"}
              </Button>
            )}

            {/* Action grid */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { icon: Bookmark,    label: "Salvar Anúncio",       action: "save",     active: isSaved },
                { icon: Rocket,      label: "Gerar Playbook",        action: "playbook", active: false },
                { icon: Flame,       label: "Escalar Anúncio",       action: "escalate", active: isEscalated },
                { icon: BookOpen,    label: "Gerar Ebook",           action: "ebook",    active: false },
                { icon: Video,       label: "Gerar VSL",             action: "vsl",      active: false },
                { icon: Copy,        label: "Clonar Estrutura",      action: "clone",    active: false },
              ] as const).map(({ icon: Icon, label, action, active }) => (
                <Button key={action} size="sm" variant="outline"
                  className="h-auto flex-col gap-1.5 py-3 text-[11px] leading-tight transition-all"
                  style={active
                    ? { borderColor: "#00c896", background: "rgba(0,200,150,0.1)", color: "#00c896" }
                    : { borderColor: "rgba(255,255,255,0.1)" }}
                  onClick={() => onAction(action, row)}>
                  {active ? <CheckCircle2 className="h-4 w-4" style={{ color: "#00c896" }} /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-center">{active && (action === "save" || action === "escalate") ? "Salvo!" : label}</span>
                </Button>
              ))}
            </div>

            {/* External link — shown when no video_url in embed panel */}
            {!row.video_url && row.video_id && (
              <a href={`https://www.tiktok.com/@${row.creator}/video/${row.video_id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver original no TikTok <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── CloneStructureModal ───────────────────────────────────────────────────────

function CloneStructureModal({
  row,
  onClose,
  onGeneratePlaybook,
}: {
  row: TikTokRow;
  onClose: () => void;
  onGeneratePlaybook: (row: TikTokRow) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const ai = row.ai_analysis;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className="shrink-0 p-1.5 rounded-lg border border-white/10 hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
      {copied === id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );

  const Field = ({ label, value, accent }: { label: string; value?: string; accent?: string }) => {
    if (!value) return null;
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
          <div className="text-xs leading-snug" style={accent ? { color: accent, fontWeight: 600 } : { color: "hsl(var(--foreground))" }}>
            {value}
          </div>
        </div>
        <CopyBtn text={value} id={`clone-${label}`} />
      </div>
    );
  };

  const allText = [
    `HOOK: ${row.hook}`,
    ai?.hook_formula  ? `FÓRMULA: ${ai.hook_formula}`  : "",
    ai?.promise       ? `PROMESSA: ${ai.promise}`       : "",
    ai?.mechanism     ? `MECANISMO: ${ai.mechanism}`    : "",
    ai?.narrative     ? `ESTRUTURA: ${ai.narrative}`    : "",
    ai?.cta           ? `CTA: ${ai.cta}`                : "",
    ai?.emotion       ? `EMOÇÃO: ${ai.emotion}`         : "",
    ai?.retention     ? `RETENÇÃO: ${ai.retention}`     : "",
    ai?.vsl_hook      ? `HOOK VSL: ${ai.vsl_hook}`      : "",
  ].filter(Boolean).join("\n\n");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "#080812", boxShadow: "0 30px 90px rgba(0,0,0,0.8)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8"
          style={{ background: "linear-gradient(135deg, rgba(10,108,255,0.10), rgba(0,0,0,0))" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0A6CFF, #00f2ea)" }}>
              <Copy className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Clonar Estrutura</div>
              <div className="text-[10px] text-muted-foreground">@{row.creator} · {fmtNum(row.views)} views</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-white/10 hover:bg-white/5"
              onClick={() => copy(allText, "all")}>
              {copied === "all" ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              Copiar Tudo
            </Button>
            <button onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-3" style={{ maxHeight: "calc(90vh - 130px)" }}>
          {/* Hook original */}
          <div className="rounded-xl border border-[#0A6CFF]/30 bg-[#0A6CFF]/6 p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[#3BA3FF] mb-1">Hook Original</div>
              <div className="text-sm text-foreground leading-snug font-medium">"{row.hook}"</div>
            </div>
            <CopyBtn text={row.hook} id="hook-orig" />
          </div>

          {!ai ? (
            <div className="rounded-xl border border-white/8 bg-white/3 p-5 text-center space-y-3">
              <Sparkles className="h-8 w-8 mx-auto text-[#3BA3FF] opacity-50" />
              <div>
                <div className="text-sm font-medium text-foreground">Análise IA não disponível</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Analise este vídeo com IA para desbloquear fórmula do hook, mecanismo, promessa e estrutura narrativa.
                </div>
              </div>
              <Button size="sm" className="gap-2 bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white"
                onClick={() => { onClose(); onGeneratePlaybook(row); }}>
                <Rocket className="h-3.5 w-3.5" /> Gerar Playbook Completo
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fórmula do Hook"  value={ai.hook_formula}  accent="#3BA3FF" />
                <Field label="Emoção Dominante" value={ai.emotion} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Promessa Principal" value={ai.promise} />
                <Field label="Mecanismo Único"    value={ai.mechanism} />
              </div>
              <Field label="Estrutura Narrativa" value={ai.narrative} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="CTA" value={ai.cta} accent="#00c896" />
                <Field label="Técnicas de Retenção" value={ai.retention} />
              </div>
              <Field label="Análise do Hook (3s)" value={ai.hook_analysis} />
              {ai.vsl_hook && (
                <div className="rounded-xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-[#ff9500] mb-1">Hook VSL (15s)</div>
                    <div className="text-xs text-foreground leading-snug italic">"{ai.vsl_hook}"</div>
                  </div>
                  <CopyBtn text={ai.vsl_hook} id="vsl-hook" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-white/8">
          <Button className="flex-1 gap-2 text-white"
            style={{ background: "linear-gradient(135deg, #0A6CFF, #ff0050)" }}
            onClick={() => { onClose(); onGeneratePlaybook(row); }}>
            <Rocket className="h-4 w-4" /> Gerar Playbook Completo
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── VideoCard ─────────────────────────────────────────────────────────────────

function creatorColor(name: string): string {
  const palettes = [
    ["#FF006E", "#FB5607"], ["#8338EC", "#3A86FF"], ["#06D6A0", "#118AB2"],
    ["#FFD166", "#EF476F"], ["#00B4D8", "#0077B6"], ["#F72585", "#7209B7"],
  ];
  const idx = (name || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  return `linear-gradient(135deg, ${palettes[idx][0]}55 0%, ${palettes[idx][1]}33 100%)`;
}

function VideoCard({
  row,
  onClick,
  onDelete,
  isSaved,
  isEscalated,
}: {
  row: TikTokRow;
  onClick: () => void;
  onDelete: (id: string) => void;
  isSaved?: boolean;
  isEscalated?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const isViral = row.viral_score >= 70;
  const isHot   = row.viral_score >= 45 && row.viral_score < 70;

  const glowColor = isEscalated ? "rgba(255,77,77,0.45)"
                  : isSaved     ? "rgba(0,200,150,0.35)"
                  : isViral     ? "rgba(255,77,77,0.30)"
                  : isHot       ? "rgba(255,149,0,0.25)"
                  : hovered     ? "rgba(10,108,255,0.30)"
                  : "transparent";

  const borderColor = isEscalated ? "rgba(255,77,77,0.5)"
                    : isSaved     ? "rgba(0,200,150,0.4)"
                    : isViral     ? "rgba(255,77,77,0.35)"
                    : isHot       ? "rgba(255,149,0,0.30)"
                    : hovered     ? "rgba(10,108,255,0.40)"
                    : "rgba(255,255,255,0.06)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative rounded-2xl border overflow-hidden cursor-pointer"
      style={{
        background: "#0d0d16",
        boxShadow: hovered
          ? `0 8px 40px ${glowColor}, 0 0 0 1px ${borderColor}`
          : isViral || isEscalated
          ? `0 4px 24px ${glowColor}`
          : "0 2px 12px rgba(0,0,0,0.4)",
        borderColor,
        transition: "all 0.25s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
        {/* Shimmer while loading */}
        {imgLoading && row.thumbnail_url && !imgError && (
          <div className="absolute inset-0 z-[1]" style={{ background: "rgba(255,255,255,0.04)" }}>
            <motion.div
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.09) 50%, transparent 100%)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
            />
          </div>
        )}
        {row.thumbnail_url && !imgError ? (
          <img src={row.thumbnail_url} alt={row.hook}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? "scale(1.05)" : "scale(1)", opacity: imgLoading ? 0 : 1, transition: "opacity 0.3s ease, transform 0.5s ease" }}
            loading="lazy"
            onLoad={() => setImgLoading(false)}
            onError={(e) => { e.currentTarget.style.display = "none"; setImgError(true); setImgLoading(false); }} />
        ) : null}
        {(!row.thumbnail_url || imgError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: creatorColor(row.creator) }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 19, fontWeight: 800, color: "rgba(255,255,255,0.85)",
              letterSpacing: 1,
            }}>
              {(row.creator || "?").replace(/^@/, "").slice(0, 2).toUpperCase()}
            </div>
            <Play className="h-4 w-4 text-white/50" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-250"
          style={{ background: "rgba(0,0,0,0.3)", opacity: hovered ? 1 : 0 }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 bg-white/15">
            <Play className="h-5 w-5 text-white ml-0.5" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <ViralBadge score={row.viral_score} />
          {isEscalated && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{ background: "rgba(255,77,77,0.2)", color: "#ff4d4d", border: "1px solid rgba(255,77,77,0.4)" }}>
              🔥 Escalando
            </span>
          )}
        </div>

        {/* Delete */}
        <button onClick={e => { e.stopPropagation(); onDelete(row.id); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/40 hover:text-red-400 hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100">
          <Trash2 className="h-3 w-3" />
        </button>

        {/* Saved indicator */}
        {isSaved && !isEscalated && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 bg-[#00c896]/80 backdrop-blur-sm">
            <Bookmark className="h-2.5 w-2.5 text-white" />
            <span className="text-[9px] text-white font-medium">Salvo</span>
          </div>
        )}

        {/* AI indicator */}
        {row.ai_analysis && !isSaved && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 bg-[#0A6CFF]/80 backdrop-blur-sm">
            <Sparkles className="h-2.5 w-2.5 text-white" />
            <span className="text-[9px] text-white font-medium">IA</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}>
            {creatorInitial(row.creator)}
          </div>
          <span className="text-xs text-muted-foreground truncate">@{row.creator}</span>
        </div>
        <p className="text-xs text-foreground/90 line-clamp-2 leading-snug">{row.hook}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{fmtNum(row.views)}</span>
          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{fmtNum(row.likes)}</span>
          <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" />{fmtNum(row.shares)}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <CategoryBadge row={row} />
          {row.hashtags?.slice(0, 2).map(h => (
            <span key={h} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-[#0A6CFF]/10 text-[#3BA3FF]">#{h}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── HooksLibraryView ──────────────────────────────────────────────────────────

function HooksLibraryView({ videos }: { videos: TikTokRow[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const analyzed = videos.filter(v => v.ai_analysis?.hook_formula);

  const byFormula = analyzed.reduce<Record<string, TikTokRow[]>>((acc, v) => {
    const f = v.ai_analysis!.hook_formula ?? "Outros";
    (acc[f] = acc[f] ?? []).push(v);
    return acc;
  }, {});

  const formulas = Object.entries(byFormula).sort(([, a], [, b]) => b.length - a.length);
  const displayed = filter ? [[filter, byFormula[filter] ?? []]] as [string, TikTokRow[]][] : formulas;

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  };

  if (analyzed.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Library className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Nenhum hook catalogado ainda.</p>
        <p className="text-xs mt-1 opacity-55">Analise vídeos com IA para popular a biblioteca.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Formula filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter(null)}
          className="rounded-full px-3 py-1 text-[11px] font-medium border transition-colors"
          style={filter === null ? { background: "rgba(10,108,255,0.15)", borderColor: "rgba(10,108,255,0.5)", color: "#3BA3FF" }
                                 : { borderColor: "rgba(255,255,255,0.1)", color: "hsl(var(--muted-foreground))" }}>
          Todas ({analyzed.length})
        </button>
        {formulas.slice(0, 6).map(([formula, vids]) => (
          <button key={formula} onClick={() => setFilter(formula === filter ? null : formula)}
            className="rounded-full px-3 py-1 text-[11px] font-medium border transition-colors"
            style={filter === formula ? { background: "rgba(10,108,255,0.15)", borderColor: "rgba(10,108,255,0.5)", color: "#3BA3FF" }
                                      : { borderColor: "rgba(255,255,255,0.1)", color: "hsl(var(--muted-foreground))" }}>
            {formula.slice(0, 30)}{formula.length > 30 ? "…" : ""} ({vids.length})
          </button>
        ))}
      </div>

      {/* Formula cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayed.map(([formula, vids]) => (
          <div key={formula} className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between"
              style={{ background: "rgba(10,108,255,0.06)" }}>
              <div>
                <div className="text-xs font-semibold text-[#3BA3FF]">🎣 {formula}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{vids.length} exemplo{vids.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {vids.slice(0, 3).map(v => (
                <div key={v.id} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-white/3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-0.5">@{v.creator}</div>
                    <div className="text-xs text-foreground/85 line-clamp-2 leading-snug">{v.hook}</div>
                  </div>
                  <button onClick={() => copy(v.hook, v.id)}
                    className="shrink-0 p-1.5 rounded-lg border border-white/10 hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
                    {copied === v.id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ShopRadarView ─────────────────────────────────────────────────────────────

function ShopRadarView({
  videos,
  onSelect,
  onDelete,
  savedIds,
  escalatedIds,
}: {
  videos: TikTokRow[];
  onSelect: (row: TikTokRow) => void;
  onDelete: (id: string) => void;
  savedIds: Set<string>;
  escalatedIds: Set<string>;
}) {
  const [sub, setSub] = useState<ShopSubTab>("produtos");
  const def = SHOP_SUBTABS.find(s => s.id === sub)!;

  const subCounts = useMemo(() => {
    const counts = {} as Record<ShopSubTab, number>;
    for (const s of SHOP_SUBTABS) {
      if (s.id === "creators") {
        counts[s.id] = new Set(videos.map(v => v.creator)).size;
      } else {
        counts[s.id] = videos.filter(v =>
          s.hashtags.some(h => v.hashtags?.some(vh => vh.toLowerCase().includes(h))) ||
          s.keywords.some(k => (v.description + v.hook).toLowerCase().includes(k))
        ).length;
      }
    }
    return counts;
  }, [videos]);

  const filtered = useMemo(() => {
    if (sub === "creators") {
      // Group by creator — show top video per creator
      const byCreator = videos.reduce<Record<string, TikTokRow>>((acc, v) => {
        if (!acc[v.creator] || v.viral_score > acc[v.creator].viral_score) acc[v.creator] = v;
        return acc;
      }, {});
      return Object.values(byCreator).sort((a, b) => b.viral_score - a.viral_score);
    }
    return videos.filter(v => {
      const hashMatch = def.hashtags.some(h => v.hashtags?.some(vh => vh.toLowerCase().includes(h)));
      const kwMatch = def.keywords.some(k => (v.description + v.hook).toLowerCase().includes(k));
      return hashMatch || kwMatch;
    });
  }, [videos, sub, def]);

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {SHOP_SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
            style={sub === s.id
              ? { background: "rgba(255,0,80,0.15)", color: "#ff6680", border: "1px solid rgba(255,0,80,0.3)" }
              : { color: "hsl(var(--muted-foreground))", border: "1px solid rgba(255,255,255,0.08)" }}>
            {s.label}
            <span className="text-[10px] opacity-60">({subCounts[s.id]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum resultado para {def.label}. Mine mais vídeos de #{def.hashtags[0]}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {filtered.map(row => (
              <VideoCard key={row.id} row={row} onClick={() => onSelect(row)} onDelete={onDelete}
                isSaved={savedIds.has(row.id)} isEscalated={escalatedIds.has(row.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── CreatorsView ──────────────────────────────────────────────────────────────

function CreatorsView({
  videos,
  onSelect,
  onDelete,
  savedIds,
  escalatedIds,
  onSaveCreator,
}: {
  videos: TikTokRow[];
  onSelect: (row: TikTokRow) => void;
  onDelete: (id: string) => void;
  savedIds: Set<string>;
  escalatedIds: Set<string>;
  onSaveCreator: (creator: string, vids: TikTokRow[]) => void;
}) {
  const byCreator = videos.reduce<Record<string, TikTokRow[]>>((acc, v) => {
    (acc[v.creator] = acc[v.creator] ?? []).push(v);
    return acc;
  }, {});

  const sorted = Object.entries(byCreator).sort(
    ([, a], [, b]) => b.reduce((s, v) => s + v.views, 0) - a.reduce((s, v) => s + v.views, 0),
  );

  return (
    <div className="space-y-6">
      {sorted.map(([creator, vids]) => {
        const totalViews = vids.reduce((s, v) => s + v.views, 0);
        const avgScore = Math.round(vids.reduce((s, v) => s + v.viral_score, 0) / vids.length);
        return (
          <div key={creator}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}>
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
              <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 hover:bg-white/5 shrink-0"
                onClick={() => onSaveCreator(creator, vids)}>
                <Bookmark className="h-3 w-3 mr-1" /> Salvar Creator
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {vids.slice(0, 5).map(row => (
                <VideoCard key={row.id} row={row} onClick={() => onSelect(row)} onDelete={onDelete}
                  isSaved={savedIds.has(row.id)} isEscalated={escalatedIds.has(row.id)} />
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

  const PAGE_SIZE = 20;

  const [activeTab, setActiveTab]             = useState<RadarTab>("trending");
  const [hashtag, setHashtag]                 = useState("");
  const [limit, setLimit]                     = useState(20);
  const [page, setPage]                       = useState(1);
  // Batch analysis
  const [batchRunning, setBatchRunning]       = useState(false);
  const [batchProgress, setBatchProgress]     = useState<{ done: number; total: number } | null>(null);
  // Mining queue
  const [queueInput, setQueueInput]           = useState("");
  const [mineQueue, setMineQueue]             = useState<string[]>([]);
  const [queueRunning, setQueueRunning]       = useState(false);
  const [queueProgress, setQueueProgress]    = useState<{ done: number; total: number; current: string } | null>(null);
  // Escalate hub
  const [escalateHubFor, setEscalateHubFor]  = useState<TikTokRow | null>(null);
  const [mining, setMining]                   = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [videos, setVideos]                   = useState<TikTokRow[]>([]);
  const [analyzingIds, setAnalyzingIds]       = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo]     = useState<TikTokRow | null>(null);
  const [filterHashtag, setFilterHashtag]     = useState<string | null>(null);
  const [mineResult, setMineResult]           = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError]                     = useState<string | null>(null);
  // Save/escalate state
  const [savedIds, setSavedIds]               = useState<Set<string>>(new Set());
  const [escalatedIds, setEscaledIds]         = useState<Set<string>>(new Set());
  const [savingId, setSavingId]               = useState<string | null>(null);
  // Playbook state
  const [playbookFor, setPlaybookFor]         = useState<TikTokRow | null>(null);
  const [playbook, setPlaybook]               = useState<TikTokPlaybook | null>(null);
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [escalatingPb, setEscalatingPb]       = useState(false);
  const [escalatedPb, setEscalatedPb]         = useState(false);
  // Clone structure modal
  const [cloneFor, setCloneFor]               = useState<TikTokRow | null>(null);

  // Auto-clear error after 6s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const mineHashtag    = useServerFn(mineTikTokHashtagFn);
  const listMined      = useServerFn(listTikTokMinedFn);
  const analyzeVideo   = useServerFn(analyzeTikTokVideoFn);
  const deleteVideo    = useServerFn(deleteTikTokVideoFn);
  const clearHashtag   = useServerFn(clearTikTokHashtagFn);
  const saveAnuncio    = useServerFn(saveAnuncioFn);
  const escalateAnuncio = useServerFn(escalateAnuncioFn);
  const saveCreator    = useServerFn(saveCreatorFn);
  const genPlaybook    = useServerFn(generatePlaybookFn);
  const genEscalatePack = useServerFn(generateEscalatePackFn);
  const fetchOembed    = useServerFn(fetchThumbnailsOembedFn);

  const activeTabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];

  const loadVideos = useCallback(async (htag?: string) => {
    setLoading(true); setError(null);
    try {
      const rows = await listMined({ data: { hashtag: htag, limit: 200 } });
      setVideos(rows as TikTokRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar vídeos");
    } finally { setLoading(false); }
  }, [listMined]);

  useEffect(() => { loadVideos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMine = async () => {
    const query = (hashtag.trim() || activeTabDef.defaultHashtag).replace(/^#/, "");
    setMining(true); setError(null); setMineResult(null);
    try {
      const result = await mineHashtag({ data: { hashtag: query, limit } });
      setMineResult(result);
      await loadVideos(filterHashtag ?? undefined);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao minerar");
    } finally { setMining(false); }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      const analysis = await analyzeVideo({ data: { id } });
      const update = (v: TikTokRow) => v.id === id ? { ...v, ai_analysis: analysis as TikTokAiAnalysis } : v;
      setVideos(prev => prev.map(update));
      setSelectedVideo(prev => prev?.id === id ? update(prev) : prev);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao analisar");
    } finally {
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo({ data: { id } });
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao deletar"); }
  };

  const handleClearHashtag = async (htag: string) => {
    try {
      await clearHashtag({ data: { hashtag: htag } });
      setVideos(prev => prev.filter(v => v.hashtag !== htag));
      if (filterHashtag === htag) setFilterHashtag(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao limpar"); }
  };

  const handleSave = async (row: TikTokRow) => {
    if (savedIds.has(row.id)) return;
    setSavingId(row.id);
    try {
      const es = calcEnhancedScore(row);
      await saveAnuncio({ data: rowToAdPayload(row, es) });
      setSavedIds(prev => new Set(prev).add(row.id));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSavingId(null); }
  };

  const handleEscalate = async (row: TikTokRow, pb?: TikTokPlaybook | null) => {
    const es = calcEnhancedScore(row);
    try {
      await escalateAnuncio({
        data: { ...rowToAdPayload(row, es), playbook: (pb ?? null) as Record<string, unknown> | null },
      });
      setEscaledIds(prev => new Set(prev).add(row.id));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao escalar"); }
  };

  const handleSaveCreator = async (creator: string, vids: TikTokRow[]) => {
    const totalViews = vids.reduce((s, v) => s + v.views, 0);
    const avgViews = Math.round(totalViews / vids.length);
    const avgScore = Math.round(vids.reduce((s, v) => s + v.viral_score, 0) / vids.length);
    const topHashtags = [...new Set(vids.flatMap(v => v.hashtags ?? []))].slice(0, 10);
    try {
      await saveCreator({ data: { creator, source: "tiktok", profile_url: "", total_videos: vids.length, avg_views: avgViews, avg_viral_score: avgScore, top_hashtags: topHashtags } });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro ao salvar creator"); }
  };

  const handleGeneratePlaybook = async (row: TikTokRow) => {
    setSelectedVideo(null);
    setPlaybookFor(row);
    setPlaybook(null);
    setPlaybookLoading(true);
    setEscalatedPb(false);
    try {
      const pb = await genPlaybook({ data: { id: row.id } });
      setPlaybook(pb as TikTokPlaybook);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao gerar playbook");
      setPlaybookFor(null);
    } finally { setPlaybookLoading(false); }
  };

  const handlePlaybookEscalate = async () => {
    if (!playbookFor) return;
    setEscalatingPb(true);
    await handleEscalate(playbookFor, playbook);
    setEscalatingPb(false);
    setEscalatedPb(true);
  };

  const handleAction = (action: string, row: TikTokRow) => {
    const ctx = [
      `Hook TikTok: ${row.hook}`,
      row.ai_analysis?.niche   ? `Nicho: ${row.ai_analysis.niche}` : "",
      row.ai_analysis?.promise ? `Promessa: ${row.ai_analysis.promise}` : "",
      row.ai_analysis?.offer_angle ? `Ângulo: ${row.ai_analysis.offer_angle}` : "",
      row.ai_analysis?.vsl_hook ? `Hook VSL: ${row.ai_analysis.vsl_hook}` : "",
      `Criador: @${row.creator}`,
      `Views: ${fmtNum(row.views)} · Likes: ${fmtNum(row.likes)}`,
    ].filter(Boolean).join("\n");
    try { sessionStorage.setItem("tiktok_radar_context", ctx); } catch { /* ignore */ }

    switch (action) {
      case "save":     handleSave(row); return;
      case "escalate": handleOpenEscalateHub(row); return;
      case "playbook": handleGeneratePlaybook(row); return;
      case "ebook":    navigate({ to: "/produtos/ebook" }); return;
      case "vsl":      navigate({ to: "/pagina-venda" }); return;
      case "clone":    setSelectedVideo(null); setCloneFor(row); return;
      case "creative": navigate({ to: "/criativos" }); return;
    }
  };

  // ── Batch analysis ──────────────────────────────────────────────────────────

  const handleBatchAnalyze = async () => {
    const unanalyzed = videos.filter(v => !v.ai_analysis);
    if (!unanalyzed.length) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: unanalyzed.length });
    for (let i = 0; i < unanalyzed.length; i++) {
      try {
        const analysis = await analyzeVideo({ data: { id: unanalyzed[i].id } });
        const id = unanalyzed[i].id;
        const update = (v: TikTokRow) => v.id === id ? { ...v, ai_analysis: analysis as TikTokAiAnalysis } : v;
        setVideos(prev => prev.map(update));
      } catch { /* skip failed */ }
      setBatchProgress({ done: i + 1, total: unanalyzed.length });
    }
    setBatchRunning(false);
    setBatchProgress(null);
  };

  // ── Fix thumbnails via TikTok oEmbed API (server-side, no Apify needed) ──

  const handleFixThumbnails = async () => {
    setMining(true); setError(null);
    try {
      const result = await fetchOembed({});
      await loadVideos(filterHashtag ?? undefined);
      if (result && typeof result === "object" && "updated" in result) {
        if ((result as { updated: number }).updated === 0) {
          setError("Nenhuma thumbnail nova encontrada via oEmbed. Tente minerar novamente.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar thumbnails");
    } finally {
      setMining(false);
    }
  };

  // ── Mining queue ─────────────────────────────────────────────────────────────

  const addToQueue = () => {
    const tags = queueInput.split(/[,\s]+/).map(t => t.replace(/^#/, "").trim()).filter(Boolean);
    setMineQueue(prev => [...new Set([...prev, ...tags])]);
    setQueueInput("");
  };

  const handleQueueMine = async () => {
    if (!mineQueue.length || queueRunning) return;
    setQueueRunning(true);
    const queue = [...mineQueue];
    for (let i = 0; i < queue.length; i++) {
      const tag = queue[i];
      setQueueProgress({ done: i, total: queue.length, current: tag });
      try {
        await mineHashtag({ data: { hashtag: tag, limit } });
      } catch { /* skip failed */ }
    }
    setMineQueue([]);
    setQueueRunning(false);
    setQueueProgress(null);
    await loadVideos(filterHashtag ?? undefined);
  };

  // ── Escalate hub ──────────────────────────────────────────────────────────────

  const handleOpenEscalateHub = (row: TikTokRow) => {
    setSelectedVideo(null);
    setEscalateHubFor(row);
  };

  // ── Tab filtering ───────────────────────────────────────────────────────────

  const base = useMemo(
    () => (filterHashtag ? videos.filter(v => v.hashtag === filterHashtag) : videos),
    [filterHashtag, videos],
  );

  const tabFiltered = useMemo<TikTokRow[]>(() => {
    if (activeTab === "viral-hooks")      return base.filter(v => v.viral_score >= 60);
    if (activeTab === "tiktok-shop")      return base.filter(v => v.hashtags?.some(h => ["tiktokshop","shop","tiktokmademebuyit","produto","shopnow"].includes(h.toLowerCase())));
    if (activeTab === "ads-spy") {
      const adWords = ["ads","adsnotsponsored","ugcads","ugc","sponsored","ad","publicidade","anuncio","anúncio","patrocinado"];
      return base.filter(v =>
        v.hashtags?.some(h => adWords.includes(h.toLowerCase())) ||
        adWords.some(w => v.description?.toLowerCase().includes(w) || v.hook?.toLowerCase().includes(w))
      );
    }
    if (activeTab === "winning-products") return base.filter(v => v.hashtags?.some(h => ["dropshipping","produto","winningproduct","product","ecommerce","shopify"].includes(h.toLowerCase())));
    if (activeTab === "vsls") {
      const vslWords = ["vsl","videovendas","salesletter","sales","oferta","compre","desconto","resultado","ganhe","clique","acesse","comprar","promoção","promocao","garanta"];
      return base.filter(v =>
        v.hashtags?.some(h => vslWords.includes(h.toLowerCase())) ||
        vslWords.some(w => v.description?.toLowerCase().includes(w) || v.hook?.toLowerCase().includes(w))
      );
    }
    return base;
  }, [activeTab, base]);

  // Reset pagination on tab/filter change
  useEffect(() => setPage(1), [activeTab, filterHashtag]);

  const paginatedVideos = useMemo(
    () => tabFiltered.slice(0, page * PAGE_SIZE),
    [tabFiltered, page],
  );

  const uniqueHashtags = [...new Set(videos.map(v => v.hashtag))];
  const viralCount = videos.filter(v => v.viral_score >= 70).length;
  const hotCount   = videos.filter(v => v.viral_score >= 45 && v.viral_score < 70).length;
  const aiCount    = videos.filter(v => v.ai_analysis).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-16">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, #060610 0%, #0a0820 40%, #120010 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(255,0,80,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 40%, rgba(0,242,234,0.12) 0%, transparent 55%)" }} />
        <div className="relative px-6 py-7 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #ff0050, #00f2ea)" }}>
                <Play className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">TikTok Radar</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,0,80,0.15)", color: "#ff6680", border: "1px solid rgba(255,0,80,0.25)" }}>
                PRO
              </span>
            </div>
            <p className="text-sm text-white/55 max-w-md">
              Mineração profissional de vídeos virais com IA, playbooks automáticos e gestão de escala.
            </p>
            <div className="flex gap-5 mt-4 text-xs text-white/45">
              <span><span className="font-bold text-white/70 mr-1">{viralCount}</span>virais</span>
              <span><span className="font-bold text-white/70 mr-1">{hotCount}</span>quentes</span>
              <span><span className="font-bold text-white/70 mr-1">{aiCount}</span>com IA</span>
              <span><span className="font-bold text-white/70 mr-1">{savedIds.size}</span>salvos</span>
              <span><span className="font-bold text-white/70 mr-1">{escalatedIds.size}</span>escalados</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-3xl font-bold text-white/80">{videos.length}</div>
            <div className="text-xs text-white/40">vídeos</div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0"
              style={isActive
                ? { background: "#0A6CFF", color: "#fff", boxShadow: "0 0 20px rgba(10,108,255,0.4)" }
                : { color: "hsl(var(--muted-foreground))" }}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">{activeTabDef.description}</p>

      {/* ── Search bar ── */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3"
        style={{ boxShadow: "0 0 40px -10px rgba(10,108,255,0.07)" }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={hashtag} onChange={e => setHashtag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleMine()}
              placeholder={`hashtag (padrão: ${activeTabDef.defaultHashtag})`}
              className="pl-9 bg-transparent border-white/10 focus:border-[#0A6CFF]/50" />
          </div>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 text-sm text-muted-foreground">
            {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} vídeos</option>)}
          </select>
          <Button onClick={handleMine} disabled={mining}
            className="gap-2 bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white shrink-0"
            style={mining ? {} : { boxShadow: "0 0 20px rgba(10,108,255,0.35)" }}>
            {mining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {mining ? "Minerando..." : "Minerar"}
          </Button>
        </div>

        {mineResult && (
          <p className="text-xs text-[#3BA3FF]">
            ✓ {mineResult.inserted} novos vídeos salvos
            {mineResult.skipped > 0 ? ` · ${mineResult.skipped} duplicados ignorados` : ""}
          </p>
        )}

        {/* Batch analysis progress */}
        {batchRunning && batchProgress && (
          <div className="rounded-lg border border-[#0A6CFF]/30 bg-[#0A6CFF]/8 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#3BA3FF] font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Analisando com IA...
              </span>
              <span className="text-muted-foreground">{batchProgress.done}/{batchProgress.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-[#0A6CFF] transition-all duration-300"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Queue progress */}
        {queueRunning && queueProgress && (
          <div className="rounded-lg border border-[#ff9500]/30 bg-[#ff9500]/8 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#ff9500] font-medium flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Minerando fila — #{queueProgress.current}
              </span>
              <span className="text-muted-foreground">{queueProgress.done}/{queueProgress.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-[#ff9500] transition-all duration-300"
                style={{ width: `${(queueProgress.done / queueProgress.total) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" disabled={loading}
            onClick={() => loadVideos(filterHashtag ?? undefined)}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Carregar salvos
          </Button>

          {/* Batch analyze button */}
          {videos.filter(v => !v.ai_analysis).length > 0 && !batchRunning && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-[#0A6CFF]/30 text-[#3BA3FF] hover:bg-[#0A6CFF]/10"
              onClick={handleBatchAnalyze}>
              <Sparkles className="h-3 w-3 mr-1" />
              Analisar todos ({videos.filter(v => !v.ai_analysis).length})
            </Button>
          )}

          {/* Fix thumbnails button — only when there are videos with empty thumbnails */}
          {videos.filter(v => !v.thumbnail_url).length > 0 && !mining && (
            <Button size="sm" variant="outline"
              className="h-7 text-xs border-[#ff9500]/30 text-[#ff9500] hover:bg-[#ff9500]/10"
              onClick={handleFixThumbnails}
              title="Busca thumbnails reais via TikTok oEmbed para vídeos sem imagem">
              <Search className="h-3 w-3 mr-1" />
              Buscar thumbnails ({videos.filter(v => !v.thumbnail_url).length})
            </Button>
          )}

          {/* Mining queue toggle */}
          <div className="flex items-center gap-1">
            <Input value={queueInput} onChange={e => setQueueInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addToQueue()}
              placeholder="fila: hashtag1, hashtag2..."
              className="h-7 text-xs bg-transparent border-white/10 w-44 focus:border-[#ff9500]/50" />
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 shrink-0"
              onClick={addToQueue} disabled={!queueInput.trim()}>
              <ListPlus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Queue pills */}
        {mineQueue.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[10px] text-muted-foreground">Fila:</span>
            {mineQueue.map(tag => (
              <div key={tag} className="flex items-center gap-0.5">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium border border-[#ff9500]/30 bg-[#ff9500]/10 text-[#ff9500]">#{tag}</span>
                <button onClick={() => setMineQueue(prev => prev.filter(t => t !== tag))}
                  className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button size="sm" className="h-6 text-[10px] gap-1 bg-[#ff9500] hover:bg-[#ff9500]/80 text-black font-bold shrink-0"
              disabled={queueRunning} onClick={handleQueueMine}>
              {queueRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              Minerar fila ({mineQueue.length})
            </Button>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Skeleton Loading ── */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Hooks Library ── */}
      {!loading && activeTab === "hooks-library" && (
        <HooksLibraryView videos={videos} />
      )}

      {/* ── Shop Radar ── */}
      {!loading && activeTab === "shop-radar" && (
        <ShopRadarView videos={base} onSelect={setSelectedVideo} onDelete={handleDelete}
          savedIds={savedIds} escalatedIds={escalatedIds} />
      )}

      {/* ── Creators ── */}
      {!loading && activeTab === "creators" && (
        tabFiltered.length > 0 ? (
          <CreatorsView videos={tabFiltered} onSelect={setSelectedVideo} onDelete={handleDelete}
            savedIds={savedIds} escalatedIds={escalatedIds} onSaveCreator={handleSaveCreator} />
        ) : !error ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum criador minerado ainda.</p>
            <p className="text-xs mt-1 opacity-55">Mine #{activeTabDef.defaultHashtag} para descobrir criadores.</p>
          </div>
        ) : null
      )}

      {/* ── Grid view (all other tabs) ── */}
      {!loading && !["hooks-library", "shop-radar", "creators"].includes(activeTab) && (
        <>
          {tabFiltered.length === 0 && !error ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(255,0,80,0.08), rgba(0,242,234,0.08))", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Play className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm">Nenhum vídeo para esta aba.</p>
              <p className="text-xs mt-1 opacity-55">Minere #{activeTabDef.defaultHashtag} para começar</p>
              <Button className="mt-4 bg-[#0A6CFF] hover:bg-[#0A6CFF]/80 text-white text-xs h-8"
                onClick={handleMine} disabled={mining}>
                {mining ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Search className="h-3 w-3 mr-1.5" />}
                Minerar #{activeTabDef.defaultHashtag}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {paginatedVideos.map(row => (
                    <VideoCard key={row.id} row={row} onClick={() => setSelectedVideo(row)} onDelete={handleDelete}
                      isSaved={savedIds.has(row.id)} isEscalated={escalatedIds.has(row.id)} />
                  ))}
                </AnimatePresence>
              </div>
              {paginatedVideos.length < tabFiltered.length && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm"
                    className="gap-2 border-white/10 hover:bg-white/5 text-muted-foreground"
                    onClick={() => setPage(p => p + 1)}>
                    Carregar mais ({tabFiltered.length - paginatedVideos.length} restantes)
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Video Modal ── */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal row={selectedVideo} onClose={() => setSelectedVideo(null)}
            onAnalyze={handleAnalyze} analyzing={analyzingIds.has(selectedVideo.id)}
            onAction={handleAction} savedIds={savedIds} escalatedIds={escalatedIds} />
        )}
      </AnimatePresence>

      {/* ── Playbook Modal ── */}
      <AnimatePresence>
        {playbookFor && (
          <PlaybookModal row={playbookFor} playbook={playbook} loading={playbookLoading}
            onClose={() => { setPlaybookFor(null); setPlaybook(null); }}
            onEscalate={handlePlaybookEscalate}
            escalating={escalatingPb} escalated={escalatedPb} />
        )}
      </AnimatePresence>

      {/* ── Escalate Hub Modal ── */}
      <AnimatePresence>
        {escalateHubFor && (
          <EscalateHubModal
            row={escalateHubFor}
            onClose={() => setEscalateHubFor(null)}
            onSave={handleSave}
            onEscalate={(row) => handleEscalate(row)}
            savedIds={savedIds}
            escalatedIds={escalatedIds}
            genPack={async (id) => {
              const result = await genEscalatePack({ data: { id } });
              return result as EscalatePack;
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Clone Structure Modal ── */}
      <AnimatePresence>
        {cloneFor && (
          <CloneStructureModal
            row={cloneFor}
            onClose={() => setCloneFor(null)}
            onGeneratePlaybook={(row) => { setCloneFor(null); handleGeneratePlaybook(row); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
