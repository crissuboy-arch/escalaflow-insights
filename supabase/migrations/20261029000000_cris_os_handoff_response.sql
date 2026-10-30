-- Persist the receiver's real decision and project reference separately
-- from the local transport state (SENT only means the HTTP request was accepted).
alter table public.intelligence_handoffs
  add column if not exists remote_status text,
  add column if not exists remote_project_id text,
  add column if not exists remote_response jsonb;

comment on column public.intelligence_handoffs.status is
  'Local transport state: NOT_SENT, SENDING, SENT, FAILED.';
comment on column public.intelligence_handoffs.remote_status is
  'Status returned by Cris OS, e.g. PERSISTED, DUPLICATE, NEEDS_REVIEW, REJECTED.';
