import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListInput = z.object({
  projectId: z.string().uuid(),
  module: z.string().optional(),
  limit: z.number().min(1).max(200).default(50),
});

export const listAiHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("ai_history")
      .select("id, project_id, module, prompt, response, model, version, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.module) q = q.eq("module", data.module);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteAiHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_history").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });