import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regression guards for the two real production bugs reported after the
// first real handoff (offer "Suitable", Facebook, score 99):
//
// 1) The button never appeared on /minerar because it was never wired into
//    that screen's offer card (it only existed on Análise IA / Ofertas
//    Escaladas). This is a rendering/wiring gap, not something the
//    contract/client/service unit tests below can catch, so it's asserted
//    directly against the route source.
// 2) The "sent" state claimed "Enviado para execução" even though only a
//    project (not an ExecutionPlan/Tasks) exists at that point — a false
//    claim. The UI must only ever claim what actually happened.
const BUTTON_SRC = readFileSync(
  join(__dirname, "TransformToProjectButton.tsx"),
  "utf-8",
);
const MINERAR_SRC = readFileSync(
  join(__dirname, "../routes/_authenticated/minerar.tsx"),
  "utf-8",
);
const ANALISE_IA_SRC = readFileSync(
  join(__dirname, "../routes/_authenticated/analise-ia.tsx"),
  "utf-8",
);
const OFERTAS_ESCALADAS_SRC = readFileSync(
  join(__dirname, "../routes/_authenticated/ofertas-escaladas.tsx"),
  "utf-8",
);
const HANDOFF_VIEW_SRC = readFileSync(
  join(__dirname, "../routes/_authenticated/projetos.handoff.$handoffId.tsx"),
  "utf-8",
);
const PROJETOS_SRC = readFileSync(
  join(__dirname, "../routes/_authenticated/projetos.tsx"),
  "utf-8",
);

