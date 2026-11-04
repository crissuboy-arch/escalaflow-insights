-- Minerar Ofertas — mídia durável. collected_ads.image_url/video_url hoje
-- guardam o link temporário do CDN da Apify/Facebook: quando expira, a
-- imagem/vídeo some (ver comentário em src/routes/_authenticated/minerar.tsx
-- datado de 2026-09-15, "URL signature expired"). Isto adiciona colunas pra
-- guardar a CÓPIA durável (bucket mining-media, já existente e público desde
-- 20260520100000_complete_persistence.sql, nunca usado até agora) sem tocar
-- nas colunas originais — image_url/video_url continuam a guardar a
-- referência original, como pedido.
--
-- Nenhuma linha existente perde dado: todas as ~200 ofertas já mineradas
-- entram como media_status='not_attempted' (default), nada é apagado.

alter table public.collected_ads
  add column if not exists image_storage_path text,
  add column if not exists video_storage_path text,
  add column if not exists media_status text not null default 'not_attempted',
  add column if not exists media_captured_at timestamptz,
  add column if not exists media_source text;

alter table public.collected_ads
  drop constraint if exists collected_ads_media_status_check;
alter table public.collected_ads
  add constraint collected_ads_media_status_check
  check (media_status in (
    'not_attempted', 'pending_video', 'image_copied', 'video_copied',
    'both_copied', 'expired', 'too_large_skipped', 'no_media'
  ));

create index if not exists idx_collected_ads_media_status
  on public.collected_ads (media_status);
