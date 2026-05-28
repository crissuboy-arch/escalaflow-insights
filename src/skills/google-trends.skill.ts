import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { pickStr, pickNum } from "./helpers";
import { SkillResult, SkillOptions, withTimeout } from "./types";

// Actor: APIFY_GOOGLE_TRENDS_ACTOR (configure in .env before use)
// Recommended: apify~google-trends-scraper
function getActor(): string {
  const id = process.env.APIFY_GOOGLE_TRENDS_ACTOR?.trim();
  if (!id) throw new Error("APIFY_GOOGLE_TRENDS_ACTOR não configurado no .env");
  return id;
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface TrendPoint {
  keyword: string;
  value: number;
  date: string;
}

export interface TrendData {
  keyword: string;
  geo: string;
  timeframe: string;
  avgInterest: number;
  peakInterest: number;
  trend: "rising" | "stable" | "falling";
  relatedQueries: string[];
  relatedTopics: string[];
  points: TrendPoint[];
}

export interface GoogleTrendsInput {
  keywords: string[];
  geo?: string;
  timeframe?: "now 1-H" | "now 4-H" | "now 1-d" | "now 7-d" | "today 1-m" | "today 3-m" | "today 12-m";
  category?: number;
}

// ── normalizer ────────────────────────────────────────────────────────────────

function normalize(item: Record<string, unknown>): TrendData {
  const keyword = pickStr(item, ["keyword", "term", "query"]) ?? "";
  const geo = pickStr(item, ["geo", "country", "region"]) ?? "BR";
  const timeframe = pickStr(item, ["timeframe", "time_frame"]) ?? "";

  const rawPoints = (item["timelineData"] ?? item["points"] ?? []) as Record<string, unknown>[];
  const points: TrendPoint[] = Array.isArray(rawPoints)
    ? rawPoints.map((p) => ({
        keyword,
        value: pickNum(p as Record<string, unknown>, ["value", "values.0", "formattedValue"]),
        date: pickStr(p as Record<string, unknown>, ["formattedTime", "date", "time"]) ?? "",
      }))
    : [];

  const values = points.map((p) => p.value).filter((v) => v > 0);
  const avgInterest = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const peakInterest = values.length > 0 ? Math.max(...values) : 0;

  const lastFew = values.slice(-3);
  const firstFew = values.slice(0, 3);
  const lastAvg = lastFew.length > 0 ? lastFew.reduce((a, b) => a + b, 0) / lastFew.length : 0;
  const firstAvg = firstFew.length > 0 ? firstFew.reduce((a, b) => a + b, 0) / firstFew.length : 0;
  const trend: TrendData["trend"] =
    lastAvg > firstAvg * 1.1 ? "rising" : lastAvg < firstAvg * 0.9 ? "falling" : "stable";

  const relatedQueries = extractStringArray(item, ["relatedQueries", "related_queries"]);
  const relatedTopics = extractStringArray(item, ["relatedTopics", "related_topics"]);

  return { keyword, geo, timeframe, avgInterest, peakInterest, trend, relatedQueries, relatedTopics, points };
}

function extractStringArray(obj: Record<string, unknown>, paths: string[]): string[] {
  for (const p of paths) {
    const v = obj[p];
    if (Array.isArray(v)) {
      return (v as unknown[])
        .map((x) => (typeof x === "string" ? x : (x as Record<string, unknown>)?.query as string ?? ""))
        .filter(Boolean);
    }
  }
  return [];
}

// ── skill entry point ─────────────────────────────────────────────────────────

export async function runGoogleTrendsSkill(
  input: GoogleTrendsInput,
  options: SkillOptions = {},
): Promise<SkillResult<TrendData>> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 60_000;

  let actor: string;
  try {
    actor = getActor();
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, skill: "google-trends", data: [], error, duration_ms: 0 };
  }

  const payload = {
    searchTerms: input.keywords,
    geo: input.geo ?? "BR",
    timeRange: input.timeframe ?? "today 3-m",
    maxItems: 5,
    ...(input.category != null && { category: input.category }),
  };

  console.log("[skill:google-trends] starting", { actor, keywords: input.keywords });

  try {
    const raw = await withTimeout(
      runSyncGetDatasetItems<Record<string, unknown>>(actor, payload),
      timeoutMs,
      "google-trends",
    );
    const data = raw.map(normalize).filter((t) => t.keyword);
    const duration_ms = Date.now() - start;

    console.log(`[skill:google-trends] done items=${data.length} duration=${duration_ms}ms`);
    return { ok: true, skill: "google-trends", data, duration_ms };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[skill:google-trends] error", error);
    return { ok: false, skill: "google-trends", data: [], error, duration_ms: Date.now() - start };
  }
}
