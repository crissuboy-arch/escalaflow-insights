-- Persistent, atomic rate-limit primitive for the Cris OS <-> ScalaFlow
-- server-to-server mining bridge (POST /api/integrations/mining/run).
--
-- Reuses the existing, already-present-but-unused public.mining_runs table
-- (created in 20260520100000_complete_persistence.sql: user_id, type,
-- query, status, started_at, ...) instead of creating a new table — it
-- already has exactly the shape needed to record source ("type"), term
-- ("query") and the timestamp of the last execution ("started_at").
--
-- The in-memory Map rate limiter previously used by the bridge did not work
-- across Vercel serverless invocations (each request can land on a
-- different, memory-isolated instance). This function makes the
-- check-and-record atomic across instances via a transaction-scoped
-- Postgres advisory lock (pg_advisory_xact_lock): concurrent calls for the
-- SAME (type, query) serialize on the lock, so the "does a recent run
-- exist" check can never race with another call's insert.
create or replace function public.try_acquire_mining_bridge_lock(
  p_user_id uuid,
  p_type text,
  p_query text,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acquired boolean;
begin
  -- Serializes concurrent callers for this exact (type, query) pair.
  -- Released automatically when this transaction ends.
  perform pg_advisory_xact_lock(hashtextextended(p_type || ':' || p_query, 0));

  if exists (
    select 1
    from public.mining_runs
    where user_id = p_user_id
      and type = p_type
      and query = p_query
      and started_at > now() - make_interval(secs => p_window_seconds)
  ) then
    v_acquired := false;
  else
    insert into public.mining_runs (user_id, type, query, status)
    values (p_user_id, p_type, p_query, 'running');
    v_acquired := true;
  end if;

  return v_acquired;
end;
$$;

-- Only the service role (used by the bridge's server-side Supabase admin
-- client) should be able to call this — never anonymous/authenticated
-- browser clients.
revoke all on function public.try_acquire_mining_bridge_lock(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.try_acquire_mining_bridge_lock(uuid, text, text, integer) to service_role;
