/**
 * Teste do Playwright Collector
 * npx tsx scripts/test-collector.ts "emagrecimento"
 */
import { createPlaywrightProvider } from "../src/lib/collector/collector.playwright";

const keyword = process.argv[2] ?? "emagrecimento";
const country = process.argv[3] ?? "BR";
const limit   = Number(process.argv[4] ?? 10);

console.log(`\n[test-collector] keyword="${keyword}" country=${country} limit=${limit}\n`);

const provider = createPlaywrightProvider();

provider.run({ keyword, country, niche: "Geral", limit }).then((raw) => {
  console.log(`\n✅ ${raw.length} resultados\n`);
  (raw as Record<string, unknown>[]).forEach((ad, i) => {
    console.log(`--- ${i + 1} ---`);
    console.log("Advertiser:", ad.advertiser);
    console.log("Headline: ", ad.headline);
    console.log("Platform: ", ad.platform);
    console.log("URL:      ", ad.adUrl);
    console.log("Score:    ", ad.score);
    console.log("Tags:     ", JSON.stringify(ad.tags));
    console.log();
  });
  console.log("JSON completo do primeiro resultado:");
  if (raw[0]) console.log(JSON.stringify(raw[0], null, 2));
}).catch((e) => {
  console.error("❌ ERRO:", e.message);
  process.exit(1);
});
