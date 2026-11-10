import { describe, it, expect, vi } from "vitest";

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

import { createViralVideo, generateClipsForScript } from "./viral-remix.functions";

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

describe("createViralVideo", () => {
  it("exige license_note quando upload_source é 'licensed', sem tocar na base de dados", async () => {
    const fromFn = vi.fn();
    const result = await createViralVideo({
      data: { storagePath: "u1/videos/a.mp4", uploadSource: "licensed" },
      context: { supabase: { from: fromFn }, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false });
    expect(fromFn).not.toHaveBeenCalled();
  });

  it("grava um vídeo próprio sem exigir license_note", async () => {
    const savedRow = { id: "v1", storage_path: "u1/videos/a.mp4" };
    const insertFn = vi.fn(() => fakeBuilder({ data: savedRow, error: null }));
    const fromFn = vi.fn(() => ({ insert: insertFn }));
    const result = await createViralVideo({
      data: { storagePath: "u1/videos/a.mp4", uploadSource: "own", durationSeconds: 12.5, width: 1080, height: 1920 },
      context: { supabase: { from: fromFn }, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: true, video: savedRow });
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", status: "uploaded", duration_seconds: 12.5 }),
    );
  });
});

describe("generateClipsForScript", () => {
  it("rejeita quando o roteiro está vazio, sem apagar clipes existentes", async () => {
    const deleteFn = vi.fn();
    const selectFn = vi.fn(() => fakeBuilder({ data: { script_text: "   " }, error: null }));
    const fromFn = vi.fn((table: string) => {
      if (table === "viral_scripts") return { select: selectFn };
      if (table === "viral_script_clips") return { delete: deleteFn };
      throw new Error(`unexpected table: ${table}`);
    });
    const result = await generateClipsForScript({
      data: { viralScriptId: "11111111-1111-1111-1111-111111111111" },
      context: { supabase: { from: fromFn }, userId: "user-1" },
    } as never);
    expect(result).toMatchObject({ ok: false });
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("apaga os clipes antigos, insere os novos e marca o roteiro como clips_ready", async () => {
    const scriptSelectFn = vi.fn(() =>
      fakeBuilder({ data: { script_text: "Primeira frase. Segunda frase." }, error: null }),
    );
    const clipDeleteFn = vi.fn(() => fakeBuilder({ data: null, error: null }));
    const insertedRows = [{ id: "c1" }, { id: "c2" }];
    const clipInsertFn = vi.fn(() => fakeBuilder({ data: insertedRows, error: null }));
    const scriptUpdateFn = vi.fn(() => fakeBuilder({ data: null, error: null }));

    const fromFn = vi.fn((table: string) => {
      if (table === "viral_scripts") return { select: scriptSelectFn, update: scriptUpdateFn };
      if (table === "viral_script_clips") return { delete: clipDeleteFn, insert: clipInsertFn };
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await generateClipsForScript({
      data: { viralScriptId: "11111111-1111-1111-1111-111111111111" },
      context: { supabase: { from: fromFn }, userId: "user-1" },
    } as never);

    expect(result.ok).toBe(true);
    expect(clipDeleteFn).toHaveBeenCalled();
    expect(clipInsertFn).toHaveBeenCalled();
    const insertedArg = clipInsertFn.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(insertedArg.every((row) => row.user_id === "user-1")).toBe(true);
    expect(scriptUpdateFn).toHaveBeenCalledWith(expect.objectContaining({ status: "clips_ready" }));
  });
});
