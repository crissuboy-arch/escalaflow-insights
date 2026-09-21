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
