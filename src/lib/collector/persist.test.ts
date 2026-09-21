import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PersistResult } from "./persist";

// Regression coverage for the real production bug: a mining run ("pack
// figurinhas" / "Carla Figurinhas") returned ads that rendered fine in the
// UI but vanished after a refresh. Root cause (confirmed via read-only
// Vercel log inspection): every INSERT of a brand-new ad failed with
// "Could not find the 'first_seen_at' column of 'collected_ads' in the
// schema cache" — a stale PostgREST schema cache rejecting a column that
// genuinely exists (confirmed via src/integrations/supabase/types.ts,
// regenerated from the live DB after the column was added). The ads were
// never persisted, so /minerar's reload query correctly did not find them.
// These tests do NOT fix the cache staleness (that's infra, not code) —
// they prove the aggregation/reporting logic that now makes the failure
// visible instead of silent.

const insertMock = vi.fn();
const updateMock = vi.fn();
const eqUpdateMock = vi.fn(() => ({ error: null }));
const maybeSingleMock = vi.fn();
const eqSelectMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqSelectMock }));
const fromMock = vi.fn(() => ({
  select: selectMock,
  update: updateMock,
  insert: insertMock,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: fromMock },
}));

const { upsertCollectedAd, summarizePersistResults } = await import("./persist");

beforeEach(() => {
  vi.clearAllMocks();
  updateMock.mockReturnValue({ eq: eqUpdateMock });
  eqUpdateMock.mockReturnValue({ error: null });
  maybeSingleMock.mockResolvedValue({ data: null });
});

describe("summarizePersistResults", () => {
  it("conta salvos e falhos, preservando a primeira mensagem de erro real", () => {
    const results: PersistResult[] = [
      { inserted: true, updated: false },
      { inserted: false, updated: false, error: "Could not find the 'first_seen_at' column of 'collected_ads' in the schema cache" },
      { inserted: false, updated: false, error: "outro erro" },
    ];
    const summary = summarizePersistResults(results);
    expect(summary).toEqual({
      saved: 1,
      failed: 2,
      firstError: "Could not find the 'first_seen_at' column of 'collected_ads' in the schema cache",
    });
  });

  it("nenhuma falha quando todos os itens persistem", () => {
    const results: PersistResult[] = [
      { inserted: true, updated: false },
      { inserted: false, updated: true },
    ];
    expect(summarizePersistResults(results)).toEqual({ saved: 2, failed: 0, firstError: null });
  });

  it("lote vazio não conta como falha (não inventa erro)", () => {
    expect(summarizePersistResults([])).toEqual({ saved: 0, failed: 0, firstError: null });
  });
});

describe("upsertCollectedAd — reprodução exata do erro real de schema cache", () => {
  it("um anúncio novo (sem linha existente) tenta INSERT com first_seen_at e reporta erro sem lançar quando a coluna não é reconhecida", async () => {
    maybeSingleMock.mockResolvedValue({ data: null }); // "Carla Figurinhas" nunca existiu
    insertMock.mockResolvedValue({
      error: { message: "Could not find the 'first_seen_at' column of 'collected_ads' in the schema cache" },
    });

    const result = await upsertCollectedAd({
      advertiser: "Carla Figurinhas",
      headline: "Pack de figurinhas",
      platform: "Facebook",
      adLibraryId: "carla-ad-1",
    });

    expect(result.inserted).toBe(false);
    expect(result.error).toMatch(/first_seen_at/);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedPayload = insertMock.mock.calls[0][0];
    expect(insertedPayload.first_seen_at).toBeTruthy();
  });

  it("um anúncio já existente faz UPDATE (não passa por first_seen_at) e não é afetado pelo bug do cache", async () => {
    maybeSingleMock.mockResolvedValue({ data: { id: "suitable-row-id" } }); // "Suitable" já existia
    eqUpdateMock.mockReturnValue({ error: null });

    const result = await upsertCollectedAd({
      advertiser: "Suitable",
      headline: "Oferta Suitable",
      platform: "Facebook",
      adLibraryId: "999888777",
    });

    expect(result.updated).toBe(true);
    expect(result.error).toBeUndefined();
    expect(insertMock).not.toHaveBeenCalled();
    const updatedPayload = updateMock.mock.calls[0][0];
    expect(updatedPayload.first_seen_at).toBeUndefined();
  });

  it("erro de persistência nunca é lançado — o chamador decide o que fazer com PersistResult.error", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    insertMock.mockResolvedValue({ error: { message: "qualquer erro de banco" } });

    await expect(
      upsertCollectedAd({ advertiser: "X", headline: "Y", adLibraryId: "z" }),
    ).resolves.toMatchObject({ inserted: false, error: "qualquer erro de banco" });
  });
});
