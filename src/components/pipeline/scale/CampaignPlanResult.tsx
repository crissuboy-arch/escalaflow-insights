import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { CampaignPlan } from "@/lib/scale.server";

export function CampaignPlanResult({ plan }: { plan: CampaignPlan }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Campanha</p>
              <p className="text-lg font-semibold">{plan.campaignName || "—"}</p>
            </div>
            <Badge variant="secondary">{plan.objective || "objetivo"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Orçamento diário total: <strong>{plan.totalBudgetDaily || "—"}</strong></p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Platform name="Meta Ads" data={{
          structure: plan.meta.structure,
          counts: `${plan.meta.campaigns} camp · ${plan.meta.adsets} conj · ${plan.meta.ads} anúncios`,
          budget: plan.meta.budgetPerCampaign,
          audiences: plan.meta.audiences.map((a) => `${a.name}: ${a.targeting}`),
          extra: [],
        }} />
        <Platform name="Google Ads" data={{
          structure: plan.google.structure,
          counts: `${plan.google.campaigns} camp · ${plan.google.adGroups} grupos · ${plan.google.ads} anúncios`,
          budget: plan.google.budgetPerCampaign,
          audiences: plan.google.audiences,
          extra: plan.google.keywords.length ? ["Keywords: " + plan.google.keywords.join(", ")] : [],
        }} />
        <Platform name="Instagram Ads" data={{
          structure: plan.instagram.structure,
          counts: plan.instagram.formats.join(" · "),
          budget: plan.instagram.budgetPerCampaign,
          audiences: plan.instagram.audiences,
          extra: [],
        }} />
      </div>

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
        </Block>
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="font-semibold">Plano dos 3 primeiros dias</p>
          <Day n={1} text={plan.day1} />
          <Day n={2} text={plan.day2} />
          <Day n={3} text={plan.day3} />
        </CardContent>
      </Card>

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