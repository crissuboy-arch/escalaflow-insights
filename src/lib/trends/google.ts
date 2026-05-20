// src/lib/trends/google.ts
import { runApifyActor } from "../integrations/apify/client";

export async function getGoogleTrends(keyword: string, country: string) {
  const actorId = "apify/google-trends-scraper";
  const input = {
    keywords: [keyword],
    geo: country,
  };
  return await runApifyActor(actorId, input);
}
