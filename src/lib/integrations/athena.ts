// Athena Control integration — core logic (plain, unit-testable functions).
//
// Thin HTTP adapters live in:
//   src/routes/api/integrations.health.ts  (GET, público)
//   src/routes/api/integrations.stats.ts    (GET, Bearer SCALAFLOW_ATHENA_API_KEY)
//
// This module never touches miners/collectors, agents, automations, Cris OS
// or the app's own commercial features — it only reads already-stored
// aggregate counts from the existing Supabase tables.
//
// Contrato de resposta (/stats):
//   {
//     "platform": "ScalaFlow",
//     "contract": "v1",
//     "analyses":   { "total": <n|null>, "ai_total": <n|null> },
//     "offers":     { "mined_total": <n|null>, "by_status": {...}, "collected_total": <n|null>, "saved_total": <n|null> },
//     "mining":     { "runs_total": <n|null>, "completed_total": <n|null> },
//     "campaigns":  { "total": <n|null> },
//     "subscriptions": null,
//     "ai_usage": null,
//     "unavailable": ["subscriptions", "ai_usage"],
//     "notes": { ... }
//   }
// Demo rows (is_demo = true) are excluded from mined/ai counts so the
// aggregates reflect real operational data only. Zero PII: only counts.
import { createHash, timingSafeEqual } from "node:crypto";

export const ATHENA_CONTRACT_VERSION = "v1";
export const ATHENA_PLATFORM = "ScalaFlow";
export const ATHENA_API_KEY_ENV = "SCALAFLOW_ATHENA_API_KEY";

/** Timing-safe Bearer compare against the exclusive ScalaFlow key. */
export function bearerMatchesAthena(
  authHeader: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || !authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice("Bearer ".length).trim();
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Supabase access helpers ──────────────────────────────────────────────
// Each query is isolated: a missing/failing table resolves to null instead
// of breaking the whole /stats response.

type AdminClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

async function exactCount(admin: AdminClient, table: string): Promise<number | null> {
  try {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) return null;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

async function exactCountWhere(
  admin: AdminClient,
  table: string,
  column: string,
  value: unknown,
): Promise<number | null> {
  try {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, value);
    if (error) return null;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

async function exactCountWhere2(
  admin: AdminClient,
  table: string,
  column1: string,
  value1: unknown,
  column2: string,
  value2: unknown,
): Promise<number | null> {
  try {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column1, value1)
      .eq(column2, value2);
    if (error) return null;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

const OFFER_STATUSES = ["teste", "validando", "escalando", "quente"] as const;

export interface AthenaStats {
  platform: string;
  contract: string;
  analyses: { total: number | null; ai_total: number | null };
  offers: {
    mined_total: number | null;
    by_status: Record<string, number | null>;
    collected_total: number | null;
    saved_total: number | null;
  };
  mining: { runs_total: number | null; completed_total: number | null };
  campaigns: { total: number | null };
  subscriptions: null;
  ai_usage: null;
  unavailable: string[];
  notes: Record<string, string>;
}

export async function collectAthenaStats(admin: AdminClient): Promise<AthenaStats> {
  const [
    analysesTotal,
    aiTotal,
    minedTotal,
    collectedTotal,
    savedTotal,
    runsTotal,
    completedRuns,
    campaignsTotal,
  ] = await Promise.all([
    exactCount(admin, "analyses"),
    exactCountWhere(admin, "ai_analyses", "is_demo", false),
    exactCountWhere(admin, "mined_offers", "is_demo", false),
    exactCount(admin, "offers"),
    exactCount(admin, "saved_offers"),
    exactCount(admin, "mining_runs"),
    exactCountWhere(admin, "mining_runs", "status", "completed"),
    exactCount(admin, "project_campaigns"),
  ]);

  const byStatus: Record<string, number | null> = {};
  for (const status of OFFER_STATUSES) {
    // Demo rows excluded here too, same rule as mined_total.
    byStatus[status] = await exactCountWhere2(
      admin,
      "mined_offers",
      "status",
      status,
      "is_demo",
      false,
    );
  }

  return {
    platform: ATHENA_PLATFORM,
    contract: ATHENA_CONTRACT_VERSION,
    analyses: { total: analysesTotal, ai_total: aiTotal },
    offers: {
      mined_total: minedTotal,
      by_status: byStatus,
      collected_total: collectedTotal,
      saved_total: savedTotal,
    },
    mining: { runs_total: runsTotal, completed_total: completedRuns },
    campaigns: { total: campaignsTotal },
    subscriptions: null,
    ai_usage: null,
    unavailable: ["subscriptions", "ai_usage"],
    notes: {
      mined_offers: "Linhas de demonstração (is_demo = true) excluídas.",
      by_status: "Distribuição por status de oportunidade em mined_offers.",
      subscriptions: "Não existe tabela de assinaturas — marcado como indisponível.",
      ai_usage: "Não existe tabela de uso de IA — marcado como indisponível.",
    },
  };
}
