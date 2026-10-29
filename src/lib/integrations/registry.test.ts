// Registry tests — the panel's honesty is only as good as this data.
// Nothing here may claim a tool is live: the static registry never says
// LIGADO, and metodo-avatar must stay EXCLUIDO (it is not a tool).
import { describe, it, expect } from "vitest";
import { INTEGRATIONS, getIntegration, getPanelIntegrations } from "./registry";

describe("registry — estados honestos", () => {
  it("tem 10 entradas com ids únicos", () => {
    expect(INTEGRATIONS).toHaveLength(10);
    const ids = INTEGRATIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a área Integrações do painel tem exatamente as 8 do brief", () => {
    const panel = getPanelIntegrations();
    expect(panel.map((e) => e.id).sort()).toEqual(
      ["athena", "cris-os", "meta-ads", "mkvideos", "openmontage", "pageforge", "pink-logic", "tools-hub"].sort(),
    );
  });

  it("nenhuma entrada estática afirma que está ligada: estado nunca LIGADO, rótulo nunca incondicional", () => {
    for (const entry of INTEGRATIONS) {
      expect(entry.state).not.toBe("LIGADO");
      // "Ligado quando configurado" é condicional e honesto (CONFIGURAVEL);
      // o que é proibido é afirmar live sem condição.
      expect(entry.stateLabel).not.toMatch(/^(ligado|operacional)$/i);
      expect(entry.stateLabel).not.toMatch(/operacional|funcionando/i);
    }
  });

  it("metodo-avatar está EXCLUÍDO e fora do painel", () => {
    const entry = getIntegration("metodo-avatar");
    expect(entry?.state).toBe("EXCLUIDO");
    expect(entry?.area).toBeNull();
    expect(getPanelIntegrations().some((e) => e.id === "metodo-avatar")).toBe(false);
  });

  it("toda a entrada tem evidência e próximo passo (nada vago)", () => {
    for (const entry of INTEGRATIONS) {
      expect(entry.evidence.length).toBeGreaterThan(0);
      expect(entry.nextStep.trim().length).toBeGreaterThan(0);
      expect(entry.stateLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it("cris-os é CONFIGURAVEL (não PREPARADO nem LIGADO) e lista as suas vars", () => {
    const entry = getIntegration("cris-os");
    expect(entry?.state).toBe("CONFIGURAVEL");
    expect(entry?.envVars).toContain("CRIS_OS_API_URL");
    expect(entry?.envVars).toContain("CRIS_OS_INTEGRATION_TOKEN");
  });
});
