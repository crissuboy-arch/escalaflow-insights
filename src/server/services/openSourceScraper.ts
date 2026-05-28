/**
 * EscalaFlow — Open Source Scraper Service
 *
 * Wraps the Playwright core scraper with the public API format
 * and provides AI-ready output via prepareScrapeForAI().
 *
 * Only captures publicly accessible pages.
 * Does NOT handle login, sessions, or private content.
 */
import { scrapeOfferPage } from "@/lib/scraper/playwright-scraper";
export type { PublicOfferData, ScrapeSuccess, ScrapeFailure, PublicScrapeResult } from "@/lib/scraper/offer-types";
export { prepareScrapeForAI } from "@/lib/scraper/offer-types";
import type { PublicScrapeResult, PublicOfferData } from "@/lib/scraper/offer-types";

// ── Main scrape function ───────────────────────────────────────────────────────

export async function scrapePublicOffer(
  url: string,
  timeoutMs = 30_000,
): Promise<PublicScrapeResult> {
  const result = await scrapeOfferPage(url, timeoutMs);

  if (!result.ok) {
    return { success: false, error: result.error, code: result.code };
  }

  return {
    success: true,
    data: {
      title:           result.page.title,
      url:             result.url,
      metaDescription: result.page.metaDescription,
      headings:        result.headings,
      paragraphs:      result.body.paragraphs,
      buttons:         result.ctas.buttons,
      links:           result.ctas.links,
      images:          result.media.images,
      prices:          result.offer.prices,
      visibleText:     result.body.mainText,
      scrapedAt:       result.scrapedAt,
    },
  };
}

// prepareScrapeForAI is re-exported from @/lib/scraper/offer-types (client-safe)
