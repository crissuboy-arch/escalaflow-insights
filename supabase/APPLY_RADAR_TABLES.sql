-- =============================================================================
-- EscalaFlow — Tabelas dos módulos Radar TikTok e Radar Instagram
-- Cole no SQL Editor do Supabase e execute (é idempotente):
-- https://supabase.com/dashboard/project/jcaepmxjbrkgyyofhvxv/editor
-- =============================================================================

-- ── tiktok_minerados ──────────────────────────────────────────────────────────
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
create index if not exists tiktok_minerados_user_id_idx on public.tiktok_minerados(user_id);
create index if not exists tiktok_minerados_hashtag_idx on public.tiktok_minerados(user_id, hashtag);
create unique index if not exists tiktok_minerados_video_user_idx on public.tiktok_minerados(user_id, video_id);
alter table public.tiktok_minerados enable row level security;
drop policy if exists "users own tiktok_minerados" on public.tiktok_minerados;
create policy "users own tiktok_minerados"
  on public.tiktok_minerados for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── instagram_minerados ───────────────────────────────────────────────────────
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
drop policy if exists "users own instagram_minerados" on public.instagram_minerados;
create policy "users own instagram_minerados"
  on public.instagram_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- verificação
select tablename from pg_tables where schemaname = 'public' and tablename in ('tiktok_minerados','instagram_minerados');
