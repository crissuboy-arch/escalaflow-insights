// Server-side orchestrator for the "Motor de Coleta".
// Swap the provider here in the future without touching callers.

import { createProvider } from "./collector.apify";
import { normalize } from "./collector.normalizer";
import type { CollectorRunInput, CollectorRunResult } from "./collector.types";

export async function runCollector(input: CollectorRunInput): Promise<CollectorRunResult> {
  const provider = createProvider();
  try {
    console.log(`[collector] starting run: keyword="${input.keyword}", country=${input.country}, niche=${input.niche}`);
    const raw = await provider.run(input);
    console.log(`[collector] provider returned ${raw.length} raw items`);
    const ads = normalize(raw, {
      keyword: input.keyword,
      country: input.country || "—",
      niche: input.niche || "Geral",
    });
    const withMedia = ads.filter((a) => a.imageUrl || a.videoUrl).length;
    const withCopy  = ads.filter((a) => (a.copy?.length ?? 0) > 0).length;
    console.log(
      `[collector] normalized: ${ads.length} ads | com_mídia=${withMedia} ❌sem:${ads.length - withMedia}` +
      ` | com_copy=${withCopy} ❌sem:${ads.length - withCopy}`,
    );
    return { ok: true, count: ads.length, ads };
  } catch (err) {
    console.error("[collector] runCollector FAILED:", err);
    return {
      ok: false,
      count: 0,
      ads: [],
      error: err instanceof Error ? err.message : "Falha no Motor de Coleta",
    };
  }
}