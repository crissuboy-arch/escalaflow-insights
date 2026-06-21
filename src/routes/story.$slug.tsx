import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, ChevronLeft, ChevronRight, Maximize2, Minimize2, Copy, CheckCircle2 } from "lucide-react";
import { loadStoryBySlugFn } from "@/lib/storybook-enhancements.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/story/$slug")({
  component: AnimaBookReader,
});

type Chapter = {
  id: string;
  index: number;
  title: string;
  body: string;
  words: number;
  imageUrl?: string;
  animationPrompt?: string;
  highlight?: string;
};

function AnimaBookReader() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { slug } = (Route as any).useParams() as { slug: string };
  const loadFn = useServerFn(loadStoryBySlugFn);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<{ project: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFn({ data: { slug } })
      .then((r) => {
        if (!r) { setError("AnimaBook não encontrado ou não publicado."); return; }
        setData(r);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (error) return (
    <div style={bg} className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <BookOpen size={48} style={{ color: ACCENT, opacity: 0.5, margin: "0 auto 16px" }} />
        <p style={{ color: "#F0F4FF", fontSize: 18, marginBottom: 8 }}>AnimaBook não encontrado</p>
        <p style={{ color: "#6B7FA8", fontSize: 14 }}>{error}</p>
      </div>
    </div>
  );

  if (!data) return (
    <div style={bg} className="flex min-h-screen items-center justify-center">
      <Loader2 size={36} style={{ color: ACCENT }} className="animate-spin" />
    </div>
  );

  const { project } = data;
  const story = project?.meta?.story ?? {};
  const planning = story.planning ?? {};
  const chapters: Chapter[] = (story.chapters ?? []).filter((c: Chapter) => c.body);
  const totalWords = chapters.reduce((s, c) => s + (c.words ?? 0), 0);
  const ch = chapters[current] as Chapter | undefined;
  const pct = chapters.length > 1 ? Math.round(((current + 1) / chapters.length) * 100) : 100;

  return (
    <div style={{ ...bg, minHeight: "100vh", fontFamily: "Outfit, sans-serif" }} className={fullscreen ? "fixed inset-0 z-50 overflow-hidden" : ""}>
      {/* ── Header ── */}
      <header style={headerStyle}>
        <div className="flex items-center gap-3">
          <div style={logoBox}><BookOpen size={16} style={{ color: ACCENT }} /></div>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700, color: "#F0F4FF" }}>
            {planning.title ?? project.title}
          </span>
          {planning.author && (
            <span style={{ fontSize: 12, color: "#6B7FA8" }}>— {planning.author}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} style={iconBtn} title="Copiar link">
            {copied ? <CheckCircle2 size={16} style={{ color: "#4ade80" }} /> : <Copy size={16} />}
          </button>
          <button onClick={() => setFullscreen((v) => !v)} style={iconBtn}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div style={{ height: 2, background: "#1E2D4A", position: "sticky", top: 52, zIndex: 10 }}>
        <motion.div
          style={{ height: "100%", background: `linear-gradient(90deg, ${ACCENT}, #a855f7)`, originX: 0 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div ref={contentRef} style={{ maxWidth: 740, margin: "0 auto", padding: "48px 24px 100px", overflowY: "auto" }}>
        {/* ── Cover section (chapter 0) ── */}
        {current === 0 && (
          <motion.div
            key="cover"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ textAlign: "center", marginBottom: 64, paddingBottom: 48, borderBottom: "1px solid #1E2D4A" }}
          >
            {project.cover_url && (
              <motion.div
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 8, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                style={{ borderRadius: 16, overflow: "hidden", maxHeight: 340, marginBottom: 32 }}
              >
                <img src={project.cover_url} alt="Capa" style={{ width: "100%", objectFit: "cover" }} />
              </motion.div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: ACCENT, textTransform: "uppercase", marginBottom: 12 }}>
              {planning.type ?? "AnimaBook"}
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px,5vw,46px)", fontWeight: 800, lineHeight: 1.15, color: "#F0F4FF", marginBottom: 10 }}>
              {planning.title}
            </h1>
            {planning.subtitle && (
              <p style={{ fontSize: 16, color: "#9BAAC8", fontStyle: "italic", marginBottom: 10 }}>{planning.subtitle}</p>
            )}
            {planning.author && (
              <p style={{ fontSize: 14, color: "#6B7FA8" }}>por {planning.author}</p>
            )}
            <div style={{ marginTop: 24, display: "inline-flex", gap: 16 }}>
              <Chip>{chapters.length} capítulos</Chip>
              <Chip>{totalWords.toLocaleString("pt-BR")} palavras</Chip>
            </div>
            {story.structure?.synopsis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 12, padding: "18px 20px", marginTop: 28, textAlign: "left" }}
              >
                <p style={{ fontSize: 14, color: "#C8D4F0", lineHeight: 1.75, fontStyle: "italic" }}>{story.structure.synopsis}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Chapter content ── */}
        {ch && (
          <AnimatePresence mode="wait">
            <motion.article
              key={ch.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Chapter image */}
              {ch.imageUrl && (
                <motion.div
                  style={{ borderRadius: 14, overflow: "hidden", marginBottom: 32, maxHeight: 300 }}
                  initial={{ scale: 1.04 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 8, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                >
                  <img src={ch.imageUrl} alt={ch.title} style={{ width: "100%", objectFit: "cover" }} />
                </motion.div>
              )}

              {/* Chapter header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                <motion.div
                  style={chapterNumStyle}
                  whileHover={{ scale: 1.1 }}
                >
                  {current + 1}
                </motion.div>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 700, color: "#F0F4FF", lineHeight: 1.25 }}>
                  {ch.title}
                </h2>
              </div>

              {/* Highlight phrase */}
              {ch.highlight && (
                <motion.blockquote
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 18, margin: "0 0 28px", fontStyle: "italic", color: "#C8D4F0", fontSize: 16, lineHeight: 1.7 }}
                >
                  {ch.highlight}
                </motion.blockquote>
              )}

              {/* Body */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 16, lineHeight: 1.9, color: "#C8D4F0", whiteSpace: "pre-wrap", letterSpacing: "0.01em" }}
              >
                {ch.body}
              </motion.div>

              {/* Chapter separator */}
              {current < chapters.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ marginTop: 48, textAlign: "center", color: ACCENT, letterSpacing: "0.3em", fontSize: 12 }}
                >
                  ✦ ✦ ✦
                </motion.div>
              )}
            </motion.article>
          </AnimatePresence>
        )}
      </div>

      {/* ── Navigation ── */}
      {chapters.length > 1 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(8,13,26,0.92)",
            border: "1px solid #1E2D4A",
            borderRadius: 99,
            padding: "10px 18px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            style={{ ...navBtn, opacity: current === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 12, color: "#6B7FA8", minWidth: 80, textAlign: "center" }}>
            {current + 1} / {chapters.length}
          </span>
          <button
            onClick={() => setCurrent((c) => Math.min(chapters.length - 1, c + 1))}
            disabled={current === chapters.length - 1}
            style={{ ...navBtn, opacity: current === chapters.length - 1 ? 0.3 : 1 }}
          >
            <ChevronRight size={18} />
          </button>
        </motion.div>
      )}

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", paddingBottom: 48, fontSize: 12, color: "#2D3B55" }}>
        Criado com <strong style={{ color: ACCENT }}>StoryBook Studio AI</strong>
      </div>
    </div>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────

