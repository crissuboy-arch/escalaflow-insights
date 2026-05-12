// Public-facing types for the external collection engine ("Motor de Coleta").
// The provider name (Apify) is intentionally NOT exposed in any identifier
// or message that could leak into the UI.

export interface CollectorRunInput {
  keyword: string;
  country?: string;
  niche?: string;
  limit?: number;
}

export interface CollectorAd {
  advertiser: string;
  headline: string;
  copy: string;
  cta?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  adLibraryId?: string;
  adUrl?: string;
  platform: string;
  platforms?: string[];
  country: string;
  niche: string;
  score: number;
  source: "collector";
  createdAt: string;
  startDate?: string;
  mediaSource?: "image" | "video-thumb" | "card-image" | "deep-find" | "none";
  // Enrichment
  tags?: string[];
  subniche?: string;
  promise?: string;
  mechanism?: string;
  emotion?: string;
  scaleLevel?: "cold" | "warming" | "hot" | "scaled";
  raw?: unknown;
}

export interface CollectorRunResult {
  ok: boolean;
  count: number;
  ads: CollectorAd[];
  error?: string;
}

export interface CollectorProvider {
  run(input: CollectorRunInput): Promise<unknown[]>;
}