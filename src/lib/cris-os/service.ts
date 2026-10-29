// Orchestrates one handoff: idempotent status row in intelligence_handoffs +
// calling the CrisOsIntelligenceClient. Never throws — a Cris OS outage (or
// missing config) must never break the caller's own action (e.g. TikTok
// "Escalar"), so every path here resolves to a safe, loggable result.
//
// Fase 1 (central) additions, all backward-compatible with the old behavior:
// - Pre-send check: a handoff already SENT or NEEDS_REVIEW is never POSTed
//   again — the stored outcome is returned instead. SENDING short-circuits
//   too (a concurrent send is already in flight). Residual race: two
//   perfectly simultaneous first sends can both POST, but with the same
//   deterministic handoff_id, which is the receiver-side dedupe key.
// - Remote refs (mission_id / execution_id / remote_status / review_url /
//   result files) are persisted when the receiver returns them — but in a
//   SEPARATE best-effort upsert from the base status row, so a pending
//   migration (20261029000000) can never lose the status record itself:
//   the base upsert uses only columns that exist since 2026-09-20.
// - NEEDS_REVIEW is persisted as its own status, never collapsed to SENT.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isCrisOsConfigured, sendIntelligence } from "./client";
import type { MarketIntelligenceHandoff } from "./contract";
import {
  EMPTY_REMOTE_REF,
  resolveOrganizationId,
  serializeRemoteRefs,
  type MissionStatus,
  type RemoteMissionRef,
} from "./mission";

const handoffsTable = () => (supabaseAdmin as any).from("intelligence_handoffs"); // eslint-disable-line @typescript-eslint/no-explicit-any

export interface HandoffOutcome {
  attempted: boolean;
  status: MissionStatus;
  /** Remote refs, when the receiver returned any (or when a stored outcome
   *  is replayed by the pre-send check). Absent means "none returned". */
  remote?: RemoteMissionRef;
  error?: string;
}

