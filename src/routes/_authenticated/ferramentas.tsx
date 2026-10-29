// Ferramentas (Fase 2) — the ScalaFlow central panel: Intelligence,
// Creation, Projects, Integrations. The layout (_authenticated.tsx)
// already handles auth/redirect, so this route needs no beforeLoad.
//
// HARD RULE (brief): no fake-functional button. Every action either
// navigates to a REAL existing route, or is disabled with the reason.
// Tools whose executor is not connected show "Aguardando integração"
// with the evidence and next step from the registry — never a promise.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Megaphone,
  FolderKanban,
  ListChecks,
  FileCheck,
  History,
  AlertTriangle,
  ShieldCheck,
  PlugZap,
} from "lucide-react";
import { getPanelIntegrations, type IntegrationEntry } from "@/lib/integrations/registry";
import {
  getIntegrationAvailabilityFn,
  type IntegrationAvailability,
} from "@/lib/integrations/availability.functions";
import {
  listHandoffProjectsFn,
  statusLabelForHandoff,
  type HandoffProjectView,
} from "@/lib/cris-os/transform.functions";

export const Route = createFileRoute("/_authenticated/ferramentas")({
  component: FerramentasPage,
});

type ToolCard = {
  title: string;
  description: string;
  /** Real route, or null when no executor/route exists. */
  to: string | null;
  /** Why the action is disabled, when `to` is null. */
  awaitingNote?: string;
};

