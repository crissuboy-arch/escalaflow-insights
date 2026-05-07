## Módulo "Criar Ebook" — `/produtos/ebook`

Novo módulo isolado que transforma anúncios minerados em ebooks completos com capa IA e PDF exportável. Não toca em minerador, coleta, Apify nem extensão. Inspirado em `inematds/ebook-maker`, adaptado para a stack TanStack Start + Lovable Cloud + Lovable AI Gateway.

### Stack & decisões-chave

- **IA**: Lovable AI Gateway (`LOVABLE_API_KEY` já configurado). Modelo padrão `google/gemini-3-flash-preview` para texto; `google/gemini-3.1-flash-image-preview` para capa. Nunca chamar Gemini no frontend.
- **Backend**: server functions TanStack (`createServerFn`) em `src/lib/ebook.functions.ts` + helpers em `src/lib/ebook.server.ts`.
- **PDF**: gerado no cliente com `pdf-lib` + `@pdf-lib/fontkit` (puro JS, sem deps Node-only). Layouts via templates de página (texto, headings, capa-imagem).
- **Persistência**: nova tabela `ebooks` no Lovable Cloud com RLS por usuário; capa armazenada em bucket `ebook-covers` (público).

### Rota e UX

`src/routes/_authenticated/produtos.ebook.tsx` — fluxo em 5 passos (stepper):

1. **Selecionar anúncio base** — lista de favoritos + ofertas salvas + escaladas (reusa `fetchSavedAds`/`fetchFavoriteAds`/`fetchScaledAds`). Card com headline, copy, nicho, país, score.
2. **Briefing extraído** — chama `extractEbookBriefing` (server fn) que passa anúncio para Gemini e retorna JSON estruturado: `nicho`, `promessa`, `avatar`, `dores[]`, `desejos[]`, `mecanismoUnico`, `tituloSugerido`, `subtituloSugerido`. Usuário pode editar campos antes de prosseguir.
3. **Estrutura do ebook** — `generateEbookOutline` (server fn) gera índice (intro + 5–8 capítulos + conclusão) com título e bullets de cada capítulo. Usuário pode reordenar/editar/adicionar capítulos.
4. **Layout & capa**:
   - Seleção de layout: **Editorial Clássico** (serif, justificado, drop caps), **Moderno Funcional** (sans-serif, blocos de cor, ícones), **Minimalista Suíço** (grid rígido, muito espaço em branco, helvetica-like).
   - Botão "Gerar capa com IA" → `generateEbookCover` (server fn) chama Gemini image preview, salva PNG em `ebook-covers/{user}/{ebookId}.png`, devolve URL pública. Permite regenerar com prompt customizado.
5. **Gerar capítulos & exportar**:
   - "Gerar capítulos completos" → `generateEbookChapters` (server fn) itera capítulos, chama Gemini para cada um (markdown ~600–1000 palavras), salva incrementalmente em `ebooks.chapters` (jsonb). Mostra progresso por capítulo.
   - Preview lado-a-lado (markdown renderizado).
   - "Exportar PDF" → renderiza no cliente via `pdf-lib` aplicando o layout escolhido (capa + sumário + capítulos). Download direto.
   - Ebook persiste em `ebooks` table; usuário pode voltar e re-exportar.

### Server functions (`src/lib/ebook.functions.ts`)

Todas com `requireSupabaseAuth`, validação Zod e fallback de erro:

- `extractEbookBriefing({ adKey, adPayload })` → JSON estruturado via tool calling do Gemini.
- `generateEbookOutline({ briefing, chapterCount })` → `{ chapters: [{ title, bullets[] }] }`.
- `generateEbookChapter({ ebookId, index, briefing, outline })` → markdown do capítulo (chamada por capítulo para evitar timeout).
- `generateEbookCover({ ebookId, prompt, layout })` → URL pública da capa.
- `saveEbook({ ... })` / `listEbooks()` / `getEbook(id)` / `deleteEbook(id)`.

### Tabela `ebooks` (migration)

Campos: `id`, `user_id`, `source_ad_key`, `title`, `subtitle`, `niche`, `briefing` (jsonb), `outline` (jsonb), `chapters` (jsonb — array `{ title, markdown }`), `layout` (text: `classico|moderno|minimalista`), `cover_url`, `status` (`draft|ready`), timestamps. RLS: usuário só lê/escreve suas linhas.

Bucket `ebook-covers` (público para leitura, escrita restrita ao dono via path `{user_id}/...`).

### PDF (cliente, `src/lib/ebook/pdf.ts`)

- Função `exportEbookPdf(ebook)` retorna `Blob`.
- Templates por layout aplicam fontes embutidas (serif/sans), margens, cabeçalhos, paginação, estilo de capa (imagem full-bleed + título), sumário automático, separadores de capítulo.
- Markdown renderizado com parser leve (`marked`) → blocos texto/heading/list desenhados em `pdf-lib`.

### Sidebar

Adicionar item **Produtos → Criar Ebook** (`Book` icon) em `src/components/AppSidebar.tsx`, abaixo de Ofertas Escaladas. Sem mexer nos demais itens.

### Arquivos novos

- `src/routes/_authenticated/produtos.ebook.tsx` — UI stepper.
- `src/lib/ebook.functions.ts` — server fns (Lovable AI).
- `src/lib/ebook.server.ts` — helpers (prompts, parsing).
- `src/lib/ebook/pdf.ts` — gerador PDF.
- `src/lib/ebook/layouts.ts` — definição visual dos 3 layouts.
- `supabase/migrations/<ts>_ebooks.sql` — tabela + RLS + bucket.

### Arquivos editados

- `src/components/AppSidebar.tsx` — novo item de menu.

### Restrições respeitadas

- Não toca em `/minerar`, `central-mineracao`, `collector.*`, `bridge.ts`, `extension/*`, Apify, token.
- Lovable AI Gateway via server fn — chave nunca sai do backend.
- Sem dependências Node-only (pdf-lib + marked rodam no browser; Gemini chamado apenas no Worker server).

### Pontos de atenção / a confirmar

1. **Idioma do ebook**: gerar sempre no idioma do anúncio fonte (detectado por `country`) ou sempre PT-BR? Plano padrão: idioma do anúncio com fallback PT-BR.
2. **Comprimento padrão**: 6 capítulos × ~800 palavras (~30 páginas). Configurável no passo 3.
3. **Custo IA**: cada ebook ≈ 8–10 chamadas Gemini Flash + 1 imagem. Plano usa Flash (mais barato) por padrão.
