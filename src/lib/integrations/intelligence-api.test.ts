import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";

// ── Fake Supabase query builder ──────────────────────────────────────────
// Generic enough to support every chain used in intelligence-api.ts
// (select/eq/ilike/order/limit/maybeSingle, plus the nested
// "created_at, collected_ads(*)" select used by getSavedOffers, where the
// fixture rows simply already carry a nested `collected_ads` key).
type Row = Record<string, unknown>;
let FIXTURES: Record<string, Row[]> = {};
// Simulates a table that doesn't exist yet (e.g. private_api_clients
// before the migration has been run in production) — PostgREST returns an
// error, never silently empty/success data.
let FAILING_TABLES = new Set<string>();

function matchIlike(value: unknown, pattern: string): boolean {
  const needle = pattern.replace(/%/g, "").toLowerCase();
  return String(value ?? "")
    .toLowerCase()
    .includes(needle);
}

function makeQuery(table: string) {
  let rows = [...(FIXTURES[table] ?? [])];
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      rows = rows.filter((r) => r[col] === val);
      return builder;
    },
    ilike: (col: string, pattern: string) => {
      rows = rows.filter((r) => matchIlike(r[col], pattern));
      return builder;
    },
    order: () => builder,
    limit: (n: number) => {
      rows = rows.slice(0, n);
      return builder;
    },
    maybeSingle: async () =>
      FAILING_TABLES.has(table)
        ? { data: null, error: { message: `relation "public.${table}" does not exist` } }
        : { data: rows[0] ?? null, error: null },
    // supabase-js query builders are thenable — `await query` works
    // without an explicit terminal call.
    then: (resolve: (v: { data: Row[] | null; error: unknown }) => void) =>
      FAILING_TABLES.has(table)
        ? resolve({ data: null, error: { message: `relation "public.${table}" does not exist` } })
        : resolve({ data: rows, error: null }),
  };
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => makeQuery(table) },
}));

const {
  authenticatePrivateApiClient,
  checkCostLimit,
  searchAds,
  getAdDetails,
  getAdCreatives,
  getAdEvidence,
  getSavedOffers,
  createAdaptationBrief,
  getCachedSearch,
  setCachedSearch,
  __clearIntelligenceSearchCacheForTests,
} = await import("./intelligence-api");
type PrivateApiClient = Awaited<ReturnType<typeof authenticatePrivateApiClient>> & object;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

const CLIENT_A_ROW: Row = {
  id: "client-a-id",
  client_key: "acme-ads",
  secret_hash: sha256("secret-a"),
  display_name: "Acme Ads",
  attributed_user_id: USER_A,
  cost_limit_cents: null,
  cost_used_cents: 0,
  status: "active",
};
const CLIENT_B_ROW: Row = {
  id: "client-b-id",
  client_key: "beta-ads",
  secret_hash: sha256("secret-b"),
  display_name: "Beta Ads",
  attributed_user_id: USER_B,
  cost_limit_cents: null,
  cost_used_cents: 0,
  status: "active",
};
const DISABLED_CLIENT_ROW: Row = {
  ...CLIENT_A_ROW,
  id: "client-disabled",
  client_key: "disabled-ads",
  secret_hash: sha256("secret-disabled"),
  status: "disabled",
};

const AD_A1: Row = {
  id: "ad-a1",
  user_id: USER_A,
  advertiser: "Acme Corp",
  headline: "Emagreça com IA",
  copy: "copy a1",
  cta: "Saiba mais",
  image_url: "https://example.com/a1.jpg",
  video_url: null,
  platform: "Facebook",
  country: "BR",
  niche: "Saúde",
  score: 90,
  ad_library_id: "fb-a1",
  ad_url: "https://facebook.com/ads/a1",
  landing_page_url: "https://acme.com/oferta",
  start_date: "2026-01-01T00:00:00.000Z",
  first_seen_at: "2026-01-02T00:00:00.000Z",
  last_seen_at: "2026-01-05T00:00:00.000Z",
  created_at: "2026-01-02T00:00:00.000Z",
};
const AD_B1: Row = {
  id: "ad-b1",
  user_id: USER_B,
  advertiser: "Beta Inc",
  headline: "Produto da Beta",
  copy: "copy b1",
  cta: "Comprar",
  image_url: "https://example.com/b1.jpg",
  video_url: null,
  platform: "Facebook",
  country: "US",
  niche: "Fitness",
  score: 70,
  ad_library_id: "fb-b1",
  ad_url: "https://facebook.com/ads/b1",
  landing_page_url: "https://beta.com/offer",
  start_date: "2026-02-01T00:00:00.000Z",
  first_seen_at: "2026-02-02T00:00:00.000Z",
  last_seen_at: "2026-02-05T00:00:00.000Z",
  created_at: "2026-02-02T00:00:00.000Z",
};

