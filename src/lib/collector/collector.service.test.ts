import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const apifyRun = vi.fn();
const playwrightRun = vi.fn();

vi.mock("./collector.apify", () => ({ createProvider: () => ({ run: apifyRun }) }));
vi.mock("./collector.playwright", () => ({ createPlaywrightProvider: () => ({ run: playwrightRun }) }));

import { runCollector } from "./collector.service";

describe("runCollector — fonte padrão", () => {
  const prev = process.env.APIFY_TOKEN;
  beforeEach(() => {
    apifyRun.mockReset().mockResolvedValue([]);
    playwrightRun.mockReset().mockResolvedValue([]);
    process.env.APIFY_TOKEN = "test-token";
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.APIFY_TOKEN;
    else process.env.APIFY_TOKEN = prev;
  });

  it("sem plataforma usa o Facebook Ad Library e não o caminho web", async () => {
    await runCollector({ keyword: "posture corrector", limit: 10 } as never);
    expect(apifyRun).toHaveBeenCalledTimes(1);
    expect(playwrightRun).not.toHaveBeenCalled();
  });

  it("plataforma 'all' também usa o Facebook Ad Library", async () => {
    await runCollector({ keyword: "x", platform: "all", limit: 10 } as never);
    expect(apifyRun).toHaveBeenCalledTimes(1);
    expect(playwrightRun).not.toHaveBeenCalled();
  });

  it("sem APIFY_TOKEN devolve erro claro em vez de resultados web sem mídia", async () => {
    delete process.env.APIFY_TOKEN;
    const r = await runCollector({ keyword: "x", limit: 10 } as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/não está configurado/);
    // o nome do fornecedor/variável nunca chega à UI
    expect(r.error).not.toMatch(/apify/i);
    expect(playwrightRun).not.toHaveBeenCalled();
  });

  it("0 itens do fornecedor → ok com aviso explícito (nunca lista vazia silenciosa)", async () => {
    apifyRun.mockResolvedValueOnce([]);
    const r = await runCollector({ keyword: "xyz", country: "BR", limit: 10 } as never);
    expect(r).toMatchObject({ ok: true, count: 0 });
    expect(r.notice).toMatch(/não devolveu anúncios/);
  });

  it("falha do fornecedor vira erro sem o nome do fornecedor", async () => {
    apifyRun.mockRejectedValueOnce(
      new Error(
        'Apify: actor "apify~facebook-ads-scraper" não encontrado (404). Verifique APIFY_META_ADS_ACTOR no .env.',
      ),
    );
    const r = await runCollector({ keyword: "x", limit: 10 } as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/404/);
    expect(r.error).not.toMatch(/apify/i);
  });

  it("itens que são só erros do fornecedor não viram anúncios falsos", async () => {
    apifyRun.mockResolvedValueOnce([
      { error: "rate limited", url: "https://www.facebook.com/ads/library/?q=x" },
    ]);
    const r = await runCollector({ keyword: "x", limit: 10 } as never);
    expect(r.ok).toBe(false);
    expect(r.ads).toEqual([]);
  });

  it("normaliza um item real: link canónico por ID, nunca o URL de pesquisa", async () => {
    apifyRun.mockResolvedValueOnce([
      {
        ad_archive_id: "1234567890123456",
        url: "https://www.facebook.com/ads/library/?active_status=active&q=x",
        snapshot: {
          page_name: "Loja X",
          body: { text: "Compre já" },
          images: [{ original_image_url: "https://scontent.xx.fbcdn.net/a.jpg" }],
          videos: [
            {
              video_hd_url: "https://video.xx.fbcdn.net/hd.mp4",
              video_sd_url: "https://video.xx.fbcdn.net/sd.mp4",
            },
          ],
        },
      },
    ]);
    const r = await runCollector({ keyword: "x", limit: 10 } as never);
    expect(r.ok).toBe(true);
    expect(r.ads[0]).toMatchObject({
      advertiser: "Loja X",
      adLibraryId: "1234567890123456",
      adUrl: "https://www.facebook.com/ads/library/?id=1234567890123456",
      imageUrl: "https://scontent.xx.fbcdn.net/a.jpg",
    });
    expect(r.ads[0].videoUrl).toBeTruthy();
  });

  it("outra plataforma continua a usar o caminho web", async () => {
    await runCollector({ keyword: "x", platform: "TikTok", limit: 10 } as never);
    expect(playwrightRun).toHaveBeenCalledTimes(1);
  });
});
