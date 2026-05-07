const ANALYZED_ADS_KEY = "escalaflow_analyzed_ads_v1";

export async function rememberAdForAnalysis(ad: PersistedAd): Promise<void> {
  const m = readAdMap(ANALYZED_ADS_KEY);
  m[ad.key] = { ...ad, saved_at: new Date().toISOString() };
  writeAdMap(ANALYZED_ADS_KEY, m);
}
export function getAnalyzedAdByKey(key: string): PersistedAd | undefined {
  return (
    readAdMap(ANALYZED_ADS_KEY)[key] ??
    readAdMap(SAVED_ADS_KEY)[key] ??
    readAdMap(FAV_ADS_KEY)[key] ??
    readAdMap(SCALED_ADS_KEY)[key]
  );
}
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
const ANALYSES_KEY = "escalaflow_analyses";
const SAVED_ADS_KEY = "escalaflow_saved_ads_v1";
const FAV_ADS_KEY = "escalaflow_fav_ads_v1";
const SCALED_ADS_KEY = "escalaflow_scaled_ads_v1";
const EVT = "escalaflow:change";

function emitChange(scope: "saved" | "fav" | "analyses" | "scaled") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT, { detail: scope }));
}

export function subscribeChange(cb: (scope: "saved" | "fav" | "analyses" | "scaled") => void) {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

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

// ---------- Real collected-ad persistence (localStorage) ----------
export interface PersistedAd {
  key: string;
  ad_library_id: string | null;
  ad_url: string | null;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  image_url: string | null;
  video_url: string | null;
  platform: string;
  country: string;
  niche: string;
  score: number;
  created_at: string;
  saved_at: string;
  scaled?: boolean;
  repeatedCreativeCount?: number;
  platforms?: string[];
}

function readAdMap(key: string): Record<string, PersistedAd> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as Record<string, PersistedAd>) : {};
  } catch {
    return {};
  }
}
function writeAdMap(key: string, m: Record<string, PersistedAd>) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(m));
}

export async function saveCollectedAd(ad: PersistedAd): Promise<boolean> {
  console.log("saving offer", ad);
  const m = readAdMap(SAVED_ADS_KEY);
  const existed = !!m[ad.key];
  if (existed) delete m[ad.key];
  else m[ad.key] = { ...ad, saved_at: new Date().toISOString() };
  writeAdMap(SAVED_ADS_KEY, m);
  // mirror id-set for legacy callers
  const s = readSet(SAVED_KEY);
  if (existed) s.delete(ad.key); else s.add(ad.key);
  writeSet(SAVED_KEY, s);
  emitChange("saved");
  console.log("offer saved", ad.key, !existed);
  return !existed;
}

export async function favoriteCollectedAd(ad: PersistedAd, value: boolean): Promise<void> {
  console.log("saving favorite", ad);
  const m = readAdMap(FAV_ADS_KEY);
  if (value) m[ad.key] = { ...ad, saved_at: new Date().toISOString() };
  else delete m[ad.key];
  writeAdMap(FAV_ADS_KEY, m);
  const f = readSet(FAV_KEY);
  if (value) f.add(ad.key); else f.delete(ad.key);
  writeSet(FAV_KEY, f);
  emitChange("fav");
  console.log("favorite saved", ad.key, value);
}

export async function fetchSavedAds(): Promise<PersistedAd[]> {
  const m = readAdMap(SAVED_ADS_KEY);
  const list = Object.values(m).sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  console.log("loaded saved offers", list.length);
  return list;
}
export async function fetchFavoriteAds(): Promise<PersistedAd[]> {
  const m = readAdMap(FAV_ADS_KEY);
  const list = Object.values(m).sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  console.log("loaded favorites", list.length);
  return list;
}
export async function scaleCollectedAd(ad: PersistedAd): Promise<void> {
  console.log("saving scaled", ad);
  const m = readAdMap(SCALED_ADS_KEY);
  m[ad.key] = { ...ad, scaled: true, saved_at: new Date().toISOString() };
  writeAdMap(SCALED_ADS_KEY, m);
  emitChange("scaled");
}
export async function fetchScaledAds(): Promise<PersistedAd[]> {
  const m = readAdMap(SCALED_ADS_KEY);
  const list = Object.values(m)
    .filter((ad) => ad.scaled || ad.score >= 80 || (ad.repeatedCreativeCount ?? 0) > 1 || (ad.platforms?.length ?? 1) > 1)
    .sort((a, b) => b.score - a.score || b.saved_at.localeCompare(a.saved_at));
  console.log("loaded scaled offers", list.length);
  return list;
}
export function getSavedCount(): number {
  return Object.keys(readAdMap(SAVED_ADS_KEY)).length;
}
export function getScaledCount(): number {
  return Object.keys(readAdMap(SCALED_ADS_KEY)).length;
}
export function getPersistedAdByKey(key: string): PersistedAd | undefined {
  return readAdMap(SAVED_ADS_KEY)[key] ?? readAdMap(FAV_ADS_KEY)[key] ?? readAdMap(SCALED_ADS_KEY)[key];
}

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

export async function fetchFavIds(_userId?: string): Promise<Set<string>> {
  return readSet(FAV_KEY);
}

export function getFavCount(): number {
  return readSet(FAV_KEY).size;
}

export async function toggleSaveOffer(_userId: string, offerId: string): Promise<boolean> {
  const s = readSet(SAVED_KEY);
  const isSaved = s.has(offerId);
  if (isSaved) s.delete(offerId); else s.add(offerId);
  writeSet(SAVED_KEY, s);
  emitChange("saved");
  return !isSaved;
}

