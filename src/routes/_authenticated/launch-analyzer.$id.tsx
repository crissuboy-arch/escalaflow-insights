import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Wand2,
  Download,
  Copy,
  AlertTriangle,
  Target,
  DollarSign,
  Megaphone,
  Sparkles,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { loadLaunchAnalysisFn, generateCampaignFn } from "@/lib/launchAnalyzer.functions";
import type { DiagnosticoOferta, CampanhaGerada } from "@/lib/launchAnalyzer.server";

export const Route = createFileRoute("/_authenticated/launch-analyzer/$id")({
  component: LaunchAnalyzerResult,
});

function scoreColor(v: number): string {
  if (v >= 70) return "text-emerald-400";
  if (v >= 50) return "text-amber-400";
  return "text-red-400";
}
function scoreBg(v: number): string {
  if (v >= 70) return "bg-emerald-500";
  if (v >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
}

const SCORE_DIMS: { key: keyof DiagnosticoOferta["scores"]; label: string }[] = [
  { key: "clareza", label: "Clareza" },
  { key: "atratividade", label: "Atratividade" },
  { key: "potencialEscala", label: "Potencial de Escala" },
  { key: "competitividade", label: "Competitividade" },
  { key: "facilidadeVenda", label: "Facilidade de Venda" },
  { key: "pontuacaoGeral", label: "Pontuação Geral" },
];

// Normaliza o registro de campanha persistido no banco para o formato CampanhaGerada.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToCampanha(db: any): CampanhaGerada {
  const aud = db?.audiences?.[0] ?? {};
  const adCopies: Array<{ texto?: string; descricao?: string }> = db?.ad_copies ?? [];
  return {
    campanha: {
      nomeCampanha: db?.name ?? "Campanha",
      objetivoMetaAds: "",
      nomeConjuntoAnuncios: "",
      publicoRecomendado: aud.publico ?? "",
      idadeSugerida: aud.idade ?? "",
      localizacaoSugerida: aud.localizacao ?? "",
      interessesMetaAds: aud.interesses ?? [],
    },
    criativos: {
      headlines: db?.headlines ?? [],
      textosPrincipais: adCopies.map((a) => a.texto ?? ""),
      descricoes: adCopies.map((a) => a.descricao ?? ""),
      angulosCriativos: db?.angles ?? [],
      sugestoesImagem: db?.creatives ?? [],
      sugestoesVideo: [],
      ctaRecomendado: "",
    },
    orcamento: { orcamentoInicialRecomendadoDia: 0, moeda: "" },
  };
}