describe("TransformToProjectButton — texto de status verdadeiro", () => {
  it("nunca afirma 'execução' concluída no estado 'sent' (apenas o projeto foi criado)", () => {
    // The idle-state CTA tooltip may still invite the user into their
    // "fluxo de execução" — that's a future-tense invitation, not a claim.
    // The bug was the SENT-state text claiming it already happened.
    expect(BUTTON_SRC).not.toMatch(/state === "sent"[\s\S]{0,80}enviado para execução/i);
    expect(BUTTON_SRC).toMatch(/Projeto já criado/);
  });

  it("usa exatamente uma implementação de handoff (checkTransformStatusFn/transformToProjectFn), sem endpoint paralelo", () => {
    const importLines = BUTTON_SRC.match(/from "@\/lib\/cris-os\/transform\.functions"/g) ?? [];
    expect(importLines.length).toBe(1);
    expect(BUTTON_SRC).not.toMatch(/fetch\(|axios|new XMLHttpRequest/);
  });
});

describe("Ver Projeto — navegação independente, sem reenviar handoff", () => {
  it("renderiza 'Ver Projeto' apontando para a área Projetos existente (/projetos/handoff/$handoffId)", () => {
    expect(BUTTON_SRC).toMatch(/Ver Projeto/);
    expect(BUTTON_SRC).toMatch(/to="\/projetos\/handoff\/\$handoffId"/);
  });

  it("o clique em 'Ver Projeto' nunca chama transformToProjectFn nem dispara envio", () => {
    // Isola o bloco de cada Link "Ver Projeto" e garante que ele não invoca
    // a função de transformação nem o handler onClick usado pelo botão de
    // envio (que chama transform()/transformToProjectFn).
    const linkBlocks = BUTTON_SRC.match(/<Link[\s\S]*?<\/Link>/g) ?? [];
    expect(linkBlocks.length).toBeGreaterThan(0);
    for (const block of linkBlocks) {
      expect(block).not.toMatch(/transform\(/);
      expect(block).not.toMatch(/onClick=\{onClick\}/);
      expect(block).toMatch(/stopPropagation/);
    }
  });

  it("'Ver Projeto' usa o handoff_id real propagado pelo próprio componente (checkTransformStatusFn/transformToProjectFn), sem lógica duplicada no consumidor", () => {
    expect(BUTTON_SRC).toMatch(/setHandoffId\(res\.handoffId\)/);
    expect(BUTTON_SRC).toMatch(/params=\{\{ handoffId: handoffId! \}\}/);
  });

  it("só aparece quando o status já é 'sent' com handoffId disponível — nunca antes disso", () => {
    expect(BUTTON_SRC).toMatch(/showViewProject = state === "sent" && !!handoffId/);
  });
});

describe("Área Projetos existente reutilizada (não é uma segunda área de projetos)", () => {
  it("a rota /projetos/handoff/$handoffId é read-only: não importa transformToProjectFn nem envia handoff", () => {
    expect(HANDOFF_VIEW_SRC).not.toMatch(/transformToProjectFn/);
    expect(HANDOFF_VIEW_SRC).toMatch(/loadHandoffProjectFn/);
  });

  it("usa statusLabelForHandoff (testado em view-project.test.ts) em vez de duplicar o texto de status", () => {
    expect(HANDOFF_VIEW_SRC).toMatch(/statusLabelForHandoff/);
  });

  it("as etapas futuras (Aprovado, Em execução, Concluído) só existem como passos visuais não-ativos, nunca como afirmação de estado atual", () => {
    // The only step allowed to render as "active" (variant=default) for a
    // SENT handoff is "Projeto criado" — everything else in the pipeline
    // must render muted, since none of it has actually happened yet.
    expect(HANDOFF_VIEW_SRC).toMatch(/activeIndex = status === "SENT" \? 0 : -1/);
    expect(HANDOFF_VIEW_SRC).toMatch(/PIPELINE_STEPS = \[\s*"Projeto criado"/);
  });

  it("trata estado de carregamento e 'não encontrado' sem inventar dados", () => {
    expect(HANDOFF_VIEW_SRC).toMatch(/Referência não encontrada/);
    expect(HANDOFF_VIEW_SRC).toMatch(/Loader2/);
  });
});

describe("Planejar Projeto — desabilitado nesta tarefa, sem tocar BusinessPlan/Approval Router/Cris OS", () => {
  it("botão existe, desabilitado, com o texto exato exigido", () => {
    expect(HANDOFF_VIEW_SRC).toMatch(/Planejar Projeto/);
    expect(HANDOFF_VIEW_SRC).toMatch(/Disponível após conexão da etapa de planejamento/);
    expect(HANDOFF_VIEW_SRC).toMatch(/<Button size="sm" disabled/);
  });

  it("nunca importa nem chama BusinessPlan, Approval Router ou o cliente/serviço do Cris OS", () => {
    expect(HANDOFF_VIEW_SRC).not.toMatch(/^import.*BusinessPlan|^import.*ApprovalRouter/m);
    expect(HANDOFF_VIEW_SRC).not.toMatch(/cris-os\/client"|cris-os\/service"|sendIntelligence\(|handoffToCrisOs\(/);
    // The disabled button must have no onClick at all — no risk of it
    // silently doing something when clicked.
    expect(HANDOFF_VIEW_SRC).toMatch(/<Button size="sm" disabled title="Disponível após conexão da etapa de planejamento">/);
  });
});

describe("Listagem 'Continuar onde parou' — projetos de handoff separados dos legados", () => {
  it("busca a lista de handoffs SENT via listSentHandoffProjectsFn (reuso, sem novo endpoint de envio)", () => {
    expect(PROJETOS_SRC).toMatch(
      /import \{\s*listSentHandoffProjectsFn,\s*toHandoffProjectListItem,/,
    );
    expect(PROJETOS_SRC).not.toMatch(/transformToProjectFn/);
  });

  it("HandoffProjectCard nunca renderiza os controles legados (Select de status, Continuar, Abrir estratégia)", () => {
    const match = PROJETOS_SRC.match(/function HandoffProjectCard[\s\S]*$/);
    expect(match).not.toBeNull();
    const handoffCardBlock = match![0];
    expect(handoffCardBlock).not.toMatch(/<Select/);
    expect(handoffCardBlock).not.toMatch(/Continuar</);
    expect(handoffCardBlock).not.toMatch(/Abrir estratégia/);
    expect(handoffCardBlock).not.toMatch(/Rascunho/);
    expect(handoffCardBlock).not.toMatch(/onDuplicate|onDelete/);
  });

  it("HandoffProjectCard mostra o badge 'Inteligência de Mercado' e o status 'Aguardando planejamento'", () => {
    const match = PROJETOS_SRC.match(/function HandoffProjectCard[\s\S]*$/);
    const handoffCardBlock = match![0];
    expect(handoffCardBlock).toMatch(/Inteligência de Mercado/);
    expect(handoffCardBlock).toMatch(/Aguardando planejamento/);
  });

  it("HandoffProjectCard navega usando o handoff_id do PRÓPRIO item (item.handoffId), nunca um valor fixo/compartilhado", () => {
    const match = PROJETOS_SRC.match(/function HandoffProjectCard[\s\S]*$/);
    const handoffCardBlock = match![0];
    expect(handoffCardBlock).toMatch(/params: \{ handoffId: item\.handoffId \}/);
  });

  it("os cartões de projeto legado preservam exatamente os controles antigos (Select, Continuar, Abrir estratégia, Duplicar, Excluir)", () => {
    const beforeHandoffCard = PROJETOS_SRC.split("function HandoffProjectCard")[0];
    expect(beforeHandoffCard).toMatch(/<Select value=\{r\.status\}/);
    expect(beforeHandoffCard).toMatch(/Continuar/);
    expect(beforeHandoffCard).toMatch(/Abrir estratégia/);
    expect(beforeHandoffCard).toMatch(/Duplicar/);
    expect(beforeHandoffCard).toMatch(/Excluir/);
  });
});

describe("Wiring real: /minerar → card da oferta → TransformToProjectButton", () => {
  it("o card de oferta coletada importa e renderiza o TransformToProjectButton existente", () => {
    expect(MINERAR_SRC).toMatch(
      /import \{ TransformToProjectButton \} from "@\/components\/TransformToProjectButton";/,
    );
  });

  it("o botão recebe a identidade real do anúncio (ad_library_id/ad_url), sem inventar dado novo", () => {
    expect(MINERAR_SRC).toMatch(
      /<TransformToProjectButton adLibraryId=\{a\.ad_library_id\} adUrl=\{a\.ad_url\} \/>/,
    );
  });

  it("nenhum outro card/mineração foi alterado além da renderização do botão (grid de ações intacto)", () => {
    expect(MINERAR_SRC).toMatch(/Analisar com IA/);
    expect(MINERAR_SRC).toMatch(/Gerar Oferta Parecida/);
    expect(MINERAR_SRC).toMatch(/Modelar Estratégia/);
    expect(MINERAR_SRC).toMatch(/Abrir anúncio/);
  });
});

describe("Reuso confirmado em Análise IA e Ofertas Escaladas (nenhum componente duplicado)", () => {
  it("Análise IA reutiliza o mesmo TransformToProjectButton", () => {
    expect(ANALISE_IA_SRC).toMatch(
      /import \{ TransformToProjectButton \} from "@\/components\/TransformToProjectButton";/,
    );
  });

  it("Ofertas Escaladas reutiliza o mesmo TransformToProjectButton (variant icon)", () => {
    expect(OFERTAS_ESCALADAS_SRC).toMatch(
      /import \{ TransformToProjectButton \} from "@\/components\/TransformToProjectButton";/,
    );
    expect(OFERTAS_ESCALADAS_SRC).toMatch(/<TransformToProjectButton[\s\S]{0,80}variant="icon"/);
  });
});
