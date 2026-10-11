-- Private, authenticated intelligence query API for external callers
-- (e.g. an ad-creation platform) — read-only access to ad intelligence
-- ScalaFlow already collected (collected_ads + the four *_minerados
-- tables). Does NOT touch any miner/collector table or logic.
--
-- No existing registry distinguishes an external API caller ("client")
-- from a ScalaFlow Supabase user, so this adds exactly one minimal table
-- for that identity + per-client cost limit. Service-role only (RLS
-- enabled, no policies), mirroring intelligence_handoffs.
create table if not exists public.private_api_clients (
  id uuid primary key default gen_random_uuid(),
  client_key text not null unique,
  -- sha256 hex of the real secret. The plaintext secret is never stored —
  -- only ever shown once at creation time, same spirit as CRIS_OS_MINING_SECRET.
  secret_hash text not null,
  display_name text not null,
  -- Which ScalaFlow account's stored data this client may read. Required:
  -- every queried table (collected_ads, *_minerados) is scoped by user_id,
  -- so a client can never see another account's data.
  attributed_user_id uuid not null references auth.users(id),
  -- NULL = not configured => paid/fresh queries are blocked (fail closed).
  -- This table never records Apify spend itself; it only gates whether a
  -- fresh paid query may be attempted at all.
  cost_limit_cents integer,
  cost_used_cents integer not null default 0,
  status text not null default 'active', -- active | disabled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_private_api_clients_key on public.private_api_clients (client_key);

alter table public.private_api_clients enable row level security;
-- No policies: only the service-role server-side client reads/writes this.
