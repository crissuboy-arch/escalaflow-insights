// Athena adapter — CONTRACT ONLY (Fase 3). There is deliberately NO HTTP
// call in this file, and there must never be one from the ScalaFlow web
// app: Athena's only HTTP surface is a loopback bridge (127.0.0.1:8765)
// that a Vercel-hosted app cannot reach, and Athena never writes back to
// any caller. Dispatch to Athena happens inside Cris OS on the VPS (see
// the handoff to Cláudio); ScalaFlow's job is to build a VALID work_order
// payload that Cris OS can forward unchanged.
//
// Audited contract (ATHENA skills/athena-motor-missoes, cris_os.py):
// - Closed field set: anything outside it → 422 ORDEM_RECUSADA.
// - executor_type must be exactly "ATHENA".
// - status must be READY, RUNNING or DISPATCHED (builder sets READY).
// - asset_type allowlist: LANDING_PAGE, CAROUSEL, MARKETING_MATERIAL,
//   EBOOK. APP, CRM, DISTRIBUTION, UNKNOWN are explicitly refused.
// - requires_approval=true with approved=false → refused.
// - objective (or title) is required.
// - The bridge FORCES final_action={type:"none"} (publish/spend never
//   leaves a production order) and callback={type:"poll"} — the builder
//   includes them to mirror the contract; the bridge enforces them anyway.
// - mission_id = work_order_id (idempotency key on the Athena side).
// - Athena license is Proprietary: this builder respects the message
//   format only; no Athena code is copied or reused here.
export const ATHENA_MISSION_TYPES = [
  "ANALISAR_OFERTA",
  "PESQUISAR_MERCADO",
  "CRIAR_COPY",
  "CRIAR_CRIATIVO",
  "CRIAR_LANDING_PAGE",
  "CRIAR_ROTEIRO",
  "CRIAR_VIDEO",
  "TRANSFORMAR_OFERTA",
  "CRIAR_CAMPANHA",
] as const;

export const ATHENA_ASSET_TYPES = ["LANDING_PAGE", "CAROUSEL", "MARKETING_MATERIAL", "EBOOK"] as const;

export type AthenaAssetType = (typeof ATHENA_ASSET_TYPES)[number];

/** asset_type → Athena mission_type (cris_os.py mapping). */
export const ATHENA_ASSET_TO_MISSION: Record<AthenaAssetType, string> = {
  LANDING_PAGE: "CRIAR_LANDING_PAGE",
  CAROUSEL: "CRIAR_CRIATIVO",
  MARKETING_MATERIAL: "CRIAR_CRIATIVO",
  EBOOK: "CRIAR_COPY",
};

export const ATHENA_DISPATCH_NOTE =
  "Dispatch para a Athena só acontece dentro do Cris OS na VPS (ponte loopback 127.0.0.1:8765). " +
  "O ScalaFlow nunca chama a ponte diretamente e nunca recebe webhooks da Athena: o estado volta por polling Cris OS.";

export interface AthenaWorkOrderInput {
  work_order_id: string;
  handoff_id?: string | null;
  project_id?: string | null;
  execution_plan_id?: string | null;
  source_task_id?: string | null;
  asset_type: string;
  title?: string | null;
  objective?: string | null;
  requirements?: string[] | null;
  input_refs?: string[] | null;
  requires_approval?: boolean;
  approved?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface AthenaWorkOrder {
  work_order_id: string;
  handoff_id: string | null;
  project_id: string | null;
  execution_plan_id: string | null;
  source_task_id: string | null;
  asset_type: AthenaAssetType;
  executor_type: "ATHENA";
  title: string;
  objective: string;
  requirements: string[];
  input_refs: string[];
  output_refs: string[];
  status: "READY";
  requires_approval: boolean;
  approved: boolean;
  metadata: Record<string, unknown>;
  final_action: { type: "none" };
  callback: { type: "poll" };
}

export type AthenaWorkOrderResult =
  | { ok: true; workOrder: AthenaWorkOrder; missionType: string }
  | { ok: false; error: string };

const WORK_ORDER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,80}$/;

/** Pure validation + construction. No network, no env, no side effects. */
export function buildAthenaWorkOrder(input: AthenaWorkOrderInput): AthenaWorkOrderResult {
  if (!WORK_ORDER_ID_RE.test(input.work_order_id)) {
    return { ok: false, error: "work_order_id inválido (tem de casar ^[A-Za-z0-9][A-Za-z0-9._:-]{2,80}$)" };
  }
  if (!(ATHENA_ASSET_TYPES as readonly string[]).includes(input.asset_type)) {
    return {
      ok: false,
      error: `asset_type ${input.asset_type} recusado pela Athena (permitidos: ${ATHENA_ASSET_TYPES.join(", ")})`,
    };
  }
  const objective = (input.objective ?? input.title ?? "").trim();
  if (!objective) {
    return { ok: false, error: "objective (ou title) é obrigatório" };
  }
  const requiresApproval = input.requires_approval ?? false;
  const approved = input.approved ?? false;
  if (requiresApproval && !approved) {
    return { ok: false, error: "requires_approval=true com approved=false é recusado pela ponte" };
  }
  const assetType = input.asset_type as AthenaAssetType;
  return {
    ok: true,
    missionType: ATHENA_ASSET_TO_MISSION[assetType],
    workOrder: {
      work_order_id: input.work_order_id,
      handoff_id: input.handoff_id ?? null,
      project_id: input.project_id ?? null,
      execution_plan_id: input.execution_plan_id ?? null,
      source_task_id: input.source_task_id ?? null,
      asset_type: assetType,
      executor_type: "ATHENA",
      title: (input.title ?? objective).slice(0, 500),
      objective,
      requirements: input.requirements ?? [],
      input_refs: input.input_refs ?? [],
      output_refs: [],
      status: "READY",
      requires_approval: requiresApproval,
      approved,
      metadata: input.metadata ?? {},
      final_action: { type: "none" },
      callback: { type: "poll" },
    },
  };
}
