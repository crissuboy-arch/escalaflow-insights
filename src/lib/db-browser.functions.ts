import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ALLOWED_TABLES = [
  "profiles",
  "user_roles",
  "projects",
  "project_assets",
  "project_campaigns",
  "project_outputs",
  "project_scores",
  "project_tasks",
  "project_timeline",
  "ebooks",
  "playbooks",
  "ai_history",
  "ai_analyses",
  "collected_ads",
  "mined_offers",
  "saved_offers",
  "user_ad_actions",
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

export const listTables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { tables: ALLOWED_TABLES as readonly string[] };
  });

const FetchInput = z.object({
  table: z.enum(ALLOWED_TABLES as unknown as [string, ...string[]]),
  limit: z.number().int().min(1).max(200).default(50),
});

export const fetchTableRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof FetchInput>) => FetchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const table = data.table as AllowedTable;
    const { data: rows, error, count } = await supabase
      .from(table as never)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (error) {
      // fallback without created_at ordering
      const { data: rows2, error: err2, count: c2 } = await supabase
        .from(table as never)
        .select("*", { count: "exact" })
        .limit(data.limit);
      if (err2) throw new Error(err2.message);
      return { rows: rows2 ?? [], count: c2 ?? 0 };
    }
    return { rows: rows ?? [], count: count ?? 0 };
  });