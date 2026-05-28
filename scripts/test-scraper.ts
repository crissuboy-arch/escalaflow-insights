/**
 * Teste standalone do scraper — rode diretamente com tsx.
 *
 * Uso:
 *   npx tsx scripts/test-scraper.ts https://exemplo.com
 *   npx tsx scripts/test-scraper.ts https://hotmart.com/product/algum-produto
 */
import { scrapeOfferPage } from "../src/lib/scraper/playwright-scraper";

const url = process.argv[2] ?? "https://example.com";
const timeout = Number(process.argv[3] ?? 30000);

console.log(`\n[test-scraper] Scraping: ${url}\n`);

scrapeOfferPage(url, timeout).then((result) => {
  if (!result.ok) {
    console.error(`\n❌ ERRO [${result.code}]: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Sucesso — ${result.body.wordCount} palavras\n`);
  console.log("=".repeat(60));
  console.log("TÍTULO:", result.page.title);
  console.log("META:  ", result.page.metaDescription.slice(0, 120));
  console.log("H1:    ", result.headings.h1.join(" | "));
  console.log("H2:    ", result.headings.h2.slice(0, 4).join(" | "));
  console.log("CTAs:  ", result.ctas.buttons.slice(0, 6).join(" | "));
  console.log("PREÇOS:", result.offer.prices.join(" | ") || "(nenhum detectado)");
  console.log("IMGS:  ", result.media.images.length, "imagens");
  console.log("LINKS: ", result.ctas.links.length, "links");
  console.log("\nAI CONTEXT (primeiras 500 chars):\n", result.aiContext.slice(0, 500));
  console.log("=".repeat(60));
  console.log("\nJSON COMPLETO:");
  console.log(JSON.stringify(result, null, 2));
}).catch((e) => {
  console.error("Erro inesperado:", e);
  process.exit(1);
});
