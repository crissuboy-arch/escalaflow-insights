// Core logic for the Cris OS <-> ScalaFlow server-to-server mining bridge.
// Kept separate from the route file (src/routes/api/integrations.mining.run.ts)
// so the security-critical pieces (auth check, rate limit, dispatch) are
// plain, unit-testable functions — no HTTP/route machinery involved. This
// mirrors the same extraction pattern already used for the miners
// themselves (runTikTokHashtagMining, runInstagramMining, etc.): one real
// implementation, reused, not duplicated.
import { z } from "zod";
import { runTikTokHashtagMining, MineInput as TikTokMineInput } from "@/lib/tiktok-radar.functions";
import { runInstagramMining, MineInput as InstagramMineInput } from "@/lib/instagram-radar.functions";
import { runYouTubeMining, MineInput as YouTubeMineInput } from "@/lib/youtube-radar.functions";
import { runGoogleTrendsMining, MineInput as GoogleTrendsMineInput } from "@/lib/google-radar.functions";

export const MINING_BRIDGE_SOURCES = ["tiktok", "instagram", "youtube", "google_trends"] as const;
export type MiningBridgeSource = (typeof MINING_BRIDGE_SOURCES)[number];

export const MiningBridgeBody = z.object({
  source: z.enum(MINING_BRIDGE_SOURCES),
  term: z.string().min(1),
  // Optional passthrough of the same minimal params each miner already
  // supports — never new parameters, never new behavior. Each miner's own
  // MineInput schema still enforces its own bounds (e.g. TikTok limit<=50).
  limit: z.number().int().optional(),
  searchType: z.enum(["hashtag", "user", "url", "place"]).optional(),
  resultsType: z.enum(["posts", "reels"]).optional(),
  maxResults: z.number().int().optional(),
  dateFilter: z.enum(["today", "week", "month", "year"]).optional(),
  geo: z.string().optional(),
  timeframe: z.enum(["now 1-d", "now 7-d", "today 1-m", "today 3-m", "today 12-m"]).optional(),
});
export type MiningBridgeInput = z.infer<typeof MiningBridgeBody>;

export interface MiningBridgeResult {
  inserted: number;
  skipped: number;
  warning?: string;
}

/** Dedicated-secret bearer check — never the app's own Supabase session
 *  tokens. Constant shape regardless of which side is missing, so timing
 *  differences don't leak whether the secret is configured. */
export function isAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  return !!secret && authHeader === `Bearer ${secret}`;
}

// ── Rate limiting ────────────────────────────────────────────────────────
// Simple, in-memory, per-source guard against abusive/repeated triggering
// of a real, cost-incurring external call. Not a new architecture/table —
// state resets on a cold start, which is an accepted tradeoff: the goal is
// to stop rapid-fire bursts within a warm instance, not to implement
// distributed rate limiting.
const MIN_INTERVAL_MS = 60_000; // at most 1 call per source per minute
const MAX_CALLS_PER_HOUR = 10; // per source
const lastCallAt = new Map<MiningBridgeSource, number>();
const callsInWindow = new Map<MiningBridgeSource, number[]>();

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
}

export function checkRateLimit(source: MiningBridgeSource, now: number = Date.now()): RateLimitCheck {
  const last = lastCallAt.get(source);
  if (last !== undefined && now - last < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000);
    return { allowed: false, reason: `Muito frequente para "${source}" — aguarde ${waitSec}s.` };
  }
  const windowStart = now - 60 * 60 * 1000;
  const recent = (callsInWindow.get(source) ?? []).filter((t) => t > windowStart);
  if (recent.length >= MAX_CALLS_PER_HOUR) {
    return { allowed: false, reason: `Limite de ${MAX_CALLS_PER_HOUR} chamadas/hora atingido para "${source}".` };
  }
  return { allowed: true };
}

export function recordCall(source: MiningBridgeSource, now: number = Date.now()): void {
  lastCallAt.set(source, now);
  const windowStart = now - 60 * 60 * 1000;
  const recent = (callsInWindow.get(source) ?? []).filter((t) => t > windowStart);
  recent.push(now);
  callsInWindow.set(source, recent);
}

/** Test-only: clears in-memory rate-limit state between test cases so one
 *  test's calls never leak into another's. Never called from production code. */
export function __resetMiningBridgeRateLimitForTests(): void {
  lastCallAt.clear();
  callsInWindow.clear();
}

/** Dispatches to the one real implementation for each source — never a
 *  second/parallel mining implementation. */
export async function runMiningBridge(
  input: MiningBridgeInput,
  userId: string,
): Promise<MiningBridgeResult> {
  switch (input.source) {
    case "tiktok":
      return runTikTokHashtagMining(
        TikTokMineInput.parse({ hashtag: input.term, limit: input.limit }),
        userId,
      );
    case "instagram":
      return runInstagramMining(
        InstagramMineInput.parse({
          search: input.term,
          searchType: input.searchType,
          resultsType: input.resultsType,
          limit: input.limit,
        }),
        userId,
      );
    case "youtube":
      return runYouTubeMining(
        YouTubeMineInput.parse({
          query: input.term,
          maxResults: input.maxResults,
          dateFilter: input.dateFilter,
        }),
        userId,
      );
    case "google_trends":
      return runGoogleTrendsMining(
        GoogleTrendsMineInput.parse({
          keywords: input.term,
          geo: input.geo,
          timeframe: input.timeframe,
        }),
        userId,
      );
  }
}
