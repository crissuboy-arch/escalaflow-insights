import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loadSharedStoryFn } from "@/lib/storybook.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/storybook-share/$token")({
  component: SharedStoryPage,
});

function SharedStoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { token } = (Route as any).useParams() as { token: string };
  const loadFn = useServerFn(loadSharedStoryFn);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<{ project: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFn({ data: { token } })
      .then((r) => setData(r))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar história"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#F0F4FF", fontFamily: "Outfit, sans-serif" }}>
          <BookOpen size={48} color="#E8623A" style={{ marginBottom: 16, opacity: 0.6 }} />
          <p style={{ fontSize: 18, marginBottom: 8 }}>História não encontrada</p>
          <p style={{ fontSize: 14, color: "#6B7FA8" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={36} color="#E8623A" className="animate-spin" />
      </div>
    );
  }

  const { project } = data;
  const story = project?.meta?.story ?? {};
  const planning = story.planning ?? {};
  const allChapters: { id: string; title: string; body: string; imageUrl?: string; highlight?: string }[] = story.chapters ?? [];
  const chapters = allChapters.filter((c) => c.body);
  const pct = chapters.length > 1 && current !== null
    ? Math.round(((current + 1) / chapters.length) * 100) : current === null ? 0 : 100;

  const activeCh = current !== null ? chapters[current] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", color: "#F0F4FF", fontFamily: "Outfit, sans-serif" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #1E2D4A", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, background: "rgba(8,13,26,0.95)", backdropFilter: "blur(10px)" }}>
        <BookOpen size={18} color="#E8623A" />
        <span style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700 }}>StoryBook Studio</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6B7FA8" }}>Leitura compartilhada</span>
      </header>

      {/* Progress bar */}
      {current !== null && (
        <div style={{ height: 2, background: "#1E2D4A", position: "sticky", top: 52, zIndex: 9 }}>
          <motion.div
            style={{ height: "100%", background: "linear-gradient(90deg, #E8623A, #a855f7)", originX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      <div ref={contentRef} style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 100px", overflowY: "auto" }}>
        {/* Cover / landing */}
        {current === null && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {project.cover_url && (
              <motion.div
                style={{ marginBottom: 32, borderRadius: 14, overflow: "hidden", maxHeight: 320 }}
                initial={{ scale: 1.04 }}
                animate={{ scale: 1 }}
                transition={{ duration: 8, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
              >
                <img src={project.cover_url} alt="Capa" style={{ width: "100%", objectFit: "cover" }} />
              </motion.div>
            )}
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
              {planning.title ?? project.title}
            </h1>
            {planning.subtitle && (
              <p style={{ fontSize: 16, color: "#9BAAC8", marginBottom: 8, fontStyle: "italic" }}>{planning.subtitle}</p>
            )}
            {planning.author && (
              <p style={{ fontSize: 14, color: "#6B7FA8", marginBottom: 28 }}>por {planning.author}</p>
            )}
            {story.structure?.synopsis && (
              <div style={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 12, padding: 20, marginBottom: 32 }}>
                <p style={{ fontSize: 14, color: "#C8D4F0", lineHeight: 1.7, fontStyle: "italic" }}>{story.structure.synopsis}</p>
              </div>
            )}
            {chapters.length > 0 && (
              <button
                onClick={() => setCurrent(0)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 99, background: "rgba(232,98,58,0.15)", border: "1px solid rgba(232,98,58,0.35)", color: "#E8623A", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                <BookOpen size={16} /> Começar a ler · {chapters.length} capítulos
              </button>
            )}
          </motion.div>
        )}

        {/* Chapter reader */}
        {activeCh && (
          <AnimatePresence mode="wait">
            <motion.article
              key={activeCh.id}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
            >
              {activeCh.imageUrl && (
                <motion.div
                  style={{ borderRadius: 14, overflow: "hidden", marginBottom: 28, maxHeight: 280 }}
                  initial={{ scale: 1.04 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 9, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                >
                  <img src={activeCh.imageUrl} alt={activeCh.title} style={{ width: "100%", objectFit: "cover" }} />
                </motion.div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(232,98,58,0.12)", border: "1px solid rgba(232,98,58,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "Georgia, serif", fontWeight: 700, color: "#E8623A", fontSize: 14 }}>
                  {current! + 1}
                </div>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700 }}>
                  {activeCh.title}
                </h2>
              </div>
              {activeCh.highlight && (
                <motion.blockquote
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ borderLeft: "3px solid #E8623A", paddingLeft: 16, margin: "0 0 24px", fontStyle: "italic", color: "#C8D4F0", fontSize: 16, lineHeight: 1.7 }}
                >
                  {activeCh.highlight}
                </motion.blockquote>
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 16, lineHeight: 1.9, color: "#C8D4F0", whiteSpace: "pre-wrap" }}
              >
                {activeCh.body}
              </motion.div>
              {current! < chapters.length - 1 && (
                <div style={{ marginTop: 48, textAlign: "center", color: "#1E2D4A" }}>✦ ✦ ✦</div>
              )}
            </motion.article>
          </AnimatePresence>
        )}

        {chapters.length === 0 && current === null && (
          <p style={{ color: "#6B7FA8", textAlign: "center", marginTop: 48 }}>Esta história ainda não tem capítulos.</p>
        )}

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid #1E2D4A", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#4A5568" }}>
            Criado com <strong style={{ color: "#E8623A" }}>StoryBook Studio AI</strong>
          </p>
        </div>
      </div>

      {/* Navigation */}
      {current !== null && chapters.length > 1 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 12, background: "rgba(8,13,26,0.94)", border: "1px solid #1E2D4A", borderRadius: 99, padding: "10px 18px", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 20 }}
        >
          <button onClick={() => setCurrent((c) => Math.max(0, (c ?? 0) - 1))} disabled={current === 0} style={{ ...navBtn, opacity: current === 0 ? 0.3 : 1 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 12, color: "#6B7FA8", minWidth: 80, textAlign: "center" }}>{current + 1} / {chapters.length}</span>
          <button onClick={() => setCurrent((c) => Math.min(chapters.length - 1, (c ?? 0) + 1))} disabled={current === chapters.length - 1} style={{ ...navBtn, opacity: current === chapters.length - 1 ? 0.3 : 1 }}>
            <ChevronRight size={18} />
          </button>
        </motion.div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid #1E2D4A",
  borderRadius: 8, color: "#F0F4FF", cursor: "pointer",
  padding: "5px 8px", display: "flex", alignItems: "center",
};
