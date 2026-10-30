import { describe, it, expect, vi } from "vitest";
import { isAdmin } from "./is-admin";

function makeSupabase(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ select }));
  return { from, _spies: { from, select, eq1, eq2, maybeSingle } };
}

describe("isAdmin", () => {
  it("retorna false sem userId, sem nem consultar o banco", async () => {
    const sb = makeSupabase({ data: null, error: null });
    expect(await isAdmin(sb, null)).toBe(false);
    expect(await isAdmin(sb, undefined)).toBe(false);
    expect(sb._spies.from).not.toHaveBeenCalled();
  });

  it("retorna true quando existe uma linha user_roles com role='admin'", async () => {
    const sb = makeSupabase({ data: { role: "admin" }, error: null });
    expect(await isAdmin(sb, "user-1")).toBe(true);
    expect(sb._spies.from).toHaveBeenCalledWith("user_roles");
    expect(sb._spies.eq1).toHaveBeenCalledWith("user_id", "user-1");
    expect(sb._spies.eq2).toHaveBeenCalledWith("role", "admin");
  });

  it("retorna false quando não há linha (usuário comum)", async () => {
    const sb = makeSupabase({ data: null, error: null });
    expect(await isAdmin(sb, "user-2")).toBe(false);
  });

  it("falha fechada (retorna false) se a consulta der erro", async () => {
    const sb = makeSupabase({ data: null, error: { message: "boom" } });
    expect(await isAdmin(sb, "user-3")).toBe(false);
  });
});
