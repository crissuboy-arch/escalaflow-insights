import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Globe2 } from "lucide-react";
import type { CampaignPlan } from "@/lib/scale.server";
import { ScoreChip } from "./ScoreChip";
import { DiagnosisCard } from "./DiagnosisCard";
import { ScaleDayCard } from "./ScaleDayCard";
import { AlertsCard } from "./AlertsCard";

export function CampaignPlanResult({ plan }: { plan: CampaignPlan }) {
  const loc = plan.localization;
  const hasLoc = !!(loc?.language || loc?.currency || loc?.marketNotes);
  const scores = plan.scores;
  const scoreEntries: Array<[string, { value: number; color: string; reason: string } | undefined]> = scores
    ? [
        ["Oferta", scores.offer],
        ["Criativo", scores.creative],
        ["Copy", scores.copy],
        ["Funil", scores.funnel],
        ["Página", scores.page],
        ["Escala", scores.scale],
      ]
    : [];
  const sbd = plan.scaleByDay;
  const advCreatives = plan.creativesAdvanced ?? [];
  const ig = plan.instagram;
  return (
    <div className="space-y-4">
      {plan.strategicSummary && (
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs uppercase text-muted-foreground">Resumo estratégico</p>
            <p className="text-base">{plan.strategicSummary}</p>
          </CardContent>
        </Card>
      )}

      {scoreEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {scoreEntries.map(([label, v]) =>
            v ? <ScoreChip key={label} label={label} value={v.value} color={v.color} reason={v.reason} /> : null,
          )}
        </div>
      )}

      {(plan.visualDiagnosis || plan.offerDiagnosis) && (
        <div className="grid gap-3 md:grid-cols-2">
          {plan.visualDiagnosis && (
            <DiagnosisCard
              title="Diagnóstico Visual"
              score={plan.visualDiagnosis.score}
              scoreColor={plan.visualDiagnosis.scoreColor}
              bullets={[
                { label: "Headline", value: plan.visualDiagnosis.headline },
                { label: "CTA", value: plan.visualDiagnosis.cta },
                { label: "Cores", value: plan.visualDiagnosis.colors },
                { label: "Contraste", value: plan.visualDiagnosis.contrast },
                { label: "Prova social", value: plan.visualDiagnosis.socialProof },
                { label: "Escassez", value: plan.visualDiagnosis.scarcity },
                { label: "Bônus", value: plan.visualDiagnosis.bonuses },
                { label: "Ordem dos blocos", value: plan.visualDiagnosis.blockOrder },
                { label: "Clareza da promessa", value: plan.visualDiagnosis.promiseClarity },
                { label: "Nível de design", value: plan.visualDiagnosis.designLevel },
                { label: "Confiança visual", value: plan.visualDiagnosis.visualTrust },
                { label: "Legibilidade mobile", value: plan.visualDiagnosis.mobileLegibility },
              ]}
              lists={[
                { label: "Pontos fortes", items: plan.visualDiagnosis.strengths, tone: "good" },
                { label: "Pontos fracos", items: plan.visualDiagnosis.weaknesses, tone: "bad" },
                { label: "Reduz conversão", items: plan.visualDiagnosis.reducesConversion, tone: "bad" },
                { label: "Aumenta confiança", items: plan.visualDiagnosis.increasesTrust, tone: "good" },
              ]}
            />
          )}
          {plan.offerDiagnosis && (
            <DiagnosisCard
              title="Diagnóstico da Oferta"
              verdict={plan.offerDiagnosis.verdict}
              score={plan.offerDiagnosis.score}
              scoreColor={plan.offerDiagnosis.scoreColor}
              bullets={[
                { label: "Promessa", value: plan.offerDiagnosis.promiseLevel },
                { label: "Mecanismo", value: plan.offerDiagnosis.mechanismStrength },
                { label: "Transformação", value: plan.offerDiagnosis.transformationClarity },
                { label: "Valor percebido", value: plan.offerDiagnosis.perceivedValue },
                { label: "Risco percebido", value: plan.offerDiagnosis.perceivedRisk },
                { label: "Urgência", value: plan.offerDiagnosis.urgencyLevel },
                { label: "Potencial viral", value: plan.offerDiagnosis.viralPotential },
                { label: "Potencial CTR", value: plan.offerDiagnosis.ctrPotential },
                { label: "Potencial CPM", value: plan.offerDiagnosis.cpmPotential },
                { label: "Saturação", value: plan.offerDiagnosis.saturationLevel },
                { label: "Prob. conversão", value: plan.offerDiagnosis.conversionProbability },
              ]}
            />
          )}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Campanha</p>
              <p className="text-lg font-semibold">{plan.campaignName || "—"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {loc?.currency && <Badge variant="outline">{loc.currency}</Badge>}
              {loc?.language && <Badge variant="outline">{loc.language}</Badge>}
              <Badge variant="secondary">{plan.objective || "objetivo"}</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Orçamento diário total: <strong>{plan.totalBudgetDaily || "—"}</strong></p>
        </CardContent>
      </Card>

      {hasLoc && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="h-4 w-4 text-primary" /> Adaptação internacional
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div><span className="uppercase">Idioma:</span> <span className="text-foreground">{loc.language || "—"}</span></div>
              <div><span className="uppercase">Moeda:</span> <span className="text-foreground">{loc.currency || "—"}</span></div>
            </div>
            {loc.marketNotes && <p className="text-sm">{loc.marketNotes}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Platform name="Meta Ads" data={{
          structure: plan.meta.structure,
          counts: `${plan.meta.campaigns} camp · ${plan.meta.adsets} conj · ${plan.meta.ads} anúncios`,
          budget: plan.meta.budgetPerCampaign,
          audiences: plan.meta.audiences.map((a) => `${a.name}: ${a.targeting}`),
          extra: [
            plan.meta.cbo != null ? `Estrutura: ${plan.meta.cbo ? "CBO" : "ABO"}` : "",
            plan.meta.creativesPerAdset ? `Criativos/conjunto: ${plan.meta.creativesPerAdset}` : "",
            plan.meta.budgetDistribution ? `Distribuição: ${plan.meta.budgetDistribution}` : "",
            plan.meta.coldAudience ? `Frio: ${plan.meta.coldAudience}` : "",
            plan.meta.lookalike ? `LAL: ${plan.meta.lookalike}` : "",
            plan.meta.remarketing ? `Remarketing: ${plan.meta.remarketing}` : "",
            plan.meta.exclusions?.length ? `Exclusões: ${plan.meta.exclusions.join(", ")}` : "",
            plan.meta.idealFrequency ? `Freq ideal: ${plan.meta.idealFrequency}` : "",
          ].filter(Boolean),
        }} />
        <Platform name="Google Ads" data={{
          structure: plan.google.structure,
          counts: `${plan.google.campaigns} camp · ${plan.google.adGroups} grupos · ${plan.google.ads} anúncios`,
          budget: plan.google.budgetPerCampaign,
          audiences: plan.google.audiences,
          extra: [
            plan.google.keywords.length ? "Keywords: " + plan.google.keywords.join(", ") : "",
            plan.google.search ? `Search: ${plan.google.search}` : "",
            plan.google.pmax ? `PMax: ${plan.google.pmax}` : "",
            plan.google.youtube ? `YouTube: ${plan.google.youtube}` : "",
            plan.google.shopping ? `Shopping: ${plan.google.shopping}` : "",
            plan.google.display ? `Display: ${plan.google.display}` : "",
            plan.google.buyingIntent ? `Intenção: ${plan.google.buyingIntent}` : "",
          ].filter(Boolean),
        }} />
        <Platform name="Instagram Ads" data={{
          structure: plan.instagram.structure,
          counts: plan.instagram.formats.join(" · "),
          budget: plan.instagram.budgetPerCampaign,
          audiences: plan.instagram.audiences,
          extra: [
            ig.feed ? `Feed: ${ig.feed.creativeType} · hook "${ig.feed.hook}" · ${ig.feed.duration} · CTA ${ig.feed.cta}` : "",
            ig.reels ? `Reels: ${ig.reels.creativeType} · hook "${ig.reels.hook}" · ${ig.reels.duration} · CTA ${ig.reels.cta}` : "",
            ig.stories ? `Stories: ${ig.stories.creativeType} · hook "${ig.stories.hook}" · ${ig.stories.duration} · CTA ${ig.stories.cta}` : "",
          ].filter(Boolean),
        }} />
      </div>

      {advCreatives.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Criativos avançados</p>
            <div className="grid gap-3 md:grid-cols-2">
              {advCreatives.map((c, i) => (
                <div key={i} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{c.placement || c.format}</Badge>
                    {c.type && <Badge variant="outline">{c.type}</Badge>}
                    <span className="ml-auto text-xs text-emerald-500">Viral {c.viralScore}</span>
                    <span className="text-xs text-primary">Conv {c.conversionScore}</span>
                  </div>
                  {c.hook3s && <p className="mt-2"><strong>Hook 0-3s:</strong> {c.hook3s}</p>}
                  {c.patternBreak && <p className="text-xs text-muted-foreground">Quebra de padrão: {c.patternBreak}</p>}
                  {c.script && <p className="mt-1 whitespace-pre-line text-xs"><strong>Roteiro:</strong> {c.script}</p>}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {c.onScreenText && <span>Texto na tela: {c.onScreenText}</span>}
                    {c.caption && <span>Legenda: {c.caption}</span>}
                    {c.cta && <span>CTA: {c.cta}</span>}
                    {c.dominantEmotion && <span>Emoção: {c.dominantEmotion}</span>}
                    {c.editStyle && <span>Edição: {c.editStyle}</span>}
                    {c.pace && <span>Ritmo: {c.pace}</span>}
                    {c.cuts && <span>Cortes: {c.cuts}</span>}
                    {c.soundtrack && <span>Trilha: {c.soundtrack}</span>}
                  </div>
                  {c.brollSuggestions?.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">B-roll: {c.brollSuggestions.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Block title="Criativos recomendados">
          <ul className="space-y-2 text-sm">
            {plan.creatives.map((c, i) => (
              <li key={i} className="rounded border border-border/60 p-2">
                <p className="font-medium">{c.format} — {c.angle}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </li>
            ))}
            {!plan.creatives.length && <li className="text-xs text-muted-foreground">—</li>}
          </ul>
        </Block>
        <Block title="Ângulos de copy">
          <ul className="list-disc pl-5 text-sm">{plan.copyAngles.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </Block>
        <Block title="Hooks">
          <ul className="list-disc pl-5 text-sm">{plan.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </Block>
        <Block title="CTA & KPIs esperados">
          <p className="text-sm"><strong>CTA:</strong> {plan.cta || "—"}</p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>CTR: {plan.expectedKpis.ctr || "—"}</span>
            <span>CPC: {plan.expectedKpis.cpc || "—"}</span>
            <span>CPM: {plan.expectedKpis.cpm || "—"}</span>
            <span>CPA: {plan.expectedKpis.cpa || "—"}</span>
            <span>ROAS: {plan.expectedKpis.roas || "—"}</span>
          </div>
          {plan.expectedKpis.cpmByCountry && plan.expectedKpis.cpmByCountry.length > 0 && (
            <div className="mt-2">
              <p className="text-xs uppercase text-muted-foreground">CPM por país</p>
              <ul className="list-disc pl-5 text-xs">
                {plan.expectedKpis.cpmByCountry.map((c, i) => <li key={i}>{c.country}: {c.value}</li>)}
              </ul>
            </div>
          )}
          {plan.expectedKpis.nicheBenchmark && (
            <p className="mt-2 text-xs text-muted-foreground">Benchmark do nicho: {plan.expectedKpis.nicheBenchmark}</p>
          )}
        </Block>
      </div>

      {sbd && (sbd.day1 || sbd.day2 || sbd.day3) && (
        <div className="grid gap-3 md:grid-cols-3">
          {sbd.day1 && (
            <ScaleDayCard
              day={1}
              blocks={[
                { label: "Objetivo", text: sbd.day1.objective },
                { label: "Métricas esperadas", text: sbd.day1.expectedMetrics },
                { label: "Sinais positivos", items: sbd.day1.positiveSignals },
                { label: "Sinais negativos", items: sbd.day1.negativeSignals },
              ]}
            />
          )}
          {sbd.day2 && (
            <ScaleDayCard
              day={2}
              blocks={[
                { label: "Quando pausar", items: sbd.day2.whenPause },
                { label: "Quando escalar", items: sbd.day2.whenScale },
                { label: "Quando trocar criativo", items: sbd.day2.whenSwapCreative },
              ]}
            />
          )}
          {sbd.day3 && (
            <ScaleDayCard
              day={3}
              blocks={[
                { label: "Regras de decisão", items: sbd.day3.decisionRules },
                { label: "Aumento de orçamento", text: sbd.day3.budgetIncrease },
                { label: "Duplicação", text: sbd.day3.duplication },
                { label: "Escala horizontal", text: sbd.day3.horizontalScaling },
                { label: "Escala vertical", text: sbd.day3.verticalScaling },
              ]}
            />
          )}
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="font-semibold">Plano dos 3 primeiros dias</p>
          <Day n={1} text={plan.day1} />
          <Day n={2} text={plan.day2} />
          <Day n={3} text={plan.day3} />
        </CardContent>
      </Card>

      {plan.criticalAlerts && (
        <AlertsCard
          alerts={plan.criticalAlerts.alerts}
          improvements={plan.criticalAlerts.priorityImprovements}
          bottleneck={plan.criticalAlerts.biggestBottleneck}
          nextSteps={plan.criticalAlerts.nextSteps}
        />
      )}

      {plan.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase text-amber-500">
            <AlertTriangle className="h-3 w-3" /> Alertas
          </div>
          <ul className="list-disc pl-5 text-sm">{plan.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Platform({ name, data }: { name: string; data: { structure: string; counts: string; budget: string; audiences: string[]; extra: string[] } }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{data.structure || "—"}</p>
        <p className="text-xs">{data.counts}</p>
        <p className="text-xs text-muted-foreground">Budget: {data.budget || "—"}</p>
        {data.audiences.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground">Públicos</p>
            <ul className="list-disc pl-5 text-xs">{data.audiences.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        {data.extra.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}
      </CardContent>
    </Card>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-semibold">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Day({ n, text }: { n: number; text: string }) {
  return (
    <div className="rounded border border-border/60 p-2 text-sm">
      <span className="mr-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Dia {n}</span>
      {text || "—"}
    </div>
  );
}