// Classificador de nicho — módulo PURO (sem imports), partilhado por:
//  • Biblioteca (detectNiche em src/lib/library/offers.ts)
//  • Etiquetador do coletor (src/lib/mining/keywords.ts → raw.enriched.tags)
//  • scripts/reclassify-niches.ts (corre com tsx ou node --experimental-strip-types)
//
// Regras:
//  • Sem acentos e sem maiúsculas (normalize) e correspondência por PALAVRA
//    inteira (tokens Unicode). Nunca substring: "god" não casa com "Godzilla",
//    "copy" não casa com "copyright".
//  • Termos com várias palavras são frases (tokens consecutivos) e valem mais.
//  • Prefixo/radical só quando é explícito com "*" (ex.: "emagrec*").
//  • Peso por campo: título/copy/anunciante fortes, URL médio, palavra-chave de
//    pesquisa fraca, tags antigas do enriquecimento = 0 (não são confiáveis).
//  • Pontuação mínima; abaixo disso → "outros". Desempate determinístico.

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
  | "entretenimento"
  | "diy"
  | "outros";

/** Termo: "palavra", "frase com espaços", "radical*". Peso opcional (padrão 1). */
type Term = string | [term: string, weight: number];

export interface NicheDef {
  id: Exclude<NicheId, "outros">;
  label: string;
  emoji: string;
  /** Termos por idioma (pt, es, en, fr). */
  terms: { pt: Term[]; es: Term[]; en: Term[]; fr: Term[] };
}

