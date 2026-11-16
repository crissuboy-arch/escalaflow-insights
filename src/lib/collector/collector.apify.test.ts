import { describe, it, expect } from "vitest";
import { buildAdLibrarySearchUrl, buildFacebookAdsPayload } from "./collector.apify";

const input = { keyword: "colágeno", country: "BR", limit: 20 };

describe("buildFacebookAdsPayload — input certo para cada actor", () => {
  it("curious_coder: urls + count (mín. 10), sem detalhes lentos", () => {
    const p = buildFacebookAdsPayload("curious_coder/facebook-ads-library-scraper", {
      ...input,
      limit: 5,
    }) as Record<string, unknown>;
    expect(p.urls).toEqual([{ url: buildAdLibrarySearchUrl(input) }]);
    expect(p.count).toBe(10);
    expect(p.scrapeAdDetails).toBe(false);
    expect(p).not.toHaveProperty("startUrls");
  });

  it("apify~facebook-ads-scraper (fallback padrão): startUrls + resultsLimit", () => {
    // Bug: antes recebia o input do curious_coder (urls/count), ignorava-o e
    // corria sem URL nenhum → 0 resultados.
    const p = buildFacebookAdsPayload("apify~facebook-ads-scraper", input) as Record<
      string,
      unknown
    >;
    expect(p.startUrls).toEqual([{ url: buildAdLibrarySearchUrl(input) }]);
    expect(p.resultsLimit).toBe(20);
    expect(p).not.toHaveProperty("urls");
  });

  it("actor desconhecido: manda os dois formatos", () => {
    const p = buildFacebookAdsPayload("someone~custom", input) as Record<string, unknown>;
    expect(p).toHaveProperty("startUrls");
    expect(p).toHaveProperty("urls");
  });

  it("URL de pesquisa codifica a palavra-chave e o país", () => {
    const url = buildAdLibrarySearchUrl({ keyword: "renda extra", country: "br" });
    expect(url).toContain("q=renda%20extra");
    expect(url).toContain("country=BR");
    expect(buildAdLibrarySearchUrl({ keyword: "x" })).toContain("country=ALL");
  });
});
