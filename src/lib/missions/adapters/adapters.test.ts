// Adapter tests — fetch is MOCKED here (fixtures, never a real service).
// Every "configured:false" path is the honest behaviour when env vars are
// absent; every network path is asserted by URL + headers, not by a live
// service — live verification is a Fase 5 checklist item, not a test claim.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deriveCrisOsStatusBase, getCrisOsMissionStatus, resolveCrisOsStatusBase } from "./cris-os";
import { buildAthenaWorkOrder } from "./athena";
import { createToolsHubJob, getToolsHubJob } from "./tools-hub";
import { pinkLogicGenerate, pinkLogicHealth } from "./pink-logic";
import { pageForgeGenerate, pageForgeHealth, pageForgeStats } from "./pageforge";
import * as metaAds from "./meta-ads";
import { mkvideosStatusCommand, criadorAppCommand, OPENMONTAGE_LOCAL_NOTE } from "./local-only";

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => handler(String(url), init)) as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("CRIS_OS_API_URL", "");
  vi.stubEnv("CRIS_OS_STATUS_URL", "");
  vi.stubEnv("CRIS_OS_INTEGRATION_TOKEN", "");
  vi.stubEnv("TOOLS_HUB_BASE_URL", "");
  vi.stubEnv("TOOLS_HUB_API_KEY", "");
  vi.stubEnv("PINK_LOGIC_BASE_URL", "");
  vi.stubEnv("PINK_LOGIC_SERVICE_KEY", "");
  vi.stubEnv("PAGEFORGE_BASE_URL", "");
  vi.stubEnv("PAGEFORGE_ATHENA_API_KEY", "");
  vi.stubEnv("META_ADS_BASE_URL", "");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cris-os adapter — derivação do caminho real + parsing do snapshot", () => {
  it("deriva a base da origem do POST + path auditado", () => {
    expect(deriveCrisOsStatusBase("https://cris-os.example.com/api/integrations/scalaflow/intelligence")).toBe(
      "https://cris-os.example.com/api/integrations/scalaflow/intelligence",
    );
    expect(deriveCrisOsStatusBase("nota-url")).toBeNull();
  });

  it("override vence; sem nada → null (nunca fetch inventado)", () => {
    vi.stubEnv("CRIS_OS_STATUS_URL", "https://status.example.com/base/");
    expect(resolveCrisOsStatusBase()).toBe("https://status.example.com/base");
    vi.stubEnv("CRIS_OS_STATUS_URL", "");
    vi.stubEnv("CRIS_OS_API_URL", "https://cris.example.com/api/integrations/scalaflow/intelligence");
    expect(resolveCrisOsStatusBase()).toBe(
      "https://cris.example.com/api/integrations/scalaflow/intelligence",
    );
    vi.stubEnv("CRIS_OS_API_URL", "");
    expect(resolveCrisOsStatusBase()).toBeNull();
  });

  it("sem config → configured:false, sem fetch", async () => {
    const result = await getCrisOsMissionStatus("ho_1");
    expect(result).toEqual({ configured: false });
  });

  it("200: parseia snapshot, work orders e output_refs", async () => {
    vi.stubEnv("CRIS_OS_STATUS_URL", "https://cris.example.com/api/integrations/scalaflow/intelligence");
    vi.stubEnv("CRIS_OS_INTEGRATION_TOKEN", "tok");
    mockFetch((url, init) => {
      expect(url).toBe(
        "https://cris.example.com/api/integrations/scalaflow/intelligence/ho_1/status",
      );
      expect(init?.headers).toMatchObject({ authorization: "Bearer tok" });
      return jsonResponse({
        project_id: "proj-1",
        project_name: "Projeto X",
        business_plan: { status: "APPROVED" },
        approval: { status: "PENDING" },
        tasks: { total: 2, pending: 1, running: 0, completed: 1, failed: 0 },
        production: {
          work_orders: [
            {
              work_order_id: "wo_1",
              asset_type: "LANDING_PAGE",
              executor_type: "PAGEFORGE",
              status: "COMPLETED",
              output_refs: ["athena:landing_page/index.html"],
            },
          ],
        },
      });
    });
    const result = await getCrisOsMissionStatus("ho_1");
    expect(result).toEqual({
      configured: true,
      ok: true,
      found: true,
      snapshot: expect.objectContaining({
        projectId: "proj-1",
        businessPlanStatus: "APPROVED",
        approvalStatus: "PENDING",
        workOrders: [
          expect.objectContaining({
            workOrderId: "wo_1",
            outputRefs: ["athena:landing_page/index.html"],
          }),
        ],
      }),
    });
  });

  it("404 → found:false; erro de rede → ok:false (nunca lança)", async () => {
    vi.stubEnv("CRIS_OS_STATUS_URL", "https://cris.example.com/base");
    vi.stubEnv("CRIS_OS_INTEGRATION_TOKEN", "tok");
    mockFetch(() => new Response(null, { status: 404 }));
    expect(await getCrisOsMissionStatus("ho_1")).toEqual({
      configured: true,
      ok: true,
      found: false,
      snapshot: null,
    });
    globalThis.fetch = vi.fn(async () => {
      throw new Error("rede");
    }) as typeof fetch;
    const failed = await getCrisOsMissionStatus("ho_1");
    expect(failed).toEqual({ configured: true, ok: false, error: "rede" });
  });
});

