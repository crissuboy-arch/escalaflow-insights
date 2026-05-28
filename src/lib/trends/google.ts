import { runSyncGetDatasetItems } from "../integrations/apify/client";
import { APIFY_ACTORS } from "@/config/apify-actors";

export interface TrendResult {
  keyword: string;
  growth: string;
  isRising: boolean;
  searchVolume: number;
  breakout?: boolean;
  timeRange?: string;
}

function pickStr(obj: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, paths: string[]): number {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "number") return v;
    if (typeof v === "string") { const n = Number(v); if (!isNaN(n)) return n; }
  }
  return 0;
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
  let raw: Record<string, unknown>[] = [];

  try {
    raw = await runSyncGetDatasetItems<Record<string, unknown>>(APIFY_ACTORS.googleTrends(), {
      searchTerms: [keyword],
      geo: country,
      time: "now 7-d",
    });
  } catch (err) {
    console.warn("[trends] Google Trends actor timed out, using fallback data for:", keyword);
  }

  if (raw.length > 0) {
    return raw.map((item) => ({
      keyword: pickStr(item, ["keyword", "query", "title", "topic"]) ?? keyword,
      growth: pickStr(item, ["growth", "growthPercent", "percentage", "value"]) ?? "0%",
      isRising: pickStr(item, ["growth", "growthPercent"])?.startsWith("+") ?? false,
      searchVolume: pickNum(item, ["searchVolume", "volume", "avg", "score"]),
      breakout: pickStr(item, ["breakout", "isBreakout"]) === "true",
      timeRange: pickStr(item, ["timeRange", "time", "range"]),
    }));
  }

  // Fallback: synthetic trend from the search keyword
  return [{
    keyword,
    growth: "—",
    isRising: false,
    searchVolume: 0,
  }];
}
