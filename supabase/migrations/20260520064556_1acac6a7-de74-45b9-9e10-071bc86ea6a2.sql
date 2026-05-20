
-- Extend projects with strategic fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

-- Generic updated_at trigger helper already exists (public.set_updated_at)

-- project_outputs ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  agent text NOT NULL,
  kind text NOT NULL DEFAULT 'analysis',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'done',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_outputs_project ON public.project_outputs(project_id, agent, created_at DESC);
ALTER TABLE public.project_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outputs select own" ON public.project_outputs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs insert own" ON public.project_outputs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outputs update own" ON public.project_outputs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs delete own" ON public.project_outputs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "outputs admins all" ON public.project_outputs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER project_outputs_set_updated_at BEFORE UPDATE ON public.project_outputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- project_tasks -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, order_index);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks select own" ON public.project_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks insert own" ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks update own" ON public.project_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks delete own" ON public.project_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks admins all" ON public.project_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER project_tasks_set_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- project_timeline --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  ref_id uuid,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_timeline_project ON public.project_timeline(project_id, created_at DESC);
ALTER TABLE public.project_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timeline select own" ON public.project_timeline FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "timeline insert own" ON public.project_timeline FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "timeline delete own" ON public.project_timeline FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "timeline admins all" ON public.project_timeline FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- project_campaigns -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  name text NOT NULL DEFAULT 'Campanha',
  audiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  headlines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ad_copies jsonb NOT NULL DEFAULT '[]'::jsonb,
  creatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_campaigns_project ON public.project_campaigns(project_id, platform);
ALTER TABLE public.project_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns select own" ON public.project_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns insert own" ON public.project_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns update own" ON public.project_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns delete own" ON public.project_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "campaigns admins all" ON public.project_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER project_campaigns_set_updated_at BEFORE UPDATE ON public.project_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- project_assets ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON public.project_assets(project_id, kind);
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets select own" ON public.project_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets insert own" ON public.project_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets delete own" ON public.project_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assets admins all" ON public.project_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- project_scores ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dimension text NOT NULL,
  value int NOT NULL DEFAULT 0,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_scores_project ON public.project_scores(project_id, dimension, created_at DESC);
ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores select own" ON public.project_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores insert own" ON public.project_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scores delete own" ON public.project_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "scores admins all" ON public.project_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
