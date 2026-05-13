import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiGenerateSalesPage,
  buildExternalPrompts,
  SalesPageSchema,
  type PageContext,
} from "./sales-page.server";
import { StandaloneBriefingSchema } from "./standalone/briefing";
import { seedFromModule } from "./project/seeding.server";
import { recordAi } from "./ai/history.server";
import { dlog } from "./debug/log.server";

const InputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("project"), projectId: z.string().uuid() }),
  z.object({ kind: z.literal("standalone"), briefing: StandaloneBriefingSchema }),
]);

export const generateSalesPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof InputSchema>) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let ctx: PageContext;
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
      const copy = (projectRow.meta.copy ?? {}) as Record<string, unknown>;
      ctx = {
        productName: (b.title as string) || (row.title as string) || "Produto",
        productType: (b.type as string) || "infoproduto",
        description: (b.subtitle as string) || "",
        niche: (row.niche as string) || (b.niche as string) || "",
        audience: (b.avatar as string) || "",
        promise: (copy.promise as string) || (b.promise as string) || "",
        uniqueMechanism:
          (copy.uniqueMechanism as string) || (b.uniqueMechanism as string) || "",
        pains: Array.isArray(b.pains) ? (b.pains as string[]) : [],
        desires: Array.isArray(b.desires) ? (b.desires as string[]) : [],
      };
    } else {
      ctx = { ...data.briefing };
    }

    const page = await aiGenerateSalesPage(ctx);
    const prompts = buildExternalPrompts(page, ctx);

    if (projectRow) {
      const meta = { ...projectRow.meta, salesPage: { page, prompts } };
      dlog("persist", "salesPage.save", { projectId: projectRow.id, metaKey: "salesPage" });
      await supabase
        .from("projects")
        .update({ meta: meta as never })
        .eq("id", projectRow.id);
      await seedFromModule(supabase, userId, projectRow.id, "salesPage", { page });
      await recordAi(supabase, userId, {
        projectId: projectRow.id,
        module: "salesPage",
        prompt: ctx,
        response: page,
      });
    } else {
      await recordAi(supabase, userId, {
        module: "salesPage",
        prompt: ctx,
        response: page,
      });
    }

    return { page: SalesPageSchema.parse(page), prompts };
  });