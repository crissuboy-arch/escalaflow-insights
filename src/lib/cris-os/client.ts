// CrisOsIntelligenceClient — decoupled HTTPS transport from ScalaFlow to
// Cris OS's MarketIntelligenceHandoff receiver (Fase 9).
//
// SERVER-SIDE ONLY. CRIS_OS_INTEGRATION_TOKEN must never reach the browser —
// every function here assumes it runs inside a server function / API route.
//
// No business logic from Cris OS lives here: this module only knows how to
// validate, send, retry-safely and report success/failure of one payload.
import type { MarketIntelligenceHandoff } from "./contract";
import {
  mapRemoteOutcome,
  type MissionStatus,
  type RemoteMissionRef,
} from "./mission";

const TRANSIENT_HTTP_STATUS = new Set([408, 429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [400, 1200]; // delay before attempt 2 and attempt 3

export type HandoffStatus = MissionStatus;

export type CrisOsReceiveStatus = "PERSISTED" | "DUPLICATE" | "NEEDS_REVIEW" | "REJECTED" | "UNKNOWN";

export interface CrisOsReceiveResponse {
  status?: CrisOsReceiveStatus;
  handoff_id?: string;
  project_id?: string | null;
  errors?: string[];
  warnings?: string[];
  [key: string]: unknown;
}

export interface SendIntelligenceResult {
  ok: boolean;
  status: HandoffStatus;
  httpStatus?: number;
  /** Remote refs parsed from the receiver's success body, if any — never
   *  invented. Present only when the send succeeded. */
  remote?: RemoteMissionRef;
  error?: string;
  retryable: boolean;
  attempts: number;
  /** Second, Cris-OS-specific projection of the same receiver body (status /
   *  project_id / warnings / errors) that `remote` is derived from. Neither
   *  invents a field the receiver didn't actually return. */
  remoteResponse?: CrisOsReceiveResponse;
}

function getConfig(): { baseUrl: string | null; token: string | null } {
  return {
    baseUrl: process.env.CRIS_OS_API_URL?.trim() || null,
    // CRIS_OS_API_URL is expected to be the full handoff endpoint URL
    // (e.g. https://cris-os.example.com/api/intelligence/handoff) — ScalaFlow
    // never guesses or appends a path Cris OS hasn't published.
    token: process.env.CRIS_OS_INTEGRATION_TOKEN?.trim() || null,
  };
}

export function isCrisOsConfigured(): boolean {
  const { baseUrl, token } = getConfig();
  return !!baseUrl && !!token;
}

/** Structural validation only — never inspects business meaning. */
export function validateBeforeSend(handoff: MarketIntelligenceHandoff): string | null {
  if (!handoff || typeof handoff !== "object") return "handoff ausente";
  if (!handoff.handoff_id) return "handoff_id ausente";
  if (!handoff.schema_version) return "schema_version ausente";
  if (!handoff.source_system || !handoff.source_module)
    return "source_system/source_module ausente";
  if (!handoff.opportunity_id) return "opportunity_id ausente";
  if (!handoff.title) return "title ausente";
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toReceiveResponse(body: unknown): CrisOsReceiveResponse | undefined {
  return body !== null && typeof body === "object" && !Array.isArray(body)
    ? (body as CrisOsReceiveResponse)
    : undefined;
}

/** One HTTP attempt. Never throws — always resolves with a result object.
 *  The body is parsed tolerantly (JSON when possible, otherwise null) on
 *  both success and failure: it is the receiver's only chance to hand back
 *  a mission id, a NEEDS_REVIEW state, result files, or a human-readable
 *  error detail — discarding it (the old behavior) made every 2xx,
 *  including 202, look like a concluded send, and every error opaque. */
async function attemptOnce(
  url: string,
  token: string,
  handoff: MarketIntelligenceHandoff,
  timeoutMs: number,
): Promise<{ httpStatus?: number; error?: string; ok: boolean; body?: unknown }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        // The receiver dedupes on handoff_id; sending it as the standard
        // idempotency header too costs nothing and lets a conforming
        // receiver dedupe even before reading the body.
        "Idempotency-Key": handoff.handoff_id,
      },
      body: JSON.stringify(handoff),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    if (res.ok) {
      return { ok: true, httpStatus: res.status, body };
    }
    const rec = toReceiveResponse(body);
    const detail = (rec as Record<string, unknown> | undefined)?.detail ?? (rec as Record<string, unknown> | undefined)?.message;
    const error = typeof detail === "string" ? detail : text.slice(0, 300) || `HTTP ${res.status}`;
    return { ok: false, httpStatus: res.status, error, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Sends one handoff to Cris OS, retrying only transient failures
 * (timeout / network error / 429 / 502 / 503 / 504) up to MAX_ATTEMPTS.
 * 400/401/403/schema errors fail immediately — never retried automatically.
 * Never throws: a Cris OS outage must never bubble up and break the caller.
 */
export async function sendIntelligence(
  handoff: MarketIntelligenceHandoff,
  opts: { timeoutMs?: number } = {},
): Promise<SendIntelligenceResult> {
  const { baseUrl, token } = getConfig();
  if (!baseUrl) {
    return {
      ok: false,
      status: "FAILED",
      error: "CRIS_OS_API_URL não configurado",
      retryable: false,
      attempts: 0,
    };
  }
  if (!token) {
    return {
      ok: false,
      status: "FAILED",
      error: "CRIS_OS_INTEGRATION_TOKEN não configurado",
      retryable: false,
      attempts: 0,
    };
  }

  const invalidReason = validateBeforeSend(handoff);
  if (invalidReason) {
    return {
      ok: false,
      status: "FAILED",
      error: `Payload inválido: ${invalidReason}`,
      retryable: false,
      attempts: 0,
    };
  }

  const timeoutMs = opts.timeoutMs ?? 8000;
  let lastError: string | undefined;
  let lastStatus: number | undefined;
  let lastRemoteResponse: CrisOsReceiveResponse | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await attemptOnce(baseUrl, token, handoff, timeoutMs);
    const remoteResponse = toReceiveResponse(result.body);
    if (result.ok) {
      // HARD RULE: 202 / NEEDS_REVIEW maps to NEEDS_REVIEW, never SENT.
      // Callers must branch on `status`, not on `ok` (ok only means the
      // HTTP send itself succeeded).
      const mapped = mapRemoteOutcome(result.httpStatus, result.body);
      return {
        ok: true,
        status: mapped.status,
        httpStatus: result.httpStatus,
        remote: mapped.remote,
        remoteResponse,
        retryable: false,
        attempts: attempt,
      };
    }

    lastError = result.error;
    lastStatus = result.httpStatus;
    lastRemoteResponse = remoteResponse;

    const isTransient =
      result.httpStatus === undefined // network error / timeout
        ? true
        : TRANSIENT_HTTP_STATUS.has(result.httpStatus);

    if (!isTransient || attempt === MAX_ATTEMPTS) {
      return {
        ok: false,
        status: "FAILED",
        httpStatus: lastStatus,
        error: lastError,
        retryable: isTransient, // caller can offer "tentar novamente" when true
        attempts: attempt,
        remoteResponse,
      };
    }

    await sleep(RETRY_DELAY_MS[attempt - 1] ?? 1200);
  }

  // Unreachable, but keeps TypeScript happy.
  return {
    ok: false,
    status: "FAILED",
    error: lastError,
    retryable: true,
    attempts: MAX_ATTEMPTS,
    remoteResponse: lastRemoteResponse,
  };
}

/** Best-effort reachability probe. Any HTTP response (even 4xx) counts as
 *  "reachable" — it proves the network path and DNS/TLS work. Only network
 *  errors/timeouts count as unreachable. No dedicated health path is assumed
 *  since Cris OS hasn't published one; this hits CRIS_OS_API_URL itself. */
export async function healthCheck(timeoutMs = 5000): Promise<boolean> {
  const { baseUrl, token } = getConfig();
  if (!baseUrl || !token) return false;
  try {
    await fetch(baseUrl, {
      method: "OPTIONS",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return true;
  } catch {
    return false;
  }
}

/** Read-only snapshot from Cris OS for a previously accepted handoff. */
export async function getIntelligenceStatus(
  handoffId: string,
  opts: { timeoutMs?: number } = {},
): Promise<CrisOsReceiveResponse | null> {
  const { baseUrl, token } = getConfig();
  if (!baseUrl || !token) return null;
  const statusUrl = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(handoffId)}/status`;
  try {
    const res = await fetch(statusUrl, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const value: unknown = await res.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as CrisOsReceiveResponse)
      : null;
  } catch {
    return null;
  }
}
