// Pure classifier for a pasted Facebook URL — page vs post vs reel.
// No network call here: this only looks at the URL shape. The real page/
// reel data (name, title) comes later from the scraper or from manual entry.
export type FacebookLinkType = "page" | "post" | "reel";

export interface FacebookLinkCheck {
  valid: boolean;
  normalizedUrl: string | null;
  linkType: FacebookLinkType | null;
  error: string | null;
}

const FACEBOOK_HOSTNAMES = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
]);

/** Classifies an already-validated Facebook URL's path. Reel patterns are
 *  checked before post/page so "/<page>/reels/<id>" doesn't fall through to
 *  the page-only branch. */
function classifyPath(hostname: string, pathname: string): FacebookLinkType {
  const path = pathname.replace(/\/+$/, ""); // drop trailing slash
  if (hostname === "fb.watch") return "reel";
  if (/\/reel\//.test(path) || /\/reels\//.test(path)) return "reel";
  if (/\/videos\//.test(path) || /\/watch\/?$/.test(path)) return "reel";
  if (/\/posts\//.test(path) || /\/photos\//.test(path) || /^\/story\.php/.test(path))
    return "post";
  return "page";
}

/** Validates that `raw` is a Facebook URL and classifies it. Never throws —
 *  always returns a result the caller can show in the UI. Does not fetch
 *  anything, so it cannot leak an SSRF probe by itself; the scraper that
 *  follows still goes through src/lib/net/ssrf-guard.ts. */
export function checkFacebookUrl(raw: string): FacebookLinkCheck {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, normalizedUrl: null, linkType: null, error: "URL vazia" };
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { valid: false, normalizedUrl: null, linkType: null, error: "URL inválida" };
  }

  const hostname = url.hostname.toLowerCase();
  if (!FACEBOOK_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      normalizedUrl: null,
      linkType: null,
      error: "Não parece ser um link do Facebook (facebook.com ou fb.watch)",
    };
  }

  const linkType = classifyPath(hostname, url.pathname);
  return { valid: true, normalizedUrl: url.toString(), linkType, error: null };
}
