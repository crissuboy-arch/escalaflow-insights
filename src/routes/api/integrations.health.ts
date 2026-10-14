// Athena Control — health check (public).
// Lets Athena verify the integration is reachable without credentials.
import { createFileRoute } from "@tanstack/react-router";
import { ATHENA_PLATFORM, ATHENA_CONTRACT_VERSION } from "@/lib/integrations/athena";

export const Route = createFileRoute("/api/integrations/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          platform: ATHENA_PLATFORM,
          status: "operational",
          contract: ATHENA_CONTRACT_VERSION,
          endpoints: ["/api/integrations/health", "/api/integrations/stats"],
        });
      },
    },
  },
});
