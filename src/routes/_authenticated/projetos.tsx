import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Flame, BookOpen, Sparkles, Trash2, Copy, ArrowRight, Rocket, Eye, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createProject,
  listProjects,
  deleteProject,
  duplicateProject,
  updateProject,
  type ProjectMode,
} from "@/lib/project.functions";
import {
  listSentHandoffProjectsFn,
  toHandoffProjectListItem,
  type HandoffProjectListItem,
} from "@/lib/cris-os/transform.functions";

export const Route = createFileRoute("/_authenticated/projetos")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    novo: s.novo === 1 || s.novo === "1" ? 1 : undefined,
    tab: typeof s.tab === "string" ? (s.tab as string) : undefined,
  }),
  component: ProjectsHubPage,
});

const CATEGORIES = [
  "Amazon/KDP",
  "Low Ticket",
  "Emagrecimento",
  "Romance",
  "Infantil",
  "Negócios",
  "Desenvolvimento Pessoal",
  "PLR",
  "Apostila",
  "Playbook",
] as const;

const MODE_LABEL: Record<string, string> = {
  pdf: "Ebook PDF",
  premium: "Ebook Premium",
  kdp: "Amazon KDP",
  playbook: "Playbook",
  combo: "Combo",
};

const STATUS_OPTIONS = [
  "draft",
  "em_analise",
  "pausado",
  "escalando",
  "vencedor",
  "arquivado",
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  ready: "Pronto",
  published: "Publicado",
  em_analise: "Em análise",
  pausado: "Pausado",
  escalando: "Escalando",
  vencedor: "Vencedor",
  arquivado: "Arquivado",
};

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  em_analise: "secondary",
  pausado: "outline",
  escalando: "default",
  vencedor: "default",
  arquivado: "outline",
};