interface StoredHandoffRow {
  status?: unknown;
  mission_id?: unknown;
  execution_id?: unknown;
  remote_status?: unknown;
  remote_refs?: unknown;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseStoredRemote(row: StoredHandoffRow): RemoteMissionRef {
  const refs = row.remote_refs !== null && typeof row.remote_refs === "object" && !Array.isArray(row.remote_refs)
    ? (row.remote_refs as Record<string, unknown>)
    : null;
  const files = refs && Array.isArray(refs.result_files)
    ? (refs.result_files as unknown[])
        .map((item) => {
          if (typeof item === "string" && item.trim()) return { name: null, url: item.trim() };
          if (item !== null && typeof item === "object" && !Array.isArray(item)) {
            const rec = item as Record<string, unknown>;
            const url = asNonEmptyString(rec.url);
            return url ? { name: asNonEmptyString(rec.name), url } : null;
          }
          return null;
        })
        .filter((f): f is { name: string | null; url: string } => f !== null)
    : [];
  return {
    mission_id: asNonEmptyString(row.mission_id),
    execution_id: asNonEmptyString(row.execution_id),
    remote_status: asNonEmptyString(row.remote_status),
    review_url: refs ? asNonEmptyString(refs.review_url) : null,
    result_files: files,
    received_at: refs ? asNonEmptyString(refs.received_at) : null,
  };
}

/** Reads the stored row for one handoff_id, defensively: select("*") so the
 *  read works both before and after migration 20261029000000 (new columns
 *  simply read as undefined pre-migration). Returns null on any error —
 *  a failed read must never block a first send. */
async function readStoredRow(handoffId: string): Promise<StoredHandoffRow | null> {
  try {
    const { data, error } = await handoffsTable()
      .select("*")
      .eq("handoff_id", handoffId)
      .maybeSingle();
    if (error || !data) return null;
    return data as StoredHandoffRow;
  } catch {
    return null;
  }
}

/**
 * Sends `handoff` for (sourceTable, sourceId), tracking status so a retry of
 * the same source row reuses the same handoff_id (idempotent) instead of
 * creating a new opportunity on the Cris OS side.
 */
export async function handoffToCrisOs(
  handoff: MarketIntelligenceHandoff,
  sourceTable: string,
  sourceId: string,
  userId: string | null,
): Promise<HandoffOutcome> {
  if (!isCrisOsConfigured()) {
    // Not an error: Cris OS integration is opt-in via env vars. Record
    // NOT_SENT so it's visible it was never attempted, not silently lost.
    await upsertStatus(handoff.handoff_id, sourceTable, sourceId, userId, "NOT_SENT", 0, null);
    return { attempted: false, status: "NOT_SENT" };
  }

  // Server-side pre-send check (the old code only disabled the button in
  // the UI — a direct repeat call re-POSTed). Replaying a stored terminal
  // outcome is always safe: same handoff_id, same payload, same result.
  const stored = await readStoredRow(handoff.handoff_id);
  if (stored?.status === "SENT" || stored?.status === "NEEDS_REVIEW") {
    return { attempted: false, status: stored.status, remote: parseStoredRemote(stored) };
  }
  if (stored?.status === "SENDING") {
    return { attempted: false, status: "SENDING" };
  }

  await upsertStatus(handoff.handoff_id, sourceTable, sourceId, userId, "SENDING", 0, null);

  try {
    const result = await sendIntelligence(handoff);
    const status = result.status;
    const remote = result.remote ?? EMPTY_REMOTE_REF;
    await upsertStatus(
      handoff.handoff_id,
      sourceTable,
      sourceId,
      userId,
      status,
      result.attempts,
      result.error ?? null,
      status === "SENT" ? new Date().toISOString() : null,
      remote,
    );
    return { attempted: true, status, remote, error: result.error };
  } catch (err) {
    // sendIntelligence() is designed to never throw, but this is the last
    // line of defense — a Cris OS problem must never propagate to the caller.
    const message = err instanceof Error ? err.message : String(err);
    await upsertStatus(handoff.handoff_id, sourceTable, sourceId, userId, "FAILED", 1, message);
    return { attempted: true, status: "FAILED", error: message };
  }
}

async function upsertStatus(
  handoffId: string,
  sourceTable: string,
  sourceId: string,
  userId: string | null,
  status: string,
  attempts: number,
  lastError: string | null,
  sentAt: string | null = null,
  remote: RemoteMissionRef | null = null,
) {
  try {
    await handoffsTable().upsert(
      {
        handoff_id: handoffId,
        source_table: sourceTable,
        source_id: sourceId,
        user_id: userId,
        status,
        attempts,
        last_error: lastError,
        sent_at: sentAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "handoff_id" },
    );
  } catch (e) {
    // Status tracking is best-effort observability, not a source of truth
    // for whether ScalaFlow's own action succeeded — never let it throw.
    console.error("[cris-os] failed to persist handoff status:", e);
    return;
  }

  // Extended columns live in migration 20261029000000. Written separately
  // and best-effort: if the migration hasn't been applied yet, this fails
  // silently (logged) while the base status row above stays intact.
  // Skipped entirely when there is nothing remote to record (and no org
  // configured) — a plain SENT keeps the single-upsert behavior.
  const hasRemoteContent =
    remote !== null &&
    (remote.mission_id !== null ||
      remote.execution_id !== null ||
      remote.remote_status !== null ||
      remote.review_url !== null ||
      remote.result_files.length > 0);
  if (remote && (hasRemoteContent || resolveOrganizationId() !== null)) {
    try {
      await handoffsTable().upsert(
        {
          handoff_id: handoffId,
          source_table: sourceTable,
          source_id: sourceId,
          status,
          organization_id: resolveOrganizationId(),
          mission_id: remote.mission_id,
          execution_id: remote.execution_id,
          remote_status: remote.remote_status,
          remote_refs: serializeRemoteRefs(remote),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "handoff_id" },
      );
    } catch (e) {
      console.error("[cris-os] failed to persist handoff remote refs (migration pending?):", e);
    }
  }
}
