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
import { handoffToCrisOs, refreshCrisOsStatus } from "@/lib/cris-os/service";

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
  status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED";
  created_at: string;
  sent_at: string | null;
  last_error: string | null;
  remote_status?: string | null;
  remote_project_id?: string | null;
  remote_response?: Record<string, unknown> | null;
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
  status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED";
  createdAt: string;
  sentAt: string | null;
  lastError: string | null;
  remoteStatus: string | null;
  remoteProjectId: string | null;
  remoteResponse: Record<string, unknown> | null;
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

  return {
    found: true,
    handoffId: handoffRow.handoff_id,
    sourceTable: handoffRow.source_table,
    sourceId: handoffRow.source_id,
    status: handoffRow.status,
    createdAt: handoffRow.created_at,
    sentAt: handoffRow.sent_at,
    lastError: handoffRow.last_error,
    remoteStatus: handoffRow.remote_status ?? null,
    remoteProjectId: handoffRow.remote_project_id ?? null,
    remoteResponse: handoffRow.remote_response ?? null,
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
 *  have happened — those are future phases, never implied here. */
export function statusLabelForHandoff(
  status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED",
  remoteStatus?: string | null,
): string {
  if (remoteStatus === "NEEDS_REVIEW")
    return "Recebido pelo Cris OS — aguardando revisão humana";
  if (remoteStatus === "PERSISTED" || remoteStatus === "DUPLICATE")
    return "Oportunidade registada no Cris OS — planeamento ainda não iniciado";
  if (remoteStatus === "REJECTED")
    return "Cris OS rejeitou os dados — consulte os avisos";
  if (status === "SENT" && (!remoteStatus || remoteStatus === "UNKNOWN"))
    return "Pedido enviado — a confirmação do Cris OS ainda não foi recebida";
  switch (status) {
    case "SENT":
      return "Projeto criado — aguardando planejamento";
    case "SENDING":
      return "Enviando…";
    case "FAILED":
      return "Falha ao enviar";
    default:
      return "Ainda não enviado";
  }
}

/** Lets the UI show "✓ Já enviado" instead of re-sending on every render.
 *  When already SENT, also hands back the real identifiers the UI needs to
 *  open the project view (handoff_id / source_table / source_id) — the
 *  button propagates these itself so consumers never recompute or
 *  duplicate this lookup. */
export const checkTransformStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdentifyInput>) => IdentifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    const row = await findCollectedAd(data);
    if (!row || !userId) return { sent: false };
    const handoffId = computeHandoffId("collected_ad_transform", opportunityIdFor(row));
    const { data: statusRow } = await supabaseAdmin
      .from("intelligence_handoffs")
      .select("status, source_table, source_id")
      .eq("handoff_id", handoffId)
      .eq("user_id", userId)
      .maybeSingle();
    if (statusRow?.status !== "SENT") return { sent: false };
    return {
      sent: true,
      handoffId,
      sourceTable: statusRow.source_table as string,
      sourceId: statusRow.source_id as string,
    };
  });

export const transformToProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdentifyInput>) => IdentifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    const row = await findCollectedAd(data);
    if (!row) return { ok: false, error: "Oportunidade não encontrada." };

    const handoff = buildHandoffFromCollectedAd(row);
    const outcome = await handoffToCrisOs(handoff, "collected_ads", row.id, userId);

    if (outcome.status === "SENT")
      return {
        ok: true as const,
        handoffId: handoff.handoff_id,
        remoteStatus: outcome.remoteResponse?.status ?? "UNKNOWN",
        remoteProjectId: outcome.remoteResponse?.project_id ?? null,
        remoteWarnings: outcome.remoteResponse?.warnings ?? [],
        remoteErrors: outcome.remoteResponse?.errors ?? [],
      };
    if (outcome.status === "NOT_SENT")
      return { ok: false as const, error: "Envio para execução não está disponível no momento." };
    return {
      ok: false as const,
      error: outcome.error ?? "Não foi possível enviar. Tente novamente.",
      remoteStatus: outcome.remoteResponse?.status ?? "UNKNOWN",
      remoteErrors: outcome.remoteResponse?.errors ?? [],
      remoteWarnings: outcome.remoteResponse?.warnings ?? [],
    };
  });

/** Read-only summary of a real intelligence_handoffs row, for the "Ver
 *  Projeto" navigation. Never touches Cris OS, never re-sends anything —
 *  purely reads what ScalaFlow already persisted. Returns only fields that
 *  are genuinely stored; a project_id would go here once Cris OS starts
 *  returning/persisting one (it does not today). */
export const loadHandoffProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof HandoffIdInput>) => HandoffIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    if (!userId) return { found: false as const };
    const query = () => supabaseAdmin
      .from("intelligence_handoffs")
      .select("handoff_id, source_table, source_id, status, created_at, sent_at, last_error, remote_status, remote_project_id, remote_response")
      .eq("handoff_id", data.handoffId)
      .eq("user_id", userId);
    const { data: initialRow } = await query().maybeSingle();
    if (!initialRow) return { found: false as const };
    // Cris OS status is read-only. If it is temporarily unavailable, keep
    // and display the last response persisted by the send operation.
    await refreshCrisOsStatus(data.handoffId);
    const { data: handoffRow } = await query().maybeSingle();
    if (!handoffRow) return { found: false as const };

    let ad: CollectedAdSummaryRow | null = null;
    if (handoffRow.source_table === "collected_ads") {
      const { data: adRow } = await supabaseAdmin
        .from("collected_ads")
        .select("headline, advertiser, platform, score, niche, country, image_url, video_url")
        .eq("id", handoffRow.source_id)
        .maybeSingle();
      ad = adRow ?? null;
    }

    return buildHandoffProjectView(handoffRow as HandoffRow, ad);
  });

/** Read-only list of every SENT handoff, for the "Continuar onde parou"
 *  grid in the existing Projetos area — so a handoff-derived opportunity
 *  (e.g. Carla Figurinhas, Suitable) shows up there too, clearly marked as
 *  coming from Inteligência de Mercado instead of the legacy `projects`
 *  pipeline. Never sends anything; reuses buildHandoffProjectView so this
 *  list and the single-item "Ver Projeto" view can never disagree. */
export const listSentHandoffProjectsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as { userId?: string }).userId ?? null;
    if (!userId) return [];
    const { data: handoffRows } = await supabaseAdmin
      .from("intelligence_handoffs")
      .select("handoff_id, source_table, source_id, status, created_at, sent_at, last_error, remote_status, remote_project_id, remote_response")
      .eq("user_id", userId)
      .eq("status", "SENT")
      .order("created_at", { ascending: false });
    if (!handoffRows) return [];

    const views: HandoffProjectView[] = [];
    for (const h of handoffRows) {
      let ad: CollectedAdSummaryRow | null = null;
      if (h.source_table === "collected_ads") {
        const { data: adRow } = await supabaseAdmin
          .from("collected_ads")
          .select("headline, advertiser, platform, score, niche, country, image_url, video_url")
          .eq("id", h.source_id)
          .maybeSingle();
        ad = adRow ?? null;
      }
      views.push(buildHandoffProjectView(h as HandoffRow, ad));
    }
    return views;
  });
