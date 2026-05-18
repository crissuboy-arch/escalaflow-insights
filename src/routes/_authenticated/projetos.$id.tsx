import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  FileDown,
  Loader2,
  Sparkles,
  Wand2,
  PenLine,
  Megaphone,
  LayoutTemplate,
  ShoppingCart,
  Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  loadProject,
  updateProject,
  generateProjectEbook,
  generateProjectPlaybook,
} from "@/lib/project.functions";
import { CopyTab } from "@/components/pipeline/project/CopyTab";
import { SalesPageTab } from "@/components/pipeline/project/SalesPageTab";
import { CreativesTab } from "@/components/pipeline/project/CreativesTab";
import { CheckoutTab, type CheckoutDraft } from "@/components/pipeline/project/CheckoutTab";
import { EscalaTab } from "@/components/pipeline/project/EscalaTab";
import { AiHistoryTab } from "@/components/project/AiHistoryTab";
import type { SalesCopy } from "@/lib/copy.server";
import type { SalesPage } from "@/lib/sales-page.server";

export const Route = createFileRoute("/_authenticated/projetos/$id")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? (s.tab as string) : undefined,
  }),
  component: ProjectWorkspace,
});

type Briefing = {
  title?: string;
  subtitle?: string;
  niche?: string;
  promise?: string;
  avatar?: string;
  pains?: string[];
  desires?: string[];
  uniqueMechanism?: string;
};
type Project = {
  id: string;
  title: string;
  niche: string | null;
  mode: string;
  status: string;
  step: number;
  cover_url: string | null;
  ebook_id: string | null;
  playbook_id: string | null;
  briefing: Briefing;
  outline: Array<{ title: string; bullets: string[] }>;
  meta: Record<string, unknown>;
};

