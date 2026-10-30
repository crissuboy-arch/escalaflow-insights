// Validates a ScalaFlow user session for plain HTTP API routes
// (src/routes/api/*.ts, defined as createFileRoute(...).server.handlers).
//
// Those routes receive a raw Request — they are NOT TanStack Start server
// functions, so the existing requireSupabaseAuth middleware (src/
// integrations/supabase/auth-middleware.ts, auto-generated, "Do not edit it
// directly") does not apply to them. This module replicates the exact same
// validation that middleware's `.server()` step performs (anon-key client +
// Authorization bearer + supabase.auth.getClaims), kept here as a small,
// independently testable function instead of duplicating it inside each
// route file.
//
// Returns null (never throws) on any failure so callers can decide the
// HTTP status/response shape themselves.
import { createClient } from "@supabase/supabase-js";

export interface RequestUser {
  userId: string;
  accessToken: string;
}

export async function requireUserFromRequest(request: Request): Promise<RequestUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  return { userId: data.claims.sub, accessToken: token };
}