const STATUS_CLASS: Record<string, string> = {
  escalando: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  vencedor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  arquivado: "bg-muted text-muted-foreground",
  em_analise: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  pausado: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

type Row = {
  id: string;
  title: string;
  niche: string | null;
  mode: string;
  status: string;
  step: number;
  cover_url: string | null;
  ebook_id: string | null;
  playbook_id: string | null;
  updated_at: string;
  meta?: Record<string, unknown> | null;
};

// Determines the next incomplete pipeline tab for a project.
// Flow: Ebook → Playbook → Copy → Criativos → Página → Checkout → Escala
function getNextTab(r: Row): string {
  const meta = (r.meta ?? {}) as Record<string, unknown>;
  if (!r.ebook_id) return "ebook";
  if (!r.playbook_id) return "playbook";
  if (!meta.copy) return "copy";
  if (!Array.isArray(meta.creatives) || (meta.creatives as unknown[]).length === 0)
    return "criativos";
  if (!meta.salesPage) return "pagina";
  if (!meta.checkout) return "checkout";
  return "escala";
}

function ProjectsHubPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { novo?: 1; tab?: string };
  const list = useServerFn(listProjects);
  const listHandoffProjects = useServerFn(listSentHandoffProjectsFn);
  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);
  const dup = useServerFn(duplicateProject);
  const update = useServerFn(updateProject);
  const [rows, setRows] = useState<Row[]>([]);
  const [handoffItems, setHandoffItems] = useState<HandoffProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<string>("Amazon/KDP");
  const [mode, setMode] = useState<ProjectMode>("combo");
  const [ai, setAi] = useState({
    niche: "",
    promise: "",
    audience: "",
    chapterCount: 6,
    language: "Português",
  });

  const refresh = async () => {
    try {
      const data = await list();
      setRows((data ?? []) as unknown as Row[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  // Handoff-derived opportunities (Inteligência de Mercado) are a separate,
  // read-only source — never mixed into the legacy `projects` fetch/update
  // logic above, and never sent/re-sent from this listing.
  const refreshHandoffProjects = async () => {
    try {
      const views = await listHandoffProjects();
      setHandoffItems((views ?? []).map(toHandoffProjectListItem));
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    refresh();
    refreshHandoffProjects();
  }, []);

  async function startScratch() {
    setBusy(true);
    try {
      const { id } = await create({
        data: {
          source: "scratch",
          mode,
          title: `Projeto ${category}`,
          category,
        },
      });
      navigate({
        to: "/projetos/$id",
        params: { id },
        search: search.tab ? ({ tab: search.tab } as never) : (undefined as never),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar projeto");
    } finally {
      setBusy(false);
    }
  }

  async function startAi() {
    if (!ai.niche || !ai.promise) {
      toast.error("Preencha nicho e promessa");
      return;
    }
    setBusy(true);
    try {
      const { id } = await create({
        data: { source: "ai", mode, kickstart: ai },
      });
      navigate({
        to: "/projetos/$id",
        params: { id },
        search: search.tab ? ({ tab: search.tab } as never) : (undefined as never),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar projeto");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir projeto?")) return;
    await remove({ data: { id } });
    toast.success("Projeto excluído");
    refresh();
  }

  async function onDuplicate(id: string) {
    try {
      const r = await dup({ data: { id } });
      toast.success("Projeto duplicado");
      navigate({ to: "/projetos/$id", params: { id: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao duplicar");
    }
  }

  async function onChangeStatus(id: string, status: string) {
    // Optimistic UI update so the badge reacts immediately.
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await update({ data: { id, patch: { status: status as never } } });
      toast.success("Status atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar status");
      refresh();
    }
  }

  // Auto-trigger creation when arriving with ?novo=1
  const autoTriggered = useState({ done: false })[0];
  useEffect(() => {
    if (search.novo === 1 && !autoTriggered.done && !busy) {
      autoTriggered.done = true;
      startScratch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.novo]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Briefing → Ebook → Playbook → Exportar, em um só fluxo.
          </p>
        </div>
        <Link to="/produtos/ebook">
          <Button variant="outline" size="sm">
            Editor antigo
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground">Modo</span>
        {(Object.keys(MODE_LABEL) as ProjectMode[]).map((m) => (
          <Badge
            key={m}
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
            className="cursor-pointer"
          >
            {MODE_LABEL[m]}
          </Badge>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 lg:grid-cols-3"
      >
        <Card className="flex flex-col border-primary/30">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Criar com Oferta Minerada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Selecione um anúncio validado da sua mineração e a IA extrai briefing + estrutura.
            </p>
            <Link to="/ofertas-salvas">
              <Button className="w-full" disabled={busy}>
                Escolher anúncio
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Criar do Zero</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Badge
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  onClick={() => setCategory(c)}
                  className="cursor-pointer"
                >
                  {c}
                </Badge>
              ))}
            </div>
            <Button onClick={startScratch} disabled={busy} variant="secondary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Começar do Zero"}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-primary/30">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Criar com IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-xs">Nicho</Label>
              <Input
                value={ai.niche}
                onChange={(e) => setAi({ ...ai, niche: e.target.value })}
                placeholder="Ex: emagrecimento"
              />
            </div>
            <div>
              <Label className="text-xs">Promessa</Label>
              <Textarea
                rows={2}
                value={ai.promise}
                onChange={(e) => setAi({ ...ai, promise: e.target.value })}
                placeholder="Resultado principal"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Público</Label>
                <Input
                  value={ai.audience}
                  onChange={(e) => setAi({ ...ai, audience: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Capítulos</Label>
                <Input
                  type="number"
                  min={3}
                  max={15}
                  value={ai.chapterCount}
                  onChange={(e) =>
                    setAi({
                      ...ai,
                      chapterCount: Math.max(3, Math.min(15, Number(e.target.value) || 6)),
                    })
                  }
                />
              </div>
            </div>
            <Button onClick={startAi} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar com IA"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Continuar onde parou</h2>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rows.length === 0 && handoffItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {handoffItems.map((item) => (
              <HandoffProjectCard key={item.handoffId} item={item} />
            ))}
            {rows.map((r) => {
              const scale = (r.meta?.scale ?? {}) as Record<string, unknown>;
              const hasStrategy = !!(scale.plan || scale.fullDiagnosis);
              const lastInputCountries = (scale.lastPlanInput as Record<string, unknown> | undefined)?.countries as string[] | undefined;
              const country = (r.meta?.country as string) || lastInputCountries?.[0];
              const updated = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—";
              const statusTone = STATUS_TONE[r.status] ?? "outline";
              return (
                <Card key={r.id} className="overflow-hidden">
                  {r.cover_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img src={r.cover_url} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/projetos/$id"
                          params={{ id: r.id }}
                          className="line-clamp-1 font-semibold hover:underline"
                        >
                          {r.title}
                        </Link>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {r.niche ?? "—"} {country ? `· ${country}` : ""} · {updated}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{MODE_LABEL[r.mode] ?? r.mode}</Badge>
                      {r.ebook_id ? <Badge variant="outline">Ebook ✓</Badge> : null}
                      {r.playbook_id ? <Badge variant="outline">Playbook ✓</Badge> : null}
                      {hasStrategy ? <Badge variant="outline">Estratégia ✓</Badge> : null}
                      <Badge className={STATUS_CLASS[r.status] ?? ""} variant={statusTone}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <Select value={r.status} onValueChange={(v) => onChangeStatus(r.id, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: "/projetos/$id",
                            params: { id: r.id },
                            search: { tab: getNextTab(r) } as never,
                          })
                        }
                      >
                        <ArrowRight className="mr-1 h-3.5 w-3.5" /> Continuar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate({ to: "/projetos/$id", params: { id: r.id }, search: { tab: "escala" } as never })}
                      >
                        <Rocket className="mr-1 h-3.5 w-3.5" /> Abrir estratégia
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDuplicate(r.id)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Handoff-derived "project" (Inteligência de Mercado) — deliberately a
// separate, simpler card. It never renders the legacy status Select or the
// "Continuar"/"Abrir estratégia" actions (those assume a real `projects`
// row with ebook/playbook/scale state that a handoff does not have), and it
// only ever navigates by THIS item's own handoff_id — never a shared or
// first-match lookup, so two different handoffs can never bleed together.
function HandoffProjectCard({ item }: { item: HandoffProjectListItem }) {
  const navigate = useNavigate();
  const open = () =>
    navigate({ to: "/projetos/handoff/$handoffId", params: { handoffId: item.handoffId } } as never);
  return (
    <Card className="overflow-hidden border-primary/30 cursor-pointer" onClick={open}>
      <CardContent className="space-y-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 font-semibold">{item.title}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {item.niche ?? "—"} {item.country ? `· ${item.country}` : ""} ·{" "}
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge>Inteligência de Mercado</Badge>
          {item.platform ? <Badge variant="secondary">{item.platform}</Badge> : null}
          {typeof item.score === "number" ? (
            <Badge variant="secondary">
              <TrendingUp className="mr-1 h-3 w-3" /> Score {item.score}
            </Badge>
          ) : null}
          <Badge variant="outline">Aguardando planejamento</Badge>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          <Eye className="mr-1 h-3.5 w-3.5" /> Ver Projeto
        </Button>
      </CardContent>
    </Card>
  );
}