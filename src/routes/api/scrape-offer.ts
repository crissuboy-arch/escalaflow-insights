import { createFileRoute } from "@tanstack/react-router";
import { scrapeOfferPage } from "@/lib/scraper/playwright-scraper";
import { requireUserFromRequest } from "@/lib/auth/require-user-from-request";
import { tryAcquireRateLimit } from "@/lib/integrations/rate-limit";

// Only called from inside _authenticated/minerador-publico.tsx via
// authedFetch — never by the browser extension or any external caller.
// Previously open with no auth and CORS "*", which let anyone trigger a
// real Playwright page load (and, via SSRF, probe internal network
// addresses) anonymously. Same-origin only now, so no CORS headers are
// needed.
const RATE_LIMIT_BUCKET = "scrape-offer";
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_CALLS = 5;

export const Route = createFileRoute("/api/scrape-offer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUserFromRequest(request);
        if (!auth) {
          return Response.json(
            { ok: false, error: "Não autenticado", code: "UNAUTHORIZED" },
            { status: 401 },
          );
        }

        const rateLimit = await tryAcquireRateLimit(
          RATE_LIMIT_BUCKET,
          auth.userId,
          RATE_LIMIT_WINDOW_SECONDS,
          RATE_LIMIT_MAX_CALLS,
        );
        if (!rateLimit.allowed) {
          return Response.json(
            { ok: false, error: rateLimit.reason, code: "RATE_LIMITED" },
            { status: 429 },
          );
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json(
            { ok: false, error: "JSON inválido no body", code: "BAD_REQUEST" },
            { status: 400 },
          );
        }

        const url = typeof body.url === "string" ? body.url.trim() : "";
        if (!url) {
          return Response.json(
            { ok: false, error: "Campo 'url' obrigatório", code: "BAD_REQUEST" },
            { status: 400 },
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
          : result.code === "BLOCKED" ? 403
          : result.code === "TIMEOUT" ? 408
          : 422;

        return Response.json(result, { status });
      },
    },
  },
});
