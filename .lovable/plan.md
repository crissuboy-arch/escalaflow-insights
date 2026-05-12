## Objetivo

Transformar o Minerador num sistema de inteligência de mercado: nichos categorizados, biblioteca expandida de palavras-chave, tags automáticas, score evoluído, base para "Radar de Oportunidade" e remoção definitiva de mocks/debug. Sem mudanças visuais drásticas — só evolução do que já existe.

## 1. Biblioteca de palavras-chave categorizada

Criar `src/lib/mining/keywords.ts` exportando:

```ts
export const KEYWORD_CATEGORIES = {
  dinheiro:     { label: "Dinheiro",     emoji: "💰", keywords: [...] },
  ia:           { label: "IA",           emoji: "🤖", keywords: [...] },
  automacao:    { label: "Automação",    emoji: "⚙️", keywords: [...] },
  infoproduto:  { label: "Infoproduto",  emoji: "📚", keywords: [...] },
  tiktok:       { label: "TikTok",       emoji: "🎵", keywords: [...] },
  instagram:    { label: "Instagram",    emoji: "📸", keywords: [...] },
  ebook:        { label: "Ebook",        emoji: "📖", keywords: [...] },
  playbook:     { label: "Playbook",     emoji: "🎬", keywords: [...] },
  plr:          { label: "PLR",          emoji: "🧩", keywords: [...] },
  fisico:       { label: "Produto físico", emoji: "📦", keywords: [...] },
  emagrecimento:{ label: "Emagrecimento", emoji: "🔥", keywords: [...] },
  beleza:       { label: "Beleza",        emoji: "💄", keywords: [...] },
  branding:     { label: "Branding",      emoji: "🎨", keywords: [...] },
  saas:         { label: "SaaS",          emoji: "🧠", keywords: [...] },
  apps:         { label: "Apps",          emoji: "📱", keywords: [...] },
  whatsapp:     { label: "WhatsApp",      emoji: "💬", keywords: [...] },
  figurinhas:   { label: "Figurinhas",    emoji: "🌟", keywords: [...] },
  cursos:       { label: "Cursos",        emoji: "🎓", keywords: [...] },
  lowTicket:    { label: "Low ticket",    emoji: "🪙", keywords: [...] },
  highTicket:   { label: "High ticket",   emoji: "💎", keywords: [...] },
  rendaExtra:   { label: "Renda extra",   emoji: "📈", keywords: [...] },
  copy:         { label: "Copy/Headlines", emoji: "✍️", keywords: [...] },
} as const;
```

Cada `keywords[]` recebe a lista que o usuário forneceu, mais variações já existentes. Helpers exportados:
- `allKeywords()` — lista única ordenada
- `categoryOf(keyword)` — devolve o(s) ID(s) da categoria
- `inferTagsFromText(text)` — varre copy/headline e devolve tags (nicho, subnicho, emoção)

## 2. UI do Minerador (`src/routes/_authenticated/minerar.tsx`)

- Substituir `QUICK_TAGS` simples por **chips agrupados por categoria** (acordeão/scroller horizontal). Categoria selecionada mostra suas palavras-chave; clicar numa keyword preenche o input.
- Selector "Categoria" no painel de filtros (além do Nicho atual). Categoria escolhida → filtra anúncios listados por `niche`/`tags` que casem.
- Remover toda renderização de debug: bloco `CollectorDebug`, JSON cru, `media_source` em badge de UI (manter só em `console.log`).
- Manter o botão "Minerar com IA" e fluxo atual; só passa a usar nova lib de keywords para sugerir termos.

## 3. Tags automáticas + score evoluído

Em `src/lib/collector/collector.normalizer.ts`:

- Nova função `enrich(ad, ctx)` chamada antes do `out.push`, que calcula:
  - `niche`, `subniche` via `categoryOf` + `inferTagsFromText`
  - `promise` (regex em headline/copy: "ganhe", "perca", "descubra", "sem", "em X dias")
  - `mechanism` (palavras-chave: "método", "fórmula", "framework", "blueprint", "hack")
  - `emotion` (medo / desejo / urgência / curiosidade / prova social)
  - `scaleLevel`: `cold | warming | hot | scaled` derivado do score final
