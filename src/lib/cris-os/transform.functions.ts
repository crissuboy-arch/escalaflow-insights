// "Transformar em Projeto" — sends a saved/scaled offer (collected_ads) into
// the existing ScalaFlow -> intelligence handoff pipeline. Reuses the same
// transport/contract/service already validated for TikTok; this file only
// adds a second producer (collected_ads instead of anuncios_escalados).
//
// Server-side only: fetches the row itself instead of trusting client-sent
// fields, so nothing about the outbound payload is client-controlled.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildHandoffFromCollectedAd,
  computeHandoffId,
  type CollectedAdRow,
} from "@/lib/cris-os/contract";
import { handoffToCrisOs } from "@/lib/cris-os/service";
import {
  parseRemoteRefs,
  statusLabelForMission,
  type MissionStatus,
} from "@/lib/cris-os/mission";
import { getCrisOsMissionStatus } from "@/lib/missions/adapters/cris-os";

const IdentifyInput = z.object({
  adLibraryId: z.string().optional(),
  adUrl: z.string().optional(),
});

const HandoffIdInput = z.object({
  handoffId: z.string().min(1),
});

async function findCollectedAd(input: {
  adLibraryId?: string;
  adUrl?: string;
}): Promise<CollectedAdRow | null> {
  if (input.adLibraryId) {
    const { data } = await supabaseAdmin
      .from("collected_ads")
      .select("*")
      .eq("ad_library_id", input.adLibraryId)
      .maybeSingle();
    if (data) return data as unknown as CollectedAdRow;
  }
  if (input.adUrl) {
    const { data } = await supabaseAdmin
      .from("collected_ads")
      .select("*")
      .eq("ad_url", input.adUrl)
      .maybeSingle();
    if (data) return data as unknown as CollectedAdRow;
  }
  return null;
}

function opportunityIdFor(row: CollectedAdRow): string {
  const identity = row.ad_library_id || row.ad_url || row.id;
  return `${(row.platform || "Unknown").toLowerCase()}:${identity}`;
}

export interface HandoffRow {
  handoff_id: string;
  source_table: string;
  source_id: string;
  status: MissionStatus;
  created_at: string;
  sent_at: string | null;
  last_error: string | null;
  /** Attempts recorded by the service (0 when the row predates tracking). */
  attempts?: number | null;
  /** Remote refs — only present when the receiver returned them AND
   *  migration 20261029000000 has been applied; otherwise null. */
  mission_id?: string | null;
  execution_id?: string | null;
  remote_status?: string | null;
  remote_refs?: unknown;
}

/** Defensive mapping from a stored row (select("*")) to HandoffRow — works
 *  both before and after migration 20261029000000, since new columns read
 *  as undefined pre-migration instead of failing the whole query. */
function toHandoffRow(row: Record<string, unknown>): HandoffRow {
  const asStr = (v: unknown): string | null =>
    typeof v === "string" && v ? v : null;
  return {
    handoff_id: String(row.handoff_id ?? ""),
    source_table: String(row.source_table ?? ""),
    source_id: String(row.source_id ?? ""),
    status: (row.status as MissionStatus) ?? "NOT_SENT",
    created_at: String(row.created_at ?? ""),
    sent_at: asStr(row.sent_at),
    last_error: asStr(row.last_error),
    attempts: typeof row.attempts === "number" ? row.attempts : null,
    mission_id: asStr(row.mission_id),
    execution_id: asStr(row.execution_id),
    remote_status: asStr(row.remote_status),
    remote_refs: row.remote_refs ?? null,
  };
}

export interface CollectedAdSummaryRow {
  headline: string | null;
  advertiser: string | null;
  platform: string | null;
  score: number | null;
  niche: string | null;
  country: string | null;
  // Same fields /minerar's card already reads (image_url first, then
  // video_url) — reused here as-is, never a new/invented media source.
  image_url: string | null;
  video_url: string | null;
}

export interface HandoffProjectView {
  found: true;
  handoffId: string;
  sourceTable: string;
  sourceId: string;
  status: MissionStatus;
  createdAt: string;
  sentAt: string | null;
  lastError: string | null;
  attempts: number | null;
  /** Remote refs, only when actually returned by the receiver. */
  missionId: string | null;
  executionId: string | null;
  remoteStatus: string | null;
  reviewUrl: string | null;
  resultFiles: { name: string | null; url: string }[];
  opportunity: {
    title: string | null;
    platform: string | null;
    score: number | null;
    niche: string | null;
    country: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
  } | null;
}

