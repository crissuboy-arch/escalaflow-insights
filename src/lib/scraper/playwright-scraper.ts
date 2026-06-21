/**
 * EscalaFlow — Offer Page Scraper (open source, Playwright)
 *
 * Captures publicly available data from any URL.
 * Does NOT handle login, sessions, cookies with credentials,
 * or any private/gated content.
 *
 * Designed to feed AI offer analysis pipelines.
 */

// Using new Function so NO bundler (Vite/Rollup/esbuild) can statically resolve
// "playwright" or its sub-dependencies (chromium-bidi). Playwright is Node.js-only
// and must never enter a Cloudflare Workers bundle.
// eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
async function getChromium(): Promise<any> {
  const pw = await (new Function('return import("playwright")')() as Promise<any>);
  return pw.chromium;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrapeResult {
  ok: true;
  url: string;
  scrapedAt: string;
  page: {
    title: string;
    metaDescription: string;
    lang: string;
    canonical: string | null;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  body: {
    paragraphs: string[];    // visible <p> text, deduplicated
    mainText: string;        // full visible text, trimmed to 8000 chars
    wordCount: number;
  };
  ctas: {
    buttons: string[];       // visible button / a.btn text
    links: Array<{ text: string; href: string }>;
  };
  media: {
    images: Array<{ src: string; alt: string }>;
    ogImage: string | null;
  };
  offer: {
    prices: string[];        // strings that match price patterns
    guarantee: string | null;
    countdown: boolean;
  };
  aiContext: string;         // compact summary string ready for AI prompt injection
}

export interface ScrapeError {
  ok: false;
  url: string;
  error: string;
  code: "BLOCKED" | "TIMEOUT" | "INVALID_URL" | "LOAD_FAILED" | "PRIVATE_PAGE";
}

export type ScrapeResponse = ScrapeResult | ScrapeError;

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRICE_RE = /(?:R\$|USD|\$|€|£|BRL)\s*\d[\d.,]*/gi;
const GUARANTEE_RE = /garantia|money.back|refund|devolv|reembolso/i;
const COUNTDOWN_SELECTORS = [
  "[class*=countdown]", "[class*=timer]", "[id*=countdown]",
  "[data-countdown]", ".oferta-timer",
];
const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "::1",
  "169.254.", "10.", "192.168.", "172.16.",
];

function validateUrl(raw: string): { valid: boolean; reason?: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { valid: false, reason: "URL inválida" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { valid: false, reason: "Somente HTTP/HTTPS permitido" };
  }
  for (const blocked of BLOCKED_HOSTS) {
    if (u.hostname === blocked || u.hostname.startsWith(blocked)) {
      return { valid: false, reason: "Acesso a endereços locais/privados não permitido" };
    }
  }
  return { valid: true };
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function buildAiContext(r: ScrapeResult): string {
  const lines: string[] = [
    `URL: ${r.url}`,
    `TÍTULO: ${r.page.title}`,
    r.page.metaDescription ? `META: ${r.page.metaDescription}` : "",
    r.headings.h1.length ? `H1: ${r.headings.h1.join(" | ")}` : "",
    r.headings.h2.length ? `H2: ${r.headings.h2.slice(0, 6).join(" | ")}` : "",
    r.ctas.buttons.length ? `CTAs: ${r.ctas.buttons.slice(0, 8).join(" | ")}` : "",
    r.offer.prices.length ? `PREÇOS: ${r.offer.prices.join(" | ")}` : "",
    r.offer.guarantee ? `GARANTIA: ${r.offer.guarantee}` : "",
    r.offer.countdown ? "COUNTDOWN: sim" : "",
    `TEXTO: ${r.body.mainText.slice(0, 3000)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

// ── Core scraper ──────────────────────────────────────────────────────────────

export async function scrapeOfferPage(
  rawUrl: string,
  timeoutMs = 30_000,
): Promise<ScrapeResponse> {
  const validation = validateUrl(rawUrl);
  if (!validation.valid) {
    return { ok: false, url: rawUrl, error: validation.reason!, code: "INVALID_URL" };
  }

  const url = rawUrl.trim();
  const chromium = await getChromium();
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      // Block credentials storage
      storageState: undefined,
    });

    // Block resource types that slow loading and are not needed for text extraction
    await context.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["font", "media", "websocket", "manifest"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const page = await context.newPage();

    // Navigate with timeout
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("timeout")) throw Object.assign(new Error(msg), { code: "TIMEOUT" });
      if (msg.includes("net::ERR")) throw Object.assign(new Error(msg), { code: "LOAD_FAILED" });
      throw err;
    });

    // Detect login-gated page (redirect to /login, /auth, etc.)
    const finalUrl = page.url();
    if (/\/(login|signin|sign-in|auth|account\/login)/i.test(finalUrl)) {
      return { ok: false, url, error: "Página requer autenticação — não é possível capturar dados privados", code: "PRIVATE_PAGE" };
    }

    // Wait briefly for JS-rendered content
    await page.waitForTimeout(1500).catch(() => {});

    // ── Extract data inside the browser context ──────────────────────────────
    // Passed as a STRING so esbuild/tsx never transforms it.
    // Playwright executes it directly inside Chromium.
    const data: {
      title: string; metaDesc: string; lang: string; canonical: string | null;
      ogImage: string | null; h1: string[]; h2: string[]; h3: string[];
      paragraphs: string[]; mainText: string; buttons: string[];
      links: Array<{text: string; href: string}>; images: Array<{src: string; alt: string}>;
      countdown: boolean;
    } = await page.evaluate(`(function() {
      function txt(el) { return el ? (el.textContent || "").trim() : ""; }
      function attr(el, a) { return el ? (el.getAttribute(a) || "") : ""; }
      function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

      var title = document.title;
      var md1 = document.querySelector('meta[name="description"]');
      var md2 = document.querySelector('meta[property="og:description"]');
      var metaDesc = attr(md1 || md2, "content");
      var lang = document.documentElement.lang || "";
      var cEl = document.querySelector('link[rel="canonical"]');
      var canonical = cEl ? attr(cEl, "href") : null;
      var ogEl = document.querySelector('meta[property="og:image"]');
      var ogImage = ogEl ? attr(ogEl, "content") : null;

      var h1 = qsa("h1").map(txt).filter(function(t){return t.length > 0;});
      var h2 = qsa("h2").map(txt).filter(function(t){return t.length > 0;});
      var h3 = qsa("h3").map(txt).filter(function(t){return t.length > 0;});
      var paragraphs = qsa("p").map(txt).filter(function(t){return t.length > 20;});

      var clone = document.body.cloneNode(true);
      var rem = clone.querySelectorAll("script,style,noscript,nav,footer,header");
      Array.prototype.forEach.call(rem, function(e){ if (e.parentNode) e.parentNode.removeChild(e); });
      var rawText = (clone.innerText || clone.textContent || "");
      var mainText = rawText.replace(/[ \\t]{2,}/g," ").replace(/\\n{3,}/g,"\\n\\n").trim().slice(0,8000);

      var buttons = qsa("button,a.btn,.cta,input[type=submit]")
        .map(txt).filter(function(t){return t.length>1 && t.length<120;});

      var links = qsa("a[href]").slice(0,60).map(function(e){
        return {text:txt(e).slice(0,80), href:e.href||""};
      }).filter(function(l){return l.text && l.href && l.href.indexOf("javascript")!==0;});

      var images = qsa("img[src]").slice(0,20).map(function(e){
        return {src:e.src||"", alt:attr(e,"alt")};
      }).filter(function(i){return i.src && i.src.indexOf("data:")!==0;});

      var cdSels = ["[class*=countdown]","[class*=timer]","[id*=countdown]","[data-countdown]"];
      var countdown = cdSels.some(function(s){return !!document.querySelector(s);});

      return {title:title, metaDesc:metaDesc, lang:lang, canonical:canonical,
              ogImage:ogImage, h1:h1, h2:h2, h3:h3, paragraphs:paragraphs,
              mainText:mainText, buttons:buttons, links:links, images:images,
              countdown:countdown};
    })()`);

    // ── Price extraction ─────────────────────────────────────────────────────
    const priceMatches = data.mainText.match(PRICE_RE) ?? [];
    const prices = dedup(priceMatches).slice(0, 10);

    // ── Guarantee detection ──────────────────────────────────────────────────
    const guaranteeMatch = data.paragraphs.find((p) => GUARANTEE_RE.test(p)) ?? null;

    // ── Compose result ───────────────────────────────────────────────────────
    const result: ScrapeResult = {
      ok: true,
      url,
      scrapedAt: new Date().toISOString(),
      page: {
        title: data.title,
        metaDescription: data.metaDesc || "",
        lang: data.lang,
        canonical: data.canonical,
      },
      headings: {
        h1: dedup(data.h1).slice(0, 5),
        h2: dedup(data.h2).slice(0, 10),
        h3: dedup(data.h3).slice(0, 10),
      },
      body: {
        paragraphs: dedup(data.paragraphs).slice(0, 30),
        mainText: data.mainText,
        wordCount: data.mainText.split(/\s+/).filter(Boolean).length,
      },
      ctas: {
        buttons: dedup(data.buttons).slice(0, 15),
        links: data.links.slice(0, 30),
      },
      media: {
        images: data.images,
        ogImage: data.ogImage,
      },
      offer: {
        prices,
        guarantee: guaranteeMatch?.slice(0, 200) ?? null,
        countdown: data.countdown,
      },
      aiContext: "",
    };
    result.aiContext = buildAiContext(result);

    console.log(`[scraper] ✓ ${url} — ${result.body.wordCount} words, ${prices.length} prices`);
    return result;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;

    console.error(`[scraper] ✗ ${url} — ${msg}`);

    if (code === "TIMEOUT" || msg.toLowerCase().includes("timeout")) {
      return { ok: false, url, error: `Página não respondeu em ${timeoutMs / 1000}s. Tente uma URL mais simples.`, code: "TIMEOUT" };
    }
    if (msg.includes("ERR_NAME_NOT_RESOLVED") || msg.includes("getaddrinfo")) {
      return { ok: false, url, error: "Domínio não encontrado. Verifique a URL.", code: "LOAD_FAILED" };
    }
    if (msg.includes("ERR_CONNECTION_REFUSED")) {
      return { ok: false, url, error: "Conexão recusada pelo servidor.", code: "LOAD_FAILED" };
    }
    if (code === "PRIVATE_PAGE") {
      return { ok: false, url, error: msg, code: "PRIVATE_PAGE" };
    }
    return { ok: false, url, error: `Falha ao carregar página: ${msg.slice(0, 200)}`, code: "LOAD_FAILED" };

  } finally {
    await browser?.close().catch(() => {});
  }
}
