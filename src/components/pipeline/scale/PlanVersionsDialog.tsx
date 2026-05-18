import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileDown, History, Loader2, RotateCcw } from "lucide-react";
import type { CampaignPlan } from "@/lib/scale.server";
import { restoreScaleVersion } from "@/lib/scale.functions";
import { diffKpis, diffLines } from "@/lib/scale/diff";
import { exportElementToPdf } from "@/lib/scale/pdf";

export type PlanVersion = {
  at: string;
  plan: CampaignPlan;
  input?: Record<string, unknown>;
};

export function PlanVersionsDialog({
  open,
  onOpenChange,
  projectId,
  versions,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId?: string;
  versions: PlanVersion[];
  onRestored?: (plan: CampaignPlan) => void;
}) {
  const restore = useServerFn(restoreScaleVersion);
  const reportRef = useRef<HTMLDivElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Defaults: A = latest, B = previous (so deltas read "evolução de A → B").
  // versions[0] is the most recent (push-front in scale.functions).
  const [aIdx, setAIdx] = useState(versions.length > 1 ? 1 : 0);
  const [bIdx, setBIdx] = useState(0);

  const a = versions[aIdx];
  const b = versions[bIdx];

  const kpis = useMemo(
    () => (a && b ? diffKpis(a.plan.expectedKpis as Record<string, unknown>, b.plan.expectedKpis as Record<string, unknown>) : []),
    [a, b],
  );

  if (versions.length < 2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comparar versões</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Gere pelo menos mais uma versão do plano para começar a comparar.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  async function restoreB() {
    if (!projectId || !b) return;
    setRestoring(true);
    try {
      await restore({ data: { projectId, index: bIdx } });
      toast.success("Versão restaurada");
      onRestored?.(b.plan);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar versão");
    } finally {
      setRestoring(false);
    }
  }

  async function exportPdf() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(reportRef.current, "comparacao-versoes.pdf");
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Comparar versões do plano
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <VersionPicker label="Versão A (base)" versions={versions} value={aIdx} onChange={setAIdx} />
          <VersionPicker label="Versão B (comparar)" versions={versions} value={bIdx} onChange={setBIdx} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Exportar comparação
          </Button>
          {projectId && (
            <Button size="sm" onClick={restoreB} disabled={restoring}>
              {restoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Restaurar versão B
            </Button>
          )}
        </div>

        <div ref={reportRef} className="space-y-4">
          <KpiSection kpis={kpis} aLabel={labelOf(versions, aIdx)} bLabel={labelOf(versions, bIdx)} />
          <DaysSection a={a.plan} b={b.plan} />
          <ListsSection a={a.plan} b={b.plan} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function labelOf(versions: PlanVersion[], idx: number) {
  const v = versions[idx];
  if (!v) return "—";
  const n = versions.length - idx; // versions[0] = mais recente
  const d = new Date(v.at);
  const dd = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `v${n} · ${dd}`;
}

function VersionPicker({
  label,
  versions,
  value,
  onChange,
}: {
  label: string;
  versions: PlanVersion[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {versions.map((_, i) => (
            <SelectItem key={i} value={String(i)}>
              {labelOf(versions, i)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiSection({
  kpis,
  aLabel,
  bLabel,
}: {
  kpis: ReturnType<typeof diffKpis>;
  aLabel: string;
  bLabel: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">KPIs esperados</p>
          <p className="text-xs text-muted-foreground">
            {aLabel} <ArrowRight className="inline h-3 w-3" /> {bLabel}
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.key} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">{k.label}</p>
                {k.deltaPct != null && (
                  <Badge
                    variant="outline"
                    className={
                      k.tone === "good"
                        ? "border-emerald-500/40 text-emerald-500"
                        : k.tone === "bad"
                          ? "border-rose-500/40 text-rose-500"
                          : ""
                    }
                  >
                    {k.deltaPct > 0 ? "+" : ""}
                    {k.deltaPct.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{k.a}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{k.b}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DaysSection({ a, b }: { a: CampaignPlan; b: CampaignPlan }) {
  const days: Array<[string, string, string]> = [
    ["Dia 1", a.day1 ?? "", b.day1 ?? ""],
    ["Dia 2", a.day2 ?? "", b.day2 ?? ""],
    ["Dia 3", a.day3 ?? "", b.day3 ?? ""],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {days.map(([label, av, bv]) => (
        <DayDiff key={label} label={label} a={av} b={bv} />
      ))}
    </div>
  );
}

function splitLines(s: string): string[] {
  return s
    .split(/\n|•|–|—|;|\.|\u2022/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function DayDiff({ label, a, b }: { label: string; a: string; b: string }) {
  const diff = useMemo(() => diffLines(splitLines(a), splitLines(b)), [a, b]);
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-semibold">{label}</p>
        <ul className="space-y-1 text-xs">
          {diff.same.map((s, i) => (
            <li key={`s-${i}`} className="text-foreground">
              · {s}
            </li>
          ))}
          {diff.removed.map((s, i) => (
            <li key={`r-${i}`} className="text-rose-500 line-through">
              − {s}
            </li>
          ))}
          {diff.added.map((s, i) => (
            <li key={`a-${i}`} className="text-emerald-500">
              + {s}
            </li>
          ))}
          {diff.same.length + diff.added.length + diff.removed.length === 0 && (
            <li className="text-muted-foreground">—</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function ListsSection({ a, b }: { a: CampaignPlan; b: CampaignPlan }) {
  const sections: Array<{ title: string; aArr: string[]; bArr: string[] }> = [
    { title: "Hooks", aArr: a.hooks ?? [], bArr: b.hooks ?? [] },
    { title: "Ângulos de copy", aArr: a.copyAngles ?? [], bArr: b.copyAngles ?? [] },
    {
      title: "Criativos",
      aArr: (a.creatives ?? []).map((c) => `${c.format} — ${c.angle}`),
      bArr: (b.creatives ?? []).map((c) => `${c.format} — ${c.angle}`),
    },
    {
      title: "Alertas críticos",
      aArr: a.criticalAlerts?.alerts ?? [],
      bArr: b.criticalAlerts?.alerts ?? [],
    },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sections.map((s) => {
        const d = diffLines(s.aArr, s.bArr);
        return (
          <Card key={s.title}>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold">{s.title}</p>
              <ul className="space-y-1 text-xs">
                {d.same.map((x, i) => (
                  <li key={`s-${i}`}>· {x}</li>
                ))}
                {d.removed.map((x, i) => (
                  <li key={`r-${i}`} className="text-rose-500 line-through">
                    − {x}
                  </li>
                ))}
                {d.added.map((x, i) => (
                  <li key={`a-${i}`} className="text-emerald-500">
                    + {x}
                  </li>
                ))}
                {d.same.length + d.added.length + d.removed.length === 0 && (
                  <li className="text-muted-foreground">—</li>
                )}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}