describe("athena adapter — só contrato, nunca HTTP", () => {
  it("constrói work_order válido com executor ATHENA e final_action none", () => {
    const result = buildAthenaWorkOrder({
      work_order_id: "wo_abc123",
      handoff_id: "ho_1",
      asset_type: "LANDING_PAGE",
      objective: "Criar landing",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.missionType).toBe("CRIAR_LANDING_PAGE");
    expect(result.workOrder.executor_type).toBe("ATHENA");
    expect(result.workOrder.status).toBe("READY");
    expect(result.workOrder.final_action).toEqual({ type: "none" });
    expect(result.workOrder.callback).toEqual({ type: "poll" });
  });

  it("rejeita asset_type fora da allowlist (CRM, APP, DISTRIBUTION, UNKNOWN)", () => {
    for (const asset of ["CRM", "APP", "DISTRIBUTION", "UNKNOWN"]) {
      const result = buildAthenaWorkOrder({ work_order_id: "wo_x1", asset_type: asset, objective: "o" });
      expect(result.ok).toBe(false);
    }
  });

  it("rejeita approval pendente e objetivo em falta", () => {
    expect(
      buildAthenaWorkOrder({
        work_order_id: "wo_x2",
        asset_type: "EBOOK",
        objective: "o",
        requires_approval: true,
        approved: false,
      }),
    ).toEqual({ ok: false, error: expect.stringMatching(/approved/) });
    expect(buildAthenaWorkOrder({ work_order_id: "wo_x3", asset_type: "EBOOK" })).toEqual({
      ok: false,
      error: expect.stringMatching(/objective/),
    });
  });
});

describe("tools-hub adapter — jobs com idempotência + anti-replay", () => {
  it("sem env → configured:false", async () => {
    expect(await createToolsHubJob({ orgId: "o", toolId: "t", params: {}, idempotencyKey: "k" })).toEqual({
      configured: false,
    });
  });

  it("create: 201 envia idempotencyKey e headers anti-replay; getJob: 404 → erro", async () => {
    vi.stubEnv("TOOLS_HUB_BASE_URL", "https://hub.example.com");
    vi.stubEnv("TOOLS_HUB_API_KEY", "key");
    mockFetch((url, init) => {
      if (url === "https://hub.example.com/api/v1/jobs" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.idempotencyKey).toBe("msn_abc");
        expect(init.headers).toMatchObject({ authorization: "Bearer key" });
        expect((init.headers as Record<string, string>)["X-Nonce"]).toBeTruthy();
        return jsonResponse({ id: "job-1", status: "queued", tool_id: "hyperframes" }, 201);
      }
      if (url === "https://hub.example.com/api/v1/jobs/job-1") {
        return jsonResponse({ id: "job-1", status: "completed" });
      }
      return new Response(null, { status: 404 });
    });
    const created = await createToolsHubJob({
      orgId: "org-1",
      toolId: "hyperframes",
      params: {},
      idempotencyKey: "msn_abc",
    });
    expect(created).toEqual({
      configured: true,
      ok: true,
      data: expect.objectContaining({ id: "job-1", status: "queued" }),
    });
    expect(await getToolsHubJob("job-1")).toEqual({
      configured: true,
      ok: true,
      data: expect.objectContaining({ status: "completed" }),
    });
    expect(await getToolsHubJob("inexistente")).toEqual({
      configured: true,
      ok: false,
      error: expect.stringMatching(/404/),
    });
  });
});

