
CREATE TABLE IF NOT EXISTS public.collected_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_library_id TEXT UNIQUE,
  ad_url TEXT,
  advertiser TEXT NOT NULL DEFAULT 'Anunciante',
  headline TEXT NOT NULL DEFAULT '',
  copy TEXT,
  cta TEXT,
  image_url TEXT,
  video_url TEXT,
  creative_type TEXT,
  platform TEXT NOT NULL DEFAULT 'Facebook',
  country TEXT NOT NULL DEFAULT '—',
  niche TEXT NOT NULL DEFAULT 'Geral',
  keyword TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  favorite BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'collector',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collected_ads_created_at_idx ON public.collected_ads (created_at DESC);
CREATE INDEX IF NOT EXISTS collected_ads_keyword_idx ON public.collected_ads (keyword);

ALTER TABLE public.collected_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read collected_ads"
ON public.collected_ads FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER set_collected_ads_updated_at
BEFORE UPDATE ON public.collected_ads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
