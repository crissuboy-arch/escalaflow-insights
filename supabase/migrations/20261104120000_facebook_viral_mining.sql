-- Facebook Viral — Fase 3+: colunas aditivas para suportar mineração via
-- Apify (coregent/facebook-reels-scraper + themineworks/facebook-pages-
-- scraper) e para ligar reels/produtos a um projeto real do ScalaFlow
-- (public.projects). Nenhuma tabela é apagada/renomeada, nenhuma coluna
-- existente muda de tipo — só "add column if not exists".
--
-- data_source distingue o que o utilizador digitou manualmente do que veio
-- de um run Apify pago — nunca se inventa um valor "apify" sem a chamada
-- real ter acontecido (ver src/lib/miners/facebook-viral.ts).

alter table public.viral_reels
  add column if not exists comments_count integer,
  add column if not exists shares_count integer,
  add column if not exists caption text,
  add column if not exists thumbnail_url text,
  add column if not exists collected_at timestamptz,
  add column if not exists data_source text not null default 'manual',
  add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.viral_reels
  drop constraint if exists viral_reels_data_source_check;
alter table public.viral_reels
  add constraint viral_reels_data_source_check check (data_source in ('manual', 'apify'));

create index if not exists idx_viral_reels_project on public.viral_reels (project_id);

alter table public.viral_pages
  add column if not exists verified_name text,
  add column if not exists last_mined_at timestamptz,
  add column if not exists name_source text not null default 'manual';

alter table public.viral_pages
  drop constraint if exists viral_pages_name_source_check;
alter table public.viral_pages
  add constraint viral_pages_name_source_check check (name_source in ('manual', 'apify'));

alter table public.affiliate_products
  add column if not exists currency text,
  add column if not exists approval_status text not null default 'pending',
  add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.affiliate_products
  drop constraint if exists affiliate_products_approval_status_check;
alter table public.affiliate_products
  add constraint affiliate_products_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

create index if not exists idx_affiliate_products_project on public.affiliate_products (project_id);
