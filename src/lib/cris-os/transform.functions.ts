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

/** Lets the UI show "✓ Já enviado" instead of re-sending on every render. */
export const checkTransformStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof IdentifyInput>) => IdentifyInput.parse(d))
  .handler(async ({ data }) => {
    const row = await findCollectedAd(data);
    if (!row) return { sent: false };
    const handoffId = computeHandoffId("collected_ad_transform", opportunityIdFor(row));
    const { data: statusRow } = await supabaseAdmin
      .from("intelligence_handoffs")
      .select("status")
      .eq("handoff_id", handoffId)
      .maybeSingle();
    return { sent: statusRow?.status === "SENT" };
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

    if (outcome.status === "SENT") return { ok: true };
    if (outcome.status === "NOT_SENT")
      return { ok: false, error: "Envio para execução não está disponível no momento." };
    return { ok: false, error: "Não foi possível enviar. Tente novamente." };
  });
