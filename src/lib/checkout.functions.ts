import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiGenerateCheckoutOffer,
  CheckoutOfferSchema,
  briefingToCheckoutCtx,
  type CheckoutContext,
} from "./checkout.server";
import { StandaloneBriefingSchema } from "./standalone/briefing";
import { recordAi } from "./ai/history.server";

const InputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("project"), projectId: z.string().uuid() }),
  z.object({ kind: z.literal("standalone"), briefing: StandaloneBriefingSchema }),
]);

export const generateCheckoutOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof InputSchema>) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let ctx: CheckoutContext;
    let projectRow: { id: string; meta: Record<string, unknown> } | null = null;

    if (data.kind === "project") {
      const { data: row, error } = await supabase
        .from("projects")
        .select("id, title, niche, briefing, meta")
        .eq("id", data.projectId)
        .eq("user_id", userId)
        .single();
      if (error) throw new Error(error.message);
      projectRow = { id: row.id as string, meta: (row.meta ?? {}) as Record<string, unknown> };
      const b = (row.briefing ?? {}) as Record<string, unknown>;
      const checkoutMeta = (projectRow.meta.checkout ?? {}) as Record<string, unknown>;
      ctx = {
        productName: (b.title as string) || (row.title as string) || "Produto",
        productType: (b.type as string) || "infoproduto",
        description: (b.subtitle as string) || "",
        niche: (row.niche as string) || (b.niche as string) || "",
        audience: (b.avatar as string) || "",
        promise: (b.promise as string) || "",
        price: (checkoutMeta.price as string) || (b.price as string) || "",
      };
    } else {
      ctx = briefingToCheckoutCtx(data.briefing);
    }

    const offer = await aiGenerateCheckoutOffer(ctx);

    if (projectRow) {
      const prevCheckout = (projectRow.meta.checkout ?? {}) as Record<string, unknown>;
      const meta = {
        ...projectRow.meta,
        checkout: { ...prevCheckout, offer },
      };
      await supabase
        .from("projects")
        .update({ meta: meta as never })
        .eq("id", projectRow.id);
      await recordAi(supabase, userId, {
        projectId: projectRow.id,
        module: "checkout",
        prompt: ctx,
        response: offer,
      });
    } else {
      await recordAi(supabase, userId, {
        module: "checkout",
        prompt: ctx,
        response: offer,
      });
    }

    return { offer: CheckoutOfferSchema.parse(offer) };
  });