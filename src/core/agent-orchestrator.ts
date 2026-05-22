import type { SkillResult } from "@/skills/types";

// ── types ─────────────────────────────────────────────────────────────────────

export type WorkflowStepKind = "mine" | "analyze" | "generate" | "publish";

export interface SkillTask<T = unknown> {
  id: string;
  skill: string;
  run: () => Promise<SkillResult<T>>;
}

export interface OrchestratorResult<T = unknown> {
  taskId: string;
  skill: string;
  ok: boolean;
  data: T[];
  error?: string;
  duration_ms: number;
}

export interface WorkflowStep<TIn = unknown, TOut = unknown> {
  id: string;
  kind: WorkflowStepKind;
  // dependsOn: IDs of prior steps whose output this step receives
  dependsOn?: string[];
  run: (context: WorkflowContext<TIn>) => Promise<TOut>;
}

export interface WorkflowContext<T = unknown> {
  userId?: string;
  // Initial inputs passed to the workflow
  inputs: Record<string, unknown>;
  // Accumulated outputs from completed steps, keyed by step ID
  outputs: Record<string, T>;
}

export interface WorkflowResult<T = unknown> {
  stepId: string;
  kind: WorkflowStepKind;
  ok: boolean;
  output?: T;
  error?: string;
  duration_ms: number;
}

// ── parallel skill runner ─────────────────────────────────────────────────────

/**
 * Runs multiple skills concurrently. Uses Promise.allSettled so one failure
 * does not abort the rest. Returns results in input order.
 */
export async function runSkillsInParallel<T = unknown>(
  tasks: SkillTask<T>[],
): Promise<OrchestratorResult<T>[]> {
  console.log(`[orchestrator] running ${tasks.length} skill(s) in parallel:`, tasks.map((t) => t.id));

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));

  return settled.map((result, i) => {
    const task = tasks[i];
    if (result.status === "fulfilled") {
      const r = result.value;
      console.log(`[orchestrator] task=${task.id} ok=${r.ok} items=${r.data.length}`);
      return {
        taskId: task.id,
        skill: task.skill,
        ok: r.ok,
        data: r.data,
        error: r.error,
        duration_ms: r.duration_ms,
      };
    } else {
      const error = result.reason?.message ?? String(result.reason);
      console.error(`[orchestrator] task=${task.id} rejected:`, error);
      return {
        taskId: task.id,
        skill: task.skill,
        ok: false,
        data: [],
        error,
        duration_ms: 0,
      };
    }
  });
}

// ── sequential workflow runner ────────────────────────────────────────────────

/**
 * Executes workflow steps. Steps without dependsOn run in declaration order.
 * Each step receives the full context including all prior outputs.
 * If a step fails and has dependents, those dependents are skipped.
 */
export async function runWorkflow<T = unknown>(
  steps: WorkflowStep<T, T>[],
  initial: Omit<WorkflowContext<T>, "outputs">,
): Promise<WorkflowResult<T>[]> {
  const context: WorkflowContext<T> = { ...initial, outputs: {} };
  const results: WorkflowResult<T>[] = [];
  const failed = new Set<string>();

  console.log(`[orchestrator] workflow starting steps=${steps.length}`);

  for (const step of steps) {
    const blockedBy = step.dependsOn?.find((dep) => failed.has(dep));
    if (blockedBy) {
      const error = `Skipped: dependency "${blockedBy}" failed`;
      console.warn(`[orchestrator] step=${step.id} ${error}`);
      results.push({ stepId: step.id, kind: step.kind, ok: false, error, duration_ms: 0 });
      failed.add(step.id);
      continue;
    }

    const start = Date.now();
    try {
      console.log(`[orchestrator] step=${step.id} kind=${step.kind} starting`);
      const output = await step.run(context);
      const duration_ms = Date.now() - start;
      context.outputs[step.id] = output;
      console.log(`[orchestrator] step=${step.id} done duration=${duration_ms}ms`);
      results.push({ stepId: step.id, kind: step.kind, ok: true, output, duration_ms });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      const duration_ms = Date.now() - start;
      console.error(`[orchestrator] step=${step.id} error:`, error);
      failed.add(step.id);
      results.push({ stepId: step.id, kind: step.kind, ok: false, error, duration_ms });
    }
  }

  console.log(
    `[orchestrator] workflow done ok=${results.filter((r) => r.ok).length}/${results.length}`,
  );
  return results;
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Convenience: build a SkillTask from a skill function. */
export function makeSkillTask<TInput, TOutput>(
  id: string,
  skillName: string,
  fn: (input: TInput) => Promise<SkillResult<TOutput>>,
  input: TInput,
): SkillTask<TOutput> {
  return { id, skill: skillName, run: () => fn(input) };
}
