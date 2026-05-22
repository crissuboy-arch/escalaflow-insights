import { runSyncGetDatasetItems } from "@/lib/integrations/apify/client";
import { pickStr, pickNum, extractHashtags } from "./helpers";
import { SkillResult, SkillOptions, withTimeout } from "./types";

// Actor: APIFY_TIKTOK_ACTOR=clockworks~tiktok-scraper
function getActor(): string {
  return process.env.APIFY_TIKTOK_ACTOR?.trim() ?? "clockworks~tiktok-scraper";
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface TikTokPost {
  videoId: string;
  creator: string;
  videoUrl: string;
  description: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  audioTitle: string;
  viralScore: number;
  createTime: string | null;
}

export interface TikTokRadarInput {
  hashtags: string[];
  resultsPerPage?: number;
  proxyCountryCode?: string;
}

// ── normalizer ────────────────────────────────────────────────────────────────

function normalize(item: Record<string, unknown>): TikTokPost {
  const videoId = pickStr(item, ["id", "video_id", "videoId"]) ?? "";
  const creator =
    pickStr(item, ["authorMeta.name", "author.uniqueId", "author", "creator"]) ?? "Desconhecido";
  const videoUrl =
    pickStr(item, ["webVideoUrl", "video_url", "downloadUrl", "videoUrl", "shareUrl"]) ?? "";
  const description = pickStr(item, ["text", "description", "desc", "caption"]) ?? "";
  const hashtags = extractHashtags(item);
  const views = pickNum(item, ["playCount", "stats.playCount", "views"]);
  const likes = pickNum(item, ["diggCount", "stats.diggCount", "likes"]);
  const comments = pickNum(item, ["commentCount", "stats.commentCount", "comments"]);
  const shares = pickNum(item, ["shareCount", "stats.shareCount", "shares"]);
  const audioTitle = pickStr(item, ["musicMeta.musicName", "music", "audioTitle"]) ?? "";
  const createTime =
    pickStr(item, ["createTimeISO", "createTime", "created_at", "timestamp"]) ?? null;

  const viralScore = Math.min(
    100,
    Math.round(
      (views > 0 ? Math.log10(views) * 10 : 0) +
        (likes > 0 ? Math.log10(likes) * 5 : 0) +
        (shares > 0 ? Math.log10(shares) * 5 : 0),
    ),
  );

  return {
    videoId,
    creator,
    videoUrl,
    description,
    hashtags,
    views,
    likes,
    comments,
    shares,
    audioTitle,
    viralScore,
    createTime,
  };
}

// ── skill entry point ─────────────────────────────────────────────────────────

export async function runTikTokRadarSkill(
  input: TikTokRadarInput,
  options: SkillOptions = {},
): Promise<SkillResult<TikTokPost>> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 130_000;
  const actor = getActor();

  const payload = {
    hashtags: input.hashtags,
    resultsPerPage: input.resultsPerPage ?? 20,
    proxyCountryCode: input.proxyCountryCode ?? "None",
    excludePinnedPosts: false,
    scrapeRelatedVideos: false,
  };

  console.log("[skill:tiktok] starting", { actor, hashtags: input.hashtags });

  try {
    const raw = await withTimeout(
      runSyncGetDatasetItems<Record<string, unknown>>(actor, payload),
      timeoutMs,
      "tiktok",
    );
    const data = raw.map(normalize).filter((p) => p.videoId);
    const duration_ms = Date.now() - start;

    console.log(`[skill:tiktok] done items=${data.length} duration=${duration_ms}ms`);
    return { ok: true, skill: "tiktok", data, duration_ms };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[skill:tiktok] error", error);
    return { ok: false, skill: "tiktok", data: [], error, duration_ms: Date.now() - start };
  }
}
