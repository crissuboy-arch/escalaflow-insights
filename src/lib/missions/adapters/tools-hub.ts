// Tools Hub adapter (Fase 3) — typed client for the audited contract
// (ATHENA-TOOLS-HUB openapi.yaml, branch feat/opcao-a-g3-preparacao).
// Env-gated: without TOOLS_HUB_BASE_URL + TOOLS_HUB_API_KEY every function
// reports configured:false and never fetches. Nothing here is live-verified
// (deploy + worker still unconfirmed) — the panel must keep the tool in
// "Aguardando integração" until a real health check passes.
//
// Deliberate omission: there is NO approve method. API keys receive 403
// on approvals:decide by design (lib/api-auth.ts); approvals require a
// human owner/admin session. ScalaFlow never approves on anyone's behalf.
import { randomBytes } from "node:crypto";

export interface ToolsHubConfig {
  baseUrl: string;
  apiKey: string;
}

export function getToolsHubConfig(): ToolsHubConfig | null {
  const baseUrl = process.env.TOOLS_HUB_BASE_URL?.trim();
  const apiKey = process.env.TOOLS_HUB_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export type ToolsHubResult<T> =
  | { configured: true; ok: true; data: T }
  | { configured: true; ok: false; error: string }
  | { configured: false };

function headers(config: ToolsHubConfig): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${config.apiKey}`,
    // Anti-replay headers from the audited contract.
    "X-Request-Timestamp": String(Date.now()),
    "X-Nonce": randomBytes(16).toString("hex"),
  };
}

export interface ToolsHubJob {
  id: string | null;
  status: string | null;
  toolId: string | null;
  raw: unknown;
}

function parseJob(body: unknown): ToolsHubJob {
  const rec =
    body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
  return {
    id: str(rec.id ?? rec.job_id),
    status: str(rec.status),
    toolId: str(rec.tool_id ?? rec.toolId),
    raw: body,
  };
}

/** POST /api/v1/jobs. 201 = created, 200 = idempotent replay (same
 *  idempotencyKey) — both are successes; the caller distinguishes them
 *  by the returned status/id, never by assuming a new execution. */
export async function createToolsHubJob(input: {
  orgId: string;
  toolId: string;
  params: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<ToolsHubResult<ToolsHubJob>> {
  const config = getToolsHubConfig();
  if (!config) return { configured: false };
  try {
    const res = await fetch(`${config.baseUrl}/api/v1/jobs`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({
        orgId: input.orgId,
        toolId: input.toolId,
        params: input.params,
        idempotencyKey: input.idempotencyKey,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    const body: unknown = await res.json().catch(() => null);
    return { configured: true, ok: true, data: parseJob(body) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** GET /api/v1/jobs/[id] — the polling read. */
export async function getToolsHubJob(jobId: string): Promise<ToolsHubResult<ToolsHubJob>> {
  const config = getToolsHubConfig();
  if (!config) return { configured: false };
  try {
    const res = await fetch(`${config.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}`, {
      headers: headers(config),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404) {
      return { configured: true, ok: false, error: "job não encontrado (404)" };
    }
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    const body: unknown = await res.json().catch(() => null);
    return { configured: true, ok: true, data: parseJob(body) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
