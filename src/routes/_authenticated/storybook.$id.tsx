import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Users,
  ListTree,
  BookOpen,
  Image as ImageIcon,
  Music,
  Wand2,
  Download,
  Copy,
  Share2,
  Upload,
  Globe,
  Pencil,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react";
import {
  loadStory,
  generateCharacters,
  generateStructure,
  generateStoryChapter,
  updateStoryChapter,
  generateCoverPrompts,
  generateShorts,
  generateAudiobookScript,
  generateShareTokenFn,
} from "@/lib/storybook.functions";
import {
  importPlaybookFn,
  generatePageImagePromptFn,
  updateChapterExtrasFn,
  publishStorybookFn,
} from "@/lib/storybook-enhancements.functions";
import {
  COVER_STYLES,
  BADGES,
  VOICES,
  SOUNDTRACKS,
} from "@/lib/storybook/catalog";
import { ImportPlaybookModal } from "@/components/storybook/ImportPlaybookModal";
import { PublishModal } from "@/components/storybook/PublishModal";

export const Route = createFileRoute("/_authenticated/storybook/$id")({
  component: StorybookWorkspace,
});

const STEPS = [
  { id: 1, label: "Planejamento" },
  { id: 2, label: "Personagens" },
  { id: 3, label: "Estrutura" },
  { id: 4, label: "Capítulos" },
  { id: 5, label: "Capa" },
  { id: 6, label: "Shorts" },
  { id: 7, label: "Audiobook" },
  { id: 8, label: "Exportar" },
];

const CHAPTER_ACTIONS: { id: "regenerate" | "expand" | "shorten" | "more-emotion" | "more-tension" | "more-romance" | "more-humor" | "more-dialogue"; label: string }[] = [
  { id: "regenerate", label: "Regenerar" },
  { id: "expand", label: "Expandir" },
  { id: "shorten", label: "Encurtar" },
  { id: "more-emotion", label: "+ Emoção" },
  { id: "more-tension", label: "+ Tensão" },
  { id: "more-romance", label: "+ Romance" },
  { id: "more-humor", label: "+ Humor" },
  { id: "more-dialogue", label: "+ Diálogos" },
];

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
}

