import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Wand2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  fetchPlaybookAds,
  buildLocalBriefing,
  buildLocalOutline,
  buildLocalSceneText,
  type PlaybookAd,
} from "@/lib/playbook/ads-source";
import {
  extractPlaybookBriefing,
  generatePlaybookOutline,
  generatePlaybookSceneContent,
  generatePlaybookSceneImage,
  savePlaybook,
  uploadPlaybookImage,
} from "@/lib/playbook.functions";
import { loadEbookDraft } from "@/lib/ebook.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/produtos/playbook/novo")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: NewPlaybookPage,
});

type Briefing = {
  title: string;
  niche: string;
  promise: string;
  avatar: string;
  uniqueMechanism: string;
  pains: string[];
  desires: string[];
};
type Outline = { title: string; summary: string; exercise: string; practicalAction: string }[];

const THEMES = [
  { id: "neon-roxo", label: "Neon Roxo", desc: "Cyberpunk vibrante" },
  { id: "dourado-editorial", label: "Dourado Editorial", desc: "Premium sofisticado" },
  { id: "minimal-dark", label: "Minimal Dark", desc: "Geométrico limpo" },
] as const;

const STEPS = ["Anúncio", "Briefing", "Cenas", "Tema", "Gerar"];

function NewPlaybookPage() {
  const navigate = useNavigate();
  const extractFn = useServerFn(extractPlaybookBriefing);
  const outlineFn = useServerFn(generatePlaybookOutline);
  const sceneFn = useServerFn(generatePlaybookSceneContent);
  const imageFn = useServerFn(generatePlaybookSceneImage);
  const saveFn = useServerFn(savePlaybook);
  const uploadFn = useServerFn(uploadPlaybookImage);
  const loadEbook = useServerFn(loadEbookDraft);

  const [step, setStep] = useState(0);
  const [ads, setAds] = useState<PlaybookAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<PlaybookAd | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [sceneCount, setSceneCount] = useState(7);
  const [outline, setOutline] = useState<Outline>([]);
  const [theme, setTheme] = useState<(typeof THEMES)[number]["id"]>("neon-roxo");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [skipImages, setSkipImages] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setAds(await fetchPlaybookAds());
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  // Prefill from ebook (?fromEbook=<id>) — skip ad step.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromEbook = params.get("fromEbook");
    if (!fromEbook) return;
    (async () => {
      try {
        const row = (await loadEbook({ data: { id: fromEbook } })) as Record<string, unknown>;
        const eb = (row.briefing ?? {}) as Record<string, unknown>;
        const outlineEb = Array.isArray(row.outline) ? (row.outline as Array<{ title?: string; bullets?: string[] }>) : [];
        setBriefing({
          title: String(eb.title ?? row.title ?? "Playbook"),
          niche: String(eb.niche ?? row.niche ?? ""),
          promise: String(eb.promise ?? ""),
          avatar: String(eb.avatar ?? ""),
          uniqueMechanism: String(eb.uniqueMechanism ?? ""),
          pains: Array.isArray(eb.pains) ? (eb.pains as string[]) : [],
          desires: Array.isArray(eb.desires) ? (eb.desires as string[]) : [],
        });
        if (outlineEb.length > 0) {
          setOutline(
            outlineEb.map((c) => ({
              title: c.title ?? "",
              summary: (c.bullets ?? []).slice(0, 3).join(" • "),
              exercise: "",
              practicalAction: "",
            })),
          );
          setSceneCount(Math.min(12, Math.max(3, outlineEb.length)));
          setStep(2);
        } else {
          setStep(1);
        }
        toast.success("Importado do ebook");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao importar ebook");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStartScratch = () => {
    setSelectedAd(null);
    setBriefing({
      title: "",
      niche: "",
      promise: "",
      avatar: "",
      uniqueMechanism: "",
      pains: [],
      desires: [],
    });
    setStep(1);
  };

  const adInput = useMemo(
    () =>
      selectedAd
        ? {
            headline: selectedAd.headline,
            copy: selectedAd.copy ?? undefined,
            cta: selectedAd.cta ?? undefined,
            niche: selectedAd.niche,
            country: selectedAd.country,
            platform: selectedAd.platform,
            advertiser: selectedAd.advertiser,
            score: selectedAd.score,
          }
        : null,
    [selectedAd],
  );

  const onExtract = async () => {
    if (!adInput || !selectedAd) return;
    setBusy("Gerando briefing…");
    try {
      try {
        const b = await extractFn({ data: { ad: adInput } });
        setBriefing(b);
      } catch (err) {
        console.warn("[playbook] briefing fallback", err);
        setBriefing(buildLocalBriefing(selectedAd));
        toast.warning("IA indisponível — usei estrutura base. Edite à vontade.");
      }
      setStep(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar briefing");
    } finally {
      setBusy(null);
    }
  };

  const onOutline = async () => {
    if (!briefing) return;
    setBusy("Estruturando cenas…");
    try {
      try {
        const o = await outlineFn({ data: { briefing, sceneCount } });
        setOutline(o);
      } catch (err) {
        console.warn("[playbook] outline fallback", err);
        setOutline(buildLocalOutline(briefing, sceneCount));
        toast.warning("IA indisponível — gerei cenas base. Edite o conteúdo.");
      }
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar cenas");
    } finally {
      setBusy(null);
    }
  };

  const onGenerate = async () => {
    if (!briefing || outline.length === 0) return;
    setProgress({ done: 0, total: outline.length });
    setBusy("Gerando playbook…");
    try {
      const scenes: {
        id: string;
        order: number;
        title: string;
        summary: string;
        text: string;
        image_url: string | null;
        balloons: string[];
        exercise: string;
        practical_action: string;
      }[] = [];
      for (let i = 0; i < outline.length; i++) {
        const s = outline[i];
        let content: { text: string; balloons: string[] };
        try {
          content = await sceneFn({ data: { briefing, scene: s, index: i, total: outline.length } });
        } catch (err) {
          console.warn("[playbook] scene content fallback", err);
          content = buildLocalSceneText(s, briefing);
        }
        let img: string | null = null;
        if (!skipImages) {
          try {
            const r = await imageFn({
              data: { briefing, scene: { title: s.title, summary: s.summary }, theme },
            });
            const raw = r.dataUrl;
            if (raw && raw.startsWith("data:")) {
              try {
                const up = await uploadFn({ data: { dataUrl: raw } });
                img = up.url ?? raw;
              } catch (e) {
                console.warn("[playbook] upload falhou, usando dataUrl", e);
                img = raw;
              }
            } else if (raw) {
              img = raw;
            }
          } catch (e) {
            console.warn("imagem falhou", e);
          }
        }
        scenes.push({
          id: crypto.randomUUID(),
          order: i,
          title: s.title,
          summary: s.summary,
          text: content.text,
          image_url: img,
          balloons: content.balloons,
          exercise: s.exercise,
          practical_action: s.practicalAction,
        });
        setProgress({ done: i + 1, total: outline.length });
      }
      const { id } = await saveFn({
        data: {
          payload: {
            title: briefing.title,
            niche: briefing.niche,
            source_ad_key: selectedAd?.key ?? null,
            avatar: briefing.avatar,
            promise: briefing.promise,
            unique_mechanism: briefing.uniqueMechanism,
            briefing,
            scenes,
            theme,
            cover_url: scenes[0]?.image_url ?? null,
            status: "draft",
            step: 5,
          },
        },
      });
      toast.success("Playbook criado!");
      navigate({ to: "/produtos/playbook/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar playbook");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="playbook-surface min-h-[calc(100vh-3rem)] -m-4 p-6 md:p-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/produtos/playbook" })}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Biblioteca
          </Button>
        </div>
        <h1 className="playbook-title-display text-3xl font-bold md:text-4xl">Criar Playbook</h1>
        <Stepper step={step} />

        <Card className="playbook-card-neon mt-6 border-0 bg-card/60 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            {step === 0 && (
              <StepAd
                ads={ads}
                selected={selectedAd}
                onSelect={setSelectedAd}
                onNext={onExtract}
                busy={busy}
              />
            )}
            {step === 1 && briefing && (
              <StepBriefing
                briefing={briefing}
                setBriefing={setBriefing}
                sceneCount={sceneCount}
                setSceneCount={setSceneCount}
                onBack={() => setStep(0)}
                onNext={onOutline}
                busy={busy}
              />
            )}
            {step === 2 && (
              <StepOutline
                outline={outline}
                setOutline={setOutline}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <StepTheme
                theme={theme}
                setTheme={setTheme}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            )}
            {step === 4 && (
              <StepGenerate
                outline={outline}
                progress={progress}
                busy={busy}
                onBack={() => setStep(3)}
                onGenerate={onGenerate}
                skipImages={skipImages}
                setSkipImages={setSkipImages}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i <= step ? "text-white" : "bg-muted text-muted-foreground"
            }`}
            style={i <= step ? { background: "var(--gradient-playbook)" } : undefined}
          >
            {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={`text-xs ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground">›</span>}
        </div>
      ))}
    </div>
  );
}

