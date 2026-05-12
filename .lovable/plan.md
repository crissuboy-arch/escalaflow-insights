## Objetivo

Tornar a inteligência do Minerador (tags, subniche, nível de escala) visível para o usuário e adicionar uma página **Radar de Oportunidade** que consome `radar.ts` sobre os anúncios já minerados.

## 1. Persistir o enrichment em `collected_ads.raw`

`src/routes/api/collector.run.ts` hoje salva só `a.raw`. Trocar por um objeto que mescla o payload bruto com os campos enriquecidos:

```ts
raw: {
  ...(a.raw && typeof a.raw === "object" ? a.raw : { original: a.raw }),
  enriched: {
    tags: a.tags ?? [],
    subniche: a.subniche ?? null,
    promise: a.promise ?? null,
    mechanism: a.mechanism ?? null,
    emotion: a.emotion ?? null,
    scaleLevel: a.scaleLevel ?? null,
  },
}
```

Sem migração: a coluna já é `jsonb`.

## 2. Expor enrichment no `minerar.tsx`

- Estender o `type CollectedAd` local com `tags?: string[]`, `subniche?: string | null`, `scale_level?: "cold"|"warming"|"hot"|"scaled" | null`, `promise?: string | null`, `emotion?: string | null`.
- Em `fetchCollected` e no `optimistic` mapper de `onCollectorMine`, ler de `row.raw?.enriched` (e do próprio `CollectorAd` para o caso otimista).
- **Cards**: abaixo da linha de plataforma/country/CTA, renderizar:
  - Badge `subniche` (variant `secondary`).
  - Badge colorido de `scale_level` com mapping → label/cor: `cold` cinza, `warming` azul, `hot` laranja, `scaled` gradiente primary.
  - Até 3 chips de `tags` (`variant="outline"`, rounded-full, font-size 10px). Botão "+N" se houver mais.

## 3. Filtros novos no painel `Filtros principais`

Adicionar dois controles antes da linha de ação (mantendo grid de 6 colunas em lg):

- `Select` "Nível de escala" com opções `Todos / Cold / Warming / Hot / Scaled`. Estado `scaleFilter`.
- Chips de tag dinâmicos: derivar `availableTags` = união de `tags` dos `visibleCollected` (top 20 por frequência). Renderizar como chips selecionáveis (multi). Estado `tagFilters: Set<string>`.

Aplicar filtros antes de paginar:

```ts
const filtered = visibleCollected.filter((a) => {
  if (scaleFilter !== "all" && a.scale_level !== scaleFilter) return false;
  if (tagFilters.size && !a.tags?.some((t) => tagFilters.has(t))) return false;
  return true;
});
```

E usar `filtered` no contador, no `slice` paginado e no estado vazio. O `activeCategory` (já existente) também passa a filtrar via `tags.includes(<keyword>)` quando uma categoria está ativa — usando `KEYWORD_CATEGORIES[activeCategory].keywords`.

## 4. Página `/radar` — Radar de Oportunidade

Criar `src/routes/_authenticated/radar.tsx`:

- Carregar até 500 anúncios de `collected_ads` (mesma query do Minerador), mapear para `CollectorAd` (incluindo `raw.enriched`) e passar para os helpers de `src/lib/mining/radar.ts`.
- Layout: 2 colunas em `lg`, 1 em mobile.
  - **Card "Nichos quentes (7d)"**: lista `hotNiches(ads, 7)`. Cada linha: nome do nicho + barra horizontal proporcional ao count + número.
  - **Card "Criativos repetidos"**: `repeatedCreatives(ads)`. Cada item: thumbnail (do `sample.imageUrl/videoThumbnail`), advertiser, headline truncada, badge `xN repetições`, botão "Abrir anúncio" (`openExternal` com `sample.adUrl`).
  - **Card "Promessas dominantes"** e **"Criativos escalando"**: secundários, mais compactos (lista simples). Render somente se array não vazio.
- Header com `Radar` icon + contador "X anúncios analisados" e botão "Atualizar" (re-fetch).
- Estado vazio: ícone `Radar` + texto "Nenhum dado suficiente. Minere mais anúncios primeiro." com link para `/minerar`.
- `errorComponent` e `notFoundComponent` mínimos no `createFileRoute` por consistência.

## 5. Sidebar

`src/components/AppSidebar.tsx`: adicionar item "Radar" (ícone `Radar` da lucide) logo após "Minerar". Sem badge/contador.

## Arquivos afetados

Editados:
- `src/routes/api/collector.run.ts` (raw com enriched)
- `src/routes/_authenticated/minerar.tsx` (tipo, leitura do raw, badges, filtros)
- `src/components/AppSidebar.tsx` (item Radar)

Novos:
- `src/routes/_authenticated/radar.tsx`

Sem migração de banco. Sem mudanças em `radar.ts` / `keywords.ts` / `collector.normalizer.ts`.

## Fora de escopo

- Colunas dedicadas em `collected_ads` para `tags`/`scale_level` (continua em `raw.enriched`).
- Backfill do enrichment para anúncios já existentes (a próxima mineração já popula; antigos aparecem sem badges).
- Detecção visual de duplicados por hash de imagem (ainda usa `advertiser|headline|media`).