// A ordem também é o desempate final (mais específico primeiro).
export const NICHE_DEFS: NicheDef[] = [
  {
    id: "saude",
    label: "Saúde & Emagrecimento",
    emoji: "🩺",
    terms: {
      pt: [
        "emagrec*",
        "perder peso",
        "perda de peso",
        "perca peso",
        "dieta",
        "dietas",
        "saude",
        "saudavel",
        "gordura",
        "queima de gordura",
        "diabet*",
        "dor",
        "dores",
        "articulac*",
        "pressao alta",
        "suplement*",
        "colageno",
        "detox",
        "barriga",
        "jejum",
        "nutricao",
        "nutricionista",
        "glp",
        "ozempic",
        "mounjaro",
        "keto",
        "cetogenica",
        "fitness",
        "treino",
        "treinos",
        "prostata",
        "ansiedade",
        "insonia",
        "colesterol",
        "glicose",
        "glicemia",
        "menopausa",
        "intestino",
        "figado",
        "imunidade",
        "obesidade",
        "metabolismo",
        "calorias",
        "medico",
        "remedio",
        "tratamento",
      ],
      es: [
        "adelgaz*",
        "bajar de peso",
        "perder peso",
        "perdida de peso",
        "salud",
        "saludable",
        "grasa",
        "quemar grasa",
        "dolor",
        "dolores",
        "diabetes",
        "articulaciones",
        "suplemento*",
        "presion arterial",
        "ayuno",
        "nutricion",
        "nutricionista",
        "insomnio",
        "ansiedad",
        "colesterol",
        "menopausia",
        "higado",
        "obesidad",
        "metabolismo",
      ],
      en: [
        "weight loss",
        "lose weight",
        "health",
        "healthy",
        "diet",
        "belly fat",
        "burn fat",
        "fat",
        "pain",
        "joint",
        "joints",
        "diabetes",
        "blood sugar",
        "blood pressure",
        "supplement*",
        "keto",
        "fasting",
        "nutrition*",
        "sleep",
        "insomnia",
        "anxiety",
        "cholesterol",
        "menopause",
        "gut health",
        "metabolism",
        "workout*",
        "fitness",
        "prostate",
      ],
      fr: [
        "maigrir",
        "minceur",
        "perte de poids",
        "perdre du poids",
        "sante",
        "regime",
        "graisse",
        "douleur*",
        "diabete",
        "articulation*",
        "complement alimentaire",
        "nutrition",
        "sommeil",
        "anxiete",
        "cholesterol",
        "menopause",
        "intestin",
      ],
    },
  },
  {
    id: "renda",
    label: "Renda Extra & Finanças",
    emoji: "💰",
    terms: {
      pt: [
        "renda extra",
        "renda passiva",
        "renda",
        "dinheiro",
        "ganhar dinheiro",
        "lucro",
        "lucros",
        "fatur*",
        "investimento*",
        "investir",
        "investidor*",
        "financ*",
        "cripto*",
        "bitcoin",
        "trader*",
        "day trade",
        "bolsa de valores",
        "afiliad*",
        "empreend*",
        "negocio proprio",
        "home office",
        "trabalhar de casa",
        "trabalhe de casa",
        "primeira venda",
        "liberdade financeira",
        "salario",
        "aposentadoria",
        "dividas",
        "emprestimo*",
      ],
      es: [
        "dinero",
        "ganar dinero",
        "ingresos",
        "ingreso extra",
        "ingresos extra",
        "ingreso pasivo",
        "inversion*",
        "invertir",
        "finanzas",
        "financier*",
        "emprend*",
        "negocio propio",
        "trabajar desde casa",
        "ganancias",
        "libertad financiera",
        "prestamo*",
        "cripto*",
        "bitcoin",
        "trading",
      ],
      en: [
        "money",
        "income",
        "extra income",
        "passive income",
        "make money",
        "earn money",
        "invest",
        "investing",
        "investment*",
        "investor*",
        "finance*",
        "financial",
        "crypto*",
        "bitcoin",
        "trading",
        "trader*",
        "side hustle",
        "work from home",
        "affiliate*",
        "entrepreneur*",
        "stock market",
        "retirement",
        "loan*",
        "debt",
      ],
      fr: [
        "argent",
        "gagner de l argent",
        "revenu*",
        "revenus passifs",
        "investiss*",
        "finance*",
        "crypto*",
        "bourse",
        "entrepreneur*",
        "travailler de chez soi",
        "liberte financiere",
      ],
    },
  },
  {
    id: "beleza",
    label: "Beleza & Estética",
    emoji: "💄",
    terms: {
      pt: [
        "beleza",
        "pele",
        "cabelo*",
        "rugas",
        "maquiag*",
        "unha",
        "unhas",
        "estetica",
        "skincare",
        "skin care",
        "cilios",
        "sobrancelha*",
        "manchas",
        "perfume*",
        "shampoo*",
        "xampu",
        "condicionador",
        "caspa",
        "rimel",
        "mascara",
        "mascara de cilios",
        "batom",
        "protetor solar",
        "cosmetic*",
        "hidratante",
        "serum",
        "acne",
        "anti idade",
        "antirrugas",
        "queda de cabelo",
        "calvicie",
        "alopecia",
        "depilacao",
        "progressiva",
        "couro cabeludo",
      ],
      es: [
        "belleza",
        "piel",
        "cabello*",
        "arrugas",
        "maquillaje",
        "pestanas",
        "cejas",
        "champu",
        "caspa",
        "rimel",
        "mascara de pestanas",
        "cosmetic*",
        "crema facial",
        "labial",
        "protector solar",
        "caida del cabello",
        "cuero cabelludo",
        "esmalte",
      ],
      en: [
        "beauty",
        "skin",
        "skincare",
        "hair",
        "haircare",
        "wrinkle*",
        "makeup",
        "make up",
        "mascara",
        "lash",
        "lashes",
        "eyelash*",
        "eyebrow*",
        "brows",
        "nail",
        "nails",
        "shampoo*",
        "conditioner",
        "dandruff",
        "flaky scalp",
        "scalp",
        "cosmetic*",
        "serum",
        "moisturizer",
        "sunscreen",
        "anti aging",
        "lipstick",
        "perfume",
        "fragrance",
        "hair loss",
      ],
      fr: [
        "beaute",
        "peau",
        "cheveux",
        "anti rides",
        "maquillage",
        "mascara",
        "cils",
        "sourcils",
        "ongles",
        "shampooing",
        "pellicules",
        "cosmetique*",
        "serum",
        "creme hydratante",
        "parfum",
        "chute de cheveux",
        "cuir chevelu",
      ],
    },
  },
  {
    id: "relacionamento",
    label: "Relacionamento",
    emoji: "❤️",
    terms: {
      pt: [
        "relacionamento*",
        "namor*",
        "casamento",
        "reconquist*",
        "seducao",
        "seduzir",
        "marido",
        "esposa",
        "seu ex",
        "sua ex",
        "meu ex",
        "minha ex",
        "ex namorado",
        "ex namorada",
        ["amor", 0.5],
        "alma gemea",
        "traicao",
        "infidelidade",
        "divorcio",
        "atrair homens",
      ],
      es: [
        "pareja",
        "tu ex",
        "su ex",
        "mi ex",
        "reconquist*",
        "enamor*",
        "novio",
        "novia",
        "esposo",
        "matrimonio",
        "seduc*",
        "alma gemela",
        "infidelidad",
        "divorcio",
      ],
      en: [
        "dating",
        "relationship*",
        "your ex",
        "get your ex back",
        "boyfriend",
        "girlfriend",
        "husband",
        "wife",
        "marriage",
        "seduction",
        "soulmate",
        "divorce",
      ],
      fr: [
        "couple",
        "votre ex",
        "ton ex",
        "reconquerir",
        "seduction",
        "seduire",
        "mari",
        "epouse",
        "mariage",
        ["amour", 0.5],
        "ame soeur",
        "celibataire*",
        "rencontres",
      ],
    },
  },
  {
    id: "educacao",
    label: "Educação & Cursos",
    emoji: "🎓",
    terms: {
      pt: [
        "curso*",
        "aula",
        "aulas",
        "aprend*",
        "concurso*",
        "enem",
        "vestibular",
        "ingles",
        "idioma*",
        "certificado",
        "certificacao",
        "faculdade",
        "universidade",
        "estud*",
        "professor*",
        "treinamento*",
        "workshop",
        "masterclass",
        "ebook",
        "apostila*",
        "manual",
        "engenh*",
        "gramatica",
        "pronuncia",
        "fluencia",
        "matematica",
        "quimica",
        "redacao",
        "educacao",
      ],
      es: [
        "curso*",
        "clases",
        "aprend*",
        "idioma*",
        "ingles",
        "estudi*",
        "universidad*",
        "ingenier*",
        "manual",
        "manuales",
        "quimic*",
        "matematica*",
        "oposiciones",
        "examen*",
        "capacitacion",
        "diplomado",
        "profesor*",
        "educacion",
        "gramatica",
      ],
      en: [
        "course*",
        "classes",
        "learn*",
        "lesson*",
        "tutor*",
        "english",
        "spanish",
        "language*",
        "fluent",
        "fluency",
        "pronunciation",
        "accent",
        "speak english",
        "study",
        "student*",
        "exam",
        "exams",
        "certificat*",
        "degree",
        "university",
        "college",
        "teacher*",
        "education*",
        "masterclass",
        "workshop",
        "engineer*",
        "ebook",
        "manual",
      ],
      fr: [
        "cours",
        "formation*",
        "apprend*",
        "anglais",
        "langue*",
        "etudi*",
        "examen*",
        "diplome",
        "universite",
        "professeur*",
        "ecole",
        "enseign*",
        "ingenieur*",
      ],
    },
  },
  {
    id: "desenvolvimento",
    label: "Desenvolvimento Pessoal",
    emoji: "🧠",
    terms: {
      pt: [
        "mentalidade",
        "habito",
        "habitos",
        "produtividade",
        "autoestima",
        "foco",
        "disciplina",
        "proposito",
        "lei da atracao",
        "manifest*",
        "coach*",
        "motivacao",
        "inteligencia emocional",
        "autoconhecimento",
        "mindset",
        "alta performance",
        "procrastina*",
        "autoconfianca",
        "desenvolvimento pessoal",
      ],
      es: [
        "mentalidad",
        "habitos",
        "productividad",
        "autoestima",
        "disciplina",
        "proposito",
        "ley de la atraccion",
        "manifest*",
        "coach*",
        "motivacion",
        "inteligencia emocional",
        "desarrollo personal",
        "crecimiento personal",
        "confianza en ti",
      ],
      en: [
        "mindset",
        "habit",
        "habits",
        "productivity",
        "self esteem",
        "self confidence",
        "discipline",
        "purpose",
        "law of attraction",
        "manifest*",
        "coach*",
        "motivation*",
        "personal growth",
        "self improvement",
        "emotional intelligence",
        "procrastinat*",
      ],
      fr: [
        "developpement personnel",
        "confiance en soi",
        "estime de soi",
        "habitude*",
        "productivite",
        "motivation",
        "loi de l attraction",
        "coach*",
      ],
    },
  },
  {
    id: "religioso",
    label: "Religioso & Espiritualidade",
    emoji: "🙏",
    terms: {
      pt: [
        "deus",
        "jesus",
        "cristo",
        "biblia*",
        "oracao",
        "oracoes",
        "fe",
        "igreja",
        "cristao",
        "cristaos",
        "crista",
        "devocional",
        "salmo",
        "salmos",
        "espiritual*",
        "evangel*",
        "gospel",
        "palavra de deus",
        "louvor",
        "espirito santo",
        "catolic*",
        "rosario",
        "versiculo*",
      ],
      es: [
        "dios",
        "jesus",
        "cristo",
        "biblia",
        "oracion*",
        "iglesia",
        "cristian*",
        "devocional",
        "salmo",
        "salmos",
        "espiritual*",
        "evangel*",
        "fe",
        "catolic*",
        "espiritu santo",
        "rosario",
        "versiculo*",
      ],
      en: [
        "god",
        "jesus",
        "christ",
        "bible",
        "prayer*",
        "pray",
        "church",
        "christian*",
        "devotional",
        "psalm*",
        "spiritual*",
        "gospel",
        "faith",
        "scripture*",
        "holy spirit",
        "catholic*",
        "rosary",
      ],
      fr: [
        "dieu",
        "jesus",
        "christ",
        "bible",
        "priere*",
        "eglise",
        "chretien*",
        "psaume*",
        "spirituel*",
        "spiritualite",
        "evangile",
        "la foi",
        "foi en dieu",
        "catholique*",
        "chapelet",
      ],
    },
  },
  {
    id: "infantil",
    label: "Infantil & Maternidade",
    emoji: "🧸",
    terms: {
      pt: [
        "crianca*",
        "filho",
        "filhos",
        "filha",
        "filhas",
        "bebe",
        "bebes",
        "mae",
        "maes",
        "maternidade",
        "infantil*",
        "colorir",
        "alfabetiza*",
        "gestante*",
        "gravidez",
        "brinquedo*",
      ],
      es: [
        "nino",
        "ninos",
        "nina",
        "ninas",
        "bebe",
        "bebes",
        "maternidad",
        "infantil*",
        "embaraz*",
        "colorear",
        "hijo",
        "hijos",
        "hija",
        "hijas",
      ],
      en: [
        "kids",
        "kid",
        "baby",
        "babies",
        "toddler*",
        "child",
        "children",
        "parenting",
        "mom",
        "moms",
        "pregnancy",
        "pregnant",
        "coloring book",
      ],
      fr: [
        "enfant*",
        "bebe",
        "bebes",
        "maman*",
        "maternite",
        "grossesse",
        "coloriage*",
        "parentalite",
      ],
    },
  },
  {
    id: "produtos",
    label: "Produtos Físicos & E-commerce",
    emoji: "🛍️",
    terms: {
      pt: [
        "frete",
        "frete gratis",
        ["compre agora", 0.5],
        "loja",
        "promocao",
        "desconto*",
        "oferta imperdivel",
        "kit",
        "kits",
        "unidades",
        "envio",
        "entrega rapida",
        "estoque",
        "pague na entrega",
        "garanta o seu",
        "garanta ja",
      ],
      es: [
        "envio gratis",
        "envio",
        "pago contra entrega",
        "contra entrega",
        "descuento*",
        "tienda",
        "unidades",
        ["compra ahora", 0.5],
      ],
      en: [
        "free shipping",
        "shipping",
        "shop",
        ["shop now", 0.5],
        "store",
        "discount*",
        "order now",
        "limited stock",
        "in stock",
        ["buy now", 0.5],
      ],
      fr: [
        "livraison",
        "livraison gratuite",
        "boutique",
        "promo",
        "promotion*",
        "reduction",
        "en stock",
        "soldes",
        "commandez",
      ],
    },
  },
  {
    id: "marketing",
    label: "Marketing Digital & IA",
    emoji: "🚀",
    terms: {
      pt: [
        "marketing",
        "marketing digital",
        "trafego",
        "trafego pago",
        "instagram",
        "tiktok",
        "seguidores",
        "anuncio*",
        "copywriting",
        "copywriter",
        "lancamento*",
        "infoproduto*",
        "produto digital",
        "chatgpt",
        "ia",
        "inteligencia artificial",
        "automacao",
        "saas",
        "criar site",
        "landing page",
        "social media",
        "redes sociais",
        "facebook ads",
        "google ads",
        "meta ads",
        "funil de vendas",
        "n8n",
      ],
      es: [
        "marketing",
        "trafico",
        "redes sociales",
        "seguidores",
        "anuncio*",
        "ia",
        "inteligencia artificial",
        "automatiz*",
        "embudo de ventas",
        "pagina web",
        "landing page",
        "chatgpt",
        "lanzamiento",
      ],
      en: [
        "marketing",
        "advertising",
        "paid traffic",
        "followers",
        "instagram",
        "tiktok",
        "chatgpt",
        ["ai", 0.5],
        "artificial intelligence",
        "automation",
        "saas",
        "build a website",
        "website builder",
        "landing page",
        "social media",
        "lead generation",
        "copywriting",
        "sales funnel",
        "facebook ads",
        "google ads",
        "seo",
      ],
      fr: [
        "marketing",
        "reseaux sociaux",
        "abonnes",
        "publicite*",
        "intelligence artificielle",
        "ia",
        "automatisation",
        "site web",
        "tunnel de vente",
      ],
    },
  },
  {
    id: "entretenimento",
    label: "Entretenimento & Séries",
    emoji: "🎬",
    terms: {
      pt: [
        "serie",
        "series",
        "minisserie*",
        "mini serie",
        "novela*",
        "episodio*",
        "capitulo*",
        "drama*",
        "dorama*",
        "assista agora",
        "filme*",
        "historia completa",
        "temporada",
        ["o ceo", 1],
        ["do ceo", 1],
        "bilionari*",
      ],
      es: [
        "serie",
        "series",
        "miniserie*",
        "novela*",
        "telenovela*",
        "episodio*",
        "capitulo*",
        "drama*",
        "dorama*",
        "mira ahora",
        "pelicula*",
        "historia completa",
        ["el ceo", 1],
        ["del ceo", 1],
        "multimillonari*",
      ],
      en: [
        "series",
        "mini series",
        "miniseries",
        "short drama",
        "drama*",
        "episode*",
        "chapter*",
        "watch now",
        "watch full",
        "movie*",
        "full story",
        "binge*",
        "tales",
        "kdrama",
        "streaming",
        ["the ceo", 1],
        "billionaire*",
      ],
      fr: [
        "serie",
        "series",
        "episode*",
        "drame*",
        "feuilleton*",
        "film",
        "films",
        "regardez maintenant",
        ["le pdg", 1],
        "milliardaire*",
      ],
    },
  },
  {
    id: "diy",
    label: "DIY, Ofícios & Construção",
    emoji: "🔨",
    terms: {
      pt: [
        "serralheri*",
        "solda",
        "soldagem",
        "soldador*",
        "carpintaria",
        "carpinteiro*",
        "marcenaria",
        "marceneiro*",
        "construcao",
        "construcoes",
        "mestre de obras",
        "pedreiro*",
        "eletricista*",
        "encanador*",
        "faca voce mesmo",
        "artesanato",
        "ferramenta*",
        "alvenaria",
        "portao",
        "portoes",
        "madeira",
        "moveis planejados",
        "projetos de marcenaria",
      ],
      es: [
        "herreria*",
        "herrero*",
        "soldadura",
        "soldar",
        "soldador*",
        "carpinteria",
        "carpintero*",
        "ebanisteria",
        "construccion*",
        "encofrado*",
        "albanil*",
        "hazlo tu mismo",
        "portones",
        "rejas",
        "remolques",
        "muebles",
        "madera",
        "herramientas",
        "bricolaje",
        "plomeria",
        "maestro de obras",
        "planos de construccion",
        "planos de muebles",
      ],
      en: [
        "diy",
        "do it yourself",
        "woodworking",
        "woodwork",
        "carpentry",
        "carpenter*",
        "welding",
        "welder*",
        "blacksmith*",
        "metalwork*",
        "construction",
        "contractor*",
        "plumbing",
        "home improvement",
        "shed plans",
        "furniture plans",
        "blueprints",
        "handyman",
      ],
      fr: [
        "bricolage",
        "menuiserie",
        "menuisier*",
        "soudure",
        "soudeur*",
        "charpent*",
        "construction",
        "faites le vous meme",
        "ferronnerie",
        "ebenisterie",
        "plomberie",
      ],
    },
  },
];

