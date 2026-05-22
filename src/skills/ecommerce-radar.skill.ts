import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { pickStr, pickNum } from "./helpers";
import { SkillResult, SkillOptions, withTimeout } from "./types";

// Actors are platform-specific (configure in .env before use):
//   APIFY_ECOMMERCE_AMAZON_ACTOR  — e.g. apify~amazon-asin-scraper
//   APIFY_ECOMMERCE_SHOPEE_ACTOR  — e.g. apify~shopee-scraper
//   APIFY_ECOMMERCE_ML_ACTOR      — e.g. apify~mercado-livre-scraper
function getActor(platform: EcommercePlatform): string {
  const platformActors: Record<EcommercePlatform, string | undefined> = {
    amazon: process.env.APIFY_ECOMMERCE_AMAZON_ACTOR?.trim(),
    shopee: process.env.APIFY_ECOMMERCE_SHOPEE_ACTOR?.trim(),
    mercadolivre: process.env.APIFY_ECOMMERCE_ML_ACTOR?.trim(),
  };
  const id = platformActors[platform] ?? process.env.APIFY_ECOMMERCE_ACTOR?.trim();
  if (!id) throw new Error(
    `Nenhum actor configurado para ${platform}. Configure APIFY_ECOMMERCE_ACTOR no .env`
  );
  return id;
}

// ── types ─────────────────────────────────────────────────────────────────────

export type EcommercePlatform = "amazon" | "shopee" | "mercadolivre";

export interface EcommerceProduct {
  productId: string;
  title: string;
  price: number;
  currency: string;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  seller: string;
  productUrl: string;
  imageUrl: string;
  platform: EcommercePlatform;
  category: string;
  opportunityScore: number;
}

export interface EcommerceRadarInput {
  query: string;
  platform: EcommercePlatform;
  country?: string;
  maxResults?: number;
  sortBy?: "relevance" | "sales" | "price_asc" | "price_desc" | "rating";
}

// ── normalizer ────────────────────────────────────────────────────────────────

function normalize(item: Record<string, unknown>, platform: EcommercePlatform): EcommerceProduct {
  const productId = pickStr(item, ["id", "asin", "product_id", "itemId"]) ?? "";
  const title = pickStr(item, ["title", "name", "product_name", "productTitle"]) ?? "";
  const price = pickNum(item, ["price", "currentPrice", "salePrice", "discountedPrice"]);
  const currency = pickStr(item, ["currency", "priceCurrency"]) ?? "BRL";
  const originalPrice = pickNum(item, [
    "originalPrice",
    "listPrice",
    "mrp",
    "original_price",
  ]);
  const discount =
    originalPrice > 0 && price > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : pickNum(item, ["discount", "discountRate", "discountPercentage"]);
  const rating = pickNum(item, ["rating", "stars", "averageRating", "score"]);
  const reviewCount = pickNum(item, [
    "reviewCount",
    "numberOfReviews",
    "reviews_count",
    "totalReviews",
  ]);
  const soldCount = pickNum(item, ["sold", "soldCount", "sales", "totalSold", "monthlySales"]);
  const seller = pickStr(item, ["seller", "sellerName", "store", "storeName", "brand"]) ?? "";
  const productUrl = pickStr(item, ["url", "link", "product_url", "permalink"]) ?? "";
  const imageUrl =
    pickStr(item, ["imageUrl", "image", "thumbnailUrl", "primaryImage", "images.0"]) ?? "";
  const category = pickStr(item, ["category", "breadcrumbs.0", "department"]) ?? "";

  // Higher score = higher demand & lower competition opportunity
  const opportunityScore = Math.min(
    100,
    Math.round(
      (soldCount > 0 ? Math.log10(soldCount) * 10 : 0) +
        (rating > 0 ? rating * 4 : 0) +
        (reviewCount > 0 ? Math.log10(reviewCount) * 5 : 0) +
        (discount > 20 ? 10 : 0),
    ),
  );

  return {
    productId,
    title,
    price,
    currency,
    originalPrice,
    discount,
    rating,
    reviewCount,
    soldCount,
    seller,
    productUrl,
    imageUrl,
    platform,
    category,
    opportunityScore,
  };
}

// ── skill entry point ─────────────────────────────────────────────────────────

export async function runEcommerceRadarSkill(
  input: EcommerceRadarInput,
  options: SkillOptions = {},
): Promise<SkillResult<EcommerceProduct>> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 130_000;

  let actor: string;
  try {
    actor = getActor(input.platform);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, skill: "ecommerce", data: [], error, duration_ms: 0 };
  }

  const payload: Record<string, unknown> = {
    query: input.query,
    country: input.country ?? "BR",
    maxResults: input.maxResults ?? 50,
    ...(input.sortBy && { sortBy: input.sortBy }),
  };

  console.log("[ecommerce-radar] actor=", actor);
  console.log("[ecommerce-radar] platform=", input.platform);
  console.log("[ecommerce-radar] payload=", JSON.stringify(payload));

  try {
    const raw = await withTimeout(
      runSyncGetDatasetItems<Record<string, unknown>>(actor, payload),
      timeoutMs,
      "ecommerce",
    );
    const data = raw.map((item) => normalize(item, input.platform)).filter((p) => p.productId);
    const duration_ms = Date.now() - start;

    console.log(`[ecommerce-radar] response items=${data.length} duration=${duration_ms}ms`);
    return { ok: true, skill: "ecommerce", data, duration_ms };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[ecommerce-radar] error=", error);
    return { ok: false, skill: "ecommerce", data: [], error, duration_ms: Date.now() - start };
  }
}
