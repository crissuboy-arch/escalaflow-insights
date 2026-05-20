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

const ACTOR_ID = "apify/facebook-ads-library-scraper";

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

export async function mineMetaAds(query: string, country: string, language: string): Promise<AdResult[]> {
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(ACTOR_ID, {
    keywords: query,
    country,
    language,
  });

  const results: AdResult[] = [];

  for (const item of raw) {
    const advertiser = pickStr(item, ["page_name", "advertiser_name", "advertiser"]) ?? "Anunciante";
    const headline = pickStr(item, ["title", "headline", "snapshot.title"]) ?? advertiser;
    const copy = pickStr(item, ["body", "copy", "text", "snapshot.body.text", "ad_creative_body"]) ?? "";
    const cta = pickStr(item, ["cta_text", "cta_type", "cta", "snapshot.cta_text"]) ?? "";
    const adLibraryId = pickStr(item, ["ad_archive_id", "id", "snapshot.ad_archive_id"]);
    const landingPage = pickStr(item, ["link_url", "landing_page", "snapshot.link_url"]) ?? "";
    const creativeUrl = pickStr(item, ["snapshot.images.0.original_image_url", "snapshot.images.0.resized_image_url", "image_url", "thumbnail"]);
    const videoUrl = pickStr(item, ["snapshot.videos.0.video_hd_url", "snapshot.videos.0.video_sd_url", "video_hd_url"]);
    const platforms = (getPath(item, "publisher_platforms") ?? getPath(item, "platforms") ?? []) as string[];
    const countryVal = pickStr(item, ["snapshot.country", "country"]) ?? country;
    const startEpoch = getPath(item, "start_date") ?? getPath(item, "snapshot.creation_time");
    const startDate = typeof startEpoch === "number"
      ? new Date(startEpoch * 1000).toISOString()
      : typeof startEpoch === "string" ? startEpoch : undefined;

    results.push({
      advertiser,
      headline,
      copy,
      cta,
      landingPage,
      creativeUrl: videoUrl ?? creativeUrl ?? "",
      creativeType: videoUrl ? "video" : "image",
      engagement: { likes: 0, shares: 0, comments: 0 },
      country: countryVal,
      language,
      adLibraryId,
      platforms,
      startDate,
    });
  }

  return results;
}