export const NICHE_LABEL: Record<NicheId, string> = Object.fromEntries([
  ...NICHE_DEFS.map((n) => [n.id, n.label]),
  ["outros", "Outros"],
]) as Record<NicheId, string>;

export const NICHE_EMOJI: Record<NicheId, string> = Object.fromEntries([
  ...NICHE_DEFS.map((n) => [n.id, n.emoji]),
  ["outros", "🗂️"],
]) as Record<NicheId, string>;

// ── Texto ────────────────────────────────────────────────────────────────

/** Minúsculas e sem acentos. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Palavras (letras/números Unicode) já normalizadas. */
export function tokenize(s: string | null | undefined): string[] {
  if (!s) return [];
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

interface CompiledTerm {
  raw: string;
  parts: { text: string; prefix: boolean }[];
  weight: number;
}

function compileTerm(t: Term): CompiledTerm {
  const [raw, base] = typeof t === "string" ? [t, 1] : t;
  const parts = normalize(raw)
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => {
      const prefix = p.endsWith("*");
      // Mesmo tokenizador do texto: "l'argent" → "l argent".
      const text = tokenize(prefix ? p.slice(0, -1) : p).join(" ");
      return { text, prefix };
    })
    .flatMap((p) => {
      const sub = p.text.split(" ");
      return sub.map((s, i) => ({ text: s, prefix: p.prefix && i === sub.length - 1 }));
    })
    .filter((p) => p.text);
  // Frases (2+ palavras) valem mais que uma palavra solta.
  const weight = parts.length > 1 ? base * 1.5 : base;
  return { raw, parts, weight };
}

