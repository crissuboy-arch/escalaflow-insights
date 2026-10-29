// Cris OS adapter (Fase 3) — the ONLY service-to-service path ScalaFlow
// has to the rest of the ecosystem, and it only carries intelligence, never
// work: the POST delivers a handoff (see cris-os/client.ts + service.ts);
// this module adds the read side — polling the real status snapshot.
//
// Real, audited paths (cris-os web/backend/routes/market_intelligence.py):
//   POST /api/integrations/scalaflow/intelligence   (existing client)
//   GET  /api/integrations/scalaflow/intelligence/{handoff_id}/status
//
// Status URL resolution (no invented paths):
// - If CRIS_OS_STATUS_URL is set, it is the status COLLECTION base
//   (e.g. https://cris-os.example.com/api/integrations/scalaflow/intelligence)
//   and the fetch is GET {base}/{handoff_id}/status.
// - Otherwise it is derived from CRIS_OS_API_URL's ORIGIN + the audited
//   real path above. If neither yields a URL, the adapter reports
//   configured:false and never fetches.
// Never throws: every failure is a returned error object.
export interface CrisOsWorkOrderRef {
  workOrderId: string | null;
  assetType: string | null;
  executorType: string | null;
  status: string | null;
  sourceTaskId: string | null;
  outputRefs: string[];
  lastError: string | null;
}

export interface CrisOsStatusSnapshot {
  handoffId: string;
  projectId: string | null;
  projectName: string | null;
  projectStatus: string | null;
  businessPlanStatus: string | null;
  approvalStatus: string | null;
  executionPlanStatus: string | null;
  tasks: { total: number; pending: number; running: number; completed: number; failed: number } | null;
  workOrders: CrisOsWorkOrderRef[];
  lastError: string | null;
  updatedAt: string | null;
}

export type CrisOsStatusResult =
  | { configured: true; ok: true; found: boolean; snapshot: CrisOsStatusSnapshot | null }
  | { configured: true; ok: false; error: string }
  | { configured: false };

const STATUS_PATH = "/api/integrations/scalaflow/intelligence";

function env(name: string): string | null {
  const raw = process.env[name]?.trim();
  return raw ? raw : null;
}

/** Pure: derives the status collection base from the POST endpoint URL's
 *  origin + the audited real path. Returns null for an unparseable URL. */
export function deriveCrisOsStatusBase(postUrl: string): string | null {
  try {
    const origin = new URL(postUrl).origin;
    return `${origin}${STATUS_PATH}`;
  } catch {
    return null;
  }
}

/** Resolves the status collection base from env (override first, else
 *  derived). Null when nothing is configured. */
export function resolveCrisOsStatusBase(): string | null {
  const override = env("CRIS_OS_STATUS_URL");
  if (override) return override.replace(/\/$/, "");
  const postUrl = env("CRIS_OS_API_URL");
  if (!postUrl) return null;
  return deriveCrisOsStatusBase(postUrl);
}

function asStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseSnapshot(handoffId: string, body: unknown): CrisOsStatusSnapshot {
  const rec = asRecord(body) ?? {};
  const tasksRec = asRecord(rec.tasks);
  const production = asRecord(rec.production);
  const workOrdersRaw = production && Array.isArray(production.work_orders) ? production.work_orders : [];
  const workOrders: CrisOsWorkOrderRef[] = workOrdersRaw.map((item) => {
    const wo = asRecord(item) ?? {};
    const refs = Array.isArray(wo.output_refs)
      ? (wo.output_refs as unknown[]).filter((r): r is string => typeof r === "string" && !!r)
      : [];
    return {
      workOrderId: asStr(wo.work_order_id),
      assetType: asStr(wo.asset_type),
      executorType: asStr(wo.executor_type),
      status: asStr(wo.status),
      sourceTaskId: asStr(wo.source_task_id),
      outputRefs: refs,
      lastError: asStr(wo.last_error),
    };
  });
  const businessPlan = asRecord(rec.business_plan);
  const approval = asRecord(rec.approval);
  const executionPlan = asRecord(rec.execution_plan);
  return {
    handoffId,
    projectId: asStr(rec.project_id),
    projectName: asStr(rec.project_name),
    projectStatus: asStr(rec.project_status),
    businessPlanStatus: businessPlan ? asStr(businessPlan.status) : null,
    approvalStatus: approval ? asStr(approval.status) : null,
    executionPlanStatus: executionPlan ? asStr(executionPlan.status) : null,
    tasks: tasksRec
      ? {
          total: asCount(tasksRec.total),
          pending: asCount(tasksRec.pending),
          running: asCount(tasksRec.running),
          completed: asCount(tasksRec.completed),
          failed: asCount(tasksRec.failed),
        }
      : null,
    workOrders,
    lastError: asStr(rec.last_error),
    updatedAt: asStr(rec.updated_at),
  };
}

/** Authenticated status poll for one handoff. Read-only: never creates,
 *  approves, or executes anything. Approval state observed here comes from
 *  the Cris OS snapshot (Telegram/CLI decisions), never from ScalaFlow. */
export async function getCrisOsMissionStatus(handoffId: string): Promise<CrisOsStatusResult> {
  const base = resolveCrisOsStatusBase();
  const token = env("CRIS_OS_INTEGRATION_TOKEN");
  if (!base || !token) return { configured: false };
  try {
    const res = await fetch(`${base}/${encodeURIComponent(handoffId)}/status`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { configured: true, ok: true, found: false, snapshot: null };
    if (!res.ok) return { configured: true, ok: false, error: `HTTP ${res.status}` };
    const body: unknown = await res.json().catch(() => null);
    return { configured: true, ok: true, found: true, snapshot: parseSnapshot(handoffId, body) };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
