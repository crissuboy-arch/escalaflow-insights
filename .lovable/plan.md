# Plano: Mineração Inteligente Premium

Melhorias na página `/minerar` e componentes relacionados, mantendo tudo local (sem backend).

## 1. Favoritos com estrela no card

- Em `src/components/OfferCard.tsx`: adicionar botão de estrela ao lado do bookmark.
- Estado de favorito persistido em `localStorage` (já existe `toggleFavorite` / `FAV_KEY` em `queries.ts`).
- Animação `framer-motion` (scale + glow) ao favoritar.
- Carregar `favIds` na página Minerar e propagar via prop `favorited` para `OfferCard`.
- Atualizar contador de favoritos no `AppSidebar` lendo `escalaflow_favs` + `subscribeChange("fav")`.

## 2. Slider de mineração premium

- Aumentar `max` de 20 → 100 em `minerar.tsx`.
- Estilizar trilho do slider com gradiente e glow (CSS custom em `styles.css`, classe `.slider-glow`).
- Mostrar em tempo real: `"{offers.length} anúncios encontrados"` (atualizado conforme resultados).
- Label do slider com valor destacado em cor primária.

## 3. Chips de filtros rápidos

- Novo array de tags: Infoproduto, Produto físico, Emagrecimento, Beleza, Marketing, IA, Saúde, Finanças, Dropshipping, SaaS, Relacionamento, Nutra.
- Renderizar como `Badge` clicáveis acima do grid de resultados.
- Ao clicar: preenche `keyword` (e `niche` quando bater com nicho existente) e dispara `load()` automaticamente.
- Chip ativo com estilo destacado (gradient + ring).

## 4. Botão "Minerar com IA"

- Botão secundário ao lado de "Minerar" com ícone `Sparkles` e gradiente glow.
- Ao clicar: abre `Dialog` (shadcn) com loading animado (1.2s) e depois exibe blocos mock:
  - Nichos aquecendo (lista com badges)
  - Ofertas emergentes (mini-cards de 3 ofertas demo)
  - Criativos escalando (lista)
  - Países em tendência (badges com bandeira/sigla)
  - Scores altos detectados (top 3 ofertas por `scale_score`)
- Dados gerados a partir de `DEMO_OFFERS` em helper `getAITrends()` adicionado em `queries.ts`.

## 5. Seção "Tendências detectadas pela IA"

- Card permanente acima do grid de ofertas em `minerar.tsx`.
- 4 itens com ícone 🔥 e texto rotativo (mock estático por enquanto):
  - Produto crescendo na Espanha
  - Oferta escalando em saúde
  - Criativo repetido detectado
  - Novo padrão de VSL identificado
- Layout: grid 2x2 em desktop, stack no mobile, com hover glow.

## 6. Visual premium

- Adicionar tokens em `src/styles.css`: `--shadow-glow`, `--gradient-ai`, classe `.card-glow` (hover com box-shadow colorido).
- Loading elegante: skeleton shimmer durante `loading` em vez de grid vazio.
- Micro animações com `framer-motion` (stagger no grid, fade-in nos chips/trends).
- Badges modernos (rounded-full, gradient border nos ativos).

## 7-9. Sem backend

Tudo via `localStorage` e `DEMO_OFFERS`. Nenhuma chamada de API real.

## Arquivos afetados

- `src/components/OfferCard.tsx` — botão estrela + animação + prop `favorited`
- `src/routes/_authenticated/minerar.tsx` — chips, IA dialog, trends section, contador, slider 100, skeleton
- `src/components/AppSidebar.tsx` — contador de favoritos
- `src/lib/queries.ts` — helper `getAITrends()`, `fetchFavIds()`
- `src/styles.css` — tokens de glow e gradiente IA
