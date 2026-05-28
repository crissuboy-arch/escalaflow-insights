import { runSyncGetDatasetItems } from "../integrations/apify/client";
import { APIFY_ACTORS } from "@/config/apify-actors";

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

function getActorId() { return APIFY_ACTORS.tiktok(); }

function pickStr(obj: Record<string, unknown>, paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNum(obj: Record<string, unknown>, paths: string[]): number {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (typeof v === "number") return v;
    if (typeof v === "string") { const n = Number(v); if (!isNaN(n)) return n; }
  }
  return 0;
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

function extractHashtags(obj: Record<string, unknown>): string[] {
  const raw = getPath(obj, "hashtags") ?? [];
  if (Array.isArray(raw)) {
    return raw.map((h: any) => typeof h === "string" ? h : h?.name ?? String(h)).filter(Boolean);
  }
  return [];
}

export async function mineTikTok(query: string): Promise<TikTokResult[]> {
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(getActorId(), {
    searchQueries: [query],
    resultsLimit: 20,
  });

  return raw.map((item) => {
    const videoId = pickStr(item, ["id", "video_id", "videoId"]) ?? "";
    const creator = pickStr(item, ["authorMeta.name", "author", "author_name", "creator"]) ?? "Desconhecido";
    const videoUrl = pickStr(item, ["webVideoUrl", "video_url", "downloadUrl", "videoUrl"]) ?? "";
    const description = pickStr(item, ["text", "description", "desc", "caption"]) ?? "";
    const hook = description.slice(0, 120);
    const hashtags = extractHashtags(item);
    const views = pickNum(item, ["playCount", "stats.playCount", "views", "play_count"]);
    const likes = pickNum(item, ["diggCount", "stats.diggCount", "likes", "like_count"]);
    const comments = pickNum(item, ["commentCount", "stats.commentCount", "comments", "comment_count"]);
    const shares = pickNum(item, ["shareCount", "stats.shareCount", "shares", "share_count"]);
    const audioTitle = pickStr(item, ["musicMeta.musicName", "music", "audioTitle", "sound_name"]) ?? "";
    const createTime = pickStr(item, ["createTimeISO", "createTime", "created_at", "timestamp"]);

    const viralScore = Math.min(100, Math.round(
      (views > 0 ? Math.log10(views) * 10 : 0) +
      (likes > 0 ? Math.log10(likes) * 5 : 0) +
      (shares > 0 ? Math.log10(shares) * 5 : 0)
    ));

    return { videoId, creator, videoUrl, hook, hashtags, views, likes, comments, shares, audioTitle, viralScore, description, createTime };
  });
}
