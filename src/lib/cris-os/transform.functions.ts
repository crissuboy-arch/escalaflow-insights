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
}

export interface CollectedAdSummaryRow {
  headline: string | null;
  advertiser: string | null;
  platform: string | null;
  score: number | null;
  niche: string | null;
  country: string | null;
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
  opportunity: {
    title: string | null;
    platform: string | null;
    score: number | null;
    niche: string | null;
    country: string | null;
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
    opportunity,
  };
}

/** The only status label allowed for SENT today: a real project record
 *  exists in ScalaFlow, but no BusinessPlan/Approval/ExecutionPlan/Tasks
 *  have happened — those are future phases, never implied here. */
export function statusLabelForHandoff(status: "NOT_SENT" | "SENDING" | "SENT" | "FAILED"): string {
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
  .handler(async ({ data }) => {
    const row = await findCollectedAd(data);
    if (!row) return { sent: false };
    const handoffId = computeHandoffId("collected_ad_transform", opportunityIdFor(row));
    const { data: statusRow } = await supabaseAdmin
      .from("intelligence_handoffs")
      .select("status, source_table, source_id")
      .eq("handoff_id", handoffId)
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

    if (outcome.status === "SENT") return { ok: true as const, handoffId: handoff.handoff_id };
    if (outcome.status === "NOT_SENT")
      return { ok: false as const, error: "Envio para execução não está disponível no momento." };
    return { ok: false as const, error: "Não foi possível enviar. Tente novamente." };
  });

/** Read-only summary of a real intelligence_handoffs row, for the "Ver
 *  Projeto" navigation. Never touches Cris OS, never re-sends anything —
 *  purely reads what ScalaFlow already persisted. Returns only fields that
 *  are genuinely stored; a project_id would go here once Cris OS starts
 *  returning/persisting one (it does not today). */
export const loadHandoffProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof HandoffIdInput>) => HandoffIdInput.parse(d))
  .handler(async ({ data }) => {
    const { data: handoffRow } = await supabaseAdmin
      .from("intelligence_handoffs")
      .select("handoff_id, source_table, source_id, status, created_at, sent_at, last_error")
      .eq("handoff_id", data.handoffId)
      .maybeSingle();
    if (!handoffRow) return { found: false as const };

    let ad: CollectedAdSummaryRow | null = null;
    if (handoffRow.source_table === "collected_ads") {
      const { data: adRow } = await supabaseAdmin
        .from("collected_ads")
        .select("headline, advertiser, platform, score, niche, country")
        .eq("id", handoffRow.source_id)
        .maybeSingle();
      ad = adRow ?? null;
    }

    return buildHandoffProjectView(handoffRow as HandoffRow, ad);
  });
