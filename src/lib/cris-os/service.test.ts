import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
const fromMock = vi.fn(() => ({ upsert: upsertMock }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: fromMock },
}));

const sendIntelligenceMock = vi.fn();
const isCrisOsConfiguredMock = vi.fn();

vi.mock("./client", () => ({
  sendIntelligence: (...args: unknown[]) => sendIntelligenceMock(...args),
  isCrisOsConfigured: () => isCrisOsConfiguredMock(),
}));

const { handoffToCrisOs } = await import("./service");
import { buildHandoffFromTikTokEscalate, type TikTokEscalateRow } from "./contract";

const ROW: TikTokEscalateRow = {
  id: "row-1",
  video_id: "vid-1",
  creator: "c",
  hook: "h",
  description: "d",
  video_url: "https://tiktok.com/v/1",
  thumbnail_url: "",
  views: 1,
  likes: 1,
  comments: 1,
  shares: 1,
  viral_score: 50,
  enhanced_score: 60,
  hashtags: [],
  tags: [],
  notes: null,
  ai_analysis: null,
  playbook: null,
  scaled_at: "2026-09-20T00:00:00.000Z",
};

beforeEach(() => {
  upsertMock.mockClear();
  fromMock.mockClear();
  sendIntelligenceMock.mockReset();
  isCrisOsConfiguredMock.mockReset();
});

describe("handoffToCrisOs", () => {
  it("registra NOT_SENT e não chama a rede quando Cris OS não está configurado", async () => {
    isCrisOsConfiguredMock.mockReturnValue(false);
    const handoff = buildHandoffFromTikTokEscalate(ROW);

    const outcome = await handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1");

    expect(outcome).toEqual({ attempted: false, status: "NOT_SENT" });
    expect(sendIntelligenceMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("intelligence_handoffs");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "NOT_SENT", handoff_id: handoff.handoff_id }),
      { onConflict: "handoff_id" },
    );
  });

  it("marca SENT e persiste sent_at quando o envio funciona", async () => {
    isCrisOsConfiguredMock.mockReturnValue(true);
    sendIntelligenceMock.mockResolvedValue({
      ok: true,
      status: "SENT",
      attempts: 1,
      retryable: false,
    });
    const handoff = buildHandoffFromTikTokEscalate(ROW);

    const outcome = await handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1");

    expect(outcome.status).toBe("SENT");
    expect(outcome.attempted).toBe(true);
    const lastCall = upsertMock.mock.calls.at(-1)?.[0];
    expect(lastCall.status).toBe("SENT");
    expect(lastCall.sent_at).not.toBeNull();
  });

  it("marca FAILED sem lançar quando o Cris OS está fora do ar", async () => {
    isCrisOsConfiguredMock.mockReturnValue(true);
    sendIntelligenceMock.mockResolvedValue({
      ok: false,
      status: "FAILED",
      error: "network error",
      retryable: true,
      attempts: 3,
    });
    const handoff = buildHandoffFromTikTokEscalate(ROW);

    const outcome = await handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1");

    expect(outcome.status).toBe("FAILED");
    expect(outcome.error).toBe("network error");
  });

  it("nunca lança mesmo se sendIntelligence lançar inesperadamente (Cris OS offline não quebra o ScalaFlow)", async () => {
    isCrisOsConfiguredMock.mockReturnValue(true);
    sendIntelligenceMock.mockRejectedValue(new Error("boom"));
    const handoff = buildHandoffFromTikTokEscalate(ROW);

    await expect(
      handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1"),
    ).resolves.toMatchObject({
      status: "FAILED",
    });
  });

  it("nunca lança mesmo se a própria persistência de status falhar", async () => {
    isCrisOsConfiguredMock.mockReturnValue(true);
    sendIntelligenceMock.mockResolvedValue({
      ok: true,
      status: "SENT",
      attempts: 1,
      retryable: false,
    });
    upsertMock.mockRejectedValue(new Error("db down"));
    const handoff = buildHandoffFromTikTokEscalate(ROW);

    await expect(
      handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1"),
    ).resolves.toMatchObject({
      status: "SENT",
    });
  });

  it("usa onConflict: handoff_id em todo upsert — retry nunca duplica a oportunidade", async () => {
    isCrisOsConfiguredMock.mockReturnValue(true);
    sendIntelligenceMock.mockResolvedValue({
      ok: true,
      status: "SENT",
      attempts: 1,
      retryable: false,
    });
    const handoff = buildHandoffFromTikTokEscalate(ROW);

    await handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1");
    await handoffToCrisOs(handoff, "anuncios_escalados", ROW.id, "user-1");

    for (const call of upsertMock.mock.calls) {
      expect(call[1]).toEqual({ onConflict: "handoff_id" });
      expect(call[0].handoff_id).toBe(handoff.handoff_id);
    }
  });
});
