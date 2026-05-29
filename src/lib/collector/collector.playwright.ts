/**
 * EscalaFlow — Open Source Collector Provider (Playwright)
 *
 * Replaces Apify as primary collection engine.
 * Searches DuckDuckGo HTML (public, no API key) for pages
 * related to the keyword and extracts structured offer data.
 *
 * No credentials. No private data. Timeout-safe.
 */
import type { CollectorProvider, CollectorRunInput } from "./collector.types";

// Dynamic import — keeps Playwright out of client bundle
async function getChromium() {
  const { chromium } = await import("playwright");
  return chromium;
}

// ── HTTP-only search (no browser needed) ─────────────────────────────────────
// Uses a plain Node.js fetch with realistic headers so we bypass browser
// fingerprint-based bot detection.

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "max-age=0",
};

async function searchHttp(query: string, limit: number, timeoutMs: number): Promise<RawResult[]> {
  const encoded = encodeURIComponent(query);

  // Try Bing first, then try a fallback search
  const sources = [
    `https://www.bing.com/search?q=${encoded}&count=25&setlang=pt-BR&cc=BR&form=QBLH`,
    `https://search.yahoo.com/search?p=${encoded}&n=20&ei=UTF-8&vl=lang_pt`,
  ];

  for (const url of sources) {
    try {
      console.log(`[collector.playwright] HTTP fetch: ${url.slice(0, 80)}…`);
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        console.warn(`[collector.playwright] HTTP ${res.status} from ${new URL(url).hostname}`);
        continue;
      }

      const html = await res.text();

      // Check if it's a CAPTCHA / challenge page
      if (/captcha|challenge|resolva o desafio|anomaly|robot|verify you are human/i.test(html.slice(0, 3000))) {
        console.warn(`[collector.playwright] CAPTCHA detected on ${new URL(url).hostname}`);
        continue;
      }

      const results = parseSearchHtml(html, new URL(url).hostname, limit);
      if (results.length > 0) {
        console.log(`[collector.playwright] HTTP extracted ${results.length} results`);
        return results;
      }
    } catch (err) {
      console.warn(`[collector.playwright] HTTP fetch error: ${(err as Error).message?.slice(0, 80)}`);
    }
  }
  return [];
}

