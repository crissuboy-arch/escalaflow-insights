export interface NichePreset {
  id: string;
  label: string;
  category: string;
  style: "clean" | "premium" | "canva" | "gamma" | "kdp" | "dark" | "luxo" | "feminino" | "infantil" | "playbook";
  palette: "rosa" | "azul" | "preto" | "dourado" | "lilas" | "minimalista" | "neon";
  tone: string;
  seed: {
    promise: string;
    audience: string;
    pains: string[];
    desires: string[];
    mechanism: string;
  };
}

export const NICHES: NichePreset[] = [
  {
    id: "low-ticket",
    label: "Low Ticket",
    category: "Negócios",
    style: "premium",
    palette: "preto",
    tone: "direto, persuasivo, sem enrolação",
    seed: {
      promise: "Faturar entre R$3k e R$10k vendendo um produto digital de baixo ticket por dia.",
      audience: "Iniciantes em marketing digital com pouco capital.",
      pains: ["Não vendem nada online", "Travam na criação do produto", "Não sabem rodar tráfego"],
      desires: ["Renda diária", "Liberdade geográfica", "Validação rápida"],
      mechanism: "Funil de 1 produto + tráfego direto",
    },
  },
  {
    id: "manicure",
    label: "Manicure",
    category: "Beleza",
    style: "feminino",
    palette: "rosa",
    tone: "amigável, motivador, próximo",
    seed: {
      promise: "Faturar como manicure trabalhando em casa, mesmo sem clientela formada.",
      audience: "Mulheres iniciantes na manicure querendo renda extra.",
      pains: ["Poucas clientes", "Preço baixo", "Falta de técnica"],
      desires: ["Agenda cheia", "Cobrar mais caro", "Trabalhar em casa"],
      mechanism: "Atendimento premium em casa + marketing local",
    },
  },
  {
    id: "emagrecimento",
    label: "Emagrecimento",
    category: "Saúde",
    style: "clean",
    palette: "minimalista",
    tone: "empático, científico, encorajador",
    seed: {
      promise: "Perder de 5 a 10kg em 60 dias sem dieta restritiva.",
      audience: "Mulheres acima de 30 anos com rotina corrida.",
      pains: ["Ansiedade", "Compulsão", "Falta de tempo"],
      desires: ["Roupa que cabe", "Disposição", "Espelho amigo"],
      mechanism: "Reeducação alimentar simples + hábitos diários",
    },
  },
  {
    id: "romance",
    label: "Romance",
    category: "Ficção",
    style: "luxo",
    palette: "dourado",
    tone: "sensorial, envolvente, emocional",
    seed: {
      promise: "História de amor que prende do primeiro ao último capítulo.",
      audience: "Leitoras adultas de romance contemporâneo.",
      pains: ["Solidão", "Decepções amorosas", "Vida sem cor"],
      desires: ["Sentir borboletas", "Acreditar no amor", "Escapar da rotina"],
      mechanism: "Tensão romântica em arcos de 3 atos",
    },
  },
  {
    id: "dark-romance",
    label: "Dark Romance",
    category: "Ficção",
    style: "dark",
    palette: "preto",
    tone: "intenso, sombrio, provocante",
    seed: {
      promise: "Romance proibido, antagonista magnético, química explosiva.",
      audience: "Leitoras +18 fãs de dark romance.",
      pains: ["Tédio", "Relações mornas"],
      desires: ["Adrenalina", "Personagens marcantes", "Final intenso"],
      mechanism: "Tropes de morally grey + tensão crescente",
    },
  },
  {
    id: "gangster",
    label: "Gangster",
    category: "Ficção",
    style: "dark",
    palette: "preto",
    tone: "duro, urbano, cinematográfico",
    seed: {
      promise: "Saga de poder, lealdade e traição na máfia.",
      audience: "Leitores de thriller adulto.",
      pains: ["Falta de adrenalina"],
      desires: ["História visceral", "Personagens cheios de camadas"],
      mechanism: "Arcos de antiherói + reviravoltas",
    },
  },
  {
    id: "renda-extra",
    label: "Renda Extra",
    category: "Negócios",
    style: "clean",
    palette: "azul",
    tone: "prático, direto, otimista",
    seed: {
      promise: "Ganhar R$1.500 a R$5.000 por mês nas horas vagas.",
      audience: "Trabalhadores CLT querendo grana extra.",
      pains: ["Salário curto", "Tempo limitado"],
      desires: ["Tirar dívidas", "Comprar algo", "Sair do CLT"],
      mechanism: "5 modelos de renda extra digitais",
    },
  },
  {
    id: "ia",
    label: "Inteligência Artificial",
    category: "Tech",
    style: "gamma",
    palette: "neon",
    tone: "moderno, técnico mas acessível",
    seed: {
      promise: "Usar IA para automatizar tarefas e ganhar tempo todos os dias.",
      audience: "Profissionais e empreendedores não-técnicos.",
      pains: ["FOMO da IA", "Não sabe por onde começar"],
      desires: ["Produtividade x10", "Estar à frente"],
      mechanism: "Stack de prompts + ferramentas práticas",
    },
  },
  {
    id: "figurinhas",
    label: "Figurinhas WhatsApp",
    category: "Negócios",
    style: "canva",
    palette: "lilas",
    tone: "leve, divertido, prático",
    seed: {
      promise: "Faturar vendendo packs de figurinhas no WhatsApp e Telegram.",
      audience: "Iniciantes em produtos digitais.",
      pains: ["Não tem produto", "Não tem audiência"],
      desires: ["Primeira venda", "Renda passiva"],
      mechanism: "Packs nichados + tráfego orgânico",
    },
  },
  {
    id: "tiktok",
    label: "TikTok",
    category: "Marketing",
    style: "gamma",
    palette: "neon",
    tone: "energético, atual, jovem",
    seed: {
      promise: "Crescer no TikTok do zero até 100k seguidores.",
      audience: "Criadores iniciantes e empreendedores.",
      pains: ["Vídeos não bombam", "Sem ideias"],
      desires: ["Viralizar", "Construir audiência", "Monetizar"],
      mechanism: "Roteiros virais + algoritmo",
    },
  },
  {
    id: "canva",
    label: "Canva",
    category: "Design",
    style: "canva",
    palette: "lilas",
    tone: "didático, acessível, criativo",
    seed: {
      promise: "Dominar o Canva e criar conteúdo profissional sem ser designer.",
      audience: "Empreendedoras e criadoras de conteúdo.",
      pains: ["Posts feios", "Demora muito para criar"],
      desires: ["Identidade visual", "Posts que vendem"],
      mechanism: "Templates + sistema de design",
    },
  },
  {
    id: "planner-feminino",
    label: "Planner Feminino",
    category: "Lifestyle",
    style: "feminino",
    palette: "rosa",
    tone: "afetuoso, motivador, organizado",
    seed: {
      promise: "Organizar a rotina, finanças e autocuidado em um só lugar.",
      audience: "Mulheres que querem mais clareza.",
      pains: ["Cabeça cheia", "Falta de foco"],
      desires: ["Vida organizada", "Metas cumpridas"],
      mechanism: "Planner mensal + trackers diários",
    },
  },
  {
    id: "cristao",
    label: "Cristão",
    category: "Espiritualidade",
    style: "luxo",
    palette: "dourado",
    tone: "inspirador, acolhedor, bíblico",
    seed: {
      promise: "Crescimento espiritual diário com Palavra e oração.",
      audience: "Cristãos buscando intimidade com Deus.",
      pains: ["Vida espiritual seca", "Falta de constância"],
      desires: ["Paz", "Direção", "Comunhão"],
      mechanism: "Devocionais + leitura guiada",
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    category: "Negócios",
    style: "premium",
    palette: "preto",
    tone: "estratégico, autoridade, prático",
    seed: {
      promise: "Estratégia de marketing que vende todos os dias.",
      audience: "Empreendedores digitais.",
      pains: ["Vendas inconsistentes"],
      desires: ["Previsibilidade", "Escala"],
      mechanism: "Funil + tráfego + copy",
    },
  },
  {
    id: "solda",
    label: "Solda",
    category: "Profissional",
    style: "kdp",
    palette: "azul",
    tone: "técnico, prático, mão na massa",
    seed: {
      promise: "Aprender solda do zero e abrir sua própria fonte de renda.",
      audience: "Homens em transição de carreira.",
      pains: ["Sem qualificação", "Renda baixa"],
      desires: ["Profissão sólida", "Trabalhar por conta"],
      mechanism: "Técnicas + ferramentas básicas",
    },
  },
  {
    id: "receitas",
    label: "Receitas",
    category: "Culinária",
    style: "feminino",
    palette: "rosa",
    tone: "saboroso, fácil, caseiro",
    seed: {
      promise: "Receitas que vendem e que toda família pede de novo.",
      audience: "Donas de casa e empreendedoras culinárias.",
      pains: ["Cardápio repetido", "Não sabe precificar"],
      desires: ["Família feliz", "Renda extra com cozinha"],
      mechanism: "Receitas testadas + lista de compras",
    },
  },
];

export function nicheById(id: string | undefined | null): NichePreset | undefined {
  if (!id) return undefined;
  return NICHES.find((n) => n.id === id);
}

export const PRODUCT_SIZES = [20, 30, 60, 80, 100, 120, 150] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

export interface SizeSpec {
  pages: ProductSize;
  chapters: number;
  wordsPerChapter: number;
  extras: { examples: boolean; exercises: boolean; faq: boolean; bonus: boolean; storytelling: boolean };
}

export function sizeSpec(pages: number): SizeSpec {
  const table: Record<number, SizeSpec> = {
    20: { pages: 20, chapters: 5, wordsPerChapter: 600, extras: { examples: false, exercises: false, faq: false, bonus: false, storytelling: false } },
    30: { pages: 30, chapters: 6, wordsPerChapter: 750, extras: { examples: true, exercises: false, faq: false, bonus: false, storytelling: false } },
    60: { pages: 60, chapters: 8, wordsPerChapter: 1100, extras: { examples: true, exercises: true, faq: false, bonus: false, storytelling: true } },
    80: { pages: 80, chapters: 10, wordsPerChapter: 1200, extras: { examples: true, exercises: true, faq: true, bonus: false, storytelling: true } },
    100: { pages: 100, chapters: 12, wordsPerChapter: 1300, extras: { examples: true, exercises: true, faq: true, bonus: true, storytelling: true } },
    120: { pages: 120, chapters: 14, wordsPerChapter: 1400, extras: { examples: true, exercises: true, faq: true, bonus: true, storytelling: true } },
    150: { pages: 150, chapters: 16, wordsPerChapter: 1500, extras: { examples: true, exercises: true, faq: true, bonus: true, storytelling: true } },
  };
  return table[pages] ?? table[60];
}

export interface ProductIdentity {
  author?: string;
  brand?: string;
  instagram?: string;
  copyright?: string;
  subtitle?: string;
  category?: string;
  language?: string;
  shortDescription?: string;
  logoUrl?: string;
}

export const PRODUCT_TYPES = [
  { id: "ebook", label: "Ebook" },
  { id: "apostila", label: "Apostila" },
  { id: "planner", label: "Planner" },
  { id: "planilha", label: "Planilha" },
  { id: "playbook", label: "Playbook" },
  { id: "kit", label: "Kit Completo" },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]["id"];

export const PLANNER_TEMPLATES = [
  "habitos",
  "calendario",
  "metas",
  "financeiro",
  "emagrecimento",
  "estudos",
  "rotina",
] as const;
export type PlannerTemplate = (typeof PLANNER_TEMPLATES)[number];

export const SPREADSHEET_TEMPLATES = [
  "financeiro",
  "vendas",
  "dieta",
  "trafego",
  "leads",
  "crm",
] as const;
export type SpreadsheetTemplate = (typeof SPREADSHEET_TEMPLATES)[number];