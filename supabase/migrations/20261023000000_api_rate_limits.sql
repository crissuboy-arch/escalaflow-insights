-- Generic, persistent, atomic rate-limit primitive for authenticated API
-- routes that trigger a cost-incurring action (src/routes/api/
-- execute-skill.ts, src/routes/api/scrape-offer.ts). Mirrors the exact
-- same pattern already proven for the Cris OS mining bridge
-- (20260924000000_mining_bridge_rate_limit.sql) — an in-memory Map does
-- not survive across Vercel serverless invocations (each request can land
-- on a different, memory-isolated instance), so the check-and-record step
-- must be atomic inside Postgres via a transaction-scoped advisory lock.
--
-- Unlike the mining bridge (which reused the existing mining_runs table),
-- these two routes have no existing table shaped for this, so a small
-- dedicated table is created here.
create table if not exists public.api_rate_limits (
  bucket text not null,
  identity text not null,
  window_start timestamptz not null default now(),
  count integer not null default 1,
  primary key (bucket, identity)
);

alter table public.api_rate_limits enable row level security;
-- No policies: only the service role (used server-side by the route
-- handlers' supabaseAdmin client) may touch this table — never
-- anonymous/authenticated browser clients directly.

create or replace function public.try_acquire_rate_limit(
  p_bucket text,
  p_identity text,
  p_window_seconds integer,
  p_max_calls integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_now timestamptz := now();
begin
  -- Serializes concurrent callers for this exact (bucket, identity) pair.
  -- Released automatically when this transaction ends.
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_identity, 0));

  select * into v_row from public.api_rate_limits
    where bucket = p_bucket and identity = p_identity;

  if v_row is null or v_row.window_start <= v_now - make_interval(secs => p_window_seconds) then
    insert into public.api_rate_limits (bucket, identity, window_start, count)
    values (p_bucket, p_identity, v_now, 1)
    on conflict (bucket, identity) do update
      set window_start = v_now, count = 1;
    return true;
  end if;

  if v_row.count >= p_max_calls then
    return false;
  end if;

  update public.api_rate_limits
    set count = count + 1
    where bucket = p_bucket and identity = p_identity;
  return true;
end;
$$;

revoke all on function public.try_acquire_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.try_acquire_rate_limit(text, text, integer, integer) to service_role;
