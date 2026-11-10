import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const resolvesToPrivateIp = vi.fn(async () => false);
vi.mock("@/lib/net/ssrf-guard", () => ({
  resolvesToPrivateIp: (...args: unknown[]) => resolvesToPrivateIp(...(args as [string])),
}));

const uploadFn = vi.fn(async () => ({ error: null }));
const getPublicUrlFn = vi.fn((path: string) => ({
  data: { publicUrl: `https://cdn.example/${path}` },
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({ upload: uploadFn, getPublicUrl: getPublicUrlFn }),
    },
  },
}));

import { persistAdImage, persistAdVideo, getMiningMediaPublicUrl } from "./media-persist";

function fakeResponse(opts: {
  ok?: boolean;
  status?: number;
  headers?: Record<string, string>;
  body?: ArrayBuffer;
  redirectTo?: string;
}): Response {
  const headers = new Map(Object.entries(opts.headers ?? {}));
  if (opts.redirectTo) headers.set("location", opts.redirectTo);
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? headers.get(k) ?? null },
    arrayBuffer: async () => opts.body ?? new ArrayBuffer(10),
  } as unknown as Response;
}

describe("persistAdImage", () => {
  beforeEach(() => {
    resolvesToPrivateIp.mockReset().mockResolvedValue(false);
    uploadFn.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copia a imagem e devolve image_copied com o caminho no bucket", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse({ headers: { "content-type": "image/jpeg", "content-length": "1000" } }),
      ),
    );
    const result = await persistAdImage("ad-1", "https://cdn.fb.com/img.jpg");
    expect(result.mediaStatus).toBe("image_copied");
    expect(result.imageStoragePath).toBe("ads/ad-1/image.jpg");
    expect(uploadFn).toHaveBeenCalledWith(
      "ads/ad-1/image.jpg",
      expect.anything(),
      expect.objectContaining({ contentType: "image/jpeg" }),
    );
  });

  it("marca expired quando o URL original já não responde (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse({ ok: false, status: 404 })),
    );
    const result = await persistAdImage("ad-1", "https://cdn.fb.com/img.jpg");
    expect(result).toEqual({ mediaStatus: "expired", imageStoragePath: null });
    expect(uploadFn).not.toHaveBeenCalled();
  });

  it("marca too_large_skipped quando excede o limite de tamanho (content-length)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse({ headers: { "content-length": String(50 * 1024 * 1024) } })),
    );
    const result = await persistAdImage("ad-1", "https://cdn.fb.com/img.jpg");
    expect(result.mediaStatus).toBe("too_large_skipped");
    expect(uploadFn).not.toHaveBeenCalled();
  });

  it("nunca chama fetch quando o SSRF guard bloqueia o host", async () => {
    resolvesToPrivateIp.mockResolvedValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await persistAdImage("ad-1", "http://169.254.169.254/latest/meta-data");
    expect(result.mediaStatus).toBe("expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("segue um único redirect revalidando o SSRF guard no novo host", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        if (call === 1)
          return fakeResponse({ status: 302, redirectTo: "https://cdn2.fb.com/img.jpg" });
        return fakeResponse({ headers: { "content-type": "image/png" } });
      }),
    );
    const result = await persistAdImage("ad-1", "https://cdn.fb.com/img.jpg");
    expect(result.mediaStatus).toBe("image_copied");
    expect(resolvesToPrivateIp).toHaveBeenCalledWith("cdn.fb.com");
    expect(resolvesToPrivateIp).toHaveBeenCalledWith("cdn2.fb.com");
  });

  it("nunca lança — erro de rede também vira expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const result = await persistAdImage("ad-1", "https://cdn.fb.com/img.jpg");
    expect(result.mediaStatus).toBe("expired");
  });
});

describe("persistAdVideo", () => {
  beforeEach(() => {
    resolvesToPrivateIp.mockReset().mockResolvedValue(false);
    uploadFn.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copia o vídeo e devolve video_copied", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse({ headers: { "content-type": "video/mp4" } })),
    );
    const result = await persistAdVideo("ad-1", "https://cdn.fb.com/vid.mp4");
    expect(result).toEqual({ mediaStatus: "video_copied", videoStoragePath: "ads/ad-1/video.mp4" });
  });
});

describe("getMiningMediaPublicUrl", () => {
  it("delega ao getPublicUrl do bucket mining-media", () => {
    const url = getMiningMediaPublicUrl("ads/ad-1/image.jpg");
    expect(url).toBe("https://cdn.example/ads/ad-1/image.jpg");
  });
});
