import { describe, it, expect, vi } from "vitest";
import { googleRedirectUrl, startGoogleSignIn } from "./google-oauth";

describe("googleRedirectUrl", () => {
  it("volta para /login do mesmo domínio", () => {
    expect(googleRedirectUrl("https://appscalaflow.com")).toBe("https://appscalaflow.com/login");
  });

  it("não duplica a barra final", () => {
    expect(googleRedirectUrl("https://appscalaflow.com/")).toBe("https://appscalaflow.com/login");
  });
});

describe("startGoogleSignIn", () => {
  it("chama o provider google do Supabase com redirectTo e escolha de conta", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    const r = await startGoogleSignIn({ signInWithOAuth } as never, "https://appscalaflow.com");
    expect(r).toEqual({ error: undefined });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://appscalaflow.com/login",
        queryParams: { prompt: "select_account" },
      },
    });
  });

  it("devolve a mensagem de erro real do Supabase, sem a esconder", async () => {
    const signInWithOAuth = vi
      .fn()
      .mockResolvedValue({ data: {}, error: { message: "Unsupported provider: provider is not enabled" } });
    const r = await startGoogleSignIn({ signInWithOAuth } as never, "https://appscalaflow.com");
    expect(r.error).toBe("Unsupported provider: provider is not enabled");
  });
});
