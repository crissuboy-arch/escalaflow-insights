// Local demo data — no backend
export interface DemoOffer {
  id: string;
  advertiser_name: string;
  image_url: string | null;
  summary: string | null;
  scale_score: number;
  platform: string;
  niche: string;
  country: string;
  keyword: string;
  status: "escalando" | "validando" | "quente";
}

export interface DemoAnalysis {
  id: string;
  promise: string;
  mechanism: string;
  pains: string[];
  desires: string[];
  target_audience: string;
  mental_triggers: string[];
  offer_structure: string;
  creative_suggestions: string[];
  mined_offers: { advertiser_name: string; niche: string; image_url: string | null };
}

const NICHES = ["Saúde", "Finanças", "Marketing", "Educação", "Beleza", "Tecnologia", "Produtividade", "E-commerce", "Carreira"];
const COUNTRIES = ["BR", "US", "ES", "PT", "FR"];
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Pinterest"];
const STATUSES: DemoOffer["status"][] = ["escalando", "validando", "quente"];
const NAMES = [
  "ScaleMaster Pro", "GrowthHack Academy", "MetaAds Lab", "InfinityFunnel", "PeakConverter",
  "EliteDropship", "BrainBoost AI", "FitRevolution", "WealthMatrix", "CodeNinja School",
  "GlowSkin Co", "ZenMind App", "AdGenius", "TurboLeads", "CreatorOS", "RevenuePulse",
  "StealthCommerce", "VelocityMarketing", "ClarityCoach", "NextLevelAds",
];

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
  "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
];

export const DEMO_OFFERS: DemoOffer[] = NAMES.map((name, i) => ({
  id: `offer-${i + 1}`,
  advertiser_name: name,
  image_url: COVER_IMAGES[i % COVER_IMAGES.length],
  summary: `${name} está escalando uma oferta validada com criativos de alto desempenho e copy persuasiva.`,
  scale_score: 60 + ((i * 7) % 40),
  platform: PLATFORMS[i % PLATFORMS.length],
  niche: NICHES[i % NICHES.length],
  country: COUNTRIES[i % COUNTRIES.length],
  keyword: name.toLowerCase().split(" ")[0],
  status: STATUSES[i % STATUSES.length],
}));

export const DEMO_ANALYSES: DemoAnalysis[] = DEMO_OFFERS.slice(0, 6).map((o) => ({
  id: `analysis-${o.id}`,
  promise: `Alcance resultados em ${o.niche.toLowerCase()} em até 30 dias com método validado.`,
  mechanism: `Sistema proprietário em 3 etapas combinando ${o.niche.toLowerCase()} com automação.`,
  pains: ["Falta de tempo", "Resultados inconsistentes", "Sobrecarga de informação", "Falta de método claro"],
  desires: ["Liberdade financeira", "Reconhecimento", "Resultados rápidos", "Confiança"],
  target_audience: `Profissionais de 25-45 anos interessados em ${o.niche.toLowerCase()}.`,
  mental_triggers: ["Escassez", "Prova social", "Autoridade", "Reciprocidade", "Urgência"],
  offer_structure: `Produto principal\n+ Bônus 1: Templates exclusivos\n+ Bônus 2: Comunidade VIP\n+ Garantia de 30 dias`,
  creative_suggestions: [
    "Vídeo testemunho de cliente real (60s)",
    "Carrossel comparativo antes x depois",
    "Reel curto com gancho nos 3 primeiros segundos",
    "Imagem estática com headline forte e CTA",
  ],
  mined_offers: { advertiser_name: o.advertiser_name, niche: o.niche, image_url: o.image_url },
}));

const SAVED_KEY = "escalaflow_saved";
const FAV_KEY = "escalaflow_favs";

const readSet = (key: string): Set<string> => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};
const writeSet = (key: string, s: Set<string>) => {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify([...s]));
};