function ProjectWorkspace() {
  const { id } = Route.useParams();
  const search = Route.useSearch() as { tab?: string };
  const navigate = useNavigate();
  const load = useServerFn(loadProject);
  const update = useServerFn(updateProject);
  const genEbook = useServerFn(generateProjectEbook);
  const genPlaybook = useServerFn(generateProjectPlaybook);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "ebook" | "playbook" | "combo">(null);
  const TABS = [
    "briefing",
    "estrutura",
    "ebook",
    "playbook",
    "copy",
    "criativos",
    "pagina",
    "checkout",
    "escala",
    "exportar",
    "historico",
  ] as const;
  const initialTab =
    search.tab && (TABS as readonly string[]).includes(search.tab) ? search.tab : "briefing";
  const [tab, setTab] = useState<string>(initialTab);
  useEffect(() => {
    if (search.tab && (TABS as readonly string[]).includes(search.tab)) {
      setTab(search.tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab]);

  async function refresh() {
    try {
      const data = await load({ data: { id } });
      setProject(data as unknown as Project);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar projeto");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [id]);

  async function saveTitle(title: string) {
    if (!project) return;
    setProject({ ...project, title });
    try {
      await update({ data: { id, patch: { title } } });
    } catch {
      /* ignore */
    }
  }

  async function runEbook(mode: "kdp" | "premium" = "kdp") {
    setBusy("ebook");
    try {
      const r = await genEbook({ data: { id, mode } });
      toast.success("Ebook gerado!");
      await refresh();
      return r.ebookId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar ebook");
    } finally {
      setBusy(null);
    }
  }
  async function runPlaybook() {
    setBusy("playbook");
    try {
      const r = await genPlaybook({ data: { id } });
      toast.success("Playbook gerado!");
      await refresh();
      return r.playbookId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar playbook");
    } finally {
      setBusy(null);
    }
  }
  async function runCombo() {
    setBusy("combo");
    try {
      await Promise.all([
        genEbook({ data: { id, mode: "premium" } }),
        genPlaybook({ data: { id } }),
      ]);
      toast.success("Combo gerado!");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar combo");
    } finally {
      setBusy(null);
    }
  }

  if (loading || !project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const briefing = project.briefing ?? {};
  const outline = project.outline ?? [];
  const hasBriefing = !!briefing.title;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/projetos" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={project.title}
              onChange={(e) => saveTitle(e.target.value)}
              className="h-9 min-w-[280px] border-0 bg-transparent px-1 text-2xl font-bold focus-visible:ring-1"
            />
            <div className="ml-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary">{project.mode}</Badge>
              {project.niche ? <span>· {project.niche}</span> : null}
              {project.ebook_id ? <Badge variant="outline">Ebook ✓</Badge> : null}
              {project.playbook_id ? <Badge variant="outline">Playbook ✓</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runEbook("kdp")} disabled={!!busy} variant="secondary">
            {busy === "ebook" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            Gerar Ebook
          </Button>
          <Button onClick={runPlaybook} disabled={!!busy} variant="secondary">
            {busy === "playbook" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Gerar Playbook
          </Button>
          <Button onClick={runCombo} disabled={!!busy}>
            {busy === "combo" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Gerar Combo
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
          <TabsTrigger value="ebook">Ebook</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
          <TabsTrigger value="copy"><PenLine className="mr-1 h-3.5 w-3.5" />Copy</TabsTrigger>
          <TabsTrigger value="criativos"><Megaphone className="mr-1 h-3.5 w-3.5" />Criativos</TabsTrigger>
          <TabsTrigger value="pagina"><LayoutTemplate className="mr-1 h-3.5 w-3.5" />Página</TabsTrigger>
          <TabsTrigger value="checkout"><ShoppingCart className="mr-1 h-3.5 w-3.5" />Checkout</TabsTrigger>
          <TabsTrigger value="escala"><Rocket className="mr-1 h-3.5 w-3.5" />Escala</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
          <TabsTrigger value="historico">Histórico IA</TabsTrigger>
        </TabsList>

        <TabsContent value="briefing" className="space-y-3">
          {hasBriefing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{briefing.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{briefing.subtitle}</p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <Label className="text-xs">Promessa</Label>
                  <p>{briefing.promise}</p>
                </div>
                <div>
                  <Label className="text-xs">Avatar</Label>
                  <p>{briefing.avatar}</p>
                </div>
                <div>
                  <Label className="text-xs">Mecanismo único</Label>
                  <p>{briefing.uniqueMechanism}</p>
                </div>
                <div>
                  <Label className="text-xs">Dores</Label>
                  <ul className="list-disc pl-5">
                    {(briefing.pains ?? []).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Desejos</Label>
                  <ul className="list-disc pl-5">
                    {(briefing.desires ?? []).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Briefing ainda vazio. Clique em "Gerar Ebook" ou "Gerar Combo" para que a IA crie
                  briefing e estrutura.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="estrutura" className="space-y-2">
          {outline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma estrutura ainda.</p>
          ) : (
            outline.map((c, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-semibold">
                    {i + 1}. {c.title}
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {c.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="ebook">
          <Card>
            <CardContent className="space-y-3 p-6">
              {project.ebook_id ? (
                <>
                  <p className="text-sm">Ebook pronto. Abra no editor para revisar e exportar.</p>
                  <Link
                    to="/produtos/ebook"
                    search={{ id: project.ebook_id } as never}
                  >
                    <Button>
                      <BookOpen className="mr-2 h-4 w-4" /> Abrir editor
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Ainda não há ebook neste projeto. Escolha o modo:
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => runEbook("kdp")} disabled={!!busy} variant="secondary">
                      Gerar KDP
                    </Button>
                    <Button onClick={() => runEbook("premium")} disabled={!!busy}>
                      Gerar Premium
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playbook">
          <Card>
            <CardContent className="space-y-3 p-6">
              {project.playbook_id ? (
                <>
                  <p className="text-sm">
                    Playbook interativo pronto — extensão visual do mesmo briefing do ebook.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      to="/produtos/playbook/$id"
                      params={{ id: project.playbook_id }}
                    >
                      <Button variant="secondary">Ver leitura</Button>
                    </Link>
                    <Link
                      to="/produtos/playbook/$id/editar"
                      params={{ id: project.playbook_id }}
                    >
                      <Button>Editar cenas</Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Gere o playbook para ter uma versão interativa em cards do mesmo conteúdo.
                  </p>
                  <Button onClick={runPlaybook} disabled={!!busy}>
                    Gerar Playbook
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exportar">
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <p>Exportações disponíveis depois que ebook/playbook forem gerados:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                <li>PDF, DOCX, EPUB — pelo editor de Ebook.</li>
                <li>Link público mobile — pela tela do Playbook.</li>
              </ul>
              <div className="flex gap-2 pt-2">
                {project.ebook_id ? (
                  <Link to="/produtos/ebook" search={{ id: project.ebook_id } as never}>
                    <Button variant="secondary">
                      <FileDown className="mr-2 h-4 w-4" /> Exportar Ebook
                    </Button>
                  </Link>
                ) : null}
                {project.playbook_id ? (
                  <Link to="/produtos/playbook/$id" params={{ id: project.playbook_id }}>
                    <Button variant="secondary">
                      <FileDown className="mr-2 h-4 w-4" /> Compartilhar Playbook
                    </Button>
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy">
          <CopyTab
            projectId={id}
            initial={(project.meta?.copy as SalesCopy | undefined) ?? null}
            onSaved={(c) => setProject({ ...project, meta: { ...project.meta, copy: c } })}
          />
        </TabsContent>
        <TabsContent value="criativos">
          <CreativesTab
            projectId={id}
            initial={
              Array.isArray(project.meta?.creatives)
                ? (project.meta!.creatives as never[])
                : []
            }
            onSaved={(list) =>
              setProject({ ...project, meta: { ...project.meta, creatives: list } })
            }
          />
        </TabsContent>
        <TabsContent value="pagina">
          <SalesPageTab
            projectId={id}
            initial={(project.meta?.salesPage as { page: SalesPage; prompts: { lovable: string; googleAiStudio: string; html: string; v0: string; claude: string } } | undefined) ?? null}
            onSaved={(d) =>
              setProject({ ...project, meta: { ...project.meta, salesPage: d } })
            }
          />
        </TabsContent>
        <TabsContent value="checkout">
          <CheckoutTab
            projectId={id}
            initial={(project.meta?.checkout as Partial<CheckoutDraft> | undefined) ?? null}
            onSaved={(d) =>
              setProject({ ...project, meta: { ...project.meta, checkout: d } })
            }
          />
        </TabsContent>
        <TabsContent value="escala">
          <EscalaTab
            projectId={id}
            initialAnalysis={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.lastAnalysis as never) ??
              null
            }
            initialPlan={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.plan as never) ?? null
            }
            initialNextTests={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.nextTests as never) ?? null
            }
            initialScalePlan={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.scalePlan as never) ?? null
            }
            initialDiagnosis={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.fullDiagnosis as never) ?? null
            }
            initialInput={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.lastPlanInput as never) ?? null
            }
            initialImages={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.lastImages as never) ?? null
            }
            initialContext={
              ((project.meta?.scale as Record<string, unknown> | undefined)?.lastExtractedContext as never) ?? null
            }
            hasEbook={!!project.ebook_id}
            hasPlaybook={!!project.playbook_id}
            hasCopy={!!project.meta?.copy}
            hasSalesPage={!!project.meta?.salesPage}
            hasCheckout={!!project.meta?.checkout}
            hasCreatives={
              Array.isArray(project.meta?.creatives) &&
              (project.meta!.creatives as unknown[]).length > 0
            }
            creativesCount={
              Array.isArray(project.meta?.creatives)
                ? (project.meta!.creatives as unknown[]).length
                : 0
            }
            onJump={(t) => setTab(t)}
          />
        </TabsContent>
        <TabsContent value="historico">
          <AiHistoryTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
