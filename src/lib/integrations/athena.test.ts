// Tests for the Athena Control integration (src/lib/integrations/athena.ts).
//
// Covers: bearer <redacted> (timing-safe), real aggregate counts, demo-row
// exclusion, per-table failure isolation, and absence of PII/secrets in the
// /stats payload.
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Fake Supabase admin client ───────────────────────────────────────────
// Supports the exact chains used by athena.ts:
//   .from(t).select("id", { count: "exact", head: true })
//   .from(t).select(...).eq(col, val)
//   .from(t).select(...).eq(col1, v1).eq(col2, v2)
// The builder is thenable and resolves { data, error, count }.
type Row = Record<string, unknown>;
let FIXTURES: Record<string, Row[]> = {};
let FAILING_TABLES = new Set<string>();
// Tables whose query builder never settles — used to prove the per-query
// timeout fires instead of hanging the endpoint.
let HANGING_TABLES = new Set<string>();

function makeQuery(table: string) {
  let rows = [...(FIXTURES[table] ?? [])];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      rows = rows.filter((r) => r[col] === val);
      return builder;
    },
    then: (resolve: (v: { data: Row[] | null; error: unknown; count: number | null }) => void) => {
      if (HANGING_TABLES.has(table)) return; // never settles
      return FAILING_TABLES.has(table)
        ? resolve({ data: null, error: { message: `relation "public.${table}" does not exist` }, count: null })
        : resolve({ data: rows, error: null, count: rows.length });
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => makeQuery(table) },
}));

const {
  bearerMatchesAthena,
  collectAthenaStats,
  classifyDbError,
  runCountQuery,
  ATHENA_PLATFORM,
  ATHENA_CONTRACT_VERSION,
  ATHENA_API_KEY_ENV,
} = await import("./athena");

const SECRET = "scalaflow-athena-test-key-64hex-aaaaaaaa-bbbbbbbb-cccccccc-dddddddd";

function seed() {
  FIXTURES = {
    analyses: [
      { id: "a1", user_id: "user-uuid-1", title: "Análise 1", content: { secret: "x" } },
      { id: "a2", user_id: "user-uuid-2", title: "Análise 2", content: {} },
    ],
    ai_analyses: [
      { id: "ai1", user_id: "user-uuid-1", is_demo: false, promise: "p1" },
      { id: "ai2", user_id: "user-uuid-1", is_demo: true, promise: "demo" },
    ],
    mined_offers: [
      { id: "m1", status: "teste", is_demo: false, advertiser_name: "Anunciante A" },
      { id: "m2", status: "quente", is_demo: false, advertiser_name: "Anunciante B" },
      { id: "m3", status: "quente", is_demo: true, advertiser_name: "Demo C" },
      { id: "m4", status: "validando", is_demo: false, advertiser_name: "Anunciante D" },
    ],
    offers: [{ id: "o1" }, { id: "o2" }, { id: "o3" }],
    saved_offers: [{ id: "s1" }],
    mining_runs: [
      { id: "r1", status: "completed" },
      { id: "r2", status: "running" },
    ],
    project_campaigns: [{ id: "c1", status: "draft" }],
  };
  FAILING_TABLES = new Set<string>();
  HANGING_TABLES = new Set<string>();
}

beforeEach(seed);

