import { describe, it, expect, vi, beforeEach } from "vitest";

const getSessionMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => getSessionMock() } },
}));

const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
vi.stubGlobal("fetch", fetchMock);

const { authedFetch } = await import("./authed-fetch");

beforeEach(() => {
  getSessionMock.mockReset();
  fetchMock.mockClear();
});

describe("authedFetch", () => {
  it("anexa o Authorization bearer quando há sessão ativa", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
    await authedFetch("/api/execute-skill", { method: "POST", body: "{}" });
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init!.headers);
    expect(headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("não quebra e segue sem header quando não há sessão", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await authedFetch("/api/execute-skill");
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("preserva method, body e outros headers já passados", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "tok-456" } } });
    await authedFetch("/api/scrape-offer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/scrape-offer");
    expect(init!.method).toBe("POST");
    expect(init!.body).toBe(JSON.stringify({ url: "https://example.com" }));
    const headers = new Headers(init!.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer tok-456");
  });
});
