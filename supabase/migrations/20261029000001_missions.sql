-- Missions ledger (Fase 3/5). Additive only: does not touch any existing
-- table, including intelligence_handoffs. NOT APPLIED — file only, until
-- the owner authorizes a migration run. Deploy order (see
-- docs/plano-deploy.md): apply this migration BEFORE any code that writes
-- the missions table; the Fase 1–4 code does not write it yet, so the
-- migration is safe to apply independently at any time.
-- Server-side only (service role) — no client ever reads or writes this
-- directly, so RLS is enabled with no policies (default deny), the same
-- pattern as intelligence_handoffs.
-- Status values mirror the internal mission contract
-- (src/lib/missions/contract.ts): NOT_SENT | SENDING | SENT |
-- NEEDS_REVIEW | RUNNING | COMPLETED | FAILED | CANCELLED.
-- NEEDS_REVIEW is pending, never concluded; COMPLETED requires real
-- file_refs (enforced by the app layer, not by a CHECK, because refs
-- arrive asynchronously from polling).

create table if not exists public.missions (
  id              uuid primary key default gen_random_uuid(),
  mission_id      text not null unique, -- msn_ + sha256, deterministic
  user_id         uuid references auth.users(id) on delete set null,
  organization_id text, -- single-tenant today: SCALAFLOW_ORGANIZATION_ID or null
  project_id      text, -- legacy ScalaFlow project id, when known
  handoff_id      text, -- correlation with intelligence_handoffs, when derived
  execution_id    text, -- remote execution id, when the receiver returns one
  tool            text not null, -- see TASK_TYPES in contract.ts
  task_type       text not null,
  briefing        text not null,
  params          jsonb not null default '{}'::jsonb,
  status          text not null default 'NOT_SENT',
  attempts        int not null default 0,
  last_error      text,
  file_refs       jsonb not null default '[]'::jsonb, -- [{name, url}]
  approval        jsonb, -- {state: NONE|PENDING|APPROVED|REJECTED, source, decidedAt}
  result          jsonb, -- structured result, only when returned by the tool
  receipt         jsonb, -- {idempotencyKey, sentAt, channel, remoteIds}
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_missions_handoff_id
  on public.missions (handoff_id);
create index if not exists idx_missions_user_id
  on public.missions (user_id);
create index if not exists idx_missions_tool_status
  on public.missions (tool, status);

alter table public.missions enable row level security;
