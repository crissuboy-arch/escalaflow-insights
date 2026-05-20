import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  Play,
  RefreshCw,
  Copy,
  Eye,
  Search,
  ShieldCheck,
  Megaphone,
  CalendarDays,
  Rocket,
  ListChecks,
  FileText,
} from "lucide-react";
import {
  runAgent,
  listOutputs,
  listScores,
  listTimeline,
  listTasks,
  upsertTask,
  deleteTask,
} from "@/lib/agents.functions";

type AgentKey =
  | "minerador"
  | "analista"
  | "campanha"
  | "conteudo"
  | "escala"
  | "operacional"
  | "relatorio";

const DECK: Array<{
  key: AgentKey;
  title: string;
  desc: string;
  Icon: typeof Search;
}> = [
  { key: "minerador", title: "Minerar Mercado", desc: "Concorrentes, hooks, VSLs e ofertas escaladas.", Icon: Search },
  { key: "analista", title: "Analisar Oferta", desc: "Promessa, dor, mecanismo, CTA e scores 0–100.", Icon: ShieldCheck },
  { key: "campanha", title: "Criar Campanha", desc: "Meta, Google e Instagram com públicos e copies.", Icon: Megaphone },
  { key: "conteudo", title: "Criar Conteúdo", desc: "Calendário 14d, hooks virais e carrosséis.", Icon: CalendarDays },
  { key: "escala", title: "Plano de Escala", desc: "D3 / D7 / D14, KPIs e gatilhos de escala.", Icon: Rocket },
  { key: "operacional", title: "Criar Tarefas", desc: "Checklist automático com prioridades.", Icon: ListChecks },
  { key: "relatorio", title: "Relatório Final", desc: "Consolidação estratégica completa.", Icon: FileText },
];

type Output = {
  id: string;
  agent: string;
  status: string;
  payload: Record<string, unknown>;
  error: string | null;
  created_at: string;
};
type Score = {
  id: string;
  dimension: string;
  value: number;
  strengths: string[];
  weaknesses: string[];
  fixes: string[];
  next_action: string;
  created_at: string;
};
type TimelineEvt = { id: string; event_type: string; summary: string; created_at: string };
type Task = { id: string; title: string; description: string | null; status: string; order_index: number };

export function AgentDeck({ projectId }: { projectId: string }) {
  const run = useServerFn(runAgent);
  const fetchOutputs = useServerFn(listOutputs);
  const fetchScores = useServerFn(listScores);
  const fetchTimeline = useServerFn(listTimeline);
  const fetchTasks = useServerFn(listTasks);
  const saveTask = useServerFn(upsertTask);
  const removeTask = useServerFn(deleteTask);

  const [outputs, setOutputs] = useState<Output[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvt[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState<AgentKey | null>(null);
  const [viewing, setViewing] = useState<Output | null>(null);
  const [extra, setExtra] = useState<Record<AgentKey, string>>(
    {} as Record<AgentKey, string>,
  );

  async function refresh() {
    try {
      const [o, s, t, tk] = await Promise.all([
        fetchOutputs({ data: { projectId } }),
        fetchScores({ data: { projectId } }),
        fetchTimeline({ data: { projectId } }),
        fetchTasks({ data: { projectId } }),
      ]);
      setOutputs(o as Output[]);
      setScores(s as Score[]);
      setTimeline(t as TimelineEvt[]);
      setTasks(tk as Task[]);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function execute(agent: AgentKey) {
    setBusy(agent);
    try {
      await run({ data: { projectId, agent, extra: extra[agent] } });
      toast.success(`${DECK.find((d) => d.key === agent)?.title} concluído`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na execução");
    } finally {
      setBusy(null);
    }
  }

  function latestFor(agent: AgentKey): Output | null {
    return outputs.find((o) => o.agent === agent) ?? null;
  }

  function statusBadge(o: Output | null) {
    if (!o) return <Badge variant="secondary">pendente</Badge>;
    if (o.status === "processing")
      return (
        <Badge variant="secondary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> processando
        </Badge>
      );
    if (o.status === "error") return <Badge variant="destructive">erro</Badge>;
    return <Badge>concluído</Badge>;
  }

  // Latest score per dimension
  const latestScores = ["oferta", "copy", "criativo", "funil", "escala"].map((dim) => {
    return scores.find((s) => s.dimension === dim) ?? null;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DECK.map(({ key, title, desc, Icon }) => {
          const last = latestFor(key);
          return (
            <Card key={key} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{title}</p>
                      {statusBadge(last)}
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Textarea
                  placeholder="Contexto extra (opcional)"
                  className="min-h-[60px] text-xs"
                  value={extra[key] ?? ""}
                  onChange={(e) =>
                    setExtra((p) => ({ ...p, [key]: e.target.value }))
                  }
                />
                {last?.error ? (
                  <p className="text-xs text-destructive">{last.error}</p>
                ) : last && last.status === "done" ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {previewPayload(last.payload)}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => execute(key)} disabled={busy === key}>
                    {busy === key ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : last ? (
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Play className="mr-1 h-3.5 w-3.5" />
                    )}
                    {last ? "Regenerar" : "Executar"}
                  </Button>
                  {last && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewing(last)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> Detalhes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(last.payload, null, 2),
                          );
                          toast.success("Copiado");
                        }}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Scores */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-3 font-semibold">Scores estratégicos</p>
          <div className="grid gap-3 md:grid-cols-5">
            {latestScores.map((s, i) => {
              const dim = ["oferta", "copy", "criativo", "funil", "escala"][i];
              return (
                <div key={dim} className="rounded-xl border border-border/60 p-3">
                  <p className="text-xs uppercase text-muted-foreground">{dim}</p>
                  <p className="mt-1 text-2xl font-bold">{s ? s.value : "—"}</p>
                  {s ? (
                    <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
                      {s.next_action}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Rode o Analista
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tasks + Timeline */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Tarefas</p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const title = prompt("Nova tarefa:");
                  if (!title) return;
                  await saveTask({
                    data: {
                      projectId,
                      title,
                      order_index: tasks.length,
                    },
                  });
                  refresh();
                }}
              >
                + Tarefa
              </Button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa. Rode o agente Operacional para gerar um checklist.
              </p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={t.status === "done"}
                      onChange={async (e) => {
                        await saveTask({
                          data: {
                            id: t.id,
                            projectId,
                            title: t.title,
                            description: t.description ?? undefined,
                            status: e.target.checked ? "done" : "todo",
                            order_index: t.order_index,
                          },
                        });
                        refresh();
                      }}
                    />
                    <span
                      className={
                        t.status === "done" ? "flex-1 line-through opacity-60" : "flex-1"
                      }
                    >
                      {t.title}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await removeTask({ data: { id: t.id } });
                        refresh();
                      }}
                    >
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="font-semibold">Timeline</p>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border/60 p-2 text-sm"
                  >
                    <p className="font-medium">{e.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.agent}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">
            {viewing ? JSON.stringify(viewing.payload, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function previewPayload(p: Record<string, unknown>): string {
  if (!p) return "";
  if (typeof p.summary === "string") return p.summary;
  if (typeof p.diagnosis === "string") return p.diagnosis;
  if (typeof p.promise === "string") return p.promise;
  const keys = Object.keys(p).slice(0, 4).join(", ");
  return `Campos: ${keys}`;
}