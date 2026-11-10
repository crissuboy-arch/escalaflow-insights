-- Histórico diário de atividade de cada anúncio (gráfico "Evolução de anúncios").
-- Um registo por anúncio por dia, com o número real devolvido pela Biblioteca
-- de Anúncios (collation_count) e se estava ativo. É gravado sempre que o
-- anúncio é coletado/re-coletado — o histórico cresce com o uso, nunca é
-- inventado nem preenchido retroativamente. Aditiva: não altera tabelas existentes.
create table if not exists public.ad_activity_snapshots (
  ad_id uuid not null references public.collected_ads(id) on delete cascade,
  snapshot_date date not null default (now() at time zone 'utc')::date,
  active_ads integer,
  is_active boolean,
  captured_at timestamptz not null default now(),
  primary key (ad_id, snapshot_date)
);

create index if not exists idx_ad_activity_snapshots_date
  on public.ad_activity_snapshots (snapshot_date desc);

alter table public.ad_activity_snapshots enable row level security;

-- Leitura só para utilizadores autenticados; escrita só pelo servidor (service role).
drop policy if exists "ad_activity_snapshots read authenticated" on public.ad_activity_snapshots;
create policy "ad_activity_snapshots read authenticated"
  on public.ad_activity_snapshots for select to authenticated using (true);
