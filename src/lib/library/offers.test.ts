import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://sb.example/${p}` } }),
      }),
    },
  },
}));

const lib = await import("./offers");

function row(over: Record<string, unknown> = {}) {
  return lib.toLibraryOffer({
    id: "1",
    ad_library_id: "123",
    ad_url: null,
    advertiser: "Dra. Ana",
    headline: "Emagreça 5kg com o novo protocolo",
    copy: "Você não precisa passar fome para perder peso. Descubra agora como funciona.",
    cta: "Saiba mais",
    platform: "Facebook",
    country: "BR",
    niche: "Geral",
    keyword: "emagrecer",
    score: 82,
    created_at: new Date().toISOString(),
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    start_date: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    landing_page_url: null,
    offer_network: null,
    image_url: "https://fbcdn.example/tmp.jpg",
    video_url: null,
    image_storage_path: "media/abc.jpg",
    video_storage_path: null,
    media_status: "image_copied",
    collation_count: 14,
    is_active: true,
    publisher_platform: ["FACEBOOK", "INSTAGRAM"],
    enriched: { tags: ["dieta"], scaleLevel: "hot" },
    ...over,
  } as never);
}

describe("toLibraryOffer", () => {
  it("prefere a cópia durável do Storage ao link temporário", () => {
    const o = row();
    expect(o.image).toBe("https://sb.example/media/abc.jpg");
    expect(o.mediaDurable).toBe(true);
  });
  it("usa só sinais reais da Ad Library", () => {
    const o = row();
    expect(o.activeAdsCount).toBe(14);
    expect(o.daysRunning).toBe(10);
    const none = row({ collation_count: undefined, start_date: null });
    expect(none.activeAdsCount).toBeNull();
    expect(none.daysRunning).toBeNull();
  });
  it("detecta nicho e idioma do texto", () => {
    const o = row();
    expect(o.nicheGroup).toBe("saude");
    expect(o.language).toBe("pt");
    expect(
      lib.detectLanguage("Get your free guide now and learn how the method works for you"),
    ).toBe("en");
  });
});

describe("pesquisa e filtros", () => {
  const a = row();
  const b = row({
    id: "2",
    ad_library_id: "999",
    advertiser: "Renda Pro",
    headline: "Ganhe dinheiro em casa",
    copy: "Renda extra todos os dias",
    country: "PT",
    publisher_platform: ["FACEBOOK"],
    enriched: {},
  });
  it("ignora acentos e exige todos os termos", () => {
    expect(lib.matchesQuery(a, "emagreca protocolo")).toBe(true);
    expect(lib.matchesQuery(a, "emagreca dinheiro")).toBe(false);
    expect(lib.matchesQuery(a, '"novo protocolo"')).toBe(true);
  });
  it("filtra por país, plataforma e nicho", () => {
    const list = [a, b];
    expect(
      lib.applyFilters(list, { ...lib.EMPTY_FILTERS, country: "PT" }).map((o) => o.id),
    ).toEqual(["2"]);
    expect(
      lib.applyFilters(list, { ...lib.EMPTY_FILTERS, platform: "Instagram" }).map((o) => o.id),
    ).toEqual(["1"]);
    expect(
      lib.applyFilters(list, { ...lib.EMPTY_FILTERS, niche: "renda" }).map((o) => o.id),
    ).toEqual(["2"]);
  });
  it("deduplica a mesma oferta coletada duas vezes", () => {
    const dup = row({ id: "3", image_storage_path: null });
    expect(lib.dedupeOffers([dup, a]).map((o) => o.id)).toEqual(["1"]);
  });
});

describe("hasMedia", () => {
  it("esconde ofertas cujo link expirou e não têm cópia guardada", () => {
    expect(lib.hasMedia(row({ image_storage_path: null, media_status: "expired" }))).toBe(false);
    expect(lib.hasMedia(row({ image_storage_path: "media/x.jpg", media_status: "expired" }))).toBe(
      true,
    );
    expect(lib.hasMedia(row({ image_storage_path: null, media_status: "not_attempted" }))).toBe(
      true,
    );
  });
});

describe("realStatus (só números reais da Ad Library)", () => {
  const day = 86_400_000;
  const at = (d: number) => new Date(Date.now() - d * day).toISOString();
  it("Escalando com ≥10 anúncios ou ≥3 anúncios e ≥14 dias", () => {
    expect(lib.realStatus(row({ collation_count: 12, start_date: at(2) }))).toBe("escalando");
    expect(lib.realStatus(row({ collation_count: 3, start_date: at(20) }))).toBe("escalando");
  });
  it("Estável com ≥30 dias sem multiplicar anúncios; Em teste caso contrário", () => {
    expect(lib.realStatus(row({ collation_count: 1, start_date: at(40) }))).toBe("estavel");
    expect(lib.realStatus(row({ collation_count: 1, start_date: at(5) }))).toBe("teste");
  });
  it("Inativo quando a Ad Library diz que parou; sem dados → sem selo", () => {
    expect(lib.realStatus(row({ is_active: false }))).toBe("inativo");
    expect(
      lib.realStatus(row({ collation_count: null, start_date: null, is_active: null })),
    ).toBeNull();
  });
});
