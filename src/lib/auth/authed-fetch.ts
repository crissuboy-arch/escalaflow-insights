// Client-side fetch wrapper that attaches the current Supabase session as
// an Authorization bearer header. Used by the browser-side callers of
// plain HTTP API routes (src/routes/api/*.ts) that now require a logged-in
// session: SkillButton, SkillExecuteModal, minerador-publico. This mirrors
// the same "attach the session token" step requireSupabaseAuth's `.client()`
// does for server functions (src/integrations/supabase/auth-middleware.ts),
// but as a plain fetch() helper since these routes are not server functions.
import { supabase } from "@/integrations/supabase/client";

export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, { ...init, headers });
}
