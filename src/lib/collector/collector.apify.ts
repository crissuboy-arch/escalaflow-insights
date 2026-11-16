// Internal provider for the "Motor de Coleta".
// IMPORTANT: this module is server-only. The provider name must NEVER be
// surfaced in the UI — it is an implementation detail.

import type { CollectorProvider, CollectorRunInput } from "./collector.types";
import { APIFY_ACTORS } from "@/config/apify-actors";
import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";

/** Tempo máximo da corrida síncrona (segundos). Padrão igual ao anterior
 *  (120s); COLLECTOR_SYNC_TIMEOUT_SEC permite baixá-lo para ficar abaixo do
 *  maxDuration da função na Vercel — assim a resposta (sucesso OU erro claro
 *  de tempo esgotado) chega sempre à UI em vez de a plataforma cortar o
 *  pedido a meio. */
function syncTimeoutSec(): number {
  const v = Number(process.env.COLLECTOR_SYNC_TIMEOUT_SEC);
  return Number.isFinite(v) && v >= 10 && v <= 300 ? Math.floor(v) : 120;
}

export function buildAdLibrarySearchUrl(input: CollectorRunInput): string {
  const country = (input.country || "ALL").toUpperCase();
  return (
    `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${encodeURIComponent(country)}` +
    `&q=${encodeURIComponent(input.keyword)}&search_type=keyword_unordered&media_type=all`
  );
}

/**
 * Input do actor da Biblioteca de Anúncios. Os dois actors suportados têm
 * schemas DIFERENTES — antes este ficheiro mandava sempre o schema do
 * curious_coder, mas o fallback de APIFY_ACTORS.facebook() (quando a env não
 * está definida) é apify~facebook-ads-scraper, que espera `startUrls` +
 * `resultsLimit` e ignorava `urls`/`count` → corrida sem URL = 0 resultados.
 */
export function buildFacebookAdsPayload(actorId: string, input: CollectorRunInput) {
  const url = buildAdLibrarySearchUrl(input);
  const limit = Math.min(Math.max(input.limit ?? 20, 10), 100);
  const id = actorId.toLowerCase();

  if (id.includes("curious_coder")) {
    return {
      urls: [{ url }],
      // curious_coder rejects "Maximum charged results" below 10 (confirmed
      // 2026-09-15: input=5 -> actor error).
      count: limit,
      "scrapePageAds.activeStatus": "active",
      // Os detalhes por anúncio (transparência UE etc.) não são usados pelo
      // normalizador e tornavam a corrida lenta o bastante para estourar o
      // tempo limite → nenhuma oferta guardada. A pesquisa já traz snapshot
      // (copy, imagens, vídeos), start_date, collation_count e plataformas.
      scrapeAdDetails: false,
      scrapeAdvertiserPage: false,
    };
  }
  if (id.includes("facebook-ads-scraper")) {
    return {
      startUrls: [{ url }],
      resultsLimit: limit,
      activeStatus: "active",
      isDetailsPerAd: false,
      onlyTotal: false,
    };
  }
  // Actor desconhecido: manda os dois formatos (campos extra são ignorados).
  return {
    startUrls: [{ url }],
    urls: [{ url }],
    resultsLimit: limit,
    count: limit,
    activeStatus: "active",
  };
}

export function createProvider(): CollectorProvider {
  return {
    async run(input: CollectorRunInput) {
      if (!process.env.APIFY_TOKEN) throw new Error("Motor de Coleta não configurado.");
      const actor = APIFY_ACTORS.facebook();
      const payload = buildFacebookAdsPayload(actor, input);

      console.log(`[collector] actor=${actor}`);
      console.log(`[collector] payload=${JSON.stringify(payload)}`);

      // Delegate to the shared client, which normalizes "owner/actor-name" ->
      // "owner~actor-name" (Apify's REST API 404s on the raw slash form), and
      // which now throws on an error-only dataset ([{"error": "..."}] with
      // HTTP 200 — confirmed 2026-09-15 for invalid input) instead of letting
      // it become a fake "Anunciante" ad or a silent empty list.
      const items = await runSyncGetDatasetItems<Record<string, unknown>>(
        actor,
        payload,
        syncTimeoutSec(),
      );

      console.log(`[collector] ✓ ${items.length} items`);
      return items;
    },
  };
}
