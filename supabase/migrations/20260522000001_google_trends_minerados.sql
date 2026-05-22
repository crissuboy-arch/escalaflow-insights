create table if not exists public.google_trends_minerados (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  keyword         text not null,
  geo             text not null default 'BR',
  timeframe       text not null default 'today 3-m',
  avg_interest    int not null default 0,
  peak_interest   int not null default 0,
  trend           text not null default 'stable',
  related_queries text[] not null default '{}',
  related_topics  text[] not null default '{}',
  points          jsonb,
  ai_analysis     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists google_trends_user_id_idx on public.google_trends_minerados(user_id);
create unique index if not exists google_trends_kw_geo_idx on public.google_trends_minerados(user_id, keyword, geo);
alter table public.google_trends_minerados enable row level security;
drop policy if exists "users own google_trends_minerados" on public.google_trends_minerados;
create policy "users own google_trends_minerados"
  on public.google_trends_minerados for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
