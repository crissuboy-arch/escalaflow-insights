// Biblioteca de Ofertas — camada de dados (cliente).
//
// Lê collected_ads (ofertas REAIS coletadas pelo Motor de Coleta / extensão)
// e deriva tudo o que a interface mostra. Regra de ouro: nada é inventado.
//  • Mídia: cópia durável no Storage quando existe, senão o URL original.
//  • "Anúncios ativos": só o que a própria Biblioteca de Anúncios devolveu
//    (raw.collation_count / raw.is_active). Sem isso, não mostramos número.
//  • "Dias no ar": a partir de start_date da Ad Library; sem data, nada.
//  • Nicho / idioma: classificação por palavras do próprio texto do anúncio,
//    sempre rotulada como "detectado".
import { supabase } from "@/integrations/supabase/client";
import { resolveAdImageUrl, resolveAdVideoUrl } from "@/lib/collector/media-url";

export type ScaleLevel = "cold" | "warming" | "hot" | "scaled";

export interface LibraryOffer {
  id: string;
  key: string;
  ad_library_id: string | null;
  ad_url: string | null;
  advertiser: string;
  headline: string;
  copy: string;
  cta: string | null;
  platform: string;
  country: string;
  niche: string;
  keyword: string | null;
  score: number;
  created_at: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  start_date: string | null;
  landing_page_url: string | null;
  offer_network: string | null;
  image_url: string | null;
  video_url: string | null;
  image_storage_path: string | null;
  video_storage_path: string | null;
  media_status: string | null;
  /** URLs já resolvidos (Storage primeiro). */
  image: string | null;
  video: string | null;
  mediaDurable: boolean;
  // Sinais reais da Ad Library (podem não existir)
  activeAdsCount: number | null;
  isActive: boolean | null;
  publisherPlatforms: string[];
  pageLikes: number | null;
  // Enriquecimento já calculado no coletor
  tags: string[];
  scaleLevel: ScaleLevel | null;
  promise: string | null;
  offerType: string | null;
  // Derivados (rotulados como detectados)
  nicheGroup: NicheId;
  language: LanguageCode | null;
  daysRunning: number | null;
  searchText: string;
}

export type LanguageCode = "pt" | "es" | "en" | "fr" | "de" | "it";
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  pt: "Português",
  es: "Espanhol",
  en: "Inglês",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
};

export type NicheId =
  | "saude"
  | "renda"
  | "beleza"
  | "relacionamento"
  | "educacao"
  | "desenvolvimento"
  | "religioso"
  | "infantil"
  | "produtos"
  | "marketing"
  | "outros";