/** Pure shaping of the "Ver Projeto" view from already-fetched rows — no
 *  Supabase/network calls here, so this is unit-testable with fixtures
 *  (e.g. Carla Figurinhas) without mocking the database. Never invents a
 *  project_id: only real, already-stored identifiers are surfaced. */
export function buildHandoffProjectView(
  handoffRow: HandoffRow,
  ad: CollectedAdSummaryRow | null,
): HandoffProjectView {
  const opportunity =
    handoffRow.source_table === "collected_ads" && ad
      ? {
          title: ad.headline || ad.advertiser || null,
          platform: ad.platform ?? null,
          score: ad.score ?? null,
          niche: ad.niche ?? null,
          country: ad.country ?? null,
          imageUrl: ad.image_url ?? null,
          videoUrl: ad.video_url ?? null,
        }
      : null;

  const remoteRefs = parseRemoteRefs(handoffRow.remote_refs ?? null);

  return {
    found: true,
    handoffId: handoffRow.handoff_id,
    sourceTable: handoffRow.source_table,
    sourceId: handoffRow.source_id,
    status: handoffRow.status,
    createdAt: handoffRow.created_at,
    sentAt: handoffRow.sent_at,
    lastError: handoffRow.last_error,
    attempts: handoffRow.attempts ?? null,
    missionId: handoffRow.mission_id ?? null,
    executionId: handoffRow.execution_id ?? null,
    remoteStatus: handoffRow.remote_status ?? null,
    reviewUrl: remoteRefs.review_url,
    resultFiles: remoteRefs.result_files,
    opportunity,
  };
}

export interface HandoffProjectListItem {
  kind: "handoff";
  handoffId: string;
  title: string;
  platform: string | null;
  score: number | null;
  niche: string | null;
  country: string | null;
  createdAt: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

/** Pure mapping for the "Continuar onde parou" grid — one list item per
 *  handoff, each carrying only ITS OWN handoff_id (and its own media, from
 *  the same source row — never resolved by title/name). There is no shared
 *  mutable state or "first match" lookup here, so two different handoffs
 *  (e.g. Carla Figurinhas and Suitable) can never bleed into each other. */
export function toHandoffProjectListItem(view: HandoffProjectView): HandoffProjectListItem {
  return {
    kind: "handoff",
    handoffId: view.handoffId,
    title: view.opportunity?.title ?? "Oportunidade",
    platform: view.opportunity?.platform ?? null,
    score: view.opportunity?.score ?? null,
    niche: view.opportunity?.niche ?? null,
    country: view.opportunity?.country ?? null,
    createdAt: view.createdAt,
    imageUrl: view.opportunity?.imageUrl ?? null,
    videoUrl: view.opportunity?.videoUrl ?? null,
  };
}

/** The only status label allowed for SENT today: a real project record
 *  exists in ScalaFlow, but no BusinessPlan/Approval/ExecutionPlan/Tasks
 *  have happened — those are future phases, never implied here.
 *  NEEDS_REVIEW maps to "Aguardando revisão" and must never render as a
 *  concluded state (see mission.ts). */
export function statusLabelForHandoff(status: MissionStatus): string {
  return statusLabelForMission(status);
}

/** Lets the UI show "✓ Já enviado" instead of re-sending on every render.
 *  When already SENT, also hands back the real identifiers the UI needs to
 *  open the project view (handoff_id / source_table / source_id) — the
 *  button propagates these itself so consumers never recompute or
 *  duplicate this lookup.
 *  USER-SCOPED (Fase 1): rows are filtered by the authenticated user_id —
 *  the old code read through service-role with no user filter, so one user
 *  could see another's handoffs. NEEDS_REVIEW is reported separately from
 *  `sent`: it must never render as a concluded project. */
export const checkTransformStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdentifyInput>) => IdentifyInput.parse(d))
  .handler(async ({ data, context }: { data: z.infer<typeof IdentifyInput>; context: { userId?: string } }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    const row = await findCollectedAd(data);
    if (!row) return { sent: false, needsReview: false };
    const handoffId = computeHandoffId("collected_ad_transform", opportunityIdFor(row));
    let query = supabaseAdmin
      .from("intelligence_handoffs")
      .select("*")
      .eq("handoff_id", handoffId);
    if (userId) query = query.eq("user_id", userId);
    const { data: statusRow } = await query.maybeSingle();
    if (!statusRow) return { sent: false, needsReview: false };
    const stored = toHandoffRow(statusRow as Record<string, unknown>);
    if (stored.status === "SENT") {
      return {
        sent: true,
        needsReview: false,
        handoffId,
        sourceTable: stored.source_table,
        sourceId: stored.source_id,
      };
    }
    if (stored.status === "NEEDS_REVIEW") {
      return {
        sent: false,
        needsReview: true,
        handoffId,
        sourceTable: stored.source_table,
        sourceId: stored.source_id,
      };
    }
    return { sent: false, needsReview: false };
  });

