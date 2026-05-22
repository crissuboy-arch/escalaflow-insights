import { generateAIJson } from "@/lib/aiService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LivroTipo =
  | "ebook-educativo"
  | "guia-passo-a-passo"
  | "workbook"
  | "planner"
  | "livro-receitas"
  | "livro-infantil"
  | "livro-devocional"
  | "livro-emagrecimento"
  | "livro-plr"
  | "amazon-kdp"
  | "romance-curto"
  | "livro-prompts-ia";

export const LIVRO_TIPO_LABELS: Record<LivroTipo, string> = {
  "ebook-educativo": "Ebook Educativo",
  "guia-passo-a-passo": "Guia Passo a Passo",
  "workbook": "Workbook com Exercícios",
  "planner": "Planner",
  "livro-receitas": "Livro de Receitas",
  "livro-infantil": "Livro Infantil",
  "livro-devocional": "Livro Devocional/Cristão",
  "livro-emagrecimento": "Livro de Emagrecimento",
  "livro-plr": "Livro PLR",
  "amazon-kdp": "Livro Amazon KDP",
  "romance-curto": "Livro de Romance Curto",
  "livro-prompts-ia": "Livro de Prompts IA",
};

export interface LivroTemplateInput {
  tema: string;
  nicho: string;
  publicoAlvo: string;
  nivelPublico: "iniciante" | "intermediario" | "avancado";
  idioma?: string;
  objetivo?: string;
  estiloDesejado?: string;
  quantidadeCapitulos?: number;
  tipoProduto: LivroTipo;
}

export interface CapituloTemplate {
  numero: number;
  titulo: string;
  subtitulo: string;
  pontos_principais: string[];
  caixa_destaque: string;
  exercicios_checklist: string[];
  resumo: string;
  texto_base: string;
}

export interface CorPaleta {
  nome: string;
  hex: string;
  uso: string;
}