function partMatches(token: string, part: { text: string; prefix: boolean }): boolean {
  return part.prefix ? token.startsWith(part.text) : token === part.text;
}

/** O termo aparece como palavra(s) inteira(s) na lista de tokens? */
function tokensHaveTerm(tokens: string[], term: CompiledTerm): boolean {
  const n = term.parts.length;
  if (!n) return false;
  outer: for (let i = 0; i + n <= tokens.length; i++) {
    for (let j = 0; j < n; j++) if (!partMatches(tokens[i + j], term.parts[j])) continue outer;
    return true;
  }
  return false;
}

/** Correspondência por palavra inteira (sem acentos). Aceita frases e "radical*". */
export function hasTerm(text: string | null | undefined, term: string): boolean {
  return tokensHaveTerm(tokenize(text), compileTerm(term));
}

/** Tokeniza uma vez e testa vários termos (para listas longas). */
export function makeTermMatcher(text: string | null | undefined): (term: string) => boolean {
  const tokens = tokenize(text);
  const cache = new Map<string, CompiledTerm>();
  return (term) => {
    let c = cache.get(term);
    if (!c) cache.set(term, (c = compileTerm(term)));
    return tokensHaveTerm(tokens, c);
  };
}

const COMPILED: { id: NicheDef["id"]; terms: CompiledTerm[] }[] = NICHE_DEFS.map((n) => {
  const seen = new Set<string>();
  const terms: CompiledTerm[] = [];
  for (const t of [...n.terms.pt, ...n.terms.es, ...n.terms.en, ...n.terms.fr]) {
    const c = compileTerm(t);
    const key = c.parts.map((p) => p.text + (p.prefix ? "*" : "")).join(" ");
    if (seen.has(key)) continue; // mesma palavra em dois idiomas conta uma vez
    seen.add(key);
    terms.push(c);
  }
  return { id: n.id, terms };
});

