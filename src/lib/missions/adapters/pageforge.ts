// PageForge adapter (Fase 3) — typed client for the audited service
// (forge-sales-page-skill @ 0592fb1: POST /api/generate stages,
// GET /api/health, /api/integrations/health + /stats).
// Env-gated on PAGEFORGE_BASE_URL. Auth observation from the audit, kept
// exactly: NO auth control was evidenced on /api/generate (only brief
// validation) — so generate sends no key, and the operator must confirm
// the service's auth before any production use. Stats uses Bearer
// PAGEFORGE_ATHENA_API_KEY (fail-closed on the service side).
export const PAGEFORGE_STAGES = ["plan", "render", "assemble", "section", "full"] as const;

export function getPageForgeBaseUrl(): string | null {
  const raw = process.env.PAGEFORGE_BASE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

export type PageForgeResult<T> =
  | { configured: true; ok: true; data: T }
  | { configured: true; ok: false; error: string }
  | { configured: false };

/** GET /api/health — public liveness check. */
export async function pageForgeHealth(): Promise<PageForgeResult<unknown>> {
  const baseUrl = getPageForgeBaseUrl();
  if (!baseUrl) return { configured: false };
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    return { configured: true, ok: true, data: await res.json().catch(() => null) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** POST /api/generate — stage allowlist enforced client-side. The service
 *  streams NDJSON; this client reads it fully (no streaming UI here). */
export async function pageForgeGenerate(input: {
  stage: string;
  brief: Record<string, unknown>;
}): Promise<PageForgeResult<string>> {
  const baseUrl = getPageForgeBaseUrl();
  if (!baseUrl) return { configured: false };
  if (!(PAGEFORGE_STAGES as readonly string[]).includes(input.stage)) {
    return { configured: true, ok: false, error: `stage inválido: ${input.stage}` };
  }
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: input.stage, brief: input.brief }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    return { configured: true, ok: true, data: await res.text() };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** GET /api/integrations/stats — Bearer PAGEFORGE_ATHENA_API_KEY. */
export async function pageForgeStats(): Promise<PageForgeResult<unknown>> {
  const baseUrl = getPageForgeBaseUrl();
  const key = process.env.PAGEFORGE_ATHENA_API_KEY?.trim();
  if (!baseUrl || !key) return { configured: false };
  try {
    const res = await fetch(`${baseUrl}/api/integrations/stats`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    return { configured: true, ok: true, data: await res.json().catch(() => null) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
