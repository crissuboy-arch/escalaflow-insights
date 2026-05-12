## Objetivo

Reorganizar `/produtos/ebook` para ter um ponto de entrada claro, com 3 caminhos óbvios de criação, botão principal "Criar Novo Ebook" e ampliar o passo "Modo & Estrutura" com mais estilos e paletas + geração de capa IA.

---

## 1. Nova tela inicial (estado "hub")

Quando `step === 0` e nenhum ad/briefing carregado, em vez de mostrar direto a lista de anúncios, mostrar:

### Topo
- Título grande "Ebook Engine"
- Botão CTA primário grande à direita: **+ Criar Novo Ebook** (abre menu/dropdown com os 3 caminhos abaixo, atalho rápido).

### 3 cards principais (grid 3 colunas, responsivo)

**Card 1 — Criar Ebook com Oferta Minerada**
- Ícone: `Flame` / `TrendingUp`
- Texto: "Transforme um anúncio validado em ebook pronto pra vender."
- Botão: **Usar anúncio minerado** → abre seletor de anúncios (fluxo atual de `step 0`).

**Card 2 — Criar Ebook do Zero**
- Ícone: `BookOpen`
- Lista de categorias clicáveis (chips/badges): Amazon/KDP, Low Ticket, Emagrecimento, Receita, Romance, Infantil, Negócios, Desenvolvimento Pessoal, PLR, Apostila, Playbook.
- Botão: **Começar do Zero** → pula direto para `step 1` (Briefing) com `niche`/`mode` pré-preenchidos pela categoria escolhida.

**Card 3 — Criar Ebook com IA**
- Ícone: `Sparkles`
- Form curto: nicho, promessa, público, estilo (select), nº capítulos (number), idioma (select PT/EN/ES).
- Botão: **Gerar Estrutura IA** → chama `extractEbookBriefing` com input sintético + `generateEbookOutline` e leva direto para `step 2`.

### Lista de rascunhos
- Manter `<DraftList />` abaixo dos 3 cards num bloco "Continuar onde parou".

---

## 2. Passo 3 — Modo & Estrutura ampliado

Substituir os 3 modos atuais (`kdp` / `premium` / `playbook`) por um **grid visual de estilos** + seletor de **paleta**, mantendo internamente o `mode` técnico (kdp/premium/playbook) mapeado a partir do estilo.

### Estilos (grid de cards visuais, ícone + nome + tag)
- Clean → mode `kdp`
- Premium → mode `premium`
- Canva Style → mode `premium`
- Gamma Style → mode `premium`
- Amazon KDP → mode `kdp`
- Dark → mode `premium`
- Luxo → mode `premium`
- Feminino → mode `premium`
- Infantil → mode `premium`
- Playbook → mode `playbook`

### Paleta (chips coloridos, single-select)
- Rosa, Azul, Preto, Dourado, Lilás, Minimalista, Neon

Estilo + paleta determinam:
- `layout` (mapeado para `classico|moderno|minimalista` existentes)
- variáveis de cor passadas para o exportador PDF/DOCX
- prompt da capa IA

### Geração de capa
- Botão grande **"Gerar capa com IA"** no passo 4 (Layout & Capa) — já existe; passar a montar o prompt usando estilo + paleta + briefing.
- Provedores: Gemini (`gemini-3.1-flash-image-preview` → fallback `gemini-3-pro-image-preview`, já implementado). Adicionar TODO comentado no server para DALL·E (precisa `OPENAI_API_KEY`) e Stability (futuro). Sem mudança real de infra agora.

---

## 3. Detalhes técnicos

Arquivos a editar:
- `src/routes/_authenticated/produtos.ebook.tsx`
  - Extrair novo componente `EbookHub` renderizado quando `step === 0 && !selectedAd && !briefing`.
  - Adicionar estados: `categoryPreset`, `aiKickstart` (form do card 3), `style`, `palette`.
  - Mapear `style` → `mode`/`layout` em util local.
  - Header com botão "+ Criar Novo Ebook" (dropdown menu com 3 atalhos).
- `src/lib/ebook/layouts.ts`
  - Adicionar tipos `EbookStyle` e `EbookPalette` com mapeamento para `LayoutSpec` (cores derivadas da paleta).
- `src/lib/ebook.server.ts`
  - `aiGenerateCover`: aceitar `style`/`palette` opcionais e enriquecer o prompt.

Arquivos novos:
- `src/components/ebook/EbookHub.tsx` (3 cards + form IA + categorias)
- `src/components/ebook/StylePicker.tsx` (grid de estilos)
- `src/components/ebook/PalettePicker.tsx` (chips)

Sem migração de banco — `mode` continua `kdp|premium|playbook`. Estilo/paleta ficam em `layout`/metadata do draft (campo `layout` já existe; serializar como `${style}:${palette}` ou novo subobjeto em `meta`).

---

## 4. Fora de escopo (intencional)

- Integração real com DALL·E/Stability (sem `OPENAI_API_KEY` configurada).
- Mudança no schema do banco.
- Refatorar exporters PDF/DOCX/EPUB (apenas receberão a paleta como input).
- Construir landing/marketing — só a tela do app.

---

## 5. Validação

- Carregar `/produtos/ebook` como novo usuário: ver hub com 3 cards + botão topo.
- Cada card leva ao step certo com estado pré-preenchido.
- Step 3 mostra grid de estilos + paleta; selecionar atualiza preview de cor.
- "Gerar capa com IA" usa estilo+paleta no prompt.
- Rascunho salva e retoma no step correto.
