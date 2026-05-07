// Internal provider for the "Motor de Coleta".
// IMPORTANT: this module is server-only. The provider name must NEVER be
// surfaced in the UI — it is an implementation detail.

import type { CollectorProvider, CollectorRunInput } from "./collector.types";

const BASE = "https://api.apify.com/v2";
// Default actor: a Facebook Ads Library scraper. Can be overridden by env.
const DEFAULT_ACTOR = "curious_coder~facebook-ads-library-scraper";

export function createProvider(): CollectorProvider {
  return {
    async run(input: CollectorRunInput) {
      const token = process.env.APIFY_TOKEN;
      if (!token) throw new Error("Motor de Coleta não configurado.");
      const actor = process.env.COLLECTOR_ACTOR_ID || DEFAULT_ACTOR;

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
      };

      const url = `${BASE}/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(
        token,
      )}&timeout=120`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Motor de Coleta indisponível (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as unknown;
      return Array.isArray(data) ? data : [];
    },
  };
}