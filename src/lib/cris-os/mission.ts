// Mission model — ScalaFlow-side record of a handoff sent to Cris OS.
//
// This module is PURE (no network, no Supabase, no env reads except the
// explicitly documented organization resolver): every mapping here is
// unit-testable with fixtures, and every rule below is load-bearing for
// the "never declare success without evidence" bar:
//
// HARD RULE — HTTP 202, or a receiver body whose status is NEEDS_REVIEW,
// means "Aguardando revisão" and NOTHING else. It must never render as a
// concluded project, a completed execution, or a success checkmark. The
// only local statuses that exist are the ones in MissionStatus; there is
// no "completed" state in this model, because ScalaFlow has no evidence of
// remote completion today (no completion webhook, no execution result
// endpoint published by Cris OS). SENT means "record created, planning
// pending" — exactly what the pre-existing label already said.
//
// The outbound contract (contract.ts, schema 1.0) is NOT touched here:
// Cris OS's receiver validates it strictly, so no new field is smuggled
// into the payload. Remote references (mission_id / execution_id) live
// only in ScalaFlow's own record, filled from the receiver's response body
// when — and only when — the receiver actually returns them.

/** Local lifecycle of a handoff. NEEDS_REVIEW is new in Fase 1 (central):
 *  the receiver accepted the payload but requires human review before
 *  any planning/execution. It is a pending state, never a terminal one. */
export type MissionStatus = "NOT_SENT" | "SENDING" | "SENT" | "NEEDS_REVIEW" | "FAILED";

/** References returned by the receiver, if any. Every field is optional:
 *  ScalaFlow never invents a remote id — absent means "not returned". */
export interface RemoteMissionRef {
  mission_id: string | null;
  execution_id: string | null;
  /** Remote status string, surfaced VERBATIM (never remapped to a local
   *  "concluded" state — see mapRemoteOutcome). */
  remote_status: string | null;
  review_url: string | null;
  result_files: { name: string | null; url: string }[];
  received_at: string | null;
}

export const EMPTY_REMOTE_REF: RemoteMissionRef = {
  mission_id: null,
  execution_id: null,
  remote_status: null,
  review_url: null,
  result_files: [],
  received_at: null,
};

/** One row of the mission record: the stored handoff plus whatever the
 *  receiver has told us back. organization_id is ScalaFlow-internal only
 *  (see resolveOrganizationId) and is never sent to Cris OS. */
export interface MissionRecord {
  handoff_id: string;
  source_table: string;
  source_id: string;
  status: MissionStatus;
  user_id: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string | null;
  organization_id: string | null;
  remote: RemoteMissionRef;
}

/** Single-tenant today: ScalaFlow has no organization concept (no org
 *  table, no org column anywhere in the app). If an operator configures
 *  SCALAFLOW_ORGANIZATION_ID, it is recorded on the mission record for
 *  future multi-org scoping; otherwise it stays null and isolation rests
 *  on the authenticated user_id filter (see transform.functions.ts).
 *  Multi-org is a future phase — it is NOT faked by defaulting org to the
 *  user id. */
export function resolveOrganizationId(): string | null {
  const raw = process.env.SCALAFLOW_ORGANIZATION_ID?.trim();
  return raw ? raw : null;
}

/** True only for NEEDS_REVIEW. Nothing else in this model means "waiting
 *  for review", and NEEDS_REVIEW never means "done". */
export function isAwaitingReview(status: MissionStatus): boolean {
  return status === "NEEDS_REVIEW";
}

/** The only status label allowed for each state. NEEDS_REVIEW maps to
 *  "Aguardando revisão" — never to "Projeto criado", "Concluído" or any
 *  success wording. SENT keeps its pre-existing honest label. */
