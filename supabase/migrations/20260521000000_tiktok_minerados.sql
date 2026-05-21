create table if not exists public.tiktok_minerados (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  hashtag     text not null,
  video_id    text not null,
  creator     text not null default '',
  video_url   text not null default '',
  hook        text not null default '',
  hashtags    text[] not null default '{}',
  views       bigint not null default 0,
  likes       bigint not null default 0,
  comments    bigint not null default 0,
  shares      bigint not null default 0,
  audio_title text not null default '',
  viral_score int not null default 0,
  description text not null default '',
  create_time text,
  ai_analysis jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists tiktok_minerados_user_id_idx  on public.tiktok_minerados(user_id);
create index if not exists tiktok_minerados_hashtag_idx  on public.tiktok_minerados(user_id, hashtag);
create unique index if not exists tiktok_minerados_video_user_idx on public.tiktok_minerados(user_id, video_id);

alter table public.tiktok_minerados enable row level security;

create policy "users own tiktok_minerados"
  on public.tiktok_minerados
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
