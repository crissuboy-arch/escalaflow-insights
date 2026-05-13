import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen, Wand2, ImageIcon, FileDown, Check, ArrowLeft, ArrowRight, Sparkles, FileText, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFavoriteAds, fetchSavedAds, fetchScaledAds, type PersistedAd } from "@/lib/queries";
import {
  extractEbookBriefing,
  generateEbookOutline,
  generateEbookChapter,
  generateEbookChapterImage,
  generateEbookCover,
  generateEbookExtras,
  saveEbookDraft,
  listEbookDrafts,
  loadEbookDraft,
  deleteEbookDraft,
} from "@/lib/ebook.functions";
import { LAYOUTS, type EbookLayout } from "@/lib/ebook/layouts";
import {
  STYLES,
  PALETTES,
  styleToMode,
  styleToLayout,
  type EbookStyle,
  type EbookPalette,
  type EbookCategory,
} from "@/lib/ebook/styles";
import { PRODUCT_SIZES, sizeSpec, type ProductSize } from "@/lib/ebook/niches";
import { exportEbookPdf } from "@/lib/ebook/pdf";
import { exportEbookDocx } from "@/lib/ebook/docx";
import { exportEbookEpub } from "@/lib/ebook/epub";
import { EbookPreview } from "@/components/ebook/EbookPreview";
import { DraftList, type DraftRow } from "@/components/ebook/DraftList";
import { EbookHub, type AiKickstart } from "@/components/ebook/EbookHub";

