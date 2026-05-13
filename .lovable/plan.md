# Plano

## 1. i18n — Estratégia e Exportação (PT/EN/ES/FR)

**Arquivos:** `src/i18n/locales/{pt,en,es,fr}.json`, `src/routes/_authenticated/produtos.playbook.$id.tsx`, `src/components/LanguageSwitcher.tsx` (já tem 4 idiomas).

Adicionar bloco `playbook` em cada locale com chaves:
- `library`, `edit`, `export`, `copyContent`, `copySuccess`, `presentationSoon`
- `pdf`, `docx`, `carousel`, `videoScript`
- `strategy.button`, `strategy.title`, `strategy.intro`, `strategy.generate`, `strategy.regenerate`, `strategy.generated`, `strategy.copyBlock`, `strategy.copied`
- Rótulos dos 19 blocos: `bigIdea`, `promise`, `mechanism`, `avatar`, `pains`, `desires`, `objections`, `triggers`, `headlines`, `vsl`, `page`, `funnel`, `offer`, `bonuses`, `stack`, `cta`, `scripts`, `angles`, `scalePlan`
- Mensagens de erro/sucesso (`loadFailed`, `strategyGenerated`, `strategyFailed`)

No `produtos.playbook.$id.tsx`: importar `useTranslation`, substituir todas strings PT-BR hardcoded (Biblioteca, Estratégia, Estratégia completa, Editar, Exportar, PDF, DOCX, Carrossel, Roteiro de vídeo, Copiar conteúdo, toasts, intro do Sheet, "Gerar estratégia com IA"). Atualizar `StrategyView` para usar `t()` nos rótulos dos blocos.

## 2. Upload de PDF → Ebook Premium com IA

**Fluxo simples (sem automação complexa):**

```text
EbookHub (3 cards) → adicionar 4º card "Importar PDF"
  ↓
Upload PDF (input file, max 10MB)
  ↓
parsePdfToText (server fn, usa pdf-parse ou pdfjs leve no worker)
  ↓
aiExtractBriefingFromText (server fn, Gemini)
  ↓ briefing pré-preenchido
Reusa pipeline existente: Outline → Capítulos → Capa → Export
```

**Arquivos novos:**
- `src/lib/ebook/pdf-extract.ts` — server-only: extrai texto via `pdfjs-dist` (compatível com Worker; fallback para primeiras 50 páginas).
- `src/lib/ebook.functions.ts` — adicionar `extractBriefingFromPdf({ base64, fileName })`:
  - decode base64 → Uint8Array
  - extrai texto (truncar ~30k chars)
  - chama `aiExtractBriefingFromText` em `ebook.server.ts` (novo helper que reusa schema `BriefingSchema` mas com prompt orientado a "resumir este conteúdo e propor briefing de ebook premium")
  - retorna `Briefing` + `suggestedTitle` + `suggestedChapterCount`
- `src/components/ebook/PdfUploadCard.tsx` — card no Hub: drag&drop + `<input type="file" accept="application/pdf">`, lê como base64, mostra loader, dispara callback.

**Arquivos editados:**
- `src/components/ebook/EbookHub.tsx` — grid passa para 4 cards (lg:grid-cols-2 ou xl:grid-cols-4); novo prop `onPdfImport(briefing, suggestion)`.
- `src/routes/_authenticated/produtos.ebook.tsx` — handler `handlePdfImport`: seta `briefing`, `mode = "premium"`, `chapterCount` sugerido, pula direto para o passo "Outline" e dispara `generateOutline` automaticamente. Toda geração subsequente (capítulos, imagens, capa, export PDF/DOCX/EPUB) é a infra já existente — modo `premium` já está no schema.
- `src/i18n/locales/*.json` — bloco `ebook.pdfImport`: `title`, `description`, `dropHere`, `selectFile`, `parsing`, `analyzing`, `success`, `errors.tooLarge`, `errors.notPdf`, `errors.parseFailed`.

**Limites/segurança:**
- Tamanho máx. 10MB validado client + server (Zod).
- Truncar texto a 30k chars antes do prompt.
- Sem armazenamento do PDF (somente texto extraído usado in-memory para gerar briefing).
- `pdfjs-dist` precisa ser instalado (`bun add pdfjs-dist`); usar build "legacy" sem worker (`pdfjs-dist/legacy/build/pdf.mjs`) para rodar no Worker SSR.

## 3. Validação

- `bun run build` limpo.
- Trocar idioma no header → confirmar Estratégia/Exportar traduzidos nos 4 idiomas.
- Subir PDF de teste → briefing populado → outline gerado → exportar ebook PDF/DOCX.

## Fora de escopo
- Persistir o PDF no Storage.
- OCR de PDFs escaneados (somente texto extraível).
- Tradução automática do conteúdo gerado (ebook segue idioma escolhido no formulário).
