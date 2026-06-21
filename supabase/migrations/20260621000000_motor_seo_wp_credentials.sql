-- Motor Afiliados SEO V2.0 — credenciais de WordPress por projeto (multi-site).
-- O módulo usa a tabela genérica public.projects (mode = 'afiliados_seo'); não há
-- tabela motor_afiliados_seo_projetos. Estas colunas são opcionais: quando nulas,
-- o publish cai no fallback global do .env (WORDPRESS_URL/USER/APP_PASSWORD).
--
-- ATENÇÃO: wp_app_password é sensível. NUNCA selecione esta coluna em queries
-- expostas ao cliente — ela só deve ser lida no servidor (functions/cron).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS wp_url text,
  ADD COLUMN IF NOT EXISTS wp_user text,
  ADD COLUMN IF NOT EXISTS wp_app_password text;
