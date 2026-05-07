// Server-side orchestrator for the "Motor de Coleta".
// Swap the provider here in the future without touching callers.

import { createProvider } from "./collector.apify";
import { normalize } from "./collector.normalizer";
import type { CollectorRunInput, CollectorRunResult } from "./collector.types";

export async function runCollector(input: CollectorRunInput): Promise<CollectorRunResult> {
  const provider = createProvider();
  try {
    const raw = await provider.run(input);
    const ads = normalize(raw, {
      keyword: input.keyword,
      country: input.country || "—",
      niche: input.niche || "Geral",
    });
    return { ok: true, count: ads.length, ads };
  } catch (err) {
    return {
      ok: false,
      count: 0,
      ads: [],
      error: err instanceof Error ? err.message : "Falha no Motor de Coleta",
    };
  }
}