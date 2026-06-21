/**
 * EscalaFlow — Commercial Offer Collector (Playwright / HTTP)
 *
 * Strategy:
 * 1. Site-specific Bing queries (hotmart, kiwify, perfectpay…) — guaranteed commercial
 * 2. Intent queries (página de vendas, VSL, checkout…) — country-aware
 * 3. Yahoo fallback
 * 4. Playwright browser only if ALL HTTP queries return 0 results
 *
 * MIN_COMMERCIAL_SCORE = 55 — strict filter, no generic pages.
 */
import type { CollectorProvider, CollectorRunInput } from "./collector.types";

// ── Playwright loader (new Function prevents any bundler from resolving it) ──

// eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
async function getChromium(): Promise<any> {
  const pw = await (new Function('return import("playwright")')() as Promise<any>);
  return pw.chromium;
}

// ── Blocked domains (never commercial) ───────────────────────────────────────

const BLOCKED_DOMAINS = new Set([
  "wikipedia.org","pt.wikipedia.org","en.wikipedia.org","simple.wikipedia.org",
  "wikimedia.org","wikidata.org","cambridge.org","merriam-webster.com",
  "dictionary.com","dicionario.com.br","dicionarioportugues.com.br",
  "significado.com.br","priberam.pt","infopedia.pt","aulete.com.br",
  "michaelis.uol.com.br","wordreference.com","linguee.com","reverso.net",
  "arimetrics.com","semrush.com","similarweb.com","ahrefs.com","moz.com",
  "hubspot.com","neilpatel.com","rockcontent.com",
  "stackoverflow.com","developer.mozilla.org","w3schools.com","devdocs.io",
  "docs.google.com","support.google.com","developers.google.com",
  "infoescola.com","brasilescola.uol.com.br","mundoeducacao.uol.com.br",
  "todamateria.com.br","coladaweb.com","suapesquisa.com","significados.com.br",
  "g1.globo.com","r7.com","terra.com.br","folha.uol.com.br",
  "estadao.com.br","bbc.com","cnn.com","gov.br","ibge.gov.br",
]);

function isBlockedDomain(host: string): boolean {
  const h = host.replace("www.", "").toLowerCase();
  if (BLOCKED_DOMAINS.has(h)) return true;
  if (h.endsWith(".wikipedia.org") || h.endsWith(".wikimedia.org")) return true;
  if (h.startsWith("docs.") || h.startsWith("developer.") || h.startsWith("support.") || h.startsWith("help.")) return true;
  if (/\.edu\.br$|\.edu$|\.ac\.uk$/.test(h)) return true;
  return false;
}

// ── Commercial platform base scores ──────────────────────────────────────────

const PLATFORM_SCORES: Record<string, number> = {
  "hotmart.com": 88,
  "pay.hotmart.com": 96,
  "go.hotmart.com": 91,
  "checkout.hotmart.com": 96,
  "kiwify.com": 86,
  "kiwify.com.br": 88,
  "checkout.kiwify.com.br": 96,
  "pay.kiwify.com.br": 96,
  "perfectpay.com.br": 86,
  "monetizze.com.br": 84,
  "braip.com": 82,
  "eduzz.com": 80,
  "clickbank.com": 78,
  "myshopify.com": 72,
  "shopify.com": 65,
  "mercadoshops.com.br": 68,
  "mercadolivre.com.br": 60,
  "amazon.com.br": 58,
};

const MIN_COMMERCIAL_SCORE = 55;

// ── Offer type classification ─────────────────────────────────────────────────

type OfferType = "anuncio" | "pagina-venda" | "vsl" | "checkout" | "ecommerce" | "conteudo";

