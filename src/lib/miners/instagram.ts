import { runSyncGetDatasetItems } from "../integrations/apify/client";
import { APIFY_ACTORS } from "@/config/apify-actors";

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

function getActorId() { return APIFY_ACTORS.instagram(); }

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

function extractHashtags(item: Record<string, unknown>, caption: string): string[] {
  const raw = getPath(item, "hashtags") ?? [];
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((h: any) => typeof h === "string" ? h : h?.name ?? String(h)).filter(Boolean);
  }
  return caption.match(/#\w+/g)?.map((t: string) => t.slice(1)) ?? [];
}

export async function mineInstagram(username: string): Promise<InstagramResult[]> {
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(getActorId(), {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsLimit: 10,
  });

  return raw.map((item) => {
    const postId = pickStr(item, ["id", "shortCode", "code", "post_id", "pk"]) ?? "";
    const creator = pickStr(item, ["ownerUsername", "owner.username", "username", "owner"]) ?? username;
    const caption = pickStr(item, ["caption", "text", "edge_media_to_caption.edges.0.node.text", "description"]) ?? "";
    const hashtags = extractHashtags(item, caption);
    const likes = pickNum(item, ["likeCount", "likesCount", "likes", "edge_media_preview_like.count", "like_count"]);
    const comments = pickNum(item, ["commentsCount", "comments", "commentCount", "edge_media_to_comment.count", "comment_count"]);
    const followers = pickNum(item, ["owner.followers", "followersCount", "follower_count"]);
    const imageUrl = pickStr(item, ["displayUrl", "display_url", "imageUrl", "image_url", "thumbnail_src"]);
    const videoUrl = pickStr(item, ["videoUrl", "video_url"]);
    const takenAt = pickStr(item, ["timestamp", "takenAtTimestamp", "taken_at", "created_at"]);
    const reelsUrl = videoUrl ?? imageUrl ?? "";
    const isViral = likes > 10000 || (followers > 0 && likes / followers > 0.05);

    return { postId, creator, caption, hashtags, engagement: { likes, comments }, followers, reelsUrl, isViral, imageUrl, videoUrl, takenAt };
  });
}
