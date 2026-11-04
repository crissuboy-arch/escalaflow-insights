import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    middleware: () => ({
      inputValidator: () => ({ handler: (fn: unknown) => fn }),
      handler: (fn: unknown) => fn,
    }),
  }),
  createMiddleware: () => ({
    client: () => ({ server: () => ({}) }),
  }),
}));

const mineFacebookPage = vi.fn();
const mineFacebookReels = vi.fn();
vi.mock("@/lib/miners/facebook-viral", () => ({
  estimateFacebookMiningCost: vi.fn(() => ({
    pageCostUSD: 0.0138,
    reelsCostUSD: 0.045,
    totalUSD: 0.0588,
    breakdown: "stub",
  })),
  mineFacebookPage: (...args: unknown[]) => mineFacebookPage(...args),
  mineFacebookReels: (...args: unknown[]) => mineFacebookReels(...args),
}));

import { estimateMiningCostFn, runFacebookMining } from "./facebook-viral-mining.functions";

/** Same minimal chainable fake used by facebook-viral.functions.test.ts. */
function fakeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.eq = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (r: typeof result) => void) => resolve(result);
  return builder;
}

function fakeSupabase(opts: {
  findPageResult?: { data: unknown; error: unknown };
  insertPageResult?: { data: unknown; error: unknown };
  updatePageResult?: { data: unknown; error: unknown };
  existingReelsResult?: { data: unknown; error: unknown };
  insertReelsResult?: { data: unknown; error: unknown };
}) {
  const pageSelectFn = vi.fn(() => fakeBuilder(opts.findPageResult ?? { data: null, error: null }));
  const pageInsertFn = vi.fn(() =>
    fakeBuilder(opts.insertPageResult ?? { data: { id: "page-1" }, error: null }),
  );
  const pageUpdateFn = vi.fn(() =>
    fakeBuilder(opts.updatePageResult ?? { data: { id: "page-1" }, error: null }),
  );
  const reelSelectFn = vi.fn(() =>
    fakeBuilder(opts.existingReelsResult ?? { data: [], error: null }),
  );
  const reelInsertFn = vi.fn(() =>
    fakeBuilder(opts.insertReelsResult ?? { data: null, error: null }),
  );

  const fromFn = vi.fn((table: string) => {
    if (table === "viral_pages") {
      return { select: pageSelectFn, insert: pageInsertFn, update: pageUpdateFn };
    }
    return { select: reelSelectFn, insert: reelInsertFn };
  });
  return { supabase: { from: fromFn }, pageInsertFn, pageUpdateFn, reelInsertFn };
}

beforeEach(() => {
  mineFacebookPage.mockReset();
  mineFacebookReels.mockReset();
});

describe("estimateMiningCostFn", () => {
  it("expõe o cálculo puro sem exigir uma URL de página", async () => {
    const result = await estimateMiningCostFn({
      data: { limit: 30 },
      context: { supabase: {}, userId: "user-1" },
    } as never);
    expect(result.totalUSD).toBeCloseTo(0.0588, 4);
  });
});

describe("runFacebookMining", () => {
  it("rejeita URL inválida sem chamar a Apify", async () => {
    const { supabase } = fakeSupabase({});
    const result = await runFacebookMining({
      data: { pageUrl: "https://tiktok.com/x", periodDays: 30, limit: 10 },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false });
    expect(mineFacebookPage).not.toHaveBeenCalled();
  });

  it("cria a página quando ainda não existe e insere só os Reels novos", async () => {
    mineFacebookPage.mockResolvedValueOnce({ verifiedName: "Tyson Reed", followers: 14234 });
    mineFacebookReels.mockResolvedValueOnce([
      { reelUrl: "https://www.facebook.com/tysonreed/reels/1", views: 1000 },
      { reelUrl: "https://www.facebook.com/tysonreed/reels/2", views: 2000 },
    ]);
    const { supabase, pageInsertFn, reelInsertFn } = fakeSupabase({
      existingReelsResult: {
        data: [{ reel_url: "https://www.facebook.com/tysonreed/reels/1" }],
        error: null,
      },
    });

    const result = await runFacebookMining({
      data: { pageUrl: "facebook.com/tysonreed", periodDays: 30, limit: 30 },
      context: { supabase, userId: "user-1" },
    } as never);

    expect(result).toMatchObject({
      ok: true,
      verifiedName: "Tyson Reed",
      insertedReels: 1,
      skippedDuplicates: 1,
    });
    expect(pageInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ verified_name: "Tyson Reed", name_source: "apify" }),
    );
    expect(reelInsertFn).toHaveBeenCalledWith([
      expect.objectContaining({
        reel_url: "https://www.facebook.com/tysonreed/reels/2",
        data_source: "apify",
      }),
    ]);
  });

  it("devolve ok:false se a mineração da página falhar, sem gravar nada", async () => {
    mineFacebookPage.mockRejectedValueOnce(new Error("Apify: token inválido (401)."));
    const { supabase, pageInsertFn } = fakeSupabase({});
    const result = await runFacebookMining({
      data: { pageUrl: "facebook.com/tysonreed", periodDays: 30, limit: 10 },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("401") });
    expect(pageInsertFn).not.toHaveBeenCalled();
  });

  it("não duplica quando todos os Reels minerados já existem", async () => {
    mineFacebookPage.mockResolvedValueOnce(null);
    mineFacebookReels.mockResolvedValueOnce([
      { reelUrl: "https://www.facebook.com/tysonreed/reels/1", views: 1000 },
    ]);
    const { supabase, reelInsertFn } = fakeSupabase({
      findPageResult: { data: { id: "page-1" }, error: null },
      existingReelsResult: {
        data: [{ reel_url: "https://www.facebook.com/tysonreed/reels/1" }],
        error: null,
      },
    });
    const result = await runFacebookMining({
      data: { pageUrl: "facebook.com/tysonreed", periodDays: 30, limit: 10 },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: true, insertedReels: 0, skippedDuplicates: 1 });
    expect(reelInsertFn).not.toHaveBeenCalled();
  });
});
