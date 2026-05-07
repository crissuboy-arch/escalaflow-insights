## Rascunhos persistidos + prévia do ebook antes do PDF

Dois recursos sobre o módulo `/produtos/ebook` existente. Sem mexer em minerador, coleta, Apify ou extensão.

### 1. Rascunhos no banco (retomar de onde parou)

A tabela `ebooks` já existe com RLS por usuário e suporta `status` (`draft|ready`) + `briefing/outline/chapters/layout/cover_url` em jsonb. Vamos usá-la também para rascunhos durante a geração — não só no final.

**Estado no front (`produtos.ebook.tsx`)**
- Adicionar `ebookId: string | null` ao componente.
- Cada vez que o usuário avança um passo OU termina um capítulo, chamar `saveDraft()` via debounce (500 ms) que faz upsert na tabela `ebooks` com `status='draft'`, gravando: `source_ad_key`, `title`, `subtitle`, `niche`, `briefing`, `outline`, `chapters`, `layout`, `cover_url`, `step` (novo), `chapter_count` (novo).
- Primeira escrita gera `id` (insert), próximas usam update por `id`.

**Server functions novas (`src/lib/ebook.functions.ts` + helpers em `ebook.server.ts`)**
- `saveEbookDraft({ id?, payload })` → upsert via `supabaseAdmin`/contexto autenticado, retorna `{ id }`. RLS já garante isolamento por user.
- `listEbookDrafts()` → retorna `[{ id, title, niche, status, step, updated_at, cover_url }]` ordenado por `updated_at desc`.
- `loadEbookDraft({ id })` → retorna o ebook completo para hidratar o stepper.
- `deleteEbookDraft({ id })`.

**UI**
- No topo da página, novo card colapsável "Continuar rascunho" listando os últimos 5 ebooks `draft|ready`. Cada item: thumb da capa, título, nicho, "Capítulo X/Y", botão **Retomar** e botão **Excluir**.
- Ao clicar Retomar: hidrata todos os states (`briefing/outline/chapters/layout/coverUrl/chapterCount/selectedAd?`) e pula direto para `step` salvo.
- Indicador discreto "Rascunho salvo às HH:MM" perto do stepper depois de cada save.
- Ao clicar **Exportar PDF** com sucesso, marca `status='ready'`.

**Migração**
- `ALTER TABLE public.ebooks ADD COLUMN step int NOT NULL DEFAULT 0;`
- `ALTER TABLE public.ebooks ADD COLUMN chapter_count int NOT NULL DEFAULT 6;`
- Trigger `set_updated_at` (já existe a função) em `BEFORE UPDATE` para manter `updated_at` em dia.
- Index `ebooks_user_updated_idx (user_id, updated_at desc)` para a listagem.

### 2. Prévia do ebook antes do PDF

Substituir o atual `<details>` cru por uma prévia de qualidade no passo 5.

**Renderização markdown**
- A dependência `marked` já está instalada (usada pelo `ebook/pdf.ts`). Adicionar `dompurify` para sanitizar o HTML antes de injetar, evitando XSS em conteúdo gerado pela IA.
- Helper `renderMarkdownSafe(md)` em `src/lib/ebook/preview.ts`.

**Componente `EbookPreview`**
Local: `src/components/ebook/EbookPreview.tsx`. Exibido no passo 5, acima dos botões de exportar.

Layout em duas abas (`Tabs` shadcn):
1. **Markdown** — lista de capítulos colapsáveis com `<Textarea>` editável por capítulo. Salvar edição atualiza `chapters[i].markdown` no state e dispara `saveDraft()`. Botão "Regerar este capítulo" chama `generateEbookChapter` apenas para aquele índice.
2. **Páginas** — simulação visual de páginas A5/A4 paginadas, aplicando o `layout` escolhido (`classico/moderno/minimalista`) com tipografia equivalente à do PDF:
   - Capa (se `coverUrl`) como primeira "folha".
   - Sumário gerado a partir de `chapters[].title`.
   - Cada capítulo renderizado como bloco; quebras de página simuladas via CSS (`break-after: page` em print + caixas com `aspect-ratio: 1/1.414` na tela com overflow oculto e separador entre páginas).
   - Pré-visualização rola dentro de uma área `max-h-[70vh] overflow-auto` com fundo cinza, cada página em cartão branco com sombra.
   - Estilos por layout em `src/lib/ebook/preview-styles.ts` espelhando `LAYOUTS` (mesmas famílias de fonte / cores / margens declaradas no PDF), garantindo paridade WYSIWYG aproximada.

**Edição rápida**
- Cada capítulo na aba Markdown ganha botões: `Editar`, `Salvar`, `Regerar`. Edições só persistem após "Salvar" (evita save por keystroke).

**Fluxo**
- Passo 5 atualizado: `Gerar capítulos` → preview aparece → usuário ajusta → `Exportar PDF` continua igual (usa o mesmo `chapters` já no state).

### Arquivos

**Novos**
- `src/components/ebook/EbookPreview.tsx`
- `src/components/ebook/DraftList.tsx`
- `src/lib/ebook/preview.ts` (renderMarkdownSafe + helpers de paginação)
- `src/lib/ebook/preview-styles.ts`
- `supabase/migrations/<ts>_ebooks_drafts.sql`

**Editados**
- `src/lib/ebook.functions.ts` — `saveEbookDraft`, `listEbookDrafts`, `loadEbookDraft`, `deleteEbookDraft`.
- `src/lib/ebook.server.ts` — schemas + helpers de upsert (usando o supabase autenticado do middleware).
- `src/routes/_authenticated/produtos.ebook.tsx` — integra rascunho (state `ebookId`, `saveDraft` debounced, lista no topo, hidratação) + substitui o bloco cru do passo 5 por `<EbookPreview />`.

**Dependências**
- `bun add dompurify` (+ `@types/dompurify`).
- `marked` já presente.
- `pdf-lib` permanece para export.

### Pontos confirmados por padrão
- Auto-save: ao avançar de passo e ao concluir cada capítulo (não a cada keystroke).
- Lista de rascunhos visível no topo da página `/produtos/ebook` (não em rota separada). Posso criar `/produtos/ebooks` listando todos depois se quiser.
- Sem versionamento — cada rascunho é um único registro mutável.

### Restrições respeitadas
- Sem alteração em `/minerar`, `central-mineracao`, collector, Apify, extensão, token.
- IA continua só no backend.
- RLS em `ebooks` já cobre tudo; só adicionamos colunas + trigger + index.
