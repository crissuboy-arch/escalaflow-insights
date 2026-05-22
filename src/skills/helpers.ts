// Shared field-picking helpers used across all skills.
// Handles nested paths (dot notation), coercion, and graceful fallbacks.

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function pickStr(
  obj: Record<string, unknown>,
  paths: string[],
): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export function pickNum(obj: Record<string, unknown>, paths: string[]): number {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

export function extractHashtags(obj: Record<string, unknown>): string[] {
  const raw = getPath(obj, "hashtags") ?? [];
  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .map((h) =>
        typeof h === "string" ? h : ((h as Record<string, unknown>)?.name as string) ?? "",
      )
      .filter(Boolean);
  }
  const text = pickStr(obj, ["caption", "text", "description", "desc"]) ?? "";
  return [...text.matchAll(/#(\w+)/g)].map((m) => m[1]);
}

export function extractMentions(obj: Record<string, unknown>): string[] {
  const raw = getPath(obj, "mentions") ?? [];
  if (Array.isArray(raw)) {
    return (raw as unknown[]).map((m) => (typeof m === "string" ? m : String(m))).filter(Boolean);
  }
  const text = pickStr(obj, ["caption", "text"]) ?? "";
  return [...text.matchAll(/@(\w+)/g)].map((m) => m[1]);
}
