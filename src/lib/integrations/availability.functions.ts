// Integration availability (Fase 2) — the panel's dynamic state for the
// one integration that is configurable today (Cris OS) and for the
// prepared ones. It returns ONLY booleans about env presence — never
// secret values, never lengths, never prefixes. The panel combines these
// booleans with the static registry (state PREPARADO etc.) so it never
// claims a tool is live just because a variable exists: env presence is
// "configurado", liveness still needs a real health check (Fase 5).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface IntegrationAvailability {
  crisOs: boolean;
  toolsHub: boolean;
  pinkLogic: boolean;
  pageForge: boolean;
  metaAds: boolean;
}

const has = (name: string): boolean => {
  const raw = process.env[name]?.trim();
  return !!raw;
};

export const getIntegrationAvailabilityFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<IntegrationAvailability> => {
    return {
      crisOs: has("CRIS_OS_API_URL") && has("CRIS_OS_INTEGRATION_TOKEN"),
      toolsHub: has("TOOLS_HUB_BASE_URL") && has("TOOLS_HUB_API_KEY"),
      pinkLogic: has("PINK_LOGIC_BASE_URL") && has("PINK_LOGIC_SERVICE_KEY"),
      pageForge: has("PAGEFORGE_BASE_URL"),
      metaAds: has("META_ADS_BASE_URL"),
    };
  });
