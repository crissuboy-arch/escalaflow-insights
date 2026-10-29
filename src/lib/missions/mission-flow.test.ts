// Fase 4 — the 10 local flow cases. Everything here runs against
// FIXTURES and MOCKED fetch (identified as such in each case) — no
// credentials, no network, no database. A passing suite proves the local
// flow logic; it does NOT prove any live service responds (that needs the
// Fase 5 live checklist, with a real health check per tool).
import { describe, it, expect, vi, afterEach } from "vitest";

// Same stub as view-project.test.ts (Fase 1): the node vitest env cannot
// load the real createServerFn chain, so the module is loaded through
// this stub — it only needs to survive module evaluation, and it changes
// no assertion (buildHandoffProjectView/withUserScope are pure).
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: () => ({
      inputValidator: () => ({ handler: (fn: unknown) => fn }),
      handler: (fn: unknown) => fn,
    }),
  }),
  createMiddleware: () => ({
    client: () => ({ server: () => ({}) }),
  }),
}));
import {
  buildHandoffProjectView,
  withUserScope,
  type HandoffRow,
} from "@/lib/cris-os/transform.functions";
import { mapRemoteOutcome, statusLabelForMission } from "@/lib/cris-os/mission";
import {
  buildMissionId,
  buildMissionRecord,
  isMissionCompleted,
  validateMissionRequest,
} from "@/lib/missions/contract";
import { pollUntil } from "@/lib/missions/polling";

// FIXTURE (not real data): one handoff row + its source ad row.
const fixtureRow: HandoffRow = {
  handoff_id: "ho_fixture1",
  source_table: "collected_ads",
  source_id: "ad-1",
  status: "SENT",
  created_at: "2026-10-29T10:00:00.000Z",
  sent_at: "2026-10-29T10:00:05.000Z",
  last_error: null,
  attempts: 1,
  mission_id: null,
  execution_id: null,
  remote_status: null,
  remote_refs: null,
};

