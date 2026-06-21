import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Rocket, ArrowRight } from "lucide-react";
import { analyzeOfferFn, listLaunchAnalysesFn } from "@/lib/launchAnalyzer.functions";

export const Route = createFileRoute("/_authenticated/launch-analyzer")({
  component: LaunchAnalyzerPage,
});

type AnalysisRow = {
  id: string;
  title: string;
  status: string;
  language: string | null;
  created_at: string;
  updated_at: string;
  score: number | null;
};

function scoreColor(score: number | null): string {
  if (score == null) return "border-border text-muted-foreground";
  if (score >= 70) return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
  if (score >= 50) return "border-amber-500/40 text-amber-400 bg-amber-500/10";
  return "border-red-500/40 text-red-400 bg-red-500/10";
}

function LaunchAnalyzerPage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeOfferFn);
  const listFn = useServerFn(listLaunchAnalysesFn);

  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listFn()
      .then((d) => setRows((d ?? []) as unknown as AnalysisRow[]))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAnalyze() {
    const clean = url.trim();
    if (!clean) {
      toast.error("Cole a URL da página de vendas.");
      return;
    }
    setBusy(true);
    try {
      const { projectId } = await analyze({ data: { url: clean } });
      toast.success("Análise concluída!");
      navigate({ to: "/launch-analyzer/$id", params: { id: projectId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar a página.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Rocket className="h-6 w-6 text-primary" /> Launch Analyzer
        </h1>
        <p className="text-sm text-muted-foreground">
          Cole a URL de uma página de vendas e a IA diagnostica a oferta, calcula o potencial de
          escala e gera a campanha pronta para Meta Ads.
        </p>
      </div>

      {/* Campo de URL */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && handleAnalyze()}
            placeholder="https://pagina-de-vendas.com"
            className="flex-1"
            disabled={busy}
          />
          <Button onClick={handleAnalyze} disabled={busy} className="shrink-0">
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-1.5 h-4 w-4" />
            )}
            Analisar com IA
          </Button>
        </CardContent>
      </Card>

      {/* Lista de análises anteriores */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Análises anteriores
        </h2>
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma análise ainda. Cole uma URL acima para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate({ to: "/launch-analyzer/$id", params: { id: r.id } })}
                className="group text-left"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-base font-bold ${scoreColor(
                          r.score,
                        )}`}
                      >
                        {r.score ?? "—"}
                      </span>
                      {r.language && (
                        <Badge variant="outline" className="uppercase">
                          {r.language}
                        </Badge>
                      )}
                    </div>
                    <div className="line-clamp-2 flex-1 font-medium">{r.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(r.updated_at).toLocaleDateString()}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