export const NICHES: { id: NicheId; label: string; emoji: string; words: string[] }[] = [
  {
    id: "saude",
    label: "Saúde & Emagrecimento",
    emoji: "🩺",
    words: [
      "emagrec",
      "peso",
      "dieta",
      "saúde",
      "saude",
      "gordura",
      "diabet",
      "dor ",
      "dores",
      "articula",
      "pressão",
      "suplement",
      "colágeno",
      "colageno",
      "detox",
      "barriga",
      "jejum",
      "nutri",
      "weight",
      "fat ",
      "health",
      "pérdida de peso",
      "adelgaz",
      "glp",
      "ozempic",
      "keto",
      "fitness",
      "treino",
      "academia",
      "próstata",
      "prostata",
      "visão",
      "ansiedade",
      "sono",
    ],
  },
  {
    id: "renda",
    label: "Renda Extra & Finanças",
    emoji: "💰",
    words: [
      "renda",
      "dinheiro",
      "ganhar",
      "lucro",
      "faturar",
      "fatura",
      "invest",
      "finan",
      "cripto",
      "bitcoin",
      "trader",
      "trade",
      "bolsa",
      "afiliad",
      "money",
      "income",
      "dinero",
      "ingresos",
      "negócio",
      "negocio",
      "empreend",
      "vender",
      "vendas",
      "home office",
      "trabalhar de casa",
    ],
  },
  {
    id: "beleza",
    label: "Beleza & Estética",
    emoji: "💄",
    words: [
      "beleza",
      "pele",
      "cabelo",
      "rugas",
      "maquiag",
      "unha",
      "estética",
      "estetica",
      "skincare",
      "skin",
      "hair",
      "cílios",
      "sobrancelha",
      "manchas",
      "belleza",
      "cabello",
      "perfume",
    ],
  },
  {
    id: "relacionamento",
    label: "Relacionamento",
    emoji: "❤️",
    words: [
      "relacionamento",
      "namor",
      "casamento",
      "conquist",
      "ex ",
      "amor",
      "sedução",
      "seducao",
      "marido",
      "esposa",
      "dating",
      "relationship",
      "pareja",
      "reconquist",
    ],
  },
  {
    id: "educacao",
    label: "Educação & Cursos",
    emoji: "🎓",
    words: [
      "curso",
      "aula",
      "aprenda",
      "aprender",
      "concurso",
      "enem",
      "inglês",
      "ingles",
      "idioma",
      "certificado",
      "faculdade",
      "estudo",
      "estudar",
      "professor",
      "course",
      "learn",
      "mentoria",
      "treinamento",
      "workshop",
      "masterclass",
      "ebook",
      "e-book",
      "apostila",
    ],
  },
  {
    id: "desenvolvimento",
    label: "Desenvolvimento Pessoal",
    emoji: "🧠",
    words: [
      "mentalidade",
      "hábito",
      "habito",
      "produtiv",
      "autoestima",
      "foco",
      "disciplina",
      "propósito",
      "proposito",
      "lei da atração",
      "manifest",
      "coach",
      "motivação",
      "inteligência emocional",
    ],
  },
  {
    id: "religioso",
    label: "Religioso & Espiritualidade",
    emoji: "🙏",
    words: [
      "deus",
      "jesus",
      "bíblia",
      "biblia",
      "oração",
      "oracao",
      "fé ",
      "igreja",
      "cristão",
      "cristao",
      "devocional",
      "salmo",
      "espiritual",
      "god",
      "prayer",
      "bible",
      "oración",
    ],
  },
  {
    id: "infantil",
    label: "Infantil & Maternidade",
    emoji: "🧸",
    words: [
      "criança",
      "crianca",
      "filho",
      "bebê",
      "bebe",
      "mãe",
      "mae ",
      "maternidade",
      "infantil",
      "colorir",
      "atividades",
      "alfabetiza",
      "kids",
      "baby",
      "niños",
      "figurinha",
    ],
  },
  {
    id: "produtos",
    label: "Produtos Físicos & E-commerce",
    emoji: "🛍️",
    words: [
      "frete",
      "compre",
      "loja",
      "promoção",
      "promocao",
      "desconto",
      "oferta imperdível",
      "kit ",
      "unidades",
      "shop",
      "envio",
      "entrega",
      "garanta o seu",
      "estoque",
      "pague na entrega",
    ],
  },
  {
    id: "marketing",
    label: "Marketing Digital & IA",
    emoji: "🚀",
    words: [
      "marketing",
      "tráfego",
      "trafego",
      "instagram",
      "tiktok",
      "seguidores",
      "anúncio",
      "anuncio",
      "copy",
      "lançamento",
      "lancamento",
      "infoproduto",
      "chatgpt",
      " ia ",
      "inteligência artificial",
      "inteligencia artificial",
      "automação",
      "automacao",
      "saas",
      "app ",
      "site",
      "landing",
      "social media",
    ],
  },
];

export const NICHE_LABEL: Record<NicheId, string> = Object.fromEntries([
  ...NICHES.map((n) => [n.id, n.label]),
  ["outros", "Outros"],
]) as Record<NicheId, string>;

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function detectNiche(text: string, declaredNiche?: string | null): NicheId {
  const hay = ` ${text.toLowerCase()} ${(declaredNiche ?? "").toLowerCase()} `;
  let best: NicheId = "outros";
  let bestHits = 0;
  for (const n of NICHES) {
    let hits = 0;
    for (const w of n.words) if (hay.includes(w)) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = n.id;
    }
  }
  return best;
}

const LANG_WORDS: Record<LanguageCode, string[]> = {
  pt: [
    "você",
    "voce",
    "não",
    "nao",
    "para",
    "com",
    "seu",
    "sua",
    "mais",
    "como",
    "agora",
    "aqui",
    "isso",
    "uma",
    "são",
    "está",
    "também",
    "já",
    "dinheiro",
    "grátis",
  ],
  es: [
    "usted",
    "para",
    "con",
    "tu",
    "más",
    "como",
    "ahora",
    "aquí",
    "esto",
    "una",
    "son",
    "está",
    "también",
    "ya",
    "dinero",
    "gratis",
    "el",
    "los",
    "las",
    "por",
  ],
  en: [
    "you",
    "your",
    "the",
    "and",
    "with",
    "for",
    "this",
    "now",
    "here",
    "free",
    "get",
    "how",
    "what",
    "are",
    "is",
    "our",
    "today",
    "more",
  ],
  fr: [
    "vous",
    "votre",
    "avec",
    "pour",
    "est",
    "les",
    "des",
    "une",
    "plus",
    "maintenant",
    "gratuit",
    "comment",
    "c'est",
    "nous",
  ],
  de: [
    "sie",
    "ihr",
    "und",
    "mit",
    "für",
    "jetzt",
    "hier",
    "kostenlos",
    "wie",
    "das",
    "ist",
    "die",
    "der",
    "nicht",
  ],
  it: [
    "tuo",
    "tua",
    "con",
    "per",
    "questo",
    "ora",
    "qui",
    "gratis",
    "come",
    "sono",
    "più",
    "della",
    "che",
    "non",
  ],
};

