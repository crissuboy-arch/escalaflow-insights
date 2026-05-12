## Objetivo

Transformar o Ebook Engine num gerador completo de produtos digitais vendáveis. Tudo é construído por cima da entidade `Project` que já existe — sem refazer mineração, exporters base ou playbook engine.

---

## 1. Metadados do Produto

Adicionar bloco "Identidade do Produto" no workspace (`/projetos/:id`, aba Briefing). Persistir em `projects.meta.identity`:

```ts
identity: {
  author: string;
  brand: string;        // marca/editora
  instagram: string;
  copyright: string;    // ex: "© 2026 Autor"
  subtitle: string;
  category: string;     // dropdown (presets de nicho)
  language: "pt" | "en" | "es";
  shortDescription: string;
  logoUrl?: string;     // upload em bucket ebook-covers/logos/
}
```

Esses campos são injetados em:
- capa (footer/header)
- página de copyright do PDF/EPUB/DOCX
- metadados EPUB (`dc:creator`, `dc:publisher`, `dc:language`, `dc:rights`)
- header/footer do KDP

Sem migração nova: tudo cabe em `projects.meta` (jsonb).

## 2. Controle de Tamanho

Novo seletor "Tamanho do produto" no briefing:

```text
20 / 30 / 60 / 80 / 100 / 120 / 150 páginas
```

Salvo em `projects.meta.size.targetPages`. A camada de IA mapeia páginas → orçamento de geração:

```text
páginas | capítulos | palavras/cap | extras
20      | 5         | ~600         | —
30      | 6         | ~750         | exemplos
60      | 8         | ~1100        | exemplos + exercícios
80      | 10        | ~1200        | + FAQ
100     | 12        | ~1300        | + bônus
120     | 14        | ~1400        | + storytelling
150     | 16        | ~1500        | + bônus extras + estudos de caso
```

`aiGenerateOutline` recebe `targetPages` e devolve outline com `chapterCount` calculado. `aiGenerateChapter` recebe `wordsTarget` e `extras: { examples, exercises, faq, bonus, storytelling }` para enriquecer cada capítulo.

## 3. Tipos de Produto (modos)

Estender `projects.mode` para aceitar:

```text
ebook | apostila | planner | planilha | playbook | kit
```

Cada tipo tem seu pipeline:

- **ebook**: já existe, só ganha metadados/tamanho.
- **apostila**: como ebook, com tom didático (módulos, atividades, gabarito ao final). Reusa `ebook.server` com `style: "apostila"`.
- **planner**: novo gerador `planner.server.ts` (ver §4).
- **planilha**: novo gerador `spreadsheet.server.ts` (ver §5).
- **playbook**: já existe.
- **kit**: orquestrador que dispara ebook + playbook + planner + checklist + copy + mockup em paralelo (ver §6).

Hub `/projetos` ganha 6 cards de tipo (ou um seletor visual no fluxo "do zero"). O modo já aparece no header do projeto.

## 4. Planner

Novo módulo `src/lib/planner.server.ts` + `planner/pdf.ts`. Templates:

```text
hábitos | calendário | metas | financeiro | emagrecimento | estudos | rotina
```

Cada template define páginas modulares (capa → instruções → trackers → semanas → revisão). Geração:

1. IA preenche títulos, frases motivacionais, exemplos de hábito por nicho.
2. `planner/pdf.ts` (pdf-lib) monta páginas A4 com grids/tabelas pré-desenhados — não é texto corrido, é layout fixo com placeholders preenchidos.

Saída: PDF imprimível + DOCX simples.

## 5. Planilhas

Novo módulo `src/lib/spreadsheet.server.ts`. Templates:

```text
financeiro | vendas | dieta | tráfego | leads | CRM
```

Geração via `xlsx` (já é leve, edge-compat): cria workbook com abas, fórmulas, dropdowns e formatação básica. IA preenche apenas cabeçalhos, descrições e linhas-exemplo do nicho. Saída: `.xlsx` + cópia `.csv` por aba.

Adicionar `xlsx` como dependência.

## 6. Kit Completo

`generateProjectKit({ id })` no `project.functions.ts`. Em paralelo:

```text
ebook (mode=premium)
playbook
planner (template baseado no nicho)
checklist (markdown 1 página, gera PDF)
copy (3 textos: VSL curta, headline, bio Instagram)
mockup (capa renderizada em 3 ângulos via composição CSS→PNG no client)
```

Resultado vai numa nova aba "Kit" do workspace, com download `.zip` único.

## 7. Exportações

Aba **Exportar** ganha botões:

```text
[ DOCX ] [ PDF ] [ PDF Amazon KDP ] [ EPUB ] [ HTML ] [ Link Playbook ] [ Baixar Kit (.zip) ]
```

