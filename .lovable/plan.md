# Auditoria EscaleFlow — estabilizar antes de criar novas features

Objetivo: corrigir os fluxos quebrados que já existem, sem mexer em design e sem inventar funcionalidade nova. Cada bloco abaixo é uma tarefa fechada — vamos atacar em ordem.

## 0. Achados da exploração (o que está realmente quebrado)

- `/api/collector/run` recebe `keyword/country/niche/limit` mas **ignora `platform`** e usa `limit` em vez de `quantity`. Por isso filtros parecem sem efeito.
- `minerar.tsx` mostra `latestRunAds` quando existe, mas se a coleta retorna 0 cai pro `collected` global → parece "sempre os mesmos anúncios".
- "Salvos / Favoritos / Escaladas" estão **100% em localStorage** (`escalaflow_saved_ads_v1`, `..._fav_ads_v1`, `..._scaled_ads_v1`). Nada vai pro banco → some entre dispositivos / abas / sessões e o contador da sidebar diverge da página.
- Tabela `saved_offers` existe no Supabase mas guarda só `offer_id`/`is_favorite` apontando pra `mined_offers` antigo, não pra `collected_ads`. Não tem tabela de "scaled".
- `central-mineracao.tsx`, `analise-ia.tsx` etc. usam `window.open` em alguns botões mas misturam com navegação interna; precisa padronizar via `openExternal`.
- `seedDemoAds` / `insertTestAd` em `mining/bridge.ts` ainda injetam mock no mesmo repositório dos reais.
- Debug visual ainda aparece em `minerar.tsx` (`CollectorDebug`, JSON cru de coleta).
- Playbook hoje só tem o caminho "com anúncio". Não existe "do zero".
- Ebook não tem separação de modo (KDP / Visual / Clean).

## 1. Minerador (`/minerar` + `/api/collector/run`)

- Enviar `platform` e `quantity` no POST e respeitar no `runCollector` (`CollectorRunInput` ganha `platform`, `quantity`).
- Ao iniciar coleta: limpar `latestRunAds`, mostrar loading, e ao final substituir a grade só pelos resultados desta run (não cair no `collected` global se vier 0 — mostrar estado vazio claro).
- Garantir persistência em `collected_ads` com `keyword/country/niche/platform` corretos (já existe upsert, só faltou `platform` no payload de entrada).
- Logs (apenas console):
  - `console.log("mining params", { keyword, niche, country, platform, quantity })`
  - `console.log("mining results", results.length)`
- Remover `CollectorDebug` da tela.

## 2. Central de Mineração (`/central-mineracao`)

- Padronizar TODOS os botões externos via `openExternal(url)` que faz `window.open(url, "_blank", "noopener,noreferrer")`.
- "Abrir no Facebook / Anúncio original": se `ad_url` ausente → `toast("Link original não encontrado")`, sem abrir nada.
- "Enviar para ChatGPT":
  1. montar prompt,
  2. `navigator.clipboard.writeText(prompt)`,
  3. abrir `https://chatgpt.com` em aba nova,
  4. `toast.success("Prompt copiado. Cole no ChatGPT.")`.
- Nunca tentar embutir Facebook/ChatGPT em iframe.
- Botões "salvar / favoritar / enviar para escala" passam a usar a persistência do bloco 3.

## 3. Persistência real (Salvos / Favoritos / Escaladas)

Migração no Supabase para virar fonte única:

- Nova tabela `user_ad_actions` (`user_id`, `ad_id` → `collected_ads.id`, `action` enum `saved|favorite|scaled`, `created_at`, unique(`user_id,ad_id,action`)).
- RLS: dono lê/escreve só as próprias linhas.
- Reescrever `queries.ts`:
  - `saveCollectedAd / favoriteCollectedAd / scaleCollectedAd` viram upsert/delete em `user_ad_actions`.
  - `fetchSavedAds / fetchFavoriteAds / fetchScaledAds` fazem join com `collected_ads`.
  - Manter assinatura `PersistedAd` para não quebrar UI.
  - `subscribeChange` continua via realtime (`postgres_changes` em `user_ad_actions`).
- Critério de "escalada": linha em `user_ad_actions` com `action='scaled'` **ou** `collected_ads.score >= 80` **ou** criativo repetido (mesmo `image_url`/`video_url` em ≥2 linhas) **ou** mesmo `ad_library_id` em ≥2 plataformas.
- Sidebar lê o mesmo `fetch*` → contador sempre coerente.
- `seedDemoAds` desabilitado por padrão; só roda atrás de flag `?demo=1`.

