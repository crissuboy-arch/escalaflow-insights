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
  adLibraryId?: string;
  adUrl?: string;
  platform: string;
  country: string;
  niche: string;
  score: number;
  source: "collector";
  createdAt: string;
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