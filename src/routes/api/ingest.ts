// Public ingest endpoint for the Chrome extension.
// In demo mode this endpoint is a no-op stub: it accepts payloads and replies with
// "demo mode" so the extension can be developed against a stable contract while
// the real backend (Supabase / Convex / external API) is not connected yet.
//
// The contract is intentionally simple — POST JSON, get JSON back.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        let body: unknown = null;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400, headers: { "access-control-allow-origin": "*" } },
          );
        }
        const items = Array.isArray(body) ? body : [body];
        // Demo mode: we don't persist server-side yet. The extension should
        // also send via window.postMessage, which the web app stores locally.
        return Response.json(
          {
            ok: true,
            mode: "demo",
            received: items.length,
            note: "Persistência server-side será habilitada quando o backend for conectado.",
          },
          { status: 202, headers: { "access-control-allow-origin": "*" } },
        );
      },
    },
  },
});
