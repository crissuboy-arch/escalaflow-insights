// Keyword library and lightweight tagging helpers used by the Minerador.
// Pure data + pure functions — no DB, no React.

export type CategoryId =
  | "dinheiro" | "ia" | "automacao" | "infoproduto" | "tiktok" | "instagram"
  | "ebook" | "playbook" | "plr" | "fisico" | "emagrecimento" | "beleza"
  | "branding" | "saas" | "apps" | "whatsapp" | "figurinhas" | "cursos"
  | "lowTicket" | "highTicket" | "rendaExtra" | "copy";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  keywords: string[];
}

export const KEYWORD_CATEGORIES: Record<CategoryId, Category> = {
  dinheiro: {
    id: "dinheiro", label: "Dinheiro", emoji: "💰",
    keywords: [
      "renda extra", "ganhar dinheiro online", "primeira venda",
      "primeira venda em 24h", "renda automática", "renda passiva",
      "trabalhar de casa", "viver da internet", "lucro rápido",
      "faturamento diário", "vender no automático", "ganhar dinheiro",
      "fazer dinheiro", "monetizar",
    ],
  },
  ia: {
    id: "ia", label: "IA", emoji: "🤖",
    keywords: [
      "inteligência artificial", "ChatGPT", "Gemini", "automação IA",
      "avatar IA", "conteúdo com IA", "vídeo com IA", "app com IA",
      "SaaS IA", "agentes IA", "prompts virais", "IA generativa",
      "Midjourney", "Sora", "Claude",
    ],
  },
  automacao: {
    id: "automacao", label: "Automação", emoji: "⚙️",
    keywords: [
      "automação", "n8n", "make", "zapier", "fluxo automático",
      "robô de vendas", "bot whatsapp", "automação de marketing",
      "automação de vendas",
    ],
  },
  infoproduto: {
    id: "infoproduto", label: "Infoproduto", emoji: "📚",
    keywords: [
      "ebook", "playbook", "curso online", "mini curso", "mentoria",
      "método", "blueprint", "framework", "estratégia validada",
      "infoproduto", "produto digital",
    ],
  },
  tiktok: {
    id: "tiktok", label: "TikTok", emoji: "🎵",
    keywords: [
      "TikTok", "TikTok Shop", "monetizar TikTok", "viralizar",
      "viral no tiktok", "crescer no TikTok", "perfil dark",
      "perfil sem aparecer",
    ],
  },
  instagram: {
    id: "instagram", label: "Instagram", emoji: "📸",
    keywords: [
      "Instagram", "reels viral", "crescer no Instagram",
      "ganhar seguidores", "monetizar instagram", "perfil profissional",
    ],
  },
  ebook: {
    id: "ebook", label: "Ebook", emoji: "📖",
    keywords: ["ebook", "ebook KDP", "kindle direct publishing", "amazon kdp", "ebook pronto"],
  },
  playbook: {
    id: "playbook", label: "Playbook", emoji: "🎬",
    keywords: ["playbook", "carrossel viral", "playbook de vendas"],
  },
  plr: {
    id: "plr", label: "PLR", emoji: "🧩",
    keywords: ["PLR", "PLR premium", "produto PLR", "pacote PLR", "pack viral"],
  },
  fisico: {
    id: "fisico", label: "Produto físico", emoji: "📦",
    keywords: [
      "produto viral", "gadget", "cozinha prática", "casa inteligente",
      "acessórios femininos", "eletrônico viral", "dropshipping",
    ],
  },
  emagrecimento: {
    id: "emagrecimento", label: "Emagrecimento", emoji: "🔥",
    keywords: [
      "perder barriga", "metabolismo", "chá seca barriga", "receitas fit",
      "emagrecer", "perder peso", "queima de gordura",
    ],
  },
  beleza: {
    id: "beleza", label: "Beleza", emoji: "💄",
    keywords: ["skincare", "rejuvenescimento", "beleza", "maquiagem", "antirrugas"],
  },
  branding: {
    id: "branding", label: "Branding", emoji: "🎨",
    keywords: [
      "identidade visual", "branding", "logo premium", "logo 3D", "Canva",
      "templates Canva", "pack social media",
    ],
  },
  saas: {
    id: "saas", label: "SaaS", emoji: "🧠",
    keywords: ["SaaS", "micro SaaS", "produto SaaS", "assinatura mensal"],
  },
  apps: {
    id: "apps", label: "Apps", emoji: "📱",
    keywords: ["app", "aplicativo", "app mobile", "app de IA"],
  },
  whatsapp: {
    id: "whatsapp", label: "WhatsApp", emoji: "💬",
    keywords: [
      "figurinhas", "stickers", "figurinhas WhatsApp", "PLR premium",
      "pack viral", "whatsapp business",
    ],
  },
  figurinhas: {
    id: "figurinhas", label: "Figurinhas", emoji: "🌟",
    keywords: ["figurinhas", "stickers", "figurinhas WhatsApp", "pack figurinhas"],
  },
  cursos: {
    id: "cursos", label: "Cursos", emoji: "🎓",
    keywords: ["curso online", "treinamento", "mini curso", "imersão"],
  },
  lowTicket: {
    id: "lowTicket", label: "Low ticket", emoji: "🪙",
    keywords: ["R$ 9,90", "R$ 19,90", "R$ 27", "low ticket", "preço baixo"],
  },
  highTicket: {
    id: "highTicket", label: "High ticket", emoji: "💎",
    keywords: ["high ticket", "mentoria premium", "consultoria", "ticket alto"],
  },
  rendaExtra: {
    id: "rendaExtra", label: "Renda extra", emoji: "📈",
    keywords: ["renda extra", "segunda renda", "complemento de renda", "trabalhar em casa"],
  },
  copy: {
    id: "copy", label: "Copy/Headlines", emoji: "✍️",
    keywords: [
      "método oculto", "descoberta", "hack", "fórmula secreta", "simples",
      "rápido", "validado", "comprovado", "sem aparecer", "sem experiência",
    ],
  },
};

