# Upgrade do Ebook Engine

Escopo: somente `src/lib/ebook/*` (PDF + EPUB + presets) e a UI de exportação em `src/routes/_authenticated/produtos.ebook.tsx`. Mineração, radar, IA, dashboard e layout geral **não são tocados**.

## 1. Novo conceito: "Render Mode"

Adicionar um seletor `renderMode: "digital" | "print" | "kdp"` ao painel de exportação do ebook (ao lado dos botões PDF / DOCX / EPUB que já existem). Persistido no draft.

Cada modo é um preset técnico que sobrescreve o `LayoutSpec` em runtime:

| Campo | Digital | Impresso | KDP |
|---|---|---|---|
| Família | sans-serif (Helvetica) | serifada (Times) | serifada (Times) |
| Página | A4 | A4 | 6x9" (432x648 pt) |
| Margens | 56 / 56 / 64 / 56 | 64 / 64 / 72 / 72 | 54 / 54 / 72 / 72 (gutter interno) |
| Alinhamento | esquerda | justificado | justificado |
| Recuo 1ª linha | não | sim (16pt) | sim (16pt) |
| Tamanho corpo | 12pt | 11pt | 10.5pt |
| Entrelinha | 1.6 | 1.45 | 1.4 |
| Drop cap | não | sim | sim |
| Cabeçalho par/ímpar | não | sim | sim |
| Página em branco entre capítulos | não | sim | sim |
| Frontmatter KDP completo | não | parcial | sim |

## 2. PDF — qualidade editorial

Reescrever o motor de renderização em `src/lib/ebook/pdf.ts` mantendo a assinatura pública `exportEbookPdf(input)` e adicionando o campo `renderMode` no `EbookPdfInput`. `pdf-kdp.ts` passa a ser um simples wrapper que chama `exportEbookPdf({ ..., renderMode: "kdp" })`.

Recursos novos:

1. **Justificação real por linha** — em modos `print`/`kdp`, distribuir espaço extra entre as palavras de cada linha de parágrafo até preencher a largura do bloco.
2. **Última linha nunca justificada** — a última linha do parágrafo (e linhas que terminam em quebra forçada) ficam alinhadas à esquerda.
3. **Viúvas e órfãs** — antes de paginar um parágrafo, garantir mínimo de 2 linhas no topo e 2 no fim; se sobrar 1, empurrar a linha adicional para a próxima página.
4. **Cabeçalho par/ímpar** — par: nome do livro; ímpar: título do capítulo atual. Acompanha número da página externo (margem oposta à lombada).
5. **Página em branco entre capítulos** (modos print/kdp) — capítulo sempre abre em página ímpar.
6. **Margem superior generosa** na abertura do capítulo (~1/3 da página) com label "Capítulo N" + título.
7. **Recuo de primeira linha** controlado por modo (`firstLineIndent`).
8. **Drop cap** — primeira letra do primeiro parágrafo de cada capítulo desenhada em 3 linhas, fonte bold da família.
9. **Parser markdown inline** (`parseInline`) com runs tipados:
   - `**bold**` → bold
   - `*italic*` ou `_italic_` → italic
   - `__underline__` → underline (linha desenhada via `drawLine` sob o run)
   - `==destaque==` → fundo amarelo (`drawRectangle` antes do texto)
   - Renderer multi-run com troca de fonte `body / bold / italic / boldItalic` (embed dos 4 estilos).
10. **Listas formatadas** — bullets com hanging indent correto, numeradas (`1.` / `2.`) suportadas, espaçamento antes/depois.
11. **Limpeza de emojis** — manter apenas o regex de emojis reais (`\p{Extended_Pictographic}`); não remover símbolos legítimos (—, →, %, °, etc.) como o stripper atual faz por excesso.
12. **Tipografia** — habilitar `subset` no embed das fontes, ativar kerning quando disponível (`pdf-lib` aceita `customFont` via `@pdf-lib/fontkit` com fontes Inter/Merriweather embutidas em `src/lib/ebook/fonts/` para consistência cross-platform).

Fontes embutidas (uma vez, via `fontkit`):
- Sans: Inter (Regular/Italic/Bold/BoldItalic).
- Serif: Source Serif 4 (Regular/Italic/Bold/BoldItalic).

(Adicionados como assets em `src/lib/ebook/fonts/` e carregados via `fetch(new URL(...))`. Funcionam no Worker porque são embutidos no bundle.)

