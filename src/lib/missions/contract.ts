// Mission contract (internal, Fase 3) — the shape every tool adapter
// speaks, whatever the tool's own wire format is. This contract is
// ScalaFlow-internal: adapters translate it to each tool's real interface
// (and back), and NOTHING here is sent verbatim to a tool that doesn't
// accept it.
//
// HARD RULES carried over from the handoff model (mission.ts):
// - NEEDS_REVIEW ("Aguardando revisão") is pending, never concluded.
// - COMPLETED requires real artefacts: a mission with status COMPLETED and
//   zero file refs is invalid by construction (mirrors Athena's rule:
//   COMPLETED só com artefacto real). isMissionCompleted enforces it.
// - Approval is OBSERVED, never granted by ScalaFlow: approval.state comes
//   from polling a tool/Cris OS snapshot (or stays PENDING/NONE). No
//   adapter in this codebase approves anything on a human's behalf.
// - No tool, task type, or endpoint is invented: TASK_TYPES lists only
//   task types found in the audited repos (see docs/contratos.md).
import { createHash } from "node:crypto";
import { resolveOrganizationId } from "@/lib/cris-os/mission";

export const MISSION_TOOLS = [
  "athena",
  "cris-os",
  "tools-hub",
  "pink-logic",
  "mkvideos",
  "openmontage",
  "pageforge",
  "meta-ads",
  "criador-app",
] as const;

export type MissionTool = (typeof MISSION_TOOLS)[number];

/** Task types actually accepted per tool (audited, not wished). */
export const TASK_TYPES: Record<MissionTool, readonly string[]> = {
  // Athena mission_type values (contrato.py) — contract-only adapter:
  // dispatch happens from Cris OS on the VPS, never from ScalaFlow.
  athena: [
    "ANALISAR_OFERTA",
    "PESQUISAR_MERCADO",
    "CRIAR_COPY",
    "CRIAR_CRIATIVO",
    "CRIAR_LANDING_PAGE",
    "CRIAR_ROTEIRO",
    "CRIAR_VIDEO",
    "TRANSFORMAR_OFERTA",
    "CRIAR_CAMPANHA",
  ],
  // Cris OS leg: intelligence handoff only (no mission/task creation).
  "cris-os": ["HANDOFF_INTELIGENCIA"],
  // Tools Hub job: toolId selects the catalog tool; task is generic.
  "tools-hub": ["RUN_JOB"],
  // Pink Logic generate modules (packages/api/src/services/generate.ts).
  "pink-logic": ["logo", "sticker", "qrcode", "copy", "story", "carousel", "mockup"],
  // Local CLI only (no remote execution from the panel).
  mkvideos: ["CRIAR_VIDEO"],
  openmontage: ["MONTAR_VIDEO"],
  // PageForge generate stages.
  pageforge: ["plan", "render", "assemble", "section", "full"],
  // Meta Ads: reads only (audited HTTP routes). Proposals live on the
  // service's MCP server, not on HTTP — no PROPOSE task here.
  "meta-ads": ["READ_STATUS", "READ_INSIGHTS", "READ_LIVE"],
  // Local CLI scaffolding only (no generation endpoint).
  "criador-app": ["CRIAR_MICROAPP"],
};

export type MissionStatus =
  | "NOT_SENT"
  | "SENDING"
  | "SENT"
  | "NEEDS_REVIEW"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/** Approval as OBSERVED from a tool/Cris OS snapshot — never decided here. */
export interface MissionApproval {
  state: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  /** Where the decision was observed (e.g. "cris-os-telegram", "athena-host"). */
  source: string | null;
  decidedAt: string | null;
}

export interface MissionFileRef {
  name: string | null;
  url: string;
}

export interface MissionReceipt {
  idempotencyKey: string;
  sentAt: string | null;
  channel: MissionTool;
  remoteIds: {
    missionId: string | null;
    executionId: string | null;
    jobId: string | null;
    workOrderId: string | null;
  };
}

