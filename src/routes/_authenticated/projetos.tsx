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
import { Loader2, Flame, BookOpen, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createProject,
  listProjects,
  deleteProject,
  type ProjectMode,
} from "@/lib/project.functions";

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
};

function ProjectsHubPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { novo?: 1; tab?: string };
  const list = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);
  const [rows, setRows] = useState<Row[]>([]);
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
    }
  };
  useEffect(() => {
    refresh();
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
    refresh();
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
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <Card key={r.id} className="overflow-hidden">
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
                        {r.niche ?? "—"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(r.id)}
                      className="h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{MODE_LABEL[r.mode] ?? r.mode}</Badge>
                    {r.ebook_id ? <Badge variant="outline">Ebook ✓</Badge> : null}
                    {r.playbook_id ? <Badge variant="outline">Playbook ✓</Badge> : null}
                    <Badge variant="outline">{r.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}