## 4. Análise IA (`/analise-ia`)

- Receber `adId` real via query param e carregar de `collected_ads`.
- Rodar IA real (Lovable AI, modelo já usado pelo Ebook) e gerar: Big Idea, promessa, público, dores, desejos, mecanismo único, objeções, gatilhos, estrutura da oferta, ideias de criativos, próximos passos.
- Persistir em `ai_analyses` (já existe).
- Botões fixos no topo: Voltar, Abrir anúncio original (`openExternal`), Copiar análise, "Criar Ebook a partir deste anúncio", "Criar Playbook a partir deste anúncio" (passam `?adId=` para `/produtos/ebook` e `/produtos/playbook/novo`).

## 5. Playbook — dois caminhos

- Em `/produtos/playbook/novo`, primeira etapa vira escolha:
  - **A) Com anúncio minerado** → fluxo atual (lista de `collected_ads/mined_offers`).
  - **B) Do zero** → categoria (Romance, Gangster, HQ, Infantil, Receita, Emagrecimento, Negócios, Fé, Marketing, Curso, Manual, Playbook estratégico) + tema, público, estilo, qtd cenas, tom, objetivo.
- Caminho B alimenta `extractPlaybookBriefing` com um "ad sintético" derivado dos campos do form (mesmo schema `PlaybookBriefing`, sem mudar o resto do pipeline).
- `playbooks.source_ad_key` = `null` quando do zero; `briefing.mode = "scratch"|"ad"` para o leitor diferenciar.
- Não mexer no leitor/editor agora.

## 6. Ebook — três modos (estrutural, sem polir design)

- Adicionar campo `mode` em `ebooks` (`kdp|visual|clean`, default `kdp`) via migração.
- Wizard ganha uma etapa de seleção de modo logo após o briefing.
- `ebook.server.ts` recebe `mode` e ajusta apenas o prompt de geração (capítulos longos vs blocos visuais vs editorial limpo). Layout/PDF fica como está por enquanto.
- Garantir fluxo ponta-a-ponta funcionando: base → briefing → estrutura → modo → gerar capítulos → preview/export atual.

## 7. Limpeza de debug visual

- Remover blocos de JSON cru, `CollectorDebug`, badges de "demo" misturadas, e qualquer `<pre>{JSON.stringify(...)}` da UI.
- Substituir por `console.log/console.warn` quando o dado for útil pra dev.

## 8. Página `/diagnostico`

- Rota nova só de leitura, dentro de `_authenticated`.
- Roda checks reais (não mock):
  - **Minerador**: POST de teste em `/api/collector/run` com keyword fixa e `limit=1`; OK se `result.ok && saved>=0`.
  - **Central**: existe pelo menos 1 linha em `collected_ads`? `openExternal` disponível? clipboard disponível?
  - **Persistência**: insert+delete numa linha de teste em `user_ad_actions`.
  - **Ebook**: `listEbooks` responde sem erro.
  - **Playbook**: `listPlaybooks` responde sem erro.
- Cada item: `OK` (verde) / `ERRO` (vermelho, com mensagem) / `PENDENTE` (cinza, quando depende de ação do usuário, ex.: extensão).

## Ordem de execução proposta

1. Bloco 1 (Minerador) — destrava o resto.
2. Bloco 3 (Persistência) — migração + reescrita `queries.ts`.
3. Bloco 2 (Central) — depende de 1 e 3.
4. Bloco 7 (limpeza debug) — junto, é barato.
5. Bloco 4 (Análise IA).
6. Bloco 6 (Ebook modos) — só schema + prompt.
7. Bloco 5 (Playbook do zero).
8. Bloco 8 (`/diagnostico`).

## Detalhes técnicos

- Migração SQL nova: `user_ad_actions` + RLS + índice `(user_id, action)`; coluna `mode` em `ebooks`.
- `CollectorRunInput` ganha `platform?: string; quantity?: number` (mantém `limit` como alias).
- Realtime: habilitar `user_ad_actions` na publicação `supabase_realtime`.
- Nada de mexer em `src/integrations/supabase/client.ts` nem em `routeTree.gen.ts`.
- Sem novas dependências.

## Fora de escopo deste plano

- Redesign visual de qualquer tela.
- Exportação avançada (DOCX/EPUB) do Ebook.
- Extensão Chrome (mantém como está, só não polui mais o repositório de reais).
- Novas integrações (Stripe, e-mail, etc.).
