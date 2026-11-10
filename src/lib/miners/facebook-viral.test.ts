import { describe, it, expect, vi } from "vitest";

// Nenhum destes testes chama a Apify real — custo e normalização são lógica
// pura, o cliente é mockado. A primeira chamada real só acontece com
// autorização explícita do utilizador (ver plano/relatório).
const runSyncGetDatasetItems = vi.fn();
vi.mock("../integrations/apify/client", () => ({
  runSyncGetDatasetItems: (...args: unknown[]) => runSyncGetDatasetItems(...args),
}));

import { estimateFacebookMiningCost, mineFacebookPage, mineFacebookReels } from "./facebook-viral";

describe("estimateFacebookMiningCost", () => {
  it("não faz nenhuma chamada de rede", () => {
    estimateFacebookMiningCost({ limit: 30 });
    expect(runSyncGetDatasetItems).not.toHaveBeenCalled();
  });

  it("calcula 1 página + 30 Reels em ~US$0,0588", () => {
    const result = estimateFacebookMiningCost({ limit: 30 });
    expect(result.totalUSD).toBeCloseTo(0.0588, 4);
  });

  it("escala o custo dos Reels linearmente com o limite", () => {
    const r10 = estimateFacebookMiningCost({ limit: 10 });
    const r20 = estimateFacebookMiningCost({ limit: 20 });
    expect(r20.reelsCostUSD).toBeCloseTo(r10.reelsCostUSD * 2, 6);
    // o custo da página (fixo) não muda com o limite de Reels
    expect(r20.pageCostUSD).toBe(r10.pageCostUSD);
  });
});

describe("mineFacebookPage", () => {
  it("devolve null quando o dataset vem vazio (página não encontrada)", async () => {
    runSyncGetDatasetItems.mockResolvedValueOnce([]);
    const result = await mineFacebookPage("https://www.facebook.com/naoexiste");
    expect(result).toBeNull();
  });

  it("normaliza o nome verificado e os seguidores do item devolvido", async () => {
    runSyncGetDatasetItems.mockResolvedValueOnce([
      { page_name: "Tyson Reed", followers: 14234, category: "Fitness" },
    ]);
    const result = await mineFacebookPage("https://www.facebook.com/tysonreed");
    expect(result).toMatchObject({
      verifiedName: "Tyson Reed",
      followers: 14234,
      category: "Fitness",
    });
  });
});

describe("mineFacebookReels", () => {
  it("descarta itens sem URL (não inventa referência)", async () => {
    runSyncGetDatasetItems.mockResolvedValueOnce([{ caption: "sem url" }]);
    const result = await mineFacebookReels("https://www.facebook.com/tysonreed", {
      periodDays: 30,
      limit: 10,
    });
    expect(result).toEqual([]);
  });

  it("normaliza views/comentários/legenda com os nomes alternativos de campo", async () => {
    runSyncGetDatasetItems.mockResolvedValueOnce([
      {
        url: "https://www.facebook.com/tysonreed/reels/123",
        caption: "treino de pernas",
        view_count: 120000,
        comments_count: 340,
        shares_count: 12,
      },
    ]);
    const result = await mineFacebookReels("https://www.facebook.com/tysonreed", {
      periodDays: 30,
      limit: 30,
    });
    expect(result).toEqual([
      expect.objectContaining({
        reelUrl: "https://www.facebook.com/tysonreed/reels/123",
        caption: "treino de pernas",
        views: 120000,
        commentsCount: 340,
        sharesCount: 12,
      }),
    ]);
  });

  it("nunca pede os URLs de vídeo temporários do actor (não persistimos vídeo de terceiro)", async () => {
    runSyncGetDatasetItems.mockResolvedValueOnce([]);
    await mineFacebookReels("https://www.facebook.com/tysonreed", { periodDays: 7, limit: 10 });
    expect(runSyncGetDatasetItems).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeVideoUrls: false }),
    );
  });
});
