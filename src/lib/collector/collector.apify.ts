// Internal provider for the "Motor de Coleta".
// IMPORTANT: this module is server-only. The provider name must NEVER be
// surfaced in the UI — it is an implementation detail.

import type { CollectorProvider, CollectorRunInput } from "./collector.types";
import { APIFY_ACTORS } from "@/config/apify-actors";

const BASE = "https://api.apify.com/v2";

export function createProvider(): CollectorProvider {
  return {
    async run(input: CollectorRunInput) {
      const token = process.env.APIFY_TOKEN;
      if (!token) throw new Error("Motor de Coleta não configurado.");
      const actor = APIFY_ACTORS.facebook();

      const payload = {
        urls: [
          {
            url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${
              input.country || "ALL"
            }&q=${encodeURIComponent(input.keyword)}&search_type=keyword_unordered`,
          },
        ],
        count: Math.min(Math.max(input.limit ?? 20, 1), 100),
        "scrapePageAds.activeStatus": "active",
        scrapeAdDetails: true,
        scrapeAdvertiserPage: false,
      };

      const safeToken = token.slice(0, 8) + "…(masked)";
      const url = `${BASE}/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=120`;
      console.log(`[collector] actor=${actor}`);
      console.log(`[collector] url=${BASE}/acts/${actor}/run-sync-get-dataset-items?token=${safeToken}&timeout=120`);
      console.log(`[collector] payload=${JSON.stringify(payload)}`);

      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[collector] ✗ status=${res.status} body=${text.slice(0, 300)}`);
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Acesso negado ao actor ${actor} (${res.status}). Verifique APIFY_TOKEN e APIFY_META_ADS_ACTOR no .env.`);
        }
        throw new Error(`Motor de Coleta indisponível (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as unknown;
      const items = Array.isArray(data) ? data : [];
      console.log(`[collector] ✓ ${items.length} items`);
      return items;
    },
  };
}
