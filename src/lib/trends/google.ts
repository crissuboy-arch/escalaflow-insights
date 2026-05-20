import { runApifyActor } from "../integrations/apify/client";

export interface TrendResult {
  keyword: string;
  growth: string;
  isRising: boolean;
  searchVolume: number;
}

export async function getGoogleTrends(keyword: string, country: string): Promise<TrendResult[]> {
  const actorId = "apify/google-trends-scraper";
  const input = {
    keywords: [keyword],
    geo: country,
    time: "now 7-d",
  };
  
  const run: any = await runApifyActor(actorId, input);
  console.log("Trends mining started:", run.data?.id);
  
  return [];
}
