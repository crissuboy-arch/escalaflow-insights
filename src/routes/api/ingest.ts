// Public ingest endpoint for the Chrome extension (and any future collector).
// Persists directly into collected_ads — the SAME central table used by the
// server-side Playwright/Apify collector (Minerar com Motor de Coleta) — so
// there is exactly one "Central de Ofertas", regardless of where an ad was
// captured from (extension, TikTok/Instagram/Facebook collectors, etc).
// Longevity tracking, offer-network detection and the dedup rules all live
// in the shared upsertCollectedAd() (src/lib/collector/persist.ts).

import { createFileRoute } from "@tanstack/react-router";
import { upsertCollectedAd } from "@/lib/collector/persist";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

interface IngestItem {
  headline?: string;
  copy?: string;
  description?: string;
  platform?: string;
  country?: string;
  niche?: string;
  score?: number;
  adUrl?: string;
  landingPageUrl?: string;
  advertiser?: string;
  cta?: string;
  adLibraryId?: string;
  startDate?: string;
  creativeType?: string;
  imageUrl?: string;
  videoUrl?: string;
  creativeUrl?: string;
  createdAt?: string;
  tags?: string[];
  raw?: Record<string, unknown>;
  favorite?: boolean;
  analysisType?: string;
}

function pickMedia(item: IngestItem): { image_url: string | null; video_url: string | null } {
  const image_url = item.imageUrl || (item.creativeType !== "video" ? item.creativeUrl : undefined) || null;
  const video_url = item.videoUrl || (item.creativeType === "video" ? item.creativeUrl : undefined) || null;
  return { image_url, video_url };
}

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: unknown = null;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400, headers: cors });
        }
        const items = (Array.isArray(body) ? body : [body]) as IngestItem[];
        if (!items.length || !items.every((i) => i && typeof i === "object")) {
          return Response.json({ ok: false, error: "Payload vazio ou inválido" }, { status: 400, headers: cors });
        }

        let inserted = 0;
        let updated = 0;
        const errors: string[] = [];
        for (const item of items) {
          const { image_url, video_url } = pickMedia(item);
          const r = await upsertCollectedAd({
            advertiser: item.advertiser,
            headline: item.headline || item.advertiser,
            copy: item.copy || item.description,
            cta: item.cta,
            imageUrl: image_url,
            videoUrl: video_url,
            creativeType: item.creativeType,
            platform: item.platform,
            country: item.country,
            niche: item.niche,
            score: item.score,
            adUrl: item.adUrl,
            adLibraryId: item.adLibraryId,
            landingPageUrl: item.landingPageUrl,
            startDate: item.startDate,
            source: "extension",
            favorite: item.favorite,
            raw: { tags: item.tags ?? [], analysisType: item.analysisType ?? null },
          });
          if (r.error) errors.push(r.error);
          if (r.inserted) inserted++;
          if (r.updated) updated++;
        }

        return Response.json(
          { ok: errors.length < items.length, inserted, updated, received: items.length, errors: errors.slice(0, 5) },
          { status: 200, headers: cors },
        );
      },
    },
  },
});
