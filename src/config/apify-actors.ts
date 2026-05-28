// Central Apify actor registry — all actor IDs come from .env, never hardcoded.
// Every module that calls Apify must read from this file.

function req(key: string, fallback?: string): string {
  const val = process.env[key]?.trim();
  if (val) return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`${key} não configurado no .env`);
}

export const APIFY_ACTORS = {
  // Social radars
  tiktok:     () => req("APIFY_TIKTOK_ACTOR",         "clockworks~tiktok-scraper"),
  youtube:    () => req("APIFY_YOUTUBE_ACTOR",         "streamers~youtube-scraper"),
  instagram:  () => req("APIFY_INSTAGRAM_ACTOR",       "apify~instagram-scraper"),
  facebook:   () => req("APIFY_META_ADS_ACTOR",        "apify~facebook-ads-scraper"),
  // Trends
  googleTrends: () => req("APIFY_GOOGLE_TRENDS_ACTOR", "apify~google-trends-scraper"),
  // E-commerce (platform-specific, falls back to generic)
  amazon:       () => req("APIFY_ECOMMERCE_AMAZON_ACTOR", "") || req("APIFY_ECOMMERCE_ACTOR"),
  shopee:       () => req("APIFY_ECOMMERCE_SHOPEE_ACTOR",  "") || req("APIFY_ECOMMERCE_ACTOR"),
  mercadolivre: () => req("APIFY_ECOMMERCE_ML_ACTOR",      "") || req("APIFY_ECOMMERCE_ACTOR"),
} as const;