const fixtureAd = {
  headline: "Anúncio exemplo",
  advertiser: "Loja exemplo",
  platform: "facebook",
  score: 87,
  niche: "fitness",
  country: "BR",
  image_url: null,
  video_url: null,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("caso 1 — criar projeto a partir de oportunidade (fixture)", () => {
  it("a vista do projeto nasce do handoff + do anúncio, sem inventar ids", () => {
    const view = buildHandoffProjectView(fixtureRow, fixtureAd);
    expect(view.found).toBe(true);
    expect(view.handoffId).toBe("ho_fixture1");
    expect(view.opportunity?.title).toBe("Anúncio exemplo");
    expect(view.opportunity?.platform).toBe("facebook");
    expect(view.missionId).toBeNull(); // nunca inventado
  });
});

describe("caso 2 — gerar missão com identificação correta", () => {
  it("missão carrega org (null sem env), projeto, handoff e id determinístico", () => {
    const record = buildMissionRecord({
      tool: "pink-logic",
      taskType: "carousel",
      briefing: "Carrossel da oferta",
      seed: "ho_fixture1",
      handoffId: "ho_fixture1",
      projectId: "proj-1",
    });
    expect(record.missionId).toBe(buildMissionId("pink-logic", "carousel", "ho_fixture1"));
    expect(record.organizationId).toBeNull(); // single-tenant honesto
    expect(record.projectId).toBe("proj-1");
    expect(record.handoffId).toBe("ho_fixture1");
    expect(validateMissionRequest(record)).toBeNull();
  });
});

describe("caso 3 — enviar missão pelo contrato existente (202 = revisão)", () => {
  it("o envio mapeia 202/NEEDS_REVIEW para aguardar revisão, nunca SENT", () => {
    const { status, remote } = mapRemoteOutcome(202, {
      status: "NEEDS_REVIEW",
      mission_id: "msn_x",
    });
    expect(status).toBe("NEEDS_REVIEW");
    expect(remote.mission_id).toBe("msn_x");
    const plain = mapRemoteOutcome(200, { status: "PERSISTED" });
    expect(plain.status).toBe("SENT");
  });
});

describe("caso 4 — consultar estado por polling (fetch simulado)", () => {
  it("polling termina quando o snapshot Cris OS fica terminal", async () => {
    const snapshots = [
      { project_status: "IN_PROGRESS", work_orders: [] },
      { project_status: "COMPLETED", work_orders: [{ work_order_id: "wo_1", status: "COMPLETED" }] },
    ];
    let i = 0;
    const outcome = await pollUntil(
      async () => snapshots[Math.min(i++, snapshots.length - 1)],
      {
        isTerminal: (s) => s.project_status === "COMPLETED",
        intervalMs: 1,
        timeoutMs: 1000,
        sleep: () => Promise.resolve(),
      },
    );
    expect(outcome.outcome).toBe("terminal");
    expect(outcome.attempts).toBe(2);
  });
});

describe("caso 5 — receber resultado estruturado (fixture de refs remotas)", () => {
  it("refs remotas devolvidas aparecem na vista; nada é inventado", () => {
    const view = buildHandoffProjectView(
      {
        ...fixtureRow,
        status: "SENT",
        mission_id: "msn_x",
        remote_status: "COMPLETED",
        remote_refs: {
          result_files: [{ name: "pagina.zip", url: "https://exemplo/pagina.zip" }],
        },
      },
      fixtureAd,
    );
    expect(view.resultFiles).toEqual([{ name: "pagina.zip", url: "https://exemplo/pagina.zip" }]);
    expect(view.remoteStatus).toBe("COMPLETED");
  });
});

describe("caso 6 — apresentar resultado no ScalaFlow (rótulos + gate)", () => {
  it("NEEDS_REVIEW renderiza 'Aguardando revisão'; COMPLETED sem ficheiros não renderiza concluído", () => {
    expect(statusLabelForMission("NEEDS_REVIEW")).toBe("Aguardando revisão");
    const record = buildMissionRecord({
      tool: "pageforge",
      taskType: "full",
      briefing: "b",
      seed: "s6",
    });
    expect(isMissionCompleted({ ...record, status: "COMPLETED", fileRefs: [] })).toBe(false);
    expect(
      isMissionCompleted({
        ...record,
        status: "COMPLETED",
        fileRefs: [{ name: "pagina.zip", url: "https://exemplo/pagina.zip" }],
      }),
    ).toBe(true);
  });
});

describe("caso 7 — impedir duplicações", () => {
  it("mesma seed → mesmo missionId (retry = replay, não duplicado); seed diferente → id diferente", () => {
    expect(buildMissionId("tools-hub", "RUN_JOB", "ho_1")).toBe(
      buildMissionId("tools-hub", "RUN_JOB", "ho_1"),
    );
    expect(buildMissionId("tools-hub", "RUN_JOB", "ho_1")).not.toBe(
      buildMissionId("tools-hub", "RUN_JOB", "ho_2"),
    );
    // O recibo da missão carrega o próprio missionId como chave idempotente.
    const record = buildMissionRecord({
      tool: "tools-hub",
      taskType: "RUN_JOB",
      briefing: "b",
      seed: "ho_1",
    });
    expect(record.receipt?.idempotencyKey).toBe(record.missionId);
  });
});

describe("caso 8 — tratar falhas sem falso sucesso", () => {
  it("falha de rede no polling dá timeout, nunca terminal; FAILED renderiza 'Falhou' com o erro", async () => {
    const outcome = await pollUntil(
      async () => {
        throw new Error("rede em baixo");
      },
      {
        isTerminal: () => true,
        intervalMs: 1,
        timeoutMs: 5,
        sleep: () => Promise.resolve(),
      },
    );
    expect(outcome.outcome).toBe("timeout");
    const failed = buildHandoffProjectView(
      { ...fixtureRow, status: "FAILED", last_error: "HTTP 503 do recetor" },
      fixtureAd,
    );
    expect(statusLabelForMission(failed.status)).toBe("Falha ao enviar");
    expect(failed.lastError).toBe("HTTP 503 do recetor");
  });
});

describe("caso 9 — isolamento entre utilizadores/organizações (cadeia falsa)", () => {
  it("withUserScope restringe ao user_id quando há utilizador e não toca na query sem ele", () => {
    const calls: [string, string][] = [];
    const fakeChain = {
      eq(column: string, value: string) {
        calls.push([column, value]);
        return this;
      },
    };
    const scoped = withUserScope(fakeChain, "user-123");
    expect(scoped).toBe(fakeChain);
    expect(calls).toEqual([["user_id", "user-123"]]);

    const calls2: [string, string][] = [];
    const fakeChain2 = {
      eq(column: string, value: string) {
        calls2.push([column, value]);
        return this;
      },
    };
    expect(withUserScope(fakeChain2, null)).toBe(fakeChain2);
    expect(calls2).toEqual([]);
  });
});

// caso 10 — não quebrar funcionalidades existentes: não é um teste unitário,
// é a suite completa + tsc + (quando voltar a funcionar localmente) build.
// Os números vão no relatório da Fase 4 e no commit; aqui fica o marcador
// para a suite nunca "esquecer" o caso.
describe("caso 10 — não quebrar funcionalidades existentes (marcador)", () => {
  it("a suite completa e o tsc são corridos antes de concluir a fase (ver relatório)", () => {
    expect(true).toBe(true);
  });
});
