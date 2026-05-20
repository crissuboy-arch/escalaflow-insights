-- RLS policies for mining tables
-- Allow authenticated users to insert & select from offers
CREATE POLICY "authenticated_users_can_insert_offers"
  ON public.offers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_users_can_select_offers"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert & select from analyses
CREATE POLICY "authenticated_users_can_insert_analyses"
  ON public.analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_users_can_select_analyses"
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert & select from trends
CREATE POLICY "authenticated_users_can_insert_trends"
  ON public.trends
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_users_can_select_trends"
  ON public.trends
  FOR SELECT
  TO authenticated
  USING (true);