// Simple regex-based HTML parser — works without JSDOM/cheerio
function parseSearchHtml(html: string, engine: string, limit: number): RawResult[] {
  const results: RawResult[] = [];

  if (engine.includes("bing.com")) {
    // Bing wraps real URLs in CK redirect: href="https://www.bing.com/ck/a?...&u=a1{base64url}..."
    // Decode: strip "a1" prefix then base64 → real URL
    function decodeBingHref(href: string): string {
      const uMatch = href.match(/[?&]u=([^&]+)/);
      if (!uMatch) return href;
      try {
        const b64 = uMatch[1].replace(/^a1/, "").replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(b64, "base64").toString("utf-8");
      } catch { return href; }
    }

    // Decode HTML entities first so &amp; → & and URLs parse correctly
    const decoded = html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    // Split by b_algo class — each section = one result
    const algoParts = decoded.split('class="b_algo"');
    for (let i = 1; i < algoParts.length && results.length < limit; i++) {
      const block = algoParts[i].slice(0, 4000);

      // Title: <h2 ...><a ... href="URL">TITLE</a></h2>
      const titleM = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const rawHref  = titleM?.[1] ?? "";
      const rawTitle = (titleM?.[2] ?? "").replace(/<[^>]+>/g, "").trim();

      // Snippet near b_caption
      const snipM = block.match(/b_caption[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
      const snip  = (snipM?.[1] ?? "").replace(/<[^>]+>/g, "").trim();

      // Decode Bing CK redirect → real URL
      const realUrl = rawHref.includes("bing.com/ck") ? decodeBingHref(rawHref) : rawHref;
      const host = (() => { try { return new URL(realUrl).hostname.replace("www.", ""); } catch { return ""; } })();

      if (rawTitle && realUrl && realUrl.startsWith("http") && !host.includes("bing.com") && host) {
        results.push({ title: rawTitle, url: realUrl, snippet: snip, displayUrl: host });
      }
    }
  } else if (engine.includes("yahoo.com")) {
    // Yahoo: <div class="algo-sr">...<h3><a href="URL">TITLE</a>...<span>SNIPPET</span>
    const divRe = /<div[^>]+class="[^"]*algo[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let m: RegExpExecArray | null;
    while ((m = divRe.exec(html)) !== null && results.length < limit) {
      const block = m[1];
      const hrefM = block.match(/href="(https?:\/\/[^"&]+)/);
      const titleM = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
      const snipM  = block.match(/<span[^>]+class="[^"]*fc-15th[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const href   = hrefM?.[1]?.trim() ?? "";
      const title  = (titleM?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
      const snip   = (snipM?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
      if (href && title && !href.includes("yahoo.com")) {
        const host = (() => { try { return new URL(href).hostname.replace("www.",""); } catch { return href; } })();
        results.push({ title, url: href, snippet: snip, displayUrl: host });
      }
    }
  }

  return results;
}

type RawResult = {
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
};

// ── Scoring heuristic ─────────────────────────────────────────────────────────

function scoreResult(r: RawResult): number {
  let s = 40;
  const t = `${r.title} ${r.snippet}`.toLowerCase();
  if (/r\$\d|preço|desconto|oferta|promoç/.test(t)) s += 15;
  if (/garanti|dinheiro de volta|reembolso/.test(t)) s += 10;
  if (/compre|comprar|acesse|clique|inscreva|quero/.test(t)) s += 10;
  if (/hotmart|kiwify|monetizze|eduzz|braip/.test(r.url)) s += 15;
  if (/%\s*off|descont|\d+x sem/.test(t)) s += 10;
  return Math.min(100, s);
}

// ── Tag extraction ────────────────────────────────────────────────────────────

function extractTags(keyword: string, r: RawResult): string[] {
  const tags: string[] = [keyword.toLowerCase().trim()];
  const t = `${r.title} ${r.snippet}`.toLowerCase();
  if (/curso|treinamento|mentori/.test(t)) tags.push("curso");
  if (/ebook|livro digital|pdf/.test(t))  tags.push("ebook");
  if (/consultori|atendimento|serviço/.test(t)) tags.push("serviço");
  if (/produto físico|entrega|frete/.test(t)) tags.push("produto-fisico");
  if (/afiliado|comissão/.test(t)) tags.push("afiliado");
  return [...new Set(tags)];
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(url: string): string {
  if (/hotmart/.test(url))    return "Hotmart";
  if (/kiwify/.test(url))     return "Kiwify";
  if (/monetizze/.test(url))  return "Monetizze";
  if (/eduzz/.test(url))      return "Eduzz";
  if (/braip/.test(url))      return "Braip";
  if (/shopify/.test(url))    return "Shopify";
  if (/instagram/.test(url))  return "Instagram";
  if (/facebook/.test(url))   return "Facebook";
  return "Web";
}

// ── Core search ───────────────────────────────────────────────────────────────

async function searchBing(query: string, limit: number, timeoutMs: number): Promise<RawResult[]> {
  // ── Try plain HTTP first — avoids browser fingerprint CAPTCHA ──────────────
  const httpResults = await searchHttp(query, limit, timeoutMs).catch(() => []);
  if (httpResults.length > 0) return httpResults;

  // ── Fallback: Playwright browser (slower, may hit CAPTCHA) ─────────────────
  const chromium = await getChromium();
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
    });
    const page = await ctx.newPage();

    // Block unnecessary resource types to speed up loading
    await ctx.route("**/*", (route) => {
      const t = route.request().resourceType();
      if (["font", "media", "websocket"].includes(t)) route.abort();
      else route.continue();
    });

    const encoded = encodeURIComponent(query);
    const searchUrl = `https://www.bing.com/search?q=${encoded}&count=30&setlang=pt-BR&cc=BR`;

    console.log(`[collector.playwright] Bing: "${query}"`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    // Wait for organic results to render
    await page.waitForSelector("li.b_algo", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500).catch(() => {});

    // Extract results — passed as string to avoid esbuild helpers
    const resultsJson: string = await page.evaluate(`(function() {
      var items = [];
      // Bing organic results: li.b_algo
      var results = document.querySelectorAll("li.b_algo");
      for (var i = 0; i < Math.min(results.length, 30); i++) {
        var r = results[i];
        var aEl = r.querySelector("h2 a");
        var snEl = r.querySelector(".b_caption p, .b_snippet");
        var href = aEl ? (aEl.href || "") : "";
        var title = aEl ? (aEl.textContent || "").trim() : "";
        var snippet = snEl ? (snEl.textContent || "").trim() : "";
        var dispUrl = href;
        try { dispUrl = new URL(href).hostname.replace("www.",""); } catch(e){}
        if (title && href && href.indexOf("http") === 0 && href.indexOf("bing.com") === -1) {
          items.push({ title: title, url: href, snippet: snippet, displayUrl: dispUrl });
        }
      }
      return JSON.stringify(items);
    })()`);

    const parsed = JSON.parse(resultsJson) as RawResult[];
    console.log(`[collector.playwright] Bing returned ${parsed.length} results`);
    return parsed.slice(0, limit);

  } finally {
    await browser?.close().catch(() => {});
  }
}

// ── Provider factory ──────────────────────────────────────────────────────────

export function createPlaywrightProvider(): CollectorProvider {
  return {
    async run(input: CollectorRunInput): Promise<unknown[]> {
      const { keyword, country = "BR", niche = "Geral", limit = 20 } = input;

      // Build a targeted search that surfaces offers and landing pages
      const countryHint = country && country !== "all" ? ` ${country}` : "";
      const query = `${keyword}${countryHint} comprar OR oferta OR "acesse agora" OR "garantia" OR hotmart OR kiwify`;

      let results: RawResult[] = [];
      try {
        results = await searchBing(query, Math.min(limit, 25), 28_000);
      } catch (err) {
        console.error("[collector.playwright] search error:", err);
        return [];
      }

      if (!results.length) {
        console.warn("[collector.playwright] no results found for:", keyword);
        return [];
      }

      const now = new Date().toISOString();

      return results.map((r) => ({
        // CollectorAd compatible shape
        advertiser:  r.displayUrl || new URL(r.url).hostname.replace("www.", ""),
        headline:    r.title.slice(0, 200),
        copy:        r.snippet.slice(0, 1000),
        cta:         "Acessar",
        adUrl:       r.url,
        imageUrl:    null,
        videoUrl:    null,
        platform:    detectPlatform(r.url),
        country:     country === "all" ? "BR" : country,
        niche,
        score:       scoreResult(r),
        source:      "collector" as const,
        createdAt:   now,
        tags:        extractTags(keyword, r),
        raw:         r,
      }));
    },
  };
}