const TIKTOK_A1: Row = {
  id: "tt-a1",
  user_id: USER_A,
  hashtag: "emagrecimento",
  video_id: "vid-1",
  video_url: "https://tiktok.com/v/1",
  thumbnail_url: "https://tiktok.com/thumb/1.jpg",
  creator: "criador_x",
  description: "video description",
  hook: "Você não vai acreditar",
  likes: 1000,
  comments: 50,
  shares: 20,
  views: 50000,
  viral_score: 88,
  create_time: "2026-01-10T00:00:00.000Z",
  created_at: "2026-01-10T00:00:00.000Z",
};

const SAVED_ACTION_A: Row = {
  user_id: USER_A,
  action: "saved",
  created_at: "2026-01-06T00:00:00.000Z",
  collected_ads: AD_A1,
};
const SAVED_ACTION_B: Row = {
  user_id: USER_B,
  action: "saved",
  created_at: "2026-02-06T00:00:00.000Z",
  collected_ads: AD_B1,
};

beforeEach(() => {
  FIXTURES = {
    private_api_clients: [CLIENT_A_ROW, CLIENT_B_ROW, DISABLED_CLIENT_ROW],
    collected_ads: [AD_A1, AD_B1],
    tiktok_minerados: [TIKTOK_A1],
    instagram_minerados: [],
    youtube_minerados: [],
    google_trends_minerados: [],
    user_ad_actions: [SAVED_ACTION_A, SAVED_ACTION_B],
  };
  __clearIntelligenceSearchCacheForTests();
  FAILING_TABLES = new Set();
});

describe("authenticatePrivateApiClient — falha de forma segura antes da migration/configuração existir", () => {
  it("se a tabela private_api_clients ainda não existir (migration não aplicada), nunca autentica — nunca lança, nunca expõe dado", async () => {
    FAILING_TABLES = new Set(["private_api_clients"]);
    const client = await authenticatePrivateApiClient("Bearer secret-a");
    expect(client).toBeNull();
  });
});

describe("authenticatePrivateApiClient — identidade resolvida só pelo secret, nunca por um id enviado pelo cliente", () => {
  it("autentica com o secret correto e resolve o client real (attributedUserId real)", async () => {
    const client = await authenticatePrivateApiClient("Bearer secret-a");
    expect(client).not.toBeNull();
    expect(client?.clientKey).toBe("acme-ads");
    expect(client?.attributedUserId).toBe(USER_A);
  });

  it("rejeita secret incorreto", async () => {
    expect(await authenticatePrivateApiClient("Bearer wrong-secret")).toBeNull();
  });

  it("rejeita header ausente ou malformado", async () => {
    expect(await authenticatePrivateApiClient(null)).toBeNull();
    expect(await authenticatePrivateApiClient("secret-a")).toBeNull(); // sem "Bearer "
  });

  it("rejeita um client desabilitado mesmo com secret correto", async () => {
    expect(await authenticatePrivateApiClient("Bearer secret-disabled")).toBeNull();
  });

  it("dois secrets diferentes resolvem clients diferentes, nunca o mesmo", async () => {
    const a = await authenticatePrivateApiClient("Bearer secret-a");
    const b = await authenticatePrivateApiClient("Bearer secret-b");
    expect(a?.attributedUserId).toBe(USER_A);
    expect(b?.attributedUserId).toBe(USER_B);
    expect(a?.id).not.toBe(b?.id);
  });
});

describe("checkCostLimit — consultas pagas bloqueadas por padrão", () => {
  const baseClient: PrivateApiClient = {
    id: "c1",
    clientKey: "acme-ads",
    displayName: "Acme",
    attributedUserId: USER_A,
    costLimitCents: null,
    costUsedCents: 0,
    status: "active",
  };

  it("bloqueia quando cost_limit_cents não está configurado (null)", () => {
    const check = checkCostLimit(baseClient, 100);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/configure cost_limit_cents/i);
  });

  it("permite quando dentro do limite configurado", () => {
    const client = { ...baseClient, costLimitCents: 1000, costUsedCents: 200 };
    expect(checkCostLimit(client, 300).allowed).toBe(true);
  });

  it("bloqueia quando excederia o limite configurado", () => {
    const client = { ...baseClient, costLimitCents: 1000, costUsedCents: 900 };
    const check = checkCostLimit(client, 200);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/exced/i);
  });
});

