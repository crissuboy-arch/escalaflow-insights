import type { CollectorAd } from "./collector.types";

type Obj = Record<string, unknown>;

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (Number.isNaN(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = (cur as Obj)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function pickStr(obj: unknown, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickArr(obj: unknown, paths: string[]): unknown[] | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (Array.isArray(v) && v.length) return v;
  }
  return undefined;
}

const IMG_RE = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/i;
const VID_RE = /https?:\/\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]*)?/i;

function deepFind(obj: unknown, re: RegExp, depth = 0): string | undefined {
  if (depth > 6 || obj == null) return undefined;
  if (typeof obj === "string") return re.test(obj) ? obj.match(re)?.[0] : undefined;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = deepFind(v, re, depth + 1);
      if (r) return r;
    }
    return undefined;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj as Obj)) {
      const r = deepFind(v, re, depth + 1);
      if (r) return r;
    }
  }
  return undefined;
}

function inferScore(copy: string, hasVideo: boolean, platforms?: string[]): number {
  let s = 50;
  if (copy.length > 200) s += 10;
  if (copy.length > 500) s += 10;
  if (platforms && platforms.length >= 3) s += 10;
  if (hasVideo) s += 10;
  return Math.min(99, s);
}

export function normalize(
  raw: unknown[],
  ctx: { keyword: string; country: string; niche: string },
): CollectorAd[] {
  const out: CollectorAd[] = [];

  if (raw[0]) {
    try {
      const first = raw[0];
      // eslint-disable-next-line no-console
      console.log(
        "[apify] sample item keys:",
        typeof first === "object" && first ? Object.keys(first as Obj) : typeof first,
      );
      // eslint-disable-next-line no-console
      console.log("[apify] sample item:", JSON.stringify(first).slice(0, 2000));
    } catch {}
  }

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const ad = item as Obj;

    const advertiser =
      pickStr(ad, [
        "snapshot.page_name",
        "page_name",
        "advertiser_name",
        "advertiser",
        "pageName",
      ]) ?? "Anunciante";

    const copy =
      pickStr(ad, [
        "snapshot.body.text",
        "snapshot.body.markup.__html",
        "snapshot.cards.0.body",
        "snapshot.link_description",
        "ad_creative_body",
        "body",
        "copy",
        "text",
      ]) ?? "";

    const headline =
      pickStr(ad, [
        "snapshot.title",
        "snapshot.cards.0.title",
        "snapshot.link_description",
        "ad_creative_link_title",
        "headline",
        "title",
      ]) ?? advertiser;

    const cta = pickStr(ad, [
      "snapshot.cta_text",
      "snapshot.cards.0.cta_text",
      "cta_type",
      "cta",
      "call_to_action",
    ]);

    // Media — priority order
    let imageUrl: string | undefined;
    let mediaSource: CollectorAd["mediaSource"] = "none";

    const directImg = pickStr(ad, [
      "snapshot.images.0.original_image_url",
      "snapshot.images.0.resized_image_url",
      "image_url",
      "imageUrl",
      "snapshot_image",
      "thumbnail",
    ]);
    if (directImg) {
      imageUrl = directImg;
      mediaSource = "image";
    }

    const cardImg = !imageUrl
      ? pickStr(ad, [
          "snapshot.cards.0.original_image_url",
          "snapshot.cards.0.resized_image_url",
        ])
      : undefined;
    if (cardImg) {
      imageUrl = cardImg;
      mediaSource = "card-image";
    }

    const videoUrl = pickStr(ad, [
      "snapshot.videos.0.video_hd_url",
      "snapshot.videos.0.video_sd_url",
      "snapshot.cards.0.video_hd_url",
      "snapshot.cards.0.video_sd_url",
      "video_hd_url",
      "video_sd_url",
      "video_url",
      "videoUrl",
    ]);

    const videoThumbnail = pickStr(ad, [
      "snapshot.videos.0.video_preview_image_url",
      "snapshot.cards.0.video_preview_image_url",
    ]);

    if (!imageUrl && videoThumbnail) {
      imageUrl = videoThumbnail;
      mediaSource = "video-thumb";
    }

    if (!imageUrl) {
      const found = deepFind(ad, IMG_RE);
      if (found) {
        imageUrl = found;
        mediaSource = "deep-find";
      }
    }

    const finalVideo = videoUrl ?? deepFind(ad, VID_RE);

    const adLibraryId = pickStr(ad, [
      "ad_archive_id",
      "adArchiveId",
      "snapshot.ad_archive_id",
      "id",
      "adLibraryId",
    ]);
    const adUrl =
      adLibraryId
        ? `https://www.facebook.com/ads/library/?id=${adLibraryId}`
        : pickStr(ad, ["url", "adUrl", "snapshot_url"]);

    const platformsRaw =
      pickArr(ad, ["publisher_platform", "publisher_platforms", "platforms"]) ?? [];
    const platforms = platformsRaw
      .map((p) => (typeof p === "string" ? p : ""))
      .filter(Boolean);
    const platform = platforms[0] ?? "Facebook";

    const country =
      pickStr(ad, ["snapshot.country", "country", "countries.0"]) ?? ctx.country ?? "—";

    const startEpoch = getPath(ad, "start_date") ?? getPath(ad, "snapshot.creation_time");
    const startDate =
      typeof startEpoch === "number"
        ? new Date(startEpoch * 1000).toISOString()
        : typeof startEpoch === "string"
          ? startEpoch
          : undefined;

    out.push({
      advertiser,
      headline: headline.slice(0, 240),
      copy,
      cta,
      imageUrl,
      videoUrl: finalVideo,
      videoThumbnail,
      adLibraryId,
      adUrl,
      platform,
      platforms,
      country,
      niche: ctx.niche || "Geral",
      score: inferScore(copy, !!finalVideo, platforms),
      source: "collector",
      createdAt: new Date().toISOString(),
      startDate,
      mediaSource,
      raw: ad,
    });
  }

  const seen = new Set<string>();
  return out.filter((a) => {
    const key = a.adLibraryId || a.adUrl || `${a.advertiser}|${a.headline}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}