create table if not exists public.youtube_minerados (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  query         text not null,
  video_id      text not null,
  title         text not null default '',
  channel_name  text not null default '',
  channel_id    text not null default '',
  video_url     text not null default '',
  description   text not null default '',
  hashtags      text[] not null default '{}',
  views         bigint not null default 0,
  likes         bigint not null default 0,
  comments      bigint not null default 0,
  duration      text not null default '',
  is_short      boolean not null default false,
  published_at  text,
  thumbnail_url text not null default '',
  viral_score   int not null default 0,
  ai_analysis   jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists youtube_minerados_user_id_idx on public.youtube_minerados(user_id);
create index if not exists youtube_minerados_query_idx  on public.youtube_minerados(user_id, query);
create unique index if not exists youtube_minerados_video_user_idx on public.youtube_minerados(user_id, video_id);
alter table public.youtube_minerados enable row level security;
drop policy if exists "users own youtube_minerados" on public.youtube_minerados;
create policy "users own youtube_minerados"
  on public.youtube_minerados for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