describe("searchAds — facebook/collected_ads: isolamento real por cliente, nunca por client_id enviado", () => {
  it("cliente A só vê os próprios anúncios reais, nunca os do cliente B", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const result = await searchAds({ source: "facebook" }, clientA!);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("ad-a1");
  });

  it("cliente B só vê os próprios, mesmo chamando com os mesmos parâmetros do cliente A", async () => {
    const clientB = await authenticatePrivateApiClient("Bearer secret-b");
    const result = await searchAds({ source: "facebook" }, clientB!);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("ad-b1");
  });

  it("filtros reais (country/niche/keyword) são aplicados de verdade, sem inventar métricas de venda", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const byKeyword = await searchAds({ source: "facebook", keyword: "Emagreça" }, clientA!);
    expect(byKeyword.results).toHaveLength(1);
    const byWrongCountry = await searchAds({ source: "facebook", country: "US" }, clientA!);
    expect(byWrongCountry.results).toHaveLength(0);
    expect(byKeyword.results[0]).not.toHaveProperty("revenue");
    expect(byKeyword.results[0]).not.toHaveProperty("roas");
  });

  it("facebook não reporta nenhum filtro como não suportado (todos existem no schema real)", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const result = await searchAds({ source: "facebook", country: "BR", niche: "Saúde" }, clientA!);
    expect(result.unsupportedFilters).toEqual([]);
  });

  it("cada anúncio real traz os campos reais exigidos (imagem, anunciante, plataforma, url, identificador, data, landing page)", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const result = await searchAds({ source: "facebook" }, clientA!);
    const ad = result.results[0];
    expect(ad.imageUrl).toBe(AD_A1.image_url);
    expect(ad.advertiserOrAuthor).toBe(AD_A1.advertiser);
    expect(ad.platform).toBe(AD_A1.platform);
    expect(ad.originalUrl).toBe(AD_A1.ad_url);
    expect(ad.identifier).toBe(AD_A1.ad_library_id);
    expect(ad.startDate).toBe(AD_A1.start_date);
    expect(ad.landingPageUrl).toBe(AD_A1.landing_page_url);
    expect(typeof ad.daysActive).toBe("number");
  });
});

describe("searchAds — TikTok: fontes com menos campos reportam honestamente o que não é suportado", () => {
  it("retorna os anúncios/vídeos reais do TikTok do cliente correto", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const result = await searchAds({ source: "tiktok" }, clientA!);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].identifier).toBe("vid-1");
    expect(result.results[0].videoUrl).toBe(TIKTOK_A1.video_url);
  });

  it("reporta explicitamente que startDate/landingPageUrl/creativeType/daysActive não são suportados no TikTok", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const result = await searchAds({ source: "tiktok" }, clientA!);
    expect(result.unsupportedFilters).toEqual(
      expect.arrayContaining(["startDate(exact)", "landingPageUrl", "creativeType", "daysActive"]),
    );
  });

  it("um filtro de country pedido para TikTok é reportado como não aplicado, nunca fingido", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const result = await searchAds({ source: "tiktok", country: "BR" }, clientA!);
    expect(result.unsupportedFilters).toContain("country");
  });
});

describe("getAdDetails / getAdCreatives / getAdEvidence — isolamento e evidência real", () => {
  it("cliente A não consegue ver o detalhe de um anúncio do cliente B (retorna null, não erro revelador)", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    expect(await getAdDetails("ad-b1", "facebook", clientA!)).toBeNull();
  });

  it("cliente A vê o próprio anúncio em detalhe", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const details = await getAdDetails("ad-a1", "facebook", clientA!);
    expect(details?.id).toBe("ad-a1");
  });

  it("get_ad_creatives retorna só a mídia real, nada além disso", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const creatives = await getAdCreatives("ad-a1", "facebook", clientA!);
    expect(creatives).toEqual({ imageUrl: AD_A1.image_url, videoUrl: AD_A1.video_url });
  });

  it("get_ad_evidence para facebook reutiliza a mesma evidência do contrato Cris OS (original_url/collected_at/original_reference)", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const evidence = await getAdEvidence("ad-a1", "facebook", clientA!);
    expect(evidence?.original_url).toBe(AD_A1.ad_url);
    expect(evidence?.original_reference).toBe(AD_A1.ad_library_id);
    expect(evidence?.collected_at).toBe(AD_A1.first_seen_at);
  });

  it("get_ad_evidence nunca inclui receita/ROAS/lucratividade", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const evidence = await getAdEvidence("ad-a1", "facebook", clientA!);
    const serialized = JSON.stringify(evidence).toLowerCase();
    expect(serialized).not.toMatch(/revenue|roas|profit|faturamento|lucro/);
  });
});

