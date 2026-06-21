import type { CollectorAd } from "./collector.types";
import { inferTagsFromText, scaleLevelFromScore, KEYWORD_CATEGORIES } from "../mining/keywords";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

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

const STRONG_CTAS = new Set([
  "shop_now", "sign_up", "learn_more", "subscribe", "get_offer",
  "buy_now", "comprar", "assinar", "saiba mais", "compre agora",
]);

function inferScore(args: {
  copy: string;
  headline: string;
  hasVideo: boolean;
  platforms?: string[];
  cta?: string;
  startDate?: string;
  emotion?: string;
}): number {
  let s = 50;
  if (args.copy.length > 200) s += 8;
  if (args.copy.length > 500) s += 8;
  if (args.platforms && args.platforms.length >= 3) s += 10;
  if (args.hasVideo) s += 8;
  if (args.cta && STRONG_CTAS.has(args.cta.toLowerCase())) s += 5;
  if (args.startDate) {
    const days = (Date.now() - new Date(args.startDate).getTime()) / 86_400_000;
    if (days >= 7) s += 4;
    if (days >= 21) s += 6;
    if (days >= 60) s += 6;
  }
  if (args.emotion) s += 4;
  return Math.min(99, Math.max(0, Math.round(s)));
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

    // Pre-normalized items from Playwright provider — pass through directly
    if (ad.source === "collector" && ad.headline && ad.adUrl) {
      out.push(item as CollectorAd);
      continue;
    }

    const advertiser =
      pickStr(ad, [
        "snapshot.page_name",
        "page_name",
        "advertiser_name",
        "advertiser",
        "pageName",
      ]) ?? "Anunciante";

    const copyRaw = pickStr(ad, [
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
      "ad_text",
      "body",
      "copy",
      "text",
      "description",
      "message",
      "caption",
      "body_text",
      "ad_body",
    ]) ?? "";
    const copy = copyRaw.includes("<") ? stripHtml(copyRaw) : copyRaw;

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
      "snapshot.images.0.uri",
      "snapshot.images.0.resized_image_uri",
      "image_url",
      "imageUrl",
      "imageUri",
      "image_uri",
      "snapshot_image",
      "thumbnail",
      "thumbnailUrl",
      "thumbnail_url",
      "snapshotUrl",
      "snapshot_url",
      "creativeUrl",
      "creative_url",
      "resizedImageUri",
      "resized_image_uri",
      "poster",
      "cover",
      "background_image",
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
      "snapshot.videos.0.video_hd_uri",
      "snapshot.videos.0.video_sd_uri",
      "snapshot.cards.0.video_hd_url",
      "snapshot.cards.0.video_sd_url",
      "snapshot.cards.0.video_hd_uri",
      "snapshot.cards.0.video_sd_uri",
      "video_hd_url",
      "video_sd_url",
      "video_url",
      "videoUrl",
      "videoUri",
      "video_uri",
      "video_hd_uri",
      "video_sd_uri",
    ]);

    const videoThumbnail = pickStr(ad, [
      "snapshot.videos.0.video_preview_image_url",
      "snapshot.videos.0.video_preview_image_uri",
      "snapshot.cards.0.video_preview_image_url",
      "snapshot.cards.0.video_preview_image_uri",
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

    const enrichText = `${headline}\n${copy}`;
    const inferred = inferTagsFromText(enrichText);
    const subniche = inferred.categories[0]
      ? KEYWORD_CATEGORIES[inferred.categories[0]].label
      : undefined;
    const score = inferScore({
      copy,
      headline,
      hasVideo: !!finalVideo,
      platforms,
      cta,
      startDate,
      emotion: inferred.emotion,
    });

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
      niche: ctx.niche || subniche || "Geral",
      score,
      source: "collector",
      createdAt: new Date().toISOString(),
      startDate,
      mediaSource,
      tags: inferred.tags,
      subniche,
      promise: inferred.promise,
      mechanism: inferred.mechanism,
      emotion: inferred.emotion,
      scaleLevel: scaleLevelFromScore(score),
      raw: ad,
    });
  }

  const seen = new Set<string>();
  const deduped = out.filter((a) => {
    const key =
      a.adLibraryId ||
      a.adUrl ||
      `${a.advertiser}|${a.headline}|${a.imageUrl ?? a.videoUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ---------- Pattern detection (VSL, hook repetido, padrão viral) ----------
  const hookCounts = new Map<string, number>();
  const headlineCounts = new Map<string, number>();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  for (const a of deduped) {
    const hook = norm((a.copy || a.headline).slice(0, 80));
    if (hook) hookCounts.set(hook, (hookCounts.get(hook) ?? 0) + 1);
    const h = norm(a.headline);
    if (h) headlineCounts.set(h, (headlineCounts.get(h) ?? 0) + 1);
  }
  for (const a of deduped) {
    const txt = `${a.headline}\n${a.copy}`.toLowerCase();
    const isVideo = !!a.videoUrl;
    const longCopy = (a.copy || "").length > 600;
    const vslWords = /\bvsl\b|vídeo de vendas|carta em vídeo|assista at[eé] o final|aperte o play/i.test(txt);
    a.isVsl = isVideo && (vslWords || longCopy);
    a.vslScaling = !!a.isVsl && (a.score ?? 0) >= 75;
    const hook = norm((a.copy || a.headline).slice(0, 80));
    const hookReps = hookCounts.get(hook) ?? 0;
    a.hookText = hook || undefined;
    a.hookRepeated = hookReps >= 2;
    const headlineReps = headlineCounts.get(norm(a.headline)) ?? 0;
    a.copyPattern = headlineReps >= 2;
    a.viralStructure =
      /(antes\s*x\s*depois|antes e depois|prova social|depoimento|comprovado|método\s+\d|passo\s+1)/i.test(txt) &&
      (a.score ?? 0) >= 70;
    const tags = a.tags ? [...a.tags] : [];
    if (a.isVsl) tags.push("VSL");
    if (a.vslScaling) tags.push("VSL escalando");
    if (a.hookRepeated) tags.push("Hook repetido");
    if (a.copyPattern) tags.push("Padrão de copy");
    if (a.viralStructure) tags.push("Estrutura viral");
    a.tags = Array.from(new Set(tags));
  }

  // ── Diagnóstico pós-normalização ────────────────────────────────────────────
  const withMedia = deduped.filter((a) => a.imageUrl || a.videoUrl).length;
  const withCopy  = deduped.filter((a) => (a.copy?.length ?? 0) > 0).length;
  const bySource  = {
    image:     deduped.filter((a) => a.mediaSource === "image").length,
    cardImage: deduped.filter((a) => a.mediaSource === "card-image").length,
    videoThumb:deduped.filter((a) => a.mediaSource === "video-thumb").length,
    deepFind:  deduped.filter((a) => a.mediaSource === "deep-find").length,
    none:      deduped.filter((a) => a.mediaSource === "none").length,
  };

  // eslint-disable-next-line no-console
  console.log(
    `[normalizer] raw=${raw.length} | dedup=${deduped.length}` +
    ` | mídia=${withMedia} (img:${bySource.image} card:${bySource.cardImage} thumb:${bySource.videoThumb} deepFind:${bySource.deepFind} ❌sem:${bySource.none})` +
    ` | copy=${withCopy} ❌sem:${deduped.length - withCopy}`
  );

  if (bySource.none > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[normalizer] ⚠️ REAL: ${bySource.none} ad(s) sem mídia capturada — os campos tentados não existem neste item do Apify. Verifique snapshot no log de amostra acima.`
    );
  }
  if (deduped.length - withCopy > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[normalizer] ⚠️ REAL: ${deduped.length - withCopy} ad(s) sem copy capturada — verifique snapshot.body.text ou outros campos no log de amostra.`
    );
  }

  return deduped;
}