function LaunchAnalyzerResult() {
  const { id } = Route.useParams();
  const load = useServerFn(loadLaunchAnalysisFn);
  const genCampaign = useServerFn(generateCampaignFn);

  const [loading, setLoading] = useState(true);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoOferta | null>(null);
  const [campanha, setCampanha] = useState<CampanhaGerada | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load({ data: { projectId: id } })
      .then((d) => {
        setDiagnostico((d.diagnostico ?? null) as DiagnosticoOferta | null);
        setTitle((d.project as { title?: string })?.title ?? "");
        if (d.campaign) setCampanha(dbToCampanha(d.campaign));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleGenerate(force = false) {
    setBusy(true);
    try {
      const r = await genCampaign({ data: { projectId: id, forceGenerate: force } });
      setCampanha({
        campanha: r.campanha,
        criativos: r.criativos,
        orcamento: r.orcamento,
      });
      toast.success("Campanha gerada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar campanha");
    } finally {
      setBusy(false);
    }
  }

  function buildPlainText(): string {
    if (!diagnostico) return "";
    const d = diagnostico;
    const lines: string[] = [];
    lines.push(`# ${d.produto || title}`);
    lines.push("");
    lines.push("## Oferta");
    lines.push(`Tipo: ${d.tipoOferta ?? "—"}`);
    lines.push(`Promessa: ${d.promessaPrincipal || "—"}`);
    lines.push(`Público: ${d.publicoAlvo || "—"}`);
    lines.push(
      `Preço: ${d.precoDetectado != null ? `${d.moeda ?? ""} ${d.precoDetectado}` : "não detectado"}`,
    );
    lines.push(`CTA: ${d.ctaPagina ?? "não detectado"}`);
    lines.push("");
    lines.push("## Score");
    SCORE_DIMS.forEach((s) => lines.push(`${s.label}: ${d.scores[s.key]}`));
    lines.push("");
    lines.push("## Financeiro");
    lines.push(`Margem estimada: ${d.financeiro.margemEstimada ?? "—"}`);
    lines.push(`CPA máximo aceitável: ${d.financeiro.cpaMaximoAceitavel ?? "—"}`);
    lines.push(`ROAS mínimo recomendado: ${d.financeiro.roasMinimoRecomendado ?? "—"}`);
    lines.push("");
    lines.push(
      `Pode anunciar: ${d.diagnostico.podeAnunciar ? "SIM" : "NÃO"} — ${d.diagnostico.motivo}`,
    );
    lines.push("Top 5 problemas:");
    d.diagnostico.top5Problemas.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`));
    if (campanha) {
      const c = campanha;
      lines.push("");
      lines.push("## Campanha (Meta Ads)");
      lines.push(`Nome: ${c.campanha.nomeCampanha}`);
      lines.push(`Objetivo: ${c.campanha.objetivoMetaAds}`);
      lines.push(`Conjunto: ${c.campanha.nomeConjuntoAnuncios}`);
      lines.push(`Público: ${c.campanha.publicoRecomendado}`);
      lines.push(`Idade: ${c.campanha.idadeSugerida} | Local: ${c.campanha.localizacaoSugerida}`);
      lines.push(`Interesses: ${c.campanha.interessesMetaAds.join(", ")}`);
      if (c.orcamento.orcamentoInicialRecomendadoDia)
        lines.push(
          `Orçamento/dia: ${c.orcamento.moeda} ${c.orcamento.orcamentoInicialRecomendadoDia}`,
        );
      lines.push("");
      lines.push("### Headlines");
      c.criativos.headlines.forEach((h) => lines.push(`- ${h}`));
      lines.push("### Textos principais");
      c.criativos.textosPrincipais.forEach((t, i) =>
        lines.push(`- ${t}${c.criativos.descricoes[i] ? ` | ${c.criativos.descricoes[i]}` : ""}`),
      );
      lines.push("### Ângulos");
      c.criativos.angulosCriativos.forEach((a) => lines.push(`- ${a}`));
    }
    return lines.join("\n");
  }

  async function exportPdf() {
    const text = buildPlainText();
    if (!text) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(11);
      let y = margin;
      for (const raw of text.split("\n")) {
        const wrapped = doc.splitTextToSize(raw || " ", maxWidth) as string[];
        for (const line of wrapped) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 15;
        }
      }
      doc.save(`${(diagnostico?.produto || title || "analise").replace(/\W+/g, "-")}.pdf`);
      toast.success("PDF exportado!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar PDF");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!diagnostico) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Diagnóstico não encontrado.</p>
        <Link to="/launch-analyzer" className="text-primary underline">
          ← Voltar
        </Link>
      </div>
    );
  }

  const d = diagnostico;
  const geral = d.scores.pontuacaoGeral;
  const podeAnunciar = d.diagnostico.podeAnunciar;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/launch-analyzer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Launch Analyzer
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{d.produto || title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {d.tipoOferta && <Badge variant="outline">{d.tipoOferta}</Badge>}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-semibold ${
                podeAnunciar
                  ? "border-emerald-500/40 text-emerald-400"
                  : "border-red-500/40 text-red-400"
              }`}
            >
              {podeAnunciar ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {podeAnunciar ? "Pode anunciar" : "Não recomendado"} · {geral}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => copy(buildPlainText())}>
            <Copy className="mr-1.5 h-4 w-4" /> Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="oferta">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="oferta">
            <Target className="mr-1.5 h-4 w-4" /> Oferta
          </TabsTrigger>
          <TabsTrigger value="score">
            <Sparkles className="mr-1.5 h-4 w-4" /> Score
          </TabsTrigger>
          <TabsTrigger value="financeiro">
            <DollarSign className="mr-1.5 h-4 w-4" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="campanha">
            <Megaphone className="mr-1.5 h-4 w-4" /> Campanha
          </TabsTrigger>
          <TabsTrigger value="criativos">
            <Sparkles className="mr-1.5 h-4 w-4" /> Criativos
          </TabsTrigger>
          <TabsTrigger value="melhorias">
            <Wrench className="mr-1.5 h-4 w-4" /> Melhorias
          </TabsTrigger>
        </TabsList>

        {/* OFERTA */}
        <TabsContent value="oferta" className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <Field label="Promessa principal" value={d.promessaPrincipal} />
              <Field label="Público-alvo" value={d.publicoAlvo} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Preço detectado"
                  value={
                    d.precoDetectado != null
                      ? `${d.moeda ?? ""} ${d.precoDetectado}`
                      : "não detectado"
                  }
                />
                <Field label="CTA da página" value={d.ctaPagina ?? "não detectado"} />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={d.provaSocialPresente ? "default" : "outline"}>
                  {d.provaSocialPresente ? "✓" : "✗"} Prova social
                </Badge>
                <Badge variant={d.garantiaPresente ? "default" : "outline"}>
                  {d.garantiaPresente ? "✓" : "✗"} Garantia
                </Badge>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-3">
            <ListCard title="Dores" items={d.dores} />
            <ListCard title="Desejos" items={d.desejos} />
            <ListCard title="Benefícios" items={d.beneficios} />
          </div>
        </TabsContent>

        {/* SCORE */}
        <TabsContent value="score">
          <Card>
            <CardContent className="space-y-4 p-5">
              {SCORE_DIMS.map((s) => {
                const v = Math.round(d.scores[s.key]);
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={s.key === "pontuacaoGeral" ? "font-semibold" : ""}>
                        {s.label}
                      </span>
                      <span className={`font-semibold ${scoreColor(v)}`}>{v}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${scoreBg(v)}`}
                        style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCEIRO */}
        <TabsContent value="financeiro">
          <Card>
            <CardContent className="p-5">
              {d.precoDetectado == null ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Sem preço detectado na página — não é possível estimar margem, CPA ou ROAS.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric
                    label="Margem estimada"
                    value={
                      d.financeiro.margemEstimada != null
                        ? `${Math.round(d.financeiro.margemEstimada * 100)}%`
                        : "—"
                    }
                  />
                  <Metric
                    label="CPA máx. aceitável"
                    value={
                      d.financeiro.cpaMaximoAceitavel != null
                        ? `${d.moeda ?? ""} ${d.financeiro.cpaMaximoAceitavel.toFixed(2)}`
                        : "—"
                    }
                  />
                  <Metric
                    label="ROAS mín. recomendado"
                    value={
                      d.financeiro.roasMinimoRecomendado != null
                        ? `${d.financeiro.roasMinimoRecomendado.toFixed(2)}x`
                        : "—"
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPANHA */}
        <TabsContent value="campanha" className="space-y-3">
          {!campanha ? (
            <Card>
              <CardContent className="space-y-4 p-5">
                {!podeAnunciar && (
                  <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 font-semibold text-red-400">
                      <AlertTriangle className="h-4 w-4" /> Esta oferta não é recomendada para
                      anúncio
                    </div>
                    <p className="text-sm text-muted-foreground">{d.diagnostico.motivo}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {d.diagnostico.top5Problemas.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={() => handleGenerate(!podeAnunciar)} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1.5 h-4 w-4" />
                  )}
                  {podeAnunciar ? "Gerar campanha" : "Gerar campanha mesmo assim"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{campanha.campanha.nomeCampanha}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                  <Field label="Objetivo" value={campanha.campanha.objetivoMetaAds} />
                  <Field
                    label="Conjunto de anúncios"
                    value={campanha.campanha.nomeConjuntoAnuncios}
                  />
                  <Field label="Público recomendado" value={campanha.campanha.publicoRecomendado} />
                  <Field label="Idade sugerida" value={campanha.campanha.idadeSugerida} />
                  <Field label="Localização" value={campanha.campanha.localizacaoSugerida} />
                  {campanha.orcamento.orcamentoInicialRecomendadoDia > 0 && (
                    <Field
                      label="Orçamento inicial/dia"
                      value={`${campanha.orcamento.moeda} ${campanha.orcamento.orcamentoInicialRecomendadoDia}`}
                    />
                  )}
                </CardContent>
              </Card>
              <ListCard title="Interesses (Meta Ads)" items={campanha.campanha.interessesMetaAds} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(buildPlainText())}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar para área de transferência
                </Button>
                <Button variant="outline" size="sm" onClick={exportPdf}>
                  <Download className="mr-1.5 h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* CRIATIVOS */}
        <TabsContent value="criativos" className="space-y-3">
          {!campanha ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Gere a campanha na aba <b>Campanha</b> para ver os criativos.
              </CardContent>
            </Card>
          ) : (
            <>
              <CopyableList title="Headlines" items={campanha.criativos.headlines} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Textos principais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  {campanha.criativos.textosPrincipais.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 rounded-md border border-border/50 bg-muted/20 p-2 text-sm"
                    >
                      <div>
                        <div>{t}</div>
                        {campanha.criativos.descricoes[i] && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {campanha.criativos.descricoes[i]}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          copy(
                            `${t}${campanha.criativos.descricoes[i] ? `\n${campanha.criativos.descricoes[i]}` : ""}`,
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <CopyableList title="Ângulos criativos" items={campanha.criativos.angulosCriativos} />
              <div className="grid gap-3 md:grid-cols-2">
                <ListCard title="Sugestões de imagem" items={campanha.criativos.sugestoesImagem} />
                <ListCard title="Sugestões de vídeo" items={campanha.criativos.sugestoesVideo} />
              </div>
              {campanha.criativos.ctaRecomendado && (
                <Card>
                  <CardContent className="p-4 text-sm">
                    <span className="text-muted-foreground">CTA recomendado: </span>
                    <b>{campanha.criativos.ctaRecomendado}</b>
                  </CardContent>
                </Card>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(buildPlainText())}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar para área de transferência
                </Button>
                <Button variant="outline" size="sm" onClick={exportPdf}>
                  <Download className="mr-1.5 h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* MELHORIAS */}
        <TabsContent value="melhorias" className="space-y-3">
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                {podeAnunciar ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                {d.diagnostico.motivo || "—"}
              </div>
            </CardContent>
          </Card>
          <ListCard title="Top 5 problemas" items={d.diagnostico.top5Problemas} ordered />
          <ListCard title="Objeções não respondidas" items={d.objecoesNaoRespondidas} />
          <ListCard title="Dados não encontrados na página" items={d.dadosNaoEncontrados} muted />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div>{value || "—"}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ListCard({
  title,
  items,
  ordered,
  muted,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : ordered ? (
          <ol
            className={`list-decimal space-y-1 pl-5 text-sm ${muted ? "text-muted-foreground" : ""}`}
          >
            {items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ol>
        ) : (
          <ul
            className={`list-disc space-y-1 pl-5 text-sm ${muted ? "text-muted-foreground" : ""}`}
          >
            {items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CopyableList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => copy(items.join("\n"))}>
            <Copy className="mr-1 h-3 w-3" /> Copiar tudo
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => copy(it)}
                className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-1 text-sm hover:border-primary/40"
              >
                {it}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