describe("pink-logic adapter — allowlist de módulos + health público", () => {
  it("módulo fora da allowlist é rejeitado SEM fetch", async () => {
    vi.stubEnv("PINK_LOGIC_BASE_URL", "https://pink.example.com");
    vi.stubEnv("PINK_LOGIC_SERVICE_KEY", "k");
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;
    const result = await pinkLogicGenerate({ module: "video", params: {} });
    expect(result).toEqual({ configured: true, ok: false, error: "module inválido: video" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("health usa o path público; generate envia Bearer + module", async () => {
    vi.stubEnv("PINK_LOGIC_BASE_URL", "https://pink.example.com");
    vi.stubEnv("PINK_LOGIC_SERVICE_KEY", "k");
    mockFetch((url, init) => {
      if (url.endsWith("/api/integrations/health")) return jsonResponse({ ok: true });
      expect(url).toBe("https://pink.example.com/api/generate");
      expect(init?.headers).toMatchObject({ authorization: "Bearer k" });
      expect(JSON.parse(String(init.body)).module).toBe("carousel");
      return jsonResponse({ posts: [] });
    });
    expect(await pinkLogicHealth()).toEqual({ configured: true, ok: true, data: { ok: true } });
    expect((await pinkLogicGenerate({ module: "carousel", params: {} })).ok).toBe(true);
  });
});

describe("pageforge adapter — allowlist de stages + stats com Bearer", () => {
  it("stage inválido rejeitado sem fetch; stats sem chave → configured:false", async () => {
    vi.stubEnv("PAGEFORGE_BASE_URL", "https://pf.example.com");
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;
    expect(await pageForgeGenerate({ stage: "inventado", brief: {} })).toEqual({
      configured: true,
      ok: false,
      error: "stage inválido: inventado",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await pageForgeStats()).toEqual({ configured: false });
  });

  it("health + generate + stats com Bearer", async () => {
    vi.stubEnv("PAGEFORGE_BASE_URL", "https://pf.example.com");
    vi.stubEnv("PAGEFORGE_ATHENA_API_KEY", "pfkey");
    mockFetch((url, init) => {
      if (url.endsWith("/api/health")) return jsonResponse({ ok: true });
      if (url.endsWith("/api/integrations/stats")) {
        expect(init?.headers).toMatchObject({ authorization: "Bearer pfkey" });
        return jsonResponse({ stats: true });
      }
      expect(url).toBe("https://pf.example.com/api/generate");
      return new Response("NDJSON", { status: 200 });
    });
    expect((await pageForgeHealth()).ok).toBe(true);
    expect(await pageForgeGenerate({ stage: "full", brief: { title: "x" } })).toEqual({
      configured: true,
      ok: true,
      data: "NDJSON",
    });
    expect((await pageForgeStats()).ok).toBe(true);
  });
});

describe("meta-ads adapter — só leituras HTTP; sem approve/reject", () => {
  it("não exporta nenhum método approve/reject", () => {
    const approveExports = Object.keys(metaAds).filter((k) => k.toLowerCase().includes("approve"));
    const rejectExports = Object.keys(metaAds).filter((k) => k.toLowerCase().includes("reject"));
    expect(approveExports).toEqual([]);
    expect(rejectExports).toEqual([]);
  });

  it("leituras usam o token passado por chamada + base env", async () => {
    vi.stubEnv("META_ADS_BASE_URL", "https://meta.example.com");
    mockFetch((url, init) => {
      expect(url).toBe("https://meta.example.com/api/ads/insights");
      expect(init?.headers).toMatchObject({ authorization: "Bearer tok-usuario" });
      return jsonResponse({ insights: [] });
    });
    expect(await metaAds.metaAdsInsights("tok-usuario")).toEqual({
      configured: true,
      ok: true,
      data: { insights: [] },
    });
  });

  it("sem base → configured:false", async () => {
    expect(await metaAds.metaAdsStatus("tok")).toEqual({ configured: false });
  });
});

describe("local-only adapters — descrições, não execuções", () => {
  it("templates de comando MKVideos e Criador de App", () => {
    expect(mkvideosStatusCommand("msn_1")).toBe("mkivideos athena-status --mission msn_1");
    expect(criadorAppCommand("minha app", "blog")).toBe("python create_app.py minha_app --template blog");
  });

  it("nota OpenMontage menciona AGPL (regra permanente)", () => {
    expect(OPENMONTAGE_LOCAL_NOTE).toMatch(/AGPL/);
  });
});
