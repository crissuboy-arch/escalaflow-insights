import { describe, it, expect, vi, beforeEach } from "vitest";

const getClaimsMock = vi.fn();
const createClientMock = vi.fn((..._args: unknown[]) => ({ auth: { getClaims: getClaimsMock } }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const { requireUserFromRequest } = await import("./require-user-from-request");

function makeRequest(authHeader?: string): Request {
  return new Request("https://example.com/api/x", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  getClaimsMock.mockReset();
  createClientMock.mockClear();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "fake-anon-key";
});

describe("requireUserFromRequest", () => {
  it("retorna null quando não há header de autorização", async () => {
    const result = await requireUserFromRequest(makeRequest());
    expect(result).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("retorna null quando o header não é Bearer", async () => {
    const result = await requireUserFromRequest(makeRequest("Basic abc123"));
    expect(result).toBeNull();
  });

  it("retorna null quando o Bearer está vazio", async () => {
    const result = await requireUserFromRequest(makeRequest("Bearer "));
    expect(result).toBeNull();
  });

  it("retorna null quando SUPABASE_URL/PUBLISHABLE_KEY não estão configuradas", async () => {
    delete process.env.SUPABASE_URL;
    const result = await requireUserFromRequest(makeRequest("Bearer token123"));
    expect(result).toBeNull();
  });

  it("retorna null quando getClaims falha", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: new Error("invalid token") });
    const result = await requireUserFromRequest(makeRequest("Bearer bad-token"));
    expect(result).toBeNull();
  });

  it("retorna null quando o token é válido mas sem 'sub' nas claims", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: {} }, error: null });
    const result = await requireUserFromRequest(makeRequest("Bearer token-no-sub"));
    expect(result).toBeNull();
  });

  it("retorna userId e accessToken para um token válido", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: "user-42" } }, error: null });
    const result = await requireUserFromRequest(makeRequest("Bearer valid-token"));
    expect(result).toEqual({ userId: "user-42", accessToken: "valid-token" });
  });

  it("injeta o bearer recebido no client Supabase criado", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    await requireUserFromRequest(makeRequest("Bearer my-session-token"));
    expect(createClientMock).toHaveBeenCalledWith(
      "https://fake.supabase.co",
      "fake-anon-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer my-session-token" } },
      }),
    );
  });
});
