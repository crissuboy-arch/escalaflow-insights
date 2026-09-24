// Core logic for the Cris OS <-> ScalaFlow server-to-server mining bridge.
// Kept separate from the route file (src/routes/api/integrations.mining.run.ts)
// so the security-critical pieces (auth check, rate limit, dispatch) are
// plain, unit-testable functions — no HTTP/route machinery involved. This
// mirrors the same extraction pattern already used for the miners
// themselves (runTikTokHashtagMining, runInstagramMining, etc.): one real
// implementation, reused, not duplicated.
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runTikTokHashtagMining, MineInput as TikTokMineInput } from "@/lib/tiktok-radar.functions";
import {
  runInstagramMining,
  MineInput as InstagramMineInput,
} from "@/lib/instagram-radar.functions";
import { runYouTubeMining, MineInput as YouTubeMineInput } from "@/lib/youtube-radar.functions";
import {
  runGoogleTrendsMining,
  MineInput as GoogleTrendsMineInput,
} from "@/lib/google-radar.functions";

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
// Persistent, atomic guard against abusive/repeated triggering of a real,
// cost-incurring external call for the SAME (source, term) pair. The
// in-memory version previously here did not work across Vercel serverless
// invocations (each request can land on a different, memory-isolated
// instance). This reuses the already-existing public.mining_runs table
// (user_id/type/query/started_at — present since 20260520100000, unused by
// any other code path) via a Postgres function
// (try_acquire_mining_bridge_lock, see
// supabase/migrations/20260924000000_mining_bridge_rate_limit.sql) that
// makes the check-and-record atomic with a transaction-scoped advisory
// lock, so two concurrent calls for the same key can never both pass.
const RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes per exact (source, term)

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
}

/** Atomically checks AND records in one round-trip: if this returns
 *  allowed=true, the call has already been recorded — the caller must not
 *  call it again for the same attempt. If allowed=false, nothing was
 *  recorded and the caller must not proceed to the miner/Apify. */
export async function acquireMiningBridgeLock(
  source: MiningBridgeSource,
  term: string,
  userId: string,
): Promise<RateLimitCheck> {
  // Supabase types don't include this function yet (see migration
  // 20260924000000_mining_bridge_rate_limit.sql).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any).rpc("try_acquire_mining_bridge_lock", {
    p_user_id: userId,
    p_type: source,
    p_query: term,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (error) {
    // Fail closed: if the lock primitive itself is unavailable (e.g. the
    // migration hasn't been applied yet), never let a real, cost-incurring
    // call through unchecked.
    return { allowed: false, reason: `Rate limit indisponível: ${error.message}` };
  }
  if (!data) {
    return {
      allowed: false,
      reason: `"${source}"/"${term}" já executado nos últimos ${RATE_LIMIT_WINDOW_SECONDS}s — aguarde antes de repetir.`,
    };
  }
  return { allowed: true };
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