/** Idioma detectado pelo texto do anúncio; null quando não há texto suficiente. */
export function detectLanguage(text: string): LanguageCode | null {
  const words = text
    .toLowerCase()
    .split(/[^a-zà-ÿ']+/i)
    .filter(Boolean);
  if (words.length < 4) return null;
  const set = new Map<string, number>();
  for (const w of words) set.set(w, (set.get(w) ?? 0) + 1);
  let best: LanguageCode | null = null;
  let bestScore = 0;
  for (const [lang, list] of Object.entries(LANG_WORDS) as [LanguageCode, string[]][]) {
    let score = 0;
    for (const w of list) score += set.get(w) ?? 0;
    // desempates específicos pt x es
    if (lang === "pt" && /ção|ções|ã|õ/.test(text)) score += 2;
    if (lang === "es" && /ñ|¿|¡|ción\b/.test(text)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return bestScore >= 2 ? best : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

interface RawRow {
  id: string;
  ad_library_id: string | null;
  ad_url: string | null;
  advertiser: string;
  headline: string;
  copy: string | null;
  cta: string | null;
  platform: string;
  country: string;
  niche: string;
  keyword: string | null;
  score: number;
  created_at: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  start_date: string | null;
  landing_page_url: string | null;
  offer_network: string | null;
  image_url: string | null;
  video_url: string | null;
  image_storage_path: string | null;
  video_storage_path: string | null;
  media_status: string | null;
  collation_count?: unknown;
  is_active?: unknown;
  publisher_platform?: unknown;
  page_like_count?: unknown;
  enriched?: Record<string, unknown> | null;
}

export function toLibraryOffer(r: RawRow): LibraryOffer {
  const e = (r.enriched ?? {}) as Record<string, unknown>;
  const text = `${r.headline ?? ""} ${r.copy ?? ""}`;
  const start = r.start_date ? new Date(r.start_date) : null;
  const daysRunning =
    start && !Number.isNaN(start.getTime())
      ? Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000))
      : null;
  const tags = Array.isArray(e.tags) ? (e.tags as string[]) : [];
  const image = resolveAdImageUrl(r);
  const video = resolveAdVideoUrl(r);
  const scaleLevel = (e.scaleLevel as ScaleLevel | undefined) ?? null;
  const offer: LibraryOffer = {
    id: r.id,
    key: r.ad_library_id || r.ad_url || r.id,
    ad_library_id: r.ad_library_id,
    ad_url: r.ad_url,
    advertiser: r.advertiser || "Anunciante",
    headline: r.headline || "",
    copy: r.copy || "",
    cta: r.cta,
    platform: r.platform || "Facebook",
    country: r.country || "—",
    niche: r.niche || "Geral",
    keyword: r.keyword,
    score: r.score ?? 0,
    created_at: r.created_at,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    start_date: r.start_date,
    landing_page_url: r.landing_page_url,
    offer_network: r.offer_network,
    image_url: r.image_url,
    video_url: r.video_url,
    image_storage_path: r.image_storage_path,
    video_storage_path: r.video_storage_path,
    media_status: r.media_status,
    image,
    video,
    mediaDurable: Boolean(r.image_storage_path || r.video_storage_path),
    activeAdsCount: num(r.collation_count),
    isActive: typeof r.is_active === "boolean" ? r.is_active : null,
    publisherPlatforms: Array.isArray(r.publisher_platform)
      ? (r.publisher_platform as unknown[]).map(String)
      : [],
    pageLikes: num(r.page_like_count),
    tags,
    scaleLevel,
    promise: (e.promise as string | null | undefined) ?? null,
    offerType: (e.offerType as string | null | undefined) ?? null,
    nicheGroup: detectNiche(`${text} ${tags.join(" ")} ${r.keyword ?? ""}`, r.niche),
    language: detectLanguage(text),
    daysRunning,
    searchText: normalize(
      [
        r.advertiser,
        r.headline,
        r.copy,
        r.keyword,
        r.niche,
        r.cta,
        tags.join(" "),
        r.landing_page_url,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  };
  return offer;
}

const SELECT_COLS = [
  "id",
  "ad_library_id",
  "ad_url",
  "advertiser",
  "headline",
  "copy",
  "cta",
  "platform",
  "country",
  "niche",
  "keyword",
  "score",
  "created_at",
  "first_seen_at",
  "last_seen_at",
  "start_date",
  "landing_page_url",
  "offer_network",
  "image_url",
  "video_url",
  "image_storage_path",
  "video_storage_path",
  "media_status",
  // Campos da Ad Library guardados em raw — só o necessário, não o JSON todo.
  "collation_count:raw->collation_count",
  "is_active:raw->is_active",
  "publisher_platform:raw->publisher_platform",
  "page_like_count:raw->snapshot->page_like_count",
  "enriched:raw->enriched",
].join(", ");

export async function fetchLibraryOffers(limit = 600): Promise<LibraryOffer[]> {
  const { data, error } = await supabase
    .from("collected_ads")
    .select(SELECT_COLS)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return dedupeOffers(((data ?? []) as unknown as RawRow[]).map(toLibraryOffer));
}

export async function fetchLibraryOffer(id: string): Promise<LibraryOffer | null> {
  const { data, error } = await supabase
    .from("collected_ads")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toLibraryOffer(data as unknown as RawRow) : null;
}

export async function fetchAdvertiserOffers(advertiser: string, excludeId: string) {
  const { data, error } = await supabase
    .from("collected_ads")
    .select(SELECT_COLS)
    .eq("advertiser", advertiser)
    .neq("id", excludeId)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(24);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawRow[]).map(toLibraryOffer);
}

/** Mesma oferta coletada duas vezes (mesmo id da Ad Library/URL) vira um card só. */
export function dedupeOffers(list: LibraryOffer[]): LibraryOffer[] {
  const seen = new Map<string, LibraryOffer>();
  for (const o of list) {
    const prev = seen.get(o.key);
    if (!prev || (!prev.mediaDurable && o.mediaDurable)) seen.set(o.key, o);
  }
  return Array.from(seen.values());
}

export function hasMedia(o: LibraryOffer): boolean {
  return Boolean(o.image || o.video);
}

export function isScaling(o: LibraryOffer): boolean {
  return (
    o.scaleLevel === "hot" ||
    o.scaleLevel === "scaled" ||
    (o.activeAdsCount ?? 0) >= 5 ||
    o.score >= 70
  );
}

/** Força de escala para ordenar: usa sinais reais quando existem. */
export function scaleRank(o: LibraryOffer): number {
  const active = o.activeAdsCount ?? 0;
  const lvl = { cold: 0, warming: 1, hot: 2, scaled: 3 }[o.scaleLevel ?? "cold"];
  return o.score + Math.min(active, 50) * 1.5 + lvl * 8 + Math.min(o.daysRunning ?? 0, 60) * 0.3;
}

export function isNewThisWeek(o: LibraryOffer): boolean {
  const ref = o.first_seen_at ?? o.created_at;
  return Date.now() - new Date(ref).getTime() <= 7 * 86_400_000;
}

export interface LibraryFilters {
  q: string;
  country: string;
  language: string;
  platform: string;
  niche: string;
  onlyMedia: boolean;
}

export const EMPTY_FILTERS: LibraryFilters = {
  q: "",
  country: "all",
  language: "all",
  platform: "all",
  niche: "all",
  onlyMedia: false,
};

/** Pesquisa: sem acentos, todos os termos têm de aparecer (E), aceita "frase exata". */
export function matchesQuery(o: LibraryOffer, q: string): boolean {
  const query = normalize(q.trim());
  if (!query) return true;
  const phrases = Array.from(query.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  const rest = query
    .replace(/"[^"]+"/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return (
    phrases.every((p) => o.searchText.includes(p)) && rest.every((t) => o.searchText.includes(t))
  );
}

export function applyFilters(list: LibraryOffer[], f: LibraryFilters): LibraryOffer[] {
  return list.filter((o) => {
    if (f.country !== "all" && o.country !== f.country) return false;
    if (f.language !== "all" && o.language !== f.language) return false;
    if (f.platform !== "all") {
      const p = f.platform.toLowerCase();
      const onPlatform =
        o.platform.toLowerCase() === p || o.publisherPlatforms.some((x) => x.toLowerCase() === p);
      if (!onPlatform) return false;
    }
    if (f.niche !== "all" && o.nicheGroup !== f.niche) return false;
    if (f.onlyMedia && !hasMedia(o)) return false;
    return matchesQuery(o, f.q);
  });
}

export function isFiltering(f: LibraryFilters): boolean {
  return (
    f.q.trim() !== "" ||
    f.country !== "all" ||
    f.language !== "all" ||
    f.platform !== "all" ||
    f.niche !== "all" ||
    f.onlyMedia
  );
}

export const COUNTRY_LABELS: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  PT: "Portugal",
  ES: "Espanha",
  MX: "México",
  AR: "Argentina",
  CO: "Colômbia",
  GB: "Reino Unido",
  CA: "Canadá",
  FR: "França",
  DE: "Alemanha",
  IT: "Itália",
  CL: "Chile",
  PE: "Peru",
};

export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: n >= 10_000 ? "compact" : "standard" }).format(
    n,
  );
}