describe("bearerMatchesAthena", () => {
  it("aceita o Bearer exato", () => {
    expect(bearerMatchesAthena(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });
  it("rejeita chave errada", () => {
    expect(bearerMatchesAthena("Bearer chave-errada", SECRET)).toBe(false);
  });
  it("rejeita sem header", () => {
    expect(bearerMatchesAthena(null, SECRET)).toBe(false);
  });
  it("rejeita esquema diferente de Bearer", () => {
    expect(bearerMatchesAthena(`Token ${SECRET}`, SECRET)).toBe(false);
  });
  it("rejeita Bearer vazio", () => {
    expect(bearerMatchesAthena("Bearer ", SECRET)).toBe(false);
  });
  it("rejeita quando a chave esperada não está configurada", () => {
    expect(bearerMatchesAthena(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(bearerMatchesAthena(`Bearer ${SECRET}`, "")).toBe(false);
  });
  it("expõe o nome da variável de ambiente exclusiva", () => {
    expect(ATHENA_API_KEY_ENV).toBe("SCALAFLOW_ATHENA_API_KEY");
  });
});

describe("collectAthenaStats", () => {
  it("retorna plataforma e versão do contrato", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.platform).toBe("ScalaFlow");
    expect(stats.platform).toBe(ATHENA_PLATFORM);
    expect(stats.contract).toBe("v1");
    expect(stats.contract).toBe(ATHENA_CONTRACT_VERSION);
  });

  it("conta agregados reais de cada tabela", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.analyses.total).toBe(2);
    expect(stats.analyses.ai_total).toBe(1); // is_demo=true excluído
    expect(stats.offers.mined_total).toBe(3); // demo excluído
    expect(stats.offers.collected_total).toBe(3);
    expect(stats.offers.saved_total).toBe(1);
    expect(stats.mining.runs_total).toBe(2);
    expect(stats.mining.completed_total).toBe(1);
    expect(stats.campaigns.total).toBe(1);
  });

  it("distribui mined_offers por status sem contar demos", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.offers.by_status["teste"]).toBe(1);
    expect(stats.offers.by_status["quente"]).toBe(1); // demo "quente" excluído
    expect(stats.offers.by_status["validando"]).toBe(1);
    expect(stats.offers.by_status["escalando"]).toBe(0);
  });

  it("marca subscriptions e ai_usage como indisponíveis, nunca inventados", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.subscriptions).toBeNull();
    expect(stats.ai_usage).toBeNull();
    expect(stats.unavailable).toContain("subscriptions");
    expect(stats.unavailable).toContain("ai_usage");
  });

  it("isola falha de uma tabela: retorna null só nela", async () => {
    FAILING_TABLES.add("project_campaigns");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.campaigns.total).toBeNull();
    expect(stats.analyses.total).toBe(2);
    expect(stats.offers.mined_total).toBe(3);
  });

  it("não expõe PII, segredos ou conteúdo das linhas", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    const payload = JSON.stringify(stats);
    for (const leak of [
      "user-uuid-1",
      "user-uuid-2",
      "Anunciante A",
      "Anunciante B",
      "Análise 1",
      SECRET,
    ]) {
      expect(payload).not.toContain(leak);
    }
  });

  it("db_status.ok é true quando todas as consultas funcionam", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.db_status.ok).toBe(true);
    expect(stats.db_status.error_code).toBeNull();
    expect(stats.db_status.failed_tables).toEqual([]);
  });

  it("db_status denuncia falha do banco em vez de mascarar nulls como dados", async () => {
    FAILING_TABLES.add("analyses");
    FAILING_TABLES.add("mined_offers");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stats = await collectAthenaStats(supabaseAdmin);
    expect(stats.db_status.ok).toBe(false);
    expect(stats.db_status.error_code).toBe("table_missing");
    expect(stats.db_status.failed_tables).toContain("analyses");
    expect(stats.db_status.failed_tables).toContain("mined_offers");
    expect(stats.analyses.total).toBeNull();
    // tabelas saudáveis continuam a contar
    expect(stats.offers.collected_total).toBe(3);
  });
});

describe("classifyDbError", () => {
  it("mapeia cada categoria para um código seguro", () => {
    expect(classifyDbError(new Error("Missing Supabase environment variable(s): SUPABASE_URL"))).toBe("missing_env");
    expect(classifyDbError(Object.assign(new Error("x"), { code: "ENOTFOUND" }))).toBe("dns_error");
    expect(classifyDbError(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe("connection_error");
    expect(classifyDbError(Object.assign(new Error("query exceeded 8000ms"), { code: "QUERY_TIMEOUT" }))).toBe("timeout");
    expect(classifyDbError(new Error("fetch failed"))).toBe("unknown");
    expect(
      classifyDbError(Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } })),
    ).toBe("dns_error");
    expect(classifyDbError({ message: "Invalid API key", code: "401" })).toBe("auth_failed");
    expect(classifyDbError({ message: 'relation "public.offers" does not exist', code: "42P01" })).toBe(
      "table_missing",
    );
    expect(classifyDbError({ message: "permission denied for table offers", code: "42501" })).toBe(
      "permission_denied",
    );
    expect(classifyDbError(new Error("algo totalmente inesperado"))).toBe("unknown");
    expect(classifyDbError(null)).toBe("unknown");
  });

  it("nunca devolve a mensagem original — só o código", () => {
    const code = classifyDbError(new Error("connect https://xyz.supabase.co: secret leak"));
    expect(typeof code).toBe("string");
    expect(code).not.toContain("xyz.supabase.co");
    expect(code).not.toContain("secret");
  });
});

describe("runCountQuery", () => {
  it("aplica timeout curto em vez de esperar a consulta travada", async () => {
    HANGING_TABLES.add("offers");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = Date.now();
    const res = await runCountQuery(supabaseAdmin, "offers", [], 50);
    const elapsed = Date.now() - start;
    expect(res.count).toBeNull();
    expect(res.errorCode).toBe("timeout");
    expect(elapsed).toBeLessThan(2000);
  });

  it("conta normalmente quando a consulta responde", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await runCountQuery(supabaseAdmin, "offers");
    expect(res.count).toBe(3);
    expect(res.errorCode).toBeNull();
  });
});
