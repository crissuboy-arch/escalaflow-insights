// Internal provider for the "Motor de Coleta".
// IMPORTANT: this module is server-only. The provider name must NEVER be
// surfaced in the UI — it is an implementation detail.

import type { CollectorProvider, CollectorRunInput } from "./collector.types";
import { APIFY_ACTORS } from "@/config/apify-actors";
import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";

export function createProvider(): CollectorProvider {
  return {
    async run(input: CollectorRunInput) {
      if (!process.env.APIFY_TOKEN) throw new Error("Motor de Coleta não configurado.");
      const actor = APIFY_ACTORS.facebook();

      const payload = {
        urls: [
          {
            url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${
              input.country || "ALL"
            }&q=${encodeURIComponent(input.keyword)}&search_type=keyword_unordered`,
          },
        ],
        // curious_coder/facebook-ads-library-scraper rejects "Maximum charged
        // results" below 10 (confirmed 2026-09-15: input=5 -> actor error
        // "\"Maximum charged results\" option must be atleast 10").
        count: Math.min(Math.max(input.limit ?? 20, 10), 100),
        "scrapePageAds.activeStatus": "active",
        scrapeAdDetails: true,
        scrapeAdvertiserPage: false,
      };

      console.log(`[collector] actor=${actor}`);
      console.log(`[collector] payload=${JSON.stringify(payload)}`);

      // Delegate to the shared client, which normalizes "owner/actor-name" ->
      // "owner~actor-name" (Apify's REST API 404s on the raw slash form —
      // confirmed 2026-09-15 in production: this file used to build the URL
      // manually without normalizing, so every Facebook run 404'd).
      const items = await runSyncGetDatasetItems<Record<string, unknown>>(actor, payload);

      // On invalid input, this actor's sync endpoint returns HTTP 200 with a
      // single dataset item that IS the error, e.g. {"error": "..."} — not an
      // HTTP error and not an ad. Confirmed 2026-09-15. Surface it as a real
      // failure instead of silently persisting it as a fake "Anunciante" ad.
      if (items.length === 1 && typeof items[0] === "object" && items[0] !== null && "error" in items[0] && Object.keys(items[0]).length === 1) {
        throw new Error(`Facebook Ad Library actor input inválido: ${String((items[0] as { error: unknown }).error)}`);
      }

      console.log(`[collector] ✓ ${items.length} items`);
      return items;
    },
  };
}
