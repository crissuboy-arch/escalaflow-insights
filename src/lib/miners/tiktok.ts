// src/lib/miners/tiktok.ts
import { runApifyActor } from "../integrations/apify/client";

export async function mineTikTok(query: string) {
  const actorId = "clockworks/tiktok-scraper";
  const input = {
    search: query,
  };
  return await runApifyActor(actorId, input);
}
