import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Wand2,
  ExternalLink,
  Brain,
  LayoutTemplate,
  CalendarDays,
} from "lucide-react";
import {
  listArtigosFn,
  queueArtigoFn,
  generateAndPublishArtigoFn,
} from "@/lib/afiliadosSeo.functions";

export const Route = createFileRoute("/_authenticated/motor-afiliados-seo/$id")({
  component: MotorAfiliadosSeoSite,
});

const TIPOS = [
  { value: "review-produto", label: "Review de produto" },
  { value: "guia-como-fazer", label: "Guia (como fazer)" },
  { value: "lista-comparativa", label: "Lista comparativa" },
  { value: "estudo-caso", label: "Estudo de caso" },
] as const;

type Artigo = {
  id: string;
  title: string;
  produtoNome: string;
  tipoArtigo: string;
  status: string;
  dueAt: string | null;
  orderIndex: number;
  wpPostUrl: string | null;
  wpStatus: string | null;
  error: string | null;
};

type Inteligencia = {
  nomeProduto?: string;
  categoria?: string;
  avatar?: string;
  publicoAlvo?: string;
  beneficios?: string[];
  dores?: string[];
  objecoes?: string[];
  palavrasChave?: string[];
  intencaoBusca?: string;
  estruturaSite?: { pagina: string; descricao: string }[];
};

type ProjectInfo = {
  id: string;
  title: string;
  briefing: {
    nicho?: string;
    idioma?: string;
    tipoProjeto?: string;
    paisAlvo?: string;
    publicacaoAutomatica?: boolean;
    inteligencia?: Inteligencia;
  } | null;
  language: string | null;
} | null;

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "published":
      return {
        label: "Publicado",
        cls: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      };
    case "writing":
      return { label: "Escrevendo…", cls: "border-blue-500/40 text-blue-400 bg-blue-500/10" };
    case "failed":
      return { label: "Falhou", cls: "border-red-500/40 text-red-400 bg-red-500/10" };
    default:
      return { label: "Na fila", cls: "border-border text-muted-foreground" };
  }
}

function ChipList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <Badge key={i} variant="secondary" className="font-normal">
          {it}
        </Badge>
      ))}
    </div>
  );
}