export function statusLabelForMission(status: MissionStatus): string {
  switch (status) {
    case "SENT":
      return "Projeto criado — aguardando planejamento";
    case "NEEDS_REVIEW":
      return "Aguardando revisão";
    case "SENDING":
      return "Enviando…";
    case "FAILED":
      return "Falha ao enviar";
    default:
      return "Ainda não enviado";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractResultFiles(body: Record<string, unknown>): { name: string | null; url: string }[] {
  const candidates = [body.files, body.result_files, body.artefacts, body.artifacts];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const files: { name: string | null; url: string }[] = [];
    for (const item of candidate) {
      if (typeof item === "string" && item.trim()) {
        files.push({ name: null, url: item.trim() });
      } else {
        const rec = asRecord(item);
        const url = rec ? asNonEmptyString(rec.url ?? rec.href ?? rec.download_url) : null;
        if (url) files.push({ name: rec ? asNonEmptyString(rec.name ?? rec.filename) : null, url });
      }
    }
    if (files.length > 0) return files;
  }
  return [];
}

/**
 * Maps a receiver response to a local status + remote refs. PURE.
 *
 * - HTTP 202 → NEEDS_REVIEW, regardless of body.
 * - Any 2xx whose JSON body has status === "NEEDS_REVIEW" (case-insensitive)
 *   → NEEDS_REVIEW.
 * - Any other 2xx → SENT.
 * - Remote ids/status/files are extracted only when present in the body;
 *   unknown remote statuses are surfaced verbatim in remote_status and
 *   NEVER remapped to a local concluded state.
 */
export function mapRemoteOutcome(
  httpStatus: number | undefined,
  body: unknown,
): { status: "SENT" | "NEEDS_REVIEW"; remote: RemoteMissionRef } {
  const rec = asRecord(body);
  const bodyStatus = rec ? asNonEmptyString(rec.status) : null;
  const needsReview =
    httpStatus === 202 || (bodyStatus !== null && bodyStatus.toUpperCase() === "NEEDS_REVIEW");

  const remote: RemoteMissionRef = {
    mission_id: rec ? asNonEmptyString(rec.mission_id) : null,
    execution_id: rec ? asNonEmptyString(rec.execution_id) : null,
    remote_status: bodyStatus,
    review_url: rec ? asNonEmptyString(rec.review_url) : null,
    result_files: rec ? extractResultFiles(rec) : [],
    received_at: new Date().toISOString(),
  };

  return { status: needsReview ? "NEEDS_REVIEW" : "SENT", remote };
}

/** Serializes remote refs for the remote_refs JSONB column (migration
 *  20261029000000). Only populated fields are kept; an empty ref serializes
 *  to null so the column stays clean when the receiver returns nothing. */
export function serializeRemoteRefs(remote: RemoteMissionRef): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (remote.review_url) out.review_url = remote.review_url;
  if (remote.result_files.length > 0) out.result_files = remote.result_files;
  if (remote.received_at) out.received_at = remote.received_at;
  return Object.keys(out).length > 0 ? out : null;
}

/** Parses a stored remote_refs value back into the URL/file fields. Ids and
 *  remote_status live in their own columns, not in this JSON. */
export function parseRemoteRefs(
  value: unknown,
): Pick<RemoteMissionRef, "review_url" | "result_files" | "received_at"> {
  const rec = asRecord(value);
  if (!rec) return { review_url: null, result_files: [], received_at: null };
  const files = Array.isArray(rec.result_files)
    ? (rec.result_files as unknown[])
        .map((item) => {
          if (typeof item === "string" && item.trim()) return { name: null, url: item.trim() };
          const r = asRecord(item);
          const url = r ? asNonEmptyString(r.url) : null;
          return url ? { name: r ? asNonEmptyString(r.name) : null, url } : null;
        })
        .filter((f): f is { name: string | null; url: string } => f !== null)
    : [];
  return {
    review_url: asNonEmptyString(rec.review_url),
    result_files: files,
    received_at: asNonEmptyString(rec.received_at),
  };
}
