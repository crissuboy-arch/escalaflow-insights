# Skill: livro-template-mestre

Gera templates profissionais e completos de livros digitais, prontos para venda, onde o usuário pode trocar o tema sem quebrar a estrutura.

## Uso no Claude Code

```
/livro-template-mestre tema="emagrecimento com alimentação real" nicho="saúde" publico="mulheres 30-50" tipo="ebook-educativo" capitulos=7
```

## Tipos suportados

| Tipo | Descrição |
|------|-----------|
| `ebook-educativo` | Ebook com teoria + exemplos práticos |
| `guia-passo-a-passo` | Conduz do zero ao resultado em etapas |
| `workbook` | Exercícios, reflexões e tarefas práticas |
| `planner` | Metas, rotinas e hábitos com campos editáveis |
| `livro-receitas` | Receitas com ingredientes e modo de preparo |
| `livro-infantil` | Linguagem simples, lições morais, ilustrações |
| `livro-devocional` | Versículos, reflexões e orações diárias |
| `livro-emagrecimento` | Ciência + cardápios + motivação emocional |
| `livro-plr` | Pronto para rebrand e revenda sem royalties |
| `amazon-kdp` | Padrão Amazon: sumário linkado, conteúdo denso |
| `romance-curto` | Arco dramático, personagens, tensão e resolução |
| `livro-prompts-ia` | Prompts organizados por categoria com exemplos |

## Input

```typescript
interface LivroTemplateInput {
  tema: string;                    // tema do livro
  nicho: string;                   // mercado/nicho
  publicoAlvo: string;             // quem vai comprar
  nivelPublico: "iniciante" | "intermediario" | "avancado";
  idioma?: string;                 // padrão: "Português"
  objetivo?: string;               // ex: "vender no Amazon KDP"
  estiloDesejado?: string;         // ex: "inspirador e prático"
  quantidadeCapitulos?: number;    // 3–15, padrão: 7
  tipoProduto: LivroTipo;
}
```

## Output

```typescript
interface LivroTemplateOutput {
  // Identidade
  tipo: LivroTipo;
  titulo: string;
  subtitulo: string;
  promessa_central: string;
  publico_alvo: string;
  transformacao_desejada: string;
  tom_de_voz: string;

  // Estrutura editorial
  indice: string[];
  introducao: string;
  capitulos: CapituloTemplate[];          // inclui texto_base, exercícios, caixa_destaque
  chamada_para_acao_final: string;

  // Monetização
  bonus_sugeridos: string[];
  ideia_de_upsell: string;
  descricao_pagina_de_vendas: string;

  // Design
  paleta_de_cores: CorPaleta[];
  estilo_visual: string;
  prompt_capa: string;                    // para Midjourney / DALL-E
  prompt_diagramacao_canva: string;
  sugestao_capa: string;
  versao_canva_google_docs: string;

  // Personalização
  checklist_personalizacao: string[];
}
```

## Integração no EscalaFlow

- **Rota:** `/_authenticated/livro-template-mestre`
- **Server function:** `src/lib/livro-template-mestre.functions.ts → generateLivroTemplateFn`
- **Skill core:** `src/skills/livro-template-mestre.skill.ts → runLivroTemplateMestreSkill`
- **AI service:** usa `generateAIJson` com `maxTokens: 8192`

## Referências

- [Modelos de Livros](./references/modelos-de-livros.md)
- [Estrutura Editorial](./references/estrutura-editorial.md)
- [Prompts de Capa](./references/prompts-de-capa.md)

## Script standalone

```bash
cd skills/livro-template-mestre/scripts
npx tsx generate-book-template.ts
```

Configura variáveis no `.env` do projeto antes de rodar.

## Compatibilidade

- Claude Code CLI ✓
- TanStack Start (EscalaFlow) ✓
- Polyskill / Codex (futuro) ✓
- Node.js 20+ / tsx ✓
