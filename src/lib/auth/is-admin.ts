// Checks the real, already-existing roles infrastructure
// (public.app_role / public.user_roles, created in supabase/migrations/
// 20260506131623_...sql) — it exists in the database but, until now, was
// never read by any part of the application.
//
// public.has_role() (a SECURITY DEFINER Postgres function) is explicitly
// REVOKED from authenticated/anon (see 20260506131712_...sql:4) — it is
// reserved for use inside other RLS policies, not for the app to call via
// RPC. The app-facing way to check a role is the one RLS policy that IS
// granted: "users view own roles" (SELECT USING auth.uid() = user_id),
// so this reads user_roles directly instead.
//
// Works with either the RLS-respecting anon+JWT client (context.supabase
// inside a server function, via requireSupabaseAuth) or the browser
// client (@/integrations/supabase/client) — both enforce the same RLS
// policy, so a user can only ever see their OWN role rows either way.
//
// user_roles isn't in the generated Supabase types yet (same gap already
// documented for several radar tables, e.g. src/lib/google-radar.
// functions.ts's trendsTable()) — same `as any` workaround here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isAdmin(supabase: any, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return data != null;
}
