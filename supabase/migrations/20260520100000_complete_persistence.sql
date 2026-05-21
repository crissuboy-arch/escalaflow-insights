-- Fase de Persistência Completa - EscalaFlow 100% funcional
-- Cria todas as tabelas faltantes, índices, RLS, realtime, policies

-- ============================================================================
-- 1. MINING_RUNS - Rastreia execuções de mineração
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mining_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'meta', 'tiktok', 'instagram', 'trends'
  query TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  language TEXT NOT NULL DEFAULT 'pt',
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  results_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mining_runs_user ON public.mining_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mining_runs_type ON public.mining_runs(type, status);

ALTER TABLE public.mining_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mining_runs select own" ON public.mining_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mining_runs insert own" ON public.mining_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mining_runs update own" ON public.mining_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mining_runs admins all" ON public.mining_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2. EXTENSION_LOGS - Logs da extensão Chrome
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.extension_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'ingest', 'error', 'sync', 'heartbeat'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'extension',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_logs_user ON public.extension_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_logs_type ON public.extension_logs(event_type, created_at DESC);

ALTER TABLE public.extension_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extension_logs select own" ON public.extension_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "extension_logs insert own" ON public.extension_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "extension_logs admins all" ON public.extension_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3. SAVED_ADS - Ads salvos pelo usuário (persistência direta)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.collected_ads(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  UNIQUE(user_id, ad_id),
  UNIQUE(user_id, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_ads_user ON public.saved_ads(user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_ads_mining ON public.saved_ads(mining_run_id);

ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_ads select own" ON public.saved_ads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_ads insert own" ON public.saved_ads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_ads update own" ON public.saved_ads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_ads delete own" ON public.saved_ads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_ads admins all" ON public.saved_ads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4. FAVORITES - Favoritos dedicados (para clareza além de user_ad_actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.collected_ads(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL,
  mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  favorited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, ad_id),
  UNIQUE(user_id, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id, favorited_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_mining ON public.favorites(mining_run_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites select own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favorites insert own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites delete own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favorites admins all" ON public.favorites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. Melhoria na tabela OFFERS - adiciona user_id e campos faltantes
-- ============================================================================
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_offers_user ON public.offers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_mining ON public.offers(mining_run_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_score ON public.offers(score DESC);
CREATE INDEX IF NOT EXISTS idx_offers_platform ON public.offers(platform);
CREATE INDEX IF NOT EXISTS idx_offers_country ON public.offers(country);

CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Drop old policies and recreate with user ownership
DROP POLICY IF EXISTS "authenticated_users_can_insert_offers" ON public.offers;
DROP POLICY IF EXISTS "authenticated_users_can_select_offers" ON public.offers;

CREATE POLICY "offers select all" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers insert any" ON public.offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "offers update own" ON public.offers FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "offers delete own" ON public.offers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "offers admins all" ON public.offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. Melhoria na tabela ANALYSES - adiciona user_id e campos faltantes
-- ============================================================================
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done';
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_analyses_user ON public.analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON public.analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_offer ON public.analyses(offer_id);

CREATE TRIGGER analyses_set_updated_at BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Drop old policies and recreate
DROP POLICY IF EXISTS "authenticated_users_can_insert_analyses" ON public.analyses;
DROP POLICY IF EXISTS "authenticated_users_can_select_analyses" ON public.analyses;

CREATE POLICY "analyses select all" ON public.analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "analyses insert any" ON public.analyses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "analyses update own" ON public.analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "analyses delete own" ON public.analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "analyses admins all" ON public.analyses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 7. Melhoria na tabela TRENDS - adiciona user_id e campos faltantes
-- ============================================================================
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_trends_user ON public.trends(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_topic ON public.trends(topic);
CREATE INDEX IF NOT EXISTS idx_trends_country ON public.trends(country);

CREATE TRIGGER trends_set_updated_at BEFORE UPDATE ON public.trends
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Drop old policies and recreate
DROP POLICY IF EXISTS "authenticated_users_can_insert_trends" ON public.trends;
DROP POLICY IF EXISTS "authenticated_users_can_select_trends" ON public.trends;

CREATE POLICY "trends select all" ON public.trends FOR SELECT TO authenticated USING (true);
CREATE POLICY "trends insert any" ON public.trends FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "trends update own" ON public.trends FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "trends delete own" ON public.trends FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trends admins all" ON public.trends FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 8. Melhoria na tabela COLLECTED_ADS - adiciona user_id
-- ============================================================================
ALTER TABLE public.collected_ads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.collected_ads ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collected_ads_user ON public.collected_ads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collected_ads_mining ON public.collected_ads(mining_run_id);

-- ============================================================================
-- 9. Melhoria na tabela SAVED_OFFERS - adiciona mining_run_id
-- ============================================================================
ALTER TABLE public.saved_offers ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.saved_offers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.saved_offers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_saved_offers_mining ON public.saved_offers(mining_run_id);

-- ============================================================================
-- 10. Realtime subscriptions
-- ============================================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trends;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mining_runs;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_ads;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.extension_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.analyses REPLICA IDENTITY FULL;
ALTER TABLE public.trends REPLICA IDENTITY FULL;
ALTER TABLE public.mining_runs REPLICA IDENTITY FULL;
ALTER TABLE public.saved_ads REPLICA IDENTITY FULL;
ALTER TABLE public.favorites REPLICA IDENTITY FULL;
ALTER TABLE public.extension_logs REPLICA IDENTITY FULL;

-- ============================================================================
-- 11. Storage buckets para cache de mídia
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('mining-media', 'mining-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "mining-media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'mining-media');

CREATE POLICY "mining-media auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mining-media');

CREATE POLICY "mining-media auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mining-media');

CREATE POLICY "mining-media auth delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mining-media');

-- ============================================================================
-- 12. Função helper para criar mining run
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_mining_run(
  _user_id UUID,
  _type TEXT,
  _query TEXT,
  _country TEXT DEFAULT 'BR',
  _language TEXT DEFAULT 'pt'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run_id UUID;
BEGIN
  INSERT INTO public.mining_runs (user_id, type, query, country, language, status)
  VALUES (_user_id, _type, _query, _country, _language, 'running')
  RETURNING id INTO _run_id;
  RETURN _run_id;
END;
$$;

-- ============================================================================
-- 13. Função helper para completar mining run
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_mining_run(
  _run_id UUID,
  _results_count INTEGER DEFAULT 0,
  _error TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mining_runs
  SET status = CASE WHEN _error IS NOT NULL THEN 'failed' ELSE 'completed' END,
      results_count = _results_count,
      error = _error,
      completed_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
  WHERE id = _run_id;
END;
$$;