function MotorAfiliadosSeoSite() {
  const { id } = Route.useParams();
  const listFn = useServerFn(listArtigosFn);
  const queueFn = useServerFn(queueArtigoFn);
  const genFn = useServerFn(generateAndPublishArtigoFn);

  const [project, setProject] = useState<ProjectInfo>(null);
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  // Form manual
  const [nome, setNome] = useState("");
  const [link, setLink] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoArtigo, setTipoArtigo] = useState<(typeof TIPOS)[number]["value"]>("review-produto");
  const [palavraChave, setPalavraChave] = useState("");
  const [adding, setAdding] = useState(false);

  async function refresh() {
    const d = await listFn({ data: { projectId: id } });
    setProject((d.project ?? null) as ProjectInfo);
    setArtigos((d.artigos ?? []) as Artigo[]);
  }

  useEffect(() => {
    refresh()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdd() {
    if (!nome.trim()) {
      toast.error("Informe o nome do produto/tema.");
      return;
    }
    const nicho = project?.briefing?.nicho ?? project?.title ?? "";
    const idioma = project?.language ?? project?.briefing?.idioma ?? "pt";
    setAdding(true);
    try {
      await queueFn({
        data: {
          projectId: id,
          nicho,
          idioma,
          produtoAfiliado: {
            nome: nome.trim(),
            ...(link.trim() ? { linkAfiliado: link.trim() } : {}),
            ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
          },
          tipoArtigo,
          publicarAutomaticamente: project?.briefing?.publicacaoAutomatica ?? false,
          ...(palavraChave.trim() ? { palavraChaveAlvo: palavraChave.trim() } : {}),
        },
      });
      toast.success("Artigo adicionado à fila!");
      setNome("");
      setLink("");
      setDescricao("");
      setPalavraChave("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enfileirar artigo.");
    } finally {
      setAdding(false);
    }
  }

  async function handleGenerate(taskId: string) {
    setRunning(taskId);
    try {
      await genFn({ data: { taskId } });
      toast.success("Artigo gerado e enviado ao WordPress!");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar artigo.");
      await refresh();
    } finally {
      setRunning(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const intel = project?.briefing?.inteligencia;
  const autoPub = project?.briefing?.publicacaoAutomatica ?? false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header */}
      <div>
        <Link
          to="/motor-afiliados-seo"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Motor Afiliados SEO
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{project?.title ?? "Site"}</h1>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {project?.briefing?.tipoProjeto && (
            <Badge variant="secondary">{project.briefing.tipoProjeto}</Badge>
          )}
          {project?.briefing?.nicho && <Badge variant="outline">{project.briefing.nicho}</Badge>}
          {(project?.language || project?.briefing?.idioma) && (
            <Badge variant="outline" className="uppercase">
              {project?.language || project?.briefing?.idioma}
            </Badge>
          )}
          {project?.briefing?.paisAlvo && (
            <Badge variant="outline">{project.briefing.paisAlvo}</Badge>
          )}
          <Badge variant="outline" className={autoPub ? "text-emerald-400" : ""}>
            {autoPub ? "Publicação automática" : "Publicação manual"}
          </Badge>
        </div>
      </div>

      {/* Inteligência do projeto */}
      {intel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" /> Inteligência do projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {intel.avatar && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs uppercase text-muted-foreground">Avatar</Label>
                <p className="text-sm text-foreground/90">{intel.avatar}</p>
              </div>
            )}
            {intel.publicoAlvo && (
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Público-alvo</Label>
                <p className="text-sm text-foreground/90">{intel.publicoAlvo}</p>
              </div>
            )}
            {intel.intencaoBusca && (
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Intenção de busca</Label>
                <p className="text-sm text-foreground/90">{intel.intencaoBusca}</p>
              </div>
            )}
            {!!intel.dores?.length && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Dores</Label>
                <ChipList items={intel.dores} />
              </div>
            )}
            {!!intel.beneficios?.length && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Benefícios</Label>
                <ChipList items={intel.beneficios} />
              </div>
            )}
            {!!intel.objecoes?.length && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Objeções</Label>
                <ChipList items={intel.objecoes} />
              </div>
            )}
            {!!intel.palavrasChave?.length && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Palavras-chave</Label>
                <ChipList items={intel.palavrasChave} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estrutura do site */}
      {!!intel?.estruturaSite?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4 text-primary" /> Estrutura do site
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {intel.estruturaSite.map((p, i) => (
              <div key={i} className="rounded-md border border-border/60 p-3">
                <div className="text-sm font-medium">{p.pagina}</div>
                {p.descricao && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.descricao}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Adicionar artigo manualmente (secundário) */}
      <Accordion type="single" collapsible>
        <AccordionItem value="manual" className="rounded-lg border border-border px-4">
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Adicionar artigo manualmente
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Produto / tema</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do produto ou tema"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Link (opcional)</Label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Tipo de artigo</Label>
                <Select
                  value={tipoArtigo}
                  onValueChange={(v) => setTipoArtigo(v as typeof tipoArtigo)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">
                  Palavra-chave alvo (opcional)
                </Label>
                <Input
                  value={palavraChave}
                  onChange={(e) => setPalavraChave(e.target.value)}
                  placeholder="ex: melhor app de finanças"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Descrição (opcional)
                </Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  placeholder="O que o produto é/faz — usado pela IA sem inventar dados."
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  Adicionar à fila
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Calendário editorial */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Calendário editorial ({artigos.length})
        </h2>
        {artigos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum artigo na fila. Adicione um acima.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {artigos.map((a) => {
              const sb = statusBadge(a.status);
              const isRunning = running === a.id || a.status === "writing";
              return (
                <Card key={a.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-border/60 bg-muted/30 leading-none">
                        <span className="text-[9px] uppercase text-muted-foreground">Dia</span>
                        <span className="text-sm font-semibold">{a.orderIndex + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{a.title || a.produtoNome}</span>
                          <Badge variant="outline" className={`shrink-0 ${sb.cls}`}>
                            {sb.label}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {a.tipoArtigo || "—"}
                          {a.dueAt ? ` · ${new Date(a.dueAt).toLocaleDateString()}` : ""}
                          {a.wpStatus ? ` · WP: ${a.wpStatus}` : ""}
                        </div>
                        {a.error && <div className="mt-1 text-xs text-red-400">{a.error}</div>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.wpPostUrl && (
                        <a
                          href={a.wpPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Ver no WP <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {a.status !== "published" && (
                        <Button
                          size="sm"
                          variant={a.status === "failed" ? "outline" : "default"}
                          disabled={isRunning}
                          onClick={() => handleGenerate(a.id)}
                        >
                          {isRunning ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="mr-1 h-3.5 w-3.5" />
                          )}
                          {a.status === "failed" ? "Tentar de novo" : "Gerar agora"}
                        </Button>
                      )}
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
