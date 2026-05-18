import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Sparkles, AlertTriangle, TrendingUp, X } from "lucide-react";
import { analyzeAdsPerformance } from "@/lib/scale.functions";
import type { CampaignPlan, NextTests, ScaleAnalysis, ScalePlan } from "@/lib/scale.server";
import { CampaignPlanForm } from "./scale/CampaignPlanForm";
import { CampaignPlanResult } from "./scale/CampaignPlanResult";
import { NextStepsPanel } from "./scale/NextStepsPanel";
import { SaveToProjectButton } from "./SaveToProjectButton";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function ScaleAnalyzer({
  projectId,
  initial,
  initialPlan,
  initialNextTests,
  initialScalePlan,
  onSaved,
}: {
  projectId?: string;
  initial?: ScaleAnalysis | null;
  initialPlan?: CampaignPlan | null;
  initialNextTests?: NextTests | null;
  initialScalePlan?: ScalePlan | null;
  onSaved?: (a: ScaleAnalysis) => void;
}) {
  const [plan, setPlan] = useState<CampaignPlan | null>(initialPlan ?? null);
  const [analysis, setAnalysis] = useState<ScaleAnalysis | null>(initial ?? null);

  return (
    <Tabs defaultValue="plan" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="plan">Plano</TabsTrigger>
        <TabsTrigger value="metrics">Métricas</TabsTrigger>
        <TabsTrigger value="next">Próximos passos</TabsTrigger>
      </TabsList>

      <TabsContent value="plan" className="space-y-4">
        <CampaignPlanForm projectId={projectId} onPlan={setPlan} />
        {plan && (
          <>
            <CampaignPlanResult plan={plan} />
            {!projectId && (
              <div className="flex justify-end">
                <SaveToProjectButton kind="escala" payload={{ plan }} defaultTitle={plan.campaignName || "Plano de tráfego"} />
              </div>
            )}
          </>
        )}
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

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Imagem > 5 MB."); return; }
    setImageDataUrl(await fileToDataUrl(f));
  }

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

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex">
              <input type="file" accept="image/*" hidden onChange={onPickFile} />
              <Button asChild variant="outline" size="sm"><span><Upload className="mr-2 h-4 w-4" /> Upload screenshot</span></Button>
            </label>
            {imageDataUrl && (
              <div className="relative">
                <img src={imageDataUrl} alt="" className="h-16 w-28 rounded border border-border/60 object-cover" />
                <button className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground" onClick={() => setImageDataUrl(null)}><X className="h-3 w-3" /></button>
              </div>
            )}
            <div className="flex-1" />
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
