import { Card, CardContent } from "@/components/ui/card";
import type { FullDiagnosis } from "@/lib/scale.server";
import { DiagnosisCard } from "./DiagnosisCard";
import { ScoreChip } from "./ScoreChip";
import { AlertsCard } from "./AlertsCard";

export function FullDiagnosisResult({ diagnosis }: { diagnosis: FullDiagnosis }) {
  const s = diagnosis.scores;
  const scoreEntries: Array<[string, { value: number; color: string; reason: string }]> = [
    ["Oferta", s.offer],
    ["Criativo", s.creative],
    ["Copy", s.copy],
    ["Funil", s.funnel],
    ["Página", s.page],
    ["Escala", s.scale],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="text-xs uppercase text-muted-foreground">Diagnóstico Completo</p>
          <p className="text-base">{diagnosis.strategicSummary || "—"}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {scoreEntries.map(([label, v]) => (
          <ScoreChip key={label} label={label} value={v.value} color={v.color} reason={v.reason} />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DiagnosisCard
          title="Diagnóstico Visual"
          score={diagnosis.visualDiagnosis.score}
          scoreColor={diagnosis.visualDiagnosis.scoreColor}
          lists={[
            { label: "Pontos fortes", items: diagnosis.visualDiagnosis.strengths, tone: "good" },
            { label: "Pontos fracos", items: diagnosis.visualDiagnosis.weaknesses, tone: "bad" },
            { label: "Reduz conversão", items: diagnosis.visualDiagnosis.reducesConversion, tone: "bad" },
            { label: "Aumenta confiança", items: diagnosis.visualDiagnosis.increasesTrust, tone: "good" },
          ]}
        />
        <DiagnosisCard
          title="Diagnóstico da Oferta"
          verdict={diagnosis.offerDiagnosis.verdict}
          score={diagnosis.offerDiagnosis.score}
          scoreColor={diagnosis.offerDiagnosis.scoreColor}
          bullets={[
            { label: "Promessa", value: diagnosis.offerDiagnosis.promiseLevel },
            { label: "Mecanismo", value: diagnosis.offerDiagnosis.mechanismStrength },
            { label: "Transformação", value: diagnosis.offerDiagnosis.transformationClarity },
            { label: "Valor percebido", value: diagnosis.offerDiagnosis.perceivedValue },
            { label: "Risco percebido", value: diagnosis.offerDiagnosis.perceivedRisk },
            { label: "Potencial viral", value: diagnosis.offerDiagnosis.viralPotential },
            { label: "Saturação", value: diagnosis.offerDiagnosis.saturationLevel },
          ]}
        />
      </div>

      <AlertsCard
        alerts={diagnosis.criticalAlerts.alerts}
        improvements={diagnosis.criticalAlerts.priorityImprovements}
        bottleneck={diagnosis.criticalAlerts.biggestBottleneck}
        nextSteps={diagnosis.criticalAlerts.nextSteps}
      />
    </div>
  );
}
