import { runSyncGetDatasetItems } from "../integrations/apify/client";
import { APIFY_ACTORS } from "@/config/apify-actors";

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
  imageUrl?: string;
  videoUrl?: string;
}

// Actor loaded from APIFY_META_ADS_ACTOR in .env
function getActorId() { return APIFY_ACTORS.facebook(); }

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
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (Number.isNaN(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
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

  const actorId = getActorId();
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(actorId, {
    urls: [{ url: searchUrl }],
    count: 10,
    scrapeAdDetails: true,
    scrapeAdvertiserPage: false,
  });

  const results = raw.map((item) => {
    const advertiser =
      pickStr(item, ["page_name", "snapshot.page_name", "advertiser.page.page_name", "advertiser_name", "pageName"]) ??
      "Anunciante";

    const headline =
      pickStr(item, ["snapshot.title", "snapshot.cards.0.title", "snapshot.link_description", "ad_creative_link_title", "headline", "title"]) ??
      advertiser;

    const copyRaw =
      pickStr(item, [
        "snapshot.body.text",
        "snapshot.body.markup.__html",
        "snapshot.cards.0.body",
        "snapshot.cards.0.text",
        "snapshot.link_description",
        "snapshot.caption",
        "snapshot.message",
        "ad_creative_body",
        "primaryText",
        "primary_text",
        "adText",
        "body",
        "copy",
        "text",
        "description",
        "message",
        "caption",
      ]) ?? "";
    const copy = copyRaw.includes("<") ? stripHtml(copyRaw) : copyRaw;

    const cta =
      pickStr(item, ["snapshot.cta_text", "snapshot.cards.0.cta_text", "cta_type", "cta", "call_to_action"]) ?? "";

    const adLibraryId = pickStr(item, ["ad_archive_id", "adArchiveId", "snapshot.ad_archive_id", "id"]);
    const landingPage = pickStr(item, ["snapshot.link_url", "snapshot.cards.0.link_url", "link_url", "landing_page_url"]) ?? "";

    // Image — priority cascade
    const imageUrl =
      pickStr(item, [
        "snapshot.images.0.original_image_url",
        "snapshot.images.0.resized_image_url",
        "snapshot.images.0.uri",
        "snapshot.images.0.resized_image_uri",
        "snapshot.cards.0.original_image_url",
        "snapshot.cards.0.resized_image_url",
        "snapshot.videos.0.video_preview_image_url",
        "snapshot.cards.0.video_preview_image_url",
        "image_url",
        "imageUrl",
        "imageUri",
        "thumbnail",
        "thumbnailUrl",
        "thumbnail_url",
        "snapshotUrl",
        "snapshot_url",
        "creativeUrl",
        "creative_url",
        "poster",
        "cover",
      ]) ?? "";

    const videoUrl =
      pickStr(item, [
        "snapshot.videos.0.video_hd_url",
        "snapshot.videos.0.video_sd_url",
        "snapshot.videos.0.video_hd_uri",
        "snapshot.videos.0.video_sd_uri",
        "snapshot.cards.0.video_hd_url",
        "snapshot.cards.0.video_sd_url",
        "video_hd_url",
        "video_sd_url",
        "video_url",
        "videoUrl",
        "videoUri",
      ]);

    const snapshot = (getPath(item, "snapshot") ?? {}) as Record<string, unknown>;
    const displayFormat = getPath(snapshot, "display_format");
    const isVideo = displayFormat === "VIDEO" || !!videoUrl;

    const platforms = getPlatforms(item);
    const startEpoch = getPath(item, "start_date") ?? getPath(item, "snapshot.creation_time");
    const startDate = typeof startEpoch === "number" ? new Date(startEpoch * 1000).toISOString() : undefined;

    const creativeUrl = videoUrl ?? imageUrl;

    return {
      advertiser: advertiser.slice(0, 120),
      headline: headline.slice(0, 240),
      copy,
      cta,
      landingPage,
      creativeUrl,
      creativeType: (isVideo ? "video" : "image") as "video" | "image",
      engagement: getEngagement(item),
      country,
      language,
      adLibraryId,
      platforms,
      startDate,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
    };
  });

  const withMedia = results.filter((r) => r.creativeUrl).length;
  const withCopy  = results.filter((r) => r.copy.length > 0).length;
  console.log(
    `[meta] actor=${actorId} | raw=${raw.length} ads` +
    ` | com_mídia=${withMedia} ❌sem:${raw.length - withMedia}` +
    ` | com_copy=${withCopy} ❌sem:${raw.length - withCopy}`
  );
  if (results.every((r) => r.engagement.likes === 0 && r.engagement.shares === 0)) {
    console.warn("[meta] ⚠️ MOCK: engagement={likes:0,shares:0,comments:0} — Meta Ad Library não expõe métricas reais via scraper");
  }

  return results;
}
