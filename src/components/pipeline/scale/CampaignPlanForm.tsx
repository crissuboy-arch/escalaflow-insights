import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Sparkles, Stethoscope } from "lucide-react";
import { createCampaignPlan, extractCreativeContext, fullDiagnosis, saveScaleDraft } from "@/lib/scale.functions";
import type { CampaignPlan, FullDiagnosis } from "@/lib/scale.server";
import { CountryMultiSelect } from "./CountryMultiSelect";
import { CurrencySelect } from "./CurrencySelect";
import { PlatformPicker } from "./PlatformPicker";
import { ImageUploader } from "./ImageUploader";
import { countryByCode, currencyByCode } from "@/lib/scale/i18n";

export function CampaignPlanForm({
  projectId,
  onPlan,
  onDiagnosis,
  initialInput,
  initialImages,
  initialContext,
}: {
  projectId?: string;
  onPlan: (p: CampaignPlan) => void;
  onDiagnosis?: (d: FullDiagnosis) => void;
  initialInput?: Record<string, unknown> | null;
  initialImages?: string[] | null;
  initialContext?: unknown | null;
}) {
  const run = useServerFn(createCampaignPlan);
  const runExtract = useServerFn(extractCreativeContext);
  const runDiag = useServerFn(fullDiagnosis);
  const runDraft = useServerFn(saveScaleDraft);
  const [busy, setBusy] = useState(false);
  const [busyDiag, setBusyDiag] = useState(false);
  const [stage, setStage] = useState<"idle" | "reading" | "planning" | "done">("idle");
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [cachedContext, setCachedContext] = useState<unknown | null>(initialContext ?? null);
  const [cachedKey, setCachedKey] = useState<string>("");
  const [form, setForm] = useState({
    productName: (initialInput?.productName as string) || "",
    pageUrl: (initialInput?.pageUrl as string) || "",
    price: (initialInput?.price as string) || "",
    dailyBudget: (initialInput?.dailyBudget as string) || "",
    offerText: (initialInput?.offerText as string) || "",
  });

  // Invalidate cached extraction when images change
  useEffect(() => {
    const key = images.join("|");
    if (key !== cachedKey) {
      // Don't blow away the hydrated context on first render
      if (cachedKey !== "") setCachedContext(null);
      setCachedKey(key);
    }
  }, [images, cachedKey]);
  const [countryCodes, setCountryCodes] = useState<string[]>(
    (initialInput?.countryCodes as string[]) || ["BR"],
  );
  const [currency, setCurrency] = useState<string>(
    (initialInput?.currency as string) || "BRL",
  );
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(
    (initialInput?.platforms as string[]) || [
      "Meta · Instagram Feed",
      "Meta · Reels",
      "Meta · Stories",
    ],
  );

  // Autosave draft (form + images + extracted context) so the user can
  // reopen the project exactly where they stopped. Debounced 1.5s.
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstAutosave = useRef(true);
  useEffect(() => {
    if (!projectId) return;
    if (firstAutosave.current) {
      firstAutosave.current = false;
      return;
    }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      runDraft({
        data: {
          projectId,
          input: { ...form, countryCodes, currency, platforms },
          imageDataUrls: images,
          extractedContext: cachedContext ?? undefined,
        },
      }).catch(() => {});
    }, 1500);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, form, countryCodes, currency, platforms, images, cachedContext]);

  function handleCountries(codes: string[]) {
    setCountryCodes(codes);
    if (!currencyTouched && codes[0]) {
      const c = countryByCode(codes[0]);
      if (c) setCurrency(c.defaultCurrency);
    }
  }

  async function runFullDiagnosis() {
    setBusyDiag(true);
    try {
      const countryNames = countryCodes.map((c) => countryByCode(c)?.name || c);
      let extracted = cachedContext;
      if (images.length && !extracted) {
        try {
          const ex = await runExtract({
            data: {
              imageDataUrls: images,
              pageUrl: form.pageUrl || undefined,
              price: form.price || undefined,
              offerText: form.offerText || undefined,
            },
          });
          extracted = ex.context;
          setCachedContext(extracted);
        } catch (e) {
          toast.error(e instanceof Error ? `Falha ao ler imagens: ${e.message}` : "Falha ao ler imagens.");
          throw e;
        }
      }
      const r = await runDiag({
        data: {
          projectId,
          productName: form.productName || undefined,
          pageUrl: form.pageUrl || undefined,
          price: form.price || undefined,
          currency: currency || undefined,
          countries: countryNames.length ? countryNames : undefined,
          offerText: form.offerText || undefined,
          imageDataUrls: extracted ? undefined : images.length ? images : undefined,
          extractedContext: extracted ?? undefined,
        },
      });
      onDiagnosis?.(r.diagnosis);
      toast.success("Diagnóstico completo gerado.");
    } catch (e) {
      if (!(e instanceof Error) || !/imagens/i.test(e.message)) {
        toast.error(e instanceof Error ? e.message : "Falha no diagnóstico");
      }
    } finally {
      setBusyDiag(false);
    }
  }

  const currencyMeta = currencyByCode(currency);

  async function go() {
    setBusy(true);
    setStage("idle");
    try {
      const countryNames = countryCodes.map((c) => countryByCode(c)?.name || c);

      // Stage A: extract context from images (skip if no images or already cached)
      let extracted = cachedContext;
      if (images.length && !extracted) {
        setStage("reading");
        try {
          const ex = await runExtract({
            data: {
              imageDataUrls: images,
              pageUrl: form.pageUrl || undefined,
              price: form.price || undefined,
              offerText: form.offerText || undefined,
            },
          });
          extracted = ex.context;
          setCachedContext(extracted);
        } catch (e) {
          toast.error(
            e instanceof Error
              ? `Falha ao ler imagens: ${e.message}`
              : "Falha ao ler imagens. Tente novamente.",
          );
          throw e;
        }
      }

      // Stage B: generate plan
      setStage("planning");
      const r = await run({
        data: {
          projectId,
          productName: form.productName || undefined,
          pageUrl: form.pageUrl || undefined,
          price: form.price || undefined,
          currency: currency || undefined,
          currencySymbol: currencyMeta?.symbol,
          countries: countryNames.length ? countryNames : undefined,
          countryCodes: countryCodes.length ? countryCodes : undefined,
          platforms: platforms.length ? platforms : undefined,
          dailyBudget: form.dailyBudget || undefined,
          offerText: form.offerText || undefined,
          imageDataUrls: extracted ? undefined : images.length ? images : undefined,
          extractedContext: extracted ?? undefined,
        },
      });
      setStage("done");
      onPlan(r.plan);
      toast.success("Plano de campanha gerado.");
    } catch (e) {
      // Stage-A error already toasted; only toast B-stage errors here
      if (stage !== "reading") {
        toast.error(e instanceof Error ? e.message : "Falha ao gerar plano");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">Briefing da campanha</p>
          <p className="text-xs text-muted-foreground">
            Suba prints do produto, da página, do anúncio e/ou criativos. A IA monta o plano completo dos 3 primeiros dias.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome do produto / oferta">
            <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Link da página de vendas">
            <Input placeholder="https://..." value={form.pageUrl} onChange={(e) => setForm({ ...form, pageUrl: e.target.value })} />
          </Field>
          <Field label={`Preço${currencyMeta ? ` (${currencyMeta.symbol})` : ""}`}>
            <Input placeholder="97" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </Field>
          <Field label="Moeda">
            <CurrencySelect value={currency} onChange={(c) => { setCurrency(c); setCurrencyTouched(true); }} />
          </Field>
          <Field label={`Orçamento diário${currencyMeta ? ` (${currencyMeta.code})` : ""}`}>
            <Input placeholder="R$ 100/dia" value={form.dailyBudget} onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })} />
          </Field>
          <Field label="Países-alvo">
            <CountryMultiSelect value={countryCodes} onChange={handleCountries} />
          </Field>
        </div>

        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Plataformas & placements</Label>
          <PlatformPicker value={platforms} onChange={setPlatforms} />
        </div>

        <Field label="Texto da oferta / promessa">
          <Textarea rows={3} value={form.offerText} onChange={(e) => setForm({ ...form, offerText: e.target.value })} />
        </Field>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">
            Imagens da página, checkout, anúncio, criativos e métricas (até 6)
          </Label>
          <ImageUploader value={images} onChange={setImages} maxFiles={6} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={runFullDiagnosis} disabled={busy || busyDiag} variant="secondary">
            {busyDiag ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            Diagnóstico Completo
          </Button>
          <Button onClick={go} disabled={busy || busyDiag}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Criar Plano de Campanha
          </Button>
        </div>

        {busy && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <ProgressLine
              active={stage === "reading"}
              done={stage === "planning" || stage === "done"}
              label={images.length ? "Lendo imagens e página…" : "Sem imagens — pulando leitura"}
            />
            <ProgressLine
              active={stage === "planning"}
              done={stage === "done"}
              label="Gerando plano de campanha…"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressLine({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {done ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <span className="inline-block h-4 w-4 rounded-full border border-border" />
      )}
      <span className={done ? "text-muted-foreground line-through" : active ? "" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}