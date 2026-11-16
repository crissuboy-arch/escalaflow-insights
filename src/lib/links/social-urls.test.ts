import { describe, it, expect } from "vitest";
import {
  adLibraryIdFromUrl,
  buildAdLibraryUrl,
  buildFacebookReelUrlFromId,
  facebookUrlVariants,
  normalizeAdLibraryId,
  normalizeFacebookPageUrl,
  normalizeReelUrl,
  resolveAdLink,
  safePageHref,
  safeReelHref,
} from "./social-urls";

describe("normalizeFacebookPageUrl", () => {
  it.each([
    ["facebook.com/tysonreed", "https://www.facebook.com/tysonreed"],
    ["https://m.facebook.com/tysonreed/?mibextid=ZbWKwL", "https://www.facebook.com/tysonreed"],
    ["https://web.facebook.com/Tyson.Reed-1/", "https://www.facebook.com/Tyson.Reed-1"],
    ["https://www.facebook.com/tysonreed/reels/", "https://www.facebook.com/tysonreed"],
    ["https://www.facebook.com/tysonreed/about", "https://www.facebook.com/tysonreed"],
    ["https://www.facebook.com/pg/tysonreed/posts/", "https://www.facebook.com/tysonreed"],
    [
      "https://www.facebook.com/profile.php?id=100064123456789&sk=reels",
      "https://www.facebook.com/profile.php?id=100064123456789",
    ],
    [
      "https://www.facebook.com/people/Tyson-Reed/100064123456789/",
      "https://www.facebook.com/profile.php?id=100064123456789",
    ],
  ])("%s → %s", (input, expected) => {
    expect(normalizeFacebookPageUrl(input)).toBe(expected);
  });

  it.each([
    "https://www.facebook.com/reel/1234567890123",
    "https://www.facebook.com/tysonreed/videos/1234567890123",
    "https://www.facebook.com/tysonreed/posts/pfbid0abc",
    "https://www.facebook.com/ads/library/?id=123456789012",
    "https://www.facebook.com/search/top?q=tyson",
    "https://www.facebook.com/login.php",
    "https://www.facebook.com/watch/?v=1234567890123",
    "https://www.facebook.com/profile.php",
    "https://instagram.com/tysonreed",
    "https://evil.com/facebook.com/tysonreed",
    "javascript:alert(1)",
    "",
    null,
    "Tyson Reed",
  ])("não é uma página: %s", (input) => {
    expect(normalizeFacebookPageUrl(input)).toBeNull();
  });
});

describe("normalizeReelUrl", () => {
  it.each([
    [
      "https://www.facebook.com/reel/1234567890123/?s=ifu",
      "https://www.facebook.com/reel/1234567890123",
      "facebook_reel",
    ],
    [
      "facebook.com/reel/1234567890123",
      "https://www.facebook.com/reel/1234567890123",
      "facebook_reel",
    ],
    [
      "https://m.facebook.com/tysonreed/reels/1234567890123",
      "https://www.facebook.com/reel/1234567890123",
      "facebook_reel",
    ],
    [
      "https://www.facebook.com/tysonreed/videos/1234567890123/",
      "https://www.facebook.com/tysonreed/videos/1234567890123",
      "facebook_video",
    ],
    [
      "https://www.facebook.com/tysonreed/videos/meu-video-top/1234567890123",
      "https://www.facebook.com/tysonreed/videos/1234567890123",
      "facebook_video",
    ],
    [
      "https://www.facebook.com/watch/?v=1234567890123&ref=sharing",
      "https://www.facebook.com/watch/?v=1234567890123",
      "facebook_watch",
    ],
    ["https://fb.watch/AbC123xyz/?mibextid=1", "https://fb.watch/AbC123xyz/", "fb_watch"],
    [
      "https://www.facebook.com/share/r/1AbCdEfGh/",
      "https://www.facebook.com/share/r/1AbCdEfGh/",
      "facebook_share",
    ],
    [
      "https://www.instagram.com/reel/C1aBcD2eF3/?igsh=abc",
      "https://www.instagram.com/reel/C1aBcD2eF3/",
      "instagram_reel",
    ],
    [
      "instagram.com/reels/C1aBcD2eF3",
      "https://www.instagram.com/reel/C1aBcD2eF3/",
      "instagram_reel",
    ],
  ])("%s → %s", (input, url, kind) => {
    expect(normalizeReelUrl(input)).toMatchObject({ url, kind });
  });

  it.each([
    "https://www.facebook.com/tysonreed",
    "https://www.facebook.com/tysonreed/reels/",
    "https://www.facebook.com/reel/",
    "https://www.facebook.com/reel/abc",
    "https://www.facebook.com/watch/",
    "https://www.facebook.com/ads/library/videos/1234567890123",
    "https://www.instagram.com/tysonreed/",
    "https://tiktok.com/@x/video/1234567890123",
    "not a url",
  ])("não é um Reel/vídeo específico: %s", (input) => {
    expect(normalizeReelUrl(input)).toBeNull();
    expect(safeReelHref(input)).toBeNull();
  });

  it("monta /reel/<id> só a partir de um ID numérico, nunca de nomes", () => {
    expect(buildFacebookReelUrlFromId("1234567890123")).toBe(
      "https://www.facebook.com/reel/1234567890123",
    );
    expect(buildFacebookReelUrlFromId("tysonreed")).toBeNull();
    expect(buildFacebookReelUrlFromId(undefined)).toBeNull();
  });
});