export interface LivroTemplateOutput {
  tipo: LivroTipo;
  titulo: string;
  subtitulo: string;
  promessa_central: string;
  publico_alvo: string;
  transformacao_desejada: string;
  tom_de_voz: string;
  indice: string[];
  introducao: string;
  capitulos: CapituloTemplate[];
  chamada_para_acao_final: string;
  bonus_sugeridos: string[];
  ideia_de_upsell: string;
  paleta_de_cores: CorPaleta[];
  estilo_visual: string;
  prompt_capa: string;
  prompt_diagramacao_canva: string;
  sugestao_capa: string;
  descricao_pagina_de_vendas: string;
  checklist_personalizacao: string[];
  versao_canva_google_docs: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nivelLabel(n: LivroTemplateInput["nivelPublico"]): string {
  return { iniciante: "iniciante (sem conhecimento prévio)", intermediario: "intermediário", avancado: "avançado" }[n];
}

function tipoInstrucoes(tipo: LivroTipo): string {
  const map: Record<LivroTipo, string> = {
    "ebook-educativo": "ensinar um conceito de forma didática com teoria + exemplos práticos",
    "guia-passo-a-passo": "conduzir o leitor do zero ao resultado em etapas numeradas e claras",
    "workbook": "combinar teoria mínima com muitos exercícios, espaços de reflexão e tarefas práticas",
    "planner": "organizar metas, rotinas e hábitos com campos editáveis, checklists e calendários",
    "livro-receitas": "apresentar receitas com ingredientes, modo de preparo, fotos sugeridas e variações",
    "livro-infantil": "usar linguagem simples, história envolvente, lições morais e ilustrações sugeridas",
    "livro-devocional": "inspirar com versículos, reflexões diárias, orações e aplicações práticas de fé",
    "livro-emagrecimento": "combinar ciência do emagrecimento, cardápios, exercícios e motivação emocional",
    "livro-plr": "criar conteúdo genérico e personalizável, pronto para rebrand e revenda sem direitos autorais",
    "amazon-kdp": "seguir padrões Amazon: sumário linkado, conteúdo denso, capa profissional, sem plágio",
    "romance-curto": "criar narrativa com arco dramático, personagens cativantes, tensão e resolução emocional",
    "livro-prompts-ia": "organizar prompts por categoria, incluir exemplos de resultados e variações avançadas",
  };
  return map[tipo];
}

// ── Core generation ───────────────────────────────────────────────────────────

export async function runLivroTemplateMestreSkill(
  input: LivroTemplateInput,
): Promise<LivroTemplateOutput> {
  const capitulos = Math.min(Math.max(input.quantidadeCapitulos ?? 7, 3), 15);
  const idioma = input.idioma ?? "Português";
  const tipoLabel = LIVRO_TIPO_LABELS[input.tipoProduto];

  const systemPrompt = `Você é um editor especializado em livros digitais premium para o mercado brasileiro.
Cria templates profissionais, vendáveis e completamente personalizáveis.
Todo conteúdo deve ser específico ao tema fornecido — NUNCA genérico.
Estrutura no padrão editorial premium: título magnético, promessa clara, transformação tangível.
Responda APENAS com JSON válido. Sem markdown. Sem comentários. Sem blocos de código.`;

  const userPrompt = `Crie um template completo de "${tipoLabel}" com as especificações abaixo.

TEMA: ${input.tema}
NICHO: ${input.nicho}
PÚBLICO-ALVO: ${input.publicoAlvo}
NÍVEL: ${nivelLabel(input.nivelPublico)}
IDIOMA: ${idioma}
OBJETIVO DO LIVRO: ${input.objetivo ?? "ser vendido como produto digital"}
ESTILO DESEJADO: ${input.estiloDesejado ?? "profissional, prático e inspirador"}
CAPÍTULOS: ${capitulos}
INSTRUÇÃO DE FORMATO: ${tipoInstrucoes(input.tipoProduto)}

Retorne EXATAMENTE este JSON (todos os campos obrigatórios):
{
  "tipo": "${input.tipoProduto}",
  "titulo": "título forte, magnético e específico ao tema — não genérico",
  "subtitulo": "subtítulo que complementa o título com a promessa",
  "promessa_central": "1 frase que resume a transformação principal",
  "publico_alvo": "descrição detalhada de quem vai comprar e por quê",
  "transformacao_desejada": "antes e depois: o que muda na vida do leitor",
  "tom_de_voz": "como o livro deve soar — ex: inspirador e direto, científico e acessível",
  "indice": [${Array.from({ length: capitulos }, (_, i) => `"Capítulo ${i + 1}: [título específico]"`).join(", ")}],
  "introducao": "introdução completa de 4 parágrafos — contextualiza o tema, apresenta o autor, explica o método e faz a promessa",
  "capitulos": [
    ${Array.from({ length: capitulos }, (_, i) => `{
      "numero": ${i + 1},
      "titulo": "Título do Capítulo ${i + 1}",
      "subtitulo": "subtítulo descritivo",
      "pontos_principais": ["ponto chave 1", "ponto chave 2", "ponto chave 3"],
      "caixa_destaque": "dica, insight ou citação em destaque para este capítulo",
      "exercicios_checklist": ["exercício ou item de checklist 1", "exercício 2", "exercício 3"],
      "resumo": "resumo do capítulo em 2 frases",
      "texto_base": "texto base editável do capítulo — 3 parágrafos densos e específicos ao tema"
    }`).join(",\n    ")}
  ],
  "chamada_para_acao_final": "CTA final do livro — próximo passo claro e convincente",
  "bonus_sugeridos": ["bônus 1 específico", "bônus 2", "bônus 3"],
  "ideia_de_upsell": "produto ou serviço de upsell ideal para este nicho",
  "paleta_de_cores": [
    {"nome": "Primária", "hex": "#XXXXXX", "uso": "títulos e destaques"},
    {"nome": "Secundária", "hex": "#XXXXXX", "uso": "fundos e seções"},
    {"nome": "Texto", "hex": "#XXXXXX", "uso": "corpo do texto"},
    {"nome": "Acento", "hex": "#XXXXXX", "uso": "botões, CTAs e bordas"}
  ],
  "estilo_visual": "descrição do estilo visual recomendado para o design do livro",
  "prompt_capa": "prompt detalhado em inglês para gerar capa profissional no Midjourney ou DALL-E — inclua estilo, cores, elementos visuais, tipografia e mood",
  "prompt_diagramacao_canva": "instruções passo-a-passo para diagramar este livro no Canva — fonte, espaçamentos, elementos gráficos, templates sugeridos",
  "sugestao_capa": "descrição visual detalhada da capa ideal — elementos, hierarquia, cores, fontes",
  "descricao_pagina_de_vendas": "descrição completa para página de vendas — headline, subheadline, 3 parágrafos de copy e bullet points de benefícios",
  "checklist_personalizacao": ["campo/elemento para personalizar 1", "campo 2", "campo 3", "campo 4", "campo 5", "campo 6"],
  "versao_canva_google_docs": "guia de como adaptar este template para Canva e Google Docs — estrutura de slides/páginas, fontes recomendadas, como organizar o conteúdo"
}`;

  return generateAIJson<LivroTemplateOutput>(userPrompt, {
    systemPrompt,
    maxTokens: 8192,
  });
}
