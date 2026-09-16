-- Ad intelligence + longevity tracking for collected_ads.
-- Adds: first_seen_at/last_seen_at (longevity across re-collections),
-- start_date (platform-provided, distinct from first_seen_at which is OUR
-- own discovery date), offer network detection, landing page URL, and
-- transcript/translation columns (schema-only for now — no transcription
-- service is wired yet; see project notes).

ALTER TABLE public.collected_ads
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
  ADD COLUMN IF NOT EXISTS offer_network TEXT,
  ADD COLUMN IF NOT EXISTS offer_network_confidence TEXT,
  ADD COLUMN IF NOT EXISTS transcript_original TEXT,
  ADD COLUMN IF NOT EXISTS transcript_language TEXT,
  ADD COLUMN IF NOT EXISTS transcript_translated_pt TEXT;

-- Backfill existing rows so longevity tracking has a sane starting point
-- instead of NULL (uses each row's own created_at — no data is invented).
UPDATE public.collected_ads
SET first_seen_at = created_at
WHERE first_seen_at IS NULL;

UPDATE public.collected_ads
SET last_seen_at = created_at
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collected_ads_offer_network ON public.collected_ads (offer_network);
CREATE INDEX IF NOT EXISTS idx_collected_ads_last_seen ON public.collected_ads (last_seen_at DESC);
