import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Beaker, Rocket, AlertTriangle } from "lucide-react";
import { generateNextTests, generateScalePlan } from "@/lib/scale.functions";
import type { CampaignPlan, NextTests, ScaleAnalysis, ScalePlan } from "@/lib/scale.server";

export function NextStepsPanel({
  projectId,
  plan,
  analysis,
  initialTests,
  initialScalePlan,
}: {
  projectId?: string;
  plan: CampaignPlan | null;
  analysis: ScaleAnalysis | null;
  initialTests?: NextTests | null;
  initialScalePlan?: ScalePlan | null;
}) {
  const runTests = useServerFn(generateNextTests);
  const runScale = useServerFn(generateScalePlan);
  const [notes, setNotes] = useState("");
  const [busyT, setBusyT] = useState(false);
  const [busyS, setBusyS] = useState(false);
  const [tests, setTests] = useState<NextTests | null>(initialTests ?? null);
  const [scalePlan, setScalePlan] = useState<ScalePlan | null>(initialScalePlan ?? null);

  async function genTests() {
    setBusyT(true);
    try {
      const r = await runTests({ data: { projectId, plan: plan ?? undefined, analysis: analysis ?? undefined, notes: notes || undefined } });
      setTests(r.nextTests);
      toast.success("Testes gerados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusyT(false);
    }
  }
  async function genScale() {
    setBusyS(true);
    try {
      const r = await runScale({ data: { projectId, plan: plan ?? undefined, analysis: analysis ?? undefined, notes: notes || undefined } });
      setScalePlan(r.scalePlan);
      toast.success("Plano de escala gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusyS(false);
    }
  }

  const noContext = !plan && !analysis;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="font-semibold">Próximos passos</p>
            <p className="text-xs text-muted-foreground">
              Use o plano atual e/ou a última análise para gerar testes priorizados ou um plano de escala concreto dos próximos 3 dias.
            </p>
          </div>
          {noContext && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Gere primeiro um plano ou uma análise para resultados melhores.
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Notas (opcional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: hoje rodei R$200, melhor anúncio foi o reels..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={genTests} disabled={busyT}>
              {busyT ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Beaker className="mr-2 h-4 w-4" />}
              Gerar Próximos Testes
            </Button>
            <Button onClick={genScale} disabled={busyS} variant="secondary">
              {busyS ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              Gerar Plano de Escala
            </Button>
          </div>
        </CardContent>
      </Card>

      {tests && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">Testes priorizados</p>
            {tests.tests.map((t, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">Hipótese: {t.hypothesis}</p>
                <p className="mt-1 text-xs">Como fazer: {t.howTo}</p>
                <p className="mt-1 text-xs">Budget: {t.budget} · Sucesso: {t.successMetric}</p>
              </div>
            ))}
            {tests.notes && <p className="text-xs text-muted-foreground">{tests.notes}</p>}
          </CardContent>
        </Card>
      )}

      {scalePlan && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">Plano de escala</p>
            <p className="text-sm">{scalePlan.summary}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionList title="Pausar" items={scalePlan.pause} />
              <ActionList title="Duplicar" items={scalePlan.duplicate} />
              <ActionList title="Escalar" items={scalePlan.scale} />
              <ActionList title="Trocar criativo" items={scalePlan.swapCreative} />
              <ActionList title="Ajustar público" items={scalePlan.adjustAudience} />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Próximos 3 dias</p>
              <p className="text-sm"><strong>Dia 1:</strong> {scalePlan.next3Days.day1 || "—"}</p>
              <p className="text-sm"><strong>Dia 2:</strong> {scalePlan.next3Days.day2 || "—"}</p>
              <p className="text-sm"><strong>Dia 3:</strong> {scalePlan.next3Days.day3 || "—"}</p>
            </div>
            {scalePlan.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2">
                <ul className="list-disc pl-5 text-xs">{scalePlan.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActionList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded border border-border/60 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}