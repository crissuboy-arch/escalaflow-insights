-- Fase 1 (central) — remote mission refs for intelligence_handoffs.
-- Additive only: no existing column, row, or policy is touched.
-- NOT APPLIED by this branch: apply with the normal migration flow BEFORE
-- deploying code that writes these columns (see docs/deploy-plan.md).
-- The service writes these columns in a separate best-effort upsert, so a
-- pending migration can never lose the base status row.
--
-- New local status value (no schema change needed — status is plain text):
--   NEEDS_REVIEW — receiver accepted the payload but requires human review.
--   It is a pending state, never a concluded one.

alter table public.intelligence_handoffs
  add column if not exists mission_id text,
  add column if not exists execution_id text,
  add column if not exists remote_status text,
  add column if not exists remote_refs jsonb,
  add column if not exists organization_id text;

-- Supports the Fase 1 user-scoped reads (list/load filtered by user_id).
create index if not exists idx_intelligence_handoffs_user
  on public.intelligence_handoffs (user_id);

comment on column public.intelligence_handoffs.mission_id is
  'Remote mission id returned by the receiver, when any. Never invented.';
comment on column public.intelligence_handoffs.execution_id is
  'Remote execution id returned by the receiver, when any. Never invented.';
comment on column public.intelligence_handoffs.remote_status is
  'Remote status string, surfaced verbatim. Never remapped to a local concluded state.';
comment on column public.intelligence_handoffs.remote_refs is
  'JSON: { review_url?, result_files?[{name,url}], received_at? } — only fields the receiver returned.';
comment on column public.intelligence_handoffs.organization_id is
  'ScalaFlow-internal org scope (SCALAFLOW_ORGANIZATION_ID). Null = single-tenant today; multi-org is a future phase, not faked.';
