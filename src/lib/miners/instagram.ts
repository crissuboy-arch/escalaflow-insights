import { runSyncGetDatasetItems } from "../integrations/apify/client";

export interface InstagramResult {
  postId: string;
  creator: string;
  caption: string;
  hashtags: string[];
  engagement: { likes: number; comments: number };
  followers: number;
  reelsUrl: string;
  isViral: boolean;
  imageUrl?: string;
  videoUrl?: string;
  takenAt?: string;
}

const ACTOR_ID = "apify/instagram-scraper";

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

export async function mineInstagram(username: string): Promise<InstagramResult[]> {
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(ACTOR_ID, {
    usernames: [username],
    resultsLimit: 10,
  });

  const results: InstagramResult[] = [];

  for (const item of raw) {
    const postId = pickStr(item, ["id", "post_id", "shortCode", "code", "pk"]) ?? "";
    const creator = pickStr(item, ["owner", "username", "owner.username", "user.username"]) ?? username;
    const caption = pickStr(item, ["caption", "text", "edge_media_to_caption.edges.0.node.text", "description"]) ?? "";
    const hashtagsRaw = getPath(item, "hashtags") ?? [];
    const hashtags = Array.isArray(hashtagsRaw)
      ? hashtagsRaw.map((h: any) => typeof h === "string" ? h : h?.name ?? String(h)).filter(Boolean)
      : caption.match(/#\w+/g)?.map((t: string) => t.slice(1)) ?? [];
    const likes = pickNum(item, ["likeCount", "likes", "edge_media_preview_like.count", "like_count"]) ?? 0;
    const comments = pickNum(item, ["commentsCount", "comments", "edge_media_to_comment.count", "comment_count"]) ?? 0;
    const followers = pickNum(item, ["owner.followers", "followersCount", "follower_count", "followers"]) ?? 0;
    const imageUrl = pickStr(item, ["displayUrl", "imageUrl", "image_url", "thumbnail_src", "display_url"]);
    const videoUrl = pickStr(item, ["videoUrl", "video_url", "videoUrl"]);
    const takenAt = pickStr(item, ["takenAtTimestamp", "taken_at", "created_at", "timestamp"]);
    const reelsUrl = videoUrl ?? imageUrl ?? "";
    const isViral = likes > 10000 || (followers > 0 && likes / followers > 0.05);

    results.push({
      postId,
      creator,
      caption,
      hashtags,
      engagement: { likes, comments },
      followers,
      reelsUrl,
      isViral,
      imageUrl,
      videoUrl,
      takenAt,
    });
  }

  return results;
}
