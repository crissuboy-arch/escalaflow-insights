import { describe, it, expect } from "vitest";
import { checkFacebookUrl } from "./link-detector";

describe("checkFacebookUrl", () => {
  it("rejeita URL vazia", () => {
    const r = checkFacebookUrl("   ");
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/vazia/i);
  });

  it("rejeita um domínio que não é Facebook", () => {
    const r = checkFacebookUrl("https://instagram.com/p/abc123/");
    expect(r.valid).toBe(false);
    expect(r.linkType).toBeNull();
  });

  it("rejeita URL malformada", () => {
    const r = checkFacebookUrl("not a url at all ::::");
    expect(r.valid).toBe(false);
  });

  it("aceita https://facebook.com/reel/<id> como reel", () => {
    const r = checkFacebookUrl("https://www.facebook.com/reel/123456789");
    expect(r.valid).toBe(true);
    expect(r.linkType).toBe("reel");
  });

  it("aceita fb.watch como reel", () => {
    const r = checkFacebookUrl("https://fb.watch/abcDEF123/");
    expect(r.valid).toBe(true);
    expect(r.linkType).toBe("reel");
  });

  it("aceita /<page>/reels/<id> como reel", () => {
    const r = checkFacebookUrl("https://www.facebook.com/tysonreed/reels/987654321");
    expect(r.linkType).toBe("reel");
  });

  it("aceita /<page>/videos/<id> como reel (vídeo nativo)", () => {
    const r = checkFacebookUrl("https://www.facebook.com/tysonreed/videos/111222333");
    expect(r.linkType).toBe("reel");
  });

  it("aceita /<page>/posts/<id> como post", () => {
    const r = checkFacebookUrl("https://www.facebook.com/tysonreed/posts/444555666");
    expect(r.linkType).toBe("post");
  });

  it("aceita story.php como post", () => {
    const r = checkFacebookUrl("https://www.facebook.com/story.php?story_fbid=1&id=2");
    expect(r.linkType).toBe("post");
  });

  it("aceita só /<page> (sem mais nada) como page", () => {
    const r = checkFacebookUrl("https://www.facebook.com/tysonreed");
    expect(r.linkType).toBe("page");
  });

  it("aceita um URL sem protocolo (assume https)", () => {
    const r = checkFacebookUrl("facebook.com/tysonreed");
    expect(r.valid).toBe(true);
    expect(r.normalizedUrl).toMatch(/^https:\/\//);
  });

  it("nunca lança excepção para qualquer input", () => {
    expect(() => checkFacebookUrl("")).not.toThrow();
    expect(() => checkFacebookUrl("://///")).not.toThrow();
    expect(() => checkFacebookUrl("javascript:alert(1)")).not.toThrow();
  });
});