export const transformToProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdentifyInput>) => IdentifyInput.parse(d))
  .handler(async ({ data, context }: { data: z.infer<typeof IdentifyInput>; context: { userId?: string } }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    const row = await findCollectedAd(data);
    if (!row) return { ok: false, error: "Oportunidade não encontrada." };

    const handoff = buildHandoffFromCollectedAd(row);
    const outcome = await handoffToCrisOs(handoff, "collected_ads", row.id, userId);

    if (outcome.status === "SENT") return { ok: true as const, handoffId: handoff.handoff_id };
    if (outcome.status === "NEEDS_REVIEW")
      return {
        ok: true as const,
        needsReview: true as const,
        handoffId: handoff.handoff_id,
        missionId: outcome.remote?.mission_id ?? null,
        executionId: outcome.remote?.execution_id ?? null,
      };
    if (outcome.status === "SENDING")
      return { ok: false as const, error: "Envio já em curso. Tente novamente em instantes." };
    if (outcome.status === "NOT_SENT")
      return { ok: false as const, error: "Envio para execução não está disponível no momento." };
    return { ok: false as const, error: "Não foi possível enviar. Tente novamente." };
  });

/** Read-only summary of a real intelligence_handoffs row, for the "Ver
 *  Projeto" navigation. Never touches Cris OS, never re-sends anything —
 *  purely reads what ScalaFlow already persisted. Returns only fields that
 *  are genuinely stored; a project_id would go here once Cris OS starts
 *  returning/persisting one (it does not today).
 *  USER-SCOPED (Fase 1): a user can only open their own handoff rows. */
export const loadHandoffProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof HandoffIdInput>) => HandoffIdInput.parse(d))
  .handler(async ({ data, context }: { data: z.infer<typeof HandoffIdInput>; context: { userId?: string } }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    let query = supabaseAdmin.from("intelligence_handoffs").select("*").eq("handoff_id", data.handoffId);
    if (userId) query = query.eq("user_id", userId);
    const { data: handoffRowRaw } = await query.maybeSingle();
    if (!handoffRowRaw) return { found: false as const };
    const handoffRow = toHandoffRow(handoffRowRaw as Record<string, unknown>);

    let ad: CollectedAdSummaryRow | null = null;
    if (handoffRow.source_table === "collected_ads") {
      const { data: adRow } = await supabaseAdmin
        .from("collected_ads")
        .select("headline, advertiser, platform, score, niche, country, image_url, video_url")
        .eq("id", handoffRow.source_id)
        .maybeSingle();
      ad = adRow ?? null;
    }

    return buildHandoffProjectView(handoffRow, ad);
  });

/** Read-only list of the authenticated user's SENT handoffs, for the
 *  "Continuar onde parou" grid in the existing Projetos area — so a
 *  handoff-derived opportunity (e.g. Carla Figurinhas, Suitable) shows up
 *  there too, clearly marked as coming from Inteligência de Mercado
 *  instead of the legacy `projects` pipeline. Never sends anything;
 *  reuses buildHandoffProjectView so this list and the single-item "Ver
 *  Projeto" view can never disagree.
 *  USER-SCOPED (Fase 1): the old code listed every SENT row in the base.
 *  NEEDS_REVIEW rows are intentionally NOT in this legacy grid — they
 *  surface in the Ferramentas panel (Fase 2) and in the handoff view, so
 *  "awaiting review" is never mistaken for a created project here. */