// ── Classificação ─────────────────────────────────────────────────────────

export interface NicheInput {
  headline?: string | null;
  copy?: string | null;
  advertiser?: string | null;
  landingPageUrl?: string | null;
  /** Termo usado na mineração — sinal fraco, nunca decide sozinho. */
  keyword?: string | null;
  /** Nicho guardado na linha ("Geral" é ignorado). */
  declaredNiche?: string | null;
  /** Tags antigas de raw.enriched.tags — peso 0 (não confiáveis). */
  tags?: string[] | null;
}

export const FIELD_WEIGHTS = {
  headline: 3,
  copy: 2,
  advertiser: 2,
  landingPageUrl: 1,
  declaredNiche: 1,
  keyword: 0.5,
  tags: 0,
} as const;

/** Pontuação mínima para atribuir um nicho (ex.: 1 palavra no título = 3,
 *  1 palavra na copy = 2; só a palavra-chave da pesquisa nunca chega). */
export const MIN_NICHE_SCORE = 2;

const IGNORED_DECLARED = new Set(["", "geral", "outros", "general", "all", "todos"]);

export interface NicheResult {
  niche: NicheId;
  score: number;
  scores: Partial<Record<NicheDef["id"], number>>;
  /** Termos que contaram para o nicho vencedor (diagnóstico). */
  matched: string[];
}

