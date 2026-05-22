// Shared types and utilities for all EscalaFlow skills.
// Skills are pure server-side functions that wrap Apify calls and return normalized data.
// They have no Supabase dependency — that belongs in server functions.

export interface SkillResult<T = unknown> {
  ok: boolean;
  skill: string;
  data: T[];
  error?: string;
  duration_ms: number;
}

export interface SkillOptions {
  timeoutMs?: number;
}

export type SkillFn<TInput, TOutput> = (
  input: TInput,
  options?: SkillOptions,
) => Promise<SkillResult<TOutput>>;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[skill:${label}] timeout after ${ms}ms`)), ms),
    ),
  ]);
}