function classifyOfferType(url: string, title: string, snippet: string): OfferType {
  const u = url.toLowerCase();
  const t = `${title} ${snippet}`.toLowerCase();
  if (u.includes("facebook.com/ads") || u.includes("fb.com/ads")) return "anuncio";
  if (/\/checkout|\/pay\/|\/pedido|\/compra\/|\/order\b|\/cart\b/.test(u)) return "checkout";
  if (u.includes("pay.hotmart") || u.includes("checkout.kiwify") || u.includes("perfectpay.com.br")) return "checkout";
  if (/\/vsl\b|video-de-vend|carta-em-video/.test(u) || /\bvsl\b|vídeo de vendas|carta em vídeo/i.test(t)) return "vsl";
  if (/(amazon\.|mercadolivre\.|americanas\.|shopee\.|aliexpress\.)/.test(u) || /myshopify\.com/.test(u)) return "ecommerce";
  if (/(hotmart\.|kiwify\.|monetizze\.|eduzz\.|braip\.|perfectpay\.)/.test(u)) return "pagina-venda";
  if (/\/lp\/|\/landing|\/oferta\/|\/sales\/|\/promo\//.test(u)) return "pagina-venda";
  if (/página de vendas|lançamento|curso online|treinamento/i.test(t) && /comprar|acesse|garanta/i.test(t)) return "pagina-venda";
  return "conteudo";
}

// ── Commercial score (0–100, minimum 55 to pass) ─────────────────────────────

function scoreCommercial(url: string, title: string, snippet: string, host: string): number {
  const h = host.replace("www.", "").toLowerCase();
  const u = url.toLowerCase();
  const t = `${title} ${snippet}`.toLowerCase();

  for (const [domain, base] of Object.entries(PLATFORM_SCORES)) {
    if (h === domain || h.endsWith(`.${domain}`) || u.includes(`${domain}/`)) return base;
  }

  let score = 5;

  // URL structural signals
  if (/\/checkout|\/pay\/|\/pedido/.test(u)) score += 35;
  if (/\/vsl\/|video-de-vend|\/lp\/|\/landing/.test(u)) score += 28;
  if (/\/oferta|\/promo|\/sales|\/offer/.test(u)) score += 22;
  if (/\/curso|\/treinamento|\/ebook|\/produto/.test(u)) score += 15;

  // Strong CTAs
  if (/compre agora|acesse agora|garanta já|garanta agora|clique aqui|quero acesso|inscreva-se/i.test(t)) score += 22;
  if (/acesso imediato|acesso vitalício|comece hoje|compre hoje/i.test(t)) score += 18;

  // Price / discount signals
  if (/r\$\s*[\d.,]+|r\$\d/.test(t)) score += 18;
  if (/% off|parcelar|\d+x sem juros|\d+ parcelas/i.test(t)) score += 14;
  if (/de r\$|por apenas|somente hoje|desconto de/i.test(t)) score += 12;

  // Credibility
  if (/garanti|dinheiro de volta|reembolso/i.test(t)) score += 14;
  if (/depoimento|prova social|resultado|antes e depois/i.test(t)) score += 10;
  if (/hotmart|kiwify|monetizze|eduzz|braip|perfectpay|clickbank/i.test(t)) score += 15;

  // Product type
  if (/\bvsl\b|vídeo de vendas|assista (até|ao final)/i.test(t)) score += 22;
  if (/curso online|treinamento|método|ebook|e-book|mentoria/i.test(t)) score += 12;
  if (/afiliado|comissão/.test(t)) score += 8;
  if (/comprar|adquirir|obter|baixar agora/i.test(t)) score += 10;
  if (/bônus|bonus|brinde/.test(t)) score += 8;

  // Soft penalizers (informational without purchase intent)
  if (/o que é\b|como funciona|definição|o significado/i.test(t) && !/comprar|acesse|checkout/.test(t)) score -= 20;

  return Math.min(100, Math.max(0, score));
}

// ── HTTP headers ──────────────────────────────────────────────────────────────

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
  "Cache-Control": "max-age=0",
};

// ── HTML parsers ──────────────────────────────────────────────────────────────

