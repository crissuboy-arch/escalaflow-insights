import { runSyncGetDatasetItems } from "../integrations/apify/client";

export interface TikTokResult {
  videoId: string;
  creator: string;
  videoUrl: string;
  hook: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  audioTitle: string;
  viralScore: number;
  description?: string;
  createTime?: string;
}

const ACTOR_ID = "clockworks/tiktok-scraper";

function pickStr(obj: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, paths: string[]): number | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
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

export async function mineTikTok(query: string): Promise<TikTokResult[]> {
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(ACTOR_ID, {
    search: query,
    resultsLimit: 20,
  });

  const results: TikTokResult[] = [];

  for (const item of raw) {
    const videoId = pickStr(item, ["id", "video_id", "videoId"]) ?? "";
    const creator = pickStr(item, ["author", "authorMeta.name", "author_name", "creator"]) ?? "Desconhecido";
    const videoUrl = pickStr(item, ["video_url", "webVideoUrl", "downloadUrl", "videoUrl"]) ?? "";
    const description = pickStr(item, ["text", "description", "desc", "caption"]) ?? "";
    const hook = description.slice(0, 120);
    const hashtagsRaw = getPath(item, "hashtags") ?? getPath(item, "hashtag") ?? [];
    const hashtags = Array.isArray(hashtagsRaw)
      ? hashtagsRaw.map((h: any) => typeof h === "string" ? h : h?.name ?? h?.tag ?? String(h)).filter(Boolean)
      : [];
    const views = pickNum(item, ["playCount", "stats.playCount", "views", "play_count"]) ?? 0;
    const likes = pickNum(item, ["diggCount", "stats.diggCount", "likes", "like_count"]) ?? 0;
    const comments = pickNum(item, ["commentCount", "stats.commentCount", "comments", "comment_count"]) ?? 0;
    const shares = pickNum(item, ["shareCount", "stats.shareCount", "shares", "share_count"]) ?? 0;
    const audioTitle = pickStr(item, ["musicMeta.musicName", "music", "audioTitle", "sound_name"]) ?? "";
    const createTime = pickStr(item, ["createTime", "created_at", "timestamp"]);
    const viralScore = Math.min(100, Math.round(
      (views > 0 ? Math.log10(views) * 10 : 0) +
      (likes > 0 ? Math.log10(likes) * 5 : 0) +
      (shares > 0 ? Math.log10(shares) * 5 : 0)
    ));

    results.push({
      videoId,
      creator,
      videoUrl,
      hook,
      hashtags,
      views,
      likes,
      comments,
      shares,
      audioTitle,
      viralScore,
      description,
      createTime,
    });
  }

  return results;
}