function StepAd({
  ads,
  selected,
  onSelect,
  onNext,
  busy,
}: {
  ads: PlaybookAd[];
  selected: PlaybookAd | null;
  onSelect: (a: PlaybookAd) => void;
  onNext: () => void;
  busy: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="playbook-title-display text-xl font-bold">Escolha um anúncio base</h2>
        <p className="text-sm text-muted-foreground">Use anúncios reais minerados, salvos ou favoritados.</p>
      </div>
      {ads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum anúncio disponível. Rode uma mineração ou salve anúncios para começar.
        </div>
      ) : (
        <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {ads.map((ad) => (
            <button
              key={ad.key}
              onClick={() => onSelect(ad)}
              className={`flex gap-3 rounded-xl border p-3 text-left transition ${
                selected?.key === ad.key
                  ? "border-[var(--playbook-neon)] shadow-[var(--shadow-neon)]"
                  : "border-border hover:border-[var(--playbook-neon-2)]"
              }`}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {ad.imageUrl && (
                  <img src={ad.imageUrl} alt={ad.advertiser} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{ad.advertiser}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{ad.headline}</p>
                <div className="mt-1 flex gap-1">
                  <Badge variant="secondary" className="text-[10px]">{ad.platform}</Badge>
                  <Badge variant="outline" className="text-[10px]">{ad.niche}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button disabled={!selected || !!busy} onClick={onNext} style={{ background: "var(--gradient-playbook)" }} className="text-white">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {busy ?? "Gerar briefing"}
        </Button>
      </div>
    </div>
  );
}

function StepBriefing({
  briefing,
  setBriefing,
  sceneCount,
  setSceneCount,
  onBack,
  onNext,
  busy,
}: {
  briefing: Briefing;
  setBriefing: (b: Briefing) => void;
  sceneCount: number;
  setSceneCount: (n: number) => void;
  onBack: () => void;
  onNext: () => void;
  busy: string | null;
}) {
  const upd = (k: keyof Briefing, v: string) => setBriefing({ ...briefing, [k]: v });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="playbook-title-display text-xl font-bold">Briefing</h2>
        <p className="text-sm text-muted-foreground">Edite antes de seguir.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input value={briefing.title} onChange={(e) => upd("title", e.target.value)} />
        </div>
        <div><Label>Nicho</Label><Input value={briefing.niche} onChange={(e) => upd("niche", e.target.value)} /></div>
        <div><Label>Avatar</Label><Input value={briefing.avatar} onChange={(e) => upd("avatar", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Promessa</Label><Textarea rows={2} value={briefing.promise} onChange={(e) => upd("promise", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Mecanismo único</Label><Textarea rows={2} value={briefing.uniqueMechanism} onChange={(e) => upd("uniqueMechanism", e.target.value)} /></div>
        <div>
          <Label>Quantidade de cenas</Label>
          <Input type="number" min={3} max={12} value={sceneCount} onChange={(e) => setSceneCount(Math.max(3, Math.min(12, Number(e.target.value) || 7)))} />
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <Button onClick={onNext} disabled={!!busy} style={{ background: "var(--gradient-playbook)" }} className="text-white">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {busy ?? "Estruturar cenas"}
        </Button>
      </div>
    </div>
  );
}

function StepOutline({
  outline,
  setOutline,
  onBack,
  onNext,
}: {
  outline: Outline;
  setOutline: (o: Outline) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="playbook-title-display text-xl font-bold">Estrutura de cenas</h2>
      <div className="space-y-2">
        {outline.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Badge>{i + 1}</Badge>
              <Input
                className="border-0 bg-transparent text-base font-semibold focus-visible:ring-0"
                value={s.title}
                onChange={(e) => {
                  const next = [...outline];
                  next[i] = { ...s, title: e.target.value };
                  setOutline(next);
                }}
              />
            </div>
            <Textarea
              rows={2}
              value={s.summary}
              onChange={(e) => {
                const next = [...outline];
                next[i] = { ...s, summary: e.target.value };
                setOutline(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <Button onClick={onNext} style={{ background: "var(--gradient-playbook)" }} className="text-white">
          Escolher tema <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepTheme({
  theme,
  setTheme,
  onBack,
  onNext,
}: {
  theme: string;
  setTheme: (t: "neon-roxo" | "dourado-editorial" | "minimal-dark") => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="playbook-title-display text-xl font-bold">Estilo visual</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`rounded-2xl p-5 text-left transition ${
              theme === t.id
                ? "playbook-card-neon"
                : "border border-border hover:border-[var(--playbook-neon-2)]"
            }`}
          >
            <p className="playbook-title-display text-lg font-bold">{t.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <Button onClick={onNext} style={{ background: "var(--gradient-playbook)" }} className="text-white">
          Próximo <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepGenerate({
  outline,
  progress,
  busy,
  onBack,
  onGenerate,
  skipImages,
  setSkipImages,
}: {
  outline: Outline;
  progress: { done: number; total: number };
  busy: string | null;
  onBack: () => void;
  onGenerate: () => void;
  skipImages: boolean;
  setSkipImages: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-[var(--playbook-neon)]" />
      <h2 className="playbook-title-display text-2xl font-bold">Gerar playbook</h2>
      <p className="text-sm text-muted-foreground">
        Iremos criar texto, balões de insight e imagem para cada uma das {outline.length} cenas.
      </p>
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={skipImages}
          onChange={(e) => setSkipImages(e.target.checked)}
          className="h-4 w-4 accent-[var(--playbook-neon)]"
        />
        Pular geração de imagens (mais rápido)
      </label>
      {busy && (
        <div className="mx-auto max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full"
              style={{ background: "var(--gradient-playbook)" }}
              animate={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progress.done}/{progress.total} cenas
          </p>
        </div>
      )}
      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={!!busy}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <Button onClick={onGenerate} disabled={!!busy} size="lg" style={{ background: "var(--gradient-playbook)" }} className="text-white shadow-[var(--shadow-neon)]">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {busy ?? "Gerar playbook completo"}
        </Button>
      </div>
    </div>
  );
}