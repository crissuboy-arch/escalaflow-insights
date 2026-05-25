import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2 } from "lucide-react";
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

  useEffect(() => {
    loadFn({ data: { token } })
      .then((r) => setData(r))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar história"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
  const chapters: { id: string; title: string; body: string }[] = story.chapters ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", color: "#F0F4FF", fontFamily: "Outfit, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1E2D4A", padding: "18px 24px", display: "flex", alignItems: "center", gap: 12, background: "#080D1A" }}>
        <BookOpen size={20} color="#E8623A" />
        <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700 }}>StoryBook Studio</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6B7FA8" }}>Leitura compartilhada</span>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        {/* Cover */}
        {project.cover_url && (
          <div style={{ marginBottom: 32, borderRadius: 12, overflow: "hidden", maxHeight: 320 }}>
            <img src={project.cover_url} alt="Capa" style={{ width: "100%", objectFit: "cover" }} />
          </div>
        )}

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
          {planning.title ?? project.title}
        </h1>
        {planning.subtitle && (
          <p style={{ fontSize: 16, color: "#9BAAC8", marginBottom: 8, fontStyle: "italic" }}>{planning.subtitle}</p>
        )}
        {planning.author && (
          <p style={{ fontSize: 14, color: "#6B7FA8", marginBottom: 32 }}>por {planning.author}</p>
        )}

        {story.structure?.synopsis && (
          <div style={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 12, padding: 20, marginBottom: 40 }}>
            <p style={{ fontSize: 14, color: "#C8D4F0", lineHeight: 1.7, fontStyle: "italic" }}>{story.structure.synopsis}</p>
          </div>
        )}

        {chapters.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {chapters.map((ch, i) => (
              <article key={ch.id}>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#E8623A", marginBottom: 16 }}>
                  {i + 1}. {ch.title}
                </h2>
                {ch.body ? (
                  <div style={{ fontSize: 15, color: "#C8D4F0", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                    {ch.body}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: "#6B7FA8", fontStyle: "italic" }}>Capítulo ainda não gerado.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6B7FA8", textAlign: "center", marginTop: 48 }}>Esta história ainda não tem capítulos.</p>
        )}

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid #1E2D4A", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#4A5568" }}>
            Criado com <strong style={{ color: "#E8623A" }}>StoryBook Studio AI</strong>
          </p>
        </div>
      </main>
    </div>
  );
}
