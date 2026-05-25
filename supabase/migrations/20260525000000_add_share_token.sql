ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS share_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_share_token
  ON public.projects(share_token)
  WHERE share_token IS NOT NULL;
