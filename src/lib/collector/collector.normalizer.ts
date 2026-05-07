import type { CollectorAd } from "./collector.types";

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function inferScore(ad: Record<string, unknown>): number {
  let s = 50;
  const text = String(pick(ad, ["ad_creative_body", "body", "copy", "text"]) ?? "");
  if (text.length > 200) s += 10;
  if (text.length > 500) s += 10;
  const platforms = ad?.publisher_platforms ?? ad?.platforms;
  if (Array.isArray(platforms) && platforms.length >= 3) s += 10;
  if (pick(ad, ["video_hd_url", "video_url", "videoUrl"])) s += 10;
  return Math.min(99, s);
}

export function normalize(
  raw: unknown[],
  ctx: { keyword: string; country: string; niche: string },
): CollectorAd[] {
  const out: CollectorAd[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const ad = item as Record<string, unknown>;
    const advertiser = String(
      pick(ad, ["page_name", "advertiser", "advertiserName", "pageName"]) ?? "Anunciante",
    );
    const headline = String(
      pick(ad, ["ad_creative_link_title", "headline", "title", "ad_creative_body"]) ?? advertiser,
    ).slice(0, 240);
    const copy = String(pick(ad, ["ad_creative_body", "body", "copy", "text"]) ?? "");
    const cta = pick<string>(ad, ["ad_creative_link_caption", "cta", "call_to_action"]);
    const imageUrl = pick<string>(ad, [
      "image_url", "imageUrl", "snapshot_image", "thumbnail",
    ]);
    const videoUrl = pick<string>(ad, ["video_hd_url", "video_sd_url", "video_url", "videoUrl"]);
    const adLibraryId = pick<string>(ad, ["ad_archive_id", "adArchiveId", "id", "adLibraryId"]);
    const adUrl = adLibraryId
      ? `https://www.facebook.com/ads/library/?id=${adLibraryId}`
      : pick<string>(ad, ["url", "adUrl", "snapshot_url"]);
    const platforms = ad?.publisher_platforms ?? ad?.platforms;
    const platform = Array.isArray(platforms) && platforms.length
      ? String(platforms[0])
      : "Facebook";

    out.push({
      advertiser,
      headline: headline || advertiser,
      copy,
      cta: cta ? String(cta) : undefined,
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      videoUrl: videoUrl ? String(videoUrl) : undefined,
      adLibraryId: adLibraryId ? String(adLibraryId) : undefined,
      adUrl: adUrl ? String(adUrl) : undefined,
      platform,
      country: ctx.country || "—",
      niche: ctx.niche || "Geral",
      score: inferScore(ad),
      source: "collector",
      createdAt: new Date().toISOString(),
    });
  }
  // dedup by adLibraryId
  const seen = new Set<string>();
  return out.filter((a) => {
    const key = a.adLibraryId || a.adUrl || `${a.advertiser}|${a.headline}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}