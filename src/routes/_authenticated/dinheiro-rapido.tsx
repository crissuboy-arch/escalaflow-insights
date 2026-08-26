import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { analisarProdutoFn } from "@/lib/dinheiroRapido.functions";
import type { DinheiroRapidoResult } from "@/lib/dinheiroRapido.server";

export const Route = createFileRoute("/_authenticated/dinheiro-rapido")({
  component: DinheiroRapidoPage,
});

const TIPOS = [
  { value: "clickbank", label: "ClickBank" },
  { value: "shopify", label: "Shopify" },
  { value: "hotmart", label: "Hotmart" },
  { value: "fisico", label: "Produto físico" },
  { value: "digital", label: "Produto digital" },
  { value: "manual", label: "Manual" },
];
const PAISES = [
  { value: "BR", label: "Brasil" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Espanha" },
  { value: "US", label: "Estados Unidos" },
  { value: "GLOBAL", label: "Global" },
];
const CANAIS = [
  { value: "auto", label: "Automático" },
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "seo", label: "SEO" },
];

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success("Copiado!"),
    () => toast.error("Não foi possível copiar"),
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>
      {children}
    </div>
  );
}

function Chips({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">—</p>;
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

function NumberedList({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

function ErrorNote({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>Esta seção falhou: {msg}</span>
    </div>
  );
}

function DinheiroRapidoPage() {
  const analisar = useServerFn(analisarProdutoFn);

  const [entrada, setEntrada] = useState("");
  const [tipo, setTipo] = useState("manual");
  const [paisAlvo, setPaisAlvo] = useState("BR");
  const [orcamento, setOrcamento] = useState("");
  const [canal, setCanal] = useState("auto");
  const [modoEconomico, setModoEconomico] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DinheiroRapidoResult | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  async function onAnalisar() {
    const clean = entrada.trim();
    if (clean.length < 3) {
      toast.error("Informe a URL ou o nome do produto.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { result: r, projectId: pid } = await analisar({
        data: {
          url: isUrl(clean) ? clean : "",
          produto: isUrl(clean) ? "" : clean,
          tipo: tipo as never,
          paisAlvo: paisAlvo as never,
          orcamento,
          canal: canal as never,
          modoEconomico,
        },
      });
      setResult(r as DinheiroRapidoResult);
      setProjectId(pid ?? null);
      const errs = Object.keys((r as DinheiroRapidoResult).errors ?? {});
      if (errs.length) {
        toast.warning(`Análise concluída com ${errs.length} aviso(s). Veja os detalhes nas abas.`);
      } else {
        toast.success("Análise concluída!");
      }
    } catch (e) {
      // Garante que o botão SEMPRE volta — nunca spinner infinito.
      toast.error(e instanceof Error ? e.message : "Falha ao analisar o produto.");
    } finally {
      setLoading(false);
    }
  }

  const d = result?.decisao;
  const sim = d?.entrar === "SIM";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Zap className="h-6 w-6 text-primary" /> Modo Dinheiro Rápido
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Cole a URL de um produto (ou o nome), escolha tipo, país, orçamento e canal. A IA
          diagnostica, monta oferta, página, criativos, SEO e plano de tráfego — e decide se vale
          anunciar.
        </p>
      </div>

      {/* Formulário de entrada */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <Section title="URL do produto (ou nome)">
            <Input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onAnalisar()}
              placeholder="https://... · Creatina · Curso de inglês"
              disabled={loading}
              className="h-11 text-base"
            />
          </Section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Section title="Tipo">
              <Select value={tipo} onValueChange={setTipo}>
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
            </Section>
            <Section title="País-alvo">
              <Select value={paisAlvo} onValueChange={setPaisAlvo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Section>
            <Section title="Orçamento">
              <Input
                value={orcamento}
                onChange={(e) => setOrcamento(e.target.value)}
                placeholder="ex: R$ 50/dia"
                disabled={loading}
              />
            </Section>
            <Section title="Canal">
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANAIS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Section>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3">
              <Switch checked={modoEconomico} onCheckedChange={setModoEconomico} />
              <span className="text-sm">
                <span className="font-medium">Modo econômico</span>
                <span className="block text-xs text-muted-foreground">
                  Analisa só a URL + IA (sem minerar concorrentes). Recomendado no 1º teste.
                </span>
              </span>
            </label>
            <Button onClick={onAnalisar} disabled={loading} size="lg" className="shrink-0">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Analisar Produto
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Rodando diagnóstico, oferta, página, criativos, SEO e tráfego…
          </CardContent>
        </Card>
      )}

      {result && d && (
        <>
          {/* DECISÃO DA IA */}
          <Card className={sim ? "border-emerald-500/40" : "border-red-500/40"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {sim ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                DECISÃO DA IA
                <Badge
                  className={
                    sim
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }
                >
                  {sim ? "ENTRAR: SIM" : "ENTRAR: NÃO"} · {d.confianca}% confiança
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Produto recomendado", d.produtoRecomendado],
                ["País", d.pais],
                ["Canal prioritário", d.canalPrioritario],
                ["Orçamento inicial", d.orcamentoInicial],
                ["CPA máximo", d.cpaMaximo],
                ["ROAS mínimo", d.roasMinimo],
                ["Prazo de validação", d.prazoValidacao],
                ["Risco", d.risco],
                ["Potencial", d.potencial],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs uppercase text-muted-foreground">{k}</div>
                  <div className="text-sm font-medium">{v || "—"}</div>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="text-xs uppercase text-muted-foreground">Próxima ação exata</div>
                <div className="text-sm font-medium text-primary">{d.proximaAcao || "—"}</div>
              </div>
              {d.motivo && (
                <div className="sm:col-span-2 lg:col-span-3 text-sm text-muted-foreground">
                  {d.motivo}
                </div>
              )}
              {projectId && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <a
                    href="/projetos"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Salvo em Projetos <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {result.errors?.geral && (
            <Card className="border-red-500/40">
              <CardContent className="p-4 text-sm text-red-300">{result.errors.geral}</CardContent>
            </Card>
          )}

          {/* Abas */}
          <Tabs defaultValue="diagnostico">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
              <TabsTrigger value="oferta">Oferta</TabsTrigger>
              <TabsTrigger value="pagina">Página</TabsTrigger>
              <TabsTrigger value="criativos">Criativos</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="trafego">Tráfego</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
            </TabsList>

            {/* Diagnóstico */}
            <TabsContent value="diagnostico">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <ErrorNote msg={result.errors?.diagnostico} />
                  {result.diagnostico ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="text-base">
                          Score: {result.diagnostico.scores?.pontuacaoGeral ?? "—"}/100
                        </Badge>
                        {result.diagnostico.promessaPrincipal && (
                          <span className="text-sm text-muted-foreground">
                            {result.diagnostico.promessaPrincipal}
                          </span>
                        )}
                      </div>
                      <Section title="Público-alvo / avatar">
                        <p className="text-sm">{result.diagnostico.publicoAlvo || "—"}</p>
                      </Section>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Section title="Dores">
                          <Chips items={result.diagnostico.dores} />
                        </Section>
                        <Section title="Desejos">
                          <Chips items={result.diagnostico.desejos} />
                        </Section>
                        <Section title="Benefícios">
                          <Chips items={result.diagnostico.beneficios} />
                        </Section>
                        <Section title="Objeções">
                          <Chips items={result.diagnostico.objecoesNaoRespondidas} />
                        </Section>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem diagnóstico (URL não informada ou conteúdo não extraído). A decisão usou os
                      dados do formulário.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Oferta */}
            <TabsContent value="oferta">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <ErrorNote msg={result.errors?.oferta} />
                  {result.oferta ? (
                    <>
                      <Section title="Big Idea">
                        <p className="text-sm">{result.oferta.bigIdea || "—"}</p>
                      </Section>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Section title="Posicionamento">
                          <p className="text-sm">{result.oferta.posicionamento || "—"}</p>
                        </Section>
                        <Section title="Mecanismo único">
                          <p className="text-sm">{result.oferta.mecanismoUnico || "—"}</p>
                        </Section>
                        <Section title="Nome da oferta">
                          <p className="text-sm">{result.oferta.nomeOferta || "—"}</p>
                        </Section>
                        <Section title="Headline">
                          <p className="text-sm">{result.oferta.headline || "—"}</p>
                        </Section>
                      </div>
                      <Section title="Promessa principal">
                        <p className="text-sm">{result.oferta.promessaPrincipal || "—"}</p>
                      </Section>
                      <Section title="Proposta de valor">
                        <p className="text-sm">{result.oferta.propostaDeValor || "—"}</p>
                      </Section>
                      <Section title="Escada de valor">
                        <NumberedList items={result.oferta.escadaDeValor} />
                      </Section>
                      <Section title="Estratégia inicial">
                        <p className="text-sm">{result.oferta.estrategiaInicial || "—"}</p>
                      </Section>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Oferta não gerada.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Página */}
            <TabsContent value="pagina">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <ErrorNote msg={result.errors?.pagina} />
                  {result.pagina ? (
                    <>
                      {(["landingCopy", "reviewCopy", "advertorialCopy"] as const).map((k) => {
                        const labels: Record<string, string> = {
                          landingCopy: "Landing page",
                          reviewCopy: "Review",
                          advertorialCopy: "Advertorial",
                        };
                        const val = result.pagina?.[k] ?? "";
                        return (
                          <Section key={k} title={labels[k]}>
                            <div className="relative">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute right-1 top-1 h-7 px-2"
                                onClick={() => copy(val)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                                {val || "—"}
                              </pre>
                            </div>
                          </Section>
                        );
                      })}
                      <Section title="HTML pronto (Tailwind CDN)">
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-1 top-1 h-7 px-2"
                            onClick={() => copy(result.pagina?.html ?? "")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                            {result.pagina.html || "—"}
                          </pre>
                        </div>
                      </Section>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Página não gerada.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Criativos */}
            <TabsContent value="criativos">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <ErrorNote msg={result.errors?.criativos} />
                  {result.criativos ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Section title="Hooks (TikTok/Reels/Shorts)">
                        <NumberedList items={result.criativos.hooks} />
                      </Section>
                      <Section title="Roteiros curtos">
                        <NumberedList items={result.criativos.roteiros} />
                      </Section>
                      <Section title="Copies Meta Ads">
                        <NumberedList items={result.criativos.copiesMeta} />
                      </Section>
                      <Section title="Copies Google Ads">
                        <NumberedList items={result.criativos.copiesGoogle} />
                      </Section>
                      <Section title="Prompts de imagem">
                        <NumberedList items={result.criativos.promptsImagem} />
                      </Section>
                      <Section title="Ângulos de anúncio">
                        <NumberedList items={result.criativos.angulos} />
                      </Section>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Criativos não gerados.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <ErrorNote msg={result.errors?.seo} />
                  {result.seo ? (
                    <>
                      <Section title="Palavras-chave">
                        <Chips items={result.seo.palavrasChave} />
                      </Section>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Section title="Títulos de artigos">
                          <NumberedList items={result.seo.titulos} />
                        </Section>
                        <Section title="Reviews">
                          <NumberedList items={result.seo.reviews} />
                        </Section>
                        <Section title="Comparativos">
                          <NumberedList items={result.seo.comparativos} />
                        </Section>
                        <Section title="Calendário (7 dias)">
                          <ol className="space-y-1 text-sm">
                            {(result.seo.calendario7dias ?? []).map((c, i) => (
                              <li key={i}>
                                <span className="font-medium">Dia {c.dia || i + 1}:</span> {c.titulo}{" "}
                                {c.formato && (
                                  <Badge variant="outline" className="ml-1 text-[10px]">
                                    {c.formato}
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ol>
                        </Section>
                      </div>
                      <Section title="FAQ SEO">
                        <div className="space-y-2">
                          {(result.seo.faq ?? []).map((f, i) => (
                            <div key={i} className="rounded-md border border-border/60 p-2">
                              <div className="text-sm font-medium">{f.pergunta}</div>
                              <div className="text-sm text-muted-foreground">{f.resposta}</div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">SEO não gerado.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tráfego */}
            <TabsContent value="trafego">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <ErrorNote msg={result.errors?.trafego} />
                  {result.trafego ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          ["Canal", result.trafego.canalRecomendado],
                          ["Orçamento/dia", result.trafego.orcamentoDiario],
                          ["CPA máximo", result.trafego.cpaMaximo],
                          ["ROAS mínimo", result.trafego.roasMinimo],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div className="text-xs uppercase text-muted-foreground">{k}</div>
                            <div className="text-sm font-medium">{v || "—"}</div>
                          </div>
                        ))}
                      </div>
                      <Section title="Plano de teste (7 dias)">
                        <NumberedList items={result.trafego.planoTeste7dias} />
                      </Section>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Section title="Quando pausar">
                          <NumberedList items={result.trafego.quandoPausar} />
                        </Section>
                        <Section title="Quando escalar">
                          <NumberedList items={result.trafego.quandoEscalar} />
                        </Section>
                      </div>
                      <Section title="Próximo passo">
                        <p className="text-sm text-primary">{result.trafego.proximoPasso || "—"}</p>
                      </Section>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Plano de tráfego não gerado.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Checklist */}
            <TabsContent value="checklist">
              <Card>
                <CardContent className="space-y-2 p-5">
                  {(result.checklist ?? []).map((c, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>{c}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
