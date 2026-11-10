-- Facebook Viral Importer + Viral Remix Studio — schema aditivo.
-- Não toca em collected_ads, private_api_clients, intelligence_handoffs,
-- nem em nenhuma tabela/miner existente.
--
-- Todas as tabelas são por-utilizador (RLS user_id = auth.uid()), ao
-- contrário de collected_ads (pool partilhado de leitura pública): aqui é
-- trabalho próprio/estratégico do utilizador, não inteligência de mercado
-- partilhada.
--
-- Fase 6 (fora deste ficheiro): nenhuma API externa (Gemini, geração de
-- vídeo, Graph API) é chamada por este schema. model_used/raw_response em
-- viral_analyses aceitam 'manual' e NULL de propósito, para a Fase 4
-- funcionar inteiramente por preenchimento humano.

-- 1. Páginas do Facebook guardadas (biblioteca, organizada por nicho/pasta)
create table if not exists public.viral_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_url text not null,
  page_name text,
  country text,
  language text,
  niche text,
  folder text,
  followers integer,              -- manual quando a Meta não expõe
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_url)
);
create index if not exists idx_viral_pages_user on public.viral_pages (user_id, created_at desc);
create index if not exists idx_viral_pages_niche on public.viral_pages (user_id, niche);

-- 2. Reels/publicações guardados (só referência — nunca descarrega vídeo de terceiros)
create table if not exists public.viral_reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viral_page_id uuid references public.viral_pages(id) on delete set null,
  reel_url text not null,
  link_type text not null default 'reel',   -- 'page' | 'post' | 'reel'
  views bigint,                              -- manual
  published_at timestamptz,                  -- manual
  product_promoted text,
  affiliate_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reel_url)
);
create index if not exists idx_viral_reels_user on public.viral_reels (user_id, created_at desc);
create index if not exists idx_viral_reels_page on public.viral_reels (viral_page_id);

-- 3. Avatares próprios (personagem/rosto do utilizador para os roteiros)
create table if not exists public.viral_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image_path text,   -- caminho dentro do bucket privado viral-media
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_viral_avatars_user on public.viral_avatars (user_id);

-- 4. Produtos de afiliado (ClickBank, Digistore24, etc.)
create table if not exists public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  network text not null default 'other',   -- 'clickbank' | 'digistore24' | 'other'
  product_name text not null,
  commission text,
  affiliate_link text not null,
  sales_page_url text,
  niche text,
  target_audience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_affiliate_products_user on public.affiliate_products (user_id, created_at desc);

alter table public.viral_pages add column if not exists affiliate_product_id uuid references public.affiliate_products(id) on delete set null;
alter table public.viral_reels add column if not exists affiliate_product_id uuid references public.affiliate_products(id) on delete set null;

-- 5. Vídeos próprios/licenciados carregados (material-fonte do remix)
create table if not exists public.viral_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viral_reel_id uuid references public.viral_reels(id) on delete set null,
  storage_path text not null,       -- bucket privado viral-media
  thumbnail_path text,
  upload_source text not null default 'own',   -- 'own' | 'licensed'
  license_note text,                -- preenchido na UI quando upload_source = 'licensed'
  duration_seconds numeric,          -- extraído no cliente (<video>), sem FFmpeg
  width integer,
  height integer,
  status text not null default 'uploaded',   -- uploaded | analyzing | analyzed | failed
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_viral_videos_user on public.viral_videos (user_id, created_at desc);
create index if not exists idx_viral_videos_reel on public.viral_videos (viral_reel_id);

-- 6. Resultado da análise (1:1 com viral_videos). Fase 1-5: preenchido à mão
-- pelo utilizador (model_used = 'manual'). Fase 6 poderá preencher via Gemini,
-- sem alterar esta tabela.
create table if not exists public.viral_analyses (
  id uuid primary key default gen_random_uuid(),
  viral_video_id uuid not null references public.viral_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hook_text text,
  narrative_structure jsonb not null default '{}'::jsonb,
  scene_breakdown jsonb not null default '[]'::jsonb,
  pacing_notes text,
  cta_notes text,
  why_it_works text,
  model_used text not null default 'manual',
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (viral_video_id)
);
create index if not exists idx_viral_analyses_user on public.viral_analyses (user_id);

-- 7. Roteiros originais (escritos à mão nas Fases 1-5)
create table if not exists public.viral_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viral_analysis_id uuid references public.viral_analyses(id) on delete set null,
  viral_avatar_id uuid references public.viral_avatars(id) on delete set null,
  affiliate_product_id uuid references public.affiliate_products(id) on delete set null,
  title text,
  language text not null default 'en-US',   -- 'en-US' | 'es'
  script_text text not null default '',
  status text not null default 'draft',     -- draft | clips_ready | exported
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_viral_scripts_user on public.viral_scripts (user_id, created_at desc);

-- 8. Divisão em clipes de 8s + prompts Google Flow (escritos/editados à mão)
create table if not exists public.viral_script_clips (
  id uuid primary key default gen_random_uuid(),
  viral_script_id uuid not null references public.viral_scripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clip_index integer not null,
  duration_seconds integer not null default 8,
  clip_text text not null default '',
  prompt_text text not null default '',
  aspect_ratio text not null default '9:16',
  flow_video_url text,              -- preenchido manualmente após gerar no Flow
  status text not null default 'draft',   -- draft | copied | imported
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (viral_script_id, clip_index)
);
create index if not exists idx_viral_script_clips_script on public.viral_script_clips (viral_script_id, clip_index);

-- RLS: todas as tabelas, dono apenas (select/insert/update/delete).
alter table public.viral_pages enable row level security;
alter table public.viral_reels enable row level security;
alter table public.viral_avatars enable row level security;
alter table public.affiliate_products enable row level security;
alter table public.viral_videos enable row level security;
alter table public.viral_analyses enable row level security;
alter table public.viral_scripts enable row level security;
alter table public.viral_script_clips enable row level security;

drop policy if exists "viral_pages: owner full access" on public.viral_pages;
create policy "viral_pages: owner full access" on public.viral_pages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viral_reels: owner full access" on public.viral_reels;
create policy "viral_reels: owner full access" on public.viral_reels
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viral_avatars: owner full access" on public.viral_avatars;
create policy "viral_avatars: owner full access" on public.viral_avatars
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "affiliate_products: owner full access" on public.affiliate_products;
create policy "affiliate_products: owner full access" on public.affiliate_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viral_videos: owner full access" on public.viral_videos;
create policy "viral_videos: owner full access" on public.viral_videos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viral_analyses: owner full access" on public.viral_analyses;
create policy "viral_analyses: owner full access" on public.viral_analyses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viral_scripts: owner full access" on public.viral_scripts;
create policy "viral_scripts: owner full access" on public.viral_scripts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viral_script_clips: owner full access" on public.viral_script_clips;
create policy "viral_script_clips: owner full access" on public.viral_script_clips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage: bucket PRIVADO dedicado (não reutiliza mining-media, que é público).
insert into storage.buckets (id, name, public)
values ('viral-media', 'viral-media', false)
on conflict (id) do nothing;

drop policy if exists "viral-media: owner read" on storage.objects;
create policy "viral-media: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'viral-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "viral-media: owner upload" on storage.objects;
create policy "viral-media: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'viral-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "viral-media: owner update" on storage.objects;
create policy "viral-media: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'viral-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "viral-media: owner delete" on storage.objects;
create policy "viral-media: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'viral-media' and (storage.foldername(name))[1] = auth.uid()::text);
