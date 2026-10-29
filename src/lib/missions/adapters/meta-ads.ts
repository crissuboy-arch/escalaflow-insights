// Meta Ads adapter (Fase 3) — READ-ONLY client for the audited service
// (Meta-ads- main @ a621c6b: FastAPI + MCP).
// Env-gated on META_ADS_BASE_URL. Auth is per-call: Meta access comes
// from the service's OAuth flow (user-bound, ~60-day tokens in Supabase),
// so read methods take an explicit accessToken — ScalaFlow never stores
// one and never invents a service key.
//
// Deliberate boundaries (from the audit, by design of the service):
// - Reads are free: status, insights, live.
// - There is NO write method here: proposals live on the service's MCP
//   server (propose_action) and approve/reject are human actions there.
//   ScalaFlow must not wield them silently.
export function getMetaAdsBaseUrl(): string | null {
  const raw = process.env.META_ADS_BASE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

export type MetaAdsResult<T> =
  | { configured: true; ok: true; data: T }
  | { configured: true; ok: false; error: string }
  | { configured: false };

async function metaGet<T>(path: string, accessToken: string): Promise<MetaAdsResult<T>> {
  const baseUrl = getMetaAdsBaseUrl();
  if (!baseUrl) return { configured: false };
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    return { configured: true, ok: true, data: (await res.json().catch(() => null)) as T };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** GET /api/ads/status — service + Meta connection state. */
export async function metaAdsStatus(accessToken: string): Promise<MetaAdsResult<unknown>> {
  return metaGet<unknown>("/api/ads/status", accessToken);
}

/** GET /api/ads/insights — read-only metrics. */
export async function metaAdsInsights(
  accessToken: string,
  params: Record<string, string> = {},
): Promise<MetaAdsResult<unknown>> {
  const query = new URLSearchParams(params).toString();
  return metaGet<unknown>(`/api/ads/insights${query ? `?${query}` : ""}`, accessToken);
}

/** GET /api/ads/live — live campaign snapshot (read-only). */
export async function metaAdsLive(accessToken: string): Promise<MetaAdsResult<unknown>> {
  return metaGet<unknown>("/api/ads/live", accessToken);
}

// PROPOSALS ARE MCP-ONLY — no HTTP route for them was found in the audit
// (audited HTTP routes: status, meta/start, meta/callback, accounts/*,
// sync, insights, live, cron). The service's propose_action lives on its
// MCP server (mcp/server.py), and approve/reject are human actions there.
// This HTTP adapter therefore exposes reads only, on purpose: inventing a
// POST /api/ads/proposals route would be fabricating an endpoint.
export const META_ADS_PROPOSAL_NOTE =
  "Propostas de ação só existem no servidor MCP do Meta Ads (propose_action) e a aprovação/rejeição é humana, dentro desse serviço. Este adaptador HTTP expõe só leituras.";
