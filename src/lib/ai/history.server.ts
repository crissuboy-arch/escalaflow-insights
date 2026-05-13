import type { SupabaseClient } from "@supabase/supabase-js";

export type AiModule =
  | "copy"
  | "salesPage"
  | "creative"
  | "checkout"
  | "escala"
  | "ebook"
  | "playbook";

/**
 * Record an AI generation event. Best-effort: failures never break the
 * main flow.
 */
export async function recordAi(
  supabase: SupabaseClient,
  userId: string,
  args: {
    projectId?: string | null;
    module: AiModule;
    prompt: unknown;
    response: unknown;
    model?: string;
  },
): Promise<void> {
  try {
    await supabase.from("ai_history").insert({
      user_id: userId,
      project_id: args.projectId ?? null,
      module: args.module,
      prompt: (args.prompt ?? {}) as never,
      response: (args.response ?? {}) as never,
      model: args.model ?? null,
    } as never);
  } catch (e) {
    console.error("[recordAi] failed", e);
  }
}