type ParsedResult = { title: string; url: string; snippet: string; displayUrl: string };
type RawResult    = ParsedResult & { sourceEngine: string };

function parseBingHtml(html: string, limit: number): ParsedResult[] {
  function decodeBingHref(href: string): string {
    const m = href.match(/[?&]u=([^&]+)/);
    if (!m) return href;
    try {
      const b64 = m[1].replace(/^a1/, "").replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(b64, "base64").toString("utf-8");
    } catch { return href; }
  }

  const decoded = html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const results: ParsedResult[] = [];
  const parts = decoded.split('class="b_algo"');

  for (let i = 1; i < parts.length && results.length < limit; i++) {
    const block = parts[i].slice(0, 5000);
    const titleM = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const rawHref  = titleM?.[1] ?? "";
    const rawTitle = (titleM?.[2] ?? "").replace(/<[^>]+>/g, "").trim();
    const snipM    = block.match(/b_caption[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    const snip     = (snipM?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    const realUrl  = rawHref.includes("bing.com/ck") ? decodeBingHref(rawHref) : rawHref;

    if (!rawTitle || !realUrl || !realUrl.startsWith("http")) continue;
    let host = "";
    try { host = new URL(realUrl).hostname.replace("www.", ""); } catch { continue; }
    if (!host || host.includes("bing.com") || host.includes("msn.com")) continue;
    results.push({ title: rawTitle, url: realUrl, snippet: snip, displayUrl: host });
  }
  return results;
}

function parseYahooHtml(html: string, limit: number): ParsedResult[] {
  const results: ParsedResult[] = [];
  const divRe = /<div[^>]+class="[^"]*algo[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = divRe.exec(html)) !== null && results.length < limit) {
    const block = m[1];
    const hrefM  = block.match(/href="(https?:\/\/[^"&]+)/);
    const titleM = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    const snipM  = block.match(/<span[^>]+class="[^"]*fc-15th[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    const href   = hrefM?.[1]?.trim() ?? "";
    const title  = (titleM?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    const snip   = (snipM?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    if (!href || !title || href.includes("yahoo.com")) continue;
    let host = "";
    try { host = new URL(href).hostname.replace("www.", ""); } catch { continue; }
    results.push({ title, url: href, snippet: snip, displayUrl: host });
  }
  return results;
}

// ── Query builder (country-aware, site-specific) ──────────────────────────────

type QuerySpec = { url: string; engine: string; parser: (html: string, limit: number) => ParsedResult[] };

function buildSearchQueries(keyword: string, country: string): QuerySpec[] {
  const cc  = (country && country !== "all") ? country : "BR";
  const isBR = ["BR", "PT"].includes(cc);
  const isES = ["ES", "MX", "AR", "CL", "CO", "PE"].includes(cc);
  const kw   = keyword.trim();
  const enc  = encodeURIComponent;
  const lang = isBR ? "&setlang=pt-BR&cc=BR" : isES ? "&setlang=es-ES&cc=ES" : `&cc=${cc}`;
  const bing = (q: string, engine: string): QuerySpec => ({
    url: `https://www.bing.com/search?q=${enc(q)}&count=25&form=QBLH${lang}`,
    engine,
    parser: parseBingHtml,
  });

  const queries: QuerySpec[] = [
    // ── Tier 1: Platform-direct (guaranteed commercial, score ≥ 88) ──────────
    bing(`${kw} site:hotmart.com`, "bing:hotmart"),
    bing(`${kw} site:kiwify.com.br`, "bing:kiwify"),
    bing(`${kw} site:perfectpay.com.br OR site:monetizze.com.br OR site:braip.com`, "bing:platforms-br"),
  ];

  // ── Tier 2: Intent queries (country-specific) ─────────────────────────────
  if (isBR) {
    queries.push(bing(`"${kw}" "página de vendas" OR "acesso imediato" OR VSL comprar -wikipedia -dicionário`, "bing:venda-br"));
    queries.push(bing(`"${kw}" "comprar agora" OR checkout OR "garanta agora" OR "acesse agora" -wikipedia`, "bing:cta-br"));
    queries.push(bing(`"${kw}" método OR curso online OR ebook hotmart OR kiwify -wikipedia`, "bing:produto-br"));
  } else if (isES) {
    queries.push(bing(`${kw} site:hotmart.com OR site:clickbank.com comprar oferta`, "bing:hotmart-es"));
    queries.push(bing(`"${kw}" "página de ventas" OR "comprar ahora" OR VSL método -wikipedia`, "bing:venda-es"));
    queries.push(bing(`"${kw}" checkout oferta descuento "accede ahora" -wikipedia`, "bing:cta-es"));
  } else {
    queries.push(bing(`"${kw}" site:clickbank.com OR site:jvzoo.com`, "bing:clickbank-en"));
    queries.push(bing(`"${kw}" "sales page" OR VSL OR "buy now" checkout -wikipedia`, "bing:venda-en"));
  }

  // ── Tier 3: Yahoo fallback ────────────────────────────────────────────────
  const yahooQ = isBR
    ? `${kw} hotmart kiwify comprar`
    : `${kw} buy checkout offer`;
  queries.push({
    url: `https://search.yahoo.com/search?p=${enc(yahooQ)}&n=20&ei=UTF-8&vl=lang_pt`,
    engine: "yahoo",
    parser: parseYahooHtml,
  });

  return queries;
}

// ── Parallel HTTP search ───────────────────────────────────────────────────────

async function searchHttp(keyword: string, country: string, limit: number, timeoutMs: number): Promise<RawResult[]> {
  const specs   = buildSearchQueries(keyword, country);
  const startTs = Date.now();

  console.log(`\n[collector] ──── START keyword="${keyword}" country=${country} queries=${specs.length} ────`);
  specs.forEach(s => console.log(`[collector]   query: ${s.engine}`));

  const settled = await Promise.allSettled(
    specs.map(async ({ url, engine, parser }): Promise<{ engine: string; items: ParsedResult[] }> => {
      try {
        const res = await fetch(url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(Math.min(timeoutMs, 12_000)),
        });
        if (!res.ok) {
          console.warn(`[collector] ${engine}: HTTP ${res.status}`);
          return { engine, items: [] };
        }
        const html = await res.text();
        if (/captcha|challenge|resolva o desafio|robot|verify you are human/i.test(html.slice(0, 3000))) {
          console.warn(`[collector] ${engine}: CAPTCHA detected — skipping`);
          return { engine, items: [] };
        }
        const items = parser(html, 30);
        console.log(`[collector] ${engine}: ${items.length} raw results`);
        return { engine, items };
      } catch (err) {
        console.warn(`[collector] ${engine}: ${(err as Error).message?.slice(0, 60)}`);
        return { engine, items: [] };
      }
    }),
  );

  const seen = new Set<string>();
  const combined: RawResult[] = [];

  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value.items) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        combined.push({ ...item, sourceEngine: r.value.engine });
      }
    }
  }

  const elapsed = Date.now() - startTs;
  console.log(`[collector] HTTP done: ${combined.length} raw total | ${elapsed}ms elapsed`);
  return combined;
}

