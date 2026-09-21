// Read-only view of a real intelligence_handoffs record, reached via the
// "Ver Projeto" action on TransformToProjectButton once a handoff is SENT.
// Lives inside the existing Projetos area (same route group as
// projetos.tsx / projetos.$id.tsx) — this is NOT a second projects area.
// ScalaFlow has no project_id linking a handoff to a row in `projects`
// today, so this page opens by handoff_id (the real, stable identifier
// already stored) instead of inventing one.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Sparkles, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { loadHandoffProjectFn, statusLabelForHandoff } from "@/lib/cris-os/transform.functions";

export const Route = createFileRoute("/_authenticated/projetos/handoff/$handoffId")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: HandoffProjectView,
});

type HandoffProject = Awaited<ReturnType<typeof loadHandoffProjectFn>>;

// Only the "Projeto criado" step is ever real today — the rest render as
// future/pending so the page never implies BusinessPlan, approval or
// execution work that hasn't happened.
const PIPELINE_STEPS = [
  "Projeto criado",
  "Plano pendente",
  "Aguardando aprovação",
  "Aprovado",
  "Em execução",
  "Concluído",
] as const;

function StatusPipeline({ status }: { status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED" }) {
  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" /> Erro no envio — nenhum projeto foi criado.
      </div>
    );
  }
  const activeIndex = status === "SENT" ? 0 : -1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PIPELINE_STEPS.map((step, i) => (
        <Badge
          key={step}
          variant={i === activeIndex ? "default" : "outline"}
          className={i === activeIndex ? "" : "text-muted-foreground opacity-60"}
        >
          {step}
        </Badge>
      ))}
    </div>
  );
}

function HandoffProjectView() {
  const { handoffId } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(loadHandoffProjectFn);
  const [data, setData] = useState<HandoffProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load({ data: { handoffId } })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ found: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || !data.found) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/projetos" } as never)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="space-y-2 p-6 text-center">
            <p className="text-sm font-medium">Referência não encontrada.</p>
            <p className="text-xs text-muted-foreground">
              Nenhum registro de handoff corresponde a este link. Ele pode ter sido removido ou o
              link está incorreto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { opportunity } = data;
  const statusLabel = statusLabelForHandoff(data.status);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/projetos" } as never)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Projeto a partir de oportunidade</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{opportunity?.title ?? "Oportunidade"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {opportunity?.platform ? <Badge variant="secondary">{opportunity.platform}</Badge> : null}
            {opportunity?.country ? <Badge variant="secondary">{opportunity.country}</Badge> : null}
            {opportunity?.niche ? <Badge variant="secondary">{opportunity.niche}</Badge> : null}
            {typeof opportunity?.score === "number" ? (
              <Badge variant="secondary">
                <TrendingUp className="mr-1 h-3 w-3" /> Score {opportunity.score}
              </Badge>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <p className="mb-2 text-sm font-medium">{statusLabel}</p>
            <StatusPipeline status={data.status} />
          </div>

          {data.lastError ? (
            <p className="text-xs text-destructive">Último erro: {data.lastError}</p>
          ) : null}

          <div className="grid gap-2 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Criado em{" "}
              {new Date(data.createdAt).toLocaleString("pt-BR")}
            </div>
            {data.sentAt ? (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Enviado em{" "}
                {new Date(data.sentAt).toLocaleString("pt-BR")}
              </div>
            ) : null}
            <div className="truncate">handoff_id: {data.handoffId}</div>
            <div className="truncate">
              referência: {data.sourceTable} / {data.sourceId}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
