-- =============================================================================
-- EscalaFlow — PARTE 2 de 3: Ferramentas de Conteúdo
-- Cole no SQL Editor DEPOIS de rodar PART1
-- =============================================================================

-- TABELA: ebooks
CREATE TABLE IF NOT EXISTS public.ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_ad_key TEXT, title TEXT NOT NULL DEFAULT 'Novo Ebook',
  subtitle TEXT, niche TEXT,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout TEXT NOT NULL DEFAULT 'classico',
  cover_url TEXT, status TEXT NOT NULL DEFAULT 'draft',
  step INT NOT NULL DEFAULT 0, chapter_count INT NOT NULL DEFAULT 6,
  mode TEXT NOT NULL DEFAULT 'kdp', project_id UUID,
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
CREATE POLICY "ebooks admins read all"   ON public.ebooks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ebooks admins update all" ON public.ebooks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ebooks admins delete all" ON public.ebooks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS ebooks_set_updated_at ON public.ebooks;
DROP TRIGGER IF EXISTS trg_ebooks_updated_at ON public.ebooks;
CREATE TRIGGER trg_ebooks_updated_at BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_ebooks_user ON public.ebooks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ebooks_user_updated_idx ON public.ebooks(user_id, updated_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('ebook-covers','ebook-covers',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "ebook-covers public read"   ON storage.objects;
DROP POLICY IF EXISTS "ebook-covers owner insert"  ON storage.objects;
DROP POLICY IF EXISTS "ebook-covers owner update"  ON storage.objects;
DROP POLICY IF EXISTS "ebook-covers owner delete"  ON storage.objects;
CREATE POLICY "ebook-covers public read"  ON storage.objects FOR SELECT USING (bucket_id = 'ebook-covers');
CREATE POLICY "ebook-covers owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ebook-covers owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ebook-covers owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- TABELA: playbooks
CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Playbook',
  niche TEXT, source_ad_key TEXT, avatar TEXT, promise TEXT, unique_mechanism TEXT,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme TEXT NOT NULL DEFAULT 'neon-roxo',
  cover_url TEXT, status TEXT NOT NULL DEFAULT 'draft',
  step INTEGER NOT NULL DEFAULT 0, project_id UUID,
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
CREATE POLICY "playbooks admins read all"   ON public.playbooks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "playbooks admins update all" ON public.playbooks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "playbooks admins delete all" ON public.playbooks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS set_playbooks_updated_at ON public.playbooks;
CREATE TRIGGER set_playbooks_updated_at BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('playbook-images','playbook-images',true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "playbook-images public read"  ON storage.objects;
DROP POLICY IF EXISTS "playbook-images auth upload"  ON storage.objects;
DROP POLICY IF EXISTS "playbook-images auth update"  ON storage.objects;
DROP POLICY IF EXISTS "playbook-images auth delete"  ON storage.objects;
CREATE POLICY "playbook-images public read" ON storage.objects FOR SELECT USING (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'playbook-images');

-- TABELA: projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Projeto',
  niche TEXT, source_ad_key TEXT,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode TEXT NOT NULL DEFAULT 'combo',
  ebook_id UUID, playbook_id UUID, cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', step INTEGER NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  country TEXT, language TEXT NOT NULL DEFAULT 'pt',
  product_type TEXT, last_opened_at TIMESTAMPTZ,
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
CREATE POLICY "projects admins read all"   ON public.projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects admins update all" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects admins delete all" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_projects_user      ON public.projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebooks_project     ON public.ebooks(project_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_project  ON public.playbooks(project_id);

-- TABELA: user_ad_actions
CREATE TABLE IF NOT EXISTS public.user_ad_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL REFERENCES public.collected_ads(id) ON DELETE CASCADE,
  action public.ad_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ad_id, action)
);
CREATE INDEX IF NOT EXISTS idx_user_ad_actions_user_action ON public.user_ad_actions(user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_ad_actions_ad ON public.user_ad_actions(ad_id);
ALTER TABLE public.user_ad_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_ad_actions select own" ON public.user_ad_actions;
DROP POLICY IF EXISTS "user_ad_actions insert own" ON public.user_ad_actions;
DROP POLICY IF EXISTS "user_ad_actions delete own" ON public.user_ad_actions;
CREATE POLICY "user_ad_actions select own" ON public.user_ad_actions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_ad_actions insert own" ON public.user_ad_actions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_ad_actions delete own" ON public.user_ad_actions FOR DELETE TO authenticated USING (auth.uid() = user_id);
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_ad_actions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.user_ad_actions REPLICA IDENTITY FULL;

-- TABELA: ai_history
CREATE TABLE IF NOT EXISTS public.ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  prompt JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_history_project_idx ON public.ai_history(project_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_history_user_idx    ON public.ai_history(user_id, created_at DESC);
ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_history select own"      ON public.ai_history;
DROP POLICY IF EXISTS "ai_history insert own"      ON public.ai_history;
DROP POLICY IF EXISTS "ai_history delete own"      ON public.ai_history;
DROP POLICY IF EXISTS "ai_history admins read all" ON public.ai_history;
CREATE POLICY "ai_history select own"      ON public.ai_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_history insert own"      ON public.ai_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_history delete own"      ON public.ai_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_history admins read all" ON public.ai_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- TABELAS: project_outputs, project_tasks, project_timeline, project_campaigns, project_assets, project_scores
CREATE TABLE IF NOT EXISTS public.project_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL, user_id UUID NOT NULL,
  agent TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'analysis',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'done', error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_outputs_project ON public.project_outputs(project_id, agent, created_at DESC);
ALTER TABLE public.project_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outputs select own" ON public.project_outputs; DROP POLICY IF EXISTS "outputs insert own" ON public.project_outputs;
DROP POLICY IF EXISTS "outputs update own" ON public.project_outputs; DROP POLICY IF EXISTS "outputs delete own" ON public.project_outputs;
DROP POLICY IF EXISTS "outputs admins all" ON public.project_outputs;
CREATE POLICY "outputs select own" ON public.project_outputs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs insert own" ON public.project_outputs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outputs update own" ON public.project_outputs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs delete own" ON public.project_outputs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs admins all" ON public.project_outputs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS project_outputs_set_updated_at ON public.project_outputs;
CREATE TRIGGER project_outputs_set_updated_at BEFORE UPDATE ON public.project_outputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL, user_id UUID NOT NULL,
  title TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'todo', due_at TIMESTAMPTZ,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, order_index);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks select own" ON public.project_tasks; DROP POLICY IF EXISTS "tasks insert own" ON public.project_tasks;
DROP POLICY IF EXISTS "tasks update own" ON public.project_tasks; DROP POLICY IF EXISTS "tasks delete own" ON public.project_tasks;
DROP POLICY IF EXISTS "tasks admins all" ON public.project_tasks;
CREATE POLICY "tasks select own" ON public.project_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks insert own" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks update own" ON public.project_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks delete own" ON public.project_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks admins all" ON public.project_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS project_tasks_set_updated_at ON public.project_tasks;
CREATE TRIGGER project_tasks_set_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL, user_id UUID NOT NULL,
  event_type TEXT NOT NULL, ref_id UUID, summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_timeline_project ON public.project_timeline(project_id, created_at DESC);
ALTER TABLE public.project_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timeline select own" ON public.project_timeline; DROP POLICY IF EXISTS "timeline insert own" ON public.project_timeline;
DROP POLICY IF EXISTS "timeline delete own" ON public.project_timeline; DROP POLICY IF EXISTS "timeline admins all" ON public.project_timeline;
CREATE POLICY "timeline select own" ON public.project_timeline FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "timeline insert own" ON public.project_timeline FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "timeline delete own" ON public.project_timeline FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "timeline admins all" ON public.project_timeline FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.project_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL, user_id UUID NOT NULL,
  platform TEXT NOT NULL, name TEXT NOT NULL DEFAULT 'Campanha',
  audiences JSONB NOT NULL DEFAULT '[]'::jsonb, angles JSONB NOT NULL DEFAULT '[]'::jsonb,
  headlines JSONB NOT NULL DEFAULT '[]'::jsonb, ad_copies JSONB NOT NULL DEFAULT '[]'::jsonb,
  creatives JSONB NOT NULL DEFAULT '[]'::jsonb, status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_campaigns_project ON public.project_campaigns(project_id, platform);
ALTER TABLE public.project_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns select own" ON public.project_campaigns; DROP POLICY IF EXISTS "campaigns insert own" ON public.project_campaigns;
DROP POLICY IF EXISTS "campaigns update own" ON public.project_campaigns; DROP POLICY IF EXISTS "campaigns delete own" ON public.project_campaigns;
DROP POLICY IF EXISTS "campaigns admins all" ON public.project_campaigns;
CREATE POLICY "campaigns select own" ON public.project_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns insert own" ON public.project_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns update own" ON public.project_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns delete own" ON public.project_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns admins all" ON public.project_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS project_campaigns_set_updated_at ON public.project_campaigns;
CREATE TRIGGER project_campaigns_set_updated_at BEFORE UPDATE ON public.project_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL, user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image', url TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON public.project_assets(project_id, kind);
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets select own" ON public.project_assets; DROP POLICY IF EXISTS "assets insert own" ON public.project_assets;
DROP POLICY IF EXISTS "assets delete own" ON public.project_assets; DROP POLICY IF EXISTS "assets admins all" ON public.project_assets;
CREATE POLICY "assets select own" ON public.project_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets insert own" ON public.project_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets delete own" ON public.project_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets admins all" ON public.project_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.project_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL, user_id UUID NOT NULL,
  dimension TEXT NOT NULL, value INT NOT NULL DEFAULT 0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb, weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixes JSONB NOT NULL DEFAULT '[]'::jsonb, next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_scores_project ON public.project_scores(project_id, dimension, created_at DESC);
ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores select own" ON public.project_scores; DROP POLICY IF EXISTS "scores insert own" ON public.project_scores;
DROP POLICY IF EXISTS "scores delete own" ON public.project_scores; DROP POLICY IF EXISTS "scores admins all" ON public.project_scores;
CREATE POLICY "scores select own" ON public.project_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores insert own" ON public.project_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scores delete own" ON public.project_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores admins all" ON public.project_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- VERIFICAÇÃO PARTE 2
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