export const CATEGORY_LIST: Category[] = Object.values(KEYWORD_CATEGORIES);

export function allKeywords(): string[] {
  const set = new Set<string>();
  for (const c of CATEGORY_LIST) for (const k of c.keywords) set.add(k);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
}

const NORM = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Categories whose keywords appear in the given text. */
export function categoriesOf(text: string): CategoryId[] {
  const t = NORM(text);
  const hits: CategoryId[] = [];
  for (const c of CATEGORY_LIST) {
    if (c.keywords.some((k) => t.includes(NORM(k)))) hits.push(c.id);
  }
  return hits;
}

/** Best-guess primary category for a single keyword. */
export function categoryOf(keyword: string): CategoryId | null {
  const t = NORM(keyword);
  for (const c of CATEGORY_LIST) {
    if (c.keywords.some((k) => NORM(k) === t)) return c.id;
  }
  for (const c of CATEGORY_LIST) {
    if (c.keywords.some((k) => t.includes(NORM(k)) || NORM(k).includes(t))) return c.id;
  }
  return null;
}

// --- Tag inference (lightweight regex-based) ---

const PROMISE_PATTERNS: Array<[string, RegExp]> = [
  ["ganho-rapido", /\b(ganhe|fature|lucre)\b.*\b(em|por)\b/i],
  ["transformacao", /\b(transforme|mude|descubra)\b/i],
  ["sem-x", /\bsem\b\s+\w+/i],
  ["em-x-dias", /\bem\s+\d+\s+(dias?|horas?|semanas?)\b/i],
  ["perder-peso", /\b(perca|perder|elimine)\b.*\b(quilos?|kg|barriga|gordura)\b/i],
];

const MECHANISM_WORDS = ["método", "fórmula", "framework", "blueprint", "hack", "sistema", "passo a passo"];

const EMOTIONS: Array<{ id: string; words: string[] }> = [
  { id: "medo",         words: ["perigo", "cuidado", "alerta", "risco", "evite"] },
  { id: "desejo",       words: ["sonho", "liberdade", "luxo", "dinheiro", "rico"] },
  { id: "urgencia",     words: ["últimas", "agora", "hoje", "urgente", "acaba"] },
  { id: "curiosidade",  words: ["segredo", "ninguém te conta", "descubra", "revelado"] },
  { id: "prova-social", words: ["mais de", "milhares", "comprovado", "validado", "depoimento"] },
];

export interface InferredTags {
  categories: CategoryId[];
  promise?: string;
  mechanism?: string;
  emotion?: string;
  tags: string[];
}

export function inferTagsFromText(text: string): InferredTags {
  const t = NORM(text);
  const categories = categoriesOf(text);

  let promise: string | undefined;
  for (const [id, re] of PROMISE_PATTERNS) {
    if (re.test(text)) { promise = id; break; }
  }

  const mechanism = MECHANISM_WORDS.find((w) => t.includes(NORM(w)));

  let emotion: string | undefined;
  for (const e of EMOTIONS) {
    if (e.words.some((w) => t.includes(NORM(w)))) { emotion = e.id; break; }
  }

  const tags: string[] = [];
  for (const c of categories) tags.push(KEYWORD_CATEGORIES[c].label);
  if (promise) tags.push(`promessa:${promise}`);
  if (mechanism) tags.push(`mecanismo:${mechanism}`);
  if (emotion) tags.push(`emoção:${emotion}`);

  return { categories, promise, mechanism, emotion, tags };
}

export type ScaleLevel = "cold" | "warming" | "hot" | "scaled";
export function scaleLevelFromScore(score: number): ScaleLevel {
  if (score >= 90) return "scaled";
  if (score >= 75) return "hot";
  if (score >= 60) return "warming";
  return "cold";
}