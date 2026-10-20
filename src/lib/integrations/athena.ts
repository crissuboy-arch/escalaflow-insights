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
//     "db_status":  { "ok": <bool>, "error_code": <code|null>, "failed_tables": [...] },
//     "subscriptions": null,
//     "ai_usage": null,
//     "unavailable": ["subscriptions", "ai_usage"],
//     "notes": { ... }
//   }
// Demo rows (is_demo = true) are excluded from mined/ai counts so the
// aggregates reflect real operational data only. Zero PII: only counts.
// db_status makes a database outage explicit — null indicators are never
// presented as valid data when ok is false.
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

// ── Safe DB diagnostics ──────────────────────────────────────────────
// Error codes are safe to expose: they never contain URLs, keys, table
// contents or raw driver messages — only a coarse failure category.

export type DbErrorCode =
  | "missing_env"
  | "dns_error"
  | "timeout"
  | "connection_error"
  | "auth_failed"
  | "table_missing"
  | "permission_denied"
  | "unknown";

export interface DbStatus {
  ok: boolean;
  error_code: DbErrorCode | null;
  failed_tables: string[];
}

/** Per-query ceiling so one slow database can't hold the endpoint for 40s+. */
export const ATHENA_QUERY_TIMEOUT_MS = 8000;

export function classifyDbError(e: unknown): DbErrorCode {
  // Real PostgREST/supabase-js failures arrive as plain { message, code }
  // objects, not Error instances — extract defensively from both shapes.
  const msg =
    e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e ?? "");
  const holder = e as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = String(holder?.code ?? holder?.cause?.code ?? "");
  if (/missing supabase environment/i.test(msg)) return "missing_env";
  if (code === "QUERY_TIMEOUT") return "timeout";
  if (code === "ENOTFOUND") return "dns_error";
  if (code === "ECONNREFUSED") return "connection_error";
  if (/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/i.test(code) || /timed out|operation timed out/i.test(msg))
    return "timeout";
  if (/invalid api key/i.test(msg)) return "auth_failed";
  if (code === "42P01" || /relation .* does not exist/i.test(msg)) return "table_missing";
  if (code === "42501" || /permission denied/i.test(msg)) return "permission_denied";
  return "unknown";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gate = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`query exceeded ${ms}ms`) as Error & { code: string };
      err.code = "QUERY_TIMEOUT";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, gate]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ── Supabase access helpers ──────────────────────────────────────────────
// Each query is isolated: a missing/failing table resolves to null instead
// of breaking the whole /stats response. Failures are classified into safe
// codes and reported via db_status — never silently treated as valid data.

type AdminClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export interface CountResult {
  count: number | null;
  errorCode: DbErrorCode | null;
}

export async function runCountQuery(
  admin: AdminClient,
  table: string,
  filters: Array<[string, unknown]> = [],
  timeoutMs: number = ATHENA_QUERY_TIMEOUT_MS,
): Promise<CountResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = admin.from(table).select("id", { count: "exact", head: true });
    for (const [col, val] of filters) q = q.eq(col, val);
    const { count, error } = await withTimeout(Promise.resolve(q), timeoutMs);
    if (error) return { count: null, errorCode: classifyDbError(error) };
    return { count: typeof count === "number" ? count : null, errorCode: null };
  } catch (e) {
    return { count: null, errorCode: classifyDbError(e) };
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
  db_status: DbStatus;
  subscriptions: null;
  ai_usage: null;
  unavailable: string[];
  notes: Record<string, string>;
}

export async function collectAthenaStats(admin: AdminClient): Promise<AthenaStats> {
  // [table, filters] per query — all run in parallel, each with its own
  // timeout, so the endpoint degrades in ~8s worst case instead of ~40s.
  const specs: Array<{ key: string; table: string; filters: Array<[string, unknown]> }> = [
    { key: "analyses", table: "analyses", filters: [] },
    { key: "ai_analyses", table: "ai_analyses", filters: [["is_demo", false]] },
    { key: "mined_offers", table: "mined_offers", filters: [["is_demo", false]] },
    { key: "offers", table: "offers", filters: [] },
    { key: "saved_offers", table: "saved_offers", filters: [] },
    { key: "mining_runs", table: "mining_runs", filters: [] },
    { key: "mining_runs_completed", table: "mining_runs", filters: [["status", "completed"]] },
    { key: "project_campaigns", table: "project_campaigns", filters: [] },
    ...OFFER_STATUSES.map((status) => ({
      key: `by_status:${status}`,
      table: "mined_offers",
      filters: [
        ["status", status],
        ["is_demo", false],
      ] as Array<[string, unknown]>,
    })),
  ];

  const results = await Promise.all(
    specs.map((s) => runCountQuery(admin, s.table, s.filters)),
  );
  const byKey = new Map(specs.map((s, i) => [s.key, results[i]] as const));

  const failedTables: string[] = [];
  const codes: DbErrorCode[] = [];
  specs.forEach((s, i) => {
    const code = results[i].errorCode;
    if (code) {
      if (!failedTables.includes(s.table)) failedTables.push(s.table);
      codes.push(code);
    }
  });

  const get = (key: string): number | null => byKey.get(key)?.count ?? null;
  const byStatus: Record<string, number | null> = {};
  for (const status of OFFER_STATUSES) byStatus[status] = get(`by_status:${status}`);

  const db_status: DbStatus = {
    ok: failedTables.length === 0,
    error_code: codes.length > 0 ? codes[0] : null,
    failed_tables: failedTables,
  };

  return {
    platform: ATHENA_PLATFORM,
    contract: ATHENA_CONTRACT_VERSION,
    analyses: { total: get("analyses"), ai_total: get("ai_analyses") },
    offers: {
      mined_total: get("mined_offers"),
      by_status: byStatus,
      collected_total: get("offers"),
      saved_total: get("saved_offers"),
    },
    mining: { runs_total: get("mining_runs"), completed_total: get("mining_runs_completed") },
    campaigns: { total: get("project_campaigns") },
    db_status,
    subscriptions: null,
    ai_usage: null,
    unavailable: ["subscriptions", "ai_usage"],
    notes: {
      mined_offers: "Linhas de demonstração (is_demo = true) excluídas.",
      by_status: "Distribuição por status de oportunidade em mined_offers.",
      db_status: "ok=false significa que o banco falhou — os nulls acima não são dados válidos. Ver error_code.",
      subscriptions: "Não existe tabela de assinaturas — marcado como indisponível.",
      ai_usage: "Não existe tabela de uso de IA — marcado como indisponível.",
    },
  };
}
