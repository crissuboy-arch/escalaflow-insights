// Orchestrates one handoff: idempotent status row in intelligence_handoffs +
// calling the CrisOsIntelligenceClient. Never throws — a Cris OS outage (or
// missing config) must never break the caller's own action (e.g. TikTok
// "Escalar"), so every path here resolves to a safe, loggable result.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getIntelligenceStatus, isCrisOsConfigured, sendIntelligence, type CrisOsReceiveResponse } from "./client";
import type { MarketIntelligenceHandoff } from "./contract";

const handoffsTable = () => (supabaseAdmin as any).from("intelligence_handoffs"); // eslint-disable-line @typescript-eslint/no-explicit-any

export interface HandoffOutcome {
  attempted: boolean;
  status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED";
  error?: string;
  remoteResponse?: CrisOsReceiveResponse;
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

  await upsertStatus(handoff.handoff_id, sourceTable, sourceId, userId, "SENDING", 0, null);

  try {
    const result = await sendIntelligence(handoff);
    const status = result.status;
    await upsertStatus(
      handoff.handoff_id,
      sourceTable,
      sourceId,
      userId,
      status,
      result.attempts,
      result.error ?? null,
      status === "SENT" ? new Date().toISOString() : null,
      result.remoteResponse,
    );
    return { attempted: true, status, error: result.error, remoteResponse: result.remoteResponse };
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
  remoteResponse: CrisOsReceiveResponse | null = null,
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
        remote_status: remoteResponse?.status ?? null,
        remote_project_id: remoteResponse?.project_id ?? null,
        remote_response: remoteResponse ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "handoff_id" },
    );
  } catch (e) {
    // Status tracking is best-effort observability, not a source of truth
    // for whether ScalaFlow's own action succeeded — never let it throw.
    console.error("[cris-os] failed to persist handoff status:", e);
  }
}


/** Refresh the read-only project snapshot; never advances planning or execution. */
export async function refreshCrisOsStatus(
  handoffId: string,
): Promise<CrisOsReceiveResponse | null> {
  const remote = await getIntelligenceStatus(handoffId);
  if (!remote) return null;
  try {
    await handoffsTable()
      .update({
        remote_status: remote.status ?? null,
        remote_project_id: remote.project_id ?? null,
        remote_response: remote,
        updated_at: new Date().toISOString(),
      })
      .eq("handoff_id", handoffId);
  } catch (e) {
    console.error("[cris-os] failed to refresh remote handoff status:", e);
  }
  return remote;
}
