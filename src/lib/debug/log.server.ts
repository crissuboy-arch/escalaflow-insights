/**
 * Structured debug logging for the Oferta → Projeto pipeline.
 *
 * Format: `[scope] event key=value key=value ...`
 * Visible in `stack_modern--server-function-logs` (filter by scope tag).
 */
export type DLogScope = "hydrate" | "persist" | "seed" | "read-fail";

function fmt(v: unknown): string {
  if (v == null) return String(v);
  if (Array.isArray(v)) return `[${v.join(",")}]`;
  if (typeof v === "object") {
    if (v instanceof Error) return JSON.stringify({ name: v.name, message: v.message });
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export function dlog(
  scope: DLogScope,
  event: string,
  ctx: Record<string, unknown> = {},
): void {
  const parts = Object.entries(ctx).map(([k, v]) => `${k}=${fmt(v)}`);
  const line = `[${scope}] ${event} ${parts.join(" ")}`.trimEnd();
  if (scope === "read-fail") console.error(line);
  else console.info(line);
}

export function metaKeysOf(meta: unknown): string[] {
  if (!meta || typeof meta !== "object") return [];
  return Object.keys(meta as Record<string, unknown>);
}