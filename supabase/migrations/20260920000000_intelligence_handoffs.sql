-- Status tracking for ScalaFlow -> Cris OS intelligence handoffs (Fase 9
-- closure). Additive only: does not touch any mining table/schema.
-- Server-side only (service role) — no client ever reads or writes this
-- directly, so RLS is enabled with no policies (default deny).

create table if not exists public.intelligence_handoffs (
  id            uuid primary key default gen_random_uuid(),
  handoff_id    text not null unique,
  source_table  text not null,
  source_id     text not null,
  user_id       uuid references auth.users(id) on delete set null,
  status        text not null default 'NOT_SENT', -- NOT_SENT | SENDING | SENT | FAILED
  attempts      int not null default 0,
  last_error    text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_intelligence_handoffs_source
  on public.intelligence_handoffs (source_table, source_id);

alter table public.intelligence_handoffs enable row level security;
