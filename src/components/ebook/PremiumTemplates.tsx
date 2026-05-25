import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Eye, Sparkles, Wand2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateEbookCoverFn } from "@/lib/storybook.functions";
import { ALL_TEMPLATES, type TemplateMaster } from "@/lib/ebook/template-master";
import type { AiKickstart } from "./EbookHub";

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STUDIO_KEY = (id: string) => `ebook-studio-${id}`;

function loadCover(id: string): string | null {
  try {
    const raw = localStorage.getItem(STUDIO_KEY(id));
    if (raw) {
      const s = JSON.parse(raw) as { coverUrl?: string };
      if (s.coverUrl) return s.coverUrl;
    }
  } catch {}
  return null;
}

function persistCover(id: string, url: string) {
  try {
    const raw = localStorage.getItem(STUDIO_KEY(id));
    const s = raw ? (JSON.parse(raw) as object) : {};
    localStorage.setItem(STUDIO_KEY(id), JSON.stringify({ ...s, coverUrl: url }));
  } catch {}
}

// ─── Level styles ─────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<TemplateMaster["level"], string> = {
  Iniciante: "#10B981",
  Premium: "#60A5FA",
  "High Ticket": "#EAB308",
};

const LEVEL_BG: Record<TemplateMaster["level"], string> = {
  Iniciante: "rgba(16,185,129,0.12)",
  Premium: "rgba(96,165,250,0.12)",
  "High Ticket": "rgba(234,179,8,0.12)",
};

// ─── 3D Book Mockup ───────────────────────────────────────────────────────────

