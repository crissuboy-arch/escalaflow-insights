-- =============================================================================
-- EscalaFlow — PARTE 1 de 3: Fundação
-- Cole no SQL Editor: https://supabase.com/dashboard/project/jcaepmxjbrkgyyofhvxv/editor
-- Rode esta parte PRIMEIRO, depois PART2, depois PART3
-- =============================================================================

-- TIPOS
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.offer_status AS ENUM ('teste','validando','escalando','quente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.ad_action AS ENUM ('saved','favorite','scaled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FUNÇÕES BASE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- TABELA: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, full_name TEXT, avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'pt',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users select own profile" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users select own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TABELA: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- TABELA: mined_offers
CREATE TABLE IF NOT EXISTS public.mined_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT NOT NULL, image_url TEXT, summary TEXT,
  scale_score INTEGER NOT NULL DEFAULT 0,
  platform TEXT NOT NULL, country TEXT NOT NULL, niche TEXT NOT NULL, keyword TEXT,
  ads_count INTEGER NOT NULL DEFAULT 1,
  status public.offer_status NOT NULL DEFAULT 'teste',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mined_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated read offers" ON public.mined_offers;
CREATE POLICY "authenticated read offers" ON public.mined_offers FOR SELECT TO authenticated USING (true);

-- TABELA: saved_offers
CREATE TABLE IF NOT EXISTS public.saved_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.mined_offers(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);
ALTER TABLE public.saved_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own saved select" ON public.saved_offers;
DROP POLICY IF EXISTS "own saved insert" ON public.saved_offers;
DROP POLICY IF EXISTS "own saved update" ON public.saved_offers;
DROP POLICY IF EXISTS "own saved delete" ON public.saved_offers;
CREATE POLICY "own saved select" ON public.saved_offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.saved_offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved update" ON public.saved_offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.saved_offers FOR DELETE USING (auth.uid() = user_id);

-- TABELA: ai_analyses
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.mined_offers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promise TEXT, mechanism TEXT,
  pains JSONB DEFAULT '[]'::jsonb, desires JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT, mental_triggers JSONB DEFAULT '[]'::jsonb,
  offer_structure TEXT, creative_suggestions JSONB DEFAULT '[]'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read demo or own analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "insert own analyses" ON public.ai_analyses;
CREATE POLICY "read demo or own analyses" ON public.ai_analyses FOR SELECT TO authenticated
  USING (is_demo = true OR auth.uid() = user_id);
CREATE POLICY "insert own analyses" ON public.ai_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- TABELA: collected_ads
CREATE TABLE IF NOT EXISTS public.collected_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_library_id TEXT UNIQUE, ad_url TEXT,
  advertiser TEXT NOT NULL DEFAULT 'Anunciante',
  headline TEXT NOT NULL DEFAULT '',
  copy TEXT, cta TEXT, image_url TEXT, video_url TEXT, creative_type TEXT,
  platform TEXT NOT NULL DEFAULT 'Facebook',
  country TEXT NOT NULL DEFAULT '—',
  niche TEXT NOT NULL DEFAULT 'Geral',
  keyword TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  favorite BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'collector',
  raw JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS collected_ads_created_at_idx ON public.collected_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS collected_ads_keyword_idx ON public.collected_ads(keyword);
CREATE INDEX IF NOT EXISTS idx_collected_ads_user ON public.collected_ads(user_id, created_at DESC);
ALTER TABLE public.collected_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated read collected_ads" ON public.collected_ads;
DROP POLICY IF EXISTS "public read collected_ads" ON public.collected_ads;
CREATE POLICY "public read collected_ads" ON public.collected_ads FOR SELECT TO anon, authenticated USING (true);
DROP TRIGGER IF EXISTS set_collected_ads_updated_at ON public.collected_ads;
CREATE TRIGGER set_collected_ads_updated_at BEFORE UPDATE ON public.collected_ads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VERIFICAÇÃO PARTE 1
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