// ── Playwright browser fallback ───────────────────────────────────────────────

async function searchBrowser(keyword: string, country: string, limit: number, timeoutMs: number): Promise<RawResult[]> {
  const cc = (country && country !== "all") ? country : "BR";
  let browser: any = null;
  try {
    const chromium = await getChromium();
    browser = await chromium.launch({ headless: true });
    const ctx  = await browser.newContext({ userAgent: FETCH_HEADERS["User-Agent"], locale: "pt-BR" });
    const page = await ctx.newPage();
    await ctx.route("**/*", (route: any) => {
      const t = route.request().resourceType();
      if (["font", "media", "websocket"].includes(t)) route.abort();
      else route.continue();
    });
    const q = encodeURIComponent(`${keyword} site:hotmart.com OR site:kiwify.com.br comprar`);
    await page.goto(`https://www.bing.com/search?q=${q}&count=30&setlang=pt-BR&cc=${cc}`, {
      waitUntil: "domcontentloaded", timeout: timeoutMs,
    });
    await page.waitForSelector("li.b_algo", { timeout: 8000 }).catch(() => {});

    const json: string = await page.evaluate(`(function() {
      var items = [];
      var results = document.querySelectorAll("li.b_algo");
      for (var i = 0; i < Math.min(results.length, 30); i++) {
        var r = results[i];
        var aEl = r.querySelector("h2 a");
        var snEl = r.querySelector(".b_caption p, .b_snippet");
        var href = aEl ? (aEl.href || "") : "";
        var title = aEl ? (aEl.textContent || "").trim() : "";
        var snippet = snEl ? (snEl.textContent || "").trim() : "";
        var dispUrl = href;
        try { dispUrl = new URL(href).hostname.replace("www.",""); } catch(e) {}
        if (title && href && href.indexOf("http") === 0 && href.indexOf("bing.com") === -1)
          items.push({ title: title, url: href, snippet: snippet, displayUrl: dispUrl });
      }
      return JSON.stringify(items);
    })()`);

    const parsed = (JSON.parse(json) as ParsedResult[]).slice(0, limit);
    return parsed.map(r => ({ ...r, sourceEngine: "browser-playwright" }));
  } finally {
    await browser?.close().catch(() => {});
  }
}

