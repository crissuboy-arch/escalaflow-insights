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
    expect(r.error).toMatch(/APIFY_TOKEN/);
    expect(playwrightRun).not.toHaveBeenCalled();
  });

  it("outra plataforma continua a usar o caminho web", async () => {
    await runCollector({ keyword: "x", platform: "TikTok", limit: 10 } as never);
    expect(playwrightRun).toHaveBeenCalledTimes(1);
  });
});