export const Route = createFileRoute("/_authenticated/produtos/ebook")({
  beforeLoad: async () => {
    // Ensure Supabase session is hydrated before any authenticated fns run.
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: EbookPage,
});

type Briefing = {
  title: string;
  subtitle: string;
  niche: string;
  promise: string;
  avatar: string;
  pains: string[];
  desires: string[];
  uniqueMechanism: string;
};
type Extras = { introduction?: string; conclusion?: string; aboutAuthor?: string; bonus?: string };
type Identity = { author?: string; brand?: string; bio?: string };
type Outline = { title: string; bullets: string[] }[];
type Chapter = { title: string; markdown: string; imageUrl?: string | null };
type EbookMode = "kdp" | "premium" | "playbook";

const STEPS = ["Anúncio", "Briefing", "Modo & Estrutura", "Layout & Capa", "Capítulos & Exportar"];

const MODES: { id: EbookMode; label: string; icon: typeof BookOpen; description: string }[] = [
  { id: "kdp", label: "Amazon/KDP", icon: FileText, description: "PDF, DOCX e EPUB com sumário, capítulos limpos e layout profissional para publicar." },
  { id: "premium", label: "Premium Visual", icon: Sparkles, description: "Imagem por capítulo gerada por IA, layouts modernos estilo Canva/Gamma." },
  { id: "playbook", label: "Playbook Interativo", icon: BookMarked, description: "Cenas, storytelling, narrativa visual. Abre o construtor de Playbooks." },
];

async function errMsg(e: unknown, fallback: string): Promise<string> {
  if (e instanceof Error) return e.message || fallback;
  if (typeof Response !== "undefined" && e instanceof Response) {
    try {
      const t = await e.text();
      return t || fallback;
    } catch {
      return fallback;
    }
  }
  if (typeof e === "string") return e;
  return fallback;
}

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80) || "ebook";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EbookPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ads, setAds] = useState<PersistedAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<PersistedAd | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [outline, setOutline] = useState<Outline>([]);
  const [chapterCount, setChapterCount] = useState(6);
  const [pages, setPages] = useState<ProductSize>(60);
  const [identity, setIdentity] = useState<Identity>({ author: "", brand: "", bio: "" });
  const [extras, setExtras] = useState<Extras | null>(null);
  const [finalCta, setFinalCta] = useState<string>("Acesse o link abaixo e dê o próximo passo agora.");
  const [mode, setMode] = useState<EbookMode>("kdp");
  const [layout, setLayout] = useState<EbookLayout>("classico");
  const [style, setStyle] = useState<EbookStyle>("clean");
  const [palette, setPalette] = useState<EbookPalette>("minimalista");
  const [entryStarted, setEntryStarted] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [ebookId, setEbookId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [imageBusyIndex, setImageBusyIndex] = useState<number | null>(null);

  const fnExtract = useServerFn(extractEbookBriefing);
  const fnOutline = useServerFn(generateEbookOutline);
  const fnChapter = useServerFn(generateEbookChapter);
  const fnChapterImg = useServerFn(generateEbookChapterImage);
  const fnCover = useServerFn(generateEbookCover);
  const fnExtras = useServerFn(generateEbookExtras);
  const fnSave = useServerFn(saveEbookDraft);
  const fnList = useServerFn(listEbookDrafts);
  const fnLoad = useServerFn(loadEbookDraft);
  const fnDelete = useServerFn(deleteEbookDraft);

  useEffect(() => {
    Promise.all([fetchFavoriteAds(), fetchSavedAds(), fetchScaledAds()]).then(([f, s, sc]) => {
      const map = new Map<string, PersistedAd>();
      [...f, ...s, ...sc].forEach((a) => map.set(a.key, a));
      setAds(Array.from(map.values()));
    });
  }, []);

  const refreshDrafts = async () => {
    try {
      const list = await fnList();
      setDrafts(list as DraftRow[]);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refreshDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = async (overrides?: { step?: number; status?: "draft" | "ready" }) => {
    if (!briefing && !selectedAd) return;
    try {
      const payload = {
        source_ad_key: selectedAd?.key ?? null,
        title: briefing?.title || selectedAd?.headline?.slice(0, 80) || "Novo Ebook",
        subtitle: briefing?.subtitle ?? null,
        niche: briefing?.niche ?? selectedAd?.niche ?? null,
        briefing: (briefing ?? {}) as Record<string, unknown>,
        outline,
        chapters,
        layout,
        cover_url: coverUrl,
        status: overrides?.status ?? "draft",
        step: overrides?.step ?? step,
        chapter_count: chapterCount,
        mode,
      };
      const { id } = await fnSave({ data: { id: ebookId ?? undefined, payload } });
      const isNew = !ebookId;
      setEbookId(id);
      if (isNew) {
        // Persist URL so refresh resumes the same draft.
        navigate({ to: "/produtos/ebook", search: { id } as never, replace: true });
        try {
          window.history.replaceState({}, "", `/produtos/ebook?id=${id}`);
        } catch {
          /* ignore */
        }
      }
      setSavedAt(new Date());
      refreshDrafts();
    } catch (e) {
      console.error("saveDraft", e);
    }
  };

  // Debounced autosave on any meaningful change
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!briefing && !selectedAd) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDraft();
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefing, outline, chapters, layout, coverUrl, chapterCount, mode]);

  // Local backup so a refresh before the first remote save doesn't lose work
  useEffect(() => {
    if (!briefing && !selectedAd) return;
    const key = `ebook-draft:${ebookId ?? "new"}`;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ step, mode, layout, briefing, outline, chapters, chapterCount, coverUrl, ebookId }),
      );
    } catch {
      /* ignore quota */
    }
  }, [step, mode, layout, briefing, outline, chapters, chapterCount, coverUrl, ebookId, selectedAd]);

  // Restore from URL ?id=... or local backup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("id");
    if (urlId) {
      onResumeDraft(urlId);
      return;
    }
    try {
      const raw = localStorage.getItem("ebook-draft:new");
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.briefing) {
          setBriefing(d.briefing);
          setOutline(d.outline ?? []);
          setChapters(d.chapters ?? []);
          setLayout(d.layout ?? "classico");
          setCoverUrl(d.coverUrl ?? null);
          setChapterCount(d.chapterCount ?? 6);
          setMode(d.mode ?? "kdp");
          setStep(d.step ?? 0);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResumeDraft = async (id: string) => {
    setBusy("Carregando rascunho…");
    try {
      const row = (await fnLoad({ data: { id } })) as Record<string, unknown>;
      setEbookId(id);
      setBriefing((row.briefing as Briefing) ?? null);
      setOutline((row.outline as Outline) ?? []);
      setChapters((row.chapters as Chapter[]) ?? []);
      setLayout((row.layout as EbookLayout) ?? "classico");
      setCoverUrl((row.cover_url as string | null) ?? null);
      setChapterCount((row.chapter_count as number) ?? 6);
      setMode(((row.mode as EbookMode) ?? "kdp") as EbookMode);
      const adKey = row.source_ad_key as string | null;
      if (adKey) {
        const ad = ads.find((a) => a.key === adKey) ?? null;
        setSelectedAd(ad);
      }
      setStep(((row.step as number) ?? 0) as number);
      try {
        window.history.replaceState({}, "", `/produtos/ebook?id=${id}`);
      } catch {
        /* ignore */
      }
      toast.success("Rascunho retomado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar rascunho");
    } finally {
      setBusy(null);
    }
  };

  const onDeleteDraft = async (id: string) => {
    try {
      await fnDelete({ data: { id } });
      if (ebookId === id) setEbookId(null);
      refreshDrafts();
      toast.success("Rascunho excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  const goNext = () => {
    setStep((s) => {
      const next = Math.min(STEPS.length - 1, s + 1);
      setTimeout(() => saveDraft({ step: next }), 0);
      return next;
    });
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const onExtract = async () => {
    if (!selectedAd) return;
    setBusy("Analisando anúncio com IA…");
    try {
      const b = await fnExtract({
        data: {
          ad: {
            headline: selectedAd.headline,
            copy: selectedAd.copy ?? undefined,
            cta: selectedAd.cta ?? undefined,
            niche: selectedAd.niche,
            country: selectedAd.country,
            platform: selectedAd.platform,
            advertiser: selectedAd.advertiser,
            score: selectedAd.score,
          },
        },
      });
      setBriefing(b);
      goNext();
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao gerar briefing"));
    } finally {
      setBusy(null);
    }
  };

  const onOutline = async () => {
    if (!briefing) return;
    setBusy("Gerando estrutura do ebook…");
    try {
      const o = await fnOutline({ data: { briefing, chapterCount } });
      setOutline(o);
      goNext();
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao gerar estrutura"));
    } finally {
      setBusy(null);
    }
  };

  const onCover = async () => {
    if (!briefing) return;
    setBusy("Gerando capa com IA…");
    try {
      const { dataUrl } = await fnCover({
        data: {
          briefing,
          layout,
          customPrompt: coverPrompt || undefined,
          style,
          palette,
        },
      });
      // Try uploading to storage; fall back to data URL
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (uid) {
          const blob = await (await fetch(dataUrl)).blob();
          const path = `${uid}/${crypto.randomUUID()}.png`;
          const { error } = await supabase.storage.from("ebook-covers").upload(path, blob, {
            contentType: "image/png",
            upsert: false,
          });
          if (!error) {
            const { data: pub } = supabase.storage.from("ebook-covers").getPublicUrl(path);
            setCoverUrl(pub.publicUrl);
          } else {
            setCoverUrl(dataUrl);
          }
        } else {
          setCoverUrl(dataUrl);
        }
      } catch {
        setCoverUrl(dataUrl);
      }
      toast.success("Capa gerada");
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao gerar capa"));
    } finally {
      setBusy(null);
    }
  };

  const onGenerateChapters = async () => {
    if (!briefing || outline.length === 0) return;
    setChapters([]);
    setProgress({ done: 0, total: outline.length });
    setBusy("Escrevendo capítulos…");
    const acc: Chapter[] = [];
    try {
      for (let i = 0; i < outline.length; i++) {
        const { markdown } = await fnChapter({
          data: { briefing, chapter: outline[i], index: i, total: outline.length },
        });
        acc.push({ title: outline[i].title, markdown });
        setChapters([...acc]);
        setProgress({ done: i + 1, total: outline.length });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        saveDraft();
      }
      toast.success("Capítulos gerados");
    } catch (e) {
      toast.error(await errMsg(e, "Falha durante geração"));
    } finally {
      setBusy(null);
    }
  };

  const onRegenerateChapter = async (i: number) => {
    if (!briefing || !outline[i]) return;
    setRegeneratingIndex(i);
    try {
      const { markdown } = await fnChapter({
        data: { briefing, chapter: outline[i], index: i, total: outline.length },
      });
      const next = chapters.map((c, idx) => (idx === i ? { ...c, markdown } : c));
      setChapters(next);
      saveDraft();
      toast.success(`Capítulo ${i + 1} regerado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao regerar capítulo");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const onExport = async () => {
    if (!briefing || chapters.length === 0) {
      toast.error("Gere os capítulos primeiro");
      return;
    }
    setBusy("Gerando PDF…");
    try {
      const blob = await exportEbookPdf({
        title: briefing.title,
        subtitle: briefing.subtitle,
        layout,
        coverUrl,
        chapters,
      });
      downloadBlob(blob, `${slug(briefing.title)}.pdf`);

      await saveDraft({ status: "ready" });
      toast.success("PDF exportado");
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao exportar PDF"));
    } finally {
      setBusy(null);
    }
  };

  const onExportDocx = async () => {
    if (!briefing || chapters.length === 0) return toast.error("Gere os capítulos primeiro");
    setBusy("Gerando DOCX…");
    try {
      const blob = await exportEbookDocx({
        title: briefing.title,
        subtitle: briefing.subtitle,
        coverUrl,
        chapters,
      });
      downloadBlob(blob, `${slug(briefing.title)}.docx`);
      await saveDraft({ status: "ready" });
      toast.success("DOCX exportado");
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao exportar DOCX"));
    } finally {
      setBusy(null);
    }
  };

  const onExportEpub = async () => {
    if (!briefing || chapters.length === 0) return toast.error("Gere os capítulos primeiro");
    setBusy("Gerando EPUB…");
    try {
      const blob = await exportEbookEpub({
        title: briefing.title,
        subtitle: briefing.subtitle,
        coverUrl,
        chapters,
      });
      downloadBlob(blob, `${slug(briefing.title)}.epub`);
      await saveDraft({ status: "ready" });
      toast.success("EPUB exportado");
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao exportar EPUB"));
    } finally {
      setBusy(null);
    }
  };

  const onGenerateChapterImage = async (i: number) => {
    if (!briefing || !outline[i]) return;
    setImageBusyIndex(i);
    try {
      const { dataUrl } = await fnChapterImg({
        data: { briefing, chapter: outline[i], layout },
      });
      const next = chapters.map((c, idx) => (idx === i ? { ...c, imageUrl: dataUrl } : c));
      setChapters(next);
      toast.success(`Imagem do capítulo ${i + 1} gerada`);
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao gerar imagem"));
    } finally {
      setImageBusyIndex(null);
    }
  };

  const onGenerateAllChapterImages = async () => {
    if (!briefing) return;
    setBusy("Gerando imagens dos capítulos…");
    setProgress({ done: 0, total: chapters.length });
    const next = [...chapters];
    for (let i = 0; i < next.length; i++) {
      try {
        const { dataUrl } = await fnChapterImg({
          data: { briefing, chapter: outline[i] ?? { title: next[i].title, bullets: [] }, layout },
        });
        next[i] = { ...next[i], imageUrl: dataUrl };
        setChapters([...next]);
      } catch (e) {
        console.warn(`[ebook] image ch${i} failed`, e);
      }
      setProgress({ done: i + 1, total: next.length });
    }
    setBusy(null);
    toast.success("Imagens prontas");
  };

  const onPlaybookMode = () => {
    // Hand off to existing Playbook builder, prefilled with the same ad.
    if (selectedAd) {
      navigate({ to: "/produtos/playbook/novo", search: { adKey: selectedAd.key } as never });
    } else {
      navigate({ to: "/produtos/playbook/novo" });
    }
  };

  const canNext = useMemo(() => {
    if (step === 0) return !!selectedAd;
    if (step === 1) return !!briefing;
    if (step === 2) return outline.length > 0;
    if (step === 3) return true;
    return chapters.length > 0;
  }, [step, selectedAd, briefing, outline, chapters]);

  // Hub flow handlers
  const onHubMined = () => {
    setEntryStarted(true);
    setStep(0);
  };

  const emptyBriefing = (): Briefing => ({
    title: "",
    subtitle: "",
    niche: "",
    promise: "",
    avatar: "",
    pains: [],
    desires: [],
    uniqueMechanism: "",
  });

  const onHubScratch = (category: EbookCategory) => {
    setEntryStarted(true);
    if (category === "Playbook") {
      setStyle("playbook");
      setMode("playbook");
    } else if (category === "Amazon/KDP") {
      setStyle("amazon-kdp");
      setLayout("classico");
      setMode("kdp");
    } else if (category === "Infantil") {
      setStyle("infantil");
      setMode("premium");
    }
    const b = emptyBriefing();
    b.niche = category;
    setBriefing(b);
    setStep(1);
  };

  const onHubAi = async (input: AiKickstart) => {
    setEntryStarted(true);
    setBusy("Gerando estrutura com IA…");
    try {
      // Build briefing locally from form (no extra AI call needed)
      const b: Briefing = {
        title: input.niche,
        subtitle: input.promise.slice(0, 120),
        niche: input.niche,
        promise: input.promise,
        avatar: input.audience,
        pains: [],
        desires: [],
        uniqueMechanism: input.style,
      };
      setBriefing(b);
      setChapterCount(input.chapterCount);
      const o = await fnOutline({ data: { briefing: b, chapterCount: input.chapterCount } });
      setOutline(o);
      setStep(2);
      toast.success("Estrutura gerada");
    } catch (e) {
      toast.error(await errMsg(e, "Falha ao gerar estrutura"));
      setStep(1);
    } finally {
      setBusy(null);
    }
  };

  const showHub = !entryStarted && !ebookId && !briefing && !selectedAd;

  const onCreateNew = () => {
    setEntryStarted(false);
    setSelectedAd(null);
    setBriefing(null);
    setOutline([]);
    setChapters([]);
    setCoverUrl(null);
    setEbookId(null);
    setStep(0);
    try {
      window.history.replaceState({}, "", `/produtos/ebook`);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ebook Engine</h1>
          <p className="text-muted-foreground">Crie ebooks vendáveis a partir de anúncios, do zero ou direto pela IA.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-muted-foreground">
              Salvo {savedAt.toLocaleTimeString()}
            </span>
          )}
          {!showHub && (
            <Button onClick={onCreateNew} className="text-white" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="mr-2 h-4 w-4" /> Criar Novo Ebook
            </Button>
          )}
        </div>
      </div>

      {showHub && (
        <>
          <EbookHub
            onUseMined={onHubMined}
            onScratch={onHubScratch}
            onAiGenerate={onHubAi}
            onPdfImport={(b, sc) => {
              setEntryStarted(true);
              setMode("premium");
              setStyle("clean");
              setBriefing(b);
              setChapterCount(sc);
              setStep(2);
              (async () => {
                setBusy("Gerando estrutura com IA…");
                try {
                  const o = await fnOutline({ data: { briefing: b, chapterCount: sc } });
                  setOutline(o);
                } catch (e) {
                  toast.error(await errMsg(e, "Falha ao gerar estrutura"));
                  setStep(1);
                } finally {
                  setBusy(null);
                }
              })();
            }}
            busy={!!busy}
          />
          {drafts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Continuar onde parou</h2>
              <DraftList drafts={drafts} onResume={onResumeDraft} onDelete={onDeleteDraft} busy={!!busy} />
            </div>
          )}
        </>
      )}

      {!showHub && (
        <DraftList drafts={drafts} onResume={onResumeDraft} onDelete={onDeleteDraft} busy={!!busy} />
      )}

      {!showHub && (
        <>
      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {busy && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{busy}</span>
            {progress.total > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step content */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Escolha o anúncio base</CardTitle>
          </CardHeader>
          <CardContent>
            {ads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum anúncio salvo, favoritado ou escalado. Vá em <strong>Minerar</strong> para coletar e marcar
                anúncios primeiro.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {ads.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setSelectedAd(a)}
                    className={`rounded-lg border p-3 text-left transition hover:border-primary ${
                      selectedAd?.key === a.key ? "border-primary bg-primary/5" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {a.image_url && (
                        <img src={a.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{a.advertiser}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{a.headline}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">{a.platform}</Badge>
                          <Badge variant="outline" className="text-[10px]">{a.country}</Badge>
                          <Badge variant="outline" className="text-[10px]">{a.niche}</Badge>
                          <Badge className="text-[10px]">Score {a.score}</Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Briefing extraído</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!briefing ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  Vamos extrair nicho, promessa, avatar, dores e mecanismo único do anúncio selecionado.
                </p>
                <Button onClick={onExtract} disabled={!!busy}>
                  <Wand2 className="mr-2 h-4 w-4" /> Gerar briefing com IA
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Título" value={briefing.title} onChange={(v) => setBriefing({ ...briefing, title: v })} />
                <Field label="Subtítulo" value={briefing.subtitle} onChange={(v) => setBriefing({ ...briefing, subtitle: v })} />
                <Field label="Nicho" value={briefing.niche} onChange={(v) => setBriefing({ ...briefing, niche: v })} />
                <Field label="Promessa" value={briefing.promise} onChange={(v) => setBriefing({ ...briefing, promise: v })} multiline />
                <Field label="Avatar" value={briefing.avatar} onChange={(v) => setBriefing({ ...briefing, avatar: v })} multiline />
                <Field label="Mecanismo único" value={briefing.uniqueMechanism} onChange={(v) => setBriefing({ ...briefing, uniqueMechanism: v })} multiline />
                <Field label="Dores (uma por linha)" value={briefing.pains.join("\n")} onChange={(v) => setBriefing({ ...briefing, pains: v.split("\n").filter(Boolean) })} multiline />
                <Field label="Desejos (um por linha)" value={briefing.desires.join("\n")} onChange={(v) => setBriefing({ ...briefing, desires: v.split("\n").filter(Boolean) })} multiline />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Modo & estrutura do ebook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Estilo visual</Label>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
                {STYLES.map((s) => {
                  const active = style === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStyle(s.id);
                        setMode(styleToMode(s.id));
                        setLayout(styleToLayout(s.id));
                        if (s.id === "playbook") onPlaybookMode();
                      }}
                      className={`rounded-lg border p-3 text-left transition ${
                        active ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">{s.label}</span>
                        {active && <Check className="ml-auto h-3 w-3 text-primary" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Paleta</Label>
              <div className="flex flex-wrap gap-2">
                {PALETTES.map((p) => {
                  const active = palette === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPalette(p.id)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                        active ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${p.swatch}`} />
                      {p.label}
                      {active && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label>Capítulos</Label>
              <Input
                type="number"
                min={3}
                max={15}
                value={chapterCount}
                onChange={(e) => setChapterCount(Math.max(3, Math.min(15, Number(e.target.value) || 6)))}
                className="w-24"
              />
              <Button onClick={onOutline} disabled={!!busy}>
                <Wand2 className="mr-2 h-4 w-4" /> {outline.length ? "Regerar" : "Gerar"} estrutura
              </Button>
            </div>
            {outline.length > 0 && (
              <div className="space-y-3">
                {outline.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border/60 p-3">
                    <Input
                      value={c.title}
                      onChange={(e) => {
                        const o = [...outline];
                        o[i] = { ...o[i], title: e.target.value };
                        setOutline(o);
                      }}
                      className="mb-2 font-semibold"
                    />
                    <Textarea
                      value={c.bullets.join("\n")}
                      onChange={(e) => {
                        const o = [...outline];
                        o[i] = { ...o[i], bullets: e.target.value.split("\n").filter(Boolean) };
                        setOutline(o);
                      }}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Layout & capa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.values(LAYOUTS) as typeof LAYOUTS[EbookLayout][]).map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    layout === l.id ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{l.label}</p>
                    {layout === l.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_240px]">
              <div className="space-y-2">
                <Label>Prompt da capa (opcional)</Label>
                <Textarea
                  rows={3}
                  placeholder="Deixe vazio para gerar automaticamente a partir do briefing."
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                />
                <Button onClick={onCover} disabled={!!busy || !briefing}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Gerar capa com IA
                </Button>
              </div>
              <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                {coverUrl ? (
                  <img src={coverUrl} alt="capa" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Sem capa
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Capítulos & exportar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={onGenerateChapters} disabled={!!busy || outline.length === 0}>
                <Wand2 className="mr-2 h-4 w-4" />
                {chapters.length ? "Regerar capítulos" : "Gerar capítulos completos"}
              </Button>
              {mode === "premium" && chapters.length > 0 && (
                <Button onClick={onGenerateAllChapterImages} disabled={!!busy} variant="outline">
                  <ImageIcon className="mr-2 h-4 w-4" /> Gerar imagens dos capítulos
                </Button>
              )}
              <Button
                onClick={onExport}
                disabled={!!busy || chapters.length === 0}
                className="text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
              {mode === "kdp" && (
                <>
                  <Button onClick={onExportDocx} disabled={!!busy || chapters.length === 0} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" /> DOCX
                  </Button>
                  <Button onClick={onExportEpub} disabled={!!busy || chapters.length === 0} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" /> EPUB
                  </Button>
                </>
              )}
            </div>
            {mode === "premium" && chapters.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {chapters.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                    <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">sem img</div>
                      )}
                    </div>
                    <p className="line-clamp-2 flex-1 text-xs">{c.title}</p>
                    <Button size="sm" variant="ghost" onClick={() => onGenerateChapterImage(i)} disabled={imageBusyIndex === i}>
                      {imageBusyIndex === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {chapters.length > 0 && briefing && (
              <EbookPreview
                title={briefing.title}
                subtitle={briefing.subtitle}
                layout={layout}
                coverUrl={coverUrl}
                chapters={chapters}
                onChange={(next) => {
                  setChapters(next);
                  saveDraft();
                }}
                onRegenerate={onRegenerateChapter}
                regeneratingIndex={regeneratingIndex}
              />
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack} disabled={step === 0 || !!busy}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={goNext} disabled={!canNext || !!busy}>
            Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
        </>
      )}
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}