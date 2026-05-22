import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { pickStr, pickNum, extractHashtags } from "./helpers";
import { SkillResult, SkillOptions, withTimeout } from "./types";

// Actor: APIFY_YOUTUBE_ACTOR (configure in .env before use)
// Recommended: streamers~youtube-scraper
function getActor(): string {
  const id = process.env.APIFY_YOUTUBE_ACTOR?.trim();
  if (!id) throw new Error("APIFY_YOUTUBE_ACTOR não configurado no .env");
  return id;
}

// ── types ─────────────────────────────────────────────────────────────────────

export type YouTubeSearchType = "search" | "channel" | "url";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  videoUrl: string;
  description: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  duration: string;
  publishedAt: string | null;
  thumbnailUrl: string;
  viralScore: number;
}

export interface YouTubeRadarInput {
  query: string;
  searchType?: YouTubeSearchType;
  maxResults?: number;
  dateFilter?: "today" | "week" | "month" | "year";
}

// ── normalizer ────────────────────────────────────────────────────────────────

function normalize(item: Record<string, unknown>): YouTubeVideo {
  const videoId = pickStr(item, ["id", "videoId", "video_id"]) ?? "";
  const title = pickStr(item, ["title", "name"]) ?? "";
  const channelName =
    pickStr(item, ["channelName", "channel_name", "author", "authorText"]) ?? "";
  const channelId = pickStr(item, ["channelId", "channel_id", "authorId"]) ?? "";
  const videoUrl =
    pickStr(item, ["url", "video_url", "link"]) ??
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
  const description = pickStr(item, ["description", "text", "shortDescription"]) ?? "";
  const hashtags = extractHashtags(item);
  const views = pickNum(item, ["viewCount", "views", "view_count"]);
  const likes = pickNum(item, ["likeCount", "likes", "like_count"]);
  const comments = pickNum(item, ["commentCount", "comments", "comment_count"]);
  const duration = pickStr(item, ["duration", "lengthText"]) ?? "";
  const publishedAt =
    pickStr(item, ["publishedAt", "published_at", "date", "uploadDate"]) ?? null;
  const thumbnailUrl =
    pickStr(item, ["thumbnailUrl", "thumbnail", "thumbnail_url", "thumbnails.0.url"]) ?? "";

  const viralScore = Math.min(
    100,
    Math.round(
      (views > 0 ? Math.log10(views) * 8 : 0) +
        (likes > 0 ? Math.log10(likes) * 6 : 0) +
        (comments > 0 ? Math.log10(comments) * 6 : 0),
    ),
  );

  return {
    videoId,
    title,
    channelName,
    channelId,
    videoUrl,
    description,
    hashtags,
    views,
    likes,
    comments,
    duration,
    publishedAt,
    thumbnailUrl,
    viralScore,
  };
}

// ── skill entry point ─────────────────────────────────────────────────────────

export async function runYouTubeRadarSkill(
  input: YouTubeRadarInput,
  options: SkillOptions = {},
): Promise<SkillResult<YouTubeVideo>> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 130_000;

  let actor: string;
  try {
    actor = getActor();
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, skill: "youtube", data: [], error, duration_ms: 0 };
  }

  const dateFilterMap: Record<string, string> = {
    today: "today",
    week: "thisWeek",
    month: "thisMonth",
    year: "thisYear",
  };

  const payload: Record<string, unknown> = {
    searchKeywords: input.query,
    maxResults: input.maxResults ?? 30,
    ...(input.dateFilter && { dateFilter: dateFilterMap[input.dateFilter] ?? input.dateFilter }),
  };

  console.log("[youtube-radar] actor=", actor);
  console.log("[youtube-radar] payload=", JSON.stringify(payload));

  try {
    const raw = await withTimeout(
      runSyncGetDatasetItems<Record<string, unknown>>(actor, payload),
      timeoutMs,
      "youtube",
    );
    const data = raw.map(normalize).filter((v) => v.videoId);
    const duration_ms = Date.now() - start;

    console.log(`[youtube-radar] response items=${data.length} duration=${duration_ms}ms`);
    return { ok: true, skill: "youtube", data, duration_ms };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[youtube-radar] error=", error);
    return { ok: false, skill: "youtube", data: [], error, duration_ms: Date.now() - start };
  }
}
