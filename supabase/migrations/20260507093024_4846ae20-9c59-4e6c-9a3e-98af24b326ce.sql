DROP POLICY IF EXISTS "authenticated read collected_ads" ON public.collected_ads;
CREATE POLICY "public read collected_ads" ON public.collected_ads FOR SELECT TO anon, authenticated USING (true);