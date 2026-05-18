// Minimal multiset diff for comparing strings/lists between two plan versions.
// No external dependency — good enough for our short labelled lines.

export type LineDiff = {
  same: string[];
  added: string[];
  removed: string[];
};

export function diffLines(a: string[] = [], b: string[] = []): LineDiff {
  const norm = (s: string) => s.trim();
  const aSet = new Map<string, number>();
  for (const raw of a) {
    const s = norm(raw);
    if (!s) continue;
    aSet.set(s, (aSet.get(s) ?? 0) + 1);
  }
  const same: string[] = [];
  const added: string[] = [];
  for (const raw of b) {
    const s = norm(raw);
    if (!s) continue;
    const c = aSet.get(s) ?? 0;
    if (c > 0) {
      same.push(s);
      aSet.set(s, c - 1);
    } else {
      added.push(s);
    }
  }
  const removed: string[] = [];
  for (const [s, c] of aSet) for (let i = 0; i < c; i++) removed.push(s);
  return { same, added, removed };
}

export type KpiKind = "higher-better" | "lower-better";

const KPI_META: Record<string, { label: string; kind: KpiKind }> = {
  ctr: { label: "CTR", kind: "higher-better" },
  cpc: { label: "CPC", kind: "lower-better" },
  cpm: { label: "CPM", kind: "lower-better" },
  cpa: { label: "CPA", kind: "lower-better" },
  roas: { label: "ROAS", kind: "higher-better" },
  frequencia: { label: "Frequência", kind: "lower-better" },
};

export type KpiDelta = {
  key: string;
  label: string;
  a: string;
  b: string;
  deltaPct: number | null;
  tone: "good" | "bad" | "neutral";
};

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  // grab first number-like token (handles "2.5%", "R$ 12,30", "1,5x")
  const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function diffKpis(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): KpiDelta[] {
  return Object.entries(KPI_META).map(([key, meta]) => {
    const av = (a?.[key] as string | undefined) ?? "";
    const bv = (b?.[key] as string | undefined) ?? "";
    const an = parseNumber(av);
    const bn = parseNumber(bv);
    let deltaPct: number | null = null;
    let tone: KpiDelta["tone"] = "neutral";
    if (an != null && bn != null && an !== 0) {
      deltaPct = ((bn - an) / Math.abs(an)) * 100;
      const improved = meta.kind === "higher-better" ? bn > an : bn < an;
      const worse = meta.kind === "higher-better" ? bn < an : bn > an;
      tone = improved ? "good" : worse ? "bad" : "neutral";
    }
    return { key, label: meta.label, a: String(av || "—"), b: String(bv || "—"), deltaPct, tone };
  });
}