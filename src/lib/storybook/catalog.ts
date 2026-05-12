export interface CatalogItem {
  id: string;
  label: string;
  promptHint: string;
}

export const STORY_TYPES: CatalogItem[] = [
  { id: "romance-ceo", label: "Romance CEO", promptHint: "romance corporativo, CEO poderoso vs heroína forte" },
  { id: "romance-dark", label: "Romance Dark", promptHint: "romance dark, tensão psicológica, antiherói possessivo" },
  { id: "mafia-italiana", label: "Máfia Italiana", promptHint: "máfia italiana, Don, código de honra, Sicília" },
  { id: "traficante", label: "Traficante", promptHint: "chefe do tráfico, favela luxury, amor proibido" },
  { id: "ceo-empregada", label: "CEO e Empregada", promptHint: "diferença de classes, chefe x funcionária, tensão proibida" },
  { id: "casamento-contrato", label: "Casamento por Contrato", promptHint: "casamento arranjado vira amor real" },
  { id: "gravidez-inesperada", label: "Gravidez Inesperada", promptHint: "gravidez surpresa, segredo, segunda chance" },
  { id: "mae-solo", label: "Mãe Solo", promptHint: "mãe solo guerreira encontra amor improvável" },
  { id: "cristao", label: "Romance Cristão", promptHint: "romance cristão, fé, propósito, sem cenas explícitas" },
  { id: "segunda-chance", label: "Segunda Chance", promptHint: "antigos amantes se reencontram anos depois" },
  { id: "fantasia-romantica", label: "Fantasia Romântica", promptHint: "mundo de fantasia, magia, criaturas, romance épico" },
  { id: "lobisomem", label: "Lobisomem", promptHint: "alfa lobisomem, alma gêmea, alcateia" },
  { id: "vampiro", label: "Vampiro", promptHint: "vampiro ancestral, sangue, eternidade, desejo" },
  { id: "bilionario-obsessivo", label: "Bilionário Obsessivo", promptHint: "bilionário obsessivo, ciúme, possessividade" },
  { id: "inimigos-amantes", label: "Inimigos que se Apaixonam", promptHint: "inimigos que viram amantes (enemies to lovers)" },
];

export const SUBNICHES: CatalogItem[] = [
  { id: "ceo-frio", label: "CEO Frio", promptHint: "CEO calculista, frio por fora, vulnerável por dentro" },
  { id: "chefe-do-morro", label: "Chefe do Morro", promptHint: "chefe do tráfico, líder respeitado e temido" },
  { id: "favela-luxury", label: "Favela Luxury", promptHint: "favela com estética luxuosa, ostentação, poder" },
  { id: "mafioso-possessivo", label: "Mafioso Possessivo", promptHint: "mafioso possessivo, ciumento, marca seu território" },
  { id: "bad-boy", label: "Bad Boy", promptHint: "bad boy rebelde, tatuado, com passado" },
  { id: "policial-infiltrado", label: "Policial Infiltrado", promptHint: "policial disfarçado, dilema moral" },
  { id: "milionario-arrogante", label: "Milionário Arrogante", promptHint: "milionário arrogante e implacável" },
  { id: "amor-proibido", label: "Amor Proibido", promptHint: "amor proibido, lados opostos, alto risco" },
  { id: "vinganca", label: "Vingança", promptHint: "arco de vingança, retorno triunfal" },
  { id: "obsessao", label: "Obsessão", promptHint: "obsessão crescente, paixão devoradora" },
  { id: "traicao", label: "Traição", promptHint: "traição, dor, reconstrução" },
  { id: "ciumes", label: "Ciúmes", promptHint: "ciúme intenso, possessividade" },
  { id: "revenge-romance", label: "Revenge Romance", promptHint: "vingança que vira amor" },
];

export const HOT_LEVELS: CatalogItem[] = [
  { id: "soft", label: "Soft", promptHint: "sem cenas explícitas, romance sugerido" },
  { id: "sensual", label: "Sensual", promptHint: "cenas sensuais sugestivas, sem detalhamento gráfico" },
  { id: "picante", label: "Picante", promptHint: "cenas picantes detalhadas mas elegantes" },
  { id: "explicito", label: "Explícito", promptHint: "cenas explícitas, dark romance adulto" },
];