export const listSentHandoffProjectsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId?: string } }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    let query = supabaseAdmin
      .from("intelligence_handoffs")
      .select("*")
      .eq("status", "SENT")
      .order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data: handoffRowsRaw } = await query;
    if (!handoffRowsRaw) return [];

    const views: HandoffProjectView[] = [];
    for (const h of handoffRowsRaw) {
      const handoffRow = toHandoffRow(h as Record<string, unknown>);
      let ad: CollectedAdSummaryRow | null = null;
      if (handoffRow.source_table === "collected_ads") {
        const { data: adRow } = await supabaseAdmin
          .from("collected_ads")
          .select("headline, advertiser, platform, score, niche, country, image_url, video_url")
          .eq("id", handoffRow.source_id)
          .maybeSingle();
        ad = adRow ?? null;
      }
      views.push(buildHandoffProjectView(handoffRow, ad));
    }
    return views;
  });

/**
 * Full handoff history for the Ferramentas panel (Fase 2): EVERY handoff
 * of the authenticated user, any status, newest first — the source of the
 * panel's Tarefas / Resultados / Histórico / Erros sections. Unlike the
 * legacy SENT-only grid above, NEEDS_REVIEW and FAILED rows appear here
 * with their honest labels, and remote refs only when actually returned.
 * READ-ONLY, user-scoped (same Fase 1 rule as the other reads). */
export const listHandoffProjectsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId?: string } }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    let query = supabaseAdmin
      .from("intelligence_handoffs")
      .select("*")
      .order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data: handoffRowsRaw } = await query;
    if (!handoffRowsRaw) return [];

    const views: HandoffProjectView[] = [];
    for (const h of handoffRowsRaw) {
      const handoffRow = toHandoffRow(h as Record<string, unknown>);
      let ad: CollectedAdSummaryRow | null = null;
      if (handoffRow.source_table === "collected_ads") {
        const { data: adRow } = await supabaseAdmin
          .from("collected_ads")
          .select("headline, advertiser, platform, score, niche, country, image_url, video_url")
          .eq("id", handoffRow.source_id)
          .maybeSingle();
        ad = adRow ?? null;
      }
      views.push(buildHandoffProjectView(handoffRow, ad));
    }
    return views;
  });

/**
 * Authenticated status query for one handoff — the Fase 1 polling hook,
 * aligned in Fase 3 with the real Cris OS status endpoint
 * (GET {base}/{handoff_id}/status, audited in cris-os
 * web/backend/routes/market_intelligence.py). READ-ONLY: it never rewrites
 * the local record.
 *
 * - Without CRIS_OS_STATUS_URL configured and without a derivable base
 *   from CRIS_OS_API_URL, it returns the local record with source "local"
 *   (the only truth ScalaFlow has today).
 * - With a base, it returns the live Cris OS snapshot alongside the local
 *   one (project status, business plan, approval, execution plan, tasks,
 *   work orders + output refs). Remote statuses are surfaced verbatim;
 *   an unknown remote status is NEVER remapped to a local concluded state.
 */
export const getHandoffExecutionStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof HandoffIdInput>) => HandoffIdInput.parse(d))
  .handler(async ({ data, context }: { data: z.infer<typeof HandoffIdInput>; context: { userId?: string } }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    let query = supabaseAdmin.from("intelligence_handoffs").select("*").eq("handoff_id", data.handoffId);
    if (userId) query = query.eq("user_id", userId);
    const { data: handoffRowRaw } = await query.maybeSingle();
    if (!handoffRowRaw) return { found: false as const };
    const handoffRow = toHandoffRow(handoffRowRaw as Record<string, unknown>);
    const local = buildHandoffProjectView(handoffRow, null);

    const remote = await getCrisOsMissionStatus(data.handoffId);
    if (!remote.configured) {
      return { found: true as const, source: "local" as const, local, remote: null };
    }
    if (!remote.ok) {
      return {
        found: true as const,
        source: "local" as const,
        local,
        remote: null,
        remoteError: remote.error,
      };
    }
    if (!remote.found || !remote.snapshot) {
      return {
        found: true as const,
        source: "local" as const,
        local,
        remote: null,
        remoteError: "handoff desconhecido no Cris OS (404)",
      };
    }
    return { found: true as const, source: "remote" as const, local, remote: remote.snapshot };
  });
