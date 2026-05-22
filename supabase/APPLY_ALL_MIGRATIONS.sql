-- =============================================================================
-- EscalaFlow — Script consolidado de migrations (idempotente)
-- Cole TUDO no SQL Editor do Supabase e execute.
-- URL do projeto: https://supabase.com/dashboard/project/jcaepmxjbrkgyyofhvxv/editor
-- =============================================================================

-- ============================================================================
-- TIPOS (ENUMS)
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.offer_status AS ENUM ('teste', 'validando', 'escalando', 'quente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_action AS ENUM ('saved','favorite','scaled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- FUNÇÕES BASE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- TABELA: profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TABELA: user_roles
-- ============================================================================
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

-- ============================================================================
-- TABELA: mined_offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mined_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT NOT NULL,
  image_url TEXT,
  summary TEXT,
  scale_score INTEGER NOT NULL DEFAULT 0,
  platform TEXT NOT NULL,
  country TEXT NOT NULL,
  niche TEXT NOT NULL,
  keyword TEXT,
  ads_count INTEGER NOT NULL DEFAULT 1,
  status public.offer_status NOT NULL DEFAULT 'teste',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mined_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read offers" ON public.mined_offers;
CREATE POLICY "authenticated read offers" ON public.mined_offers FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- TABELA: saved_offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.mined_offers(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  mining_run_id UUID,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
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

-- ============================================================================
-- TABELA: ai_analyses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.mined_offers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promise TEXT,
  mechanism TEXT,
  pains JSONB DEFAULT '[]'::jsonb,
  desires JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  mental_triggers JSONB DEFAULT '[]'::jsonb,
  offer_structure TEXT,
  creative_suggestions JSONB DEFAULT '[]'::jsonb,
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

-- ============================================================================
-- TABELA: collected_ads
-- ============================================================================
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
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collected_ads_created_at_idx ON public.collected_ads (created_at DESC);
CREATE INDEX IF NOT EXISTS collected_ads_keyword_idx ON public.collected_ads (keyword);
CREATE INDEX IF NOT EXISTS idx_collected_ads_user ON public.collected_ads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collected_ads_mining ON public.collected_ads(mining_run_id);

ALTER TABLE public.collected_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read collected_ads" ON public.collected_ads;
DROP POLICY IF EXISTS "public read collected_ads" ON public.collected_ads;
CREATE POLICY "public read collected_ads" ON public.collected_ads FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS set_collected_ads_updated_at ON public.collected_ads;
CREATE TRIGGER set_collected_ads_updated_at
BEFORE UPDATE ON public.collected_ads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: ebooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_ad_key TEXT,
  title TEXT NOT NULL DEFAULT 'Novo Ebook',
  subtitle TEXT,
  niche TEXT,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout TEXT NOT NULL DEFAULT 'classico',
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  step INT NOT NULL DEFAULT 0,
  chapter_count INT NOT NULL DEFAULT 6,
  mode TEXT NOT NULL DEFAULT 'kdp',
  project_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ebooks select own" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks insert own" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks update own" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks delete own" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks admins read all" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks admins update all" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks admins delete all" ON public.ebooks;
CREATE POLICY "ebooks select own" ON public.ebooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ebooks insert own" ON public.ebooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ebooks update own" ON public.ebooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ebooks delete own" ON public.ebooks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ebooks admins read all" ON public.ebooks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ebooks admins update all" ON public.ebooks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ebooks admins delete all" ON public.ebooks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS ebooks_set_updated_at ON public.ebooks;
DROP TRIGGER IF EXISTS trg_ebooks_updated_at ON public.ebooks;
CREATE TRIGGER trg_ebooks_updated_at
BEFORE UPDATE ON public.ebooks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ebooks_user ON public.ebooks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ebooks_user_updated_idx ON public.ebooks (user_id, updated_at DESC);

-- Storage: ebook-covers
INSERT INTO storage.buckets (id, name, public) VALUES ('ebook-covers', 'ebook-covers', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ebook-covers public read" ON storage.objects;
DROP POLICY IF EXISTS "ebook-covers owner insert" ON storage.objects;
DROP POLICY IF EXISTS "ebook-covers owner update" ON storage.objects;
DROP POLICY IF EXISTS "ebook-covers owner delete" ON storage.objects;
CREATE POLICY "ebook-covers public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'ebook-covers');
CREATE POLICY "ebook-covers owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ebook-covers owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ebook-covers owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- TABELA: playbooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Playbook',
  niche TEXT,
  source_ad_key TEXT,
  avatar TEXT,
  promise TEXT,
  unique_mechanism TEXT,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme TEXT NOT NULL DEFAULT 'neon-roxo',
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  step INTEGER NOT NULL DEFAULT 0,
  project_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playbooks select own" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks insert own" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks update own" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks delete own" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks admins read all" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks admins update all" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks admins delete all" ON public.playbooks;
CREATE POLICY "playbooks select own" ON public.playbooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "playbooks insert own" ON public.playbooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "playbooks update own" ON public.playbooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "playbooks delete own" ON public.playbooks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "playbooks admins read all" ON public.playbooks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "playbooks admins update all" ON public.playbooks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "playbooks admins delete all" ON public.playbooks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_playbooks_updated_at ON public.playbooks;
CREATE TRIGGER set_playbooks_updated_at BEFORE UPDATE ON public.playbooks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage: playbook-images
INSERT INTO storage.buckets (id, name, public) VALUES ('playbook-images', 'playbook-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "playbook-images public read" ON storage.objects;
DROP POLICY IF EXISTS "playbook-images auth upload" ON storage.objects;
DROP POLICY IF EXISTS "playbook-images auth update" ON storage.objects;
DROP POLICY IF EXISTS "playbook-images auth delete" ON storage.objects;
CREATE POLICY "playbook-images public read" ON storage.objects FOR SELECT USING (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'playbook-images');

-- ============================================================================
-- TABELA: projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Projeto',
  niche TEXT,
  source_ad_key TEXT,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode TEXT NOT NULL DEFAULT 'combo',
  ebook_id UUID,
  playbook_id UUID,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  step INTEGER NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  country TEXT,
  language TEXT NOT NULL DEFAULT 'pt',
  product_type TEXT,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects select own" ON public.projects;
DROP POLICY IF EXISTS "projects insert own" ON public.projects;
DROP POLICY IF EXISTS "projects update own" ON public.projects;
DROP POLICY IF EXISTS "projects delete own" ON public.projects;
DROP POLICY IF EXISTS "projects admins read all" ON public.projects;
DROP POLICY IF EXISTS "projects admins update all" ON public.projects;
DROP POLICY IF EXISTS "projects admins delete all" ON public.projects;
CREATE POLICY "projects select own" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "projects insert own" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects update own" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "projects delete own" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "projects admins read all" ON public.projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "projects admins update all" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "projects admins delete all" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebooks_project ON public.ebooks(project_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_project ON public.playbooks(project_id);

-- ============================================================================
-- TABELA: user_ad_actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_ad_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL REFERENCES public.collected_ads(id) ON DELETE CASCADE,
  action public.ad_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ad_id, action)
);

CREATE INDEX IF NOT EXISTS idx_user_ad_actions_user_action ON public.user_ad_actions (user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_ad_actions_ad ON public.user_ad_actions (ad_id);

ALTER TABLE public.user_ad_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_ad_actions select own" ON public.user_ad_actions;
DROP POLICY IF EXISTS "user_ad_actions insert own" ON public.user_ad_actions;
DROP POLICY IF EXISTS "user_ad_actions delete own" ON public.user_ad_actions;
CREATE POLICY "user_ad_actions select own" ON public.user_ad_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_ad_actions insert own" ON public.user_ad_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_ad_actions delete own" ON public.user_ad_actions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_ad_actions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.user_ad_actions REPLICA IDENTITY FULL;

-- ============================================================================
-- TABELA: ai_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  prompt JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_history_project_idx ON public.ai_history(project_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_history_user_idx ON public.ai_history(user_id, created_at DESC);

ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_history select own" ON public.ai_history;
DROP POLICY IF EXISTS "ai_history insert own" ON public.ai_history;
DROP POLICY IF EXISTS "ai_history delete own" ON public.ai_history;
DROP POLICY IF EXISTS "ai_history admins read all" ON public.ai_history;
CREATE POLICY "ai_history select own" ON public.ai_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_history insert own" ON public.ai_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_history delete own" ON public.ai_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_history admins read all" ON public.ai_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: project_outputs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  agent TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'analysis',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'done',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_outputs_project ON public.project_outputs(project_id, agent, created_at DESC);
ALTER TABLE public.project_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outputs select own" ON public.project_outputs;
DROP POLICY IF EXISTS "outputs insert own" ON public.project_outputs;
DROP POLICY IF EXISTS "outputs update own" ON public.project_outputs;
DROP POLICY IF EXISTS "outputs delete own" ON public.project_outputs;
DROP POLICY IF EXISTS "outputs admins all" ON public.project_outputs;
CREATE POLICY "outputs select own" ON public.project_outputs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs insert own" ON public.project_outputs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outputs update own" ON public.project_outputs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs delete own" ON public.project_outputs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs admins all" ON public.project_outputs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS project_outputs_set_updated_at ON public.project_outputs;
CREATE TRIGGER project_outputs_set_updated_at BEFORE UPDATE ON public.project_outputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: project_tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  due_at TIMESTAMPTZ,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, order_index);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks select own" ON public.project_tasks;
DROP POLICY IF EXISTS "tasks insert own" ON public.project_tasks;
DROP POLICY IF EXISTS "tasks update own" ON public.project_tasks;
DROP POLICY IF EXISTS "tasks delete own" ON public.project_tasks;
DROP POLICY IF EXISTS "tasks admins all" ON public.project_tasks;
CREATE POLICY "tasks select own" ON public.project_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks insert own" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks update own" ON public.project_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks delete own" ON public.project_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks admins all" ON public.project_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS project_tasks_set_updated_at ON public.project_tasks;
CREATE TRIGGER project_tasks_set_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: project_timeline
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  ref_id UUID,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_timeline_project ON public.project_timeline(project_id, created_at DESC);
ALTER TABLE public.project_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timeline select own" ON public.project_timeline;
DROP POLICY IF EXISTS "timeline insert own" ON public.project_timeline;
DROP POLICY IF EXISTS "timeline delete own" ON public.project_timeline;
DROP POLICY IF EXISTS "timeline admins all" ON public.project_timeline;
CREATE POLICY "timeline select own" ON public.project_timeline FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "timeline insert own" ON public.project_timeline FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "timeline delete own" ON public.project_timeline FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "timeline admins all" ON public.project_timeline FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: project_campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Campanha',
  audiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  angles JSONB NOT NULL DEFAULT '[]'::jsonb,
  headlines JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad_copies JSONB NOT NULL DEFAULT '[]'::jsonb,
  creatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_campaigns_project ON public.project_campaigns(project_id, platform);
ALTER TABLE public.project_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns select own" ON public.project_campaigns;
DROP POLICY IF EXISTS "campaigns insert own" ON public.project_campaigns;
DROP POLICY IF EXISTS "campaigns update own" ON public.project_campaigns;
DROP POLICY IF EXISTS "campaigns delete own" ON public.project_campaigns;
DROP POLICY IF EXISTS "campaigns admins all" ON public.project_campaigns;
CREATE POLICY "campaigns select own" ON public.project_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns insert own" ON public.project_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns update own" ON public.project_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns delete own" ON public.project_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns admins all" ON public.project_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS project_campaigns_set_updated_at ON public.project_campaigns;
CREATE TRIGGER project_campaigns_set_updated_at BEFORE UPDATE ON public.project_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: project_assets
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON public.project_assets(project_id, kind);
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets select own" ON public.project_assets;
DROP POLICY IF EXISTS "assets insert own" ON public.project_assets;
DROP POLICY IF EXISTS "assets delete own" ON public.project_assets;
DROP POLICY IF EXISTS "assets admins all" ON public.project_assets;
CREATE POLICY "assets select own" ON public.project_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets insert own" ON public.project_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets delete own" ON public.project_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets admins all" ON public.project_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: project_scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  dimension TEXT NOT NULL,
  value INT NOT NULL DEFAULT 0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixes JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_scores_project ON public.project_scores(project_id, dimension, created_at DESC);
ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scores select own" ON public.project_scores;
DROP POLICY IF EXISTS "scores insert own" ON public.project_scores;
DROP POLICY IF EXISTS "scores delete own" ON public.project_scores;
DROP POLICY IF EXISTS "scores admins all" ON public.project_scores;
CREATE POLICY "scores select own" ON public.project_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores insert own" ON public.project_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scores delete own" ON public.project_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores admins all" ON public.project_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID,
  advertiser TEXT,
  headline TEXT,
  copy TEXT,
  cta TEXT,
  creative_type TEXT,
  platform TEXT,
  country TEXT,
  engagement JSONB,
  landing_page TEXT,
  language TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0,
  niche TEXT,
  keyword TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_user ON public.offers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_mining ON public.offers(mining_run_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_score ON public.offers(score DESC);
CREATE INDEX IF NOT EXISTS idx_offers_platform ON public.offers(platform);
CREATE INDEX IF NOT EXISTS idx_offers_country ON public.offers(country);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_insert_offers" ON public.offers;
DROP POLICY IF EXISTS "authenticated_users_can_select_offers" ON public.offers;
DROP POLICY IF EXISTS "offers select all" ON public.offers;
DROP POLICY IF EXISTS "offers insert any" ON public.offers;
DROP POLICY IF EXISTS "offers update own" ON public.offers;
DROP POLICY IF EXISTS "offers delete own" ON public.offers;
DROP POLICY IF EXISTS "offers admins all" ON public.offers;
CREATE POLICY "offers select all" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers insert any" ON public.offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "offers update own" ON public.offers FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "offers delete own" ON public.offers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "offers admins all" ON public.offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS offers_set_updated_at ON public.offers;
CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: analyses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.mined_offers(id) ON DELETE SET NULL,
  mining_run_id UUID,
  title TEXT,
  type TEXT,
  content JSONB,
  status TEXT NOT NULL DEFAULT 'done',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user ON public.analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON public.analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_offer ON public.analyses(offer_id);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_insert_analyses" ON public.analyses;
DROP POLICY IF EXISTS "authenticated_users_can_select_analyses" ON public.analyses;
DROP POLICY IF EXISTS "analyses select all" ON public.analyses;
DROP POLICY IF EXISTS "analyses insert any" ON public.analyses;
DROP POLICY IF EXISTS "analyses update own" ON public.analyses;
DROP POLICY IF EXISTS "analyses delete own" ON public.analyses;
DROP POLICY IF EXISTS "analyses admins all" ON public.analyses;
CREATE POLICY "analyses select all" ON public.analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "analyses insert any" ON public.analyses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "analyses update own" ON public.analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "analyses delete own" ON public.analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "analyses admins all" ON public.analyses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS analyses_set_updated_at ON public.analyses;
CREATE TRIGGER analyses_set_updated_at BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: trends
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mining_run_id UUID,
  topic TEXT,
  country TEXT,
  language TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trends_user ON public.trends(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_topic ON public.trends(topic);
CREATE INDEX IF NOT EXISTS idx_trends_country ON public.trends(country);

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_insert_trends" ON public.trends;
DROP POLICY IF EXISTS "authenticated_users_can_select_trends" ON public.trends;
DROP POLICY IF EXISTS "trends select all" ON public.trends;
DROP POLICY IF EXISTS "trends insert any" ON public.trends;
DROP POLICY IF EXISTS "trends update own" ON public.trends;
DROP POLICY IF EXISTS "trends delete own" ON public.trends;
DROP POLICY IF EXISTS "trends admins all" ON public.trends;
CREATE POLICY "trends select all" ON public.trends FOR SELECT TO authenticated USING (true);
CREATE POLICY "trends insert any" ON public.trends FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "trends update own" ON public.trends FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "trends delete own" ON public.trends FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trends admins all" ON public.trends FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trends_set_updated_at ON public.trends;
CREATE TRIGGER trends_set_updated_at BEFORE UPDATE ON public.trends
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABELA: mining_runs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mining_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  query TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  language TEXT NOT NULL DEFAULT 'pt',
  status TEXT NOT NULL DEFAULT 'running',
  results_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mining_runs_user ON public.mining_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mining_runs_type ON public.mining_runs(type, status);

ALTER TABLE public.mining_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mining_runs select own" ON public.mining_runs;
DROP POLICY IF EXISTS "mining_runs insert own" ON public.mining_runs;
DROP POLICY IF EXISTS "mining_runs update own" ON public.mining_runs;
DROP POLICY IF EXISTS "mining_runs admins all" ON public.mining_runs;
CREATE POLICY "mining_runs select own" ON public.mining_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mining_runs insert own" ON public.mining_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mining_runs update own" ON public.mining_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mining_runs admins all" ON public.mining_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: extension_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.extension_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'extension',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_logs_user ON public.extension_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_logs_type ON public.extension_logs(event_type, created_at DESC);

ALTER TABLE public.extension_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extension_logs select own" ON public.extension_logs;
DROP POLICY IF EXISTS "extension_logs insert own" ON public.extension_logs;
DROP POLICY IF EXISTS "extension_logs admins all" ON public.extension_logs;
CREATE POLICY "extension_logs select own" ON public.extension_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "extension_logs insert own" ON public.extension_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "extension_logs admins all" ON public.extension_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: saved_ads
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

DROP POLICY IF EXISTS "saved_ads select own" ON public.saved_ads;
DROP POLICY IF EXISTS "saved_ads insert own" ON public.saved_ads;
DROP POLICY IF EXISTS "saved_ads update own" ON public.saved_ads;
DROP POLICY IF EXISTS "saved_ads delete own" ON public.saved_ads;
DROP POLICY IF EXISTS "saved_ads admins all" ON public.saved_ads;
CREATE POLICY "saved_ads select own" ON public.saved_ads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_ads insert own" ON public.saved_ads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_ads update own" ON public.saved_ads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_ads delete own" ON public.saved_ads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_ads admins all" ON public.saved_ads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- TABELA: favorites
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

DROP POLICY IF EXISTS "favorites select own" ON public.favorites;
DROP POLICY IF EXISTS "favorites insert own" ON public.favorites;
DROP POLICY IF EXISTS "favorites delete own" ON public.favorites;
DROP POLICY IF EXISTS "favorites admins all" ON public.favorites;
CREATE POLICY "favorites select own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favorites insert own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites delete own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favorites admins all" ON public.favorites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- FK DEFERIDAS: saved_offers -> mining_runs
-- ============================================================================
ALTER TABLE public.saved_offers
  ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_saved_offers_mining ON public.saved_offers(mining_run_id);

-- FK DEFERIDAS: offers, analyses, trends -> mining_runs
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;
ALTER TABLE public.collected_ads ADD COLUMN IF NOT EXISTS mining_run_id UUID REFERENCES public.mining_runs(id) ON DELETE SET NULL;

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.offers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trends; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mining_runs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_ads; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.extension_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.analyses REPLICA IDENTITY FULL;
ALTER TABLE public.trends REPLICA IDENTITY FULL;
ALTER TABLE public.mining_runs REPLICA IDENTITY FULL;
ALTER TABLE public.saved_ads REPLICA IDENTITY FULL;
ALTER TABLE public.favorites REPLICA IDENTITY FULL;
ALTER TABLE public.extension_logs REPLICA IDENTITY FULL;

-- ============================================================================
-- STORAGE: mining-media
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('mining-media', 'mining-media', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "mining-media public read" ON storage.objects;
DROP POLICY IF EXISTS "mining-media auth upload" ON storage.objects;
DROP POLICY IF EXISTS "mining-media auth update" ON storage.objects;
DROP POLICY IF EXISTS "mining-media auth delete" ON storage.objects;
CREATE POLICY "mining-media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'mining-media');
CREATE POLICY "mining-media auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mining-media');
CREATE POLICY "mining-media auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mining-media');
CREATE POLICY "mining-media auth delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mining-media');

-- ============================================================================
-- FUNÇÕES HELPER: create_mining_run / complete_mining_run
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

-- ============================================================================
-- TABELA: tiktok_minerados
-- ============================================================================
create table if not exists public.tiktok_minerados (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  hashtag       text not null,
  video_id      text not null,
  creator       text not null default '',
  video_url     text not null default '',
  thumbnail_url text not null default '',
  hook          text not null default '',
  hashtags      text[] not null default '{}',
  views         bigint not null default 0,
  likes         bigint not null default 0,
  comments      bigint not null default 0,
  shares        bigint not null default 0,
  audio_title   text not null default '',
  viral_score   int not null default 0,
  description   text not null default '',
  create_time   text,
  ai_analysis   jsonb,
  created_at    timestamptz not null default now()
);
-- Add thumbnail_url to existing tables (idempotent)
alter table public.tiktok_minerados add column if not exists thumbnail_url text not null default '';
create index if not exists tiktok_minerados_user_id_idx on public.tiktok_minerados(user_id);
create index if not exists tiktok_minerados_hashtag_idx on public.tiktok_minerados(user_id, hashtag);
create unique index if not exists tiktok_minerados_video_user_idx on public.tiktok_minerados(user_id, video_id);
alter table public.tiktok_minerados enable row level security;
drop policy if exists "users own tiktok_minerados" on public.tiktok_minerados;
create policy "users own tiktok_minerados"
  on public.tiktok_minerados for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- TABELA: instagram_minerados
-- ============================================================================
create table if not exists public.instagram_minerados (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  search           text not null,
  search_type      text not null default 'hashtag',
  results_type     text not null default 'posts',
  short_code       text not null,
  post_url         text not null default '',
  caption          text not null default '',
  hashtags         text[] not null default '{}',
  mentions         text[] not null default '{}',
  comments_count   bigint not null default 0,
  likes_count      bigint not null default 0,
  owner_username   text not null default '',
  owner_full_name  text not null default '',
  display_url      text not null default '',
  engagement_score int not null default 0,
  raw              jsonb,
  ai_analysis      jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists instagram_minerados_user_id_idx on public.instagram_minerados(user_id);
create index if not exists instagram_minerados_search_idx  on public.instagram_minerados(user_id, search);
create unique index if not exists instagram_minerados_post_user_idx on public.instagram_minerados(user_id, short_code);
alter table public.instagram_minerados enable row level security;
drop policy if exists "users own instagram_minerados" on public.instagram_minerados;
create policy "users own instagram_minerados"
  on public.instagram_minerados
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- TABELA: google_trends_minerados
-- ============================================================================
create table if not exists public.google_trends_minerados (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  keyword         text not null,
  geo             text not null default 'BR',
  timeframe       text not null default 'today 3-m',
  avg_interest    int not null default 0,
  peak_interest   int not null default 0,
  trend           text not null default 'stable',
  related_queries text[] not null default '{}',
  related_topics  text[] not null default '{}',
  points          jsonb,
  ai_analysis     jsonb,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists google_trends_user_id_idx on public.google_trends_minerados(user_id);
create unique index if not exists google_trends_keyword_user_idx on public.google_trends_minerados(user_id, keyword, geo);
alter table public.google_trends_minerados enable row level security;
drop policy if exists "users own google_trends_minerados" on public.google_trends_minerados;
create policy "users own google_trends_minerados"
  on public.google_trends_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- TABELA: youtube_minerados
-- ============================================================================
create table if not exists public.youtube_minerados (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  query         text not null,
  video_id      text not null,
  title         text not null default '',
  channel_name  text not null default '',
  channel_id    text not null default '',
  video_url     text not null default '',
  description   text not null default '',
  hashtags      text[] not null default '{}',
  views         bigint not null default 0,
  likes         bigint not null default 0,
  comments      bigint not null default 0,
  duration      text not null default '',
  is_short      boolean not null default false,
  published_at  text,
  thumbnail_url text not null default '',
  viral_score   int not null default 0,
  ai_analysis   jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists youtube_minerados_user_id_idx on public.youtube_minerados(user_id);
create index if not exists youtube_minerados_query_idx   on public.youtube_minerados(user_id, query);
create unique index if not exists youtube_minerados_video_user_idx on public.youtube_minerados(user_id, video_id);
alter table public.youtube_minerados enable row level security;
drop policy if exists "users own youtube_minerados" on public.youtube_minerados;
create policy "users own youtube_minerados"
  on public.youtube_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- TABELA: produtos_minerados
-- ============================================================================
create table if not exists public.produtos_minerados (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  query             text not null,
  platform          text not null,
  product_id        text not null,
  title             text not null default '',
  price             numeric not null default 0,
  currency          text not null default 'BRL',
  original_price    numeric not null default 0,
  discount          int not null default 0,
  rating            numeric not null default 0,
  review_count      bigint not null default 0,
  sold_count        bigint not null default 0,
  seller            text not null default '',
  product_url       text not null default '',
  image_url         text not null default '',
  category          text not null default '',
  opportunity_score int not null default 0,
  ai_analysis       jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists produtos_minerados_user_id_idx on public.produtos_minerados(user_id);
create index if not exists produtos_minerados_query_idx   on public.produtos_minerados(user_id, query);
create unique index if not exists produtos_minerados_product_user_idx on public.produtos_minerados(user_id, platform, product_id);
alter table public.produtos_minerados enable row level security;
drop policy if exists "users own produtos_minerados" on public.produtos_minerados;
create policy "users own produtos_minerados"
  on public.produtos_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- TABELA: page_builder_projects
-- ============================================================================
create table if not exists public.page_builder_projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  html             text not null default '',
  skill_id         text not null default '',
  design_system_id text not null default '',
  form_data        jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists page_builder_user_id_idx on public.page_builder_projects(user_id);
alter table public.page_builder_projects enable row level security;
drop policy if exists "users own page_builder_projects" on public.page_builder_projects;
create policy "users own page_builder_projects"
  on public.page_builder_projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- VERIFICAÇÃO FINAL: lista todas as tabelas criadas
-- ============================================================================
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
