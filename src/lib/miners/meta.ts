import { runSyncGetDatasetItems } from "../integrations/apify/client";

export interface AdResult {
  advertiser: string;
  headline: string;
  copy: string;
  cta: string;
  landingPage: string;
  creativeUrl: string;
  creativeType: "image" | "video";
  engagement: { likes: number; shares: number; comments: number };
  country: string;
  language: string;
  adLibraryId?: string;
  platforms?: string[];
  startDate?: string;
}

// curious_coder/facebook-ads-library-scraper - Apify actor
const ACTOR_ID = "XtaWFhbtfxyzqrFmd";

function pickStr(obj: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function getPlatforms(obj: Record<string, unknown>): string[] {
  const raw = getPath(obj, "publisher_platform") ?? getPath(obj, "publisher_platforms") ?? [];
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

function getEngagement(_obj: Record<string, unknown>) {
  return { likes: 0, shares: 0, comments: 0 };
}

export async function mineMetaAds(query: string, country: string, language: string): Promise<AdResult[]> {
  const searchUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${encodeURIComponent(country)}&q=${encodeURIComponent(query)}&search_type=keyword_unordered`;

  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(ACTOR_ID, {
    urls: [{ url: searchUrl }],
    count: 10,
    scrapeAdDetails: true,
    scrapeAdvertiserPage: false,
  });

  return raw.map((item) => {
    const snapshot = (getPath(item, "snapshot") ?? {}) as Record<string, unknown>;
    const advertiser = pickStr(item, ["page_name", "snapshot.page_name", "advertiser.page.page_name"]) ?? "Anunciante";
    const headline = pickStr(snapshot, ["title", "link_description"]) ?? pickStr(item, ["page_name"]) ?? advertiser;
    const copy = pickStr(snapshot, ["body.text", "body.markup.__html"]) ?? "";
    const cta = pickStr(snapshot, ["cta_text", "cta_type"]) ?? "";
    const adLibraryId = pickStr(item, ["ad_archive_id", "id"]);
    const landingPage = pickStr(snapshot, ["link_url"]) ?? "";
    const images: unknown = getPath(snapshot, "images") ?? [];
    const videos: unknown = getPath(snapshot, "videos") ?? [];
    const creativeUrl = pickStr(item, ["snapshot.videos.0.video_preview_image_url"]) ?? pickStr(item, ["snapshot.images.0.original_image_url"]) ?? "";
    const creativeType = getPath(snapshot, "display_format") === "VIDEO" ? "video" as const : "image" as const;
    const videoUrl = pickStr(item, ["snapshot.videos.0.video_hd_url", "snapshot.videos.0.video_sd_url"]);
    const platforms = getPlatforms(item);
    const startEpoch = getPath(item, "start_date");
    const startDate = typeof startEpoch === "number" ? new Date(startEpoch * 1000).toISOString() : undefined;

    return {
      advertiser: advertiser.slice(0, 120),
      headline: headline.slice(0, 240),
      copy,
      cta: cta ?? "",
      landingPage,
      creativeUrl: videoUrl ?? creativeUrl,
      creativeType: creativeType === "video" || videoUrl ? "video" : "image",
      engagement: getEngagement(item),
      country,
      language,
      adLibraryId,
      platforms,
      startDate,
    };
  });
}
