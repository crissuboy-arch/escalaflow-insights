// Fase 1 (central) — pure mission-model tests. No network, no Supabase.
// These tests pin the HARD RULE: 202 / NEEDS_REVIEW is "Aguardando
// revisão", never a concluded state, and remote refs are only ever taken
// from a body the receiver actually returned.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  EMPTY_REMOTE_REF,
  isAwaitingReview,
  mapRemoteOutcome,
  parseRemoteRefs,
  resolveOrganizationId,
  serializeRemoteRefs,
  statusLabelForMission,
} from "./mission";

describe("mapRemoteOutcome — a regra dura do 202 / NEEDS_REVIEW", () => {
  it("HTTP 202 sem corpo → NEEDS_REVIEW, nunca SENT", () => {
    const { status, remote } = mapRemoteOutcome(202, null);
    expect(status).toBe("NEEDS_REVIEW");
    expect(remote.mission_id).toBeNull();
  });

  it("HTTP 202 com corpo → NEEDS_REVIEW mesmo que o corpo diga outra coisa", () => {
    const { status } = mapRemoteOutcome(202, { status: "RECEIVED" });
    expect(status).toBe("NEEDS_REVIEW");
  });

  it("HTTP 200 com status NEEDS_REVIEW no corpo → NEEDS_REVIEW", () => {
    const { status } = mapRemoteOutcome(200, { status: "NEEDS_REVIEW" });
    expect(status).toBe("NEEDS_REVIEW");
  });

  it("HTTP 200 com status needs_review em minúsculas → NEEDS_REVIEW", () => {
    const { status } = mapRemoteOutcome(200, { status: "needs_review" });
    expect(status).toBe("NEEDS_REVIEW");
  });

  it("HTTP 200 sem estado de revisão → SENT", () => {
    const { status } = mapRemoteOutcome(200, { status: "RECEIVED" });
    expect(status).toBe("SENT");
  });

  it("HTTP 201 sem corpo → SENT", () => {
    const { status } = mapRemoteOutcome(201, null);
    expect(status).toBe("SENT");
  });

  it("corpo lixo (string, array, null) → SENT sem referências inventadas", () => {
    for (const body of ["ok", [1, 2], null, 42]) {
      const { status, remote } = mapRemoteOutcome(200, body);
      expect(status).toBe("SENT");
      expect(remote).toMatchObject({
        mission_id: null,
        execution_id: null,
        remote_status: null,
        review_url: null,
        result_files: [],
      });
    }
  });

  it("extrai mission_id, execution_id, estado remoto verbatim, review_url e ficheiros", () => {
    const { status, remote } = mapRemoteOutcome(200, {
      status: "NEEDS_REVIEW",
      mission_id: "m-1",
      execution_id: "e-1",
      review_url: "https://review.example.com/m-1",
      files: [
        { name: "plano.pdf", url: "https://files.example.com/plano.pdf" },
        "https://files.example.com/outro.pdf",
        { name: "sem-url" },
      ],
    });
    expect(status).toBe("NEEDS_REVIEW");
    expect(remote.mission_id).toBe("m-1");
    expect(remote.execution_id).toBe("e-1");
    expect(remote.remote_status).toBe("NEEDS_REVIEW");
    expect(remote.review_url).toBe("https://review.example.com/m-1");
    expect(remote.result_files).toEqual([
      { name: "plano.pdf", url: "https://files.example.com/plano.pdf" },
      { name: null, url: "https://files.example.com/outro.pdf" },
    ]);
  });

  it("estado remoto desconhecido é devolvido verbatim, nunca remapeado para concluído", () => {
    const { status, remote } = mapRemoteOutcome(200, { status: "WEIRD_REMOTE_STATE" });
    expect(status).toBe("SENT");
    expect(remote.remote_status).toBe("WEIRD_REMOTE_STATE");
  });

  it("aceita result_files e artifacts como fontes de ficheiros", () => {
    expect(mapRemoteOutcome(200, { result_files: [{ url: "https://x/1" }] }).remote.result_files).toEqual([
      { name: null, url: "https://x/1" },
    ]);
    expect(mapRemoteOutcome(200, { artifacts: [{ url: "https://x/2" }] }).remote.result_files).toEqual([
      { name: null, url: "https://x/2" },
    ]);
  });
});

describe("statusLabelForMission — nenhuma palavra de conclusão para NEEDS_REVIEW", () => {
  it("NEEDS_REVIEW → 'Aguardando revisão'", () => {
    expect(statusLabelForMission("NEEDS_REVIEW")).toBe("Aguardando revisão");
  });

  it("SENT mantém o rótulo honesto pré-existente", () => {
    expect(statusLabelForMission("SENT")).toBe("Projeto criado — aguardando planejamento");
  });

  it("nenhum rótulo promete conclusão sem evidência", () => {
    const forbidden = /concluído|concluido|finalizado|aprovado|em execução/i;
    for (const s of ["NOT_SENT", "SENDING", "SENT", "NEEDS_REVIEW", "FAILED"] as const) {
      expect(statusLabelForMission(s)).not.toMatch(forbidden);
    }
  });

  it("isAwaitingReview só é verdade para NEEDS_REVIEW", () => {
    expect(isAwaitingReview("NEEDS_REVIEW")).toBe(true);
    for (const s of ["NOT_SENT", "SENDING", "SENT", "FAILED"] as const) {
      expect(isAwaitingReview(s)).toBe(false);
    }
  });
});

describe("serializeRemoteRefs / parseRemoteRefs — ida e volta sem inventar nada", () => {
  it("ref vazio serializa para null (coluna limpa)", () => {
    expect(serializeRemoteRefs(EMPTY_REMOTE_REF)).toBeNull();
  });

  it("ref com conteúdo faz round-trip", () => {
    const remote = {
      ...EMPTY_REMOTE_REF,
      review_url: "https://review.example.com/m-1",
      result_files: [{ name: "plano.pdf", url: "https://files.example.com/plano.pdf" }],
      received_at: "2026-10-29T00:00:00.000Z",
    };
    const parsed = parseRemoteRefs(serializeRemoteRefs(remote));
    expect(parsed.review_url).toBe("https://review.example.com/m-1");
    expect(parsed.result_files).toEqual([{ name: "plano.pdf", url: "https://files.example.com/plano.pdf" }]);
    expect(parsed.received_at).toBe("2026-10-29T00:00:00.000Z");
  });

  it("valor inválido parseia para vazio, nunca lança", () => {
    for (const v of [null, "x", 42, []]) {
      expect(parseRemoteRefs(v)).toEqual({ review_url: null, result_files: [], received_at: null });
    }
  });
});

describe("resolveOrganizationId — single-tenant honesto", () => {
  beforeEach(() => {
    vi.stubEnv("SCALAFLOW_ORGANIZATION_ID", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem variável → null (multi-org NÃO simulado)", () => {
    expect(resolveOrganizationId()).toBeNull();
  });

  it("com variável → o valor configurado", () => {
    vi.stubEnv("SCALAFLOW_ORGANIZATION_ID", "org-123");
    expect(resolveOrganizationId()).toBe("org-123");
  });
});
