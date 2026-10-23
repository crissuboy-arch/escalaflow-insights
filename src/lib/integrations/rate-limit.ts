// Generic, persistent, atomic rate limiter for authenticated API routes
// that trigger a cost-incurring action (AI generation, scraping). Follows
// the exact same pattern already proven for the Cris OS mining bridge
// (src/lib/integrations/mining-bridge.ts, acquireMiningBridgeLock) — an
// in-memory Map does not work across Vercel serverless invocations (each
// request can land on a different, memory-isolated instance), so the
// check-and-record step must be atomic inside Postgres itself.
//
// Backing primitive: public.try_acquire_rate_limit (see
// supabase/migrations/20261023000000_api_rate_limits.sql — NOT yet
// applied; this is a pending dependency, see that file's header comment).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
}

/** Atomically checks AND records one call in a single round-trip. A
 *  caller must treat allowed=true as "this call has already been counted"
 *  and must NOT proceed to the costly action when allowed=false. */
export async function tryAcquireRateLimit(
  bucket: string,
  identity: string,
  windowSeconds: number,
  maxCalls: number,
): Promise<RateLimitCheck> {
  // Supabase generated types don't include this function yet (see the
  // pending migration referenced above).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any).rpc("try_acquire_rate_limit", {
    p_bucket: bucket,
    p_identity: identity,
    p_window_seconds: windowSeconds,
    p_max_calls: maxCalls,
  });

  if (error) {
    // Fail closed: if the primitive itself is unavailable (e.g. the
    // migration hasn't been applied yet), never let a costly call through
    // unchecked.
    return { allowed: false, reason: `Rate limit indisponível: ${error.message}` };
  }
  if (!data) {
    return {
      allowed: false,
      reason: `Limite de ${maxCalls} chamadas por ${windowSeconds}s excedido — aguarde antes de repetir.`,
    };
  }
  return { allowed: true };
}
