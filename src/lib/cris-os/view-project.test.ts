import { describe, it, expect } from "vitest";
import {
  buildHandoffProjectView,
  statusLabelForHandoff,
  type HandoffRow,
  type CollectedAdSummaryRow,
} from "./transform.functions";

// "Ver Projeto" fixtures — Carla Figurinhas (Facebook, score 88, handoff
// already SENT). This is a TEST-ONLY fixture, clearly not production data:
// no handoff is sent, nothing is written to the database. It mirrors the
// scenario that must work in production: a handoff already marked SENT in
// intelligence_handoffs must be recognized from the existing record, never
// by sending a new one.
const CARLA_HANDOFF: HandoffRow = {
  handoff_id: "test-fixture-ho_carla_figurinhas_sent",
  source_table: "collected_ads",
  source_id: "test-fixture-carla-ad-id",
  status: "SENT",
  created_at: "2026-09-20T10:00:00.000Z",
  sent_at: "2026-09-20T10:00:05.000Z",
  last_error: null,
};

const CARLA_AD: CollectedAdSummaryRow = {
  headline: "Pack de figurinhas para Stories",
  advertiser: "Carla Figurinhas",
  platform: "Facebook",
  score: 88,
  niche: "Infoproduto",
  country: "BR",
};

describe("buildHandoffProjectView — Carla Figurinhas (fixture SENT)", () => {
  it("reconhece o handoff já SENT a partir do registro existente, sem enviar nada", () => {
    const view = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(view.found).toBe(true);
    expect(view.status).toBe("SENT");
    expect(view.handoffId).toBe(CARLA_HANDOFF.handoff_id);
  });

  it("expõe apenas identificadores reais: handoff_id e source_table/source_id — nunca um project_id inventado", () => {
    const view = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(view.sourceTable).toBe("collected_ads");
    expect(view.sourceId).toBe(CARLA_HANDOFF.source_id);
    expect(view).not.toHaveProperty("projectId");
    expect(view).not.toHaveProperty("project_id");
  });

  it("dados exibidos vêm do registro real/mockado (nome, plataforma, score, nicho, país)", () => {
    const view = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(view.opportunity).toEqual({
      title: "Pack de figurinhas para Stories",
      platform: "Facebook",
      score: 88,
      niche: "Infoproduto",
      country: "BR",
    });
  });

  it("cai para o advertiser quando não há headline, sem inventar título", () => {
    const adSemHeadline: CollectedAdSummaryRow = { ...CARLA_AD, headline: null };
    const view = buildHandoffProjectView(CARLA_HANDOFF, adSemHeadline);
    expect(view.opportunity?.title).toBe("Carla Figurinhas");
  });

  it("source_table diferente de collected_ads não busca dado de anúncio (sem inventar opportunity)", () => {
    const outroHandoff: HandoffRow = { ...CARLA_HANDOFF, source_table: "anuncios_escalados" };
    const view = buildHandoffProjectView(outroHandoff, null);
    expect(view.opportunity).toBeNull();
  });

  it("é uma função pura e determinística — chamadas repetidas não criam novo handoff nem mudam o resultado", () => {
    const a = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    const b = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(a).toEqual(b);
  });
});

describe("statusLabelForHandoff — nenhuma execução/aprovação é declarada sem evidência", () => {
  it("SENT mostra exatamente 'Projeto criado — aguardando planejamento'", () => {
    expect(statusLabelForHandoff("SENT")).toBe("Projeto criado — aguardando planejamento");
  });

  it("nunca declara BusinessPlan, aprovação, execução ou tarefas para nenhum status", () => {
    const forbidden = /businessplan|aprovad|em execução|tarefa|task/i;
    for (const status of ["NOT_SENT", "SENDING", "SENT", "FAILED"] as const) {
      expect(statusLabelForHandoff(status)).not.toMatch(forbidden);
    }
  });

  it("NOT_SENT/SENDING/FAILED têm rótulos verdadeiros e distintos", () => {
    expect(statusLabelForHandoff("NOT_SENT")).toBe("Ainda não enviado");
    expect(statusLabelForHandoff("SENDING")).toBe("Enviando…");
    expect(statusLabelForHandoff("FAILED")).toBe("Falha ao enviar");
  });
});
