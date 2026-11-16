import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { runSyncGetDatasetItems } = await import("./client");

function jsonRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("runSyncGetDatasetItems (respostas simuladas — nenhuma chamada real)", () => {
  const prev = process.env.APIFY_TOKEN;
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.APIFY_TOKEN = "test-token";
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.APIFY_TOKEN;
    else process.env.APIFY_TOKEN = prev;
  });

  it("devolve os itens de um dataset normal", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(200, [{ ad_archive_id: "1" }]));
    await expect(runSyncGetDatasetItems("owner/actor", {})).resolves.toEqual([
      { ad_archive_id: "1" },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/acts/owner~actor/");
  });

  it("HTTP 200 com [{error}] → lança (não é '0 resultados')", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonRes(200, [{ error: "Maximum charged results must be >= 10" }]),
    );
    await expect(runSyncGetDatasetItems("owner/actor", {})).rejects.toThrow(/recusou/);
  });

  it("objeto em vez de lista → lança", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(200, { error: { type: "run-failed" } }));
    await expect(runSyncGetDatasetItems("owner/actor", {})).rejects.toThrow(/inválida/);
  });

  it("408 (corrida não terminou a tempo) → erro claro de tempo", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(408, { error: "timeout" }));
    await expect(runSyncGetDatasetItems("owner/actor", {})).rejects.toThrow(/a tempo/);
  });

  it("401 → erro sem nome do fornecedor nem variável de ambiente", async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(401, { error: "unauthorized" }));
    const err = await runSyncGetDatasetItems("owner/actor", {}).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("401");
    expect((err as Error).message).not.toMatch(/apify/i);
  });

  it("sem token → erro claro, sem chamar a rede", async () => {
    delete process.env.APIFY_TOKEN;
    await expect(runSyncGetDatasetItems("owner/actor", {})).rejects.toThrow(/não configurada/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
