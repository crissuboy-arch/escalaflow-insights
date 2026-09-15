// Server-side orchestrator for the "Motor de Coleta".
// Primary:  Playwright (open source, no API key needed)
// Fallback: Apify (only if APIFY_TOKEN is set and Playwright returns nothing)

import { createPlaywrightProvider } from "./collector.playwright";
import { createProvider as createApifyProvider } from "./collector.apify";
import { normalize } from "./collector.normalizer";
import type { CollectorRunInput, CollectorRunResult } from "./collector.types";

export async function runCollector(input: CollectorRunInput): Promise<CollectorRunResult> {
  const ctx = `keyword="${input.keyword}" country=${input.country} niche=${input.niche} platform=${input.platform ?? "—"}`;
  console.log(`[collector] starting run: ${ctx}`);

  // ── Facebook Ad Library requested explicitly: go straight to the real
  //    Apify actor instead of the Bing/Yahoo commercial-page search, which
  //    never returns actual ad creatives (no image/video by design). ──────
  if (input.platform === "Facebook") {
    if (!process.env.APIFY_TOKEN) {
      return { ok: false, count: 0, ads: [], error: "Motor de Coleta do Facebook Ad Library não configurado (APIFY_TOKEN ausente)." };
    }
    try {
      const apify = createApifyProvider();
      const raw = await apify.run(input);
      console.log(`[collector] facebook (apify direct) returned ${raw.length} items`);
      if (!raw.length) return { ok: true, count: 0, ads: [], error: undefined };
      const ads = normalize(raw, {
        keyword: input.keyword,
        country: input.country || "—",
        niche: input.niche || "Geral",
      });
      return { ok: true, count: ads.length, ads };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.warn(`[collector] facebook (apify direct) failed: ${error}`);
      return { ok: false, count: 0, ads: [], error };
    }
  }

  // ── 1. Try Playwright (open source, primary) ─────────────────────────────
  let raw: unknown[] = [];
  let playwrightError: string | null = null;

  try {
    const pw = createPlaywrightProvider();
    raw = await pw.run(input);
    console.log(`[collector] playwright returned ${raw.length} items`);
  } catch (err) {
    playwrightError = err instanceof Error ? err.message : String(err);
    console.warn(`[collector] playwright failed: ${playwrightError}`);
  }

  // ── 2. Apify fallback (only if token configured AND playwright got nothing) ─
  if (!raw.length && process.env.APIFY_TOKEN) {
    console.log("[collector] playwright empty — trying Apify fallback");
    try {
      const apify = createApifyProvider();
      raw = await apify.run(input);
      console.log(`[collector] apify fallback returned ${raw.length} items`);
    } catch (err) {
      const apifyErr = err instanceof Error ? err.message : String(err);
      console.warn(`[collector] apify fallback failed: ${apifyErr}`);
      // If both fail, surface a clean error
      if (!raw.length) {
        return {
          ok: false, count: 0, ads: [],
          error: `Nenhum resultado encontrado para "${input.keyword}". ${playwrightError ? `(scraper: ${playwrightError.slice(0, 100)})` : ""}`,
        };
      }
    }
  }

  // ── 3. No results from either source ────────────────────────────────────
  if (!raw.length) {
    return {
      ok: true,
      count: 0,
      ads: [],
      error: undefined,
    };
  }

  // ── 4. Normalize and return ──────────────────────────────────────────────
  try {
    const ads = normalize(raw, {
      keyword: input.keyword,
      country: input.country || "—",
      niche:   input.niche   || "Geral",
    });
    const withMedia = ads.filter((a) => a.imageUrl || a.videoUrl).length;
    const withCopy  = ads.filter((a) => (a.copy?.length ?? 0) > 0).length;
    console.log(
      `[collector] normalized: ${ads.length} ads | mídia=${withMedia} copy=${withCopy}`,
    );
    return { ok: true, count: ads.length, ads };
  } catch (err) {
    console.error("[collector] normalize failed:", err);
    return {
      ok: false, count: 0, ads: [],
      error: err instanceof Error ? err.message : "Erro ao processar resultados",
    };
  }
}