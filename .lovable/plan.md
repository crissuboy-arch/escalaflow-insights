## Objetivo

Hoje `/produtos/ebook` e `/produtos/playbook` são dois fluxos paralelos que partem do anúncio e geram artefatos isolados, sem nada que os una. Vamos introduzir uma entidade central **Projeto** que:

- agrupa Briefing + Outline + Ebook + Playbook + Capa + Layout + Exportações
- nasce ao selecionar um anúncio minerado (ou do zero / direto IA)
- compartilha briefing entre Ebook e Playbook (Playbook = extensão interativa do Ebook, mesmo tema)
- oferece modos: Ebook PDF, Ebook Premium, Ebook Amazon (KDP), Playbook Interativo, Combo

Sem rebuild dos exporters/IA já estáveis — só uma camada nova "Projeto" por cima.

---

## 1. Modelo de dados

Nova tabela `projects` (Lovable Cloud / Supabase, RLS por `user_id`):

```text
projects
  id uuid pk
  user_id uuid (RLS)
  title text
  niche text
  source_ad_key text null          -- ad minerado de origem
  briefing jsonb default '{}'      -- compartilhado ebook+playbook
  outline jsonb default '[]'       -- capítulos/cenas base
  mode text default 'combo'        -- pdf | premium | kdp | playbook | combo
  ebook_id uuid null               -- fk lógica → ebooks.id
  playbook_id uuid null            -- fk lógica → playbooks.id
  cover_url text null
  status text default 'draft'      -- draft | ready | published
  step int default 0
  meta jsonb default '{}'          -- style, palette, layout, language
  created_at, updated_at
```

Tabelas `ebooks` e `playbooks` permanecem; ganham coluna opcional `project_id uuid null` para apontar de volta. Sem migração destrutiva.

RLS: select/insert/update/delete só onde `auth.uid() = user_id`.

## 2. Camada de servidor (`src/lib/project.functions.ts` + `project.server.ts`)

Server functions novas (todas com `requireSupabaseAuth`):

- `createProject({ source: 'ad'|'scratch'|'ai', ad?, category?, kickstart?, mode })` → cria row em `projects`, opcionalmente já roda `aiExtractBriefing` + `aiGenerateOutline` quando `source !== 'scratch'`. Retorna `{ id }`.
- `loadProject({ id })`
- `listProjects()` — para o hub
- `updateProject({ id, patch })` — autosave debounced
- `deleteProject({ id })`
- `generateProjectEbook({ id, mode })` — usa briefing/outline já no projeto, cria/atualiza row em `ebooks`, salva `ebook_id` no projeto, gera capítulos (e imagens em modo premium) reaproveitando `aiGenerateChapter` / `aiGenerateChapterImage`.
- `generateProjectPlaybook({ id })` — usa o mesmo briefing/outline, mapeia capítulos → cenas via `aiGenerateSceneOutline` + `aiGenerateSceneContent`, salva em `playbooks`, grava `playbook_id`.
- `generateProjectCombo({ id })` — chama as duas em paralelo.

Tudo reusa `ebook.server.ts` e `playbook.server.ts` existentes — nenhuma duplicação de prompts.

## 3. Rotas

```text
src/routes/_authenticated/
  projetos.tsx                    -> /projetos      (hub: lista + 3 cards de criação)
  projetos.novo.tsx               -> /projetos/novo (escolha de origem)
  projetos.$id.tsx                -> /projetos/:id  (workspace do projeto, tabs)
  projetos.$id.ebook.tsx          -> tab ebook (embute UI atual)
  projetos.$id.playbook.tsx       -> tab playbook (embute UI atual)
  projetos.$id.exportar.tsx       -> tab export (PDF/DOCX/EPUB/Compartilhar)
  p.$id.tsx                       -> /p/:id        (leitura pública mobile do playbook, igual ao atual)
```

`/produtos/ebook` e `/produtos/playbook` continuam funcionando (entrada legada) mas a sidebar passa a destacar **Projetos** como entrada principal.

## 4. UX do workspace `/projetos/:id`

Header do projeto: título, badge de modo, botões `[ Gerar Ebook ] [ Gerar Playbook ] [ Gerar Combo ] [ Exportar ]` — todos habilitados depois que briefing+outline existem.

Tabs:
1. **Briefing** — form do briefing compartilhado, paleta/estilo, capa.
2. **Estrutura** — outline (capítulos = cenas).
3. **Ebook** — preview/edição dos capítulos, modo (KDP/Premium), exports PDF/DOCX/EPUB.
4. **Playbook** — preview interativo (cards/cenas/mobile), reorder, regen imagem por cena, link público compartilhável.
5. **Exportar** — bundle final (.zip com PDF + EPUB + link playbook).

Estado de busy por ação (não bloquear o resto). Autosave 1.5s já no padrão.

## 5. Hub `/projetos` (substitui ponto de entrada)

3 cards principais (mantém o que já fizemos no EbookHub, generalizado):
- **Criar com Oferta Minerada** → seletor de ad → cria Projeto modo `combo` por padrão.
- **Criar do Zero** → categorias (Amazon/KDP, Romance, Infantil, Low Ticket, Emagrecimento, Negócios, PLR, Apostila, Playbook puro, …) + seleção de modo.
- **Criar com IA** → form curto (nicho, promessa, público, idioma, modo) → roda briefing+outline e abre workspace.

Abaixo: lista de projetos ("Continuar onde parou") com capa, modo e progresso.

## 6. Playbook como extensão do Ebook

Mesmo `briefing`/`outline` do projeto. Ao gerar Playbook a partir de um Ebook existente:
- cada `chapter` vira uma `scene` (título + summary derivado dos bullets + texto curto IA).
- imagens por cena via `aiGenerateSceneImage` em fundo.
- tema visual derivado do `style/palette` do projeto (mapear: dourado→`dourado-editorial`, neon→`neon-roxo`, demais→`minimal-dark`).
- página pública `/p/:projectId` mobile-first, cards swipe, compartilhável.

## 7. Fora de escopo

- Pagamento/marketplace de venda dos produtos.
- Integração real DALL·E/Stability (segue só Gemini).
- Editor WYSIWYG por capítulo (mantém markdown).
- Novos exportadores além de PDF/DOCX/EPUB.
- Migrar dados antigos de `ebooks`/`playbooks` órfãos para `projects` (ficam acessíveis pelas rotas legadas).

## 8. Entregáveis

1. Migração: tabela `projects` + colunas `project_id` em `ebooks`/`playbooks` + RLS.
2. `src/lib/project.functions.ts` + `project.server.ts` (orquestração reusa ebook/playbook server).
3. Rotas `/projetos`, `/projetos/novo`, `/projetos/$id` (+ tabs).
4. Componentes: `ProjectHub`, `ProjectHeader`, `ProjectTabs`, `EbookTab` (wrap do conteúdo atual), `PlaybookTab` (wrap), `ExportTab`.
5. Item "Projetos" na sidebar como entrada principal; `/produtos/ebook` e `/produtos/playbook` ficam como atalhos legados.

## 9. Validação

- Selecionar ad minerado → cria projeto em <2s, abre `/projetos/:id` com briefing pronto.
- "Gerar Combo" produz Ebook completo + Playbook com cenas espelhando capítulos.
- Reload da página retoma no mesmo step (autosave).
- Link público do playbook abre no mobile sem auth.
- Export final gera bundle zip baixável.
