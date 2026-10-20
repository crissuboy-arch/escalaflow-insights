import { describe, it, expect } from "vitest";
import {
  isRecent,
  dateRangeToMs,
  daysBetween,
  applyDateRange,
  type VideoRadarCard,
} from "./video-radar.functions";

// Pure logic that decides what gets called "recente"/"viral"/"anúncio
// ativo" — the exact honesty requirement from the mission ("nunca chamar
// algo de viral sem evidências suficientes"). These are unit-tested
// directly, with no Supabase/Apify involved.

describe("isRecent — classificação de 'publicado recentemente' baseada em timestamp real", () => {
  it("é recente quando criado há poucas horas", () => {
    const now = new Date().toISOString();
    expect(isRecent(now)).toBe(true);
  });

  it("não é recente quando criado há muitos dias", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isRecent(old)).toBe(false);
  });

  it("nunca afirma recência sem uma data real", () => {
    expect(isRecent(null)).toBe(false);
  });
});

describe("dateRangeToMs — janelas de data reais, sem adivinhar", () => {
  it("mapeia 24h/3d/7d/30d para milissegundos corretos", () => {
    expect(dateRangeToMs("24h")).toBe(24 * 60 * 60 * 1000);
    expect(dateRangeToMs("3d")).toBe(3 * 24 * 60 * 60 * 1000);
    expect(dateRangeToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(dateRangeToMs("30d")).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("'all' não aplica corte de data (retorna null)", () => {
    expect(dateRangeToMs("all")).toBeNull();
  });
});

describe("daysBetween — dias de anúncio ativo (first_seen_at/last_seen_at reais)", () => {
  it("calcula dias reais entre duas datas", () => {
    const a = "2026-01-10T00:00:00.000Z";
    const b = "2026-01-01T00:00:00.000Z";
    expect(daysBetween(a, b)).toBe(9);
  });

  it("nunca retorna negativo mesmo com datas invertidas", () => {
    const a = "2026-01-01T00:00:00.000Z";
    const b = "2026-01-10T00:00:00.000Z";
    expect(daysBetween(a, b)).toBe(0);
  });
});

function makeCard(overrides: Partial<VideoRadarCard>): VideoRadarCard {
  return {
    id: "1",
    platform: "tiktok",
    title: "t",
    authorOrAdvertiser: null,
    thumbnailUrl: null,
    playerKind: "tiktok_embed",
    embedUrl: null,
    directVideoUrl: null,
    originalUrl: null,
    country: null,
    niche: null,
    videoType: "video",
    views: null,
    likes: null,
    comments: null,
    score: null,
    createdAt: null,
    lastSeenAt: null,
    daysActive: null,
    status: "normal",
    ...overrides,
  };
}

describe("applyDateRange — nunca esconde um resultado real por falta de data, só filtra pelo que existe", () => {
  it("remove cartões mais antigos que a janela escolhida", () => {
    const recent = makeCard({ id: "a", createdAt: new Date().toISOString() });
    const old = makeCard({
      id: "b",
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const result = applyDateRange([recent, old], "7d");
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("'all' mantém todos os cartões, incluindo antigos", () => {
    const old = makeCard({
      id: "b",
      createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(applyDateRange([old], "all").map((c) => c.id)).toEqual(["b"]);
  });

  it("nunca descarta um cartão real só porque createdAt está ausente (evita esconder resultado válido)", () => {
    const noDate = makeCard({ id: "c", createdAt: null });
    expect(applyDateRange([noDate], "24h").map((c) => c.id)).toEqual(["c"]);
  });
});