function Book3D({
  template,
  coverUrl,
  size = "sm",
  onGenerate,
  generating,
}: {
  template: TemplateMaster;
  coverUrl?: string;
  size?: "sm" | "lg";
  onGenerate?: (e: React.MouseEvent) => void;
  generating?: boolean;
}) {
  const spW = size === "lg" ? 14 : 10;
  const bW = size === "lg" ? 148 : 105;
  const bH = Math.round(bW * 1.42);
  const pgW = size === "lg" ? 8 : 5;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        filter: `drop-shadow(3px 8px 20px ${template.colorA}55) drop-shadow(0 3px 6px rgba(0,0,0,0.55))`,
        transform: "perspective(700px) rotateY(-12deg)",
        transformOrigin: "center",
      }}
    >
      {/* Spine */}
      <div
        style={{
          width: spW,
          height: bH,
          background: `linear-gradient(180deg, ${template.colorA}70 0%, ${template.colorB} 100%)`,
          borderRadius: "3px 0 0 3px",
          flexShrink: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset -2px 0 4px rgba(0,0,0,0.35)",
        }}
      >
        <span
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: size === "lg" ? 7 : 5.5,
            color: "rgba(255,255,255,0.40)",
            letterSpacing: 0.4,
            maxHeight: "80%",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {template.name}
        </span>
      </div>

      {/* Cover */}
      <div
        style={{
          width: bW,
          height: bH,
          position: "relative",
          overflow: "hidden",
          background: coverUrl
            ? `url(${coverUrl}) center / cover no-repeat`
            : `linear-gradient(145deg, ${template.colorA} 0%, ${template.colorB} 100%)`,
          flexShrink: 0,
        }}
      >
        {/* Horizontal line texture (no cover) */}
        {!coverUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.055,
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(255,255,255,1) 11px, rgba(255,255,255,1) 12px)",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Specular highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.20) 0%, transparent 55%, rgba(0,0,0,0.12) 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Text content (no cover) */}
        {!coverUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: size === "lg" ? 6 : 4,
              padding: "0 6px",
              color: "white",
              textAlign: "center",
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: size === "lg" ? 38 : 26, lineHeight: 1 }}>
              {template.emoji}
            </span>
            <p
              style={{
                fontSize: size === "lg" ? 11.5 : 8.5,
                fontWeight: 700,
                lineHeight: 1.25,
                textShadow: "0 1px 8px rgba(0,0,0,0.8)",
                margin: 0,
              }}
            >
              {template.name}
            </p>
            {size === "lg" && (
              <p style={{ fontSize: 9, opacity: 0.6, margin: 0 }}>
                {template.pages} páginas
              </p>
            )}
          </div>
        )}
        {/* Level badge */}
        <div
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            zIndex: 2,
            background: "rgba(0,0,0,0.60)",
            backdropFilter: "blur(4px)",
            color: LEVEL_COLOR[template.level],
            fontSize: size === "lg" ? 8 : 6,
            fontWeight: 700,
            padding: "2px 5px",
            borderRadius: 3,
            border: `1px solid ${LEVEL_COLOR[template.level]}40`,
            letterSpacing: 0.3,
          }}
        >
          {template.level === "High Ticket" ? "HT" : template.level.slice(0, 4).toUpperCase()}
        </div>
        {/* AI cover generation button */}
        {onGenerate && !coverUrl && (
          <button
            onClick={onGenerate}
            disabled={generating}
            style={{
              position: "absolute",
              bottom: 5,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
              whiteSpace: "nowrap",
              cursor: generating ? "wait" : "pointer",
              background: "rgba(0,0,0,0.72)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "rgba(255,255,255,0.92)",
              borderRadius: 4,
              fontSize: size === "lg" ? 9 : 7,
              padding: "2px 7px",
              opacity: generating ? 0.55 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {generating ? "Gerando..." : "✨ Capa IA"}
          </button>
        )}
      </div>

      {/* Pages edge */}
      <div
        style={{
          width: pgW,
          height: bH - 3,
          marginTop: 1.5,
          flexShrink: 0,
          background:
            "repeating-linear-gradient(to right, #bebebe, #bebebe 0.5px, #eeeeee 0.5px, #eeeeee 1.8px)",
          borderRadius: "0 2px 2px 0",
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.20)",
        }}
      />
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  t,
  index,
  covers,
  generatingId,
  onUse,
  onPreview,
  onGenCover,
}: {
  t: TemplateMaster;
  index: number;
  covers: Record<string, string>;
  generatingId: string | null;
  onUse: () => void;
  onPreview: () => void;
  onGenCover: (t: TemplateMaster) => void;
}) {
  const coverUrl = covers[t.id];
  const isGen = generatingId === t.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="flex-none"
      style={{ width: 212, scrollSnapAlign: "start" }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-sm transition-all duration-300"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.boxShadow = `0 0 0 1px ${t.colorA}50, 0 8px 32px -8px ${t.colorA}35`;
          el.style.borderColor = `${t.colorA}38`;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.04)";
          el.style.borderColor = "rgba(255,255,255,0.08)";
        }}
      >
        {/* Book area */}
        <div
          className="flex items-center justify-center"
          style={{
            padding: "20px 14px 16px",
            background: `linear-gradient(160deg, ${t.colorB}28 0%, ${t.colorA}12 100%)`,
            minHeight: 182,
          }}
        >
          <Book3D
            template={t}
            coverUrl={coverUrl}
            onGenerate={
              t.coverPrompt
                ? (e) => {
                    e.stopPropagation();
                    onGenCover(t);
                  }
                : undefined
            }
            generating={isGen}
          />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 p-3 pt-2.5">
          <div className="flex items-start justify-between gap-1.5">
            <p className="flex-1 text-[13px] font-semibold leading-snug">{t.name}</p>
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 700,
                color: LEVEL_COLOR[t.level],
                background: LEVEL_BG[t.level],
                padding: "1px 6px",
                borderRadius: 4,
                border: `1px solid ${LEVEL_COLOR[t.level]}28`,
              }}
            >
              {t.level}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              {t.category}
            </Badge>
            <span className="opacity-40">·</span>
            <span>{t.pages}p</span>
            {t.chapters.length > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span>{t.chapters.length} cap.</span>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-1 flex gap-1.5">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: `0 4px 12px ${t.colorA}38`,
              }}
              onClick={onUse}
            >
              Abrir Studio
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 shrink-0 border-white/15 p-0"
              onClick={onPreview}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PremiumTemplates({
  onAiGenerate: _onAiGenerate,
  busy: _busy,
}: {
  onAiGenerate?: (k: AiKickstart) => void;
  busy?: boolean;
}) {
  const navigate = useNavigate();
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TemplateMaster | null>(null);
  const genCover = useServerFn(generateEbookCoverFn);

  // Load saved covers from localStorage on mount
  useEffect(() => {
    const saved: Record<string, string> = {};
    for (const t of ALL_TEMPLATES) {
      const url = loadCover(t.id);
      if (url) saved[t.id] = url;
    }
    setCovers(saved);
  }, []);

  async function handleGenCover(t: TemplateMaster) {
    if (!t.coverPrompt || generatingId) return;
    setGeneratingId(t.id);
    try {
      const result = await genCover({ data: { prompt: t.coverPrompt } });
      const url = result.url;
      setCovers((prev) => ({ ...prev, [t.id]: url }));
      persistCover(t.id, url);
      toast.success("Capa gerada e salva!");
    } catch {
      toast.error("Erro ao gerar capa com IA");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight">Modelos Premium</h2>
          <p className="text-xs text-muted-foreground">
            Templates com conteúdo estratégico real — abra o Studio e personalize
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto shrink-0 border-primary/30 text-xs text-primary"
        >
          {ALL_TEMPLATES.length} templates
        </Badge>
      </div>

      {/* Horizontal scroll */}
      <div
        className="premium-templates-scroll flex gap-4 overflow-x-auto pb-3"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {ALL_TEMPLATES.map((t, i) => (
          <TemplateCard
            key={t.id}
            t={t}
            index={i}
            covers={covers}
            generatingId={generatingId}
            onUse={() => navigate({ to: "/ebook-studio", search: { t: t.id } })}
            onPreview={() => setPreview(t)}
            onGenCover={handleGenCover}
          />
        ))}
      </div>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{preview?.emoji}</span> {preview?.name}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              {/* Large book mockup */}
              <div className="flex justify-center py-3">
                <Book3D template={preview} coverUrl={covers[preview.id]} size="lg" />
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Categoria
                  </p>
                  <p className="font-medium">{preview.category}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Páginas
                  </p>
                  <p className="font-medium">{preview.pages}p</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Nível
                  </p>
                  <p
                    className="font-semibold"
                    style={{ color: LEVEL_COLOR[preview.level] }}
                  >
                    {preview.level}
                  </p>
                </div>
              </div>

              {/* Content badge */}
              {preview.hasMasterContent && (
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Template com{" "}
                    <strong className="text-foreground">
                      {preview.chapters.length} capítulos
                    </strong>{" "}
                    completos e conteúdo estratégico premium incluído.
                  </span>
                </div>
              )}

              {/* Generate cover button */}
              {preview.coverPrompt && !covers[preview.id] && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={generatingId === preview.id}
                  onClick={() => handleGenCover(preview)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {generatingId === preview.id ? "Gerando capa..." : "Gerar Capa com IA"}
                </Button>
              )}

              <Button
                className="w-full"
                style={{ background: "var(--gradient-primary)" }}
                onClick={() => {
                  setPreview(null);
                  navigate({ to: "/ebook-studio", search: { t: preview!.id } });
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Abrir no Studio
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
