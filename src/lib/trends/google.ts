import { runSyncGetDatasetItems } from "../integrations/apify/client";

export interface TrendResult {
  keyword: string;
  growth: string;
  isRising: boolean;
  searchVolume: number;
  breakout?: boolean;
  timeRange?: string;
}

const ACTOR_ID = "apify/google-trends-scraper";

function pickStr(obj: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, paths: string[]): number | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export async function getGoogleTrends(keyword: string, country: string): Promise<TrendResult[]> {
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(ACTOR_ID, {
    keywords: [keyword],
    geo: country,
    time: "now 7-d",
  });

  const results: TrendResult[] = [];

  for (const item of raw) {
    const kw = pickStr(item, ["keyword", "query", "title", "topic"]) ?? keyword;
    const growth = pickStr(item, ["growth", "growthPercent", "percentage", "value"]) ?? "0%";
    const isRising = growth.startsWith("+") || growth.includes("Breakout") || growth.includes("rising");
    const searchVolume = pickNum(item, ["searchVolume", "volume", "avg", "score"]) ?? 0;
    const breakout = pickStr(item, ["breakout", "isBreakout"]) === "true" || growth === "Breakout";
    const timeRange = pickStr(item, ["timeRange", "time", "range"]);

    results.push({
      keyword: kw,
      growth,
      isRising,
      searchVolume,
      breakout,
      timeRange,
    });
  }

  // If no results, create a synthetic entry from the search keyword
  if (results.length === 0) {
    results.push({
      keyword,
      growth: "—",
      isRising: false,
      searchVolume: 0,
    });
  }

  return results;
}