- `inferScore` evolui para considerar:
  - repetição criativa (mesmo `advertiser+headline` ou imagem) → bônus
  - tempo ativo (`startDate` → dias) → bônus progressivo
  - presença de CTA forte (lista de CTAs) → bônus
  - multi-plataforma (≥3) → bônus (já existe)
  - vídeo → bônus (já existe)
  - emoções dominantes detectadas → bônus
  - máximo 99
- Tipos novos em `collector.types.ts`: `tags: string[]`, `subniche?`, `promise?`, `mechanism?`, `emotion?`, `scaleLevel?`.
- Persistir tudo em `collected_ads.raw` (já é `jsonb`) e nas colunas existentes — sem migração de schema agora. Migração futura adicionará colunas próprias quando o Radar precisar de queries.

## 4. Dedup mais forte (sem repetidos)

No service e no fetch de listagem:
- Chave de dedup: `adLibraryId` → `adUrl` → hash de `advertiser|headline|primeira-imagem`.
- No `minerar.tsx`, ao renderizar `visibleCollected`, aplicar `Map` por chave de dedup antes do `.slice(page*PAGE_SIZE, ...)`.

## 5. Remoção de mocks e fallbacks fake

- `src/lib/mining/bridge.ts`: remover `seedDemoAds` e `insertTestAd` (e qualquer botão que chame).
- Remover constantes `DEMO_*` e o source `"demo"` do `MinedAd["source"]`.
- Procurar usos com `rg "seedDemoAds|insertTestAd|is_demo.*true"` e limpar callers (botões "Teste de importação", banners "modo demo").
- `central-mineracao.tsx` e `analise-ia.tsx`: deixar de listar registros com `is_demo = true` por padrão.

## 6. Base para "Radar de Oportunidade"

Apenas o esqueleto agora (sem nova rota visual ainda):
- `src/lib/mining/radar.ts` com funções puras sobre uma lista de `CollectedAd`:
  - `hotNiches(ads)` — nichos com mais entradas nos últimos 7 dias
  - `repeatedCreatives(ads)` — agrupa por hash de imagem/headline
  - `scalingCreatives(ads)` — score crescente + multi-plataforma + tempo ativo
  - `dominantPromises(ads)` / `saturatedProducts(ads)` / `trends(ads)`
- Cobertura de testes manuais via `console`. UI dedicada vem em iteração futura — fora deste escopo.

## 7. Limpeza geral

- `setCollectorDebug` e estado `CollectorDebug` saem do componente; só `console.log` permanece.
- `mediaSource` deixa de aparecer como Badge na UI.
- Remover `inferTags` antigo de `mining/repository.ts` em favor do novo `inferTagsFromText` (repository chama o helper).

## Arquivos afetados

Novos:
- `src/lib/mining/keywords.ts`
- `src/lib/mining/radar.ts`

Editados:
- `src/lib/collector/collector.types.ts` (novos campos)
- `src/lib/collector/collector.normalizer.ts` (enrich + score evoluído)
- `src/lib/mining/repository.ts` (usar `inferTagsFromText`)
- `src/lib/mining/bridge.ts` (remover demo/test)
- `src/routes/_authenticated/minerar.tsx` (categorias, tags, sem debug)
- `src/routes/_authenticated/central-mineracao.tsx` e `analise-ia.tsx` (esconder is_demo)

Sem migrações de banco neste passo.

## Fora de escopo (iterações futuras)

- Página `/radar` visual.
- Colunas dedicadas em `collected_ads` para `tags`, `emotion`, `scale_level`.
- Detecção de imagens duplicadas via perceptual hash.
- IA real classificando emoção/promessa (hoje é heurística por regex/keywords).