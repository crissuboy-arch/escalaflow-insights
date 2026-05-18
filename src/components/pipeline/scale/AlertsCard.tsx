import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Target, ArrowRight } from "lucide-react";

export function AlertsCard({
  alerts,
  improvements,
  bottleneck,
  nextSteps,
}: {
  alerts: string[];
  improvements: string[];
  bottleneck?: string;
  nextSteps: string[];
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold">Alertas críticos & próximos passos</p>
        {bottleneck && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase text-red-500">
              <Target className="h-3 w-3" /> Maior gargalo
            </div>
            <p className="text-sm">{bottleneck}</p>
          </div>
        )}
        {alerts.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase text-amber-500">
              <AlertTriangle className="h-3 w-3" /> Impedindo escala
            </div>
            <ul className="list-disc pl-5 text-sm">{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        {improvements.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground">Melhorias prioritárias</p>
            <ol className="mt-1 list-decimal pl-5 text-sm">{improvements.map((it, i) => <li key={i}>{it}</li>)}</ol>
          </div>
        )}
        {nextSteps.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground">Próximos passos</p>
            <ul className="mt-1 space-y-1 text-sm">
              {nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-3 w-3 text-primary" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
