import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  StrategicInputSchema,
  generateStrategicCore,
  generateScorecard,
  generateOfferStack,
  generateVSLScript,
  generateFunnelMap,
  generateCreativeAngles,
  generateScaleStrategy,
} from "./strategic-ai-engine";

export const generateFullStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StrategicInputSchema.parse(d))
  .handler(async ({ data }) => {
    // Generate everything in parallel (or sequential if needed)
    // For now, let's do parallel
    const [core, scorecard, offerStack, vsl, funnel, creatives, scale] = await Promise.all([
      generateStrategicCore(data),
      generateScorecard(data),
      generateOfferStack(data),
      generateVSLScript(data),
      generateFunnelMap(data),
      generateCreativeAngles(data),
      generateScaleStrategy(data),
    ]);

    return {
      core,
      scorecard,
      offerStack,
      vsl,
      funnel,
      creatives,
      scale,
    };
  });
