-- Biblioteca de Ofertas — recuperação de falhas da cópia durável de mídia.
-- Aditiva e idempotente: nenhuma coluna/linha existente é alterada ou apagada.
-- Sem esta migration o pipeline (src/lib/collector/media-pipeline.ts) continua
-- a funcionar, mas sem retry com backoff para falhas transitórias de rede.
alter table public.collected_ads
  add column if not exists media_attempts integer not null default 0,
  add column if not exists media_last_attempt_at timestamptz,
  add column if not exists media_last_error text;

create index if not exists idx_collected_ads_media_queue
  on public.collected_ads (media_status, last_seen_at desc);

-- Garante o bucket público usado pela biblioteca (já criado em
-- 20260520100000_complete_persistence.sql; repetido aqui só por segurança).
insert into storage.buckets (id, name, public)
values ('mining-media', 'mining-media', true)
on conflict (id) do nothing;
