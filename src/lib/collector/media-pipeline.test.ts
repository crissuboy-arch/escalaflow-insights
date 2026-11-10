import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/net/ssrf-guard", () => ({ resolvesToPrivateIp: async () => false }));

const uploads: Array<{ path: string; opts: unknown }> = [];
const existing = new Set<string>();
const updates: Array<{ patch: Record<string, unknown>; id: string }> = [];
let selectError: unknown = null;

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: async (path: string, _bytes: unknown, opts: unknown) => {
          uploads.push({ path, opts });
          if (existing.has(path))
            return { error: { message: "The resource already exists", statusCode: "409" } };
          existing.add(path);
          return { error: null };
        },
      }),
    },
    from: () => ({
      select: () => ({ limit: async () => ({ error: selectError }) }),
      update: (patch: Record<string, unknown>) => ({
        eq: async (_c: string, id: string) => {
          updates.push({ patch, id });
          return { error: null };
        },
      }),
    }),
  },
}));

function res(body: string, contentType: string, status = 200): Response {
  const buf = new TextEncoder().encode(body).buffer;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? contentType : null) },
    arrayBuffer: async () => buf,
  } as unknown as Response;
}

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mod = await import("./media-pipeline");

beforeEach(() => {
  uploads.length = 0;
  updates.length = 0;
  existing.clear();
  fetchMock.mockReset();
  selectError = null;
});

describe("copyToStorage", () => {
  it("guarda por hash de conteúdo e deduplica bytes iguais", async () => {
    fetchMock.mockResolvedValue(res("same-bytes", "image/jpeg"));
    const a = await mod.copyToStorage("https://cdn.example/a.jpg", "image");
    const b = await mod.copyToStorage("https://cdn.example/b.jpg", "image");
    expect(a.kind).toBe("copied");
    expect(b.kind).toBe("copied");
    if (a.kind === "copied" && b.kind === "copied") {
      expect(a.path).toMatch(/^media\/[0-9a-f]{64}\.jpg$/);
      expect(b.path).toBe(a.path);
      expect(b.deduped).toBe(true);
    }
  });

  it("rejeita HTML devolvido com 200 (não é mídia)", async () => {
    fetchMock.mockResolvedValue(res("<html>", "text/html"));
    const r = await mod.copyToStorage("https://cdn.example/x.jpg", "image");
    expect(r.kind).toBe("dead");
    expect(uploads).toHaveLength(0);
  });

  it("4xx = link morto, 5xx = transitório", async () => {
    fetchMock.mockResolvedValueOnce(res("", "text/plain", 403));
    expect((await mod.copyToStorage("https://cdn.example/1", "image")).kind).toBe("dead");
    fetchMock.mockResolvedValueOnce(res("", "text/plain", 503));
    expect((await mod.copyToStorage("https://cdn.example/2", "image")).kind).toBe("transient");
  });
});

describe("computeStatus", () => {
  const base = {
    hasImageUrl: true,
    hasVideoUrl: false,
    imagePath: null,
    videoPath: null,
    videoDeferred: false,
    attempts: 1,
  };
  it("imagem copiada sem vídeo → image_copied", () => {
    expect(mod.computeStatus({ ...base, imagePath: "media/x.jpg" }).status).toBe("image_copied");
  });
  it("imagem copiada e vídeo adiado → pending_video", () => {
    expect(
      mod.computeStatus({
        ...base,
        hasVideoUrl: true,
        imagePath: "media/x.jpg",
        videoDeferred: true,
      }).status,
    ).toBe("pending_video");
  });
  it("falha transitória volta para a fila até MAX_ATTEMPTS", () => {
    expect(mod.computeStatus({ ...base, imageOutcome: "transient" })).toEqual({
      status: "not_attempted",
      retry: true,
    });
    expect(
      mod.computeStatus({ ...base, imageOutcome: "transient", attempts: mod.MAX_ATTEMPTS }).status,
    ).toBe("expired");
  });
  it("sem nenhuma mídia → no_media", () => {
    expect(mod.computeStatus({ ...base, hasImageUrl: false }).status).toBe("no_media");
  });
});

describe("processAdMedia", () => {
  it("nunca troca um caminho já guardado por null", async () => {
    fetchMock.mockResolvedValue(res("", "text/plain", 403)); // vídeo morto
    await mod.processAdMedia(
      {
        id: "ad1",
        image_url: "https://cdn.example/i.jpg",
        video_url: "https://cdn.example/v.mp4",
        image_storage_path: "media/old.jpg",
        video_storage_path: null,
        media_status: "pending_video",
      },
      { includeVideo: true },
    );
    const patch = updates[0].patch;
    expect(patch).not.toHaveProperty("image_storage_path");
    expect(patch).not.toHaveProperty("video_storage_path");
    expect(patch.media_status).toBe("image_copied");
  });
});
