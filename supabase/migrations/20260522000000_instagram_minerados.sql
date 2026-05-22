create table if not exists public.instagram_minerados (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  search           text not null,
  search_type      text not null default 'hashtag',
  results_type     text not null default 'posts',
  short_code       text not null,
  post_url         text not null default '',
  caption          text not null default '',
  hashtags         text[] not null default '{}',
  mentions         text[] not null default '{}',
  comments_count   bigint not null default 0,
  likes_count      bigint not null default 0,
  owner_username   text not null default '',
  owner_full_name  text not null default '',
  display_url      text not null default '',
  engagement_score int not null default 0,
  raw              jsonb,
  ai_analysis      jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists instagram_minerados_user_id_idx on public.instagram_minerados(user_id);
create index if not exists instagram_minerados_search_idx  on public.instagram_minerados(user_id, search);
create unique index if not exists instagram_minerados_post_user_idx on public.instagram_minerados(user_id, short_code);

alter table public.instagram_minerados enable row level security;

create policy "users own instagram_minerados"
  on public.instagram_minerados
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
