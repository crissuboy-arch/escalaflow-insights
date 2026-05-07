
CREATE TABLE public.ebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_ad_key text,
  title text NOT NULL DEFAULT 'Novo Ebook',
  subtitle text,
  niche text,
  briefing jsonb NOT NULL DEFAULT '{}'::jsonb,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout text NOT NULL DEFAULT 'classico',
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ebooks select own" ON public.ebooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ebooks insert own" ON public.ebooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ebooks update own" ON public.ebooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ebooks delete own" ON public.ebooks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER ebooks_set_updated_at BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ebooks_user ON public.ebooks(user_id, created_at DESC);

-- Storage bucket for cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('ebook-covers', 'ebook-covers', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ebook-covers public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'ebook-covers');

CREATE POLICY "ebook-covers owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ebook-covers owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ebook-covers owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ebook-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
