// Domain types for the mining ingest pipeline.
// These types are stable and decoupled from any storage backend.

export type MiningPlatform =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "LinkedIn"
  | "Pinterest"
  | "Google"
  | "Other";

export type MiningStatus = "new" | "reviewed" | "archived";

export type MiningAnalysisType =
  | "manual"
  | "ai"
  | "scaled"
  | "validating"
  | "hot";

export interface MinedAd {
  id: string;
  headline: string;
  copy: string;
  platform: MiningPlatform | string;
  country: string;
  niche: string;
  score: number; // 0-100
  adUrl: string | null;
  analysisType: MiningAnalysisType | string;
  creativeUrl: string | null; // image / video thumbnail
  createdAt: string; // ISO timestamp
  receivedAt: string; // ISO timestamp on ingest
  source: "extension" | "manual";
  status: MiningStatus;
  favorite: boolean;
  // Extended capture fields
  advertiser?: string;
  cta?: string;
  description?: string;
  adLibraryId?: string;
  startDate?: string;
  creativeType?: string;
  platforms?: string[];
  tags?: string[];
  scaled?: boolean;
  raw?: Record<string, unknown>; // any extra fields the extension sent
}

// Payload accepted by the ingest endpoint / postMessage bridge.
// All fields are optional except headline (so the UI can show something).
export interface MiningIngestPayload {
  headline: string;
  copy?: string;
  platform?: string;
  country?: string;
  niche?: string;
  score?: number;
  adUrl?: string;
  analysisType?: string;
  creativeUrl?: string;
  createdAt?: string;
  advertiser?: string;
  cta?: string;
  description?: string;
  adLibraryId?: string;
  startDate?: string;
  creativeType?: string;
  platforms?: string[];
  tags?: string[];
  raw?: Record<string, unknown>;
}
