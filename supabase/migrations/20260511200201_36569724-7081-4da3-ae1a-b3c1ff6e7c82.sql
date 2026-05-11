
DO $$ BEGIN
  CREATE TYPE public.ad_action AS ENUM ('saved','favorite','scaled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_ad_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL REFERENCES public.collected_ads(id) ON DELETE CASCADE,
  action public.ad_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ad_id, action)
);

CREATE INDEX IF NOT EXISTS idx_user_ad_actions_user_action
  ON public.user_ad_actions (user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_ad_actions_ad
  ON public.user_ad_actions (ad_id);

ALTER TABLE public.user_ad_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_ad_actions select own"
  ON public.user_ad_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_ad_actions insert own"
  ON public.user_ad_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_ad_actions delete own"
  ON public.user_ad_actions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_ad_actions;
ALTER TABLE public.user_ad_actions REPLICA IDENTITY FULL;

ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'kdp';
