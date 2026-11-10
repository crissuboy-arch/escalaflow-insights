// Facebook Viral — minerador orgânico (páginas + Reels) via Apify.
// Distinto de src/lib/miners/meta.ts (esse é o miner da Biblioteca de Anúncios
// — não é tocado aqui). Dois actors, cada um cobrando por item entregue:
//
//   themineworks/facebook-pages-scraper  — US$0,0108/página + US$0,003/corrida
//   coregent/facebook-reels-scraper      — US$0,0015/Reel
//
// Preços conferidos manualmente na Apify Store em 2026-11-04 (ver o plano).
// estimateFacebookMiningCost() não faz nenhuma chamada de rede — existe para
// a UI mostrar o custo ANTES de qualquer confirmação. As duas funções que
// chamam a Apify de verdade (mineFacebookPage/mineFacebookReels) só devem ser
// invocadas depois de o utilizador confirmar explicitamente o gasto.
//
// Os nomes de campo do dataset de saída foram montados a partir do schema
// publicado (nunca foi feita uma chamada real — gastaria créditos sem
// autorização). Cada campo tem fallbacks por nomes alternativos comuns; a
// primeira corrida real autorizada deve confirmar/ajustar isto.
import { runSyncGetDatasetItems } from "../integrations/apify/client";
import { APIFY_ACTORS } from "@/config/apify-actors";

const PAGE_COST_PER_ITEM_USD = 0.0108;
const PAGE_RUN_START_COST_USD = 0.003;
const REEL_COST_PER_ITEM_USD = 0.0015;

export interface MiningCostEstimate {
  pageCostUSD: number;
  reelsCostUSD: number;
  totalUSD: number;
  breakdown: string;
}

/** Pure cost calculator — no network call, safe to run as often as the UI
 *  needs while the user is still choosing period/limit. */
export function estimateFacebookMiningCost(opts: { limit: number }): MiningCostEstimate {
  const limit = Math.max(0, Math.floor(opts.limit));
  const pageCostUSD = PAGE_RUN_START_COST_USD + PAGE_COST_PER_ITEM_USD;
  const reelsCostUSD = limit * REEL_COST_PER_ITEM_USD;
  const totalUSD = pageCostUSD + reelsCostUSD;
  return {
    pageCostUSD,
    reelsCostUSD,
    totalUSD,
    breakdown: `1 página (US$${pageCostUSD.toFixed(4)}) + até ${limit} Reels (US$${reelsCostUSD.toFixed(4)}) ≈ US$${totalUSD.toFixed(4)}`,
  };
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

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
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

export interface MinedPage {
  verifiedName: string | undefined;
  followers: number | undefined;
  category: string | undefined;
  aboutText: string | undefined;
}

/** Confirms a page's real identity/name before (or instead of) trusting a
 *  manually-typed URL — the only identity-verification path this module
 *  offers (see plan: no second, non-Apify scraping path). */
export async function mineFacebookPage(pageUrl: string): Promise<MinedPage | null> {
  const actorId = APIFY_ACTORS.facebookPagesViral();
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(actorId, {
    startUrls: [{ url: pageUrl }],
  });
  const item = raw[0];
  if (!item) return null;
  return {
    verifiedName: pickStr(item, ["page_name", "pageName", "name", "title"]),
    followers: pickNum(item, ["followers", "followers_count", "followersCount", "likes"]),
    category: pickStr(item, ["category", "page_category"]),
    aboutText: pickStr(item, ["about_text", "aboutText", "about"]),
  };
}

export interface MinedReel {
  reelUrl: string;
  caption: string | undefined;
  commentsCount: number | undefined;
  sharesCount: number | undefined;
  views: number | undefined;
  publishedAt: string | undefined;
  durationSeconds: number | undefined;
  thumbnailUrl: string | undefined;
}

/** Mines up to `limit` Reels newer than `periodDays`, newest first. Never
 *  downloads the third-party video itself — only the reference URL and the
 *  metadata the actor returns, consistent with "no unauthorized download of
 *  third-party video" (see src/lib/facebook-viral/video-upload.ts, which
 *  handles only the user's OWN upload). */
export async function mineFacebookReels(
  pageUrl: string,
  opts: { periodDays: 7 | 30 | 90; limit: 10 | 20 | 30 },
): Promise<MinedReel[]> {
  const actorId = APIFY_ACTORS.facebookReelsViral();
  const raw = await runSyncGetDatasetItems<Record<string, unknown>>(actorId, {
    startUrls: [{ url: pageUrl }],
    resultsLimit: opts.limit,
    reelsNewerThan: `${opts.periodDays} days`,
    includeVideoUrls: false, // é temporário e aponta pro CDN do Facebook — nunca persistido
    includeAudio: false,
    includeSubtitles: false,
  });

  return raw
    .map((item) => {
      const reelUrl = pickStr(item, ["url", "reel_url", "reelUrl", "postUrl"]);
      if (!reelUrl) return null;
      return {
        reelUrl,
        caption: pickStr(item, ["caption", "text", "description"]),
        commentsCount: pickNum(item, ["comments_count", "commentsCount", "comment_count"]),
        sharesCount: pickNum(item, ["shares_count", "sharesCount", "share_count"]),
        views: pickNum(item, ["views", "view_count", "viewCount", "play_count", "playCount"]),
        publishedAt: pickStr(item, ["published_at", "date_posted", "timestamp", "date"]),
        durationSeconds: pickNum(item, ["duration", "video_duration", "durationSeconds"]),
        thumbnailUrl: pickStr(item, [
          "thumbnail",
          "thumbnail_url",
          "thumbnailUrl",
          "video_preview_image_url",
        ]),
      } satisfies MinedReel;
    })
    .filter((r): r is MinedReel => r !== null);
}
