// Mission contract tests — pure, no network, no env except the org
// resolver (single-tenant null by default in tests).
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildMissionId,
  buildMissionRecord,
  isMissionCompleted,
  missionStatusLabel,
  validateMissionRequest,
} from "./contract";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildMissionId — determinístico e idempotente por conteúdo", () => {
  it("mesmo input → mesmo id com prefixo msn_", () => {
    const a = buildMissionId("pink-logic", "carousel", "seed-1");
    const b = buildMissionId("pink-logic", "carousel", "seed-1");
    expect(a).toBe(b);
    expect(a.startsWith("msn_")).toBe(true);
  });

  it("seed diferente → id diferente (retry nunca colide com outro trabalho)", () => {
    expect(buildMissionId("pink-logic", "carousel", "seed-1")).not.toBe(
      buildMissionId("pink-logic", "carousel", "seed-2"),
    );
  });
});

describe("validateMissionRequest — só tarefas auditadas passam", () => {
  it("aceita uma missão válida", () => {
    expect(
      validateMissionRequest({ tool: "pink-logic", taskType: "carousel", briefing: "Faz um carrossel" }),
    ).toBeNull();
  });

  it("rejeita ferramenta desconhecida", () => {
    expect(validateMissionRequest({ tool: "ficticia", taskType: "x", briefing: "b" })).toMatch(
      /desconhecida/,
    );
  });

  it("rejeita tarefa não aceite pela ferramenta (ex.: PROPOSE no Meta Ads, que é só MCP)", () => {
    expect(
      validateMissionRequest({ tool: "meta-ads", taskType: "PROPOSE_ACTION", briefing: "b" }),
    ).toMatch(/não aceite/);
  });

  it("rejeita briefing vazio e params não-objeto", () => {
    expect(validateMissionRequest({ tool: "athena", taskType: "CRIAR_COPY", briefing: "  " })).toMatch(
      /briefing/,
    );
    expect(
      validateMissionRequest({ tool: "athena", taskType: "CRIAR_COPY", briefing: "b", params: "x" }),
    ).toMatch(/params/);
  });
});

describe("buildMissionRecord — forma completa do §6, sem invenções", () => {
  it("preenche ids, recibo idempotente e aprovação NONE (observada, nunca decidida aqui)", () => {
    const record = buildMissionRecord({
      tool: "tools-hub",
      taskType: "RUN_JOB",
      briefing: "Corre o job",
      seed: "handoff-1",
      handoffId: "ho_abc",
    });
    expect(record.missionId.startsWith("msn_")).toBe(true);
    expect(record.receipt?.idempotencyKey).toBe(record.missionId);
    expect(record.handoffId).toBe("ho_abc");
    expect(record.status).toBe("NOT_SENT");
    expect(record.approval).toEqual({ state: "NONE", source: null, decidedAt: null });
    expect(record.organizationId).toBeNull(); // single-tenant honesto sem env
  });
});

describe("isMissionCompleted — COMPLETED exige artefacto real", () => {
  const base = buildMissionRecord({
    tool: "pageforge",
    taskType: "full",
    briefing: "b",
    seed: "s",
  });
  it("COMPLETED sem ficheiros NÃO conta como concluído", () => {
    expect(isMissionCompleted({ ...base, status: "COMPLETED", fileRefs: [] })).toBe(false);
  });
  it("COMPLETED com ficheiros conta", () => {
    expect(
      isMissionCompleted({
        ...base,
        status: "COMPLETED",
        fileRefs: [{ name: "pagina.zip", url: "https://x/pagina.zip" }],
      }),
    ).toBe(true);
  });
  it("NEEDS_REVIEW nunca é 'Aguardando revisão' disfarçado de concluído", () => {
    expect(missionStatusLabel("NEEDS_REVIEW")).toBe("Aguardando revisão");
    expect(isMissionCompleted({ ...base, status: "NEEDS_REVIEW" })).toBe(false);
  });
});
