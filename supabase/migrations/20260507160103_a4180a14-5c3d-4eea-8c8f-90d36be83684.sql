ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS step int NOT NULL DEFAULT 0;
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS chapter_count int NOT NULL DEFAULT 6;

DROP TRIGGER IF EXISTS ebooks_set_updated_at ON public.ebooks;
DROP TRIGGER IF EXISTS trg_ebooks_updated_at ON public.ebooks;
CREATE TRIGGER trg_ebooks_updated_at
BEFORE UPDATE ON public.ebooks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ebooks_user_updated_idx ON public.ebooks (user_id, updated_at DESC);