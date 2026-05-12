import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
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
  generateCreative,
  generateCreativeVariations,
} from "@/lib/ads-creative.functions";
import type { Creative } from "@/lib/ads.server";
import type { StandaloneBriefing } from "@/lib/standalone/briefing";
import { cn } from "@/lib/utils";

const STEPS: Step[] = [
  { id: "platform", label: "Plataforma" },
  { id: "objective", label: "Objetivo" },
  { id: "format", label: "Formato" },
  { id: "briefing", label: "Briefing" },
  { id: "result", label: "Resultado" },
];

export function CreativeWizard() {
  const gen = useServerFn(generateCreative);
  const genVar = useServerFn(generateCreativeVariations);

  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<PlatformId | null>(null);
  const [objective, setObjective] = useState<ObjectiveId | null>(null);
  const [formatId, setFormatId] = useState<AdsFormatId | null>(null);
  const [dimension, setDimension] = useState<Dimension>("9:16");
  const [briefing, setBriefing] = useState<StandaloneBriefing | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Creative[]>([]);
  const [search, setSearch] = useState("");

  const completed = useMemo(() => {
    const s = new Set<string>();
    if (platform) s.add("platform");
    if (objective) s.add("objective");
    if (formatId) s.add("format");
    if (briefing) s.add("briefing");
    if (results.length) s.add("result");
    return s;
  }, [platform, objective, formatId, briefing, results]);

  const filteredFormats = ADS_FORMATS.filter((f) =>
    !search ? true : (f.name + f.description).toLowerCase().includes(search.toLowerCase()),
  );

  const runGenerate = async (b: StandaloneBriefing) => {
    if (!platform || !objective || !formatId) return;
    setBriefing(b);
    setBusy(true);
    setResults([]);
    try {
      const r = await gen({
        data: {
          source: { kind: "standalone", briefing: b },
          platform,
          objective,
          formatId,
          dimension,
        },
      });
      setResults([r.creative]);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar criativo");
    } finally {
      setBusy(false);
    }
  };

  const runVariations = async () => {
    if (!platform || !objective || !formatId || !briefing) return;
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
      setResults((prev) => [...prev, ...r.creatives]);
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
              placeholder="Buscar formato…"
              className="max-w-xs"
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
          </div>
          <Grid>
            {filteredFormats.map((f) => (
              <PickCard
                key={f.id}
                active={formatId === f.id}
                title={f.name}
                desc={f.description}
                tag={f.emocao}
                onClick={() => {
                  setFormatId(f.id);
                  setStep(3);
                }}
              />
            ))}
          </Grid>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <SummaryBar
            items={[
              { label: "Plataforma", value: PLATFORMS.find((p) => p.id === platform)?.name },
              { label: "Objetivo", value: OBJECTIVES.find((o) => o.id === objective)?.name },
              { label: "Formato", value: ADS_FORMATS.find((f) => f.id === formatId)?.name },
              { label: "Dimensão", value: dimension },
            ]}
          />
          <StandaloneBriefingForm
            module="criativos"
            onReady={runGenerate}
            busy={busy}
            submitLabel="Gerar Criativo com IA"
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <SummaryBar
            items={[
              { label: "Plataforma", value: PLATFORMS.find((p) => p.id === platform)?.name },
              { label: "Objetivo", value: OBJECTIVES.find((o) => o.id === objective)?.name },
              { label: "Formato", value: ADS_FORMATS.find((f) => f.id === formatId)?.name },
              { label: "Dimensão", value: dimension },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={runVariations} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Gerar 3 variações
            </Button>
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Trocar formato
            </Button>
          </div>
          <div className="space-y-4">
            {results.map((c, i) => (
              <CreativeCard
                key={i}
                id={`${formatId}-${i}-${Date.now()}`}
                creative={c}
                meta={{
                  platform: PLATFORMS.find((p) => p.id === platform)?.name ?? "",
                  objective: OBJECTIVES.find((o) => o.id === objective)?.name ?? "",
                  format: ADS_FORMATS.find((f) => f.id === formatId)?.name ?? "",
                  dimension,
                }}
              />
            ))}
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
            (step === 2 && !formatId) ||
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
  tag,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  tag?: string;
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
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{title}</p>
        {tag && (
          <Badge variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
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