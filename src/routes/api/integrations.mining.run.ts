// Server-to-server mining bridge for the Cris OS <-> ScalaFlow integration.
// Lets an external, always-on caller (Cris OS) trigger a mining run without
// a human's Supabase session — the normal /minerar UI flow keeps using its
// own requireSupabaseAuth-protected server functions unchanged.
//
// This route is a thin HTTP adapter: auth, rate limiting and dispatch all
// live in src/lib/integrations/mining-bridge.ts (plain, unit-tested
// functions), which itself reuses the EXACT SAME core logic the app's own
// mining server functions call — there is no second mining implementation,
// no new persistence path, and scoring is untouched.
//
// Auth: dedicated bearer secret (CRIS_OS_MINING_SECRET), never the app's own
// session tokens. Rows are attributed to a single, pre-configured ScalaFlow
// account (CRIS_OS_MINING_USER_ID) — never an invented/synthetic user id —
// because every mined-data table here is scoped by a real user_id column.
import { createFileRoute } from "@tanstack/react-router";
import {
  MiningBridgeBody,
  isAuthorized,
  acquireMiningBridgeLock,
  runMiningBridge,
} from "@/lib/integrations/mining-bridge";

export const Route = createFileRoute("/api/integrations/mining/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (
          !isAuthorized(request.headers.get("authorization"), process.env.CRIS_OS_MINING_SECRET)
        ) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = process.env.CRIS_OS_MINING_USER_ID;
        if (!userId) {
          return Response.json(
            { ok: false, error: "CRIS_OS_MINING_USER_ID não configurado" },
            { status: 500 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 });
        }

        const parsed = MiningBridgeBody.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
            { status: 400 },
          );
        }

        // Atomic check-and-record — the SAME (source, term) pair cannot pass
        // this twice within the window, even across concurrent serverless
        // invocations. Must happen BEFORE any call to the miner/Apify.
        const lock = await acquireMiningBridgeLock(parsed.data.source, parsed.data.term, userId);
        if (!lock.allowed) {
          return Response.json({ ok: false, error: lock.reason }, { status: 429 });
        }

        try {
          const result = await runMiningBridge(parsed.data, userId);
          return Response.json({
            ok: true,
            source: parsed.data.source,
            term: parsed.data.term,
            inserted: result.inserted,
            skipped: result.skipped,
            warning: result.warning,
          });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
            { status: 502 },
          );
        }
      },
    },
  },
});
