# Editor interativo de playbook + visualizador público (flipbook)

## Objetivo
Os botões "Criar primeiro playbook" e "+ Novo Playbook" em `/produtos/playbook` passam a abrir um **editor interativo** simples (sem wizard de IA). O playbook publicado fica acessível em uma URL pública `/playbook/:id` com animação de virar página em CSS nativo, responsivo.

O wizard atual (`/produtos/playbook/novo`) continua existindo como rota alternativa de geração por IA — não é o caminho default.

## Modelo de dados
Reaproveitamos a tabela `playbooks` existente. Cada "página" do novo editor é uma `scene` simplificada com `title`, `text` e `image_url` (os demais campos — `summary`, `balloons`, `exercise`, `practical_action` — ficam vazios e seguem sendo opcionais no schema). Nenhuma migração necessária.

Sem novos campos no banco. O visualizador público lê via uma nova server function que aceita playbooks com `status = 'published'` sem exigir auth.

## Mudanças

### 1. Novo componente `PlaybookEditor`
`src/components/playbook/PlaybookEditor.tsx`
- Campo "Título do playbook" (input grande).
- Lista de páginas com drag-handle (↑/↓) — botões "Adicionar página", "Duplicar", "Excluir".
- Cada item editável inline: título da página, textarea de conteúdo, upload de imagem (usa `uploadPlaybookImage` existente — converte arquivo para dataURL e sobe pro bucket `playbook-images`).
- Painel lateral / aba "Preview" usando o componente `FlipBook` (ver abaixo).
- Botões no header:
  - "Salvar rascunho" → `savePlaybook` com `status: "draft"`.
  - "Publicar" → `savePlaybook` com `status: "published"`, mostra toast com link público `/playbook/:id` e botão "Copiar link".
  - "Despublicar" quando já estiver publicado.

### 2. Componente `FlipBook` (CSS nativo, sem libs)
`src/components/playbook/FlipBook.tsx`
- Empilha as páginas em 3D usando `perspective` no container e `transform: rotateY` em cada página com `transform-origin: left center`.
- Cada página vira ao clicar (próximo / anterior) ou ao arrastar (swipe touch para mobile).
- Versão mobile (< 640px): cai para um carrossel horizontal com transição `transform: translateX` + sombra de lateral simulando dobra, em vez do flip 3D (mais legível em telas pequenas).
- Indicador de página "3 / 12" + setas.
- Estados controlados via `useState` apenas — sem GSAP / framer / page-flip.
- Estilos isolados num arquivo `src/components/playbook/flipbook.css` com `@keyframes` simples.

### 3. Rotas
- `src/routes/_authenticated/produtos.playbook.editor.$id.tsx` — editor autenticado, abre o `PlaybookEditor` carregando o playbook por id (ou cria um vazio se id for `novo`).
- `src/routes/_authenticated/produtos.playbook.editor.novo.tsx` — atalho que cria um playbook em branco e redireciona para `/produtos/playbook/editor/<id>`.
- `src/routes/playbook.$id.tsx` — **rota pública** (fora de `_authenticated`), só renderiza o `FlipBook` em fullscreen com o conteúdo do playbook. Mostra 404 amigável se o playbook não existir ou não estiver publicado.

### 4. Server function pública
Adicionar em `src/lib/playbook.functions.ts`:
- `loadPublicPlaybook` — `createServerFn({ method: "GET" })` **sem** `requireSupabaseAuth`. Usa `supabaseAdmin` (`@/integrations/supabase/client.server`) para buscar o playbook, mas filtra estritamente por `id` + `status = 'published'`. Retorna apenas `{ title, theme, cover_url, scenes: [{ title, text, image_url }] }` — sem `user_id`, sem `briefing`, sem campos privados.

### 5. Atualizar `produtos.playbook.tsx`
- Botão "+ Novo Playbook" e "Criar primeiro playbook" passam a navegar para `/produtos/playbook/editor/novo` em vez de `/produtos/playbook/novo`.
- No card de cada playbook, o botão de editar (Pencil) navega para `/produtos/playbook/editor/<id>`.
- Ao publicar (botão Globe2), mostrar toast com botão "Copiar link público" apontando para `${window.location.origin}/playbook/<id>`.

## Verificação
- Build / typecheck via harness.
- Abrir `/produtos/playbook` → clicar "+ Novo Playbook" → editor abre com 1 página em branco.
- Adicionar 3 páginas com imagem → salvar rascunho → reabrir → conteúdo persiste.
- Publicar → abrir `${origin}/playbook/<id>` em janela anônima → flipbook responde a click/swipe no desktop e mobile.
- Despublicar → URL pública retorna 404.

## Arquivos
**Novos**
- `src/components/playbook/PlaybookEditor.tsx`
- `src/components/playbook/FlipBook.tsx`
- `src/components/playbook/flipbook.css`
- `src/routes/_authenticated/produtos.playbook.editor.$id.tsx`
- `src/routes/_authenticated/produtos.playbook.editor.novo.tsx`
- `src/routes/playbook.$id.tsx`

**Editados**
- `src/lib/playbook.functions.ts` — adiciona `loadPublicPlaybook`.
- `src/routes/_authenticated/produtos.playbook.tsx` — botões + link público no toast de publicar.
