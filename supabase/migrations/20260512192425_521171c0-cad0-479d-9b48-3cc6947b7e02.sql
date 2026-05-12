
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Novo Projeto',
  niche text,
  source_ad_key text,
  briefing jsonb NOT NULL DEFAULT '{}'::jsonb,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode text NOT NULL DEFAULT 'combo',
  ebook_id uuid,
  playbook_id uuid,
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects select own" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "projects insert own" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects update own" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "projects delete own" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebooks_project ON public.ebooks(project_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_project ON public.playbooks(project_id);
