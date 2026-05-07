CREATE TABLE public.playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Novo Playbook',
  niche text,
  source_ad_key text,
  avatar text,
  promise text,
  unique_mechanism text,
  briefing jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme text NOT NULL DEFAULT 'neon-roxo',
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playbooks select own" ON public.playbooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "playbooks insert own" ON public.playbooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "playbooks update own" ON public.playbooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "playbooks delete own" ON public.playbooks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_playbooks_updated_at BEFORE UPDATE ON public.playbooks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('playbook-images', 'playbook-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "playbook-images public read" ON storage.objects FOR SELECT USING (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'playbook-images');
CREATE POLICY "playbook-images auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'playbook-images');