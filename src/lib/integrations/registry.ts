// Integration registry — the SINGLE source of truth for what the Tools
// panel (Fase 2) may claim about each system. Every state below comes
// from the 29/10 read-only audits of the real repos (see docs/integracoes.md
// for the evidence per entry). NOTHING here is a live check: a state of
// PREPARADO means "code exists, deploy/keys/URL still unconfirmed", and
// the panel must render exactly that — never upgrade it to "working".
//
// States:
// - CONFIGURAVEL: works when its env vars are set (Cris OS handoff only).
// - PREPARADO: code/contract exists, but deploy, worker, key or live URL
//   is still unconfirmed — NOT callable from ScalaFlow today.
// - AGUARDANDO: no callable path from ScalaFlow at all (contract only,
//   or reachable only through another system).
// - LOCAL: runs only on its own host (CLI/library) — not a web service.
// - EXCLUIDO: no function exists under this name — must NOT appear as a
//   tool in the panel (recorded here so the exclusion is visible, not
//   silent).
export type IntegrationState =
  | "CONFIGURAVEL"
  | "PREPARADO"
  | "AGUARDANDO"
  | "LOCAL"
  | "EXCLUIDO";

export interface IntegrationEntry {
  id: string;
  name: string;
  /** Where the panel lists it (metodo-avatar has none: it is excluded). */
  area: "integracoes" | "criacao" | null;
  state: IntegrationState;
  /** Short, honest panel label. */
  stateLabel: string;
  /** Evidence from the audit: repo, branch, commit, file/route. */
  evidence: string[];
  /** The concrete next step before this can be called. */
  nextStep: string;
  /** Env vars the future connection needs (empty = none known). */
  envVars: string[];
}

