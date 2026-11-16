import { describe, it, expect } from "vitest";
import { interpretCollectorResponse } from "./collector-response";

describe("interpretCollectorResponse — nunca uma lista vazia silenciosa", () => {
  it("504 com HTML (tempo limite da função) → erro claro", () => {
    const r = interpretCollectorResponse(504, "<html>An error occurred</html>");
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toMatch(/demorou/);
  });

  it("fornecedor não configurado → erro, sem o nome do fornecedor", () => {
    const r = interpretCollectorResponse(
      502,
      JSON.stringify({ ok: false, error: "Apify: token inválido (401). Verifique APIFY_TOKEN." }),
    );
    expect(r.kind).toBe("error");
    if (r.kind === "error") {
      expect(r.message).toContain("401");
      expect(r.message).not.toMatch(/apify/i);
    }
  });

  it("0 anúncios → 'empty' com o aviso do servidor", () => {
    const r = interpretCollectorResponse(
      200,
      JSON.stringify({ ok: true, ads: [], notice: "Nada para 'x' em BR." }),
    );
    expect(r).toEqual({ kind: "empty", message: "Nada para 'x' em BR." });
  });

  it("anúncios encontrados mas nenhum gravado → erro (iam sumir no refresh)", () => {
    const r = interpretCollectorResponse(
      200,
      JSON.stringify({ ok: true, ads: [{}, {}], saved: 0, persistError: "schema cache" }),
    );
    expect(r.kind).toBe("error");
  });

  it("sucesso parcial → aviso", () => {
    const r = interpretCollectorResponse(
      200,
      JSON.stringify({
        ok: true,
        ads: [{}, {}, {}],
        saved: 2,
        media: { imagesCopied: 2, videosCopied: 1 },
      }),
    );
    expect(r).toMatchObject({
      kind: "success",
      found: 3,
      saved: 2,
      imagesCopied: 2,
      videosCopied: 1,
    });
    if (r.kind === "success") expect(r.warning).toMatch(/1 de 3/);
  });
});
