// Fase 2 da missão "Radar de Vídeos Virais" — experiência unificada sobre
// os quatro mineradores já existentes (TikTok, Instagram, YouTube,
// Facebook Ads). Não substitui nenhuma das páginas de radar individuais
// (continuam existindo e funcionando exatamente como antes) — esta é uma
// camada nova, só de leitura, por cima do que já está salvo.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Flame,
  Sparkles,
  Megaphone,
  Bookmark,
  Loader2,
  Play,
  X,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageCircle,
  Clock,
  Film,
} from "lucide-react";
import {
  listVideoRadarFn,
  VIDEO_RADAR_PLATFORMS,
  type VideoRadarCard,
  type VideoRadarPlatform,
  type VideoRadarTab,
} from "@/lib/video-radar.functions";
import { TransformToProjectButton } from "@/components/TransformToProjectButton";

export const Route = createFileRoute("/_authenticated/radar-videos")({
  component: RadarVideosPage,
});

const TABS: { value: VideoRadarTab; label: string; icon: typeof Flame }[] = [
  { value: "bombando", label: "Bombando Agora", icon: Flame },
  { value: "virais", label: "Vídeos Virais", icon: Sparkles },
  { value: "anuncios_ativos", label: "Anúncios Ativos", icon: Megaphone },
  { value: "salvos", label: "Criativos Salvos", icon: Bookmark },
];

const PLATFORM_LABEL: Record<VideoRadarPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
};

const PLATFORM_COLOR: Record<VideoRadarPlatform, string> = {
  tiktok: "#FF0050",
  instagram: "#E1306C",
  youtube: "#FF4040",
  facebook: "#1877F2",
};

