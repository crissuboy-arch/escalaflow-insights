// src/lib/miners/instagram.ts
import { runApifyActor } from "../integrations/apify/client";

export async function mineInstagram(username: string) {
  const actorId = "apify/instagram-scraper";
  const input = {
    usernames: [username],
  };
  return await runApifyActor(actorId, input);
}
