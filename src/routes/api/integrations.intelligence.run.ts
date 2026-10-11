// Private intelligence query API — a single authenticated dispatch
// endpoint exposing six read-only tools (search_ads, get_ad_details,
// get_ad_creatives, get_ad_evidence, get_saved_offers,
// create_adaptation_brief) over ad intelligence ScalaFlow already
// collected. Mirrors the mining bridge's pattern (thin HTTP adapter over
// plain functions in src/lib/integrations/intelligence-api.ts). Never
// touches miners/collectors, Cris OS, or Athena.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  authenticatePrivateApiClient,
  searchAds,
  getAdDetails,
  getAdCreatives,
  getAdEvidence,
  getSavedOffers,
  createAdaptationBrief,
  SEARCH_SOURCES,
} from "@/lib/integrations/intelligence-api";

const SourceSchema = z.enum(SEARCH_SOURCES);

const ToolRequestSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("search_ads"),
    params: z.object({
      source: SourceSchema,
      country: z.string().optional(),
      niche: z.string().optional(),
      keyword: z.string().optional(),
      platform: z.string().optional(),
      creativeType: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  }),
  z.object({
    tool: z.literal("get_ad_details"),
    params: z.object({ id: z.string().min(1), source: SourceSchema }),
  }),
  z.object({
    tool: z.literal("get_ad_creatives"),
    params: z.object({ id: z.string().min(1), source: SourceSchema }),
  }),
  z.object({
    tool: z.literal("get_ad_evidence"),
    params: z.object({ id: z.string().min(1), source: SourceSchema }),
  }),
  z.object({
    tool: z.literal("get_saved_offers"),
    params: z.object({}).optional(),
  }),
  z.object({
    tool: z.literal("create_adaptation_brief"),
    params: z.object({
      sourceAdId: z.string().min(1),
      source: SourceSchema,
      clientProduct: z.object({
        name: z.string().min(1),
        niche: z.string().optional(),
        description: z.string().optional(),
      }),
    }),
  }),
]);

export const Route = createFileRoute("/api/integrations/intelligence/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const client = await authenticatePrivateApiClient(request.headers.get("authorization"));
        if (!client) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 });
        }

        const parsed = ToolRequestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
            { status: 400 },
          );
        }

        try {
          const { tool, params } = parsed.data;
          switch (tool) {
            case "search_ads":
              return Response.json({ ok: true, tool, result: await searchAds(params, client) });
            case "get_ad_details":
              return Response.json({
                ok: true,
                tool,
                result: await getAdDetails(params.id, params.source, client),
              });
            case "get_ad_creatives":
              return Response.json({
                ok: true,
                tool,
                result: await getAdCreatives(params.id, params.source, client),
              });
            case "get_ad_evidence":
              return Response.json({
                ok: true,
                tool,
                result: await getAdEvidence(params.id, params.source, client),
              });
            case "get_saved_offers":
              return Response.json({ ok: true, tool, result: await getSavedOffers(client) });
            case "create_adaptation_brief":
              return Response.json({
                ok: true,
                tool,
                result: await createAdaptationBrief(params, client),
              });
          }
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