const STATUS_LABEL: Record<VideoRadarCard["status"], string | null> = {
  recent: "Publicado recentemente",
  viral: "Alta pontuação real",
  active_ad: null, // computed per-card (precisa dos dias ativos)
  normal: null,
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function PlayerModal({ card, onClose }: { card: VideoRadarCard; onClose: () => void }) {
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
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-background overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10">
          <span className="text-sm font-medium truncate">{card.title}</span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-black">
          {card.playerKind === "tiktok_embed" && card.embedUrl ? (
            <iframe
              src={card.embedUrl}
              title={card.title}
              allowFullScreen
              className="h-[70vh] w-full"
            />
          ) : card.playerKind === "youtube_embed" && card.embedUrl ? (
            <div className="aspect-video">
              <iframe
                src={`${card.embedUrl}?autoplay=1`}
                title={card.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : card.playerKind === "native_video" && card.directVideoUrl ? (
            <video src={card.directVideoUrl} controls autoPlay className="max-h-[70vh] w-full" />
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Reprodução não disponível para este item — abra o original.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
          <span>{card.authorOrAdvertiser ?? "—"}</span>
          {card.originalUrl && (
            <a
              href={card.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Abrir original
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function VideoCard({ card }: { card: VideoRadarCard }) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const canPlay = card.playerKind !== "image_only";
  const color = PLATFORM_COLOR[card.platform];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-md overflow-hidden flex flex-col"
    >
      <AnimatePresence>
        {playing && <PlayerModal card={card} onClose={() => setPlaying(false)} />}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => canPlay && setPlaying(true)}
        className="relative aspect-video w-full bg-muted group"
      >
        {card.thumbnailUrl && !imgError ? (
          <img
            src={card.thumbnailUrl}
            alt=""
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-8 w-8 opacity-20" />
          </div>
        )}
        {canPlay && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <Play
              className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100"
              fill="currentColor"
            />
          </span>
        )}
        <Badge
          className="absolute left-2 top-2 rounded-full"
          style={{ background: color, color: "#fff", border: "none" }}
        >
          {PLATFORM_LABEL[card.platform]}
        </Badge>
        {card.status === "recent" && (
          <Badge variant="outline" className="absolute right-2 top-2 rounded-full bg-background/80">
            {STATUS_LABEL.recent}
          </Badge>
        )}
        {card.status === "viral" && typeof card.score === "number" && (
          <Badge variant="outline" className="absolute right-2 top-2 rounded-full bg-background/80">
            Score real {card.score}
          </Badge>
        )}
        {card.status === "active_ad" && typeof card.daysActive === "number" && (
          <Badge variant="outline" className="absolute right-2 top-2 rounded-full bg-background/80">
            Ativo há {card.daysActive} {card.daysActive === 1 ? "dia" : "dias"}
          </Badge>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-sm font-medium line-clamp-2">{card.title}</p>
        {card.authorOrAdvertiser && (
          <p className="text-xs text-muted-foreground truncate">{card.authorOrAdvertiser}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {typeof card.views === "number" && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {fmt(card.views)}
            </span>
          )}
          {typeof card.likes === "number" && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" /> {fmt(card.likes)}
            </span>
          )}
          {typeof card.comments === "number" && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {fmt(card.comments)}
            </span>
          )}
          {card.createdAt && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" /> {new Date(card.createdAt).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {card.originalUrl ? (
            <a
              href={card.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" /> Original
            </a>
          ) : (
            <span />
          )}
          {/* Fase 6: gerar briefing para o agente de tráfego reutilizando a
              integração Cris OS já existente — só funciona para Facebook
              hoje, porque é a única fonte com identidade (ad_library_id/
              ad_url) já ligada ao contrato de handoff real. */}
          {card.platform === "facebook" && (
            <TransformToProjectButton
              adLibraryId={card.id}
              adUrl={card.originalUrl}
              variant="icon"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "Qualquer período" },
  { value: "24h", label: "Últimas 24 horas" },
  { value: "3d", label: "Últimos 3 dias" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

function RadarVideosPage() {
  const [tab, setTab] = useState<VideoRadarTab>("bombando");
  const [platforms, setPlatforms] = useState<Set<VideoRadarPlatform>>(
    new Set(VIDEO_RADAR_PLATFORMS),
  );
  const [dateRange, setDateRange] = useState<string>("7d");
  const [keyword, setKeyword] = useState("");
  const [videoType, setVideoType] = useState<string>("");
  const [country, setCountry] = useState("");
  const [cards, setCards] = useState<VideoRadarCard[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listVideoRadar = useServerFn(listVideoRadarFn);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listVideoRadar({
        data: {
          tab,
          platforms: Array.from(platforms),
          dateRange: dateRange as "24h" | "3d" | "7d" | "30d" | "all",
          keyword: keyword.trim() || undefined,
          country: country.trim() || undefined,
          videoType: (videoType || undefined) as "video" | "image" | "short" | undefined,
          limit: 60,
        },
      });
      setCards(res.cards);
      setNotes(res.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o radar de vídeos");
    } finally {
      setLoading(false);
    }
  }, [listVideoRadar, tab, platforms, dateRange, keyword, country, videoType]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function togglePlatform(p: VideoRadarPlatform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Radar de Vídeos</h1>
        <p className="text-sm text-muted-foreground">
          O que está ganhando tração agora — TikTok, Instagram, YouTube e Facebook Ads, num só
          lugar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.value}
              size="sm"
              variant={tab === t.value ? "default" : "outline"}
              onClick={() => setTab(t.value)}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_RADAR_PLATFORMS.map((p) => (
            <Badge
              key={p}
              variant={platforms.has(p) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => togglePlatform(p)}
            >
              {PLATFORM_LABEL[p]}
            </Badge>
          ))}
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={videoType || "any"}
          onValueChange={(v) => setVideoType(v === "any" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Qualquer tipo</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="image">Imagem</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Produto ou palavra-chave"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-8 w-[200px] text-xs"
        />
        <Input
          placeholder="País (só Facebook)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-8 w-[160px] text-xs"
        />
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
        </Button>
      </div>

      {notes.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/3 p-2 text-xs text-muted-foreground space-y-0.5">
          {notes.map((n) => (
            <p key={n}>⚠️ {n}</p>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : cards.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Film className="h-10 w-10 mx-auto mb-3 opacity-20" />
          Nenhum resultado real encontrado com esses filtros. Experimente minerar mais nas páginas
          de radar individuais ou ajustar os filtros.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {cards.map((c) => (
              <VideoCard key={`${c.platform}-${c.id}`} card={c} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
