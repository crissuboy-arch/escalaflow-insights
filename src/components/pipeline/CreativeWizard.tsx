import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ArrowLeft, ArrowRight, Wand2, Check, Info } from "lucide-react";
import {
  ADS_FORMATS,
  DIMENSIONS,
  OBJECTIVES,
  PLATFORMS,
  type AdsFormatId,
  type Dimension,
  type ObjectiveId,
  type PlatformId,
} from "@/lib/ads/catalog";
import { Stepper, type Step } from "./Stepper";
import { StandaloneBriefingForm } from "./StandaloneBriefingForm";
import { CreativeCard } from "./CreativeCard";
import {
  generateCreativeVariations,
  generateMultiFormatCreatives,
} from "@/lib/ads-creative.functions";
import type { Creative } from "@/lib/ads.server";
import type { StandaloneBriefing } from "@/lib/standalone/briefing";
import { cn } from "@/lib/utils";

const STEPS: Step[] = [
  { id: "platform", label: "Plataforma" },
  { id: "objective", label: "Objetivo" },
  { id: "format", label: "Formato (até 3)" },
  { id: "briefing", label: "Briefing" },
  { id: "result", label: "Resultado" },
];

type ResultRow = { formatId: AdsFormatId; creative: Creative };

export function CreativeWizard() {
  const genMulti = useServerFn(generateMultiFormatCreatives);
  const genVar = useServerFn(generateCreativeVariations);

  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<PlatformId | null>(null);
  const [objective, setObjective] = useState<ObjectiveId | null>(null);
  const [formatIds, setFormatIds] = useState<AdsFormatId[]>([]);
  const [dimension, setDimension] = useState<Dimension>("9:16");
  const [briefing, setBriefing] = useState<StandaloneBriefing | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [search, setSearch] = useState("");

  const completed = useMemo(() => {
    const s = new Set<string>();
    if (platform) s.add("platform");
    if (objective) s.add("objective");
    if (formatIds.length) s.add("format");
    if (briefing) s.add("briefing");
    if (results.length) s.add("result");
    return s;
  }, [platform, objective, formatIds, briefing, results]);

  const filteredFormats = ADS_FORMATS.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      (f.gatilho ?? "").toLowerCase().includes(q)
    );
  });

  const toggleFormat = (id: AdsFormatId) => {
    setFormatIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.warning("Você pode escolher no máximo 3 formatos.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const runGenerate = async (b: StandaloneBriefing) => {
    if (!platform || !objective || !formatIds.length) return;
    setBriefing(b);
    setBusy(true);
    setResults([]);
    try {
      const r = await genMulti({
        data: {
          source: { kind: "standalone", briefing: b },
          platform,
          objective,
          formatIds,
          dimension,
        },
      });
      setResults(r.results as ResultRow[]);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar criativos");
    } finally {
      setBusy(false);
    }
  };

  const runVariations = async (formatId: AdsFormatId) => {
    if (!platform || !objective || !briefing) return;
    setBusy(true);
    try {
      const r = await genVar({
        data: {
          source: { kind: "standalone", briefing },
          platform,
          objective,
          formatId,
          dimension,
          count: 3,
        },
      });
      setResults((prev) => [
        ...prev,
        ...r.creatives.map((creative) => ({ formatId, creative })),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar variações");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Stepper steps={STEPS} current={step} completed={completed} onJump={setStep} />

      {step === 0 && (
        <Grid>
          {PLATFORMS.map((p) => (
            <PickCard
              key={p.id}
              active={platform === p.id}
              title={p.name}
              desc={p.desc}
              onClick={() => {
                setPlatform(p.id);
                setStep(1);
              }}
            />
          ))}
        </Grid>
      )}

      {step === 1 && (
        <Grid>
          {OBJECTIVES.map((o) => (
            <PickCard
              key={o.id}
              active={objective === o.id}
              title={o.name}
              desc={o.desc}
              onClick={() => {
                setObjective(o.id);
                setStep(2);
              }}
            />
          ))}
        </Grid>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar formato (nome, descrição, gatilho)…"
              className="max-w-sm"
            />
            <div className="flex gap-1">
              {DIMENSIONS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={dimension === d ? "default" : "outline"}
                  onClick={() => setDimension(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary">{formatIds.length}/3 selecionados</Badge>
              <Button
                size="sm"
                disabled={formatIds.length === 0}
                onClick={() => setStep(3)}
              >
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <TooltipProvider delayDuration={150}>
            <Grid>
              {filteredFormats.map((f) => (
                <FormatCard
                  key={f.id}
                  active={formatIds.includes(f.id as AdsFormatId)}
                  title={f.name}
                  desc={f.description}
                  gatilho={f.gatilho}
                  uso={f.uso}
                  emocao={f.emocao}
                  onClick={() => toggleFormat(f.id as AdsFormatId)}
                />
              ))}
            </Grid>
          </TooltipProvider>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <SummaryBar
            items={[
              { label: "Plataforma", value: PLATFORMS.find((p) => p.id === platform)?.name },
              { label: "Objetivo", value: OBJECTIVES.find((o) => o.id === objective)?.name },
              {
                label: "Formatos",
                value: formatIds
                  .map((id) => ADS_FORMATS.find((f) => f.id === id)?.name)
                  .filter(Boolean)
                  .join(", "),
              },
              { label: "Dimensão", value: dimension },
            ]}
          />
          <StandaloneBriefingForm
            module="criativos"
            onReady={runGenerate}
            busy={busy}
            submitLabel={`Gerar ${formatIds.length} criativo${formatIds.length > 1 ? "s" : ""} com IA`}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <SummaryBar
            items={[
              { label: "Plataforma", value: PLATFORMS.find((p) => p.id === platform)?.name },
              { label: "Objetivo", value: OBJECTIVES.find((o) => o.id === objective)?.name },
              { label: "Dimensão", value: dimension },
              { label: "Total", value: `${results.length} peça(s)` },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Trocar formatos
            </Button>
            {busy && (
              <span className="inline-flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…
              </span>
            )}
          </div>
          <div className="space-y-4">
            {results.map((row, i) => {
              const fmt = ADS_FORMATS.find((f) => f.id === row.formatId);
              return (
                <CreativeCard
                  key={`${row.formatId}-${i}`}
                  id={`${row.formatId}-${i}`}
                  creative={row.creative}
                  meta={{
                    platform: PLATFORMS.find((p) => p.id === platform)?.name ?? "",
                    objective: OBJECTIVES.find((o) => o.id === objective)?.name ?? "",
                    format: fmt?.name ?? row.formatId,
                    dimension,
                    gatilho: fmt?.gatilho,
                    uso: fmt?.uso,
                  }}
                  onVariations={() => runVariations(row.formatId)}
                  variationsBusy={busy}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={
            step === STEPS.length - 1 ||
            (step === 0 && !platform) ||
            (step === 1 && !objective) ||
            (step === 2 && formatIds.length === 0) ||
            (step === 3 && !briefing)
          }
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        >
          Avançar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function PickCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-xl border p-4 text-left transition",
        active
          ? "border-primary/60 bg-card shadow-[0_0_24px_-12px_hsl(var(--primary)/0.6)]"
          : "border-border/60 bg-card/40 hover:border-border",
      )}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function FormatCard({
  active,
  title,
  desc,
  gatilho,
  uso,
  emocao,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  gatilho?: string;
  uso?: string;
  emocao?: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "group relative rounded-xl border p-4 text-left transition",
            active
              ? "border-primary bg-card shadow-[0_0_24px_-12px_hsl(var(--primary)/0.6)] ring-1 ring-primary/40"
              : "border-border/60 bg-card/40 hover:border-border",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-tight">{title}</p>
            <div className="flex items-center gap-1">
              {emocao && (
                <Badge variant="outline" className="text-[10px]">
                  {emocao}
                </Badge>
              )}
              {active ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{desc}</p>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1">
        <p className="text-xs font-semibold">{title}</p>
        {gatilho && (
          <p className="text-xs">
            <span className="font-medium text-primary">Gatilho:</span> {gatilho}
          </p>
        )}
        {uso && (
          <p className="text-xs">
            <span className="font-medium text-primary">Uso:</span> {uso}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function SummaryBar({ items }: { items: Array<{ label: string; value?: string }> }) {
  return (
    <Card className="border-border/40 bg-card/40">
      <CardContent className="flex flex-wrap gap-3 p-3 text-xs">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-muted-foreground">{it.label}:</span>
            <span className="font-medium">{it.value ?? "—"}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