## 3. KDP — frontmatter profissional

Estender `EbookPdfInput.identity` e `extras` com novos campos opcionais:
- `copyright` (texto)
- `disclaimer`
- `dedication`
- `subtitleLine` (linha sob título no rosto)

Ordem das páginas em modo KDP:
1. Capa
2. Página em branco
3. Folha de rosto (título + subtítulo + autor)
4. Página de copyright (`© ano · autor · ISBN opcional · disclaimer`)
5. Dedicatória (se houver)
6. Sumário
7. Introdução
8. Capítulos (cada um abrindo em página ímpar)
9. Conclusão
10. Sobre o autor (com `bio`)
11. Bônus

UI: na seção de identidade do ebook (já existente), adicionar 4 campos textuais (`copyright`, `disclaimer`, `dedication`, `subtitleLine`) — sem mudar o layout geral, só somando inputs no card de identidade.

## 4. EPUB — melhorias

Atualizar `src/lib/ebook/epub.ts` mantendo `exportEbookEpub(input)`:

- **Capítulos separados** — já está; reforçar `id` único e `linear="yes"`.
- **CSS interno** mais rico (`OEBPS/style.css`): tipografia responsiva, drop cap via `:first-letter`, blockquote estilizado, listas com indent, code mono, suporte a `==highlight==` via `<mark>`.
- **TOC navegável** — `nav.xhtml` já existe; adicionar também `toc.ncx` (EPUB2 fallback) para máxima compatibilidade com Kindle/Kobo antigos.
- **Capa proper** — gerar `cover.xhtml` linkando a imagem com `epub:type="cover"` + entrada explícita no spine antes do nav.
- **Metadados estendidos** — `dc:description` (subtítulo), `dc:publisher` (brand), `dc:creator` com `opf:role="aut"`, `dc:date` de publicação.
- **Inline markdown** — reaproveitar parser de `pdf.ts` mas emitindo HTML (`<strong>`, `<em>`, `<u>`, `<mark>`).
- **Organização** — colocar imagens em `OEBPS/images/`, CSS em `OEBPS/css/`, capítulos em `OEBPS/text/`.

## 5. UI

Mudança mínima em `src/routes/_authenticated/produtos.ebook.tsx`:

- Adicionar um `RadioGroup` "Modo do ebook" (Digital / Impresso / KDP) acima dos botões de exportação, ligado a um state `renderMode`.
- Os 4 inputs novos no card de identidade.
- Passar `renderMode` para `exportEbookPdf` e `exportEbookEpub`.

Nada mais é alterado: estrutura, sidebar, mineração, IA, dashboard intactos.

## 6. Testes manuais (QA visual obrigatório)

Para cada modo (`digital`, `print`, `kdp`):
1. Gerar PDF com 3 capítulos de exemplo.
2. Converter páginas em imagens (`pdftoppm`) e inspecionar:
   - justificação sem rios óbvios
   - última linha não justificada
   - sem viúvas/órfãs
   - cabeçalhos par/ímpar
   - drop cap presente em print/kdp
   - frontmatter KDP completo
3. Validar EPUB com `epubcheck` (via `nix run`) — zero erros.

## Não-objetivos

- Não alterar mineração, radar, IA, dashboard, layout geral.
- Não criar nova rota nem novo módulo.
- Não tocar `docx.ts` (DOCX continua como está).
- Não trocar lib de PDF (continua `pdf-lib` + `fontkit`).

## Arquivos afetados

**Editados**
- `src/lib/ebook/pdf.ts` (reescrita do motor)
- `src/lib/ebook/pdf-kdp.ts` (vira wrapper fino)
- `src/lib/ebook/epub.ts` (CSS, TOC, capa, inline parser)
- `src/lib/ebook/layouts.ts` (novos campos: `firstLineIndent`, `lineHeight`, `pageSize`, `header`, etc.)
- `src/lib/ebook/styles.ts` (novo tipo `RenderMode`)
- `src/routes/_authenticated/produtos.ebook.tsx` (radio de modo + 4 inputs de identidade)

**Criados**
- `src/lib/ebook/typography.ts` (parser inline + justify + viúvas/órfãs + drop cap)
- `src/lib/ebook/fonts/` (4 + 4 arquivos `.ttf` Inter + Source Serif 4)
- `src/lib/ebook/fonts.ts` (loader fontkit dos arquivos acima)