// ── Tag extraction ────────────────────────────────────────────────────────────

function extractTags(keyword: string, r: RawResult, offerType: OfferType): string[] {
  const tags = [keyword.toLowerCase().trim()];
  const t = `${r.title} ${r.snippet}`.toLowerCase();
  if (/curso|treinamento|mentori/.test(t))       tags.push("curso");
  if (/ebook|livro digital|pdf/.test(t))          tags.push("ebook");
  if (/consultori|atendimento/.test(t))           tags.push("serviço");
  if (/produto físico|entrega|frete/.test(t))     tags.push("produto-fisico");
  if (/afiliado|comissão/.test(t))                tags.push("afiliado");
  if (/bônus|bonus/.test(t))                      tags.push("bônus");
  if (/depoimento|prova social/.test(t))          tags.push("prova-social");
  if (offerType === "vsl")        tags.push("VSL");
  if (offerType === "checkout")   tags.push("Checkout");
  if (offerType === "pagina-venda") tags.push("Página de Venda");
  return [...new Set(tags)];
}

function detectPlatform(url: string): string {
  if (/hotmart/.test(url))     return "Hotmart";
  if (/kiwify/.test(url))      return "Kiwify";
  if (/monetizze/.test(url))   return "Monetizze";
  if (/eduzz/.test(url))       return "Eduzz";
  if (/braip/.test(url))       return "Braip";
  if (/perfectpay/.test(url))  return "PerfectPay";
  if (/clickbank/.test(url))   return "ClickBank";
  if (/shopify/.test(url))     return "Shopify";
  if (/instagram/.test(url))   return "Instagram";
  if (/facebook/.test(url))    return "Facebook";
  if (/mercadolivre/.test(url)) return "MercadoLivre";
  if (/amazon/.test(url))      return "Amazon";
  return "Web";
}

// ── Provider factory ──────────────────────────────────────────────────────────