export const INTEGRATIONS: IntegrationEntry[] = [
  {
    id: "athena",
    name: "ATHENA",
    area: "integracoes",
    state: "AGUARDANDO",
    stateLabel: "Aguardando integração",
    evidence: [
      "crissuboy-arch/ATHENA main @ 381dc1a: 9 skills Python (stdlib, sem framework web); licença Proprietary — só o contrato pode ser respeitado, nunca o código reutilizado.",
      "Único HTTP: ponte loopback 127.0.0.1:8765 (skills/athena-motor-missoes/scripts/ponte_http.py) — POST /v1/ordens, GET /v1/ordens/<id> (polling), Bearer ATHENA_BRIDGE_TOKEN.",
      "Sem endpoint de aprovar/rejeitar, sem webhook, sem download de ficheiros; aprovação é CLI/Telegram no host.",
    ],
    nextStep:
      "Nada a ligar a partir do ScalaFlow: a Athena só é alcançável via Cris OS na VPS (ver handoff para o Cláudio). O painel observa o estado via polling Cris OS.",
    envVars: [],
  },
  {
    id: "cris-os",
    name: "Cris OS",
    area: "integracoes",
    state: "CONFIGURAVEL",
    stateLabel: "Ligado quando configurado",
    evidence: [
      "crissuboy-arch/cris-os main @ 12a8a11: POST /api/integrations/scalaflow/intelligence (Bearer CRIS_OS_INTEGRATION_TOKEN; 200 PERSISTED/DUPLICATE, 202 NEEDS_REVIEW).",
      "GET /api/integrations/scalaflow/intelligence/{handoff_id}/status — snapshot com production.work_orders[] e output_refs (polling real).",
      "Sem endpoint de criar missão/tarefa/WorkOrder, aprovar ou descarregar artefactos; sem webhook.",
    ],
    nextStep:
      "Configurar CRIS_OS_API_URL + CRIS_OS_INTEGRATION_TOKEN (ver .env.example). O handoff já funciona quando configurado (Fase 1).",
    envVars: ["CRIS_OS_API_URL", "CRIS_OS_INTEGRATION_TOKEN", "CRIS_OS_STATUS_URL"],
  },
  {
    id: "tools-hub",
    name: "ATHENA Tools Hub",
    area: "integracoes",
    state: "PREPARADO",
    stateLabel: "Aguardando integração",
    evidence: [
      "crissuboy-arch/ATHENA-TOOLS-HUB branch feat/opcao-a-g3-preparacao @ 370cad9 (não-main): API Next.js + openapi.yaml — POST /api/v1/jobs (idempotencyKey), GET /api/v1/jobs/[id], /events, /assets, /cancel.",
      "Auth Bearer (hash SHA-256) + anti-replay; scopes tools:read/jobs:read/jobs:write — chaves recebem 403 em approvals:decide (aprovação exige sessão humana).",
      "Execução real exige worker contínuo + host Docker + SUPABASE_SERVICE_ROLE_KEY — 'nada implantado' (README do worker).",
    ],
    nextStep:
      "Confirmar URL de produção + GET /api/v1/health; configurar TOOLS_HUB_BASE_URL + TOOLS_HUB_API_KEY; ligar o worker.",
    envVars: ["TOOLS_HUB_BASE_URL", "TOOLS_HUB_API_KEY"],
  },
  {
    id: "pink-logic",
    name: "Pink Logic",
    area: "integracoes",
    state: "PREPARADO",
    stateLabel: "Aguardando integração",
    evidence: [
      "crissuboy-arch/PINK-LOGIC branch fix/painel-seletor-mock-mode @ c789343 (não-main): GET /api/integrations/health (v1, público) + GET /api/integrations/stats.",
      "POST /api/generate com module em logo|sticker|qrcode|copy|story|carousel|mockup; MCP com 14 tools.",
      "Deploy atual e URL de produção não verificados ao vivo.",
    ],
    nextStep:
      "Confirmar URL de produção + GET /api/integrations/health ao vivo; configurar PINK_LOGIC_BASE_URL + PINK_LOGIC_SERVICE_KEY.",
    envVars: ["PINK_LOGIC_BASE_URL", "PINK_LOGIC_SERVICE_KEY"],
  },
  {
    id: "mkvideos",
    name: "MKVideos",
    area: "integracoes",
    state: "LOCAL",
    stateLabel: "Só local — sem serviço remoto",
    evidence: [
      "crissuboy-arch/mkvideos-ofensiva-criativa branch feat/athena-mkvideos-adapter @ d2bd2b0 (não-main): CLI mkivideos + adapter Athena (athena-receive/athena-status), fila SQLite local.",
      "Sem API HTTP pública; publishers existem como módulos, sem credenciais evidenciadas.",
    ],
    nextStep:
      "Só integrável correndo no mesmo host que o CLI — não é o desenho de um painel web. Serviço remoto é trabalho futuro.",
    envVars: [],
  },
  {
    id: "openmontage",
    name: "OpenMontage",
    area: "integracoes",
    state: "LOCAL",
    stateLabel: "Só local — sem serviço remoto",
    evidence: [
      "crissuboy-arch/open-montagen main @ e45f5b1: biblioteca + ferramentas Python locais (lib/, tools/, schemas/), sem endpoint HTTP.",
      "Licença AGPLv3 — qualquer uso em rede exige decisão de conformidade antes de tudo.",
    ],
    nextStep:
      "Decisão AGPL + wrapper de serviço próprio (fora do ScalaFlow). Nenhum código é copiado para aqui.",
    envVars: [],
  },
  {
    id: "pageforge",
    name: "PageForge",
    area: "integracoes",
    state: "PREPARADO",
    stateLabel: "Aguardando integração",
    evidence: [
      "crissuboy-arch/forge-sales-page-skill @ 0592fb1: skill de agente (SKILL.md, MIT) + serviço Vercel — POST /api/generate (plan/render/assemble/section/full, NDJSON), GET /api/health, /api/integrations/health e /stats.",
      "Bridge Cris OS POST /api/integrations/cris-os/work-orders (idempotente por work_order_id).",
      "URL de produção e resposta ao vivo não verificadas.",
    ],
    nextStep:
      "Confirmar URL de produção + GET /api/health ao vivo; configurar PAGEFORGE_BASE_URL.",
    envVars: ["PAGEFORGE_BASE_URL", "PAGEFORGE_ATHENA_API_KEY"],
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    area: "integracoes",
    state: "PREPARADO",
    stateLabel: "Aguardando integração",
    evidence: [
      "crissuboy-arch/Meta-ads- main @ a621c6b: FastAPI + MCP — leitura livre (list_campaigns, get_insights); escrita só via propose → aprovação humana (não há tool de escrita direta, por desenho).",
      "Auth Meta por OAuth (token ~60 dias, encriptado no Supabase); CRON_SECRET no /api/ads/cron.",
      "Instância ao vivo e conta Meta conectada não verificadas.",
    ],
    nextStep:
      "Confirmar deploy + OAuth Meta (leitura primeiro); configurar META_ADS_BASE_URL.",
    envVars: ["META_ADS_BASE_URL"],
  },
  {
    id: "criador-app",
    name: "Criador de App",
    area: "criacao",
    state: "LOCAL",
    stateLabel: "Só local — sem API de geração",
    evidence: [
      "crissuboy-arch/CRIADOR-DE-APP main @ fd09fd3: CLI python create_app.py (gera 1 JSON em configs/ + 1 prompt em skills/ + assets) + app genérica FastAPI.",
      "Não existe endpoint 'gera-me um app': o output é uma configuração servida pelo backend genérico.",
    ],
    nextStep:
      "Nenhum via API — o painel não promete geração por aqui; a criação continua a ser via CLI no host.",
    envVars: [],
  },
  {
    id: "metodo-avatar",
    name: "Método Avatar",
    area: null,
    state: "EXCLUIDO",
    stateLabel: "Não é uma ferramenta",
    evidence: [
      "crissuboy-arch/metodo-avatar @ 71b7f25 (único commit): landing page Vite+React de um curso ('Método Avatar Magnético').",
      "Zero rotas de API, zero backend, zero testes, zero chamadas fetch/IA no src. 'Avatar' aqui é o nome do curso, não uma função.",
    ],
    nextStep: "Nenhum — fica fora do painel como ferramenta. Se aparecer, é como produto/curso, nunca como executor.",
    envVars: [],
  },
];

export function getIntegration(id: string): IntegrationEntry | undefined {
  return INTEGRATIONS.find((entry) => entry.id === id);
}

/** The 8 integrations the mission lists for the panel's Integrações area. */
export function getPanelIntegrations(): IntegrationEntry[] {
  return INTEGRATIONS.filter((entry) => entry.area === "integracoes");
}