/** Full internal mission record (spec §6 fields). */
export interface MissionRecord {
  missionId: string;
  organizationId: string | null;
  projectId: string | null;
  /** Correlation with the Cris OS handoff, when the mission derives from one. */
  handoffId: string | null;
  executionId: string | null;
  tool: MissionTool;
  taskType: string;
  briefing: string;
  params: Record<string, unknown>;
  status: MissionStatus;
  attempts: number;
  errors: string[];
  fileRefs: MissionFileRef[];
  approval: MissionApproval;
  result: unknown | null;
  receipt: MissionReceipt | null;
  createdAt: string;
  updatedAt: string;
}

/** Deterministic mission id — same (tool, taskType, seed) always yields the
 *  same id, so a retry never creates a duplicate mission. The seed should
 *  be a stable business key (e.g. the handoff_id, or tool+source ids). */
export function buildMissionId(tool: MissionTool, taskType: string, seed: string): string {
  const hash = createHash("sha256")
    .update(`scalaflow:${tool}:${taskType}:${seed}`)
    .digest("hex")
    .slice(0, 24);
  return `msn_${hash}`;
}

/** Validates a mission request. Returns null when valid, else the reason.
 *  Pure — no network, no env. */
export function validateMissionRequest(input: {
  tool: string;
  taskType: string;
  briefing: string;
  params?: unknown;
}): string | null {
  if (!(MISSION_TOOLS as readonly string[]).includes(input.tool)) {
    return `Ferramenta desconhecida: ${input.tool}`;
  }
  const allowed = TASK_TYPES[input.tool as MissionTool];
  if (!allowed.includes(input.taskType)) {
    return `Tarefa ${input.taskType} não aceite pela ferramenta ${input.tool}`;
  }
  if (!input.briefing || !input.briefing.trim()) {
    return "briefing ausente";
  }
  if (input.params !== undefined && (input.params === null || typeof input.params !== "object")) {
    return "params tem de ser um objeto";
  }
  return null;
}

/** Builds a new mission record (NOT sent). Sending is the adapter's job. */
export function buildMissionRecord(input: {
  tool: MissionTool;
  taskType: string;
  briefing: string;
  params?: Record<string, unknown>;
  projectId?: string | null;
  handoffId?: string | null;
  seed: string;
}): MissionRecord {
  const now = new Date().toISOString();
  const missionId = buildMissionId(input.tool, input.taskType, input.seed);
  return {
    missionId,
    organizationId: resolveOrganizationId(),
    projectId: input.projectId ?? null,
    handoffId: input.handoffId ?? null,
    executionId: null,
    tool: input.tool,
    taskType: input.taskType,
    briefing: input.briefing,
    params: input.params ?? {},
    status: "NOT_SENT",
    attempts: 0,
    errors: [],
    fileRefs: [],
    approval: { state: "NONE", source: null, decidedAt: null },
    result: null,
    receipt: {
      idempotencyKey: missionId,
      sentAt: null,
      channel: input.tool,
      remoteIds: { missionId: null, executionId: null, jobId: null, workOrderId: null },
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** COMPLETED only counts with real artefacts attached. A COMPLETED mission
 *  with zero file refs is a lie the type system must not bless — callers
 *  check this before rendering any "done" state. */
export function isMissionCompleted(record: MissionRecord): boolean {
  return record.status === "COMPLETED" && record.fileRefs.length > 0;
}

/** Panel label for a mission status. NEEDS_REVIEW is never "concluído". */
export function missionStatusLabel(status: MissionStatus): string {
  switch (status) {
    case "NOT_SENT":
      return "Ainda não enviado";
    case "SENDING":
      return "Enviando…";
    case "SENT":
      return "Enviado — aguardando execução";
    case "NEEDS_REVIEW":
      return "Aguardando revisão";
    case "RUNNING":
      return "Em execução";
    case "COMPLETED":
      return "Concluído";
    case "FAILED":
      return "Falhou";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}