const ACCENT = "#E8623A";
const bg = { background: "#050A14" };
const headerStyle: React.CSSProperties = {
  position: "sticky" as const, top: 0, zIndex: 10,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 24px",
  background: "rgba(5,10,20,0.96)",
  borderBottom: "1px solid #1E2D4A",
  backdropFilter: "blur(10px)",
};
const logoBox: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  background: "rgba(232,98,58,0.12)", border: "1px solid rgba(232,98,58,0.25)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const iconBtn: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  color: "#6B7FA8", padding: 6, borderRadius: 6,
  display: "flex", alignItems: "center",
};
const chapterNumStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: "50%",
  background: "rgba(232,98,58,0.12)", border: "1px solid rgba(232,98,58,0.3)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "Georgia, serif", fontWeight: 700, color: ACCENT, fontSize: 14,
  flexShrink: 0, cursor: "default",
};
const navBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid #1E2D4A",
  borderRadius: 8, color: "#F0F4FF", cursor: "pointer",
  padding: "5px 8px", display: "flex", alignItems: "center",
  transition: "opacity 0.2s",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "rgba(232,98,58,0.1)", border: "1px solid rgba(232,98,58,0.2)",
      borderRadius: 99, padding: "4px 12px", fontSize: 12, color: ACCENT,
    }}>
      {children}
    </span>
  );
}
