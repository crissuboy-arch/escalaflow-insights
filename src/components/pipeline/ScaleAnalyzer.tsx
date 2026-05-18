import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, AlertTriangle, TrendingUp, FileDown } from "lucide-react";
import { analyzeAdsPerformance } from "@/lib/scale.functions";
import type { CampaignPlan, FullDiagnosis, NextTests, ScaleAnalysis, ScalePlan } from "@/lib/scale.server";
import { CampaignPlanForm } from "./scale/CampaignPlanForm";
import { CampaignPlanResult } from "./scale/CampaignPlanResult";
import { FullDiagnosisResult } from "./scale/FullDiagnosisResult";
import { NextStepsPanel } from "./scale/NextStepsPanel";
import { ImageUploader } from "./scale/ImageUploader";
import { SaveToProjectButton } from "./SaveToProjectButton";
import { exportElementToPdf } from "@/lib/scale/pdf";

export function ScaleAnalyzer({
  projectId,
  initial,
  initialPlan,
  initialNextTests,
  initialScalePlan,
  initialDiagnosis,
  initialInput,
  initialImages,
  initialContext,
  onSaved,
}: {
  projectId?: string;
  initial?: ScaleAnalysis | null;
  initialPlan?: CampaignPlan | null;
  initialNextTests?: NextTests | null;
  initialScalePlan?: ScalePlan | null;
  initialDiagnosis?: FullDiagnosis | null;
  initialInput?: Record<string, unknown> | null;
  initialImages?: string[] | null;
  initialContext?: unknown | null;
  onSaved?: (a: ScaleAnalysis) => void;
}) {
  const [plan, setPlan] = useState<CampaignPlan | null>(initialPlan ?? null);
  const [analysis, setAnalysis] = useState<ScaleAnalysis | null>(initial ?? null);
  const [diagnosis, setDiagnosis] = useState<FullDiagnosis | null>(initialDiagnosis ?? null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function onExportPdf() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const name = `escala-${(plan?.campaignName || "diagnostico").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
      await exportElementToPdf(reportRef.current, name);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Tabs defaultValue="plan" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="plan">Plano</TabsTrigger>
        <TabsTrigger value="metrics">Métricas</TabsTrigger>
        <TabsTrigger value="next">Próximos passos</TabsTrigger>
      </TabsList>

      <TabsContent value="plan" className="space-y-4">
        <CampaignPlanForm
          projectId={projectId}
          onPlan={setPlan}
          onDiagnosis={setDiagnosis}
          initialInput={initialInput ?? null}
          initialImages={initialImages ?? null}
          initialContext={initialContext ?? null}
        />
        {(diagnosis || plan) && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onExportPdf} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Exportar PDF
            </Button>
            {!projectId && plan && (
              <SaveToProjectButton kind="escala" payload={{ plan }} defaultTitle={plan.campaignName || "Plano de tráfego"} />
            )}
          </div>
        )}
        <div ref={reportRef} className="space-y-4">
          {diagnosis && <FullDiagnosisResult diagnosis={diagnosis} />}
          {plan && <CampaignPlanResult plan={plan} />}
        </div>
      </TabsContent>

      <TabsContent value="metrics" className="space-y-4">
        <MetricsAnalyzerInner projectId={projectId} initial={analysis} onAnalysis={(a) => { setAnalysis(a); onSaved?.(a); }} />
      </TabsContent>

      <TabsContent value="next" className="space-y-4">
        <NextStepsPanel
          projectId={projectId}
          plan={plan}
          analysis={analysis}
          initialTests={initialNextTests ?? null}
          initialScalePlan={initialScalePlan ?? null}
        />
      </TabsContent>
    </Tabs>
  );
}

function MetricsAnalyzerInner({
  projectId,
  initial,
  onAnalysis,
}: {
  projectId?: string;
  initial: ScaleAnalysis | null;
  onAnalysis: (a: ScaleAnalysis) => void;
}) {
  const run = useServerFn(analyzeAdsPerformance);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    ctr: "", cpc: "", cpm: "", roas: "", frequencia: "", spend: "", daysRunning: "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<ScaleAnalysis | null>(initial);

  async function analyze() {
    setBusy(true);
    try {
      const r = await run({ data: { projectId, ...form, imageDataUrl: imageDataUrl ?? undefined } });
      setAnalysis(r.analysis);
      onAnalysis(r.analysis);
      toast.success("Análise gerada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  const recoTone = analysis?.scaleRecommendation === "escalar" ? "default" : analysis?.scaleRecommendation === "cortar" ? "destructive" : "secondary";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Analisar Métricas</p>
              <p className="text-xs text-muted-foreground">
                Suba um print do Gerenciador e/ou cole as métricas. A IA diagnostica, indica criativo vencedor e recomenda escala.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(["ctr","cpc","cpm","roas","frequencia","spend","daysRunning"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">{k}</Label>
                <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="h-9" />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Notas / dados colados</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>

          <ImageUploader
            value={imageDataUrl ? [imageDataUrl] : []}
            onChange={(arr) => setImageDataUrl(arr[0] ?? null)}
            maxFiles={1}
            label="Screenshot do Gerenciador"
          />

          <div className="flex justify-end">
            <Button onClick={analyze} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analisar Métricas
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Diagnóstico</p>
              <Badge variant={recoTone}>{analysis.scaleRecommendation.toUpperCase()}</Badge>
            </div>
            <p className="text-sm">{analysis.diagnosis}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Mini label="Criativo vencedor" value={analysis.winningCreative} />
              <Mini label="Ângulo vencedor" value={analysis.winningAngle} />
              <Mini label="Fadiga" value={analysis.fatigue} />
              <Mini label="Como executar" value={analysis.scaleNotes} />
            </div>
            {analysis.nextTests.length > 0 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Próximos testes</p>
                <ul className="mt-1 list-disc pl-5 text-sm">{analysis.nextTests.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            {analysis.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase text-amber-500"><AlertTriangle className="h-3 w-3" /> Alertas</div>
                <ul className="list-disc pl-5 text-sm">{analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
