// Pink Logic adapter (Fase 3) — typed client for the audited routes
// (PINK-LOGIC, branch fix/painel-seletor-mock-mode).
// Env-gated: without PINK_LOGIC_BASE_URL (+ SERVICE_KEY for generate)
// every function reports configured:false and never fetches. Live deploy
// still unconfirmed — panel keeps "Aguardando integração" until a real
// health check passes.
export const PINK_LOGIC_MODULES = ["logo", "sticker", "qrcode", "copy", "story", "carousel", "mockup"] as const;

export type PinkLogicModule = (typeof PINK_LOGIC_MODULES)[number];

export function getPinkLogicBaseUrl(): string | null {
  const raw = process.env.PINK_LOGIC_BASE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function getPinkLogicKey(): string | null {
  const raw = process.env.PINK_LOGIC_SERVICE_KEY?.trim();
  return raw ? raw : null;
}

export type PinkLogicResult<T> =
  | { configured: true; ok: true; data: T }
  | { configured: true; ok: false; error: string }
  | { configured: false };

/** GET /api/integrations/health — public, no key (contrato v1). */
export async function pinkLogicHealth(): Promise<PinkLogicResult<unknown>> {
  const baseUrl = getPinkLogicBaseUrl();
  if (!baseUrl) return { configured: false };
  try {
    const res = await fetch(`${baseUrl}/api/integrations/health`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    return { configured: true, ok: true, data: await res.json().catch(() => null) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** POST /api/generate — module allowlist enforced client-side so an
 *  invalid module never reaches the service. */
export async function pinkLogicGenerate(input: {
  module: string;
  params: Record<string, unknown>;
}): Promise<PinkLogicResult<unknown>> {
  const baseUrl = getPinkLogicBaseUrl();
  const key = getPinkLogicKey();
  if (!baseUrl || !key) return { configured: false };
  if (!(PINK_LOGIC_MODULES as readonly string[]).includes(input.module)) {
    return { configured: true, ok: false, error: `module inválido: ${input.module}` };
  }
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ module: input.module, ...input.params }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    return { configured: true, ok: true, data: await res.json().catch(() => null) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