export function createPlaywrightProvider(): CollectorProvider {
  return {
    async run(input: CollectorRunInput): Promise<unknown[]> {
      const { keyword, country = "BR", niche = "Geral", limit = 20 } = input;
      const runStart = Date.now();

      // ── 1. HTTP parallel search ──────────────────────────────────────────
      let rawResults: RawResult[] = [];
      try {
        rawResults = await searchHttp(keyword, country, limit, 30_000);
      } catch (err) {
        console.error("[collector] HTTP search error:", err);
      }

      // ── 2. Browser fallback only if HTTP returned nothing ────────────────
      if (!rawResults.length) {
        console.log("[collector] HTTP empty — trying Playwright browser fallback");
        try {
          rawResults = await searchBrowser(keyword, country, limit, 30_000);
        } catch (err) {
          console.error("[collector] browser fallback error:", err);
          return [];
        }
      }

      if (!rawResults.length) {
        console.warn("[collector] no results found for:", keyword);
        return [];
      }

      // ── 3. Score, classify, filter ───────────────────────────────────────
      const cc  = country === "all" ? "BR" : country;
      const now = new Date().toISOString();

      type DebugEntry = { url: string; score: number; reason: string };
      const discarded: DebugEntry[] = [];
      const approved: DebugEntry[]  = [];

      const qualified = rawResults
        .map((r) => {
          let host = "";
          try { host = new URL(r.url).hostname.replace("www.", ""); } catch { return null; }

          if (isBlockedDomain(host)) {
            discarded.push({ url: r.url, score: 0, reason: `blocked-domain:${host}` });
            return null;
          }

          const score = scoreCommercial(r.url, r.title, r.snippet, host);
          if (score < MIN_COMMERCIAL_SCORE) {
            discarded.push({ url: r.url, score, reason: `score-${score}<${MIN_COMMERCIAL_SCORE}` });
            return null;
          }

          const offerType = classifyOfferType(r.url, r.title, r.snippet);
          const tags      = extractTags(keyword, r, offerType);
          approved.push({ url: r.url, score, reason: `approved:${r.sourceEngine}` });

          return {
            advertiser:   host,
            headline:     r.title.slice(0, 200),
            copy:         r.snippet.slice(0, 1000),
            cta:          "Acessar",
            adUrl:        r.url,
            imageUrl:     null as string | null,
            videoUrl:     null as string | null,
            mediaStatus:  "not-found" as const,
            platform:     detectPlatform(r.url),
            country:      cc,
            niche,
            score,
            offerType,
            sourceEngine: r.sourceEngine,
            source:       "collector" as const,
            createdAt:    now,
            tags,
            raw:          r,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      // Sort by score desc, deduplicate same host (keep highest score per domain)
      qualified.sort((a, b) => b.score - a.score);
      const seenHosts = new Set<string>();
      const deduped = qualified.filter(r => {
        const h = r.advertiser;
        // Allow up to 3 results per domain (e.g. multiple hotmart products)
        const key = `${h}-${Array.from(seenHosts).filter(k => k.startsWith(h)).length}`;
        if (Array.from(seenHosts).filter(k => k.startsWith(h)).length >= 3) return false;
        seenHosts.add(key);
        return true;
      });

      const final = deduped.slice(0, limit);
      const elapsed = Date.now() - runStart;

      // ── Debug summary ────────────────────────────────────────────────────
      console.log(`\n[collector] ──── RESULT ────`);
      console.log(`[collector] keyword    : ${keyword}`);
      console.log(`[collector] raw total  : ${rawResults.length}`);
      console.log(`[collector] discarded  : ${discarded.length}`);
      console.log(`[collector] approved   : ${approved.length}`);
      console.log(`[collector] returned   : ${final.length} (limit=${limit})`);
      console.log(`[collector] elapsed    : ${elapsed}ms`);
      if (discarded.length > 0) {
        console.log(`[collector] top discards:`);
        discarded.slice(0, 5).forEach(d => console.log(`[collector]   ✗ ${d.reason} — ${d.url.slice(0, 70)}`));
      }
      if (final.length > 0) {
        console.log(`[collector] top approved:`);
        final.slice(0, 5).forEach(a => console.log(`[collector]   ✓ score=${a.score} [${a.offerType}] ${a.adUrl?.slice(0, 70)}`));
      }
      console.log(`[collector] ────────────────────\n`);

      return final;
    },
  };
}
