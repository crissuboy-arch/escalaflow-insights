# Módulo Playbook — Experiência interativa em cenas

Criar um módulo **novo e independente** em `/produtos/playbook`, sem mexer no Ebook nem no minerador. A experiência é em **cenas** (não PDF-first), com biblioteca, leitor, modo edição e exportações.

## 1. Rotas (TanStack Start)

```text
src/routes/_authenticated/
  produtos.playbook.tsx              -> Biblioteca (lista de playbooks)
  produtos.playbook.novo.tsx         -> Wizard de criação
  produtos.playbook.$id.tsx          -> Leitor (modo leitura)
  produtos.playbook.$id.editar.tsx   -> Modo edição
```

Adicionar item "Playbook" no `AppSidebar` ao lado do Ebook.

## 2. Biblioteca (`/produtos/playbook`)

Grid de cards estilo premium:
- capa em miniatura (16:9) com borda neon/dourada e glow
- título forte, nicho como badge
- contador "N cenas"
- status: rascunho / publicado
- ações: **Abrir** (leitor), **Editar**, **Publicar/Despublicar**, **Duplicar**, **Excluir**
- CTA principal "+ Novo Playbook"
- estado vazio com ilustração e CTA

Visual: fundo dark (gradiente roxo→azul via tokens novos), cards com `--shadow-glow`.

## 3. Wizard de criação (`/produtos/playbook/novo`)

Passos:
1. **Escolher anúncio base** — listar anúncios reais de `mined_offers` + `collected_ads` + favoritos (reutilizar `fetchFavoriteAds/fetchSavedAds/fetchScaledAds`)
2. **Briefing** — IA extrai: avatar, dor, desejo, promessa, mecanismo único (reutiliza padrão do `aiExtractBriefing`)
3. **Estrutura em cenas** — IA gera N cenas (5–12) com título, resumo, exercício, ação prática
4. **Estilo visual** — escolher tema (Neon Roxo, Dourado Editorial, Minimal Dark)
5. **Gerar playbook** — para cada cena: gera texto longo, balões de insight, e imagem hero via Lovable AI (`google/gemini-2.5-flash-image`)

Cada passo salva rascunho automaticamente no Supabase.

## 4. Leitor (`/produtos/playbook/$id`)

Layout cena-a-cena (full-screen-ish):
- imagem/banner grande no topo
- título da cena (display font)
- texto explicativo (coluna legível)
- balões de destaque flutuantes (insights)
- seção "Sobre esta etapa" (exercício + ação prática)
- footer fixo: ◀ Anterior · "Cena 3/10" (com dots) · Próximo ▶
- atalhos: setas teclado, swipe mobile
- transições com framer-motion (fade + slide)
- botão "Editar" e menu "Exportar"

## 5. Modo edição (`/produtos/playbook/$id/editar`)

Split: lista de cenas à esquerda, editor à direita.
- editar título, texto (textarea/markdown leve), balões (lista editável)
- trocar imagem (upload ou gerar com IA via prompt)
- "Regenerar cena" (IA reescreve mantendo briefing)
- reordenar cenas (drag)
- "Salvar" + autosave + "Voltar ao leitor"

## 6. Exportações

Menu no leitor:
- **PDF** — render simples (reaproveita pdf-lib do ebook em arquivo novo `playbook/pdf.ts`)
- **Carrossel** — PNGs 1080×1350 por cena (canvas server-side ou html2canvas)
- **Roteiro de vídeo** — IA converte cenas → script com narração + cortes
- **Apresentação** — HTML standalone (download .html) ou .pptx via pptxgenjs

Implementar PDF + Carrossel + Roteiro nesta entrega; "Apresentação" como botão "em breve" se faltar tempo.

## 7. Dados (Supabase)

Migration cria duas tabelas com RLS por `user_id`:

**playbooks**
- id, user_id, title, niche, source_ad_key (text), avatar, promise, unique_mechanism, theme, cover_url, status (`draft|published`), created_at, updated_at

**playbook_scenes**
- id, playbook_id, order_index, title, image_url, text, balloons (jsonb[]), exercise, practical_action, created_at, updated_at

RLS: select/insert/update/delete `auth.uid() = user_id` (em scenes via join: usar `user_id` denormalizado ou policy com EXISTS).

Trigger `updated_at` reaproveita `public.set_updated_at()`.

## 8. Server functions

`src/lib/playbook.functions.ts` + `src/lib/playbook.server.ts`:
- `extractPlaybookBriefing(ad)`
- `generatePlaybookOutline(briefing, sceneCount)`
- `generateSceneContent(briefing, scene, index, total)` → texto + balões
- `generateSceneImage(briefing, scene, theme)` → data URL (upload p/ bucket `playbook-images`)
- `generateScript(playbook)` → roteiro de vídeo
- CRUD: `listPlaybooks`, `loadPlaybook`, `savePlaybook`, `saveScene`, `reorderScenes`, `deletePlaybook`, `publishPlaybook`

Todas com `requireSupabaseAuth`. Usa `LOVABLE_API_KEY` (já configurada).

## 9. Storage

Novo bucket público `playbook-images` (capa + banners de cena), criado via migration.

## 10. Design tokens

Adicionar em `src/styles.css`:
- `--playbook-bg`: gradiente roxo→azul escuro
- `--playbook-neon`: ciano/violeta para bordas
- `--playbook-gold`: dourado para acentos premium
- `--shadow-neon`, `--shadow-gold`

Fonte display distinta (ex.: "Space Grotesk" ou "Sora") via Google Fonts no `__root.tsx`, mantendo Inter como body.

## Garantias

- Ebook permanece intocado (nenhum arquivo de `src/lib/ebook*` ou `produtos.ebook.tsx` é editado).
- Minerador permanece intocado.
- Sem mocks: anúncios vêm de `mined_offers`/`collected_ads`/`saved_offers` reais; playbook persiste no Supabase.
- Tipagem estrita, RLS em todas as tabelas, segredos só no server.

## Entrega faseada (sugestão)

Fase 1 (este passo): migration + biblioteca + wizard até "estrutura" + leitor com dados reais + modo edição básico.
Fase 2: geração de imagens por cena + balões editáveis + exportação PDF/Carrossel/Roteiro.

Confirma para eu implementar a Fase 1?
