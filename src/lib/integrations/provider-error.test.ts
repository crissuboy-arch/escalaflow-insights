import { describe, it, expect } from "vitest";
import { extractProviderItemError, publicProviderError } from "./provider-error";

describe("publicProviderError — o nome do fornecedor nunca chega à UI", () => {
  it.each([
    "Apify: token inválido ou expirado (401). Verifique APIFY_TOKEN no .env.",
    'Apify: actor "apify~facebook-ads-scraper" não encontrado (404). Verifique o nome no .env.',
    "Apify sync run failed (500) after 3.0s: boom",
    "Facebook Ad Library actor input inválido: curious_coder/facebook-ads-library-scraper says no",
    "APIFY_META_ADS_ACTOR não configurado no .env",
  ])("%s", (msg) => {
    const out = publicProviderError(msg);
    expect(out).not.toMatch(/apify/i);
    expect(out).not.toMatch(/\.env/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("mantém códigos HTTP úteis", () => {
    expect(publicProviderError("Apify: token inválido (401).")).toContain("401");
  });

  it("fallback para mensagens vazias", () => {
    expect(publicProviderError("", "Falha X")).toBe("Falha X");
    expect(publicProviderError(undefined, "Falha Y")).toBe("Falha Y");
    expect(publicProviderError(new Error("Apify down"))).toBe("Fonte automática down");
  });
});

describe("extractProviderItemError", () => {
  it("dataset só com objetos de erro → mensagem", () => {
    expect(extractProviderItemError([{ error: "Input inválido" }])).toBe("Input inválido");
    expect(
      extractProviderItemError([{ error: "blocked", url: "https://www.facebook.com/x" }]),
    ).toBe("blocked");
  });
  it("dados reais (ou mistos) → null", () => {
    expect(extractProviderItemError([])).toBeNull();
    expect(extractProviderItemError([{ ad_archive_id: "1", snapshot: {} }])).toBeNull();
    expect(extractProviderItemError([{ error: "x" }, { ad_archive_id: "1" }])).toBeNull();
  });
});
