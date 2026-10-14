// Athena Control — aggregate stats (authenticated).
//
// Auth: Authorization: Bearer <SCALAFLOW_ATHENA_API_KEY>
// The key is EXCLUSIVE to the ScalaFlow <-> Athena Control integration:
// it is a dedicated env secret, never the app's session tokens, never
// Cris OS's mining secret, never a private_api_clients row.
//
// Returns real aggregate counts from the existing Supabase tables only.
// Demo rows (is_demo = true) are excluded. Zero PII, zero secrets.
import { createFileRoute } from "@tanstack/react-router";
import {
  bearerMatchesAthena,
  collectAthenaStats,
  ATHENA_API_KEY_ENV,
} from "@/lib/integrations/athena";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/integrations/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expected = process.env[ATHENA_API_KEY_ENV];
        if (!expected) {
          return Response.json(
            { ok: false, error: `${ATHENA_API_KEY_ENV} não configurado` },
            { status: 503 },
          );
        }
        if (!bearerMatchesAthena(request.headers.get("authorization"), expected)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        try {
          const stats = await collectAthenaStats(supabaseAdmin);
          return Response.json({ ok: true, ...stats });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "Falha ao consultar os indicadores." },
            { status: 500 },
          );
        }
      },
    },
  },
});
