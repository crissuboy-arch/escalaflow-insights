# ScalaFlow — Fase 2 (diagnóstico e plano, nada construído)

## O que já existe
- Tabelas em produção: `viral_pages` (country, language, niche, followers, affiliate_product_id), `viral_reels` (views, published_at, caption, thumbnail_url, data_source, affiliate_product_id; `unique(user_id, reel_url)`), `viral_videos`, `viral_analyses`, `viral_scripts`, `viral_script_clips`, `viral_avatars`, `affiliate_products` (network, product_name, commission, affiliate_link, sales_page_url, currency, approval_status).
- Bucket privado `viral-media`; bucket público `mining-media` com o pipeline de mídia (corrigido na Fase 1).
- Rotas: `/facebook-viral` (páginas + Reels, mineração por página com confirmação), `/facebook-viral/$reelId/remix` (`viral-remix.functions.ts`, `clip-splitter.ts`), `/motor-afiliados-seo`.
- Actors configurados: `themineworks/facebook-pages-scraper`, `coregent/facebook-reels-scraper`, `curious_coder/facebook-ads-library-scraper`.

## O que falta
1. **Descoberta de páginas virais** por nicho/país/idioma: os actors atuais partem de páginas conhecidas (seeds); não descobrem páginas por palavra-chave. É preciso uma lista de seeds por nicho/mercado (manual ou via Biblioteca de Anúncios → páginas anunciantes), mais um ranking.
2. **Filtros** 100k/500k/1M+ views, data, nicho, país, idioma (en/pt/es/fr/uk/tr) e mercado (US/BR/ES/LatAm): a UI tem só views/origem/página. `viral_reels` não tem `language`/`country` próprios (herdam da página). Pode exigir uma migration com colunas e índices.
3. **Biblioteca permanente sem duplicados**: a unicidade já existe por `(user_id, reel_url)`; falta a deduplicação por ID canónico do Reel (a Fase 1 já normaliza os URLs) e a cópia do vídeo/thumbnail para o Storage.
4. **Viral Remix Studio**: falta ganchos/roteiros por Reel, personagens originais (`viral_avatars` existe vazia) e a exportação de prompts para o Google Flow (não encontrei nada no repo).
5. **Afiliados ClickBank/Digistore24**: a tabela existe; falta a UI de registo e ligação Reel↔produto. Não há integração por API (a Digistore24 tem API própria e o ClickBank tem marketplace; ambos precisam de conta). Para começar, recomenda-se registo manual.

## Fases propostas
- **2A (sem custo):** filtros na UI sobre os dados existentes; registo de afiliados e ligação a Reels; dedupe canónica; migration de colunas (para aprovação).
- **2B (Apify pago, com aprovação):** mineração agendada de Reels a partir de seeds; cópia de mídia para o Storage.
- **2C:** Remix Studio (ganchos, roteiros, personagens, prompts para o Google Flow) com o LLM já configurado no projeto.

## Custos Apify (preços públicos da Apify Store, consultados a 16/11/2026, pay-per-event)
- `coregent/facebook-reels-scraper`: 1,50 USD por 1.000 Reels.
- `themineworks/facebook-pages-scraper`: desde 4,86 USD por 1.000 páginas.
- `curious_coder/facebook-ads-library-scraper`: desde 0,75 USD por 1.000 anúncios.
Exemplo: 50 páginas × 100 Reels = 5.000 Reels ≈ 7,50 USD por corrida completa (mais 50 páginas ≈ 0,25 USD). Os valores mudam; confirmar antes de ativar.
