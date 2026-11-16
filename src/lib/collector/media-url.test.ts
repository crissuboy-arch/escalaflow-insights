import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `https://proj.supabase.co/storage/v1/object/public/${bucket}/${path}`,
          },
        }),
      }),
    },
  },
}));

const { pickMediaUrl, resolveAdImageUrl, resolveAdVideoUrl } = await import("./media-url");

const FB = "https://scontent.xx.fbcdn.net/v/t45/abc.jpg?oe=1";
const FBV = "https://video.xx.fbcdn.net/v/t42/abc.mp4?oe=1";

describe("preferência de mídia (Storage > CDN original > placeholder)", () => {
  it("prefere SEMPRE a cópia no Storage, mesmo com o URL original presente", () => {
    expect(
      resolveAdImageUrl({
        image_storage_path: "media/aa.jpg",
        image_url: FB,
        media_status: "both_copied",
      }),
    ).toBe("https://proj.supabase.co/storage/v1/object/public/mining-media/media/aa.jpg");
    expect(
      resolveAdVideoUrl({
        video_storage_path: "media/bb.mp4",
        video_url: FBV,
        media_status: "both_copied",
      }),
    ).toBe("https://proj.supabase.co/storage/v1/object/public/mining-media/media/bb.mp4");
  });

  it("Storage ganha mesmo quando o status diz expired (cópia feita antes de expirar)", () => {
    expect(
      resolveAdImageUrl({
        image_storage_path: "media/aa.jpg",
        image_url: FB,
        media_status: "expired",
      }),
    ).toMatch(/mining-media\/media\/aa\.jpg$/);
  });

  it("sem cópia, usa o CDN original enquanto não estiver marcado como morto", () => {
    expect(
      resolveAdImageUrl({ image_storage_path: null, image_url: FB, media_status: "not_attempted" }),
    ).toBe(FB);
    expect(
      resolveAdVideoUrl({
        video_storage_path: null,
        video_url: FBV,
        media_status: "pending_video",
      }),
    ).toBe(FBV);
    // compatível com chamadores antigos sem media_status
    expect(resolveAdImageUrl({ image_url: FB })).toBe(FB);
  });

  it("expired/no_media sem cópia → null (placeholder limpo, nunca imagem partida)", () => {
    expect(
      resolveAdImageUrl({ image_storage_path: null, image_url: FB, media_status: "expired" }),
    ).toBeNull();
    expect(
      resolveAdVideoUrl({ video_storage_path: null, video_url: FBV, media_status: "expired" }),
    ).toBeNull();
    expect(
      resolveAdImageUrl({ image_storage_path: null, image_url: FB, media_status: "no_media" }),
    ).toBeNull();
  });

  it("ignora valores que não são URLs http(s)", () => {
    expect(pickMediaUrl({ originalUrl: "javascript:alert(1)" }, (p) => p)).toBeNull();
    expect(pickMediaUrl({ originalUrl: "   " }, (p) => p)).toBeNull();
    expect(pickMediaUrl({ storagePath: "  ", originalUrl: FB }, (p) => `X/${p}`)).toBe(FB);
  });
});
