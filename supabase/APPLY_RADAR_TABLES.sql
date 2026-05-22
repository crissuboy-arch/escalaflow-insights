-- =============================================================================
-- EscalaFlow — Tabelas dos módulos Radar (TikTok, Instagram, Google, YouTube, Produtos)
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

-- ── google_trends_minerados ───────────────────────────────────────────────────
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
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists google_trends_user_id_idx on public.google_trends_minerados(user_id);
create unique index if not exists google_trends_keyword_user_idx on public.google_trends_minerados(user_id, keyword, geo);
alter table public.google_trends_minerados enable row level security;
drop policy if exists "users own google_trends_minerados" on public.google_trends_minerados;
create policy "users own google_trends_minerados"
  on public.google_trends_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── youtube_minerados ─────────────────────────────────────────────────────────
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
create index if not exists youtube_minerados_query_idx   on public.youtube_minerados(user_id, query);
create unique index if not exists youtube_minerados_video_user_idx on public.youtube_minerados(user_id, video_id);
alter table public.youtube_minerados enable row level security;
drop policy if exists "users own youtube_minerados" on public.youtube_minerados;
create policy "users own youtube_minerados"
  on public.youtube_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── produtos_minerados ────────────────────────────────────────────────────────
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
create index if not exists produtos_minerados_query_idx   on public.produtos_minerados(user_id, query);
create unique index if not exists produtos_minerados_product_user_idx on public.produtos_minerados(user_id, platform, product_id);
alter table public.produtos_minerados enable row level security;
drop policy if exists "users own produtos_minerados" on public.produtos_minerados;
create policy "users own produtos_minerados"
  on public.produtos_minerados for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- verificação
select tablename from pg_tables
where schemaname = 'public'
  and tablename in (
    'tiktok_minerados','instagram_minerados',
    'google_trends_minerados','youtube_minerados','produtos_minerados'
  )
order by tablename;