export function classifyNiche(input: NicheInput): NicheResult {
  const declared = normalize(input.declaredNiche ?? "").trim();
  const fields: [keyof typeof FIELD_WEIGHTS, string[]][] = [
    ["headline", tokenize(input.headline)],
    ["copy", tokenize(input.copy)],
    ["advertiser", tokenize(input.advertiser)],
    ["landingPageUrl", tokenize(input.landingPageUrl)],
    ["keyword", tokenize(input.keyword)],
    ["declaredNiche", IGNORED_DECLARED.has(declared) ? [] : tokenize(declared)],
    ["tags", FIELD_WEIGHTS.tags > 0 ? tokenize((input.tags ?? []).join(" ")) : []],
  ];

  const scores: NicheResult["scores"] = {};
  let best: { id: NicheDef["id"]; score: number; hits: number; matched: string[] } | null = null;

  for (const n of COMPILED) {
    let score = 0;
    const matched = new Set<string>();
    for (const [field, tokens] of fields) {
      const fw = FIELD_WEIGHTS[field];
      if (!fw || !tokens.length) continue;
      // Cada termo conta uma vez por campo: uma copy longa e repetitiva não domina.
      for (const t of n.terms) {
        if (tokensHaveTerm(tokens, t)) {
          score += fw * t.weight;
          matched.add(t.raw);
        }
      }
    }
    if (score <= 0) continue;
    score = Math.round(score * 100) / 100;
    scores[n.id] = score;
    // Desempate: maior pontuação → mais termos distintos → ordem de NICHE_DEFS.
    if (!best || score > best.score || (score === best.score && matched.size > best.hits)) {
      best = { id: n.id, score, hits: matched.size, matched: [...matched] };
    }
  }

  if (!best || best.score < MIN_NICHE_SCORE) {
    return { niche: "outros", score: best?.score ?? 0, scores, matched: [] };
  }
  return { niche: best.id, score: best.score, scores, matched: best.matched };
}

/** Rótulo a guardar em collected_ads.niche ("Geral" quando não há nicho). */
export function storedNicheLabel(id: NicheId): string {
  return id === "outros" ? "Geral" : NICHE_LABEL[id];
}
