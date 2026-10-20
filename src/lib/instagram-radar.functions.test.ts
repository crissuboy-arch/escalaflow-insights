import { describe, it, expect } from "vitest";
import { normalizeItem } from "./instagram-radar.functions";

// Regression coverage for the real diagnosed bug: Instagram Reels/video
// posts never got a playable video URL — only a static thumbnail
// (display_url) was ever promoted from the Apify item, even though the
// real apify~instagram-scraper response includes a `videoUrl` field for
// video items. The raw item was stored (column `raw`), but nothing ever
// read it back out for playback.
describe("normalizeItem — captura real de video_url (fix: Instagram nunca reproduzia vídeo)", () => {
  it("promove videoUrl do item real do Apify para video_url e marca is_video", () => {
    const item = {
      shortCode: "ABC123",
      caption: "Minha receita viral",
      videoUrl: "https://scontent.cdninstagram.com/real-video.mp4",
      displayUrl: "https://scontent.cdninstagram.com/thumb.jpg",
      likesCount: 500,
      commentsCount: 20,
    };
    const row = normalizeItem(item, "receitas", "hashtag", "reels");
    expect(row.video_url).toBe("https://scontent.cdninstagram.com/real-video.mp4");
    expect(row.is_video).toBe(true);
    expect(row.display_url).toBe("https://scontent.cdninstagram.com/thumb.jpg");
  });

  it("nunca inventa video_url para um post de imagem real (sem campo de vídeo no item)", () => {
    const item = {
      shortCode: "XYZ789",
      caption: "Foto do produto",
      displayUrl: "https://scontent.cdninstagram.com/photo.jpg",
      likesCount: 100,
    };
    const row = normalizeItem(item, "produtos", "hashtag", "posts");
    expect(row.video_url).toBeNull();
    expect(row.is_video).toBe(false);
  });

  it("aceita o nome de campo alternativo video_url (snake_case) do item real", () => {
    const item = { shortCode: "AAA", video_url: "https://cdn.example.com/v.mp4" };
    const row = normalizeItem(item, "x", "hashtag", "reels");
    expect(row.video_url).toBe("https://cdn.example.com/v.mp4");
    expect(row.is_video).toBe(true);
  });

  it("marca is_video mesmo sem URL de vídeo quando o item real indica isVideo explicitamente (nunca esconde a evidência)", () => {
    const item = { shortCode: "BBB", isVideo: true };
    const row = normalizeItem(item, "x", "hashtag", "reels");
    expect(row.is_video).toBe(true);
    expect(row.video_url).toBeNull();
  });

  it("o item bruto completo continua preservado em raw, sem perder evidência", () => {
    const item = { shortCode: "CCC", videoUrl: "https://cdn.example.com/v2.mp4", extraField: "x" };
    const row = normalizeItem(item, "x", "hashtag", "reels");
    expect(row.raw).toEqual(item);
  });
});
