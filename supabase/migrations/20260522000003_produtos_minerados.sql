create table if not exists public.produtos_minerados (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  query             text not null,
  platform          text not null,
  product_id        text not null,
  title             text not null default '',
  price             numeric not null default 0,
  currency          text not null default 'BRL',
  original_price    numeric not null default 0,
  discount          int not null default 0,
  rating            numeric not null default 0,
  review_count      bigint not null default 0,
  sold_count        bigint not null default 0,
  seller            text not null default '',
  product_url       text not null default '',
  image_url         text not null default '',
  category          text not null default '',
  opportunity_score int not null default 0,
  ai_analysis       jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists produtos_minerados_user_id_idx on public.produtos_minerados(user_id);
create index if not exists produtos_minerados_query_idx  on public.produtos_minerados(user_id, query);
create unique index if not exists produtos_minerados_product_user_idx on public.produtos_minerados(user_id, platform, product_id);
alter table public.produtos_minerados enable row level security;
drop policy if exists "users own produtos_minerados" on public.produtos_minerados;
create policy "users own produtos_minerados"
  on public.produtos_minerados for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