describe("getSavedOffers — reaproveita user_ad_actions (mesma mecânica de /ofertas-salvas), isolado por cliente", () => {
  it("retorna somente as ofertas salvas do cliente autenticado", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const saved = await getSavedOffers(clientA!);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("ad-a1");
  });

  it("cliente B nunca recebe a oferta salva do cliente A", async () => {
    const clientB = await authenticatePrivateApiClient("Bearer secret-b");
    const saved = await getSavedOffers(clientB!);
    expect(saved.map((s) => s.id)).not.toContain("ad-a1");
  });
});

describe("createAdaptationBrief — só prepara o briefing, nunca gera criativo nem envia ao Cris OS", () => {
  it("retorna o briefing com dados observados reais e o aviso explícito", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const brief = await createAdaptationBrief(
      { sourceAdId: "ad-a1", source: "facebook", clientProduct: { name: "Meu Produto" } },
      clientA!,
    );
    expect(brief).not.toBeNull();
    expect(brief?.reference.id).toBe("ad-a1");
    expect(brief?.clientProduct.name).toBe("Meu Produto");
    expect(brief?.notice).toMatch(/nenhum criativo foi gerado/i);
    expect(brief?.notice).toMatch(/nenhuma missão foi enviada ao cris os/i);
  });

  it("carrega o MESMO handoff_id que o contrato real do Cris OS geraria para este anúncio, sem enviá-lo", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const brief = await createAdaptationBrief(
      { sourceAdId: "ad-a1", source: "facebook", clientProduct: { name: "Meu Produto" } },
      clientA!,
    );
    const { buildHandoffFromCollectedAd } = await import("@/lib/cris-os/contract");
    const expected = buildHandoffFromCollectedAd(AD_A1 as never);
    expect(brief?.crisOsHandoffId).toBe(expected.handoff_id);
  });

  it("não pode gerar briefing para um anúncio de outro cliente", async () => {
    const clientA = await authenticatePrivateApiClient("Bearer secret-a");
    const brief = await createAdaptationBrief(
      { sourceAdId: "ad-b1", source: "facebook", clientProduct: { name: "X" } },
      clientA!,
    );
    expect(brief).toBeNull();
  });

  it("nunca importa nem chama o serviço real de envio ao Cris OS", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "intelligence-api.ts"), "utf-8");
    expect(src).not.toMatch(/import\s*\{[^}]*handoffToCrisOs|handoffToCrisOs\(/);
  });
});

describe("Cache de busca — isolamento entre clientes, mesmo com parâmetros idênticos", () => {
  const clientA: PrivateApiClient = {
    id: "client-a-id",
    clientKey: "acme-ads",
    displayName: "Acme",
    attributedUserId: USER_A,
    costLimitCents: null,
    costUsedCents: 0,
    status: "active",
  };
  const clientB: PrivateApiClient = {
    ...clientA,
    id: "client-b-id",
    clientKey: "beta-ads",
    attributedUserId: USER_B,
  };
  const params = { source: "facebook" as const };
  const fakeResultForA = { source: "facebook" as const, results: [], unsupportedFilters: [] };

  it("um valor em cache para o cliente A nunca é lido pelo cliente B com os mesmos parâmetros", () => {
    setCachedSearch(clientA, params, fakeResultForA);
    expect(getCachedSearch(clientA, params)).toEqual(fakeResultForA);
    expect(getCachedSearch(clientB, params)).toBeNull();
  });

  it("expira após o TTL (usando o parâmetro `now` injetável)", () => {
    const t0 = 1_000_000;
    setCachedSearch(clientA, params, fakeResultForA, t0);
    expect(getCachedSearch(clientA, params, t0 + 1000)).toEqual(fakeResultForA);
    expect(getCachedSearch(clientA, params, t0 + 61_000)).toBeNull();
  });

  it("searchAds real preenche e reutiliza o cache (uma segunda chamada idêntica não precisa de nova consulta visível ao resultado)", async () => {
    const result1 = await searchAds({ source: "facebook" }, clientA);
    const result2 = await searchAds({ source: "facebook" }, clientA);
    expect(result2).toEqual(result1);
  });
});
