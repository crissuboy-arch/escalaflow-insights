import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AGENTS,
  ScoresSchema,
  runAgentAi,
  type AgentKind,
  type ProjectContext,
} from "./agents.server";
import { recordAi } from "./ai/history.server";

const AgentEnum = z.enum([
  "minerador",
  "analista",
  "campanha",
  "conteudo",
  "escala",
  "operacional",
  "relatorio",
]);

async function loadCtx(
  supabase: any,
  userId: string,
  projectId: string,
  extra?: string,
): Promise<ProjectContext> {
  const { data, error } = await supabase
    .from("projects")
    .select("title, niche, country, language, product_type, briefing")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  const b = (data?.briefing ?? {}) as Record<string, unknown>;
  return {
    title: (data?.title as string) ?? "Projeto",
    niche: (data?.niche as string | null) ?? null,
    country: (data?.country as string | null) ?? null,
    language: (data?.language as string | null) ?? null,
    product_type: (data?.product_type as string | null) ?? null,
    briefing: {
      promise: (b.promise as string) ?? "",
      avatar: (b.avatar as string) ?? "",
      uniqueMechanism: (b.uniqueMechanism as string) ?? "",
      pains: Array.isArray(b.pains) ? (b.pains as string[]) : [],
      desires: Array.isArray(b.desires) ? (b.desires as string[]) : [],
    },
    extra,
  };
}

async function pushTimeline(
  supabase: any,
  userId: string,
  projectId: string,
  event_type: string,
  summary: string,
  payload: Record<string, unknown> = {},
  ref_id?: string,
) {
  try {
    await supabase.from("project_timeline").insert({
      user_id: userId,
      project_id: projectId,
      event_type,
      summary,
      payload,
      ref_id: ref_id ?? null,
    } as never);
  } catch (e) {
    console.error("[timeline] failed", e);
  }
}

export const runAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; agent: AgentKind; extra?: string }) =>
    z
      .object({
        projectId: z.string().uuid(),
        agent: AgentEnum,
        extra: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadCtx(supabase, userId, data.projectId, data.extra);

    // Insert pending row first so UI sees the "processando" state.
    const { data: pending, error: pErr } = await supabase
      .from("project_outputs")
      .insert({
        user_id: userId,
        project_id: data.projectId,
        agent: data.agent,
        kind: AGENTS[data.agent].kind,
        status: "processing",
        payload: {},
      } as never)
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);
    const outputId = pending.id as string;

    try {
      const payload = await runAgentAi(data.agent, ctx);

      await supabase
        .from("project_outputs")
        .update({ status: "done", payload: payload as never } as never)
        .eq("id", outputId);

      // Side-effects per agent
      if (data.agent === "analista" && payload.scores) {
        const parsed = ScoresSchema.safeParse(payload.scores);
        if (parsed.success) {
          const rows = (
            ["oferta", "copy", "criativo", "funil", "escala"] as const
          ).map((dim) => ({
            user_id: userId,
            project_id: data.projectId,
            dimension: dim,
            value: parsed.data[dim].value,
            strengths: parsed.data[dim].strengths as never,
            weaknesses: parsed.data[dim].weaknesses as never,
            fixes: parsed.data[dim].fixes as never,
            next_action: parsed.data[dim].next_action,
          }));
          await supabase.from("project_scores").insert(rows as never);
        }
      }
      if (data.agent === "campanha" && Array.isArray(payload.campaigns)) {
        const rows = (payload.campaigns as Array<Record<string, unknown>>).map((c) => ({
          user_id: userId,
          project_id: data.projectId,
          platform: String(c.platform ?? "meta"),
          name: String(c.name ?? "Campanha"),
          audiences: (c.audiences ?? []) as never,
          angles: (c.angles ?? []) as never,
          headlines: (c.headlines ?? []) as never,
          ad_copies: (c.adCopies ?? []) as never,
          creatives: (c.creatives ?? []) as never,
        }));
        if (rows.length) await supabase.from("project_campaigns").insert(rows as never);
      }
      if (data.agent === "operacional" && Array.isArray(payload.tasks)) {
        const tasks = payload.tasks as Array<Record<string, unknown>>;
        const rows = tasks.map((t, i) => ({
          user_id: userId,
          project_id: data.projectId,
          title: String(t.title ?? "Tarefa"),
          description: String(t.description ?? ""),
          status: "todo",
          order_index: i,
        }));
        if (rows.length) await supabase.from("project_tasks").insert(rows as never);
      }

      await pushTimeline(
        supabase,
        userId,
        data.projectId,
        "agent_run",
        `${AGENTS[data.agent].title} concluído`,
        { agent: data.agent },
        outputId,
      );
      await recordAi(supabase, userId, {
        projectId: data.projectId,
        module: "escala",
        prompt: { agent: data.agent, ctx },
        response: payload,
      });
      return { id: outputId, payload };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha";
      await supabase
        .from("project_outputs")
        .update({ status: "error", error: msg } as never)
        .eq("id", outputId);
      throw e;
    }
  });

export const listOutputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) =>
    z.object({ projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_outputs")
      .select("id, agent, kind, status, payload, error, created_at, updated_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_outputs")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Tasks ---------- */
export const listTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) =>
    z.object({ projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_tasks")
      .select("id, title, description, status, due_at, order_index, created_at")
      .eq("project_id", data.projectId)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      projectId: string;
      title: string;
      description?: string;
      status?: string;
      order_index?: number;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          projectId: z.string().uuid(),
          title: z.string().min(1).max(500),
          description: z.string().max(4000).optional(),
          status: z.enum(["todo", "doing", "done", "blocked"]).optional(),
          order_index: z.number().int().min(0).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          title: data.title,
          description: data.description ?? null,
          status: data.status ?? "todo",
          order_index: data.order_index ?? 0,
        } as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("project_tasks")
      .insert({
        user_id: userId,
        project_id: data.projectId,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "todo",
        order_index: data.order_index ?? 0,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id as string };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_tasks")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Timeline ---------- */
export const listTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) =>
    z.object({ projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_timeline")
      .select("id, event_type, summary, payload, ref_id, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ---------- Scores ---------- */
export const listScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) =>
    z.object({ projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_scores")
      .select("id, dimension, value, strengths, weaknesses, fixes, next_action, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ---------- touchProject (continuar de onde parou) ---------- */
export const touchProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ last_opened_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });