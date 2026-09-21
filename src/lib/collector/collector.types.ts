// Public-facing types for the external collection engine ("Motor de Coleta").
// The provider name (Apify) is intentionally NOT exposed in any identifier
// or message that could leak into the UI.

export interface CollectorRunInput {
  keyword: string;
  country?: string;
  niche?: string;
  limit?: number;
  /** When "Facebook", query the real Facebook Ad Library (Apify) directly
   *  instead of the Bing/Yahoo commercial-page search used by default. */
  platform?: string;
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
  // Offer classification + provenance
  offerType?: "anuncio" | "pagina-venda" | "vsl" | "checkout" | "ecommerce" | "conteudo";
  sourceEngine?: string;
  landingPageUrl?: string;
  offerNetwork?: string;
  offerNetworkConfidence?: string | null;
  mediaStatus?: "found" | "not-found";
  // Pattern detection (filled by post-pass)
  isVsl?: boolean;
  vslScaling?: boolean;
  hookRepeated?: boolean;
  viralStructure?: boolean;
  copyPattern?: boolean;
  hookText?: string;
  raw?: unknown;
}

export interface CollectorRunResult {
  ok: boolean;
  count: number;
  ads: CollectorAd[];
  error?: string;
  /** How many of `ads` were actually persisted to collected_ads. When this
   *  is lower than ads.length, some results shown in the UI will NOT
   *  survive a reload — the caller must warn the user instead of silently
   *  treating every returned ad as saved. */
  saved?: number;
  persistFailed?: number;
  persistError?: string;
}

export interface CollectorProvider {
  run(input: CollectorRunInput): Promise<unknown[]>;
}