export async function toggleFavorite(_userId: string, offerId: string, value: boolean) {
  const f = readSet(FAV_KEY);
  if (value) f.add(offerId); else f.delete(offerId);
  writeSet(FAV_KEY, f);
  emitChange("fav");
}

function readAnalysesStore(): DemoAnalysis[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(ANALYSES_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeAnalysesStore(list: DemoAnalysis[]) {
  if (typeof window !== "undefined") localStorage.setItem(ANALYSES_KEY, JSON.stringify(list));
}

export async function fetchAnalyses(): Promise<DemoAnalysis[]> {
  const stored = readAnalysesStore();
  const seen = new Set(stored.map((a) => a.id));
  return [...stored, ...DEMO_ANALYSES.filter((a) => !seen.has(a.id))];
}

export async function createAnalysisForOffer(offerId: string): Promise<DemoAnalysis> {
  const analysis = getAnalysisForOffer(offerId);
  const list = readAnalysesStore();
  const filtered = list.filter((a) => a.id !== analysis.id);
  filtered.unshift(analysis);
  writeAnalysesStore(filtered);
  emitChange("analyses");
  return analysis;
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

export interface AITrends {
  hotNiches: { name: string; growth: string }[];
  emergingOffers: DemoOffer[];
  scalingCreatives: string[];
  trendingCountries: { code: string; label: string; growth: string }[];
  topScores: DemoOffer[];
  signals: TrendSignal[];
}

export interface TrendSignal {
  emoji: string;
  title: string;
  subtitle: string;
  score: number;
  growth: number;
  time: string;
  country: string;
  direction: "up" | "down" | "stable";
}

export function getAITrends(): AITrends {
  const sorted = [...DEMO_OFFERS].sort((a, b) => b.scale_score - a.scale_score);
  const niches = Array.from(new Set(DEMO_OFFERS.map((o) => o.niche))).slice(0, 5);
  return {
    hotNiches: niches.map((n, i) => ({ name: n, growth: `+${20 + i * 11}%` })),
    emergingOffers: sorted.slice(3, 6),
    scalingCreatives: [
      "Vídeo VSL com gancho de 3 segundos",
      "Carrossel comparativo antes x depois",
      "Reel com depoimento autêntico",
      "Imagem estática com headline ousada",
    ],
    trendingCountries: [
      { code: "ES", label: "Espanha", growth: "+47%" },
      { code: "BR", label: "Brasil", growth: "+38%" },
      { code: "US", label: "Estados Unidos", growth: "+29%" },
      { code: "PT", label: "Portugal", growth: "+22%" },
    ],
    topScores: sorted.slice(0, 3),
    signals: [
      { emoji: "🔥", title: "Produto crescendo na Espanha", subtitle: "Saúde e beleza", score: 92, growth: 47, time: "há 2h", country: "ES", direction: "up" },
      { emoji: "📈", title: "Oferta escalando em saúde", subtitle: "Nutra dominando feed", score: 88, growth: 38, time: "há 5h", country: "BR", direction: "up" },
      { emoji: "🎬", title: "Criativo repetido detectado", subtitle: "Padrão usado por 12 anunciantes", score: 76, growth: 12, time: "há 1d", country: "US", direction: "stable" },
      { emoji: "🎯", title: "Novo padrão de VSL identificado", subtitle: "Gancho de 3 segundos viralizando", score: 95, growth: 61, time: "há 3h", country: "PT", direction: "up" },
    ],
  };
}

export interface OfferMetrics {
  activeAds: number;
  countries: string[];
  estimatedDays: number;
  growth: number;
  status: { label: string; emoji: string };
  spark: number[];
  opportunity: { label: string; value: number; tone: "good" | "warn" | "bad" }[];
  ticketRange: string;
}

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function getOfferMetrics(id: string, score: number): OfferMetrics {
  const h = hash(id);
  const activeAds = Math.round(score * 1.7) + (h % 40);
  const allCountries = ["BR", "US", "ES", "PT", "FR", "MX", "AR"];
  const countries = allCountries.slice(0, 3 + (h % 3));
  const estimatedDays = 5 + (h % 25);
  const growth = 8 + (h % 60);
  const status = score >= 85
    ? { label: "Dominando", emoji: "👑" }
    : score >= 70 ? { label: "Escalando", emoji: "🚀" }
    : score >= 50 ? { label: "Hot", emoji: "🔥" }
    : { label: "Validando", emoji: "🧪" };
  const spark = Array.from({ length: 12 }, (_, i) => 30 + ((h >> i) & 0x3f));
  const ease = 60 + (h % 35);
  const competition = 30 + ((h >> 3) % 60);
  const viral = 50 + ((h >> 5) % 45);
  const saturation = 20 + ((h >> 7) % 70);
  const ticketLow = 47 + ((h >> 9) % 100);
  const ticketHigh = ticketLow + 200 + ((h >> 11) % 600);
  const tone = (v: number, inverted = false) =>
    inverted
      ? (v < 40 ? "good" : v < 70 ? "warn" : "bad")
      : (v > 70 ? "good" : v > 40 ? "warn" : "bad");
  return {
    activeAds, countries, estimatedDays, growth, status, spark,
    ticketRange: `R$ ${ticketLow} – R$ ${ticketHigh}`,
    opportunity: [
      { label: "Fácil de copiar", value: ease, tone: tone(ease) as "good" | "warn" | "bad" },
      { label: "Concorrência", value: competition, tone: tone(competition, true) as "good" | "warn" | "bad" },
      { label: "Potencial viral", value: viral, tone: tone(viral) as "good" | "warn" | "bad" },
      { label: "Saturação", value: saturation, tone: tone(saturation, true) as "good" | "warn" | "bad" },
    ],
  };
}
