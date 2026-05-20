// src/lib/miners/meta.ts
import { runApifyActor } from "../integrations/apify/client";

export async function mineMetaAds(query: string, country: string, language: string) {
  // Actor ID for Facebook Ads Library Scraper (example)
  const actorId = "apify/facebook-ads-library-scraper";
  
  const input = {
    keywords: query,
    country: country,
    language: language,
  };

  return await runApifyActor(actorId, input);
}
