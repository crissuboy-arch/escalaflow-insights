import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { pickStr, pickNum, extractHashtags, extractMentions } from "./helpers";
import { SkillResult, SkillOptions, withTimeout } from "./types";

// Actor: APIFY_INSTAGRAM_ACTOR=apify~instagram-scraper
function getActor(): string {
  return process.env.APIFY_INSTAGRAM_ACTOR?.trim() ?? "apify~instagram-scraper";
}

// ── types ─────────────────────────────────────────────────────────────────────

export type InstagramSearchType = "hashtag" | "user" | "url" | "place";
export type InstagramResultsType = "posts" | "reels";

export interface InstagramPost {
  shortCode: string;
  postUrl: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  commentsCount: number;
  likesCount: number;
  ownerUsername: string;
  ownerFullName: string;
  displayUrl: string;
  engagementScore: number;
}

export interface InstagramRadarInput {
  search: string;
  searchType?: InstagramSearchType;
  resultsType?: InstagramResultsType;
  resultsLimit?: number;
}

// ── normalizer ────────────────────────────────────────────────────────────────

function normalize(item: Record<string, unknown>): InstagramPost {
  const shortCode = pickStr(item, ["shortCode", "shortcode", "short_code"]) ?? "";
  const postUrl =
    pickStr(item, ["url", "link", "post_url", "permalink"]) ??
    (shortCode ? `https://www.instagram.com/p/${shortCode}/` : "");
  const caption = pickStr(item, ["caption", "text", "description"]) ?? "";
  const hashtags = extractHashtags(item);
  const mentions = extractMentions(item);
  const commentsCount = pickNum(item, ["commentsCount", "comments_count", "numberOfComments"]);
  const likesCount = pickNum(item, ["likesCount", "likes_count", "likes"]);
  const videoViewCount = pickNum(item, ["videoViewCount", "video_view_count", "videoPlayCount"]);
  const ownerUsername =
    pickStr(item, ["ownerUsername", "owner.username", "owner_username", "username"]) ?? "";
  const ownerFullName =
    pickStr(item, ["ownerFullName", "owner.fullName", "owner_full_name", "fullName"]) ?? "";
  const displayUrl =
    pickStr(item, ["displayUrl", "display_url", "imageUrl", "thumbnailUrl"]) ?? "";

  const engagementScore = Math.min(
    100,
    Math.round(
      (likesCount > 0 ? Math.log10(likesCount) * 12 : 0) +
        (commentsCount > 0 ? Math.log10(commentsCount) * 8 : 0) +
        (videoViewCount > 0 ? Math.log10(videoViewCount) * 5 : 0),
    ),
  );

  return {
    shortCode,
    postUrl,
    caption,
    hashtags,
    mentions,
    commentsCount,
    likesCount,
    ownerUsername,
    ownerFullName,
    displayUrl,
    engagementScore,
  };
}

// ── skill entry point ─────────────────────────────────────────────────────────

export async function runInstagramRadarSkill(
  input: InstagramRadarInput,
  options: SkillOptions = {},
): Promise<SkillResult<InstagramPost>> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 130_000;
  const actor = getActor();

  const searchType = input.searchType ?? "hashtag";
  const cleanSearch = input.search.replace(/^[#@]+/, "").trim();

  const payload: Record<string, unknown> =
    searchType === "url"
      ? {
          directUrls: [input.search.trim()],
          resultsType: input.resultsType ?? "posts",
          resultsLimit: input.resultsLimit ?? 50,
        }
      : {
          search: cleanSearch,
          searchType,
          searchLimit: 10,
          resultsType: input.resultsType ?? "posts",
          resultsLimit: input.resultsLimit ?? 50,
        };

  console.log("[skill:instagram] starting", { actor, search: cleanSearch, searchType });

  try {
    const raw = await withTimeout(
      runSyncGetDatasetItems<Record<string, unknown>>(actor, payload),
      timeoutMs,
      "instagram",
    );
    const data = raw.map(normalize).filter((p) => p.shortCode);
    const duration_ms = Date.now() - start;

    console.log(`[skill:instagram] done items=${data.length} duration=${duration_ms}ms`);
    return { ok: true, skill: "instagram", data, duration_ms };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[skill:instagram] error", error);
    return { ok: false, skill: "instagram", data: [], error, duration_ms: Date.now() - start };
  }
}
