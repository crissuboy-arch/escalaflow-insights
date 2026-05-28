import { createFileRoute } from "@tanstack/react-router";
import { scrapeOfferPage } from "@/lib/scraper/playwright-scraper";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export const Route = createFileRoute("/api/scrape-offer")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json(
            { ok: false, error: "JSON inválido no body", code: "BAD_REQUEST" },
            { status: 400, headers: cors },
          );
        }

        const url = typeof body.url === "string" ? body.url.trim() : "";
        if (!url) {
          return Response.json(
            { ok: false, error: "Campo 'url' obrigatório", code: "BAD_REQUEST" },
            { status: 400, headers: cors },
          );
        }

        const timeoutMs = typeof body.timeout === "number"
          ? Math.min(Math.max(body.timeout, 5_000), 60_000)
          : 30_000;

        console.log(`[scrape-offer] url=${url} timeout=${timeoutMs}`);

        const result = await scrapeOfferPage(url, timeoutMs);

        const status = result.ok ? 200
          : result.code === "INVALID_URL" ? 400
          : result.code === "PRIVATE_PAGE" ? 403
          : result.code === "TIMEOUT" ? 408
          : 422;

        return Response.json(result, { status, headers: cors });
      },
    },
  },
});