function StorybookWorkspace() {
  const { id } = Route.useParams();
  const load = useServerFn(loadStory);
  const genChars = useServerFn(generateCharacters);
  const genStruct = useServerFn(generateStructure);
  const genChap = useServerFn(generateStoryChapter);
  const updChap = useServerFn(updateStoryChapter);
  const genCover = useServerFn(generateCoverPrompts);
  const genShortsFn = useServerFn(generateShorts);
  const genAudio = useServerFn(generateAudiobookScript);
  const genShare = useServerFn(generateShareTokenFn);
  const importFn = useServerFn(importPlaybookFn);
  const genImagePromptFn = useServerFn(generatePageImagePromptFn);
  const updateExtrasFn = useServerFn(updateChapterExtrasFn);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [story, setStory] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [coverStyle, setCoverStyle] = useState("dark-romance");
  const [coverBadges, setCoverBadges] = useState<string[]>([]);
  const [voice, setVoice] = useState("feminina-doce");
  const [speed, setSpeed] = useState(1);
  const [soundtrack, setSoundtrack] = useState<string>("piano-melancolico");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [readerMode, setReaderMode] = useState(false);
  // — new modal state
  const [importOpen, setImportOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // — per-chapter enhancement panel
  const [expandedExtra, setExpandedExtra] = useState<string | null>(null);

  const refresh = async () => {
    const { story: s } = await load({ data: { id } });
    setStory(s);
    if (s?.step) setStep(Math.max(s.step, 1));
    if (s?.chapters?.[0] && !activeChapter) setActiveChapter(s.chapters[0].id);
  };

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const planning = story?.planning;
  const characters = story?.characters ?? [];
  const structure = story?.structure;
  const chapters = story?.chapters ?? [];
  const cover = story?.cover;
  const shortsByCh = useMemo(() => {
    const m: Record<string, unknown> = {};
    (story?.shorts ?? []).forEach((s: { chapterId: string; data: unknown }) => {
      m[s.chapterId] = s.data;
    });
    return m;
  }, [story]);

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    try {
      await fn();
      await refresh();
      toast.success(label + " ok");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Falha em ${label}`);
    } finally {
      setBusy(null);
    }
  }

  const activeCh = chapters.find((c: { id: string }) => c.id === activeChapter);

  function exportTxt() {
    const txt = [
      planning?.title,
      planning?.subtitle ? `\n${planning.subtitle}` : "",
      planning?.author ? `\nPor ${planning.author}\n` : "",
      ...chapters.map(
        (c: { title: string; body: string }) => `\n\n--- ${c.title} ---\n\n${c.body}`,
      ),
    ].join("");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `${(planning?.title ?? "historia").replace(/\W+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportFormat(format: "pdf" | "docx" | "epub" | "html" | "kindle" | "wattpad") {
    if (!planning || chapters.length === 0) {
      toast.error("Sem capítulos para exportar.");
      return;
    }
    const mapped = chapters.map((c: { title: string; body: string }) => ({
      title: c.title,
      markdown: c.body,
      imageUrl: null,
    }));
    setBusy("export-" + format);
    try {
      let blob: Blob;
      let ext: string = format;
      if (format === "pdf") {
        const { exportEbookPdf } = await import("@/lib/ebook/pdf");
        blob = await exportEbookPdf({
          title: planning.title,
          subtitle: planning.subtitle,
          author: planning.author,
          layout: "moderno",
          coverUrl: null,
          chapters: mapped,
        });
      } else if (format === "docx") {
        const { exportEbookDocx } = await import("@/lib/ebook/docx");
        blob = await exportEbookDocx({
          title: planning.title,
          subtitle: planning.subtitle,
          coverUrl: null,
          chapters: mapped,
        });
      } else if (format === "epub" || format === "kindle") {
        const { exportEbookEpub } = await import("@/lib/ebook/epub");
        blob = await exportEbookEpub({
          title: planning.title,
          subtitle: planning.subtitle,
          language: planning.language === "English" ? "en" : planning.language === "Español" ? "es" : "pt",
          coverUrl: null,
          chapters: mapped,
        });
        ext = "epub";
      } else if (format === "html") {
        const { exportEbookHtml } = await import("@/lib/ebook/html");
        const out = exportEbookHtml({
          title: planning.title,
          subtitle: planning.subtitle,
          coverUrl: null,
          chapters: mapped,
        });
        blob = new Blob([out], { type: "text/html;charset=utf-8" });
      } else {
        // wattpad: txt formatado
        const txt = [
          planning.title,
          planning.subtitle ?? "",
          planning.author ? `Por ${planning.author}` : "",
          "",
          ...chapters.map(
            (c: { title: string; body: string }) =>
              `\n${c.title.toUpperCase()}\n${"=".repeat(c.title.length)}\n\n${c.body}\n\n***\n`,
          ),
        ].join("\n");
        blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
        ext = "txt";
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${planning.title.replace(/\W+/g, "-")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exportado!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setBusy(null);
    }
  }

  if (!story) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ─── MODO LEITOR ───────────────────────────────────────────────────────────
  if (readerMode) {
    const readChapters: { id: string; index: number; title: string; body: string }[] = chapters;
    return (
      <div style={{ background: "#050A14", minHeight: "100vh", color: "#F0F4FF", fontFamily: "Outfit, sans-serif" }}>
        {/* Header leitor */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b"
          style={{ background: "rgba(5,10,20,0.95)", borderColor: "#1E2D4A", backdropFilter: "blur(8px)" }}>
          <button onClick={() => setReaderMode(false)}
            className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
            style={{ color: "#6B7FA8" }}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao editor
          </button>
          <div className="flex items-center gap-2" style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#F0F4FF" }}>
            <BookOpen className="h-4 w-4" style={{ color: "#E8623A" }} />
            {planning?.title}
          </div>
          <div style={{ fontSize: 12, color: "#6B7FA8" }}>
            {readChapters.filter(c => c.body).length}/{readChapters.length} caps gerados
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
          {/* Capa */}
          <div style={{ textAlign: "center", marginBottom: 64, padding: "48px 0", borderBottom: "1px solid #1E2D4A" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#E8623A", textTransform: "uppercase", marginBottom: 16 }}>
              {planning?.type ?? "Romance"}
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 12 }}>
              {planning?.title}
            </h1>
            {planning?.subtitle && (
              <p style={{ fontSize: 16, color: "#9BAAC8", fontStyle: "italic", marginBottom: 12 }}>{planning.subtitle}</p>
            )}
            {planning?.author && (
              <p style={{ fontSize: 14, color: "#6B7FA8" }}>por {planning.author}</p>
            )}
            {readChapters.length > 0 && (
              <div style={{ marginTop: 32, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, background: "rgba(232,98,58,0.12)", border: "1px solid rgba(232,98,58,0.25)" }}>
                <BookOpen className="h-3.5 w-3.5" style={{ color: "#E8623A" }} />
                <span style={{ fontSize: 13, color: "#E8623A" }}>{readChapters.length} capítulos · {readChapters.reduce((s, c) => s + (c.body?.split(/\s+/).filter(Boolean).length ?? 0), 0).toLocaleString()} palavras</span>
              </div>
            )}
          </div>

          {/* Capítulos */}
          {readChapters.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6B7FA8", padding: "48px 0" }}>
              <BookOpen className="h-10 w-10 mx-auto mb-4" style={{ opacity: 0.3 }} />
              <p>Nenhum capítulo gerado ainda.</p>
              <button onClick={() => setReaderMode(false)} style={{ marginTop: 16, fontSize: 13, color: "#E8623A", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
                Ir para o editor →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
              {readChapters.map((ch, i) => (
                <article key={ch.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(232,98,58,0.15)", border: "1px solid rgba(232,98,58,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "Georgia, serif", fontWeight: 700, color: "#E8623A", fontSize: 14 }}>
                      {i + 1}
                    </div>
                    <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 700 }}>
                      {ch.title}
                    </h2>
                  </div>
                  {ch.body ? (
                    <div style={{ fontSize: 16, lineHeight: 1.9, color: "#C8D4F0", whiteSpace: "pre-wrap", letterSpacing: "0.01em" }}>
                      {ch.body}
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, color: "#4A5568", fontStyle: "italic" }}>
                      Capítulo ainda não gerado. <button onClick={() => setReaderMode(false)} style={{ color: "#E8623A", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Gerar no editor →</button>
                    </p>
                  )}
                  {i < readChapters.length - 1 && (
                    <div style={{ marginTop: 48, textAlign: "center", color: "#1E2D4A" }}>✦ ✦ ✦</div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/storybook" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> StoryBook
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{planning?.title}</h1>
          {planning?.subtitle && (
            <p className="text-sm text-muted-foreground">{planning.subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{planning?.type}</Badge>
          {planning?.subniche && <Badge variant="outline">{planning.subniche}</Badge>}
          <Badge variant="outline">{planning?.chapters} caps</Badge>
          <Badge variant="outline">{planning?.tone}</Badge>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="border-orange-500/30 text-orange-300 hover:border-orange-400/60 hover:text-orange-200">
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar Playbook
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPublishOpen(true)} className="border-blue-500/30 text-blue-300 hover:border-blue-400/60 hover:text-blue-200">
            <Globe className="mr-1.5 h-3.5 w-3.5" /> Publicar
          </Button>
          {chapters.filter((c: { body: string }) => c.body).length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setReaderMode(true)}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Ler livro
            </Button>
          )}
        </div>
      </div>

      {/* Step nav */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-all ${
                step === s.id
                  ? "border-primary bg-primary/15 text-primary shadow-[0_0_18px_-4px_hsl(var(--primary))]"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* PLANEJAMENTO */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Planejamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Público:</span> {planning?.audience || "—"}</div>
            <div><span className="text-muted-foreground">Idioma:</span> {planning?.language}</div>
            <div><span className="text-muted-foreground">Final:</span> {planning?.ending} · <span className="text-muted-foreground">Intensidade:</span> {planning?.intensity} · <span className="text-muted-foreground">Hot:</span> {planning?.hotLevel}</div>
            <div><span className="text-muted-foreground">Autor:</span> {planning?.author || "—"}</div>
            <Button onClick={() => setStep(2)} className="mt-3">Próximo: Personagens →</Button>
          </CardContent>
        </Card>
      )}

      {/* PERSONAGENS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-4 w-4" /> Personagens ({characters.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" disabled={!!busy} onClick={() => run("Gerar 4 personagens", () => genChars({ data: { id, count: 4 } }))}>
                {busy === "Gerar 4 personagens" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
                Gerar 4
              </Button>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("Gerar 6 personagens", () => genChars({ data: { id, count: 6 } }))}>
                Gerar 6
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {characters.map((c: any) => (
              <Card key={c.id} className="border-primary/10 bg-card/50 backdrop-blur">
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{c.name}, {c.age}</div>
                    <Badge variant="outline">{c.role}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{c.look}</div>
                  <div><span className="text-muted-foreground text-xs">Personalidade:</span> {c.personality}</div>
                  <div><span className="text-muted-foreground text-xs">Trauma:</span> {c.trauma}</div>
                  <div><span className="text-muted-foreground text-xs">Desejos:</span> {c.desires}</div>
                  <div><span className="text-muted-foreground text-xs">Medos:</span> {c.fears}</div>
                  {c.quotes?.length > 0 && (
                    <div className="rounded-md border border-border/50 bg-muted/30 p-2 text-xs italic">
                      "{c.quotes[0]}"
                    </div>
                  )}
                  {c.visualPrompts && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copy(c.visualPrompts.pixar)}>Pixar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copy(c.visualPrompts.realistic)}>Real</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copy(c.visualPrompts.anime)}>Anime</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ESTRUTURA */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ListTree className="h-4 w-4" /> Estrutura</h2>
            <Button size="sm" disabled={!!busy} onClick={() => run("Gerar estrutura", () => genStruct({ data: { id } }))}>
              {busy === "Gerar estrutura" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              Gerar com IA
            </Button>
          </div>
          {structure && (
            <div className="space-y-3">
              <Card><CardContent className="space-y-2 p-4 text-sm">
                <div><b>Sinopse:</b> {structure.synopsis}</div>
                <div><b>Big Idea:</b> {structure.bigIdea}</div>
                <div><b>Plot Twist:</b> {structure.plotTwist}</div>
              </CardContent></Card>
              <div className="grid gap-3 md:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-sm">Ganchos</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-1 pl-5 text-sm">{structure.hooks.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Cliffhangers</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-1 pl-5 text-sm">{structure.cliffhangers.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul></CardContent></Card>
              </div>
              <Card><CardHeader><CardTitle className="text-sm">Outline ({structure.outline.length} caps)</CardTitle></CardHeader><CardContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {structure.outline.map((o: { title: string; summary: string }, i: number) => (
                    <li key={i}><b>{o.title}</b> — <span className="text-muted-foreground">{o.summary}</span></li>
                  ))}
                </ol>
              </CardContent></Card>
            </div>
          )}
        </div>
      )}

      {/* CAPÍTULOS */}
      {step === 4 && (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <Card className="max-h-[70vh] overflow-y-auto">
            <CardContent className="space-y-1 p-3">
              {chapters.length === 0 && <p className="text-xs text-muted-foreground">Gere a estrutura primeiro.</p>}
              {chapters.map((c: { id: string; index: number; title: string; status: string; words: number }) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChapter(c.id)}
                  className={`w-full rounded-md border p-2 text-left text-sm transition-colors ${activeChapter === c.id ? "border-primary bg-primary/10" : "border-transparent hover:border-border"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 font-medium">{c.index + 1}. {c.title}</span>
                    {c.status === "ready" && <Badge variant="outline" className="text-[10px]">{c.words}p</Badge>}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-4">
              {!activeCh ? (
                <p className="text-sm text-muted-foreground">Selecione um capítulo.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{activeCh.index + 1}. {activeCh.title}</h3>
                    <div className="text-xs text-muted-foreground">
                      {activeCh.words} palavras · ~{Math.max(1, Math.round(activeCh.words / 250))} pgs · ~{Math.max(1, Math.round(activeCh.words / 200))} min
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" disabled={!!busy} onClick={() => run("Gerar capítulo", () => genChap({ data: { id, chapterId: activeCh.id, action: "generate" } }))}>
                      {busy === "Gerar capítulo" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
                    </Button>
                    {CHAPTER_ACTIONS.map((a) => (
                      <Button key={a.id} size="sm" variant="outline" disabled={!!busy || !activeCh.body} onClick={() => run(a.label, () => genChap({ data: { id, chapterId: activeCh.id, action: a.id } }))}>
                        {a.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={activeCh.body}
                    onChange={(e) => {
                      const updated = chapters.map((c: { id: string }) =>
                        c.id === activeCh.id ? { ...activeCh, body: e.target.value, words: e.target.value.split(/\s+/).filter(Boolean).length } : c,
                      );
                      setStory({ ...story, chapters: updated });
                    }}
                    onBlur={() => updChap({ data: { id, chapterId: activeCh.id, body: activeCh.body } }).catch(() => {})}
                    rows={14}
                    className="font-mono text-sm leading-relaxed"
                    placeholder="Texto do capítulo aparecerá aqui..."
                  />

                  {/* ── Painel de Enriquecimento de Página ── */}
                  <div className="rounded-xl border border-border/40 bg-muted/20">
                    <button
                      onClick={() => setExpandedExtra(expandedExtra === activeCh.id ? null : activeCh.id)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Enriquecer Página — imagem, animação, frase de destaque
                      </span>
                      {expandedExtra === activeCh.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {expandedExtra === activeCh.id && (
                      <div className="space-y-3 border-t border-border/40 px-4 pb-4 pt-3">
                        {/* Image URL */}
                        <div className="space-y-1">
                          <Label className="text-xs uppercase text-muted-foreground">URL da imagem desta página</Label>
                          <div className="flex gap-2">
                            <Input
                              value={(activeCh as any).imageUrl ?? ""}
                              onChange={(e) => {
                                const updated = chapters.map((c: any) =>
                                  c.id === activeCh.id ? { ...c, imageUrl: e.target.value } : c,
                                );
                                setStory({ ...story, chapters: updated });
                              }}
                              onBlur={() => {
                                updateExtrasFn({ data: { id, chapterId: activeCh.id, imageUrl: (activeCh as any).imageUrl ?? "" } }).catch(() => {});
                              }}
                              placeholder="https://... ou deixe em branco"
                              className="text-sm"
                            />
                            {(activeCh as any).imageUrl && (
                              <button
                                onClick={() => {
                                  const updated = chapters.map((c: any) =>
                                    c.id === activeCh.id ? { ...c, imageUrl: "" } : c,
                                  );
                                  setStory({ ...story, chapters: updated });
                                  updateExtrasFn({ data: { id, chapterId: activeCh.id, imageUrl: "" } }).catch(() => {});
                                }}
                                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {(activeCh as any).imageUrl && (
                            <img src={(activeCh as any).imageUrl} alt="" className="mt-2 h-24 rounded-md object-cover w-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                        </div>

                        {/* Image Prompt */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase text-muted-foreground">Prompt de imagem</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-primary"
                              disabled={busy === `img-prompt-${activeCh.id}`}
                              onClick={async () => {
                                setBusy(`img-prompt-${activeCh.id}`);
                                try {
                                  const r = await genImagePromptFn({ data: { id, chapterId: activeCh.id } });
                                  const updated = chapters.map((c: any) =>
                                    c.id === activeCh.id ? { ...c, imagePrompt: r.imagePrompt, animationPrompt: r.animationPrompt } : c,
                                  );
                                  setStory({ ...story, chapters: updated });
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Falha");
                                } finally {
                                  setBusy(null);
                                }
                              }}
                            >
                              {busy === `img-prompt-${activeCh.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Wand2 className="mr-1 h-3 w-3" />Gerar</>}
                            </Button>
                          </div>
                          <Textarea
                            value={(activeCh as any).imagePrompt ?? ""}
                            onChange={(e) => {
                              const updated = chapters.map((c: any) =>
                                c.id === activeCh.id ? { ...c, imagePrompt: e.target.value } : c,
                              );
                              setStory({ ...story, chapters: updated });
                            }}
                            onBlur={() => {
                              updateExtrasFn({ data: { id, chapterId: activeCh.id, imagePrompt: (activeCh as any).imagePrompt ?? "" } }).catch(() => {});
                            }}
                            rows={3}
                            className="text-xs"
                            placeholder="Prompt em inglês para gerar imagem desta página (no text, no logo, cinematic...)"
                          />
                          {(activeCh as any).imagePrompt && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => copy((activeCh as any).imagePrompt)}>
                              <Copy className="mr-1 h-3 w-3" /> Copiar prompt
                            </Button>
                          )}
                        </div>

                        {/* Animation Prompt */}
                        <div className="space-y-1">
                          <Label className="text-xs uppercase text-muted-foreground">Prompt de animação</Label>
                          <Textarea
                            value={(activeCh as any).animationPrompt ?? ""}
                            onChange={(e) => {
                              const updated = chapters.map((c: any) =>
                                c.id === activeCh.id ? { ...c, animationPrompt: e.target.value } : c,
                              );
                              setStory({ ...story, chapters: updated });
                            }}
                            onBlur={() => {
                              updateExtrasFn({ data: { id, chapterId: activeCh.id, animationPrompt: (activeCh as any).animationPrompt ?? "" } }).catch(() => {});
                            }}
                            rows={2}
                            className="text-xs"
                            placeholder="ex: zoom lento, câmera deslizando da esquerda, luz dourada pulsando..."
                          />
                        </div>

                        {/* Highlight phrase */}
                        <div className="space-y-1">
                          <Label className="text-xs uppercase text-muted-foreground">Frase de destaque</Label>
                          <Input
                            value={(activeCh as any).highlight ?? ""}
                            onChange={(e) => {
                              const updated = chapters.map((c: any) =>
                                c.id === activeCh.id ? { ...c, highlight: e.target.value } : c,
                              );
                              setStory({ ...story, chapters: updated });
                            }}
                            onBlur={() => {
                              updateExtrasFn({ data: { id, chapterId: activeCh.id, highlight: (activeCh as any).highlight ?? "" } }).catch(() => {});
                            }}
                            placeholder="A frase mais impactante desta página..."
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CAPA */}
      {step === 5 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Capa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs uppercase">Estilo da capa</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COVER_STYLES.map((s) => (
                  <Badge key={s.id} variant={coverStyle === s.id ? "default" : "outline"} className="cursor-pointer" onClick={() => setCoverStyle(s.id)}>{s.label}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase">Selos</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BADGES.map((b) => (
                  <Badge key={b} variant={coverBadges.includes(b) ? "default" : "outline"} className="cursor-pointer" onClick={() => setCoverBadges((cur) => cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b])}>{b}</Badge>
                ))}
              </div>
            </div>
            <Button disabled={!!busy} onClick={() => {
              const hint = COVER_STYLES.find((s) => s.id === coverStyle)?.promptHint ?? "";
              run("Gerar prompts de capa", () => genCover({ data: { id, styleHint: hint, badges: coverBadges } }));
            }}>
              {busy === "Gerar prompts de capa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              Gerar prompts
            </Button>
            {cover?.prompts && (
              <div className="grid gap-3 md:grid-cols-2">
                {(["dalle", "midjourney", "leonardo", "gemini"] as const).map((k) => (
                  <Card key={k}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase text-muted-foreground">{k}</div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(cover.prompts[k])}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed">{cover.prompts[k]}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SHORTS */}
      {step === 6 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> TikTok / Shorts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs uppercase">Capítulo base</Label>
              <Select value={activeChapter ?? undefined} onValueChange={(v) => setActiveChapter(v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {chapters.filter((c: { body: string }) => c.body).map((c: { id: string; index: number; title: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.index + 1}. {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!!busy || !activeChapter} onClick={() => activeChapter && run("Gerar shorts", () => genShortsFn({ data: { id, chapterId: activeChapter } }))}>
              {busy === "Gerar shorts" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              Gerar 3 shorts
            </Button>
            {activeChapter && Array.isArray(shortsByCh[activeChapter]) && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(shortsByCh[activeChapter] as any[]).map((s, i) => (
                  <Card key={i}>
                    <CardContent className="space-y-2 p-3 text-xs">
                      <Badge variant="outline">POV: {s.pov}</Badge>
                      <div><b>Hook:</b> {s.hook}</div>
                      <div className="rounded-md border border-border/50 bg-muted/30 p-2 leading-relaxed whitespace-pre-wrap">{s.script}</div>
                      <div><b>Legenda:</b> {s.caption}</div>
                      <div><b>CTA:</b> {s.cta}</div>
                      <div className="text-muted-foreground">{(s.hashtags ?? []).join(" ")}</div>
                      <Button size="sm" variant="ghost" className="h-7 w-full" onClick={() => copy(`${s.hook}\n\n${s.script}\n\n${s.caption}\n${s.cta}\n${(s.hashtags ?? []).join(" ")}`)}><Copy className="mr-1 h-3 w-3" /> Copiar tudo</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AUDIOBOOK */}
      {step === 7 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Music className="h-4 w-4" /> Audiobook IA</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Geramos o roteiro narrado com marcações [pausa], [ênfase], [sussurro]. Cole em qualquer TTS (ElevenLabs, Murf, Speechify) para áudio final.</p>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs uppercase">Capítulo</Label>
                <Select value={activeChapter ?? undefined} onValueChange={(v) => setActiveChapter(v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {chapters.filter((c: { body: string }) => c.body).map((c: { id: string; index: number; title: string }) => (
                      <SelectItem key={c.id} value={c.id}>{c.index + 1}. {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase">Voz</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VOICES.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase">Velocidade</Label>
                <Input type="number" step="0.1" min="0.5" max="2" value={speed} onChange={(e) => setSpeed(Number(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs uppercase">Trilha</Label>
                <Select value={soundtrack} onValueChange={setSoundtrack}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOUNDTRACKS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button disabled={!!busy || !activeChapter} onClick={() => activeChapter && run("Gerar roteiro", () => genAudio({ data: { id, chapterId: activeChapter, voice, speed, soundtrack } }))}>
              {busy === "Gerar roteiro" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              Gerar roteiro narrado
            </Button>
            {activeChapter && story?.audiobook?.scripts?.[activeChapter] && (
              <Card><CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase text-muted-foreground">Roteiro narrado</div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(story.audiobook.scripts[activeChapter])}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed">{story.audiobook.scripts[activeChapter]}</pre>
              </CardContent></Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* EXPORTAR */}
      {step === 8 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Exportar</CardTitle></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3">
            {(["pdf", "docx", "epub", "kindle", "html", "wattpad"] as const).map((f) => (
              <Button key={f} variant="outline" disabled={!!busy} onClick={() => exportFormat(f)}>
                {busy === "export-" + f ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                {f.toUpperCase()}
              </Button>
            ))}
            <Button variant="outline" onClick={exportTxt}><Download className="mr-1 h-4 w-4" /> TXT</Button>
          </CardContent>
        </Card>
      )}

      {/* PUBLICAR COM SLUG */}
      {step === 8 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4 text-blue-400" /> Publicar AnimaBook</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Publique e receba um link <strong>/story/slug</strong> com visualização animada premium — funciona sem login.
            </p>
            <Button
              onClick={() => setPublishOpen(true)}
              className="border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30"
              variant="outline"
            >
              <Globe className="mr-1.5 h-4 w-4" /> Publicar com Link Animado
            </Button>
          </CardContent>
        </Card>
      )}

      {/* LINK COMPARTILHÁVEL */}
      {step === 8 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Link Compartilhável</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {shareUrl && (
              <div className="flex items-center gap-2 rounded-lg p-3 bg-muted">
                <span className="flex-1 truncate font-mono text-sm">{shareUrl}</span>
                <Button size="sm" variant="ghost" onClick={() => copy(shareUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={async () => {
                setBusy("share");
                try {
                  const { token } = await genShare({ data: { id } });
                  const url = `${window.location.origin}/storybook-share/${token}`;
                  setShareUrl(url);
                  toast.success("Link criado!");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao gerar link");
                } finally {
                  setBusy(null);
                }
              }}>
              {busy === "share" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Share2 className="mr-1 h-4 w-4" />}
              {shareUrl ? "Renovar link" : "Gerar link compartilhável"}
            </Button>
            {shareUrl && (
              <p className="text-xs text-muted-foreground">
                Qualquer pessoa com este link pode ler a história sem precisar de login.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {/* ── Modais ── */}
      <ImportPlaybookModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        projectId={id}
        onImported={async (count) => {
          await refresh();
          setStep(4);
          toast.success(`${count} capítulos importados! Acesse a aba Capítulos.`);
        }}
      />
      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        projectId={id}
        story={story ?? {}}
        projectTitle={planning?.title ?? ""}
      />
    </div>
  );
}