alter table public.tiktok_minerados
  add column if not exists thumbnail_url text not null default '';
