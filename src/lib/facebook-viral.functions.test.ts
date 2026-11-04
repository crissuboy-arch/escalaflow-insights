import { describe, it, expect, vi } from "vitest";

// Same stub used across the codebase's other *.functions.test.ts files: the
// real createServerFn/createMiddleware chains don't survive the vitest node
// environment, but the handler logic itself is plain async code once
// unwrapped — the stub only needs to let the module load and hand back the
// raw handler so tests can call it directly with a hand-built context
// (bypassing the real auth middleware entirely, which is fine: these tests
// cover the handler's own logic, not authentication).
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

import {
  saveViralPage,
  listViralPages,
  updateViralPage,
  deleteViralPage,
  saveViralReel,
  updateViralReel,
} from "./facebook-viral.functions";

/** Minimal chainable fake query builder — thenable so `await query` resolves
 *  even when the caller never calls .single()/.maybeSingle(). */
function fakeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (r: typeof result) => void) => resolve(result);
  return builder;
}

function fakeSupabase(opts: {
  insertResult?: { data: unknown; error: unknown };
  selectResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
}) {
  const insertFn = vi.fn(() => fakeBuilder(opts.insertResult ?? { data: null, error: null }));
  const selectFn = vi.fn(() => fakeBuilder(opts.selectResult ?? { data: [], error: null }));
  const deleteFn = vi.fn(() => fakeBuilder(opts.deleteResult ?? { data: null, error: null }));
  const updateFn = vi.fn(() => fakeBuilder(opts.updateResult ?? { data: null, error: null }));
  const fromFn = vi.fn(() => ({
    insert: insertFn,
    select: selectFn,
    delete: deleteFn,
    update: updateFn,
  }));
  return { supabase: { from: fromFn }, insertFn, selectFn, deleteFn, updateFn, fromFn };
}

describe("saveViralPage", () => {
  it("rejeita URL inválida sem tocar na base de dados", async () => {
    const { supabase, fromFn } = fakeSupabase({});
    const result = await saveViralPage({
      data: { pageUrl: "https://instagram.com/not-facebook" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false, code: "INVALID_URL" });
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("normaliza a URL e grava com o user_id do contexto", async () => {
    const savedRow = { id: "p1", page_url: "https://facebook.com/tysonreed" };
    const { supabase, insertFn } = fakeSupabase({ insertResult: { data: savedRow, error: null } });
    const result = await saveViralPage({
      data: { pageUrl: "facebook.com/tysonreed", niche: "receitas" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: true, page: savedRow });
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        page_url: "https://facebook.com/tysonreed",
        niche: "receitas",
      }),
    );
  });

  it("mapeia violação de unicidade (23505) para DUPLICATE, nunca um erro genérico", async () => {
    const { supabase } = fakeSupabase({
      insertResult: { data: null, error: { code: "23505", message: "duplicate key" } },
    });
    const result = await saveViralPage({
      data: { pageUrl: "https://www.facebook.com/tysonreed" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false, code: "DUPLICATE" });
  });
});

describe("listViralPages", () => {
  it("devolve [] em erro de base de dados, nunca lança", async () => {
    const { supabase } = fakeSupabase({ selectResult: { data: null, error: { message: "boom" } } });
    const result = await listViralPages({
      data: { orderBy: "created_at" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toEqual([]);
  });

  it("devolve as linhas quando a query é bem sucedida", async () => {
    const rows = [{ id: "p1" }, { id: "p2" }];
    const { supabase } = fakeSupabase({ selectResult: { data: rows, error: null } });
    const result = await listViralPages({
      data: { orderBy: "created_at" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toEqual(rows);
  });
});

describe("updateViralPage", () => {
  it("rejeita URL inválida sem tocar na base de dados", async () => {
    const { supabase, fromFn } = fakeSupabase({});
    const result = await updateViralPage({
      data: { id: "11111111-1111-1111-1111-111111111111", pageUrl: "https://tiktok.com/x" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false, code: "INVALID_URL" });
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("normaliza a URL corrigida e grava pelo mesmo id (não recria a linha)", async () => {
    const updatedRow = { id: "p1", page_url: "https://www.facebook.com/realtysonreed" };
    const { supabase, updateFn } = fakeSupabase({
      updateResult: { data: updatedRow, error: null },
    });
    const result = await updateViralPage({
      data: { id: "p1", pageUrl: "www.facebook.com/realtysonreed" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: true, page: updatedRow });
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ page_url: "https://www.facebook.com/realtysonreed" }),
    );
  });

  it("permite só trocar o produto de afiliado associado, sem tocar na URL", async () => {
    const updatedRow = { id: "p1" };
    const { supabase, updateFn } = fakeSupabase({
      updateResult: { data: updatedRow, error: null },
    });
    await updateViralPage({
      data: { id: "p1", affiliateProductId: "22222222-2222-2222-2222-222222222222" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ affiliate_product_id: "22222222-2222-2222-2222-222222222222" }),
    );
    expect(updateFn.mock.calls[0][0]).not.toHaveProperty("page_url");
  });

  it("mapeia violação de unicidade (23505) para DUPLICATE", async () => {
    const { supabase } = fakeSupabase({
      updateResult: { data: null, error: { code: "23505", message: "duplicate key" } },
    });
    const result = await updateViralPage({
      data: { id: "p1", pageUrl: "https://www.facebook.com/outrapagina" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false, code: "DUPLICATE" });
  });
});

describe("deleteViralPage", () => {
  it("devolve ok:false com a mensagem de erro em falha", async () => {
    const { supabase } = fakeSupabase({ deleteResult: { data: null, error: { message: "nope" } } });
    const result = await deleteViralPage({
      data: { id: "11111111-1111-1111-1111-111111111111" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toEqual({ ok: false, error: "nope" });
  });
});

describe("saveViralReel", () => {
  it("rejeita URL inválida sem tocar na base de dados", async () => {
    const { supabase, fromFn } = fakeSupabase({});
    const result = await saveViralReel({
      data: { reelUrl: "https://tiktok.com/@x/video/1" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false, code: "INVALID_URL" });
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("classifica e grava um reel real com link_type inferido", async () => {
    const savedRow = { id: "r1" };
    const { supabase, insertFn } = fakeSupabase({ insertResult: { data: savedRow, error: null } });
    const result = await saveViralReel({
      data: { reelUrl: "https://www.facebook.com/tysonreed/reels/123" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: true, reel: savedRow });
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ link_type: "reel" }));
  });
});

describe("updateViralReel", () => {
  it("liga um produto de afiliado já cadastrado ao reel existente", async () => {
    const { supabase, updateFn } = fakeSupabase({ updateResult: { data: {}, error: null } });
    const result = await updateViralReel({
      data: { id: "r1", affiliateProductId: "22222222-2222-2222-2222-222222222222" },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toEqual({ ok: true });
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ affiliate_product_id: "22222222-2222-2222-2222-222222222222" }),
    );
  });

  it("devolve ok:false com a mensagem de erro em falha", async () => {
    const { supabase } = fakeSupabase({ updateResult: { data: null, error: { message: "nope" } } });
    const result = await updateViralReel({
      data: { id: "r1", views: 1000 },
      context: { supabase, userId: "user-1" },
    } as never);
    expect(result).toEqual({ ok: false, error: "nope" });
  });
});