export const TONES: CatalogItem[] = [
  { id: "cinematografico", label: "Cinematográfico", promptHint: "tom cinematográfico, descrições visuais ricas" },
  { id: "intimo", label: "Íntimo", promptHint: "tom íntimo, primeira pessoa, emocional" },
  { id: "viral-tiktok", label: "Viral TikTok", promptHint: "tom viral, capítulos curtos, cliffhangers fortes" },
  { id: "literario", label: "Literário", promptHint: "tom literário refinado, prosa elaborada" },
  { id: "wattpad", label: "Wattpad", promptHint: "tom Wattpad, jovem adulto, diálogos rápidos" },
];

export const ENDINGS: CatalogItem[] = [
  { id: "feliz", label: "Final Feliz", promptHint: "final feliz, HEA (Happily Ever After)" },
  { id: "agridoce", label: "Agridoce", promptHint: "final agridoce, vitória com perdas" },
  { id: "tragico", label: "Trágico", promptHint: "final trágico, devastador" },
  { id: "aberto", label: "Aberto", promptHint: "final aberto, deixa gancho para sequência" },
];

export const INTENSITIES = ["leve", "média", "intensa", "devastadora"] as const;
export const CHAPTER_COUNTS = [20, 30, 60, 80, 100, 120, 150] as const;

export const COVER_STYLES: CatalogItem[] = [
  { id: "dark-romance", label: "Dark Romance", promptHint: "dark romance, atmosfera sombria, tons frios, silhuetas dramáticas" },
  { id: "ceo-luxury", label: "CEO Luxury", promptHint: "luxo corporativo, dourado e preto, skyline noturno, terno sob medida" },
  { id: "favela-luxury", label: "Favela Luxury", promptHint: "favela luxury, neon roxo/azul, ostentação urbana brasileira" },
  { id: "mafia-italiana", label: "Máfia Italiana", promptHint: "máfia italiana, vermelho sangue e preto, símbolos clássicos" },
  { id: "neon-romance", label: "Neon Romance", promptHint: "estética neon vibrante, cyberpunk romântico" },
  { id: "cristao", label: "Cristão", promptHint: "tons celestes, suaves, simbologia cristã sutil" },
  { id: "minimalista", label: "Minimalista", promptHint: "minimalista, tipografia bold, fundo único" },
  { id: "cinematografico", label: "Cinemático", promptHint: "pôster de filme, alto contraste, dramático" },
  { id: "anime", label: "Anime", promptHint: "estilo anime, cores vivas, personagens ilustrados" },
  { id: "hot-romance", label: "Hot Romance", promptHint: "hot romance, sensual, silhuetas, cores quentes" },
];

export const BADGES = ["Bestseller", "Hot", "Viral TikTok", "+18", "Lançamento"] as const;

export const VOICES: CatalogItem[] = [
  { id: "feminina-doce", label: "Feminina Doce", promptHint: "voz feminina doce, jovem" },
  { id: "feminina-grave", label: "Feminina Grave", promptHint: "voz feminina grave, madura" },
  { id: "masculina-grave", label: "Masculina Grave", promptHint: "voz masculina grave, sedutora" },
  { id: "masculina-jovem", label: "Masculina Jovem", promptHint: "voz masculina jovem, vibrante" },
  { id: "emocional", label: "Emocional", promptHint: "voz emocional, dramática" },
  { id: "narrador-classico", label: "Narrador Clássico", promptHint: "voz de narrador clássico, literário" },
];

export const SOUNDTRACKS = [
  "piano-melancolico",
  "lofi-romantico",
  "orchestra-cinematica",
  "trap-melancolico",
  "synthwave",
  "silencio",
] as const;

export const PRESETS: Record<string, { story?: string; subniche?: string; hot?: string; tone?: string }> = {
  romance: { story: "romance-ceo", tone: "intimo", hot: "sensual" },
  tiktok: { story: "bilionario-obsessivo", tone: "viral-tiktok", hot: "picante" },
  drama: { story: "romance-dark", tone: "cinematografico", hot: "picante" },
};