export async function fetchOffers(filters?: {
  keyword?: string; niche?: string; country?: string; platform?: string; limit?: number;
}): Promise<DemoOffer[]> {
  let list = [...DEMO_OFFERS];
  if (filters?.keyword) {
    const k = filters.keyword.toLowerCase();
    list = list.filter((o) =>
      o.advertiser_name.toLowerCase().includes(k) ||
      (o.summary ?? "").toLowerCase().includes(k) ||
      o.keyword.includes(k)
    );
  }
  if (filters?.niche && filters.niche !== "all") list = list.filter((o) => o.niche === filters.niche);
  if (filters?.country && filters.country !== "all") list = list.filter((o) => o.country === filters.country);
  if (filters?.platform && filters.platform !== "all") list = list.filter((o) => o.platform === filters.platform);
  list.sort((a, b) => b.scale_score - a.scale_score);
  if (filters?.limit) list = list.slice(0, filters.limit);
  return list;
}

export async function fetchSaved(_userId: string) {
  const saved = readSet(SAVED_KEY);
  return DEMO_OFFERS.filter((o) => saved.has(o.id)).map((o) => ({ mined_offers: o, offer_id: o.id }));
}

export async function fetchSavedIds(_userId: string): Promise<Set<string>> {
  return readSet(SAVED_KEY);
}

export async function fetchFavorites(_userId: string) {
  const favs = readSet(FAV_KEY);
  return DEMO_OFFERS.filter((o) => favs.has(o.id)).map((o) => ({ mined_offers: o, offer_id: o.id }));
}

export async function toggleSaveOffer(_userId: string, offerId: string): Promise<boolean> {
  const s = readSet(SAVED_KEY);
  const isSaved = s.has(offerId);
  if (isSaved) s.delete(offerId); else s.add(offerId);
  writeSet(SAVED_KEY, s);
  return !isSaved;
}

export async function toggleFavorite(_userId: string, offerId: string, value: boolean) {
  const f = readSet(FAV_KEY);
  if (value) f.add(offerId); else f.delete(offerId);
  writeSet(FAV_KEY, f);
}

export async function fetchAnalyses(): Promise<DemoAnalysis[]> {
  return DEMO_ANALYSES;
}

export function getOfferById(id: string): DemoOffer | undefined {
  return DEMO_OFFERS.find((o) => o.id === id);
}

export function getAnalysisForOffer(offerId: string): DemoAnalysis {
  const found = DEMO_ANALYSES.find((a) => a.id === `analysis-${offerId}`);
  if (found) return found;
  const offer = getOfferById(offerId) ?? DEMO_OFFERS[0];
  return {
    id: `analysis-${offerId}`,
    promise: `Alcance resultados em ${offer.niche.toLowerCase()} em até 30 dias com método validado.`,
    mechanism: `Sistema proprietário em 3 etapas combinando ${offer.niche.toLowerCase()} com automação inteligente.`,
    pains: ["Falta de tempo", "Resultados inconsistentes", "Sobrecarga de informação", "Falta de método claro"],
    desires: ["Liberdade financeira", "Reconhecimento", "Resultados rápidos", "Confiança"],
    target_audience: `Profissionais de 25-45 anos interessados em ${offer.niche.toLowerCase()}.`,
    mental_triggers: ["Escassez", "Prova social", "Autoridade", "Reciprocidade", "Urgência"],
    offer_structure: `Produto principal\n+ Bônus 1: Templates exclusivos\n+ Bônus 2: Comunidade VIP\n+ Garantia de 30 dias`,
    creative_suggestions: [
      "Vídeo testemunho de cliente real (60s)",
      "Carrossel comparativo antes x depois",
      "Reel curto com gancho nos 3 primeiros segundos",
      "Imagem estática com headline forte e CTA",
    ],
    mined_offers: { advertiser_name: offer.advertiser_name, niche: offer.niche, image_url: offer.image_url },
  };
}