describe("links de anúncios", () => {
  it("ID da Biblioteca só se for numérico", () => {
    expect(normalizeAdLibraryId("1234567890123456")).toBe("1234567890123456");
    expect(normalizeAdLibraryId(1234567890123456)).toBe("1234567890123456");
    expect(normalizeAdLibraryId("a1b2c3")).toBeNull();
    expect(normalizeAdLibraryId("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
    expect(buildAdLibraryUrl("1234567890123456")).toBe(
      "https://www.facebook.com/ads/library/?id=1234567890123456",
    );
    expect(buildAdLibraryUrl("Loja X")).toBeNull();
  });

  it("extrai o ID de um link da Biblioteca", () => {
    expect(
      adLibraryIdFromUrl("https://www.facebook.com/ads/library/?id=1234567890123456&ref=x"),
    ).toBe("1234567890123456");
    expect(adLibraryIdFromUrl("https://www.facebook.com/ads/library/?q=x")).toBeNull();
  });

  it("resolveAdLink prefere o link canónico por ID", () => {
    expect(
      resolveAdLink({ ad_library_id: "1234567890123456", ad_url: "https://example.com/lp" }),
    ).toBe("https://www.facebook.com/ads/library/?id=1234567890123456");
    expect(
      resolveAdLink({
        ad_library_id: null,
        ad_url: "https://m.facebook.com/ads/library/?id=1234567890123456&active_status=all",
      }),
    ).toBe("https://www.facebook.com/ads/library/?id=1234567890123456");
  });

  it("resolveAdLink nunca devolve a página de PESQUISA da Biblioteca", () => {
    expect(
      resolveAdLink({
        ad_library_id: null,
        ad_url:
          "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=emagrecer",
      }),
    ).toBeNull();
    expect(resolveAdLink({ ad_library_id: "abc", ad_url: null })).toBeNull();
    expect(resolveAdLink({ ad_library_id: null, ad_url: "javascript:alert(1)" })).toBeNull();
  });
});

describe("safePageHref / facebookUrlVariants", () => {
  it("safePageHref só devolve páginas válidas", () => {
    expect(safePageHref("https://facebook.com/tysonreed")).toBe(
      "https://www.facebook.com/tysonreed",
    );
    expect(safePageHref("https://www.facebook.com/reel/1234567890123")).toBeNull();
  });

  it("variantes incluem o formato antigo (sem www / com barra)", () => {
    const v = facebookUrlVariants("https://www.facebook.com/tysonreed");
    expect(v).toContain("https://www.facebook.com/tysonreed");
    expect(v).toContain("https://facebook.com/tysonreed");
    expect(v).toContain("https://www.facebook.com/tysonreed/");
  });
});
