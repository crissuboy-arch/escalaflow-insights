import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiGenerateCopy, SalesCopySchema, type CopyContext } from "./copy.server";
import { StandaloneBriefingSchema } from "./standalone/briefing";
import { seedFromModule } from "./project/seeding.server";
import { recordAi } from "./ai/history.server";
import { dlog } from "./debug/log.server";

const InputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("project"), projectId: z.string().uuid() }),
  z.object({ kind: z.literal("standalone"), briefing: StandaloneBriefingSchema }),
]);

export const generateSalesCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof InputSchema>) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let ctx: CopyContext;
    let projectRow: { id: string; meta: Record<string, unknown> | null } | null = null;

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
      ctx = {
        productName: (b.title as string) || (row.title as string) || "Produto",
        productType: (b.type as string) || "infoproduto",
        description: (b.subtitle as string) || "",
        niche: (row.niche as string) || (b.niche as string) || "",
        audience: (b.avatar as string) || "",
        promise: (b.promise as string) || "",
        uniqueMechanism: (b.uniqueMechanism as string) || "",
        pains: Array.isArray(b.pains) ? (b.pains as string[]) : [],
        desires: Array.isArray(b.desires) ? (b.desires as string[]) : [],
      };
    } else {
      ctx = { ...data.briefing };
    }

    const copy = await aiGenerateCopy(ctx);

    if (projectRow) {
      // Re-read meta after AI call to avoid stale overwrite from concurrent saves
      const { data: fresh } = await supabase
        .from("projects")
        .select("meta")
        .eq("id", projectRow.id)
        .single();
      const freshMeta = ((fresh?.meta ?? projectRow.meta) ?? {}) as Record<string, unknown>;
      const meta = { ...freshMeta, copy };
      dlog("persist", "copy.save", { projectId: projectRow.id, metaKey: "copy" });
      const { error: saveErr } = await supabase
        .from("projects")
        .update({ meta: meta as never })
        .eq("id", projectRow.id);
      if (saveErr) throw new Error(`Falha ao salvar copy: ${saveErr.message}`);
      await seedFromModule(supabase, userId, projectRow.id, "copy", { copy });
      await recordAi(supabase, userId, {
        projectId: projectRow.id,
        module: "copy",
        prompt: ctx,
        response: copy,
      });
    } else {
      await recordAi(supabase, userId, {
        module: "copy",
        prompt: ctx,
        response: copy,
      });
    }

    return { copy: SalesCopySchema.parse(copy) };
  });