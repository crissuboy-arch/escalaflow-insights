import { describe, it, expect } from "vitest";
import {
  buildHandoffProjectView,
  statusLabelForHandoff,
  toHandoffProjectListItem,
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
  image_url: "https://scontent.fna.fbcdn.net/carla-figurinhas-real.jpg",
  video_url: null,
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

  it("dados exibidos vêm do registro real/mockado (nome, plataforma, score, nicho, país, mídia)", () => {
    const view = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(view.opportunity).toEqual({
      title: "Pack de figurinhas para Stories",
      platform: "Facebook",
      score: 88,
      niche: "Infoproduto",
      country: "BR",
      imageUrl: "https://scontent.fna.fbcdn.net/carla-figurinhas-real.jpg",
      videoUrl: null,
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

// Second, distinct fixture (Suitable — Facebook, score 99, próprio
// handoff_id de teste) usado para provar que Carla e Suitable NUNCA se
// misturam: cada handoff/URL abre exatamente o seu próprio registro.
const SUITABLE_HANDOFF: HandoffRow = {
  handoff_id: "test-fixture-ho_suitable_sent",
  source_table: "collected_ads",
  source_id: "test-fixture-suitable-ad-id",
  status: "SENT",
  created_at: "2026-09-21T18:00:00.000Z",
  sent_at: "2026-09-21T18:00:05.000Z",
  last_error: null,
};

const SUITABLE_AD: CollectedAdSummaryRow = {
  headline: "Suitable — oferta real de alta pontuação",
  advertiser: "Suitable",
  platform: "Facebook",
  score: 99,
  niche: "Fitness",
  country: "US",
  image_url: "https://scontent.fna.fbcdn.net/suitable-real.jpg",
  video_url: null,
};

describe("Carla e Suitable nunca se misturam (dois handoffs distintos e reais)", () => {
  it("cada handoff_id abre exatamente o próprio registro — Carla nunca cai no fallback do Suitable", () => {
    const carla = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    const suitable = buildHandoffProjectView(SUITABLE_HANDOFF, SUITABLE_AD);

    expect(carla.handoffId).toBe(CARLA_HANDOFF.handoff_id);
    expect(carla.opportunity?.title).toBe("Pack de figurinhas para Stories");
    expect(carla.opportunity?.score).toBe(88);

    expect(suitable.handoffId).toBe(SUITABLE_HANDOFF.handoff_id);
    expect(suitable.opportunity?.title).toBe("Suitable — oferta real de alta pontuação");
    expect(suitable.opportunity?.score).toBe(99);

    expect(carla.handoffId).not.toBe(suitable.handoffId);
    expect(carla.opportunity?.title).not.toBe(suitable.opportunity?.title);
  });

  it("refresh (nova chamada pura com o mesmo handoffId) preserva a mesma Carla, sem deriva para outro registro", () => {
    const first = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    const afterRefresh = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(afterRefresh).toEqual(first);
    expect(afterRefresh.handoffId).toBe(CARLA_HANDOFF.handoff_id);
  });

  it("a listagem 'Continuar onde parou' mapeia cada item com o seu próprio handoffId, sem contaminação cruzada", () => {
    const carlaView = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    const suitableView = buildHandoffProjectView(SUITABLE_HANDOFF, SUITABLE_AD);
    const list = [carlaView, suitableView].map(toHandoffProjectListItem);

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ kind: "handoff", handoffId: CARLA_HANDOFF.handoff_id, title: "Pack de figurinhas para Stories", score: 88 });
    expect(list[1]).toMatchObject({ kind: "handoff", handoffId: SUITABLE_HANDOFF.handoff_id, title: "Suitable — oferta real de alta pontuação", score: 99 });
    expect(list[0].handoffId).not.toBe(list[1].handoffId);
  });
});

describe("Mídia real do card handoff — resolvida por source_table + source_id, nunca por nome", () => {
  it("Carla resolve a própria mídia real a partir do source (collected_ads.image_url)", () => {
    const view = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    expect(view.opportunity?.imageUrl).toBe("https://scontent.fna.fbcdn.net/carla-figurinhas-real.jpg");
  });

  it("Suitable resolve a própria mídia real, distinta da Carla", () => {
    const view = buildHandoffProjectView(SUITABLE_HANDOFF, SUITABLE_AD);
    expect(view.opportunity?.imageUrl).toBe("https://scontent.fna.fbcdn.net/suitable-real.jpg");
  });

  it("Carla nunca recebe a mídia do Suitable e vice-versa (nenhum lookup por nome)", () => {
    const carla = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    const suitable = buildHandoffProjectView(SUITABLE_HANDOFF, SUITABLE_AD);
    expect(carla.opportunity?.imageUrl).not.toBe(suitable.opportunity?.imageUrl);
    // Passar o ad ERRADO para o handoff da Carla (mesmo por engano) nunca
    // deve produzir um resultado que pareça o do Suitable — a função é pura
    // e só usa exatamente o `ad` que o chamador passou, resolvido por
    // source_id no chamador (loadHandoffProjectFn/listSentHandoffProjectsFn),
    // nunca por advertiser/título.
    const carlaComAdErrado = buildHandoffProjectView(CARLA_HANDOFF, SUITABLE_AD);
    expect(carlaComAdErrado.handoffId).toBe(CARLA_HANDOFF.handoff_id);
    expect(carlaComAdErrado.opportunity?.imageUrl).toBe(SUITABLE_AD.image_url);
    expect(carlaComAdErrado.handoffId).not.toBe(SUITABLE_HANDOFF.handoff_id);
  });

  it("a listagem 'Continuar onde parou' carrega imageUrl/videoUrl próprios de cada item", () => {
    const carlaView = buildHandoffProjectView(CARLA_HANDOFF, CARLA_AD);
    const suitableView = buildHandoffProjectView(SUITABLE_HANDOFF, SUITABLE_AD);
    const [carlaItem, suitableItem] = [carlaView, suitableView].map(toHandoffProjectListItem);
    expect(carlaItem.imageUrl).toBe("https://scontent.fna.fbcdn.net/carla-figurinhas-real.jpg");
    expect(suitableItem.imageUrl).toBe("https://scontent.fna.fbcdn.net/suitable-real.jpg");
  });

  it("fallback visual (imageUrl/videoUrl nulos) só ocorre quando o source realmente não tem mídia", () => {
    const semMidia: CollectedAdSummaryRow = { ...CARLA_AD, image_url: null, video_url: null };
    const view = buildHandoffProjectView(CARLA_HANDOFF, semMidia);
    expect(view.opportunity?.imageUrl).toBeNull();
    expect(view.opportunity?.videoUrl).toBeNull();
    // Nunca inventa uma URL de mídia quando não há uma real.
    expect(view.opportunity?.imageUrl).not.toBe(CARLA_AD.image_url);
  });

  it("vídeo real é preservado quando é a única mídia disponível (mesma prioridade do card de /minerar)", () => {
    const soVideo: CollectedAdSummaryRow = { ...CARLA_AD, image_url: null, video_url: "https://video.example.com/carla.mp4" };
    const view = buildHandoffProjectView(CARLA_HANDOFF, soVideo);
    expect(view.opportunity?.imageUrl).toBeNull();
    expect(view.opportunity?.videoUrl).toBe("https://video.example.com/carla.mp4");
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