- DOCX/PDF/EPUB: já existem em `src/lib/ebook/`.
- **PDF Amazon KDP**: variante do PDF com trim 6×9", margens KDP, sem links externos, fontes embutidas. Novo arquivo `src/lib/ebook/pdf-kdp.ts` (deriva do `pdf.ts`).
- **HTML**: novo `src/lib/ebook/html.ts` — single-file HTML standalone (CSS embutido, imagens base64). Bom para preview/landing.
- **Link Playbook**: já existe (`/p/:projectId`).
- **Kit .zip**: usa `jszip` (já necessário para o kit) reunindo todos os artefatos.

Adicionar `jszip` como dependência.

## 8. IA — qualidade do conteúdo

Refinar prompts em `ebook.server.ts`:

- novo system prompt com diretrizes de storytelling (gancho, conflito, virada, prova, CTA por capítulo)
- exigir tom humano, frases curtas + parágrafos médios alternados
- proibir bullets puros — exigir narrativa
- pedir profundidade proporcional a `wordsTarget`
- injetar `identity` (autor, marca) para voz consistente
- pedir blocos opcionais por capítulo: `## Exemplo`, `## Exercício`, `## FAQ`, `## Bônus` — controlados pelo `extras`
- nova função `aiGenerateBookExtras(briefing)` para gerar: introdução, conclusão, sobre o autor, página de bônus, índice — chamadas no momento da exportação

## 9. Presets de Nicho

Novo `src/lib/ebook/niches.ts`:

```ts
export const NICHES = [
  { id: "low-ticket", label: "Low Ticket", style: "premium", palette: "preto", tone: "direto/persuasivo" },
  { id: "manicure", label: "Manicure", style: "feminino", palette: "rosa", tone: "amigável" },
  { id: "emagrecimento", ... },
  { id: "romance", ... },
  { id: "dark-romance", ... },
  { id: "gangster", ... },
  { id: "renda-extra", ... },
  { id: "ia", ... },
  { id: "figurinhas", ... },
  { id: "tiktok", ... },
  { id: "canva", ... },
  { id: "planner-feminino", ... },
  { id: "cristao", ... },
  { id: "marketing", ... },
  { id: "solda", ... },
  { id: "receitas", ... },
];
```

Cada preset injeta `style`, `palette`, `tone` e um seed de briefing (avatar, dores, desejos, mecanismo padrão). Aparece no hub "Criar do Zero" e no kickstart IA como dropdown principal.

## 10. UI do Workspace

Aba **Briefing** vira 4 seções colapsáveis:

```text
1. Conceito (título, nicho, promessa, avatar) — já existe
2. Identidade (autor, marca, IG, copyright, logo, idioma)  — novo
3. Formato (tipo de produto, tamanho, estilo, paleta)      — novo+existente
4. IA (gerar/refinar briefing, gerar capa)                 — já existe
```

Header do projeto:

```text
[ Gerar Ebook ] [ Gerar Playbook ] [ Gerar Planner ] [ Gerar Planilha ] [ Gerar Kit Completo ] [ Exportar ]
```

Botões habilitam conforme `mode` ou ficam todos disponíveis em modo `kit`.

## 11. Entregáveis

1. Migração: nenhuma (tudo em `projects.meta`); só `xlsx` e `jszip` como deps.
2. `src/lib/ebook/niches.ts` (presets)
3. `src/lib/ebook/html.ts`, `src/lib/ebook/pdf-kdp.ts` (exporters)
4. `src/lib/planner.server.ts` + `src/lib/planner/pdf.ts`
5. `src/lib/spreadsheet.server.ts`
6. `src/lib/kit.server.ts` (orquestrador) + zip util
7. Update em `project.functions.ts`: `generateProjectPlanner`, `generateProjectSpreadsheet`, `generateProjectKit`, validators de `mode`
8. Update em `ebook.server.ts`: prompts refinados, `targetPages`/`extras`, `aiGenerateBookExtras`
9. UI: seções de identidade/formato no Briefing tab; novos botões no header; nova aba "Kit"; presets de nicho no hub

## 12. Fora de Escopo

- Marketplace/venda dos produtos
- DALL·E/Stability reais (segue só Gemini para capa/cenas)
- Editor WYSIWYG por capítulo
- Mockups 3D reais (mockup é composição CSS→PNG)
- Tradução automática multi-idioma de conteúdo já gerado

## 13. Validação

- Briefing salva metadados e logo aparece na capa do PDF
- Selecionar "100 páginas" gera ~12 capítulos com FAQ + bônus
- "Gerar Planner" produz PDF A4 imprimível com grids preenchidos
- "Gerar Planilha" baixa `.xlsx` com fórmulas funcionando
- "Gerar Kit Completo" entrega `.zip` com ebook + playbook + planner + checklist + copy + mockup
- Preset "dark-romance" pré-preenche tom, paleta e estilo automaticamente
- Export HTML abre standalone sem dependências externas
- KDP PDF respeita 6×9" com margens corretas