function ToolCardView({ card }: { card: ToolCard }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{card.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{card.description}</p>
        {card.to ? (
          <Button asChild variant="outline" size="sm">
            <Link to={card.to}>Abrir</Link>
          </Button>
        ) : (
          <div className="space-y-1">
            <Button disabled size="sm" variant="outline">
              Aguardando integração
            </Button>
            {card.awaitingNote ? (
              <p className="text-xs text-muted-foreground">{card.awaitingNote}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

const INTELIGENCIA: ToolCard[] = [
  {
    title: "Mineração",
    description: "Mineração de ofertas em Facebook, TikTok, Instagram e YouTube.",
    to: "/minerar",
  },
  {
    title: "Tendências",
    description: "Google Trends e sinais de mercado.",
    to: "/google-radar",
  },
  {
    title: "Pesquisa de concorrentes",
    description: "Sem funcionalidade dedicada localizada no código — não há botão a fingir que existe.",
    to: null,
    awaitingNote: "Aguardando integração: nenhuma página/função de concorrentes encontrada na auditoria.",
  },
  {
    title: "Ofertas salvas",
    description: "As tuas ofertas guardadas e escaladas.",
    to: "/ofertas-salvas",
  },
];

const CRIACAO: ToolCard[] = [
  {
    title: "Imagens e posts",
    description: "Criativos locais + Pink Logic quando estiver ligada.",
    to: "/criativos",
  },
  {
    title: "Anúncios",
    description: "Criativos locais + Meta Ads quando estiver ligado (só leitura primeiro).",
    to: "/criativos",
  },
  {
    title: "Vídeos / Reels",
    description: "MKVideos e OpenMontage são só locais — não há execução remota a partir do painel.",
    to: null,
    awaitingNote: "Aguardando integração: executores locais, sem serviço remoto.",
  },
  {
    title: "Páginas de vendas",
    description: "Página local + PageForge quando estiver ligada.",
    to: "/pagina-venda",
  },
  {
    title: "Microaplicações",
    description: "O Criador de App gera configurações via CLI; não há endpoint de geração para o painel.",
    to: null,
    awaitingNote: "Aguardando integração: só local, sem artefacto consumível pelo painel.",
  },
  {
    title: "Campanhas",
    description: "Meta Ads (leitura) + planeamento via Cris OS no futuro.",
    to: null,
    awaitingNote: "Aguardando integração: Meta Ads sem deploy confirmado; planeamento Cris OS é fase futura.",
  },
];

function HandoffRow({ view }: { view: HandoffProjectView }) {
  const title = view.opportunity?.title ?? "Oportunidade";
  return (
    <div className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {statusLabelForHandoff(view.status)}
          {view.attempts !== null && view.attempts > 0 ? ` · ${view.attempts} tentativa(s)` : ""}
          {view.remoteStatus ? ` · remoto: ${view.remoteStatus}` : ""}
        </p>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link
          to="/projetos/handoff/$handoffId"
          params={{ handoffId: view.handoffId }}
          search={{} as never}
        >
          Ver
        </Link>
      </Button>
    </div>
  );
}

/** Registry id → availability key (ids use kebab-case, availability keys
 *  camelCase). Tools without a remote config (athena loopback, local-only
 *  mkvideos/openmontage) have no dynamic availability: null, not false. */
const AVAILABILITY_KEY: Record<string, keyof IntegrationAvailability | null> = {
  "cris-os": "crisOs",
  "tools-hub": "toolsHub",
  "pink-logic": "pinkLogic",
  pageforge: "pageForge",
  "meta-ads": "metaAds",
  athena: null,
  mkvideos: null,
  openmontage: null,
};

function IntegrationCard({
  entry,
  availability,
}: {
  entry: IntegrationEntry;
  availability: IntegrationAvailability | null;
}) {
  const key = AVAILABILITY_KEY[entry.id] ?? null;
  const configured = key && availability ? availability[key] : null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          {entry.name}
          <Badge variant="secondary">{entry.stateLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{entry.evidence}</p>
        <p className="text-sm">
          <span className="font-medium">Próximo passo: </span>
          {entry.nextStep}
        </p>
        {configured !== null ? (
          <p className="text-xs text-muted-foreground">
            {configured
              ? "Variáveis de ambiente configuradas (ligação real ainda por confirmar com health check)."
              : "Variáveis de ambiente por configurar."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FerramentasPage() {
  const listHandoffs = useServerFn(listHandoffProjectsFn);
  const getAvailability = useServerFn(getIntegrationAvailabilityFn);
  const [handoffs, setHandoffs] = useState<HandoffProjectView[] | null>(null);
  const [availability, setAvailability] = useState<IntegrationAvailability | null>(null);

  useEffect(() => {
    listHandoffs()
      .then(setHandoffs)
      .catch(() => setHandoffs([]));
    getAvailability()
      .then(setAvailability)
      .catch(() => setAvailability(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const running = (handoffs ?? []).filter((h) =>
    ["SENDING", "SENT", "NEEDS_REVIEW", "RUNNING"].includes(h.status),
  );
  const withResults = (handoffs ?? []).filter((h) => h.resultFiles.length > 0);
  const withErrors = (handoffs ?? []).filter(
    (h) => h.status === "FAILED" || !!h.lastError || (h.attempts ?? 0) > 1,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ferramentas</h1>
        <p className="text-sm text-muted-foreground">
          Central do ScalaFlow: inteligência, criação, projetos e integrações. Onde o executor
          ainda não está ligado, o botão diz «Aguardando integração» — nunca finge funcionar.
        </p>
      </div>

      <Section icon={<Search className="h-5 w-5" />} title="Inteligência">
        {INTELIGENCIA.map((card) => (
          <ToolCardView key={card.title} card={card} />
        ))}
      </Section>

      <Section icon={<Megaphone className="h-5 w-5" />} title="Criação">
        {CRIACAO.map((card) => (
          <ToolCardView key={card.title} card={card} />
        ))}
      </Section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FolderKanban className="h-5 w-5" />
          Projetos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Projetos ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Projetos legacy e oportunidades transformadas.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/projetos" search={{} as never}>
                  Abrir
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4" /> Tarefas em execução
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handoffs === null ? (
                <Skeleton className="h-16 w-full" />
              ) : running.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa em curso.</p>
              ) : (
                running.map((h) => <HandoffRow key={h.handoffId} view={h} />)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-4 w-4" /> Resultados / artefactos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handoffs === null ? (
                <Skeleton className="h-16 w-full" />
              ) : withResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum artefacto devolvido até agora — resultados só aparecem quando o recetor
                  os devolve de verdade.
                </p>
              ) : (
                withResults.flatMap((h) =>
                  h.resultFiles.map((f) => (
                    <p key={`${h.handoffId}-${f.url}`} className="truncate text-sm">
                      <a href={f.url} target="_blank" rel="noreferrer" className="underline">
                        {f.name ?? f.url}
                      </a>
                    </p>
                  )),
                )
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handoffs === null ? (
                <Skeleton className="h-16 w-full" />
              ) : handoffs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há envios.</p>
              ) : (
                handoffs.slice(0, 10).map((h) => <HandoffRow key={h.handoffId} view={h} />)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" /> Aprovações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                As aprovações humanas acontecem no Cris OS (Telegram) — não existe endpoint HTTP
                para aprovar/rejeitar. O ScalaFlow só observa o estado por polling.
              </p>
              <Button disabled size="sm" variant="outline">
                Aguardando integração
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" /> Erros / tentativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handoffs === null ? (
                <Skeleton className="h-16 w-full" />
              ) : withErrors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem erros registados.</p>
              ) : (
                withErrors.map((h) => (
                  <div key={h.handoffId} className="border-b py-2 last:border-0">
                    <p className="text-sm font-medium">
                      {h.opportunity?.title ?? "Oportunidade"} — {statusLabelForHandoff(h.status)}
                    </p>
                    {h.lastError ? (
                      <p className="break-words text-xs text-muted-foreground">{h.lastError}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Section icon={<PlugZap className="h-5 w-5" />} title="Integrações">
        {getPanelIntegrations().map((entry) => (
          <IntegrationCard key={entry.id} entry={entry} availability={availability} />
        ))}
      </Section>

      <p className="text-xs text-muted-foreground">
        Nota: «Aguardando integração» significa que o executor ainda não está ligado a partir do
        ScalaFlow — ver o estado real e o próximo passo em cada cartão. O Método Avatar não
        aparece aqui como ferramenta: nenhuma função dele foi encontrada (é o nome de um curso).
      </p>
    </div>
  );
}
